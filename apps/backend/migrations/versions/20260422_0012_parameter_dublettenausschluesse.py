"""parameter duplicate suppressions

Revision ID: 20260422_0012
Revises: 20260421_0011
Create Date: 2026-04-22 19:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260422_0012"
down_revision = "20260421_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "parameter_dublettenausschluss",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("erster_parameter_id", sa.String(length=36), nullable=False),
        sa.Column("zweiter_parameter_id", sa.String(length=36), nullable=False),
        sa.Column("paar_schluessel", sa.String(length=80), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["erster_parameter_id"],
            ["laborparameter.id"],
            name=op.f("fk_parameter_dublettenausschluss_erster_parameter_id_laborparameter"),
        ),
        sa.ForeignKeyConstraint(
            ["zweiter_parameter_id"],
            ["laborparameter.id"],
            name=op.f("fk_parameter_dublettenausschluss_zweiter_parameter_id_laborparameter"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parameter_dublettenausschluss")),
        sa.UniqueConstraint("paar_schluessel", name=op.f("uq_parameter_dublettenausschluss_paar_schluessel")),
    )
    op.create_index(
        op.f("ix_parameter_dublettenausschluss_erster_parameter_id"),
        "parameter_dublettenausschluss",
        ["erster_parameter_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_parameter_dublettenausschluss_zweiter_parameter_id"),
        "parameter_dublettenausschluss",
        ["zweiter_parameter_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_parameter_dublettenausschluss_zweiter_parameter_id"),
        table_name="parameter_dublettenausschluss",
    )
    op.drop_index(
        op.f("ix_parameter_dublettenausschluss_erster_parameter_id"),
        table_name="parameter_dublettenausschluss",
    )
    op.drop_table("parameter_dublettenausschluss")
