"""make person birthdate optional

Revision ID: 20260505_0008
Revises: 20260427_0007
Create Date: 2026-05-05 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260505_0008"
down_revision = "20260427_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("person") as batch_op:
        batch_op.alter_column("geburtsdatum", existing_type=sa.Date(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE person SET geburtsdatum = '1900-01-01' WHERE geburtsdatum IS NULL")
    with op.batch_alter_table("person") as batch_op:
        batch_op.alter_column("geburtsdatum", existing_type=sa.Date(), nullable=False)
