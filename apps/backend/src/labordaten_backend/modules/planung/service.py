from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta
from html import escape
from io import BytesIO
from unicodedata import normalize

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.core.pdf_branding import (
    PDF_BOTTOM_MARGIN,
    PDF_LEFT_MARGIN,
    PDF_RIGHT_MARGIN,
    PDF_TOP_MARGIN,
    draw_labordaten_pdf_page,
)
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.modules.planung.schemas import (
    FaelligkeitRead,
    PlanungEinmaligBatchCreate,
    PlanungEinmaligCreate,
    PlanungEinmaligUpdate,
    PlanungZyklischBatchCreate,
    PlanungZyklischCreate,
    PlanungZyklischRead,
    PlanungZyklischUpdate,
)


@dataclass
class LetzteMessungInfo:
    messwert_id: str
    datum: date


def list_planung_zyklisch(
    db: Session,
    person_id: str | None = None,
    status: str | None = None,
) -> list[PlanungZyklischRead]:
    stmt = select(PlanungZyklisch).order_by(PlanungZyklisch.erstellt_am.desc())
    if person_id:
        stmt = stmt.where(PlanungZyklisch.person_id == person_id)
    if status:
        stmt = stmt.where(PlanungZyklisch.status == status)
    planungen = list(db.scalars(stmt))
    return [_build_zyklisch_read(db, planung) for planung in planungen]


def create_planung_zyklisch(db: Session, payload: PlanungZyklischCreate) -> PlanungZyklischRead:
    _assert_person_and_parameter_exist(db, payload.person_id, payload.laborparameter_id)
    if payload.status == "aktiv":
        _assert_no_duplicate_active_plan(db, payload.person_id, payload.laborparameter_id)

    planung = PlanungZyklisch(**payload.model_dump())
    db.add(planung)
    db.commit()
    db.refresh(planung)
    return _build_zyklisch_read(db, planung)


def create_planung_zyklisch_batch(db: Session, payload: PlanungZyklischBatchCreate) -> list[PlanungZyklischRead]:
    _assert_person_exists(db, payload.person_id)
    _assert_parameters_exist(db, payload.laborparameter_ids)
    if payload.status == "aktiv":
        for laborparameter_id in payload.laborparameter_ids:
            _assert_no_duplicate_active_plan(db, payload.person_id, laborparameter_id)

    base_data = payload.model_dump(exclude={"laborparameter_ids"})
    planungen = [
        PlanungZyklisch(**base_data, laborparameter_id=laborparameter_id)
        for laborparameter_id in payload.laborparameter_ids
    ]
    db.add_all(planungen)
    db.commit()
    for planung in planungen:
        db.refresh(planung)
    return [_build_zyklisch_read(db, planung) for planung in planungen]


def update_planung_zyklisch(
    db: Session,
    planung_id: str,
    payload: PlanungZyklischUpdate,
) -> PlanungZyklischRead | None:
    planung = db.get(PlanungZyklisch, planung_id)
    if planung is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(planung, key, value)

    if planung.enddatum and planung.enddatum < planung.startdatum:
        raise ValueError("Das Enddatum darf nicht vor dem Startdatum liegen.")

    if planung.status == "aktiv":
        _assert_no_duplicate_active_plan(db, planung.person_id, planung.laborparameter_id, exclude_id=planung.id)

    db.add(planung)
    db.commit()
    db.refresh(planung)
    return _build_zyklisch_read(db, planung)


def list_planung_einmalig(
    db: Session,
    person_id: str | None = None,
    status: str | None = None,
) -> list[PlanungEinmalig]:
    stmt = select(PlanungEinmalig).order_by(PlanungEinmalig.erstellt_am.desc())
    if person_id:
        stmt = stmt.where(PlanungEinmalig.person_id == person_id)
    if status:
        stmt = stmt.where(PlanungEinmalig.status == status)
    return list(db.scalars(stmt))


def create_planung_einmalig(db: Session, payload: PlanungEinmaligCreate) -> PlanungEinmalig:
    _assert_person_and_parameter_exist(db, payload.person_id, payload.laborparameter_id)

    planung = PlanungEinmalig(**payload.model_dump())
    db.add(planung)
    db.commit()
    db.refresh(planung)
    return planung


