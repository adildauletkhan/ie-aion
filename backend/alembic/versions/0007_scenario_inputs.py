"""scenario inputs

Revision ID: 0007_scenario_inputs
Revises: 0006_export_destinations
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0007_scenario_inputs"
down_revision = "0006_export_destinations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scenarios", sa.Column("inputs", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("scenarios", "inputs")
