"""seed obvious parameter conversion rules

Revision ID: 20260421_0011
Revises: 20260421_0010
Create Date: 2026-04-21 23:55:00
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision = "20260421_0011"
down_revision = "20260421_0010"
branch_labels = None
depends_on = None


SEED_TAG = "seed_obvious_parameter_conversion_rules_2026_04_21"

SEED_RULES = (
    {
        "parameter_name": "25-Hydroxy-Vitamin D",
        "source_unit": "ng/ml",
        "target_unit": "µg/l",
        "factor": 1.0,
        "quelle": "SI-Maßstabsumrechnung bei identischer Massenkonzentration.",
        "bemerkung": "1 ng/ml entspricht 1 µg/l.",
    },
    {
        "parameter_name": "Vitamin A",
        "source_unit": "µg/l",
        "target_unit": "ng/ml",
        "factor": 1.0,
        "quelle": "SI-Maßstabsumrechnung bei identischer Massenkonzentration.",
        "bemerkung": "1 µg/l entspricht 1 ng/ml.",
    },
    {
        "parameter_name": "Zink",
        "source_unit": "mg/l",
        "target_unit": "µg/ml",
        "factor": 1.0,
        "quelle": "SI-Maßstabsumrechnung bei identischer Massenkonzentration.",
        "bemerkung": "1 mg/l entspricht 1 µg/ml.",
    },
    {
        "parameter_name": "Eisen",
        "source_unit": "mg/l",
        "target_unit": "µg/dl",
        "factor": 100.0,
        "quelle": "SI-Maßstabsumrechnung mit Liter/Deziliter-Umrechnung.",
        "bemerkung": "1 mg/l entspricht 100 µg/dl.",
    },
    {
        "parameter_name": "Transferrin",
        "source_unit": "g/l",
        "target_unit": "mg/dl",
        "factor": 100.0,
        "quelle": "SI-Maßstabsumrechnung mit Liter/Deziliter-Umrechnung.",
        "bemerkung": "1 g/l entspricht 100 mg/dl.",
    },
    {
        "parameter_name": "Hämatokrit",
        "source_unit": "l/l",
        "target_unit": "%",
        "factor": 100.0,
        "quelle": "Volumenanteil in Prozent; 1 % entspricht 0,01 l/l.",
        "bemerkung": "1 l/l entspricht 100 %.",
    },
    {
        "parameter_name": "Lymphozyten absolut",
        "source_unit": "Tsd./µl",
        "target_unit": "/µl",
        "factor": 1000.0,
        "quelle": "Zellzahl in Tausend pro Mikroliter.",
        "bemerkung": "1 Tsd./µl entspricht 1000 /µl.",
    },
    {
        "parameter_name": "Monozyten absolut",
        "source_unit": "Tsd./µl",
        "target_unit": "/µl",
        "factor": 1000.0,
        "quelle": "Zellzahl in Tausend pro Mikroliter.",
        "bemerkung": "1 Tsd./µl entspricht 1000 /µl.",
    },
    {
        "parameter_name": "Calcium",
        "source_unit": "mg/l",
        "target_unit": "mmol/l",
        "factor": 0.024951344877488896,
        "quelle": "Parametergebundene Umrechnung über die relative Atommasse von Calcium.",
        "bemerkung": "1 mmol/l Calcium entspricht 40,078 mg/l.",
    },
    {
        "parameter_name": "Magnesium",
        "source_unit": "mg/l",
        "target_unit": "mmol/l",
        "factor": 0.04114295118388842,
        "quelle": "Parametergebundene Umrechnung über die relative Atommasse von Magnesium.",
        "bemerkung": "1 mmol/l Magnesium entspricht 24,3055 mg/l.",
    },
    {
        "parameter_name": "Natrium",
        "source_unit": "mg/l",
        "target_unit": "mmol/l",
        "factor": 0.04349760921132654,
        "quelle": "Parametergebundene Umrechnung über die relative Atommasse von Natrium.",
        "bemerkung": "1 mmol/l Natrium entspricht 22,98976928 mg/l.",
    },
    {
        "parameter_name": "Kalium",
        "source_unit": "mg/l",
        "target_unit": "mmol/l",
        "factor": 0.025576559594662684,
        "quelle": "Parametergebundene Umrechnung über die relative Atommasse von Kalium.",
        "bemerkung": "1 mmol/l Kalium entspricht 39,0983 mg/l.",
    },
)


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(timezone.utc)

    laborparameter = sa.table(
        "laborparameter",
        sa.column("id", sa.String),
        sa.column("anzeigename", sa.String),
    )
    messwert = sa.table(
        "messwert",
        sa.column("laborparameter_id", sa.String),
        sa.column("wert_typ", sa.String),
        sa.column("wert_num", sa.Float),
        sa.column("einheit_original", sa.String),
        sa.column("wert_normiert_num", sa.Float),
        sa.column("einheit_normiert", sa.String),
        sa.column("umrechnungsregel_id", sa.String),
        sa.column("geaendert_am", sa.DateTime(timezone=True)),
    )
    regel = sa.table(
        "parameter_umrechnungsregel",
        sa.column("id", sa.String),
        sa.column("laborparameter_id", sa.String),
        sa.column("von_einheit", sa.String),
        sa.column("nach_einheit", sa.String),
        sa.column("regel_typ", sa.String),
        sa.column("faktor", sa.Float),
        sa.column("offset", sa.Float),
        sa.column("formel_text", sa.Text),
        sa.column("rundung_stellen", sa.Integer),
        sa.column("quelle_beschreibung", sa.Text),
        sa.column("bemerkung", sa.Text),
        sa.column("aktiv", sa.Boolean),
        sa.column("erstellt_am", sa.DateTime(timezone=True)),
        sa.column("geaendert_am", sa.DateTime(timezone=True)),
    )

    parameter_names = [spec["parameter_name"] for spec in SEED_RULES]
    parameter_rows = bind.execute(
        sa.select(laborparameter.c.id, laborparameter.c.anzeigename).where(
            laborparameter.c.anzeigename.in_(parameter_names)
        )
    ).all()
    parameter_ids = {row.anzeigename: row.id for row in parameter_rows}

    existing_rule_keys = {
        (row.laborparameter_id, row.von_einheit, row.nach_einheit)
        for row in bind.execute(
            sa.select(
                regel.c.laborparameter_id,
                regel.c.von_einheit,
                regel.c.nach_einheit,
            ).where(regel.c.laborparameter_id.in_(list(parameter_ids.values())))
        )
    }

    inserted_rules: list[dict[str, object]] = []
    measurement_updates: list[dict[str, object]] = []
    for spec in SEED_RULES:
        parameter_id = parameter_ids.get(spec["parameter_name"])
        if parameter_id is None:
            continue

        rule_key = (parameter_id, spec["source_unit"], spec["target_unit"])
        if rule_key in existing_rule_keys:
            continue

        rule_id = str(uuid.uuid4())
        inserted_rules.append(
            {
                "id": rule_id,
                "laborparameter_id": parameter_id,
                "von_einheit": spec["source_unit"],
                "nach_einheit": spec["target_unit"],
                "regel_typ": "faktor",
                "faktor": spec["factor"],
                "offset": None,
                "formel_text": None,
                "rundung_stellen": None,
                "quelle_beschreibung": f"{spec['quelle']} [{SEED_TAG}]",
                "bemerkung": spec["bemerkung"],
                "aktiv": True,
                "erstellt_am": now,
                "geaendert_am": now,
            }
        )
        measurement_updates.append(
            {
                "parameter_id": parameter_id,
                "source_unit": spec["source_unit"],
                "target_unit": spec["target_unit"],
                "factor": spec["factor"],
                "rule_id": rule_id,
            }
        )

    if inserted_rules:
        op.bulk_insert(regel, inserted_rules)

    for update_spec in measurement_updates:
        bind.execute(
            messwert.update()
            .where(messwert.c.laborparameter_id == update_spec["parameter_id"])
            .where(messwert.c.wert_typ == "numerisch")
            .where(messwert.c.wert_num.is_not(None))
            .where(messwert.c.einheit_original == update_spec["source_unit"])
            .values(
                wert_normiert_num=messwert.c.wert_num * update_spec["factor"],
                einheit_normiert=update_spec["target_unit"],
                umrechnungsregel_id=update_spec["rule_id"],
                geaendert_am=now,
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(timezone.utc)

    regel = sa.table(
        "parameter_umrechnungsregel",
        sa.column("id", sa.String),
        sa.column("quelle_beschreibung", sa.Text),
    )
    messwert = sa.table(
        "messwert",
        sa.column("umrechnungsregel_id", sa.String),
        sa.column("wert_normiert_num", sa.Float),
        sa.column("einheit_normiert", sa.String),
        sa.column("geaendert_am", sa.DateTime(timezone=True)),
    )

    rule_ids = list(
        bind.execute(
            sa.select(regel.c.id).where(regel.c.quelle_beschreibung.like(f"%[{SEED_TAG}]%"))
        ).scalars()
    )
    if not rule_ids:
        return

    bind.execute(
        messwert.update()
        .where(messwert.c.umrechnungsregel_id.in_(rule_ids))
        .values(
            wert_normiert_num=None,
            einheit_normiert=None,
            umrechnungsregel_id=None,
            geaendert_am=now,
        )
    )
    bind.execute(
        sa.delete(regel).where(regel.c.id.in_(rule_ids))
    )