def create_planung_einmalig_batch(db: Session, payload: PlanungEinmaligBatchCreate) -> list[PlanungEinmalig]:
    _assert_person_exists(db, payload.person_id)
    _assert_parameters_exist(db, payload.laborparameter_ids)

    base_data = payload.model_dump(exclude={"laborparameter_ids"})
    planungen = [
        PlanungEinmalig(**base_data, laborparameter_id=laborparameter_id)
        for laborparameter_id in payload.laborparameter_ids
    ]
    db.add_all(planungen)
    db.commit()
    for planung in planungen:
        db.refresh(planung)
    return planungen


def update_planung_einmalig(
    db: Session,
    planung_id: str,
    payload: PlanungEinmaligUpdate,
) -> PlanungEinmalig | None:
    planung = db.get(PlanungEinmalig, planung_id)
    if planung is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    erledigt_durch_messwert_id = updates.get("erledigt_durch_messwert_id")
    if erledigt_durch_messwert_id:
        messwert = db.get(Messwert, erledigt_durch_messwert_id)
        if messwert is None:
            raise ValueError("Der verknüpfte Messwert existiert nicht.")
        if messwert.person_id != planung.person_id or messwert.laborparameter_id != planung.laborparameter_id:
            raise ValueError("Der Messwert passt nicht zu Person und Parameter der Vormerkung.")

    for key, value in updates.items():
        setattr(planung, key, value)

    db.add(planung)
    db.commit()
    db.refresh(planung)
    return planung


def list_faelligkeiten(
    db: Session,
    person_id: str | None = None,
    datum_von: date | None = None,
    datum_bis: date | None = None,
) -> list[FaelligkeitRead]:
    faelligkeiten: list[FaelligkeitRead] = []
    has_date_range = datum_von is not None or datum_bis is not None

    for planung in _load_due_relevant_cyclic_plans(db, person_id):
        read_model = _build_zyklisch_read(db, planung)
        include_planung = (
            read_model.faelligkeitsstatus in {"bald_faellig", "faellig", "ueberfaellig"}
            if not has_date_range
            else planung.status == "aktiv" and _date_in_range(read_model.naechste_faelligkeit, datum_von, datum_bis)
        )
        if include_planung:
            faelligkeiten.append(
                FaelligkeitRead(
                    planung_typ="zyklisch",
                    planung_id=planung.id,
                    person_id=planung.person_id,
                    laborparameter_id=planung.laborparameter_id,
                    status=read_model.faelligkeitsstatus,
                    prioritaet=planung.prioritaet,
                    bemerkung=planung.bemerkung,
                    letzte_relevante_messung_id=read_model.letzte_relevante_messung_id,
                    letzte_relevante_messung_datum=read_model.letzte_relevante_messung_datum,
                    naechste_faelligkeit=read_model.naechste_faelligkeit,
                    intervall_label=f"{planung.intervall_wert} {planung.intervall_typ}",
                )
            )

    stmt = select(PlanungEinmalig).order_by(
        PlanungEinmalig.zieltermin_datum.is_(None),
        PlanungEinmalig.zieltermin_datum.asc(),
        PlanungEinmalig.erstellt_am.asc(),
    )
    if person_id:
        stmt = stmt.where(PlanungEinmalig.person_id == person_id)
    stmt = stmt.where(PlanungEinmalig.status.in_(("offen", "naechster_termin")))

    for vormerkung in db.scalars(stmt):
        if has_date_range and not _date_in_range(vormerkung.zieltermin_datum, datum_von, datum_bis):
            continue
        faelligkeiten.append(
            FaelligkeitRead(
                planung_typ="einmalig",
                planung_id=vormerkung.id,
                person_id=vormerkung.person_id,
                laborparameter_id=vormerkung.laborparameter_id,
                status=vormerkung.status,
                bemerkung=vormerkung.bemerkung,
                zieltermin_datum=vormerkung.zieltermin_datum,
            )
        )

    if has_date_range:
        return sorted(
            faelligkeiten,
            key=lambda item: (
                item.naechste_faelligkeit or item.zieltermin_datum or date.max,
                -(item.prioritaet or 0),
                _faelligkeit_sort_key(item.status),
            ),
        )

    return sorted(
        faelligkeiten,
        key=lambda item: (
            _faelligkeit_sort_key(item.status),
            item.naechste_faelligkeit or item.zieltermin_datum or date.max,
            -(item.prioritaet or 0),
        ),
    )


