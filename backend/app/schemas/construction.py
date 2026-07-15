"""Pydantic v2-схемы строительного домена (Фаза 1).

Соглашение:
- Эндпоинты, которые дёргает Telegram-бот (active-tasks, journal POST,
  link-telegram, by-telegram), используют snake_case-ключи — строго под схему
  из voice-report-system-prompt.md (§2, §5.1). Бот отправляет/принимает эти поля
  «как есть».
- Эндпоинты для UI IE:AION (список бригадиров, чтение журнала, таймлайн
  отклонений, спарклайн) используют camelCase-алиасы — как в остальном проекте.
"""

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# ==========================================================================
# BOT-FACING (snake_case)
# ==========================================================================


class ActiveTaskRead(BaseModel):
    """Формат active_wbs_tasks из voice-report-system-prompt.md §2 — поле в поле."""

    task_id: str
    wbs_code: str
    name: str
    zone: str | None = None
    phase_id: str | None = None
    planned_progress_pct: float | None = None
    status: str
    responsible: str | None = None


class BlockerIn(BaseModel):
    type: str | None = "none"
    description: str | None = None
    resource_code: str | None = None
    related_task_id: str | None = None

    model_config = ConfigDict(extra="ignore")


class RiskIn(BaseModel):
    delay_days: int | None = None
    severity: str | None = "none"
    description: str | None = None

    model_config = ConfigDict(extra="ignore")


class JournalEntryIn(BaseModel):
    """Одна запись из structured_data.entries[] (voice-report-system-prompt.md §5.1)."""

    entry_id: str | None = None
    task_id: str | None = None
    wbs_code: str | None = None
    zone: str | None = None
    work_type: str | None = None
    match_confidence: str | None = None
    plan_pct: float | None = None
    fact_pct: float | None = None
    delta_pct: float | None = None
    crew_planned: int | None = None
    crew_actual: int | None = None
    blocker: BlockerIn | None = None
    risk: RiskIn | None = None
    responsible: str | None = None
    recommended_actions: list[str] = Field(default_factory=list)
    notes: str | None = None

    model_config = ConfigDict(extra="ignore")


class JournalSubmitRequest(BaseModel):
    """Тело POST /journal от бота."""

    entries: list[JournalEntryIn] = Field(default_factory=list)
    author_foreman_id: str | None = None
    raw_quote: str | None = None
    report_date: dt.date


class JournalSubmitResponse(BaseModel):
    applied_count: int
    clarification_count: int
    created_deviations: int
    journal_entry_ids: list[str]
    message: str


class LinkTelegramRequest(BaseModel):
    telegram_user_id: int
    invite_code: str


class ForemanTelegramRead(BaseModel):
    """Ответ by-telegram — для бота."""

    foreman_id: str
    project_id: str
    full_name: str
    default_zone: str | None = None
    telegram_link_status: str
    role: str


# ==========================================================================
# UI-FACING (camelCase)
# ==========================================================================


class CrewRead(BaseModel):
    crew_id: str = Field(alias="crewId")
    project_id: str = Field(alias="projectId")
    name: str
    contractor_name: str | None = Field(default=None, alias="contractorName")
    specialization: str | None = None
    planned_headcount: int | None = Field(default=None, alias="plannedHeadcount")

    model_config = ConfigDict(populate_by_name=True)


class CrewCreate(BaseModel):
    name: str
    contractor_name: str | None = Field(default=None, alias="contractorName")
    specialization: str | None = None
    planned_headcount: int | None = Field(default=None, alias="plannedHeadcount")

    model_config = ConfigDict(populate_by_name=True)


class ForemanCreate(BaseModel):
    full_name: str = Field(alias="fullName")
    phone: str | None = None
    role: str = "brigadier"
    crew_id: str | None = Field(default=None, alias="crewId")
    default_zone: str | None = Field(default=None, alias="defaultZone")

    model_config = ConfigDict(populate_by_name=True)


