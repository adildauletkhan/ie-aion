import datetime as dt
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class EventType(str, Enum):
    technical = "technical"
    geopolitical = "geopolitical"
    climate = "climate"
    market = "market"
    logistics = "logistics"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    critical = "critical"
    catastrophic = "catastrophic"


class EventStatus(str, Enum):
    open = "open"
    analyzing = "analyzing"
    scenarios_ready = "scenarios_ready"
    executing = "executing"
    resolved = "resolved"
    failed = "failed"


class AnalysisStatus(str, Enum):
    running = "running"
    done = "done"
    error = "error"


class ScenarioStatus(str, Enum):
    draft = "draft"
    selected = "selected"
    archived = "archived"


class ExecutionStatus(str, Enum):
    active = "active"
    completed = "completed"
    blocked = "blocked"


class ExecutionComplexity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ActionStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"


class NotificationType(str, Enum):
    event_detected = "event_detected"
    analysis_complete = "analysis_complete"
    scenario_generated = "scenario_generated"
    execution_alert = "execution_alert"


class CrisisEventBase(BaseModel):
    event_type: EventType = Field(alias="eventType")
    severity: Severity
    status: EventStatus = EventStatus.open
    title: str
    description: str = ""
    affected_asset_type: str | None = Field(default=None, alias="affectedAssetType")
    affected_asset_id: str | None = Field(default=None, alias="affectedAssetId")
    affected_stage: str | None = Field(default=None, alias="affectedStage")
    current_capacity: float = Field(default=0, alias="currentCapacity")
    impacted_capacity: float = Field(default=0, alias="impactedCapacity")
    capacity_loss: float = Field(default=0, alias="capacityLoss")
    capacity_loss_pct: float = Field(default=0, alias="capacityLossPct")
    event_start_datetime: dt.datetime | None = Field(default=None, alias="eventStartDatetime")
    estimated_downtime_min_days: int | None = Field(default=None, alias="estimatedDowntimeMinDays")
    estimated_downtime_max_days: int | None = Field(default=None, alias="estimatedDowntimeMaxDays")
    estimated_downtime_best_days: int | None = Field(default=None, alias="estimatedDowntimeBestDays")
    actual_recovery_datetime: dt.datetime | None = Field(default=None, alias="actualRecoveryDatetime")
    detected_by: str | None = Field(default=None, alias="detectedBy")
    created_by: str | None = Field(default=None, alias="createdBy")

    model_config = ConfigDict(populate_by_name=True)


class CrisisEventCreate(CrisisEventBase):
    pass


class CrisisEventUpdate(BaseModel):
    event_type: EventType | None = Field(default=None, alias="eventType")
    severity: Severity | None = None
    status: EventStatus | None = None
    title: str | None = None
    description: str | None = None
    affected_asset_type: str | None = Field(default=None, alias="affectedAssetType")
    affected_asset_id: str | None = Field(default=None, alias="affectedAssetId")
    affected_stage: str | None = Field(default=None, alias="affectedStage")
    current_capacity: float | None = Field(default=None, alias="currentCapacity")
    impacted_capacity: float | None = Field(default=None, alias="impactedCapacity")
    capacity_loss: float | None = Field(default=None, alias="capacityLoss")
    capacity_loss_pct: float | None = Field(default=None, alias="capacityLossPct")
    event_start_datetime: dt.datetime | None = Field(default=None, alias="eventStartDatetime")
    estimated_downtime_min_days: int | None = Field(default=None, alias="estimatedDowntimeMinDays")
    estimated_downtime_max_days: int | None = Field(default=None, alias="estimatedDowntimeMaxDays")
    estimated_downtime_best_days: int | None = Field(default=None, alias="estimatedDowntimeBestDays")
    actual_recovery_datetime: dt.datetime | None = Field(default=None, alias="actualRecoveryDatetime")
    detected_by: str | None = Field(default=None, alias="detectedBy")
    created_by: str | None = Field(default=None, alias="createdBy")

    model_config = ConfigDict(populate_by_name=True)


class CrisisEventRead(CrisisEventBase):
    id: str
    created_at: dt.datetime = Field(alias="createdAt")
    updated_at: dt.datetime = Field(alias="updatedAt")


class CrisisImpactAnalysisRead(BaseModel):
    id: str
    crisis_event_id: str = Field(alias="crisisEventId")
    analysis_run_at: dt.datetime = Field(alias="analysisRunAt")
    status: AnalysisStatus
    error_message: str | None = Field(default=None, alias="errorMessage")
    direct_impact: dict | None = Field(default=None, alias="directImpact")
    upstream_impact: dict | None = Field(default=None, alias="upstreamImpact")
    midstream_impact: dict | None = Field(default=None, alias="midstreamImpact")
    downstream_impact: dict | None = Field(default=None, alias="downstreamImpact")
    export_impact: dict | None = Field(default=None, alias="exportImpact")
    financial_impact: dict | None = Field(default=None, alias="financialImpact")
    balance_chain_before: dict | None = Field(default=None, alias="balanceChainBefore")
    balance_chain_after: dict | None = Field(default=None, alias="balanceChainAfter")

    model_config = ConfigDict(populate_by_name=True)