def render_faelligkeiten_pdf(
    db: Session,
    person_id: str | None = None,
    datum_von: date | None = None,
    datum_bis: date | None = None,
) -> tuple[str, bytes]:
    faelligkeiten = list_faelligkeiten(db, person_id=person_id, datum_von=datum_von, datum_bis=datum_bis)
    styles = _build_planning_pdf_styles()
    person_ids = {item.person_id for item in faelligkeiten}
    parameter_ids = {item.laborparameter_id for item in faelligkeiten}
    if person_id:
        person_ids.add(person_id)

    persons_by_id = (
        {person.id: person for person in db.scalars(select(Person).where(Person.id.in_(person_ids))).all()}
        if person_ids
        else {}
    )
    parameters_by_id = (
        {
            parameter.id: parameter
            for parameter in db.scalars(select(Laborparameter).where(Laborparameter.id.in_(parameter_ids))).all()
        }
        if parameter_ids
        else {}
    )

    elements: list[object] = [
        Paragraph("Anstehende Messungen", styles["title"]),
        Paragraph(_build_faelligkeit_pdf_person_label(person_id, persons_by_id, faelligkeiten), styles["subtitle"]),
        Paragraph(f"Zeitraum: {_format_pdf_date(datum_von)} bis {_format_pdf_date(datum_bis)}", styles["body"]),
        Paragraph(f"Erstellt am: {_format_pdf_date(date.today())}", styles["meta"]),
        Spacer(1, 0.45 * cm),
    ]

    if faelligkeiten:
        table_rows: list[list[object]] = [
            ["Termin", "Person", "Parameter", "Typ", "Status", "Priorität", "Letzte Messung", "Hinweis"]
        ]
        for item in faelligkeiten:
            person = persons_by_id.get(item.person_id)
            parameter = parameters_by_id.get(item.laborparameter_id)
            table_rows.append(
                [
                    _pdf_paragraph(_format_pdf_date(item.naechste_faelligkeit or item.zieltermin_datum), styles["table"]),
                    _pdf_paragraph(person.anzeigename if person else item.person_id, styles["table"]),
                    _pdf_paragraph(parameter.anzeigename if parameter else item.laborparameter_id, styles["table"]),
                    _pdf_paragraph(_format_pdf_planungstyp(item.planung_typ), styles["table"]),
                    _pdf_paragraph(_format_pdf_planungsstatus(item.status), styles["table"]),
                    _pdf_paragraph(str(item.prioritaet) if item.prioritaet is not None else "—", styles["table"]),
                    _pdf_paragraph(_format_pdf_date(item.letzte_relevante_messung_datum), styles["table"]),
                    _pdf_paragraph(item.bemerkung or item.intervall_label or "—", styles["table"]),
                ]
            )

        table = LongTable(
            table_rows,
            colWidths=[2.4 * cm, 3.2 * cm, 4.7 * cm, 2.2 * cm, 2.7 * cm, 1.8 * cm, 2.8 * cm, 5.2 * cm],
            repeatRows=1,
        )
        table.setStyle(_build_planning_pdf_table_style())
        elements.append(table)
    else:
        elements.append(Paragraph("Für diese Auswahl gibt es keine anstehenden Messungen.", styles["body"]))

    filename = _build_faelligkeit_pdf_filename(person_id, persons_by_id, datum_von, datum_bis)
    return filename, _build_planning_pdf(elements)


def _date_in_range(value: date | None, datum_von: date | None, datum_bis: date | None) -> bool:
    if value is None:
        return False
    if datum_von and value < datum_von:
        return False
    if datum_bis and value > datum_bis:
        return False
    return True


def _load_due_relevant_cyclic_plans(db: Session, person_id: str | None) -> list[PlanungZyklisch]:
    stmt = select(PlanungZyklisch).where(PlanungZyklisch.status.in_(("aktiv", "pausiert"))).order_by(
        PlanungZyklisch.prioritaet.desc(),
        PlanungZyklisch.erstellt_am.desc(),
    )
    if person_id:
        stmt = stmt.where(PlanungZyklisch.person_id == person_id)
    return list(db.scalars(stmt))


