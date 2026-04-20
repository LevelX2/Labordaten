from __future__ import annotations

from collections import defaultdict
from datetime import date
from html import escape
from io import BytesIO
from unicodedata import normalize

from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.modules.berichte.schemas import (
    ArztberichtEintrag,
    ArztberichtRequest,
    ArztberichtResponse,
    VerlaufsberichtPunkt,
    VerlaufsberichtRequest,
    VerlaufsberichtResponse,
)


def build_arztbericht(db: Session, payload: ArztberichtRequest) -> ArztberichtResponse:
    rows = list(_execute_measurement_query(db, payload.person_id, payload.laborparameter_ids, payload.datum_von, payload.datum_bis))
    latest_by_parameter: dict[str, tuple[Messwert, Befund, Laborparameter, Labor | None]] = {}

    for messwert, befund, parameter, labor in rows:
        current = latest_by_parameter.get(parameter.id)
        current_date = _effective_date(befund, messwert)
        if current is None or current_date >= _effective_date(current[1], current[0]):
            latest_by_parameter[parameter.id] = (messwert, befund, parameter, labor)

    referenzen = _load_reference_map(db, [messwert.id for messwert, _, _, _ in latest_by_parameter.values()])
    eintraege: list[ArztberichtEintrag] = []

    for parameter_id, (messwert, befund, parameter, labor) in sorted(
        latest_by_parameter.items(),
        key=lambda item: item[1][2].anzeigename.lower(),
    ):
        referenz = referenzen.get(messwert.id)
        eintraege.append(
            ArztberichtEintrag(
                laborparameter_id=parameter_id,
                parameter_anzeigename=parameter.anzeigename,
                datum=_effective_date(befund, messwert),
                wert_anzeige=_format_measurement_value(messwert),
                einheit=messwert.einheit_original,
                referenzbereich=_format_reference(referenz) if payload.include_referenzbereich else None,
                labor_name=labor.name if payload.include_labor and labor is not None else None,
                befundbemerkung=befund.bemerkung if payload.include_befundbemerkung else None,
                messwertbemerkung=messwert.bemerkung_kurz if payload.include_messwertbemerkung else None,
            )
        )

    return ArztberichtResponse(person_id=payload.person_id, eintraege=eintraege)


def build_verlaufsbericht(db: Session, payload: VerlaufsberichtRequest) -> VerlaufsberichtResponse:
    rows = list(_execute_measurement_query(db, payload.person_id, payload.laborparameter_ids, payload.datum_von, payload.datum_bis))
    punkte: list[VerlaufsberichtPunkt] = []

    for messwert, befund, parameter, labor in rows:
        punkte.append(
            VerlaufsberichtPunkt(
                laborparameter_id=parameter.id,
                parameter_anzeigename=parameter.anzeigename,
                datum=_effective_date(befund, messwert),
                wert_typ=messwert.wert_typ,
                wert_anzeige=_format_measurement_value(messwert),
                wert_num=messwert.wert_num,
                wert_text=messwert.wert_text,
                einheit=messwert.einheit_original,
                labor_name=labor.name if labor is not None else None,
            )
        )

    punkte.sort(key=lambda item: (item.parameter_anzeigename.lower(), item.datum or item.parameter_anzeigename))
    return VerlaufsberichtResponse(person_id=payload.person_id, punkte=punkte)


