from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from html import escape
from io import BytesIO
from unicodedata import normalize

from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import CondPageBreak, KeepTogether, LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.core.pdf_branding import (
    PDF_BOTTOM_MARGIN,
    PDF_LEFT_MARGIN,
    PDF_RIGHT_MARGIN,
    PDF_TOP_MARGIN,
    draw_labordaten_pdf_page,
)
from labordaten_backend.core.labor_value_formatting import (
    format_numeric_reference_range,
    is_numeric_value_outside_reference,
)
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.person import Person
from labordaten_backend.modules.berichte.schemas import (
    ArztberichtEintrag,
    ArztberichtRequest,
    ArztberichtResponse,
    VerlaufsberichtPunkt,
    VerlaufsberichtRequest,
    VerlaufsberichtResponse,
)
from labordaten_backend.modules.messwerte import common as measurement_common


@dataclass(frozen=True)
class _ReportGroupInfo:
    names: list[str]
    primary_name: str | None
    primary_sorting: int | None


def build_arztbericht(db: Session, payload: ArztberichtRequest) -> ArztberichtResponse:
    persons = _load_persons_or_raise(db, payload.person_ids)
    rows = list(_execute_measurement_query(db, payload))
    supported_display_units = _collect_supported_display_units(rows)
    _validate_requested_display_units(rows, payload.einheit_auswahl, supported_display_units)
    latest_by_key: dict[tuple[str, str], tuple[Messwert, Befund, Laborparameter, Labor | None, Person]] = {}

    for messwert, befund, parameter, labor, person in rows:
        key = (person.id, parameter.id)
        current = latest_by_key.get(key)
        current_date = _effective_date(befund, messwert)
        if current is None or current_date >= _effective_date(current[1], current[0]):
            latest_by_key[key] = (messwert, befund, parameter, labor, person)

    referenzen = _load_reference_map(db, [messwert.id for messwert, _, _, _, _ in latest_by_key.values()])
    gruppen_map = _load_group_info(db, [parameter.id for _, _, parameter, _, _ in latest_by_key.values()], payload.gruppen_ids)
    eintraege: list[ArztberichtEintrag] = []

    for (_, parameter_id), (messwert, befund, parameter, labor, person) in latest_by_key.items():
        referenz = referenzen.get(messwert.id)
        display_value = _resolve_measurement_display(messwert, payload.einheit_auswahl.get(parameter_id))
        numeric_reference = _resolve_numeric_reference_for_display(referenz, display_value["einheit"])
        group_info = gruppen_map.get(parameter_id, _empty_group_info())
        eintraege.append(
            ArztberichtEintrag(
                messwert_id=messwert.id,
                person_id=person.id,
                person_anzeigename=person.anzeigename,
                laborparameter_id=parameter_id,
                parameter_anzeigename=parameter.anzeigename,
                parameter_primaere_klassifikation=parameter.primaere_klassifikation,
                datum=_effective_date(befund, messwert),
                wert_typ=messwert.wert_typ,
                wert_anzeige=display_value["wert_anzeige"],
                wert_num=display_value["wert_num"],
                einheit=display_value["einheit"],
                wert_original_num=messwert.wert_num,
                einheit_original=messwert.einheit_original,
                wert_normiert_num=messwert.wert_normiert_num,
                einheit_normiert=messwert.einheit_normiert,
                referenzbereich=_format_reference(referenz, display_value["einheit"]) if payload.include_referenzbereich else None,
                referenz_untere_num=numeric_reference[0],
                referenz_obere_num=numeric_reference[1],
                referenz_einheit=numeric_reference[2],
                labor_name=labor.name if payload.include_labor and labor is not None else None,
                befundbemerkung=befund.bemerkung if payload.include_befundbemerkung else None,
                messwertbemerkung=messwert.bemerkung_kurz if payload.include_messwertbemerkung else None,
                gruppen_namen=group_info.names,
                primaere_berichtsgruppe=group_info.primary_name,
                sortierung_in_gruppe=group_info.primary_sorting,
                ausserhalb_referenzbereich=_is_outside_reference(messwert, referenz),
            )
        )

    eintraege.sort(key=lambda item: _report_sort_key(item, payload.sortierung, payload.auffaelligkeiten_zuerst))
    return ArztberichtResponse(person_ids=[person.id for person in persons], eintraege=eintraege)


