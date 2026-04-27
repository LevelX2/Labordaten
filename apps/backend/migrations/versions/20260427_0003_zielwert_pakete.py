"""add target value packages

Revision ID: 20260427_0003
Revises: 20260427_0002
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_0003"
down_revision = "20260427_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "zielwert_paket",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("paket_schluessel", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("zielbereich_quelle_id", sa.String(length=36)),
        sa.Column("version", sa.String(length=80)),
        sa.Column("jahr", sa.Integer()),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["zielbereich_quelle_id"], ["zielbereich_quelle.id"]),
        sa.UniqueConstraint("paket_schluessel", name="uq_zielwert_paket_schluessel"),
    )
    op.create_index("ix_zielwert_paket_name", "zielwert_paket", ["name"])
    op.create_index("ix_zielwert_paket_quelle", "zielwert_paket", ["zielbereich_quelle_id"])

    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.add_column(sa.Column("zielwert_paket_id", sa.String(length=36)))
        batch_op.create_foreign_key(
            "fk_zielbereich_zielwert_paket_id",
            "zielwert_paket",
            ["zielwert_paket_id"],
            ["id"],
        )
        batch_op.create_index("ix_zielbereich_zielwert_paket", ["zielwert_paket_id"])


def downgrade() -> None:
    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.drop_index("ix_zielbereich_zielwert_paket")
        batch_op.drop_constraint("fk_zielbereich_zielwert_paket_id", type_="foreignkey")
        batch_op.drop_column("zielwert_paket_id")

    op.drop_index("ix_zielwert_paket_quelle", table_name="zielwert_paket")
    op.drop_index("ix_zielwert_paket_name", table_name="zielwert_paket")
    op.drop_table("zielwert_paket")
