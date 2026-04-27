"""add target direction

Revision ID: 20260427_0004
Revises: 20260427_0003
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_0004"
down_revision = "20260427_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.add_column(
            sa.Column(
                "zielrichtung",
                sa.String(length=40),
                nullable=False,
                server_default="innerhalb_bereich",
            )
        )
        batch_op.create_index("ix_zielbereich_zielrichtung", ["zielrichtung"])

    with op.batch_alter_table("zielbereich_person_override") as batch_op:
        batch_op.add_column(
            sa.Column(
                "zielrichtung",
                sa.String(length=40),
                nullable=False,
                server_default="innerhalb_bereich",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("zielbereich_person_override") as batch_op:
        batch_op.drop_column("zielrichtung")

    with op.batch_alter_table("zielbereich") as batch_op:
        batch_op.drop_index("ix_zielbereich_zielrichtung")
        batch_op.drop_column("zielrichtung")