def _build_zyklisch_read(db: Session, planung: PlanungZyklisch) -> PlanungZyklischRead:
    letzte_messung = _find_latest_measurement(db, planung.person_id, planung.laborparameter_id)
    basisdatum = planung.startdatum
    if letzte_messung and letzte_messung.datum > basisdatum:
        basisdatum = letzte_messung.datum

    naechste_faelligkeit = _add_interval(basisdatum, planung.intervall_wert, planung.intervall_typ)
    if planung.enddatum and naechste_faelligkeit and naechste_faelligkeit > planung.enddatum:
        naechste_faelligkeit = None

    return PlanungZyklischRead(
        id=planung.id,
        person_id=planung.person_id,
        laborparameter_id=planung.laborparameter_id,
        intervall_wert=planung.intervall_wert,
        intervall_typ=planung.intervall_typ,
        startdatum=planung.startdatum,
        enddatum=planung.enddatum,
        status=planung.status,
        prioritaet=planung.prioritaet,
        karenz_tage=planung.karenz_tage,
        bemerkung=planung.bemerkung,
        letzte_relevante_messung_id=letzte_messung.messwert_id if letzte_messung else None,
        letzte_relevante_messung_datum=letzte_messung.datum if letzte_messung else None,
        naechste_faelligkeit=naechste_faelligkeit,
        faelligkeitsstatus=_compute_due_status(planung, naechste_faelligkeit),
        erstellt_am=planung.erstellt_am,
        geaendert_am=planung.geaendert_am,
    )


def _compute_due_status(planung: PlanungZyklisch, naechste_faelligkeit: date | None) -> str:
    if planung.status != "aktiv":
        return planung.status
    if naechste_faelligkeit is None:
        return "ohne_faelligkeit"

    heute = date.today()
    if planung.enddatum and heute > planung.enddatum:
        return "beendet"
    if heute > naechste_faelligkeit:
        return "ueberfaellig"
    if heute == naechste_faelligkeit:
        return "faellig"
    if planung.karenz_tage and heute >= naechste_faelligkeit - timedelta(days=planung.karenz_tage):
        return "bald_faellig"
    return "geplant"


def _find_latest_measurement(db: Session, person_id: str, laborparameter_id: str) -> LetzteMessungInfo | None:
    stmt = (
        select(Messwert, Befund.entnahmedatum, Befund.befunddatum)
        .join(Befund, Messwert.befund_id == Befund.id)
        .where(Messwert.person_id == person_id)
        .where(Messwert.laborparameter_id == laborparameter_id)
        .order_by(Messwert.erstellt_am.desc())
    )
    beste: LetzteMessungInfo | None = None
    for messwert, entnahmedatum, befunddatum in db.execute(stmt):
        effektives_datum = entnahmedatum or befunddatum or messwert.erstellt_am.date()
        if beste is None or effektives_datum > beste.datum:
            beste = LetzteMessungInfo(messwert_id=messwert.id, datum=effektives_datum)
    return beste


def _add_interval(basisdatum: date, intervall_wert: int, intervall_typ: str) -> date:
    if intervall_typ == "tage":
        return basisdatum + timedelta(days=intervall_wert)
    if intervall_typ == "wochen":
        return basisdatum + timedelta(weeks=intervall_wert)
    if intervall_typ == "monate":
        return _add_months(basisdatum, intervall_wert)
    if intervall_typ == "jahre":
        return _add_years(basisdatum, intervall_wert)
    raise ValueError("Unbekannter Intervalltyp.")


def _add_months(basisdatum: date, monate: int) -> date:
    zielmonat = basisdatum.month - 1 + monate
    jahr = basisdatum.year + zielmonat // 12
    monat = zielmonat % 12 + 1
    tag = min(basisdatum.day, monthrange(jahr, monat)[1])
    return date(jahr, monat, tag)


def _add_years(basisdatum: date, jahre: int) -> date:
    jahr = basisdatum.year + jahre
    tag = min(basisdatum.day, monthrange(jahr, basisdatum.month)[1])
    return date(jahr, basisdatum.month, tag)


def _assert_person_and_parameter_exist(db: Session, person_id: str, laborparameter_id: str) -> None:
    _assert_person_exists(db, person_id)
    _assert_parameters_exist(db, [laborparameter_id])


def _assert_person_exists(db: Session, person_id: str) -> None:
    if db.get(Person, person_id) is None:
        raise ValueError("Die gewählte Person existiert nicht.")


def _assert_parameters_exist(db: Session, laborparameter_ids: list[str]) -> None:
    existing_ids = set(db.scalars(select(Laborparameter.id).where(Laborparameter.id.in_(laborparameter_ids))))
    missing_ids = set(laborparameter_ids) - existing_ids
    if missing_ids:
        raise ValueError("Der gewählte Parameter existiert nicht.")