def build_verlaufsbericht(db: Session, payload: VerlaufsberichtRequest) -> VerlaufsberichtResponse:
    persons = _load_persons_or_raise(db, payload.person_ids)
    rows = list(_execute_measurement_query(db, payload))
    supported_display_units = _collect_supported_display_units(rows)
    _validate_requested_display_units(rows, payload.einheit_auswahl, supported_display_units)
    referenzen = _load_reference_map(db, [messwert.id for messwert, _, _, _, _ in rows])
    gruppen_map = _load_group_info(db, [parameter.id for _, _, parameter, _, _ in rows], payload.gruppen_ids)
    punkte: list[VerlaufsberichtPunkt] = []

    for messwert, befund, parameter, labor, person in rows:
        referenz = referenzen.get(messwert.id)
        display_value = _resolve_measurement_display(messwert, payload.einheit_auswahl.get(parameter.id))
        group_info = gruppen_map.get(parameter.id, _empty_group_info())
        punkte.append(
            VerlaufsberichtPunkt(
                messwert_id=messwert.id,
                person_id=person.id,
                person_anzeigename=person.anzeigename,
                laborparameter_id=parameter.id,
                parameter_anzeigename=parameter.anzeigename,
                parameter_primaere_klassifikation=parameter.primaere_klassifikation,
                datum=_effective_date(befund, messwert),
                wert_typ=messwert.wert_typ,
                wert_anzeige=display_value["wert_anzeige"],
                wert_num=display_value["wert_num"],
                wert_text=messwert.wert_text,
                einheit=display_value["einheit"],
                wert_original_num=messwert.wert_num,
                einheit_original=messwert.einheit_original,
                wert_normiert_num=messwert.wert_normiert_num,
                einheit_normiert=messwert.einheit_normiert,
                labor_name=labor.name if labor is not None else None,
                gruppen_namen=group_info.names,
                primaere_berichtsgruppe=group_info.primary_name,
                sortierung_in_gruppe=group_info.primary_sorting,
                ausserhalb_referenzbereich=_is_outside_reference(messwert, referenz),
            )
        )

    punkte.sort(key=lambda item: _report_sort_key(item, payload.sortierung, payload.auffaelligkeiten_zuerst))
    return VerlaufsberichtResponse(person_ids=[person.id for person in persons], punkte=punkte)


