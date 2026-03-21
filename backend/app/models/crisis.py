import datetime as dt
import uuid

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CrisisEvent(Base):
    __tablename__ = "crisis_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    affected_asset_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    affected_asset_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    affected_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    current_capacity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    impacted_capacity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    capacity_loss: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    capacity_loss_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    event_start_datetime: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_downtime_min_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_downtime_max_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_downtime_best_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_recovery_datetime: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    detected_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    impact_analyses = relationship(
        "CrisisImpactAnalysis",
        back_populates="event",
        cascade="all, delete-orphan",
        order_by="CrisisImpactAnalysis.analysis_run_at.desc()",
    )
    response_scenarios = relationship(
        "CrisisResponseScenario",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    execution_plans = relationship(
        "CrisisExecutionPlan",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "CrisisNotification",
        back_populates="event",
        cascade="all, delete-orphan",
    )


class CrisisImpactAnalysis(Base):
    __tablename__ = "crisis_impact_analysis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crisis_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_events.id", name="fk_crisis_impact_event_id"),
        nullable=False,
    )
    analysis_run_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="running")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    direct_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    upstream_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    midstream_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    downstream_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    export_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    financial_impact: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    balance_chain_before: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    balance_chain_after: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    event = relationship("CrisisEvent", back_populates="impact_analyses")


class CrisisResponseScenario(Base):
    __tablename__ = "crisis_response_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crisis_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_events.id", name="fk_crisis_response_event_id"),
        nullable=False,
    )
    scenario_name: Mapped[str] = mapped_column(String(200), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    strategy_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    baseline_financial_impact: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    mitigated_financial_impact: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    net_savings: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    execution_complexity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    execution_timeline_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dependencies: Mapped[str | None] = mapped_column(String(500), nullable=True)
    risks: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_generated: Mapped[bool] = mapped_column(nullable=False, default=False)
    ai_confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    ai_ranking: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    selected_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    selected_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)

    event = relationship("CrisisEvent", back_populates="response_scenarios")
    execution_plan = relationship(
        "CrisisExecutionPlan",
        back_populates="selected_scenario",
        uselist=False,
    )


class CrisisExecutionPlan(Base):
    __tablename__ = "crisis_execution_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crisis_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_events.id", name="fk_crisis_execution_event_id"),
        nullable=False,
    )
    selected_scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_response_scenarios.id", name="fk_crisis_execution_scenario_id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    start_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    target_completion_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    planned_financial_impact: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    actual_financial_impact: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    variance: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    event = relationship("CrisisEvent", back_populates="execution_plans")
    selected_scenario = relationship("CrisisResponseScenario", back_populates="execution_plan")
    action_items = relationship(
        "CrisisActionItem",
        back_populates="execution_plan",
        cascade="all, delete-orphan",
    )
    monitoring = relationship(
        "CrisisExecutionMonitoring",
        back_populates="execution_plan",
        cascade="all, delete-orphan",
        order_by="CrisisExecutionMonitoring.recorded_at.desc()",
    )


class CrisisActionItem(Base):
    __tablename__ = "crisis_action_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_execution_plans.id", name="fk_crisis_action_plan_id"),
        nullable=False,
    )
    phase: Mapped[str] = mapped_column(String(50), nullable=False)
    action_title: Mapped[str] = mapped_column(String(200), nullable=False)
    action_description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    deadline: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    progress_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    depends_on_action_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_action_items.id", name="fk_crisis_action_depends_on"),
        nullable=True,
    )
    blocking_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    execution_plan = relationship("CrisisExecutionPlan", back_populates="action_items")
    depends_on = relationship("CrisisActionItem", remote_side="CrisisActionItem.id")


class CrisisExecutionMonitoring(Base):
    __tablename__ = "crisis_execution_monitoring"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_execution_plans.id", name="fk_crisis_monitoring_plan_id"),
        nullable=False,
    )
    recorded_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    financial_metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    alerts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    execution_plan = relationship("CrisisExecutionPlan", back_populates="monitoring")


class CrisisNotification(Base):
    __tablename__ = "crisis_notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crisis_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("crisis_events.id", name="fk_crisis_notification_event_id"),
        nullable=False,
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    recipient_user_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recipient_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sent_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    delivered_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    sent_via_email: Mapped[bool] = mapped_column(nullable=False, default=False)
    sent_via_websocket: Mapped[bool] = mapped_column(nullable=False, default=True)
    sent_via_sms: Mapped[bool] = mapped_column(nullable=False, default=False)

    event = relationship("CrisisEvent", back_populates="notifications")
