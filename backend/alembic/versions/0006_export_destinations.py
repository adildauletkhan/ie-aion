"""export destinations

Revision ID: 0006_export_destinations
Revises: 0005_entities_master_links
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_export_destinations"
down_revision = "0005_entities_master_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "export_destinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("capacity", sa.Float(), nullable=False),
        sa.Column("current_month", sa.Float(), nullable=False),
        sa.Column("current_day", sa.Float(), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("transportation_section_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["transportation_section_id"],
            ["transportation_sections.id"],
            name="fk_export_destinations_transportation_section_id",
        ),
    )
    op.create_index("ix_export_destinations_id", "export_destinations", ["id"])
    op.create_index("ix_export_destinations_code", "export_destinations", ["code"])
    op.create_index(
        "ix_export_destinations_transportation_section_id",
        "export_destinations",
        ["transportation_section_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_export_destinations_transportation_section_id",
        table_name="export_destinations",
    )
    op.drop_index("ix_export_destinations_code", table_name="export_destinations")
    op.drop_index("ix_export_destinations_id", table_name="export_destinations")
    op.drop_table("export_destinations")
