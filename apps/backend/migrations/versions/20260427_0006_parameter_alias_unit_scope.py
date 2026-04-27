"""scope parameter aliases to parameter and resolve duplicates by unit

Revision ID: 20260427_0006
Revises: 20260427_0005
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_0006"
down_revision = "20260427_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "laborparameter_alias_new",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=200), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=200), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "laborparameter_id",
            "alias_normalisiert",
            name="uq_laborparameter_alias_parameter_alias",
        ),
    )
    op.execute(
        """
        INSERT INTO laborparameter_alias_new (
            id, laborparameter_id, alias_text, alias_normalisiert, bemerkung, erstellt_am, geaendert_am
        )
        SELECT id, laborparameter_id, alias_text, alias_normalisiert, bemerkung, erstellt_am, geaendert_am
        FROM laborparameter_alias
        """
    )
    op.drop_index("ix_laborparameter_alias_parameter", table_name="laborparameter_alias")
    op.drop_table("laborparameter_alias")
    op.rename_table("laborparameter_alias_new", "laborparameter_alias")
    op.create_index("ix_laborparameter_alias_parameter", "laborparameter_alias", ["laborparameter_id"])


def downgrade() -> None:
    op.create_table(
        "laborparameter_alias_old",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=200), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=200), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alias_normalisiert"),
    )
    op.execute(
        """
        INSERT INTO laborparameter_alias_old (
            id, laborparameter_id, alias_text, alias_normalisiert, bemerkung, erstellt_am, geaendert_am
        )
        SELECT id, laborparameter_id, alias_text, alias_normalisiert, bemerkung, erstellt_am, geaendert_am
        FROM laborparameter_alias
        GROUP BY alias_normalisiert
        """
    )
    op.drop_index("ix_laborparameter_alias_parameter", table_name="laborparameter_alias")
    op.drop_table("laborparameter_alias")
    op.rename_table("laborparameter_alias_old", "laborparameter_alias")
    op.create_index("ix_laborparameter_alias_parameter", "laborparameter_alias", ["laborparameter_id"])
