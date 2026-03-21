"""scenario metadata

Revision ID: 0008_scenario_metadata
Revises: 0007_scenario_inputs
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_scenario_metadata"
down_revision = "0007_scenario_inputs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scenarios", sa.Column("owner", sa.String(length=100), nullable=False, server_default=""))
    op.add_column("scenarios", sa.Column("approval_status", sa.String(length=20), nullable=False, server_default="draft"))
    op.add_column("scenarios", sa.Column("comments", sa.String(length=2000), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("scenarios", "comments")
    op.drop_column("scenarios", "approval_status")
    op.drop_column("scenarios", "owner")
