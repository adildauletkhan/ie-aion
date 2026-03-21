"""master data codes and metrics

Revision ID: 0003_master_data_metrics
Revises: 0002_master_data_tables
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_master_data_metrics"
down_revision = "0002_master_data_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = [
        "processing_plants",
        "transportation_sections",
        "nps_stations",
        "oil_fields",
        "extraction_companies",
        "transportation_companies",
    ]
    for table in tables:
        op.add_column(table, sa.Column("code", sa.String(length=50), nullable=False, server_default=""))
        op.add_column(table, sa.Column("capacity", sa.Float(), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("current_month", sa.Float(), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("current_day", sa.Float(), nullable=False, server_default="0"))
        op.create_index(f"ix_{table}_code", table, ["code"])


def downgrade() -> None:
    tables = [
        "processing_plants",
        "transportation_sections",
        "nps_stations",
        "oil_fields",
        "extraction_companies",
        "transportation_companies",
    ]
    for table in tables:
        op.drop_index(f"ix_{table}_code", table_name=table)
        op.drop_column(table, "current_day")
        op.drop_column(table, "current_month")
        op.drop_column(table, "capacity")
        op.drop_column(table, "code")
