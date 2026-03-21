"""master data links

Revision ID: 0004_master_data_links
Revises: 0003_master_data_metrics
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_master_data_links"
down_revision = "0003_master_data_metrics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transportation_sections",
        sa.Column("transportation_company_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_transportation_sections_transportation_company_id",
        "transportation_sections",
        ["transportation_company_id"],
    )
    op.create_foreign_key(
        "fk_transportation_sections_transportation_company_id",
        "transportation_sections",
        "transportation_companies",
        ["transportation_company_id"],
        ["id"],
    )

    op.add_column(
        "nps_stations",
        sa.Column("transportation_section_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_nps_stations_transportation_section_id",
        "nps_stations",
        ["transportation_section_id"],
    )
    op.create_foreign_key(
        "fk_nps_stations_transportation_section_id",
        "nps_stations",
        "transportation_sections",
        ["transportation_section_id"],
        ["id"],
    )

    op.add_column(
        "processing_plants",
        sa.Column("transportation_section_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_processing_plants_transportation_section_id",
        "processing_plants",
        ["transportation_section_id"],
    )
    op.create_foreign_key(
        "fk_processing_plants_transportation_section_id",
        "processing_plants",
        "transportation_sections",
        ["transportation_section_id"],
        ["id"],
    )

    op.add_column(
        "oil_fields",
        sa.Column("extraction_company_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_oil_fields_extraction_company_id",
        "oil_fields",
        ["extraction_company_id"],
    )
    op.create_foreign_key(
        "fk_oil_fields_extraction_company_id",
        "oil_fields",
        "extraction_companies",
        ["extraction_company_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_oil_fields_extraction_company_id",
        "oil_fields",
        type_="foreignkey",
    )
    op.drop_index("ix_oil_fields_extraction_company_id", table_name="oil_fields")
    op.drop_column("oil_fields", "extraction_company_id")

    op.drop_constraint(
        "fk_processing_plants_transportation_section_id",
        "processing_plants",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_processing_plants_transportation_section_id",
        table_name="processing_plants",
    )
    op.drop_column("processing_plants", "transportation_section_id")

    op.drop_constraint(
        "fk_nps_stations_transportation_section_id",
        "nps_stations",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_nps_stations_transportation_section_id",
        table_name="nps_stations",
    )
    op.drop_column("nps_stations", "transportation_section_id")

    op.drop_constraint(
        "fk_transportation_sections_transportation_company_id",
        "transportation_sections",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_transportation_sections_transportation_company_id",
        table_name="transportation_sections",
    )
    op.drop_column("transportation_sections", "transportation_company_id")