def render_arztbericht_pdf(db: Session, payload: ArztberichtRequest) -> tuple[str, bytes]:
    person = _load_person_or_raise(db, payload.person_id)
    bericht = build_arztbericht(db, payload)
    styles = _build_pdf_styles()
    elements: list[object] = [
        Paragraph("Arztbericht", styles["title"]),
        Paragraph(_build_person_line(person), styles["subtitle"]),
        Paragraph(_build_period_line(payload.datum_von, payload.datum_bis), styles["body"]),
        Paragraph(_build_generated_line(), styles["meta"]),
        Spacer(1, 0.45 * cm),
    ]

    if bericht.eintraege:
        table_rows: list[list[object]] = [["Parameter", "Datum", "Wert", "Referenz", "Labor"]]
        for eintrag in bericht.eintraege:
            table_rows.append(
                [
                    _paragraph(eintrag.parameter_anzeigename, styles["table"]),
                    _paragraph(_format_date(eintrag.datum), styles["table"]),
                    _paragraph(_join_value(eintrag.wert_anzeige, eintrag.einheit), styles["table"]),
                    _paragraph(eintrag.referenzbereich or "—", styles["table"]),
                    _paragraph(eintrag.labor_name or "—", styles["table"]),
                ]
            )
            if payload.include_befundbemerkung and eintrag.befundbemerkung:
                table_rows.append(
                    [
                        _paragraph("Befundbemerkung", styles["table_label"]),
                        "",
                        _paragraph(eintrag.befundbemerkung, styles["table"]),
                        "",
                        "",
                    ]
                )
            if payload.include_messwertbemerkung and eintrag.messwertbemerkung:
                table_rows.append(
                    [
                        _paragraph("Messwertbemerkung", styles["table_label"]),
                        "",
                        _paragraph(eintrag.messwertbemerkung, styles["table"]),
                        "",
                        "",
                    ]
                )

        table = Table(
            table_rows,
            colWidths=[4.6 * cm, 2.4 * cm, 4.2 * cm, 4.0 * cm, 3.2 * cm],
            repeatRows=1,
        )
        table.setStyle(_build_table_style())
        elements.append(table)
    else:
        elements.append(Paragraph("Für die aktuelle Auswahl gibt es noch keine passenden Werte.", styles["body"]))

    return f"arztbericht_{_slugify(person.anzeigename)}.pdf", _build_pdf(elements, pagesize=A4)


def render_verlaufsbericht_pdf(db: Session, payload: VerlaufsberichtRequest) -> tuple[str, bytes]:
    person = _load_person_or_raise(db, payload.person_id)
    bericht = build_verlaufsbericht(db, payload)
    styles = _build_pdf_styles()
    elements: list[object] = [
        Paragraph("Verlaufsbericht", styles["title"]),
        Paragraph(_build_person_line(person), styles["subtitle"]),
        Paragraph(_build_period_line(payload.datum_von, payload.datum_bis), styles["body"]),
        Paragraph(_build_generated_line(), styles["meta"]),
        Spacer(1, 0.45 * cm),
    ]

    grouped: dict[str, list[VerlaufsberichtPunkt]] = defaultdict(list)
    for punkt in bericht.punkte:
        grouped[punkt.parameter_anzeigename].append(punkt)

    if not grouped:
        elements.append(Paragraph("Für die aktuelle Auswahl gibt es noch keinen Verlauf.", styles["body"]))
    else:
        for parameter_name in sorted(grouped):
            elements.append(Paragraph(escape(parameter_name), styles["section"]))
            points = sorted(grouped[parameter_name], key=lambda item: item.datum or date.min)

            numeric_points = [punkt for punkt in points if punkt.wert_typ == "numerisch" and punkt.wert_num is not None]
            if numeric_points:
                chart = _build_numeric_chart(parameter_name, numeric_points)
                if chart is not None:
                    elements.append(chart)
                    elements.append(Spacer(1, 0.2 * cm))

                numeric_rows: list[list[object]] = [["Datum", "Wert", "Einheit", "Labor"]]
                for punkt in numeric_points:
                    numeric_rows.append(
                        [
                            _paragraph(_format_date(punkt.datum), styles["table"]),
                            _paragraph(punkt.wert_anzeige, styles["table"]),
                            _paragraph(punkt.einheit or "—", styles["table"]),
                            _paragraph(punkt.labor_name or "—", styles["table"]),
                        ]
                    )
                numeric_table = Table(
                    numeric_rows,
                    colWidths=[3.0 * cm, 4.0 * cm, 3.0 * cm, 6.0 * cm],
                    repeatRows=1,
                )
                numeric_table.setStyle(_build_table_style())
                elements.append(numeric_table)
                elements.append(Spacer(1, 0.3 * cm))

            text_points = [punkt for punkt in points if punkt.wert_typ != "numerisch" or punkt.wert_num is None]
            if text_points:
                elements.append(Paragraph("Qualitative oder textuelle Einträge", styles["subsection"]))
                text_rows: list[list[object]] = [["Datum", "Typ", "Wert", "Labor"]]
                for punkt in text_points:
                    text_rows.append(
                        [
                            _paragraph(_format_date(punkt.datum), styles["table"]),
                            _paragraph(punkt.wert_typ, styles["table"]),
                            _paragraph(_join_value(punkt.wert_anzeige, punkt.einheit), styles["table"]),
                            _paragraph(punkt.labor_name or "—", styles["table"]),
                        ]
                    )
                text_table = Table(
                    text_rows,
                    colWidths=[3.0 * cm, 3.0 * cm, 8.2 * cm, 4.0 * cm],
                    repeatRows=1,
                )
                text_table.setStyle(_build_table_style())
                elements.append(text_table)
                elements.append(Spacer(1, 0.45 * cm))

    return f"verlauf_{_slugify(person.anzeigename)}.pdf", _build_pdf(elements, pagesize=landscape(A4))


