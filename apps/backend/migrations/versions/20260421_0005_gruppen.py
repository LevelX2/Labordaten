"""add parameter groups

Revision ID: 20260421_0005
Revises: 20260420_0004
Create Date: 2026-04-21 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0005"
down_revision = "20260420_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "parameter_gruppe",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("wissensseite_id", sa.String(length=36), sa.ForeignKey("wissensseite.id")),
        sa.Column("sortierschluessel", sa.String(length=120)),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_parameter_gruppe_name", "parameter_gruppe", ["name"])

    op.create_table(
        "gruppen_parameter",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("parameter_gruppe_id", sa.String(length=36), sa.ForeignKey("parameter_gruppe.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("sortierung", sa.Integer()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("parameter_gruppe_id", "laborparameter_id"),
    )
    op.create_index("ix_gruppen_parameter_gruppe_sortierung", "gruppen_parameter", ["parameter_gruppe_id", "sortierung"])
    op.create_index("ix_gruppen_parameter_parameter", "gruppen_parameter", ["laborparameter_id"])


def downgrade() -> None:
    op.drop_index("ix_gruppen_parameter_parameter", table_name="gruppen_parameter")
    op.drop_index("ix_gruppen_parameter_gruppe_sortierung", table_name="gruppen_parameter")
    op.drop_table("gruppen_parameter")
    op.drop_index("ix_parameter_gruppe_name", table_name="parameter_gruppe")
    op.drop_table("parameter_gruppe")
