from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.person import Person
from labordaten_backend.modules.berichte import schemas as bericht_schemas
from labordaten_backend.modules.berichte import service as bericht_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def _add_person(db: Session, name: str) -> Person:
    person = Person(
        anzeigename=name,
        vollname=name,
        geburtsdatum=date(1980, 1, 1),
        geschlecht_code="w",
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def _add_parameter(db: Session, key: str, name: str) -> Laborparameter:
    parameter = Laborparameter(
        interner_schluessel=key,
        anzeigename=name,
        standard_einheit="mg/l",
        wert_typ_standard="numerisch",
    )
    db.add(parameter)
    db.commit()
    db.refresh(parameter)
    return parameter


def _add_value(
    db: Session,
    person: Person,
    parameter: Laborparameter,
    collected_on: date,
    value: float,
    *,
    lower: float = 10,
    upper: float = 100,
    befund_bemerkung: str | None = None,
) -> Messwert:
    befund = Befund(person_id=person.id, entnahmedatum=collected_on, quelle_typ="manuell", bemerkung=befund_bemerkung)
    db.add(befund)
    db.commit()
    db.refresh(befund)

    messwert = Messwert(
        person_id=person.id,
        befund_id=befund.id,
        laborparameter_id=parameter.id,
        original_parametername=parameter.anzeigename,
        wert_typ="numerisch",
        wert_operator="exakt",
        wert_roh_text=str(value),
        wert_num=value,
        einheit_original="mg/l",
    )
    db.add(messwert)
    db.commit()
    db.refresh(messwert)

    db.add(
        MesswertReferenz(
            messwert_id=messwert.id,
            referenz_text_original=f"{lower}-{upper}",
            wert_typ="numerisch",
            untere_grenze_num=lower,
            obere_grenze_num=upper,
            einheit="mg/l",
        )
    )
    db.commit()
    return messwert


def test_report_can_sort_by_person_group_assignment_and_collection_date(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        anna = _add_person(db, "Anna")
        berta = _add_person(db, "Berta")
        ferritin = _add_parameter(db, "ferritin", "Ferritin")
        transferrin = _add_parameter(db, "transferrin", "Transferrin")
        vitamin_d = _add_parameter(db, "vitamin_d", "Vitamin D")

        eisen = ParameterGruppe(name="Eisen")
        vitamine = ParameterGruppe(name="Vitamine")
        db.add_all([eisen, vitamine])
        db.commit()
        db.refresh(eisen)
        db.refresh(vitamine)
        db.add_all(
            [
                GruppenParameter(parameter_gruppe_id=eisen.id, laborparameter_id=ferritin.id, sortierung=2),
                GruppenParameter(parameter_gruppe_id=eisen.id, laborparameter_id=transferrin.id, sortierung=1),
                GruppenParameter(parameter_gruppe_id=vitamine.id, laborparameter_id=vitamin_d.id, sortierung=1),
            ]
        )
        db.commit()

        _add_value(db, anna, ferritin, date(2024, 2, 1), 50)
        _add_value(db, anna, transferrin, date(2024, 1, 1), 3)
        _add_value(db, anna, vitamin_d, date(2024, 1, 15), 40)
        _add_value(db, berta, transferrin, date(2024, 1, 10), 3)

        bericht = bericht_service.build_verlaufsbericht(
            db,
            bericht_schemas.VerlaufsberichtRequest(
                person_ids=[berta.id, anna.id],
                sortierung="person_berichtsgruppe_sortierung_entnahmezeitpunkt",
            ),
        )

        assert [(punkt.person_anzeigename, punkt.primaere_berichtsgruppe, punkt.parameter_anzeigename) for punkt in bericht.punkte] == [
            ("Anna", "Eisen", "Transferrin"),
            ("Anna", "Eisen", "Ferritin"),
            ("Anna", "Vitamine", "Vitamin D"),
            ("Berta", "Eisen", "Transferrin"),
        ]


def test_report_can_put_reference_abnormalities_first(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        anna = _add_person(db, "Anna")
        ferritin = _add_parameter(db, "ferritin", "Ferritin")
        transferrin = _add_parameter(db, "transferrin", "Transferrin")

        _add_value(db, anna, transferrin, date(2024, 1, 1), 30)
        _add_value(db, anna, ferritin, date(2024, 2, 1), 5)

        bericht = bericht_service.build_arztbericht(
            db,
            bericht_schemas.ArztberichtRequest(
                person_ids=[anna.id],
                sortierung="person_entnahmezeitpunkt",
                auffaelligkeiten_zuerst=True,
            ),
        )

        assert [eintrag.parameter_anzeigename for eintrag in bericht.eintraege] == ["Ferritin", "Transferrin"]
        assert [eintrag.ausserhalb_referenzbereich for eintrag in bericht.eintraege] == [True, False]


def test_arztbericht_pdf_omits_labor_column_when_option_disabled(tmp_path: Path, monkeypatch) -> None:
    captured: dict[str, object] = {}

    class CapturingLongTable:
        def __init__(self, rows: list[list[object]], colWidths: list[object], repeatRows: int) -> None:
            captured["rows"] = rows
            captured["col_widths"] = colWidths
            captured["repeat_rows"] = repeatRows

        def setStyle(self, style: object) -> None:
            captured["style"] = style

    monkeypatch.setattr(bericht_service, "LongTable", CapturingLongTable)
    monkeypatch.setattr(bericht_service, "_build_pdf", lambda *args, **kwargs: b"pdf")

    with _make_session(tmp_path) as db:
        anna = _add_person(db, "Anna")
        ferritin = _add_parameter(db, "ferritin", "Ferritin")
        _add_value(db, anna, ferritin, date(2024, 2, 1), 50)

        bericht_service.render_arztbericht_pdf(
            db,
            bericht_schemas.ArztberichtRequest(
                person_ids=[anna.id],
                include_labor=False,
            ),
        )

    rows = captured["rows"]
    assert rows[0] == ["Parameter", "Datum", "Wert", "Referenz"]
    assert all(len(row) == 4 for row in rows)


def test_arztbericht_pdf_spans_befund_note_across_report_width(tmp_path: Path, monkeypatch) -> None:
    captured: dict[str, object] = {"styles": []}

    class CapturingLongTable:
        def __init__(self, rows: list[list[object]], colWidths: list[object], repeatRows: int) -> None:
            captured["rows"] = rows

        def setStyle(self, style: object) -> None:
            captured["styles"].append(style)

    monkeypatch.setattr(bericht_service, "LongTable", CapturingLongTable)
    monkeypatch.setattr(bericht_service, "_build_pdf", lambda *args, **kwargs: b"pdf")

    with _make_session(tmp_path) as db:
        anna = _add_person(db, "Anna")
        ferritin = _add_parameter(db, "ferritin", "Ferritin")
        _add_value(db, anna, ferritin, date(2024, 2, 1), 50, befund_bemerkung="Langer Befundtext")

        bericht_service.render_arztbericht_pdf(
            db,
            bericht_schemas.ArztberichtRequest(
                person_ids=[anna.id],
                include_labor=False,
                include_befundbemerkung=True,
            ),
        )

    rows = captured["rows"]
    styles = captured["styles"]
    note_row_index = len(rows) - 1
    span_commands = [command for style in styles for command in style.getCommands() if command[0] == "SPAN"]
    assert span_commands == [("SPAN", (0, note_row_index), (-1, note_row_index))]
