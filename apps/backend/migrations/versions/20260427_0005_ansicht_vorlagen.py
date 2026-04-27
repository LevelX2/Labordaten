"""add reusable view templates

Revision ID: 20260427_0005
Revises: 20260427_0004
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_0005"
down_revision = "20260427_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ansicht_vorlage",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("bereich", sa.String(length=40), nullable=False),
        sa.Column("vorlage_typ", sa.String(length=60), nullable=False),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("konfiguration_json", sa.Text(), nullable=False),
        sa.Column("schema_version", sa.String(length=20), nullable=False, server_default="1"),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("sortierung", sa.Integer()),
        sa.Column("zuletzt_verwendet_am", sa.DateTime(timezone=True)),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ansicht_vorlage_bereich_typ", "ansicht_vorlage", ["bereich", "vorlage_typ"])
    op.create_index("ix_ansicht_vorlage_aktiv_name", "ansicht_vorlage", ["aktiv", "name"])


def downgrade() -> None:
    op.drop_index("ix_ansicht_vorlage_aktiv_name", table_name="ansicht_vorlage")
    op.drop_index("ix_ansicht_vorlage_bereich_typ", table_name="ansicht_vorlage")
    op.drop_table("ansicht_vorlage")
