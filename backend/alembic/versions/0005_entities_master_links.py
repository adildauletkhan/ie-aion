"""entities master data links

Revision ID: 0005_entities_master_links
Revises: 0004_master_data_links
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_entities_master_links"
down_revision = "0004_master_data_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("entities", sa.Column("processing_plant_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_processing_plant_id", "entities", ["processing_plant_id"])
    op.create_foreign_key(
        "fk_entities_processing_plant_id",
        "entities",
        "processing_plants",
        ["processing_plant_id"],
        ["id"],
    )

    op.add_column("entities", sa.Column("transportation_section_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_transportation_section_id", "entities", ["transportation_section_id"])
    op.create_foreign_key(
        "fk_entities_transportation_section_id",
        "entities",
        "transportation_sections",
        ["transportation_section_id"],
        ["id"],
    )

    op.add_column("entities", sa.Column("nps_station_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_nps_station_id", "entities", ["nps_station_id"])
    op.create_foreign_key(
        "fk_entities_nps_station_id",
        "entities",
        "nps_stations",
        ["nps_station_id"],
        ["id"],
    )

    op.add_column("entities", sa.Column("oil_field_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_oil_field_id", "entities", ["oil_field_id"])
    op.create_foreign_key(
        "fk_entities_oil_field_id",
        "entities",
        "oil_fields",
        ["oil_field_id"],
        ["id"],
    )

    op.add_column("entities", sa.Column("extraction_company_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_extraction_company_id", "entities", ["extraction_company_id"])
    op.create_foreign_key(
        "fk_entities_extraction_company_id",
        "entities",
        "extraction_companies",
        ["extraction_company_id"],
        ["id"],
    )

    op.add_column("entities", sa.Column("transportation_company_id", sa.Integer(), nullable=True))
    op.create_index("ix_entities_transportation_company_id", "entities", ["transportation_company_id"])
    op.create_foreign_key(
        "fk_entities_transportation_company_id",
        "entities",
        "transportation_companies",
        ["transportation_company_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_entities_transportation_company_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_transportation_company_id", table_name="entities")
    op.drop_column("entities", "transportation_company_id")

    op.drop_constraint("fk_entities_extraction_company_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_extraction_company_id", table_name="entities")
    op.drop_column("entities", "extraction_company_id")

    op.drop_constraint("fk_entities_oil_field_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_oil_field_id", table_name="entities")
    op.drop_column("entities", "oil_field_id")

    op.drop_constraint("fk_entities_nps_station_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_nps_station_id", table_name="entities")
    op.drop_column("entities", "nps_station_id")

    op.drop_constraint("fk_entities_transportation_section_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_transportation_section_id", table_name="entities")
    op.drop_column("entities", "transportation_section_id")

    op.drop_constraint("fk_entities_processing_plant_id", "entities", type_="foreignkey")
    op.drop_index("ix_entities_processing_plant_id", table_name="entities")
    op.drop_column("entities", "processing_plant_id")
