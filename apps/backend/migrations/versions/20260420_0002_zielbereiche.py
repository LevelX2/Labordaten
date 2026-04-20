"""zielbereiche

Revision ID: 20260420_0002
Revises: 20260420_0001
Create Date: 2026-04-20 00:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260420_0002"
down_revision = "20260420_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "zielbereich",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("wert_typ", sa.String(length=20), nullable=False, server_default="numerisch"),
        sa.Column("untere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("geschlecht_code", sa.String(length=40)),
        sa.Column("alter_min_tage", sa.Integer()),
        sa.Column("alter_max_tage", sa.Integer()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_zielbereich_parameter_aktiv", "zielbereich", ["laborparameter_id", "aktiv"])

    op.create_table(
        "zielbereich_person_override",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("zielbereich_id", sa.String(length=36), sa.ForeignKey("zielbereich.id"), nullable=False),
        sa.Column("untere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.String(length=40)),
    )
    op.create_index(
        "ix_zielbereich_person_override_person_zielbereich",
        "zielbereich_person_override",
        ["person_id", "zielbereich_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_zielbereich_person_override_person_zielbereich", table_name="zielbereich_person_override")
    op.drop_table("zielbereich_person_override")
    op.drop_index("ix_zielbereich_parameter_aktiv", table_name="zielbereich")
    op.drop_table("zielbereich")
