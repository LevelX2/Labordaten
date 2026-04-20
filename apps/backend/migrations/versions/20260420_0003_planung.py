"""planung

Revision ID: 20260420_0003
Revises: 20260420_0002
Create Date: 2026-04-20 23:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260420_0003"
down_revision = "20260420_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planung_zyklisch",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("intervall_wert", sa.Integer(), nullable=False),
        sa.Column("intervall_typ", sa.String(length=20), nullable=False, server_default="monate"),
        sa.Column("startdatum", sa.Date(), nullable=False),
        sa.Column("enddatum", sa.Date()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="aktiv"),
        sa.Column("prioritaet", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("karenz_tage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("letzte_relevante_messung_id", sa.String(length=36), sa.ForeignKey("messwert.id")),
        sa.Column("naechste_faelligkeit", sa.Date()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_planung_zyklisch_person_parameter_status",
        "planung_zyklisch",
        ["person_id", "laborparameter_id", "status"],
    )
    op.create_index("ix_planung_zyklisch_naechste_faelligkeit", "planung_zyklisch", ["naechste_faelligkeit"])

    op.create_table(
        "planung_einmalig",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="offen"),
        sa.Column("zieltermin_datum", sa.Date()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erledigt_durch_messwert_id", sa.String(length=36), sa.ForeignKey("messwert.id")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_planung_einmalig_person_parameter_status",
        "planung_einmalig",
        ["person_id", "laborparameter_id", "status"],
    )
    op.create_index("ix_planung_einmalig_zieltermin", "planung_einmalig", ["zieltermin_datum"])


def downgrade() -> None:
    op.drop_index("ix_planung_einmalig_zieltermin", table_name="planung_einmalig")
    op.drop_index("ix_planung_einmalig_person_parameter_status", table_name="planung_einmalig")
    op.drop_table("planung_einmalig")
    op.drop_index("ix_planung_zyklisch_naechste_faelligkeit", table_name="planung_zyklisch")
    op.drop_index("ix_planung_zyklisch_person_parameter_status", table_name="planung_zyklisch")
    op.drop_table("planung_zyklisch")
