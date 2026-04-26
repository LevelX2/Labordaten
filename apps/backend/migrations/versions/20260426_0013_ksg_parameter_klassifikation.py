"""ksg parameter classification

Revision ID: 20260426_0013
Revises: 20260422_0012
Create Date: 2026-04-26 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260426_0013"
down_revision = "20260422_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("laborparameter", sa.Column("primaere_klassifikation", sa.String(length=40), nullable=True))
    op.add_column(
        "zielbereich",
        sa.Column("zielbereich_typ", sa.String(length=40), nullable=False, server_default="allgemein"),
    )
    op.create_index(
        op.f("ix_laborparameter_primaere_klassifikation"),
        "laborparameter",
        ["primaere_klassifikation"],
        unique=False,
    )
    op.create_index(
        op.f("ix_zielbereich_zielbereich_typ"),
        "zielbereich",
        ["zielbereich_typ"],
        unique=False,
    )
    op.create_table(
        "parameter_klassifikation",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), nullable=False),
        sa.Column("klassifikation", sa.String(length=40), nullable=False),
        sa.Column("kontext_beschreibung", sa.Text(), nullable=True),
        sa.Column("begruendung", sa.Text(), nullable=True),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["laborparameter_id"],
            ["laborparameter.id"],
            name=op.f("fk_parameter_klassifikation_laborparameter_id_laborparameter"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parameter_klassifikation")),
    )
    op.create_index(
        op.f("ix_parameter_klassifikation_laborparameter_id"),
        "parameter_klassifikation",
        ["laborparameter_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_parameter_klassifikation_klassifikation"),
        "parameter_klassifikation",
        ["klassifikation"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_parameter_klassifikation_klassifikation"), table_name="parameter_klassifikation")
    op.drop_index(op.f("ix_parameter_klassifikation_laborparameter_id"), table_name="parameter_klassifikation")
    op.drop_table("parameter_klassifikation")
    op.drop_index(op.f("ix_zielbereich_zielbereich_typ"), table_name="zielbereich")
    op.drop_index(op.f("ix_laborparameter_primaere_klassifikation"), table_name="laborparameter")
    op.drop_column("zielbereich", "zielbereich_typ")
    op.drop_column("laborparameter", "primaere_klassifikation")
