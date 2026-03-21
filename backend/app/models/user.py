import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="viewer", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True, index=True)
    active_workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("extraction_companies.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="users")
    workspaces: Mapped[list["UserWorkspace"]] = relationship(
        "UserWorkspace", back_populates="user", cascade="all, delete-orphan"
    )


class UserWorkspace(Base):
    """Доступные пользователю workspaces (extraction_companies)."""

    __tablename__ = "user_workspaces"
    __table_args__ = (UniqueConstraint("user_id", "extraction_company_id", name="uq_user_workspace"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    extraction_company_id: Mapped[int] = mapped_column(
        ForeignKey("extraction_companies.id", ondelete="CASCADE"), nullable=False
    )
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship("User", back_populates="workspaces")
