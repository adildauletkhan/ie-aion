"""ORM-модели строительного домена (Фаза 1).

Персистентная основа для Telegram-бота сбора голосовых отчётов бригадиров и
модулей IE:AION «Бригадиры» / «Суточный журнал» / «Цифровой двойник».

Enum-поля хранятся как строки (String) с фиксированным набором значений —
валидация значений выполняется на уровне Pydantic-схем (app/schemas/construction.py),
что упрощает миграции и переносимость между PostgreSQL и SQLite.
"""

import datetime as dt
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# --------------------------------------------------------------------------
# Допустимые значения строковых enum-полей (валидируются в Pydantic-схемах)
# --------------------------------------------------------------------------
TASK_STATUSES = ("planned", "in_progress", "done", "blocked")
DEVIATION_KINDS = ("schedule", "resource", "dependency", "quality", "external")
DEVIATION_SEVERITIES = ("attention", "risk", "critical")
FOREMAN_ROLES = ("foreman", "brigadier", "pto")
TELEGRAM_LINK_STATUSES = ("not_invited", "invited", "linked")
JOURNAL_SOURCES = ("voice", "manual", "cv")
BLOCKER_TYPES = ("resource", "dependency", "external", "quality", "none")
RISK_SEVERITIES = ("risk", "attention", "critical", "none")


class ConstructionProject(Base):
    __tablename__ = "construction_projects"

    project_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    developer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bac: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    data_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    plan_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    plan_finish: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    fact_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)


class Phase(Base):
    __tablename__ = "construction_phases"

    phase_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_phase_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    plan_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    plan_finish: Mapped[dt.date | None] = mapped_column(Date, nullable=True)


class ScheduleTask(Base):
    __tablename__ = "construction_schedule_tasks"

    task_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_task_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wbs_code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phase_id: Mapped[str | None] = mapped_column(
        String(100),
        ForeignKey("construction_phases.phase_id", name="fk_task_phase", ondelete="SET NULL"),
        nullable=True,
    )
    planned_progress_pct: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    actual_progress_pct: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="planned", nullable=False)
    responsible: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plan_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    plan_finish: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    fact_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    fact_finish: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    # EVM-поля (в ₸). pv/ev/ac заполняются пересчётом или интеграцией с ERP.
    pv: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    ev: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    ac: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)


class ZonePlanFact(Base):
    __tablename__ = "construction_zone_plan_fact"
    __table_args__ = (
        UniqueConstraint("project_id", "zone", "date", name="uq_zone_plan_fact_project_zone_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_zpf_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    zone: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    plan_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    fact_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    lag_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)


class Deviation(Base):
    __tablename__ = "construction_deviations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_dev_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[str | None] = mapped_column(
        String(100),
        ForeignKey("construction_schedule_tasks.task_id", name="fk_dev_task", ondelete="SET NULL"),
        nullable=True,
    )
    zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    delta_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False, index=True)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class ProgressCurvePoint(Base):
    __tablename__ = "construction_progress_curve"
    __table_args__ = (
        UniqueConstraint("project_id", "date", name="uq_progress_curve_project_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_curve_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    pv: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    ev: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    ac: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)


class Crew(Base):
    __tablename__ = "construction_crews"

    crew_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_crew_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contractor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    planned_headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    foremen = relationship("Foreman", back_populates="crew")


class Foreman(Base):
    __tablename__ = "construction_foremen"

    foreman_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_foreman_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="brigadier", nullable=False)
    crew_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("construction_crews.crew_id", name="fk_foreman_crew", ondelete="SET NULL"),
        nullable=True,
    )
    default_zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True, index=True)
    telegram_link_status: Mapped[str] = mapped_column(String(20), default="not_invited", nullable=False)
    invite_code: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    crew = relationship("Crew", back_populates="foremen")


class DailyJournalEntry(Base):
    __tablename__ = "construction_daily_journal"

    entry_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("construction_projects.project_id", name="fk_journal_project", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    task_id: Mapped[str | None] = mapped_column(
        String(100),
        ForeignKey("construction_schedule_tasks.task_id", name="fk_journal_task", ondelete="SET NULL"),
        nullable=True,
    )
    work_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plan_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    fact_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="voice", nullable=False)
    author_foreman_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("construction_foremen.foreman_id", name="fk_journal_foreman", ondelete="SET NULL"),
        nullable=True,
    )
    author_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", name="fk_journal_user", ondelete="SET NULL"),
        nullable=True,
    )
    blocker_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    blocker_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_delay_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    responsible: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    raw_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    photos: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    match_confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False, index=True)
