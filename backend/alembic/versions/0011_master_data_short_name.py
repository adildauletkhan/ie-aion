"""add short_name to master data

Revision ID: 0011_master_data_short_name
Revises: 0010_scenario_market_inputs
Create Date: 2026-02-09 17:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0011_master_data_short_name"
down_revision = "0010_scenario_market_inputs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("processing_plants", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("transportation_sections", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("nps_stations", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("oil_fields", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("extraction_companies", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("transportation_companies", sa.Column("short_name", sa.String(length=50), nullable=True))
    op.add_column("export_destinations", sa.Column("short_name", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("export_destinations", "short_name")
    op.drop_column("transportation_companies", "short_name")
    op.drop_column("extraction_companies", "short_name")
    op.drop_column("oil_fields", "short_name")
    op.drop_column("nps_stations", "short_name")
    op.drop_column("transportation_sections", "short_name")
    op.drop_column("processing_plants", "short_name")
