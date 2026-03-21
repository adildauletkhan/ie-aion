import datetime as dt
import uuid

from sqlalchemy import DateTime, Float, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    owner: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    approval_status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    comments: Mapped[str] = mapped_column(String(2000), default="", nullable=False)
    usd_kzt: Mapped[float] = mapped_column(Float, default=507, nullable=False)
    oil_price_kz: Mapped[float] = mapped_column(Float, default=70, nullable=False)
    brent_price: Mapped[float] = mapped_column(Float, default=75, nullable=False)
    kzt_inflation: Mapped[float] = mapped_column(Float, default=8, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    inputs: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)

    result = relationship("ScenarioResult", back_populates="scenario", uselist=False, cascade="all, delete-orphan")