class CrisisResponseScenarioRead(BaseModel):
    id: str
    crisis_event_id: str = Field(alias="crisisEventId")
    scenario_name: str = Field(alias="scenarioName")
    scenario_type: str = Field(alias="scenarioType")
    description: str
    strategy_details: dict | None = Field(default=None, alias="strategyDetails")
    baseline_financial_impact: float = Field(alias="baselineFinancialImpact")
    mitigated_financial_impact: float = Field(alias="mitigatedFinancialImpact")
    net_savings: float = Field(alias="netSavings")
    execution_complexity: ExecutionComplexity = Field(alias="executionComplexity")
    execution_timeline_days: int = Field(alias="executionTimelineDays")
    dependencies: str | None = None
    risks: dict | None = None
    ai_generated: bool = Field(alias="aiGenerated")
    ai_confidence_score: float = Field(alias="aiConfidenceScore")
    ai_ranking: int | None = Field(default=None, alias="aiRanking")
    status: ScenarioStatus
    selected_by: str | None = Field(default=None, alias="selectedBy")
    selected_at: dt.datetime | None = Field(default=None, alias="selectedAt")

    model_config = ConfigDict(populate_by_name=True)


class CrisisExecutionPlanRead(BaseModel):
    id: str
    crisis_event_id: str = Field(alias="crisisEventId")
    selected_scenario_id: str = Field(alias="selectedScenarioId")
    status: ExecutionStatus
    start_date: dt.date | None = Field(default=None, alias="startDate")
    target_completion_date: dt.date | None = Field(default=None, alias="targetCompletionDate")
    planned_financial_impact: float = Field(alias="plannedFinancialImpact")
    actual_financial_impact: float = Field(alias="actualFinancialImpact")
    variance: float

    model_config = ConfigDict(populate_by_name=True)


class CrisisActionItemRead(BaseModel):
    id: str
    execution_plan_id: str = Field(alias="executionPlanId")
    phase: str
    action_title: str = Field(alias="actionTitle")
    action_description: str = Field(alias="actionDescription")
    assigned_to: str | None = Field(default=None, alias="assignedTo")
    deadline: dt.date | None = None
    completed_at: dt.datetime | None = Field(default=None, alias="completedAt")
    status: ActionStatus
    progress_pct: float = Field(alias="progressPct")
    depends_on_action_id: str | None = Field(default=None, alias="dependsOnActionId")
    blocking_reason: str | None = Field(default=None, alias="blockingReason")

    model_config = ConfigDict(populate_by_name=True)


class CrisisActionItemUpdate(BaseModel):
    status: ActionStatus | None = None
    progress_pct: float | None = Field(default=None, alias="progressPct")
    completed_at: dt.datetime | None = Field(default=None, alias="completedAt")
    blocking_reason: str | None = Field(default=None, alias="blockingReason")

    model_config = ConfigDict(populate_by_name=True)


class CrisisExecutionMonitoringRead(BaseModel):
    id: str
    execution_plan_id: str = Field(alias="executionPlanId")
    recorded_at: dt.datetime = Field(alias="recordedAt")
    metrics: dict | None = None
    financial_metrics: dict | None = Field(default=None, alias="financialMetrics")
    alerts: list[dict] | None = None

    model_config = ConfigDict(populate_by_name=True)


class CrisisEventDetail(BaseModel):
    event: CrisisEventRead
    impact: CrisisImpactAnalysisRead | None = None
    scenarios: list[CrisisResponseScenarioRead] = []
    execution_plan: CrisisExecutionPlanRead | None = Field(default=None, alias="executionPlan")
    action_items: list[CrisisActionItemRead] = Field(default_factory=list, alias="actionItems")

    model_config = ConfigDict(populate_by_name=True)


class CrisisMonitoringEntryCreate(BaseModel):
    utilization_refineries: float | None = Field(default=None, alias="utilizationRefineries")
    export_volumes: float | None = Field(default=None, alias="exportVolumes")
    planned_impact: float | None = Field(default=None, alias="plannedImpact")
    actual_impact: float | None = Field(default=None, alias="actualImpact")
    variance_pct: float | None = Field(default=None, alias="variancePct")
    alert_message: str | None = Field(default=None, alias="alertMessage")
    alert_severity: str | None = Field(default=None, alias="alertSeverity")
    note: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class CrisisExecutionBundle(BaseModel):
    plan: CrisisExecutionPlanRead
    action_items: list[CrisisActionItemRead] = Field(alias="actionItems")

    model_config = ConfigDict(populate_by_name=True)


class CrisisNotificationRead(BaseModel):
    id: str
    crisis_event_id: str = Field(alias="crisisEventId")
    notification_type: NotificationType = Field(alias="notificationType")
    severity: Severity
    title: str
    message: str
    recipient_user_id: str | None = Field(default=None, alias="recipientUserId")
    recipient_role: str | None = Field(default=None, alias="recipientRole")
    sent_at: dt.datetime = Field(alias="sentAt")
    delivered_at: dt.datetime | None = Field(default=None, alias="deliveredAt")
    read_at: dt.datetime | None = Field(default=None, alias="readAt")
    sent_via_email: bool = Field(alias="sentViaEmail")
    sent_via_websocket: bool = Field(alias="sentViaWebsocket")
    sent_via_sms: bool = Field(alias="sentViaSms")

    model_config = ConfigDict(populate_by_name=True)
