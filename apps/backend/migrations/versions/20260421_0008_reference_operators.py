"""add reference boundary operators

Revision ID: 20260421_0008
Revises: 20260421_0007
Create Date: 2026-04-21 15:25:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0008"
down_revision = "20260421_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messwert_referenz", sa.Column("untere_grenze_operator", sa.String(length=30), nullable=True))
    op.add_column("messwert_referenz", sa.Column("obere_grenze_operator", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("messwert_referenz", "obere_grenze_operator")
    op.drop_column("messwert_referenz", "untere_grenze_operator")
