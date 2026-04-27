"""add target range sources

Revision ID: 20260427_0002
Revises: 20260420_0001
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_0002"
down_revision = "20260420_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "zielbereich_quelle",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("quellen_typ", sa.String(length=40), nullable=False, server_default="experte"),
        sa.Column("titel", sa.String(length=255)),
        sa.Column("jahr", sa.Integer()),
        sa.Column("version", sa.String(length=80)),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_zielbereich_quelle_name", "zielbereich_quelle", ["name"])

    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.add_column(sa.Column("zielbereich_quelle_id", sa.String(length=36)))
        batch_op.add_column(sa.Column("quelle_original_text", sa.Text()))
        batch_op.add_column(sa.Column("quelle_stelle", sa.String(length=255)))
        batch_op.create_foreign_key(
            "fk_zielbereich_zielbereich_quelle_id",
            "zielbereich_quelle",
            ["zielbereich_quelle_id"],
            ["id"],
        )
        batch_op.create_index("ix_zielbereich_quelle", ["zielbereich_quelle_id"])


def downgrade() -> None:
    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.drop_index("ix_zielbereich_quelle")
        batch_op.drop_constraint("fk_zielbereich_zielbereich_quelle_id", type_="foreignkey")
        batch_op.drop_column("quelle_stelle")
        batch_op.drop_column("quelle_original_text")
        batch_op.drop_column("zielbereich_quelle_id")

    op.drop_index("ix_zielbereich_quelle_name", table_name="zielbereich_quelle")
    op.drop_table("zielbereich_quelle")
