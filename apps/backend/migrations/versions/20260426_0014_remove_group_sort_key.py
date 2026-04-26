"""remove group sort key

Revision ID: 20260426_0014
Revises: 20260426_0013
Create Date: 2026-04-26 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260426_0014"
down_revision = "20260426_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("parameter_gruppe") as batch_op:
        batch_op.drop_column("sortierschluessel")


def downgrade() -> None:
    with op.batch_alter_table("parameter_gruppe") as batch_op:
        batch_op.add_column(sa.Column("sortierschluessel", sa.String(length=120)))