class ForemanRead(BaseModel):
    foreman_id: str = Field(alias="foremanId")
    project_id: str = Field(alias="projectId")
    full_name: str = Field(alias="fullName")
    phone: str | None = None
    role: str
    crew_id: str | None = Field(default=None, alias="crewId")
    crew_name: str | None = Field(default=None, alias="crewName")
    contractor_name: str | None = Field(default=None, alias="contractorName")
    default_zone: str | None = Field(default=None, alias="defaultZone")
    telegram_user_id: int | None = Field(default=None, alias="telegramUserId")
    telegram_link_status: str = Field(alias="telegramLinkStatus")
    invite_code: str | None = Field(default=None, alias="inviteCode")
    active: bool = True
    last_report_date: dt.date | None = Field(default=None, alias="lastReportDate")
    created_at: dt.datetime = Field(alias="createdAt")
    updated_at: dt.datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class DailyJournalEntryRead(BaseModel):
    entry_id: str = Field(alias="entryId")
    project_id: str = Field(alias="projectId")
    date: dt.date
    zone: str | None = None
    task_id: str | None = Field(default=None, alias="taskId")
    work_type: str | None = Field(default=None, alias="workType")
    plan_pct: float | None = Field(default=None, alias="planPct")
    fact_pct: float | None = Field(default=None, alias="factPct")
    delta_pct: float | None = Field(default=None, alias="deltaPct")
    source: str
    author_foreman_id: str | None = Field(default=None, alias="authorForemanId")
    author_foreman_name: str | None = Field(default=None, alias="authorForemanName")
    author_user_id: int | None = Field(default=None, alias="authorUserId")
    blocker_type: str | None = Field(default=None, alias="blockerType")
    blocker_description: str | None = Field(default=None, alias="blockerDescription")
    risk_delay_days: int | None = Field(default=None, alias="riskDelayDays")
    risk_severity: str | None = Field(default=None, alias="riskSeverity")
    responsible: str | None = None
    actions: list[str] = Field(default_factory=list)
    raw_transcript: str | None = Field(default=None, alias="rawTranscript")
    photos: list[str] = Field(default_factory=list)
    confirmed: bool = False
    match_confidence: str | None = Field(default=None, alias="matchConfidence")
    created_at: dt.datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ManualJournalEntryCreate(BaseModel):
    """Ручное добавление записи из UI «Суточный журнал»."""

    date: dt.date
    zone: str | None = None
    task_id: str | None = Field(default=None, alias="taskId")
    work_type: str | None = Field(default=None, alias="workType")
    plan_pct: float | None = Field(default=None, alias="planPct")
    fact_pct: float | None = Field(default=None, alias="factPct")
    delta_pct: float | None = Field(default=None, alias="deltaPct")
    blocker_type: str | None = Field(default=None, alias="blockerType")
    blocker_description: str | None = Field(default=None, alias="blockerDescription")
    risk_delay_days: int | None = Field(default=None, alias="riskDelayDays")
    risk_severity: str | None = Field(default=None, alias="riskSeverity")
    responsible: str | None = None
    actions: list[str] = Field(default_factory=list)
    confirmed: bool = True

    model_config = ConfigDict(populate_by_name=True)


class DeviationTimelineRead(BaseModel):
    id: str
    project_id: str = Field(alias="projectId")
    task_id: str | None = Field(default=None, alias="taskId")
    zone: str | None = None
    kind: str
    severity: str
    delta_pct: float | None = Field(default=None, alias="deltaPct")
    description: str | None = None
    detected_at: dt.datetime = Field(alias="detectedAt")
    resolved_at: dt.datetime | None = Field(default=None, alias="resolvedAt")

    model_config = ConfigDict(populate_by_name=True)


class SparklinePoint(BaseModel):
    date: dt.date
    ev: float | None = None


class ProgressCurveRead(BaseModel):
    date: dt.date
    pv: float | None = None
    ev: float | None = None
    ac: float | None = None


class ProjectRead(BaseModel):
    project_id: str = Field(alias="projectId")
    name: str
    developer: str | None = None
    bac: float | None = None
    data_date: dt.date | None = Field(default=None, alias="dataDate")
    plan_start: dt.date | None = Field(default=None, alias="planStart")
    plan_finish: dt.date | None = Field(default=None, alias="planFinish")
    fact_start: dt.date | None = Field(default=None, alias="factStart")

    model_config = ConfigDict(populate_by_name=True)


class ScheduleTaskRead(BaseModel):
    task_id: str = Field(alias="taskId")
    project_id: str = Field(alias="projectId")
    wbs_code: str = Field(alias="wbsCode")
    name: str
    zone: str | None = None
    phase_id: str | None = Field(default=None, alias="phaseId")
    planned_progress_pct: float | None = Field(default=None, alias="plannedProgressPct")
    actual_progress_pct: float | None = Field(default=None, alias="actualProgressPct")
    status: str
    responsible: str | None = None
    plan_start: dt.date | None = Field(default=None, alias="planStart")
    plan_finish: dt.date | None = Field(default=None, alias="planFinish")
    fact_start: dt.date | None = Field(default=None, alias="factStart")
    fact_finish: dt.date | None = Field(default=None, alias="factFinish")
    pv: float | None = None
    ev: float | None = None
    ac: float | None = None

    model_config = ConfigDict(populate_by_name=True)


class ZonePlanFactRead(BaseModel):
    id: str
    project_id: str = Field(alias="projectId")
    zone: str
    date: dt.date
    plan_pct: float | None = Field(default=None, alias="planPct")
    fact_pct: float | None = Field(default=None, alias="factPct")
    lag_days: int | None = Field(default=None, alias="lagDays")

    model_config = ConfigDict(populate_by_name=True)


class GenericOk(BaseModel):
    ok: bool = True
    detail: str | None = None
    extra: dict[str, Any] | None = None
