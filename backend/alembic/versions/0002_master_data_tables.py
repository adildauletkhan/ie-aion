"""master data tables

Revision ID: 0002_master_data_tables
Revises: 0001_initial
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_master_data_tables"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "processing_plants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_processing_plants_id", "processing_plants", ["id"])

    op.create_table(
        "transportation_sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_transportation_sections_id", "transportation_sections", ["id"])

    op.create_table(
        "nps_stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_nps_stations_id", "nps_stations", ["id"])

    op.create_table(
        "oil_fields",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_oil_fields_id", "oil_fields", ["id"])

    op.create_table(
        "extraction_companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_extraction_companies_id", "extraction_companies", ["id"])

    op.create_table(
        "transportation_companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_transportation_companies_id", "transportation_companies", ["id"])


def downgrade() -> None:
    op.drop_index("ix_transportation_companies_id", table_name="transportation_companies")
    op.drop_table("transportation_companies")
    op.drop_index("ix_extraction_companies_id", table_name="extraction_companies")
    op.drop_table("extraction_companies")
    op.drop_index("ix_oil_fields_id", table_name="oil_fields")
    op.drop_table("oil_fields")
    op.drop_index("ix_nps_stations_id", table_name="nps_stations")
    op.drop_table("nps_stations")
    op.drop_index("ix_transportation_sections_id", table_name="transportation_sections")
    op.drop_table("transportation_sections")
    op.drop_index("ix_processing_plants_id", table_name="processing_plants")
    op.drop_table("processing_plants")
