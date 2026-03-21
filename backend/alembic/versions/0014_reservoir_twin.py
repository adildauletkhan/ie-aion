"""reservoir twin tables

Revision ID: 0014_reservoir_twin
Revises: 0013_field_schemes
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa


revision = "0014_reservoir_twin"
down_revision = "0013_field_schemes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration was already applied in the database
    # Adding empty migration to match database state
    pass


def downgrade() -> None:
    pass