def _execute_measurement_query(
    db: Session,
    person_id: str,
    laborparameter_ids: list[str],
    datum_von,
    datum_bis,
):
    stmt: Select = (
        select(Messwert, Befund, Laborparameter, Labor)
        .join(Befund, Messwert.befund_id == Befund.id)
        .join(Laborparameter, Messwert.laborparameter_id == Laborparameter.id)
        .outerjoin(Labor, Befund.labor_id == Labor.id)
        .where(Messwert.person_id == person_id)
    )

    if laborparameter_ids:
        stmt = stmt.where(Messwert.laborparameter_id.in_(laborparameter_ids))
    if datum_von:
        stmt = stmt.where(Befund.entnahmedatum >= datum_von)
    if datum_bis:
        stmt = stmt.where(Befund.entnahmedatum <= datum_bis)

    stmt = stmt.order_by(Befund.entnahmedatum.desc(), Messwert.erstellt_am.desc())
    return db.execute(stmt)


def _load_reference_map(db: Session, messwert_ids: list[str]) -> dict[str, MesswertReferenz]:
    if not messwert_ids:
        return {}

    stmt = (
        select(MesswertReferenz)
        .where(MesswertReferenz.messwert_id.in_(messwert_ids))
        .order_by(MesswertReferenz.messwert_id.asc(), MesswertReferenz.id.asc())
    )

    grouped: dict[str, list[MesswertReferenz]] = defaultdict(list)
    for referenz in db.scalars(stmt):
        grouped[referenz.messwert_id].append(referenz)
    return {messwert_id: referenzen[0] for messwert_id, referenzen in grouped.items()}


def _format_measurement_value(messwert: Messwert) -> str:
    if messwert.wert_typ == "text":
        return messwert.wert_text or messwert.wert_roh_text
    operator_prefix = {
        "exakt": "",
        "kleiner_als": "< ",
        "kleiner_gleich": "<= ",
        "groesser_als": "> ",
        "groesser_gleich": ">= ",
        "ungefaehr": "~ ",
    }.get(messwert.wert_operator, "")
    if messwert.wert_num is not None:
        return f"{operator_prefix}{messwert.wert_num}"
    return f"{operator_prefix}{messwert.wert_roh_text}"


def _format_reference(referenz: MesswertReferenz | None) -> str | None:
    if referenz is None:
        return None
    if referenz.wert_typ == "text":
        return referenz.soll_text or referenz.referenz_text_original
    lower = "—" if referenz.untere_grenze_num is None else str(referenz.untere_grenze_num)
    upper = "—" if referenz.obere_grenze_num is None else str(referenz.obere_grenze_num)
    einheit = f" {referenz.einheit}" if referenz.einheit else ""
    if referenz.referenz_text_original:
        return f"{lower} bis {upper}{einheit} ({referenz.referenz_text_original})"
    return f"{lower} bis {upper}{einheit}"


def _effective_date(befund: Befund, messwert: Messwert):
    return befund.entnahmedatum or befund.befunddatum or messwert.erstellt_am.date()


