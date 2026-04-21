"""add unit master data

Revision ID: 20260421_0007
Revises: 20260421_0006
Create Date: 2026-04-21 12:15:00
"""

from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa


revision = "20260421_0007"
down_revision = "20260421_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "einheit",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("kuerzel", sa.String(length=50), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("kuerzel"),
    )

    connection = op.get_bind()
    now = datetime.now(timezone.utc)
    rows = []
    for kuerzel in _collect_existing_units(connection):
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "kuerzel": kuerzel,
                "aktiv": True,
                "erstellt_am": now,
                "geaendert_am": now,
            }
        )

    if rows:
        unit_table = sa.table(
            "einheit",
            sa.column("id", sa.String(length=36)),
            sa.column("kuerzel", sa.String(length=50)),
            sa.column("aktiv", sa.Boolean()),
            sa.column("erstellt_am", sa.DateTime(timezone=True)),
            sa.column("geaendert_am", sa.DateTime(timezone=True)),
        )
        op.bulk_insert(unit_table, rows)


def downgrade() -> None:
    op.drop_table("einheit")


def _collect_existing_units(connection) -> list[str]:
    queries = [
        "SELECT standard_einheit FROM laborparameter",
        "SELECT einheit FROM zielbereich",
        "SELECT einheit FROM zielbereich_person_override",
        "SELECT einheit_original FROM messwert",
        "SELECT einheit_normiert FROM messwert",
        "SELECT einheit FROM messwert_referenz",
    ]
    values: set[str] = set()
    for query in queries:
        for (raw_value,) in connection.execute(sa.text(query)):
            if raw_value is None:
                continue
            cleaned = str(raw_value).strip()
            if cleaned:
                values.add(cleaned)
    return sorted(values, key=lambda item: item.lower())
