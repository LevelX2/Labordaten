"""add parameter aliases

Revision ID: 20260421_0006
Revises: 20260421_0005
Create Date: 2026-04-21 00:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0006"
down_revision = "20260421_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "laborparameter_alias",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=200), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=200), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alias_normalisiert"),
    )
    op.create_index("ix_laborparameter_alias_parameter", "laborparameter_alias", ["laborparameter_id"])


def downgrade() -> None:
    op.drop_index("ix_laborparameter_alias_parameter", table_name="laborparameter_alias")
    op.drop_table("laborparameter_alias")
