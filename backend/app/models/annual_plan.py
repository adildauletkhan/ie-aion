import datetime as dt
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AnnualPlan(Base):
    __tablename__ = "annual_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    baseline_source: Mapped[str] = mapped_column(String(200), default="master-data", nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    scenarios = relationship("AnnualPlanScenario", back_populates="plan", cascade="all, delete-orphan")


class AnnualPlanScenario(Base):
    __tablename__ = "annual_plan_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("annual_plans.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    plan = relationship("AnnualPlan", back_populates="scenarios")
    lines = relationship("AnnualPlanLine", back_populates="scenario", cascade="all, delete-orphan")
    issues = relationship("AnnualPlanIssue", back_populates="scenario", cascade="all, delete-orphan")


class AnnualPlanLine(Base):
    __tablename__ = "annual_plan_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scenario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("annual_plan_scenarios.id"), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    asset_code: Mapped[str] = mapped_column(String(50), nullable=False)
    asset_name: Mapped[str] = mapped_column(String(200), nullable=False)
    capacity: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    monthly_plan: Mapped[list[float]] = mapped_column(JSONB, nullable=False)
    notes: Mapped[str] = mapped_column(String(500), default="", nullable=False)

    scenario = relationship("AnnualPlanScenario", back_populates="lines")


class AnnualPlanIssue(Base):
    __tablename__ = "annual_plan_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scenario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("annual_plan_scenarios.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    asset_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    gap: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    scenario = relationship("AnnualPlanScenario", back_populates="issues")
