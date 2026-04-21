"""add parameter conversion rules

Revision ID: 20260421_0010
Revises: 20260421_0009
Create Date: 2026-04-21 23:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0010"
down_revision = "20260421_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "parameter_umrechnungsregel",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("von_einheit", sa.String(length=50), nullable=False),
        sa.Column("nach_einheit", sa.String(length=50), nullable=False),
        sa.Column("regel_typ", sa.String(length=30), nullable=False),
        sa.Column("faktor", sa.Float(), nullable=True),
        sa.Column("offset", sa.Float(), nullable=True),
        sa.Column("formel_text", sa.Text(), nullable=True),
        sa.Column("rundung_stellen", sa.Integer(), nullable=True),
        sa.Column("quelle_beschreibung", sa.Text(), nullable=True),
        sa.Column("bemerkung", sa.Text(), nullable=True),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_parameter_umrechnungsregel_parameter",
        "parameter_umrechnungsregel",
        ["laborparameter_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_parameter_umrechnungsregel_parameter", table_name="parameter_umrechnungsregel")
    op.drop_table("parameter_umrechnungsregel")
