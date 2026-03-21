"""initial tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "scenario_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_gap", sa.Float(), nullable=False),
        sa.Column("bottleneck", sa.String(length=200), nullable=False),
        sa.Column("utilization", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["scenario_id"], ["scenarios.id"]),
    )
    op.create_index("ix_scenario_results_id", "scenario_results", ["id"])
    op.create_unique_constraint("uq_scenario_results_scenario_id", "scenario_results", ["scenario_id"])

    op.create_table(
        "entities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("capacity", sa.Float(), nullable=False),
        sa.Column("gov_plan", sa.Float(), nullable=False),
        sa.Column("corp_plan", sa.Float(), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
    )
    op.create_index("ix_entities_id", "entities", ["id"])


def downgrade() -> None:
    op.drop_index("ix_entities_id", table_name="entities")
    op.drop_table("entities")
    op.drop_constraint("uq_scenario_results_scenario_id", "scenario_results", type_="unique")
    op.drop_index("ix_scenario_results_id", table_name="scenario_results")
    op.drop_table("scenario_results")
    op.drop_table("scenarios")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
