"""Construction Phase 1: projects, phases, tasks, zone plan-fact, deviations,
progress curve, crews, foremen, daily journal.

Revision ID: 0016_construction_phase1
Revises: 0015_ngdu_workspaces
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0016_construction_phase1"
down_revision = "0015_ngdu_workspaces"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "construction_projects",
        sa.Column("project_id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("developer", sa.String(255), nullable=True),
        sa.Column("bac", sa.Numeric(20, 2), nullable=True),
        sa.Column("data_date", sa.Date(), nullable=True),
        sa.Column("plan_start", sa.Date(), nullable=True),
        sa.Column("plan_finish", sa.Date(), nullable=True),
        sa.Column("fact_start", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "construction_phases",
        sa.Column("phase_id", sa.String(100), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_phase_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("plan_start", sa.Date(), nullable=True),
        sa.Column("plan_finish", sa.Date(), nullable=True),
    )

    op.create_table(
        "construction_schedule_tasks",
        sa.Column("task_id", sa.String(100), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_task_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("wbs_code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("zone", sa.String(255), nullable=True, index=True),
        sa.Column(
            "phase_id",
            sa.String(100),
            sa.ForeignKey("construction_phases.phase_id", name="fk_task_phase", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("planned_progress_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("actual_progress_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="planned"),
        sa.Column("responsible", sa.String(255), nullable=True),
        sa.Column("plan_start", sa.Date(), nullable=True),
        sa.Column("plan_finish", sa.Date(), nullable=True),
        sa.Column("fact_start", sa.Date(), nullable=True),
        sa.Column("fact_finish", sa.Date(), nullable=True),
        sa.Column("pv", sa.Numeric(20, 2), nullable=True),
        sa.Column("ev", sa.Numeric(20, 2), nullable=True),
        sa.Column("ac", sa.Numeric(20, 2), nullable=True),
    )

    op.create_table(
        "construction_zone_plan_fact",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_zpf_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("zone", sa.String(255), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("plan_pct", sa.Float(), nullable=True),
        sa.Column("fact_pct", sa.Float(), nullable=True),
        sa.Column("lag_days", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "zone", "date", name="uq_zone_plan_fact_project_zone_date"),
    )

    op.create_table(
        "construction_deviations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_dev_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "task_id",
            sa.String(100),
            sa.ForeignKey("construction_schedule_tasks.task_id", name="fk_dev_task", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("zone", sa.String(255), nullable=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("delta_pct", sa.Float(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("detected_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "construction_progress_curve",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_curve_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("pv", sa.Numeric(20, 2), nullable=True),
        sa.Column("ev", sa.Numeric(20, 2), nullable=True),
        sa.Column("ac", sa.Numeric(20, 2), nullable=True),
        sa.UniqueConstraint("project_id", "date", name="uq_progress_curve_project_date"),
    )

    op.create_table(
        "construction_crews",
        sa.Column("crew_id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_crew_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("contractor_name", sa.String(255), nullable=True),
        sa.Column("specialization", sa.String(255), nullable=True),
        sa.Column("planned_headcount", sa.Integer(), nullable=True),
    )

    op.create_table(
        "construction_foremen",
        sa.Column("foreman_id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_foreman_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="brigadier"),
        sa.Column(
            "crew_id",
            UUID(as_uuid=True),
            sa.ForeignKey("construction_crews.crew_id", name="fk_foreman_crew", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("default_zone", sa.String(255), nullable=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("telegram_link_status", sa.String(20), nullable=False, server_default="not_invited"),
        sa.Column("invite_code", sa.String(100), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_foreman_telegram_user_id", "construction_foremen", ["telegram_user_id"])
    op.create_unique_constraint("uq_foreman_invite_code", "construction_foremen", ["invite_code"])
    op.create_index("ix_foreman_telegram_user_id", "construction_foremen", ["telegram_user_id"])
    op.create_index("ix_foreman_invite_code", "construction_foremen", ["invite_code"])

    op.create_table(
        "construction_daily_journal",
        sa.Column("entry_id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(100),
            sa.ForeignKey("construction_projects.project_id", name="fk_journal_project", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("zone", sa.String(255), nullable=True),
        sa.Column(
            "task_id",
            sa.String(100),
            sa.ForeignKey("construction_schedule_tasks.task_id", name="fk_journal_task", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("work_type", sa.String(255), nullable=True),
        sa.Column("plan_pct", sa.Float(), nullable=True),
        sa.Column("fact_pct", sa.Float(), nullable=True),
        sa.Column("delta_pct", sa.Float(), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="voice"),
        sa.Column(
            "author_foreman_id",
            UUID(as_uuid=True),
            sa.ForeignKey("construction_foremen.foreman_id", name="fk_journal_foreman", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "author_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_journal_user", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("blocker_type", sa.String(20), nullable=True),
        sa.Column("blocker_description", sa.Text(), nullable=True),
        sa.Column("risk_delay_days", sa.Integer(), nullable=True),
        sa.Column("risk_severity", sa.String(20), nullable=True),
        sa.Column("responsible", sa.String(255), nullable=True),
        sa.Column("actions", JSONB(), nullable=True),
        sa.Column("raw_transcript", sa.Text(), nullable=True),
        sa.Column("photos", JSONB(), nullable=True),
        sa.Column("confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("match_confidence", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table("construction_daily_journal")
    op.drop_index("ix_foreman_invite_code", table_name="construction_foremen")
    op.drop_index("ix_foreman_telegram_user_id", table_name="construction_foremen")
    op.drop_constraint("uq_foreman_invite_code", "construction_foremen", type_="unique")
    op.drop_constraint("uq_foreman_telegram_user_id", "construction_foremen", type_="unique")
    op.drop_table("construction_foremen")
    op.drop_table("construction_crews")
    op.drop_table("construction_progress_curve")
    op.drop_table("construction_deviations")
    op.drop_table("construction_zone_plan_fact")
    op.drop_table("construction_schedule_tasks")
    op.drop_table("construction_phases")
    op.drop_table("construction_projects")
