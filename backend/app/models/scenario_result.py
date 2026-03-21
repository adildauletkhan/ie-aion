from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scenario_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("scenarios.id"), unique=True, nullable=False)
    total_gap: Mapped[float] = mapped_column(Float, nullable=False)
    bottleneck: Mapped[str] = mapped_column(String(200), nullable=False)
    utilization: Mapped[float] = mapped_column(Float, nullable=False)

    scenario = relationship("Scenario", back_populates="result")
