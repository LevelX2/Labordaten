"""add unit aliases and canonicalize known unit variants

Revision ID: 20260421_0009
Revises: 20260421_0008
Create Date: 2026-04-21 22:05:00
"""

from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa


revision = "20260421_0009"
down_revision = "20260421_0008"
branch_labels = None
depends_on = None


CANONICAL_ALIASES: dict[str, list[str]] = {
    "Tsd./µl": ["/nl", "1000/µl"],
    "Mio./µl": ["/pl", "Mill/µl", "Mio/µl"],
    "KbE/ml": ["cfu/ml"],
    "mg/l": ["mg/L"],
    "µg/l": ["µg/L"],
    "µIU/ml": ["mIU/l"],
    "ml/min/1.73m²": ["ml/min/1,73m2", "ml/min/1.73m2", "ml/min/1,73m²"],
}

UNIT_COLUMNS = [
    ("laborparameter", "standard_einheit"),
    ("zielbereich", "einheit"),
    ("zielbereich_person_override", "einheit"),
    ("messwert", "einheit_original"),
    ("messwert", "einheit_normiert"),
    ("messwert_referenz", "einheit"),
]


def upgrade() -> None:
    op.create_table(
        "einheit_alias",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("einheit_id", sa.String(length=36), sa.ForeignKey("einheit.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=50), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=80), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alias_normalisiert"),
    )
    op.create_index("ix_einheit_alias_einheit", "einheit_alias", ["einheit_id"])

    connection = op.get_bind()
    now = datetime.now(timezone.utc)

    for canonical, aliases in CANONICAL_ALIASES.items():
        canonical_id = _get_or_create_unit(connection, canonical, now)
        for alias in aliases:
            _rewrite_unit_values(connection, alias, canonical)
            _delete_duplicate_unit_row(connection, alias, canonical)
            _upsert_alias(connection, canonical_id, alias, now)


def downgrade() -> None:
    op.drop_index("ix_einheit_alias_einheit", table_name="einheit_alias")
    op.drop_table("einheit_alias")


def _get_or_create_unit(connection, kuerzel: str, now: datetime) -> str:
    row = connection.execute(
        sa.text("SELECT id, aktiv FROM einheit WHERE kuerzel = :kuerzel"),
        {"kuerzel": kuerzel},
    ).first()
    if row is not None:
        if not row.aktiv:
            connection.execute(
                sa.text("UPDATE einheit SET aktiv = 1, geaendert_am = :now WHERE id = :id"),
                {"id": row.id, "now": now},
            )
        return str(row.id)

    unit_id = str(uuid.uuid4())
    connection.execute(
        sa.text(
            """
            INSERT INTO einheit (id, kuerzel, aktiv, erstellt_am, geaendert_am)
            VALUES (:id, :kuerzel, 1, :now, :now)
            """
        ),
        {"id": unit_id, "kuerzel": kuerzel, "now": now},
    )
    return unit_id


def _rewrite_unit_values(connection, source: str, target: str) -> None:
    if source == target:
        return
    for table_name, column_name in UNIT_COLUMNS:
        connection.execute(
            sa.text(f"UPDATE {table_name} SET {column_name} = :target WHERE {column_name} = :source"),
            {"source": source, "target": target},
        )


def _delete_duplicate_unit_row(connection, source: str, target: str) -> None:
    if source == target:
        return
    source_row = connection.execute(
        sa.text("SELECT id FROM einheit WHERE kuerzel = :kuerzel"),
        {"kuerzel": source},
    ).first()
    target_row = connection.execute(
        sa.text("SELECT id FROM einheit WHERE kuerzel = :kuerzel"),
        {"kuerzel": target},
    ).first()
    if source_row is None or target_row is None or source_row.id == target_row.id:
        return
    connection.execute(sa.text("DELETE FROM einheit WHERE id = :id"), {"id": source_row.id})


def _upsert_alias(connection, einheit_id: str, alias_text: str, now: datetime) -> None:
    alias_normalisiert = _normalize_lookup(alias_text)
    if alias_normalisiert is None:
        return

    existing = connection.execute(
        sa.text("SELECT id FROM einheit_alias WHERE alias_normalisiert = :alias_normalisiert"),
        {"alias_normalisiert": alias_normalisiert},
    ).first()
    if existing is not None:
        connection.execute(
            sa.text(
                """
                UPDATE einheit_alias
                SET einheit_id = :einheit_id,
                    alias_text = :alias_text,
                    bemerkung = :bemerkung,
                    geaendert_am = :now
                WHERE id = :id
                """
            ),
            {
                "id": existing.id,
                "einheit_id": einheit_id,
                "alias_text": alias_text,
                "bemerkung": "Vorbelegte Schreibvariante aus bestehendem Datenbestand",
                "now": now,
            },
        )
        return

    connection.execute(
        sa.text(
            """
            INSERT INTO einheit_alias (
                id,
                einheit_id,
                alias_text,
                alias_normalisiert,
                bemerkung,
                erstellt_am,
                geaendert_am
            )
            VALUES (
                :id,
                :einheit_id,
                :alias_text,
                :alias_normalisiert,
                :bemerkung,
                :now,
                :now
            )
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "einheit_id": einheit_id,
            "alias_text": alias_text,
            "alias_normalisiert": alias_normalisiert,
            "bemerkung": "Vorbelegte Schreibvariante aus bestehendem Datenbestand",
            "now": now,
        },
    )


def _normalize_lookup(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return (
        cleaned.replace("μ", "µ")
        .replace("²", "2")
        .replace(" ", "")
        .replace(",", ".")
        .lower()
    )