def _load_person_or_raise(db: Session, person_id: str) -> Person:
    person = db.get(Person, person_id)
    if person is None:
        raise ValueError("Die gewählte Person existiert nicht.")
    return person


def _build_pdf_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "LabordatenTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#16324f"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "LabordatenSubtitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#2f4f4f"),
            spaceAfter=6,
        ),
        "section": ParagraphStyle(
            "LabordatenSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#16324f"),
            spaceBefore=8,
            spaceAfter=8,
        ),
        "subsection": ParagraphStyle(
            "LabordatenSubsection",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#2f4f4f"),
            spaceBefore=6,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "LabordatenBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "LabordatenMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#5b6572"),
            spaceAfter=4,
        ),
        "table": ParagraphStyle(
            "LabordatenTable",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=10.5,
        ),
        "table_label": ParagraphStyle(
            "LabordatenTableLabel",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10.5,
            textColor=colors.HexColor("#16324f"),
        ),
    }


def _build_table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbe7f3")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#16324f")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("LEADING", (0, 0), (-1, -1), 10.5),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b7c6d9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
    )


def _build_numeric_chart(parameter_name: str, points: list[VerlaufsberichtPunkt]) -> Drawing | None:
    labels = [_format_date(punkt.datum) for punkt in points]
    values = [punkt.wert_num for punkt in points if punkt.wert_num is not None]
    if not values:
        return None

    drawing = Drawing(720, 210)
    drawing.add(String(8, 192, f"Numerischer Verlauf: {parameter_name}", fontName="Helvetica-Bold", fontSize=11))

    chart = HorizontalLineChart()
    chart.x = 42
    chart.y = 42
    chart.width = 620
    chart.height = 120
    chart.data = [values]
    chart.joinedLines = 1
    chart.lines[0].strokeColor = colors.HexColor("#1f5a92")
    chart.lines[0].strokeWidth = 2
    chart.lines[0].symbol = makeMarker("FilledCircle")
    chart.lines[0].symbol.fillColor = colors.HexColor("#1f5a92")
    chart.lines[0].symbol.strokeColor = colors.HexColor("#1f5a92")
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.angle = 25 if len(labels) > 5 else 0
    chart.categoryAxis.labels.dy = -10
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7

    value_min = min(values)
    value_max = max(values)
    if value_min == value_max:
        padding = max(abs(value_min) * 0.1, 1)
    else:
        padding = max((value_max - value_min) * 0.12, 0.5)

    chart.valueAxis.valueMin = value_min - padding
    chart.valueAxis.valueMax = value_max + padding
    chart.valueAxis.valueStep = _determine_value_step(chart.valueAxis.valueMin, chart.valueAxis.valueMax)
    drawing.add(chart)
    return drawing


def _determine_value_step(value_min: float, value_max: float) -> float:
    span = max(value_max - value_min, 1.0)
    rough_step = span / 5
    if rough_step <= 0.5:
        return 0.5
    if rough_step <= 1:
        return 1
    if rough_step <= 2:
        return 2
    if rough_step <= 5:
        return 5
    if rough_step <= 10:
        return 10
    return round(rough_step, 1)


def _build_pdf(elements: list[object], pagesize) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title="Labordaten Bericht",
    )
    document.build(elements)
    return buffer.getvalue()


def _build_person_line(person: Person) -> str:
    return f"Person: {escape(person.vollname or person.anzeigename)}"


def _build_period_line(datum_von, datum_bis) -> str:
    return f"Zeitraum: {_format_date(datum_von)} bis {_format_date(datum_bis)}"


def _build_generated_line() -> str:
    return f"Erstellt am: {_format_date(date.today())}"


def _format_date(value) -> str:
    if value is None:
        return "—"
    return value.strftime("%d.%m.%Y")


def _join_value(value: str, unit: str | None) -> str:
    return " ".join(part for part in [value, unit] if part)


def _paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def _slugify(value: str) -> str:
    ascii_value = normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = "".join(character if character.isalnum() else "_" for character in ascii_value.lower())
    compact = "_".join(part for part in normalized.split("_") if part)
    return compact or "bericht"
