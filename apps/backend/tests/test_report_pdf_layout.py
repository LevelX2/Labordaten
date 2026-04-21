from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.platypus import LongTable, Paragraph, Spacer
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.person import Person
from labordaten_backend.modules.berichte import schemas as bericht_schemas
from labordaten_backend.modules.berichte import service as bericht_service
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_append_report_block_keeps_compact_sections_together() -> None:
    styles = bericht_service._build_pdf_styles()
    frame_width, frame_height = bericht_service._page_frame_size(landscape(A4))
    elements: list[object] = []
    block = [
        Paragraph("Glukose", styles["section"]),
        Spacer(1, 0.2 * cm),
        Paragraph("Kurzer Verlauf mit wenigen Zeilen.", styles["body"]),
    ]

    bericht_service._append_report_block(elements, block, frame_width, frame_height)

    assert len(elements) == 2
    assert elements[0].__class__.__name__ == "CondPageBreak"
    assert elements[1].__class__.__name__ == "KeepTogether"


def test_append_report_block_leaves_long_tables_splittable() -> None:
    styles = bericht_service._build_pdf_styles()
    frame_width, frame_height = bericht_service._page_frame_size(landscape(A4))
    elements: list[object] = []
    rows = [["Datum", "Wert", "Einheit", "Labor"]]
    for index in range(180):
        rows.append(
            [
                Paragraph(f"{index + 1:02d}.01.2024", styles["table"]),
                Paragraph(str(index), styles["table"]),
                Paragraph("mg/dl", styles["table"]),
                Paragraph("Testlabor", styles["table"]),
            ]
        )
    block = [
        Paragraph("Glukose", styles["section"]),
        LongTable(rows, colWidths=[3.0 * cm, 4.0 * cm, 3.0 * cm, 6.0 * cm], repeatRows=1),
    ]

    bericht_service._append_report_block(elements, block, frame_width, frame_height)

    assert elements[0].__class__.__name__ == "CondPageBreak"
    assert all(element.__class__.__name__ != "KeepTogether" for element in elements[1:])
    assert any(isinstance(element, LongTable) for element in elements[1:])


def test_render_verlaufsbericht_pdf_with_many_points_returns_pdf(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="mg/dl"))

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="glukose_lang",
                anzeigename="Glukose",
                standard_einheit="mg/dl",
                wert_typ_standard="numerisch",
            ),
        )

        start = date(2023, 1, 1)
        for index in range(48):
            befund = Befund(
                person_id=person.id,
                entnahmedatum=start + timedelta(days=index * 14),
                quelle_typ="manuell",
            )
            db.add(befund)
            db.commit()
            db.refresh(befund)
            db.add(
                Messwert(
                    person_id=person.id,
                    befund_id=befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Glukose",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text=str(85 + index),
                    wert_num=float(85 + index),
                    einheit_original="mg/dl",
                )
            )
            db.commit()

        filename, content = bericht_service.render_verlaufsbericht_pdf(
            db,
            bericht_schemas.VerlaufsberichtRequest(person_ids=[person.id]),
        )

        assert filename.endswith(".pdf")
        assert content.startswith(b"%PDF")
        assert len(content) > 5000
