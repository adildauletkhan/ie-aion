"""annual planning tables

Revision ID: 0009_annual_plans
Revises: 0008_scenario_metadata
Create Date: 2026-02-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0009_annual_plans"
down_revision = "0008_scenario_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "annual_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("baseline_source", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "annual_plan_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["annual_plans.id"], name="fk_annual_plan_scenarios_plan_id"),
    )

    op.create_table(
        "annual_plan_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("asset_type", sa.String(length=50), nullable=False),
        sa.Column("asset_code", sa.String(length=50), nullable=False),
        sa.Column("asset_name", sa.String(length=200), nullable=False),
        sa.Column("capacity", sa.Float(), nullable=False),
        sa.Column("monthly_plan", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(["scenario_id"], ["annual_plan_scenarios.id"], name="fk_annual_plan_lines_scenario_id"),
    )
    op.create_index("ix_annual_plan_lines_id", "annual_plan_lines", ["id"])

    op.create_table(
        "annual_plan_issues",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("asset_code", sa.String(length=50), nullable=True),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("gap", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["scenario_id"], ["annual_plan_scenarios.id"], name="fk_annual_plan_issues_scenario_id"),
    )
    op.create_index("ix_annual_plan_issues_id", "annual_plan_issues", ["id"])


def downgrade() -> None:
    op.drop_index("ix_annual_plan_issues_id", table_name="annual_plan_issues")
    op.drop_table("annual_plan_issues")
    op.drop_index("ix_annual_plan_lines_id", table_name="annual_plan_lines")
    op.drop_table("annual_plan_lines")
    op.drop_table("annual_plan_scenarios")
    op.drop_table("annual_plans")
