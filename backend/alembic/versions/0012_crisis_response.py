"""crisis response tables

Revision ID: 0012_crisis_response
Revises: 0011_master_data_short_name
Create Date: 2026-02-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0012_crisis_response"
down_revision = "0011_master_data_short_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "crisis_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("affected_asset_type", sa.String(length=50), nullable=True),
        sa.Column("affected_asset_id", sa.String(length=100), nullable=True),
        sa.Column("affected_stage", sa.String(length=20), nullable=True),
        sa.Column("current_capacity", sa.Float(), nullable=False),
        sa.Column("impacted_capacity", sa.Float(), nullable=False),
        sa.Column("capacity_loss", sa.Float(), nullable=False),
        sa.Column("capacity_loss_pct", sa.Float(), nullable=False),
        sa.Column("event_start_datetime", sa.DateTime(), nullable=True),
        sa.Column("estimated_downtime_min_days", sa.Integer(), nullable=True),
        sa.Column("estimated_downtime_max_days", sa.Integer(), nullable=True),
        sa.Column("estimated_downtime_best_days", sa.Integer(), nullable=True),
        sa.Column("actual_recovery_datetime", sa.DateTime(), nullable=True),
        sa.Column("detected_by", sa.String(length=100), nullable=True),
        sa.Column("created_by", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_crisis_events_status", "crisis_events", ["status"])
    op.create_index("ix_crisis_events_severity", "crisis_events", ["severity"])

    op.create_table(
        "crisis_impact_analysis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("crisis_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("analysis_run_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("direct_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("upstream_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("midstream_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("downstream_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("export_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("financial_impact", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("balance_chain_before", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("balance_chain_after", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["crisis_event_id"], ["crisis_events.id"], name="fk_crisis_impact_event_id"),
    )
    op.create_index("ix_crisis_impact_event", "crisis_impact_analysis", ["crisis_event_id"])

    op.create_table(
        "crisis_response_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("crisis_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scenario_name", sa.String(length=200), nullable=False),
        sa.Column("scenario_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("strategy_details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("baseline_financial_impact", sa.Float(), nullable=False),
        sa.Column("mitigated_financial_impact", sa.Float(), nullable=False),
        sa.Column("net_savings", sa.Float(), nullable=False),
        sa.Column("execution_complexity", sa.String(length=20), nullable=False),
        sa.Column("execution_timeline_days", sa.Integer(), nullable=False),
        sa.Column("dependencies", sa.String(length=500), nullable=True),
        sa.Column("risks", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ai_generated", sa.Boolean(), nullable=False),
        sa.Column("ai_confidence_score", sa.Float(), nullable=False),
        sa.Column("ai_ranking", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("selected_by", sa.String(length=100), nullable=True),
        sa.Column("selected_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["crisis_event_id"], ["crisis_events.id"], name="fk_crisis_response_event_id"),
    )
    op.create_index("ix_crisis_response_event", "crisis_response_scenarios", ["crisis_event_id"])
    op.create_index("ix_crisis_response_status", "crisis_response_scenarios", ["status"])

    op.create_table(
        "crisis_execution_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("crisis_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("selected_scenario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_completion_date", sa.Date(), nullable=True),
        sa.Column("planned_financial_impact", sa.Float(), nullable=False),
        sa.Column("actual_financial_impact", sa.Float(), nullable=False),
        sa.Column("variance", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["crisis_event_id"], ["crisis_events.id"], name="fk_crisis_execution_event_id"),
        sa.ForeignKeyConstraint(["selected_scenario_id"], ["crisis_response_scenarios.id"], name="fk_crisis_execution_scenario_id"),
    )
    op.create_index("ix_crisis_execution_event", "crisis_execution_plans", ["crisis_event_id"])

    op.create_table(
        "crisis_action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("execution_plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phase", sa.String(length=50), nullable=False),
        sa.Column("action_title", sa.String(length=200), nullable=False),
        sa.Column("action_description", sa.String(length=2000), nullable=False),
        sa.Column("assigned_to", sa.String(length=100), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("progress_pct", sa.Float(), nullable=False),
        sa.Column("depends_on_action_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("blocking_reason", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["execution_plan_id"], ["crisis_execution_plans.id"], name="fk_crisis_action_plan_id"),
        sa.ForeignKeyConstraint(["depends_on_action_id"], ["crisis_action_items.id"], name="fk_crisis_action_depends_on"),
    )
    op.create_index("ix_crisis_action_plan", "crisis_action_items", ["execution_plan_id"])
    op.create_index("ix_crisis_action_status", "crisis_action_items", ["status"])
    op.create_index("ix_crisis_action_assigned", "crisis_action_items", ["assigned_to"])

    op.create_table(
        "crisis_execution_monitoring",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("execution_plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("financial_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("alerts", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["execution_plan_id"], ["crisis_execution_plans.id"], name="fk_crisis_monitoring_plan_id"),
    )
    op.create_index("ix_crisis_monitoring_plan", "crisis_execution_monitoring", ["execution_plan_id"])

    op.create_table(
        "crisis_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("crisis_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("notification_type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("recipient_user_id", sa.String(length=100), nullable=True),
        sa.Column("recipient_role", sa.String(length=100), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=False),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("sent_via_email", sa.Boolean(), nullable=False),
        sa.Column("sent_via_websocket", sa.Boolean(), nullable=False),
        sa.Column("sent_via_sms", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["crisis_event_id"], ["crisis_events.id"], name="fk_crisis_notification_event_id"),
    )
    op.create_index("ix_crisis_notifications_event", "crisis_notifications", ["crisis_event_id"])
    op.create_index("ix_crisis_notifications_severity", "crisis_notifications", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_crisis_notifications_severity", table_name="crisis_notifications")
    op.drop_index("ix_crisis_notifications_event", table_name="crisis_notifications")
    op.drop_table("crisis_notifications")
    op.drop_index("ix_crisis_monitoring_plan", table_name="crisis_execution_monitoring")
    op.drop_table("crisis_execution_monitoring")
    op.drop_index("ix_crisis_action_assigned", table_name="crisis_action_items")
    op.drop_index("ix_crisis_action_status", table_name="crisis_action_items")
    op.drop_index("ix_crisis_action_plan", table_name="crisis_action_items")
    op.drop_table("crisis_action_items")
    op.drop_index("ix_crisis_execution_event", table_name="crisis_execution_plans")
    op.drop_table("crisis_execution_plans")
    op.drop_index("ix_crisis_response_status", table_name="crisis_response_scenarios")
    op.drop_index("ix_crisis_response_event", table_name="crisis_response_scenarios")
    op.drop_table("crisis_response_scenarios")
    op.drop_index("ix_crisis_impact_event", table_name="crisis_impact_analysis")
    op.drop_table("crisis_impact_analysis")
    op.drop_index("ix_crisis_events_severity", table_name="crisis_events")
    op.drop_index("ix_crisis_events_status", table_name="crisis_events")
    op.drop_table("crisis_events")
