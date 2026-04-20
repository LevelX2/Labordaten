"""import pruefpunkte

Revision ID: 20260420_0004
Revises: 20260420_0003
Create Date: 2026-04-20 23:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260420_0004"
down_revision = "20260420_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "import_pruefpunkt",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("importvorgang_id", sa.String(length=36), sa.ForeignKey("importvorgang.id"), nullable=False),
        sa.Column("objekt_typ", sa.String(length=40), nullable=False),
        sa.Column("objekt_schluessel_temp", sa.String(length=120)),
        sa.Column("pruefart", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("meldung", sa.Text(), nullable=False),
        sa.Column("bestaetigt_vom_nutzer", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("bestaetigt_am", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_import_pruefpunkt_import_status", "import_pruefpunkt", ["importvorgang_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_import_pruefpunkt_import_status", table_name="import_pruefpunkt")
    op.drop_table("import_pruefpunkt")