def render_arztbericht_pdf(db: Session, payload: ArztberichtRequest) -> tuple[str, bytes]:
    persons = _load_persons_or_raise(db, payload.person_ids)
    bericht = build_arztbericht(db, payload)
    styles = _build_pdf_styles()
    include_person_column = len(persons) > 1
    elements: list[object] = [
        Paragraph("Arztbericht", styles["title"]),
        Paragraph(_build_people_line(persons), styles["subtitle"]),
        Paragraph(_build_period_line(payload.datum_von, payload.datum_bis), styles["body"]),
        Paragraph(_build_generated_line(), styles["meta"]),
        Spacer(1, 0.45 * cm),
    ]

    if bericht.eintraege:
        header = ["Parameter", "Datum", "Wert"]
        if payload.include_referenzgrafik:
            header.append("Einordnung")
        header.append("Referenz")
        if payload.include_labor:
            header.append("Labor")
        if include_person_column:
            header.insert(0, "Person")
        table_rows: list[list[object]] = [header]
        full_width_note_rows: list[int] = []
        for eintrag in bericht.eintraege:
            row = [
                _paragraph(eintrag.parameter_anzeigename, styles["table"]),
                _paragraph(_format_date(eintrag.datum), styles["table"]),
                _paragraph(_join_value(eintrag.wert_anzeige, eintrag.einheit), styles["table"]),
            ]
            if payload.include_referenzgrafik:
                row.append(_build_reference_marker(eintrag, styles["table"]))
            row.append(_paragraph(eintrag.referenzbereich or "—", styles["table"]))
            if payload.include_labor:
                row.append(_paragraph(eintrag.labor_name or "—", styles["table"]))
            if include_person_column:
                row.insert(0, _paragraph(eintrag.person_anzeigename, styles["table"]))
            table_rows.append(row)

            if payload.include_befundbemerkung and eintrag.befundbemerkung:
                note_row = [""] * len(header)
                note_row[0] = _labeled_note_paragraph("Befundbemerkung", eintrag.befundbemerkung, styles["table"])
                full_width_note_rows.append(len(table_rows))
                table_rows.append(note_row)
            if payload.include_messwertbemerkung and eintrag.messwertbemerkung:
                note_row = [""] * len(header)
                note_row[0] = _labeled_note_paragraph("Messwertbemerkung", eintrag.messwertbemerkung, styles["table"])
                full_width_note_rows.append(len(table_rows))
                table_rows.append(note_row)

        frame_width, _ = _page_frame_size(A4)
        col_widths = _arztbericht_col_widths(
            frame_width,
            include_person_column=include_person_column,
            include_labor=payload.include_labor,
            include_reference_graphic=payload.include_referenzgrafik,
        )
        table = LongTable(table_rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(_build_table_style())
        if full_width_note_rows:
            table.setStyle(_build_full_width_note_style(full_width_note_rows))
        elements.append(table)
    else:
        elements.append(Paragraph("Für die aktuelle Auswahl gibt es noch keine passenden Werte.", styles["body"]))

    return _build_report_filename("arztbericht", persons), _build_pdf(
        elements,
        pagesize=A4,
        document_label="Arztbericht",
        footer_label="Labordaten · Arztbericht",
    )


def render_verlaufsbericht_pdf(db: Session, payload: VerlaufsberichtRequest) -> tuple[str, bytes]:
    persons = _load_persons_or_raise(db, payload.person_ids)
    bericht = build_verlaufsbericht(db, payload)
    styles = _build_pdf_styles()
    report_pagesize = landscape(A4)
    frame_width, frame_height = _page_frame_size(report_pagesize)
    elements: list[object] = [
        Paragraph("Verlaufsbericht", styles["title"]),
        Paragraph(_build_people_line(persons), styles["subtitle"]),
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
        for parameter_name in _ordered_parameter_names(bericht.punkte):
            points_by_person: dict[str, list[VerlaufsberichtPunkt]] = defaultdict(list)
            for punkt in grouped[parameter_name]:
                points_by_person[punkt.person_anzeigename].append(punkt)

            section_rendered = False
            for person_name, points in sorted(points_by_person.items()):
                sorted_points = sorted(points, key=lambda item: item.datum or date.min)
                numeric_points = [punkt for punkt in sorted_points if punkt.wert_typ == "numerisch" and punkt.wert_num is not None]
                if not numeric_points:
                    continue

                block: list[object] = []
                if not section_rendered:
                    block.append(Paragraph(escape(parameter_name), styles["section"]))
                    section_rendered = True
                if len(points_by_person) > 1:
                    block.append(Paragraph(escape(person_name), styles["subsection"]))

                chart = _build_numeric_chart(f"{parameter_name} · {person_name}", numeric_points)
                if chart is not None:
                    block.append(chart)
                    block.append(Spacer(1, 0.2 * cm))

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
                numeric_table = LongTable(numeric_rows, colWidths=[3.0 * cm, 4.0 * cm, 3.0 * cm, 6.0 * cm], repeatRows=1)
                numeric_table.setStyle(_build_table_style())
                block.append(numeric_table)
                block.append(Spacer(1, 0.3 * cm))
                _append_report_block(elements, block, frame_width, frame_height)

            text_points = [punkt for punkt in grouped[parameter_name] if punkt.wert_typ != "numerisch" or punkt.wert_num is None]
            if text_points:
                block = []
                if not section_rendered:
                    block.append(Paragraph(escape(parameter_name), styles["section"]))
                    section_rendered = True
                block.append(Paragraph("Qualitative oder textuelle Einträge", styles["subsection"]))
                include_person_column = len(persons) > 1
                header = ["Person", "Datum", "Typ", "Wert", "Labor"] if include_person_column else ["Datum", "Typ", "Wert", "Labor"]
                text_rows: list[list[object]] = [header]
                for punkt in text_points:
                    row = [
                        _paragraph(_format_date(punkt.datum), styles["table"]),
                        _paragraph(punkt.wert_typ, styles["table"]),
                        _paragraph(_join_value(punkt.wert_anzeige, punkt.einheit), styles["table"]),
                        _paragraph(punkt.labor_name or "—", styles["table"]),
                    ]
                    if include_person_column:
                        row.insert(0, _paragraph(punkt.person_anzeigename, styles["table"]))
                    text_rows.append(row)
                text_table = LongTable(
                    text_rows,
                    colWidths=[3.0 * cm, 3.0 * cm, 8.2 * cm, 4.0 * cm, 3.2 * cm] if include_person_column else [3.0 * cm, 3.0 * cm, 8.2 * cm, 4.0 * cm],
                    repeatRows=1,
                )
                text_table.setStyle(_build_table_style())
                block.append(text_table)
                block.append(Spacer(1, 0.45 * cm))
                _append_report_block(elements, block, frame_width, frame_height)

    return _build_report_filename("verlauf", persons), _build_pdf(
        elements,
        pagesize=report_pagesize,
        document_label="Verlaufsbericht",
        footer_label="Labordaten · Verlaufsbericht",
    )


def _execute_measurement_query(db: Session, payload: ArztberichtRequest | VerlaufsberichtRequest):
    return measurement_common.execute_measurement_query(db, payload, newest_first=True)


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


def _empty_group_info() -> _ReportGroupInfo:
    return _ReportGroupInfo(names=[], primary_name=None, primary_sorting=None)


def _load_group_info(db: Session, laborparameter_ids: list[str], selected_group_ids: list[str] | None = None) -> dict[str, _ReportGroupInfo]:
    if not laborparameter_ids:
        return {}

    stmt = (
        select(GruppenParameter.laborparameter_id, ParameterGruppe.id, ParameterGruppe.name, GruppenParameter.sortierung)
        .join(ParameterGruppe, GruppenParameter.parameter_gruppe_id == ParameterGruppe.id)
        .where(GruppenParameter.laborparameter_id.in_(laborparameter_ids))
        .where(ParameterGruppe.aktiv.is_(True))
        .order_by(ParameterGruppe.name.asc())
    )
    selected_order = {group_id: index for index, group_id in enumerate(selected_group_ids or [])}
    grouped: dict[str, list[tuple[str, str, int | None]]] = defaultdict(list)
    for laborparameter_id, gruppen_id, gruppen_name, sortierung in db.execute(stmt):
        grouped[laborparameter_id].append((gruppen_id, gruppen_name, sortierung))

    result: dict[str, _ReportGroupInfo] = {}
    for laborparameter_id, assignments in grouped.items():
        ordered = sorted(
            assignments,
            key=lambda item: (
                0 if item[0] in selected_order else 1,
                selected_order.get(item[0], 999_999),
                item[1].lower(),
                item[2] is None,
                item[2] or 0,
            ),
        )
        primary = ordered[0]
        result[laborparameter_id] = _ReportGroupInfo(
            names=[name for _, name, _ in ordered],
            primary_name=primary[1],
            primary_sorting=primary[2],
        )
    return result


def _report_sort_key(item: ArztberichtEintrag | VerlaufsberichtPunkt, sortierung: str, auffaelligkeiten_zuerst: bool):
    auffaelligkeit_key = 0 if auffaelligkeiten_zuerst and item.ausserhalb_referenzbereich is True else 1
    person_key = item.person_anzeigename.lower()
    date_key = item.datum or date.min
    parameter_key = item.parameter_anzeigename.lower()

    if sortierung == "person_berichtsgruppe_sortierung_entnahmezeitpunkt":
        return (
            auffaelligkeit_key,
            person_key,
            item.primaere_berichtsgruppe is None,
            (item.primaere_berichtsgruppe or "").lower(),
            item.sortierung_in_gruppe is None,
            item.sortierung_in_gruppe or 0,
            parameter_key,
            date_key,
        )

    return (auffaelligkeit_key, person_key, date_key, parameter_key)


def _ordered_parameter_names(points: list[VerlaufsberichtPunkt]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for point in points:
        if point.parameter_anzeigename not in seen:
            names.append(point.parameter_anzeigename)
            seen.add(point.parameter_anzeigename)
    return names


def _format_measurement_value(messwert: Messwert) -> str:
    return measurement_common.format_measurement_value(messwert)


def _resolve_measurement_display(messwert: Messwert, target_unit: str | None) -> dict[str, str | float | None]:
    display = measurement_common.resolve_measurement_display(messwert, target_unit)
    return {
        "wert_anzeige": display.wert_anzeige,
        "wert_num": display.wert_num,
        "einheit": display.einheit,
    }


def _format_reference(referenz: MesswertReferenz | None, display_unit: str | None = None) -> str | None:
    if referenz is None:
        return None
    if referenz.wert_typ == "text":
        return referenz.soll_text or referenz.referenz_text_original
    prefix = "Originalreferenz: " if display_unit and referenz.einheit and referenz.einheit != display_unit else ""
    range_text = format_numeric_reference_range(
        lower_value=referenz.untere_grenze_num,
        upper_value=referenz.obere_grenze_num,
        lower_operator=referenz.untere_grenze_operator,
        upper_operator=referenz.obere_grenze_operator,
        unit=referenz.einheit,
    )
    if referenz.referenz_text_original:
        if range_text:
            return f"{prefix}{range_text} ({referenz.referenz_text_original})"
        return f"{prefix}{referenz.referenz_text_original}"
    return f"{prefix}{range_text}" if range_text else None


def _resolve_numeric_reference_for_display(
    referenz: MesswertReferenz | None,
    display_unit: str | None,
) -> tuple[float | None, float | None, str | None]:
    if referenz is None or referenz.wert_typ != "numerisch":
        return None, None, None
    if display_unit and referenz.einheit and referenz.einheit != display_unit:
        return None, None, referenz.einheit
    return referenz.untere_grenze_num, referenz.obere_grenze_num, referenz.einheit


def _is_outside_reference(messwert: Messwert, referenz: MesswertReferenz | None) -> bool | None:
    if referenz is None or messwert.wert_typ != "numerisch" or referenz.wert_typ != "numerisch":
        return None
    return is_numeric_value_outside_reference(
        value=messwert.wert_num,
        lower_value=referenz.untere_grenze_num,
        upper_value=referenz.obere_grenze_num,
        lower_operator=referenz.untere_grenze_operator,
        upper_operator=referenz.obere_grenze_operator,
    )


def _effective_date(befund: Befund, messwert: Messwert):
    return measurement_common.effective_date(befund, messwert)


def _load_persons_or_raise(db: Session, person_ids: list[str]) -> list[Person]:
    return measurement_common.load_persons_or_raise(db, person_ids)


def _collect_supported_display_units(
    rows: list[tuple[Messwert, Befund, Laborparameter, Labor | None, Person]],
) -> dict[str, set[str]]:
    per_parameter_units: dict[str, list[set[str]]] = defaultdict(list)

    for messwert, _, parameter, _, _ in rows:
        if messwert.wert_typ != "numerisch" or messwert.wert_num is None:
            continue

        available_units = _available_display_units(messwert)
        if available_units:
            per_parameter_units[parameter.id].append(available_units)

    supported_units: dict[str, set[str]] = {}
    for parameter_id, unit_sets in per_parameter_units.items():
        if not unit_sets:
            supported_units[parameter_id] = set()
            continue
        common_units = set(unit_sets[0])
        for unit_set in unit_sets[1:]:
            common_units &= unit_set
        supported_units[parameter_id] = common_units

    return supported_units


def _available_display_units(messwert: Messwert) -> set[str]:
    return measurement_common.available_display_units(messwert)


def _validate_requested_display_units(
    rows: list[tuple[Messwert, Befund, Laborparameter, Labor | None, Person]],
    requested_units: dict[str, str],
    supported_units: dict[str, set[str]],
) -> None:
    if not requested_units:
        return

    parameter_names = {parameter.id: parameter.anzeigename for _, _, parameter, _, _ in rows}
    for parameter_id, requested_unit in requested_units.items():
        if not requested_unit or requested_unit == "original":
            continue
        if parameter_id not in parameter_names:
            continue

        if requested_unit not in supported_units.get(parameter_id, set()):
            parameter_name = parameter_names.get(parameter_id, "Unbekannter Parameter")
            raise ValueError(
                f"Die Einheit '{requested_unit}' kann für '{parameter_name}' mit der aktuellen Auswahl nicht sauber dargestellt werden."
            )


def _build_pdf_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("LabordatenTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=colors.HexColor("#16324f"), spaceAfter=8),
        "subtitle": ParagraphStyle("LabordatenSubtitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#2f4f4f"), spaceAfter=6),
        "section": ParagraphStyle("LabordatenSection", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#16324f"), spaceBefore=8, spaceAfter=8),
        "subsection": ParagraphStyle("LabordatenSubsection", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=colors.HexColor("#2f4f4f"), spaceBefore=6, spaceAfter=6),
        "body": ParagraphStyle("LabordatenBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=12, spaceAfter=4),
        "meta": ParagraphStyle("LabordatenMeta", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#5b6572"), spaceAfter=4),
        "table": ParagraphStyle("LabordatenTable", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=10.5),
        "table_label": ParagraphStyle("LabordatenTableLabel", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=10.5, textColor=colors.HexColor("#16324f")),
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


def _build_full_width_note_style(row_indices: list[int]) -> TableStyle:
    commands: list[tuple[object, ...]] = []
    for row_index in row_indices:
        commands.extend(
            [
                ("SPAN", (0, row_index), (-1, row_index)),
                ("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#f3f7fb")),
            ]
        )
    return TableStyle(commands)


def _arztbericht_col_widths(
    frame_width: float,
    *,
    include_person_column: bool,
    include_labor: bool,
    include_reference_graphic: bool,
) -> list[float]:
    weights: list[float] = []
    if include_person_column:
        weights.append(2.7)
    weights.extend([4.0, 2.1, 2.7])
    if include_reference_graphic:
        weights.append(3.2)
    weights.append(4.2)
    if include_labor:
        weights.append(2.8)

    total_weight = sum(weights)
    return [frame_width * weight / total_weight for weight in weights]


def _build_reference_marker(eintrag: ArztberichtEintrag, fallback_style: ParagraphStyle) -> Drawing | Paragraph:
    value = eintrag.wert_num
    lower = eintrag.referenz_untere_num
    upper = eintrag.referenz_obere_num
    if value is None or (lower is None and upper is None):
        return _paragraph("—", fallback_style)

    width = 86
    height = 16
    left = 8
    right = width - 8
    mid_y = 8
    if lower is not None and upper is not None and lower < upper:
        reference_min = lower
        reference_max = upper
        reference_span = upper - lower
        scale_min = lower - reference_span * 0.5
        scale_max = upper + reference_span * 0.5
    elif upper is not None:
        reference_min = min(value, upper) - max(abs(upper) * 0.5, 1.0)
        reference_max = upper
        scale_min = reference_min
        scale_max = max(value, upper) + max(abs(upper) * 0.25, 1.0)
    else:
        reference_min = lower
        reference_max = max(value, lower) + max(abs(lower or 0) * 0.5, 1.0)
        scale_min = min(value, lower) - max(abs(lower or 0) * 0.25, 1.0)
        scale_max = reference_max

    if reference_min is None or reference_max is None or scale_min >= scale_max:
        return _paragraph("—", fallback_style)

    def x_for(number: float) -> float:
        ratio = (number - scale_min) / (scale_max - scale_min)
        clamped = min(max(ratio, 0), 1)
        return left + clamped * (right - left)

    lower_x = x_for(reference_min)
    upper_x = x_for(reference_max)
    value_x = x_for(value)
    point_color = colors.HexColor("#b42318") if eintrag.ausserhalb_referenzbereich else colors.HexColor("#0f766e")

    drawing = Drawing(width, height)
    drawing.add(Line(left, mid_y, right, mid_y, strokeColor=colors.HexColor("#c9d3df"), strokeWidth=1))
    drawing.add(Rect(lower_x, mid_y - 3, max(upper_x - lower_x, 2), 6, fillColor=colors.HexColor("#cde7df"), strokeColor=colors.HexColor("#5f9f8b"), strokeWidth=0.6))
    drawing.add(Circle(value_x, mid_y, 3.2, fillColor=point_color, strokeColor=colors.white, strokeWidth=0.6))
    return drawing


def _build_numeric_chart(title: str, points: list[VerlaufsberichtPunkt]) -> Drawing | None:
    labels = [_format_date(punkt.datum) for punkt in points]
    values = [punkt.wert_num for punkt in points if punkt.wert_num is not None]
    if not values:
        return None

    drawing = Drawing(720, 210)
    drawing.add(String(8, 192, f"Numerischer Verlauf: {title}", fontName="Helvetica-Bold", fontSize=11))

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
    padding = max(abs(value_min) * 0.1, 1) if value_min == value_max else max((value_max - value_min) * 0.12, 0.5)
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


def _page_frame_size(pagesize: tuple[float, float]) -> tuple[float, float]:
    return (
        pagesize[0] - PDF_LEFT_MARGIN - PDF_RIGHT_MARGIN,
        pagesize[1] - PDF_TOP_MARGIN - PDF_BOTTOM_MARGIN,
    )


def _append_report_block(
    elements: list[object],
    block: list[object],
    frame_width: float,
    frame_height: float,
) -> None:
    cleaned_block = [flowable for flowable in block if flowable is not None]
    if not cleaned_block:
        return

    estimated_height = _estimate_flowables_height(cleaned_block, frame_width, frame_height)
    required_height = min(estimated_height, frame_height * 0.95)
    if required_height > 0:
        elements.append(CondPageBreak(required_height))

    if estimated_height <= frame_height * 0.95:
        elements.append(KeepTogether(cleaned_block))
        return

    elements.extend(cleaned_block)


def _estimate_flowables_height(flowables: list[object], frame_width: float, frame_height: float) -> float:
    total_height = 0.0
    for flowable in flowables:
        wrap = getattr(flowable, "wrap", None)
        if wrap is None:
            continue
        _, height = wrap(frame_width, frame_height)
        total_height += height
    return total_height


def _build_pdf(elements: list[object], pagesize, document_label: str, footer_label: str) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=PDF_LEFT_MARGIN,
        rightMargin=PDF_RIGHT_MARGIN,
        topMargin=PDF_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        title="Labordaten Bericht",
    )

    def draw_page(canvas, doc) -> None:
        draw_labordaten_pdf_page(canvas, doc, document_label, footer_label)

    document.build(elements, onFirstPage=draw_page, onLaterPages=draw_page)
    return buffer.getvalue()


def _build_people_line(persons: list[Person]) -> str:
    if len(persons) == 1:
        return f"Person: {escape(persons[0].vollname or persons[0].anzeigename)}"
    return "Personen: " + ", ".join(escape(person.vollname or person.anzeigename) for person in persons)


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


def _labeled_note_paragraph(label: str, text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(f"<b>{escape(label)}:</b> {escape(text)}", style)


def _build_report_filename(prefix: str, persons: list[Person]) -> str:
    if len(persons) == 1:
        return f"{prefix}_{_slugify(persons[0].anzeigename)}.pdf"
    return f"{prefix}_familie_{len(persons)}.pdf"


def _slugify(value: str) -> str:
    ascii_value = normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = "".join(character if character.isalnum() else "_" for character in ascii_value.lower())
    compact = "_".join(part for part in normalized.split("_") if part)
    return compact or "bericht"