def _assert_no_duplicate_active_plan(
    db: Session,
    person_id: str,
    laborparameter_id: str,
    exclude_id: str | None = None,
) -> None:
    stmt = (
        select(PlanungZyklisch)
        .where(PlanungZyklisch.person_id == person_id)
        .where(PlanungZyklisch.laborparameter_id == laborparameter_id)
        .where(PlanungZyklisch.status == "aktiv")
    )
    if exclude_id:
        stmt = stmt.where(PlanungZyklisch.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ValueError("Für diese Person und diesen Parameter existiert bereits eine aktive zyklische Planung.")


def _faelligkeit_sort_key(status: str) -> int:
    ranking = {
        "ueberfaellig": 0,
        "faellig": 1,
        "naechster_termin": 2,
        "bald_faellig": 3,
        "offen": 4,
    }
    return ranking.get(status, 9)


def _build_planning_pdf_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "PlanungTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#16324f"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "PlanungSubtitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#2f4f4f"),
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "PlanungBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "PlanungMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#5b6572"),
            spaceAfter=4,
        ),
        "table": ParagraphStyle(
            "PlanungTable",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10,
        ),
    }


def _build_planning_pdf_table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbe7f3")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#16324f")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.2),
            ("LEADING", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b7c6d9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
    )


def _build_planning_pdf(elements: list[object]) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=PDF_LEFT_MARGIN,
        rightMargin=PDF_RIGHT_MARGIN,
        topMargin=PDF_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        title="Anstehende Messungen",
    )
    def draw_page(canvas, doc) -> None:
        draw_labordaten_pdf_page(canvas, doc, "Planungs-Merkzettel", "Labordaten · Anstehende Messungen")

    document.build(elements, onFirstPage=draw_page, onLaterPages=draw_page)
    return buffer.getvalue()


def _build_faelligkeit_pdf_person_label(
    person_id: str | None,
    persons_by_id: dict[str, Person],
    faelligkeiten: list[FaelligkeitRead],
) -> str:
    if person_id:
        person = persons_by_id.get(person_id)
        return f"Person: {escape(person.anzeigename if person else person_id)}"
    if not faelligkeiten:
        return "Personen: alle"

    unique_person_names = sorted(
        {
            persons_by_id.get(item.person_id).anzeigename if persons_by_id.get(item.person_id) else item.person_id
            for item in faelligkeiten
        }
    )
    if len(unique_person_names) <= 3:
        return "Personen: " + escape(", ".join(unique_person_names))
    return f"Personen: alle ({len(unique_person_names)} Personen mit anstehenden Messungen)"


def _build_faelligkeit_pdf_filename(
    person_id: str | None,
    persons_by_id: dict[str, Person],
    datum_von: date | None,
    datum_bis: date | None,
) -> str:
    person_part = "alle"
    if person_id:
        person = persons_by_id.get(person_id)
        person_part = _slugify_pdf_part(person.anzeigename if person else person_id)
    return f"anstehende_messungen_{person_part}_{_filename_date_part(datum_von)}_{_filename_date_part(datum_bis)}.pdf"


def _format_pdf_date(value: date | None) -> str:
    if value is None:
        return "—"
    return value.strftime("%d.%m.%Y")


def _filename_date_part(value: date | None) -> str:
    return value.strftime("%Y%m%d") if value else "offen"


def _format_pdf_planungstyp(value: str) -> str:
    return "Zyklisch" if value == "zyklisch" else "Einmalig"


def _format_pdf_planungsstatus(value: str) -> str:
    labels = {
        "aktiv": "Aktiv",
        "pausiert": "Pausiert",
        "beendet": "Beendet",
        "ueberfaellig": "Überfällig",
        "faellig": "Fällig",
        "bald_faellig": "Bald fällig",
        "geplant": "Noch nicht fällig",
        "ohne_faelligkeit": "Ohne Fälligkeit",
        "offen": "Offen",
        "naechster_termin": "Nächster Termin",
        "erledigt": "Erledigt",
        "uebersprungen": "Übersprungen",
        "abgebrochen": "Abgebrochen",
    }
    return labels.get(value, value)


def _pdf_paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


def _slugify_pdf_part(value: str) -> str:
    ascii_value = normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = "".join(character if character.isalnum() else "_" for character in ascii_value.lower())
    compact = "_".join(part for part in normalized.split("_") if part)
    return compact or "planung"
