import datetime as dt
import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FieldObjectType(Base):
    __tablename__ = "field_object_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    icon_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    default_properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    scheme_objects = relationship("FieldSchemeObject", back_populates="object_type")


class FieldScheme(Base):
    __tablename__ = "field_schemes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    oil_field_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("oil_fields.id", name="fk_field_schemes_oil_field_id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    canvas_width: Mapped[int] = mapped_column(Integer, default=2000, nullable=False)
    canvas_height: Mapped[int] = mapped_column(Integer, default=1500, nullable=False)
    zoom_level: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_scheme_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_schemes.id", name="fk_field_schemes_parent_id"),
        nullable=True,
    )
    created_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", name="fk_field_schemes_created_by"),
        nullable=True,
    )
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    objects = relationship("FieldSchemeObject", back_populates="scheme", cascade="all, delete-orphan")
    connections = relationship("FieldSchemeConnection", back_populates="scheme", cascade="all, delete-orphan")
    calculations = relationship("FieldSchemeCalculation", back_populates="scheme", cascade="all, delete-orphan")


class FieldSchemeObject(Base):
    __tablename__ = "field_scheme_objects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_schemes.id", name="fk_scheme_objects_scheme_id", ondelete="CASCADE"),
        nullable=False,
    )
    object_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_object_types.id", name="fk_scheme_objects_type_id"),
        nullable=False,
    )
    object_code: Mapped[str] = mapped_column(String(100), nullable=False)
    object_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position_x: Mapped[int] = mapped_column(Integer, nullable=False)
    position_y: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    height: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icon_override: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rotation: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    linked_asset_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    linked_asset_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    scheme = relationship("FieldScheme", back_populates="objects")
    object_type = relationship("FieldObjectType", back_populates="scheme_objects")


class FieldSchemeConnection(Base):
    __tablename__ = "field_scheme_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_schemes.id", name="fk_scheme_connections_scheme_id", ondelete="CASCADE"),
        nullable=False,
    )
    source_object_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_scheme_objects.id", name="fk_scheme_connections_source_id", ondelete="CASCADE"),
        nullable=False,
    )
    target_object_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_scheme_objects.id", name="fk_scheme_connections_target_id", ondelete="CASCADE"),
        nullable=False,
    )
    connection_type: Mapped[str] = mapped_column(String(50), nullable=False)
    flow_properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    line_style: Mapped[str | None] = mapped_column(String(50), default="solid", nullable=False)
    line_width: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    animated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    path_points: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)

    scheme = relationship("FieldScheme", back_populates="connections")


class FieldSchemeCalculation(Base):
    __tablename__ = "field_scheme_calculations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_schemes.id", name="fk_scheme_calculations_scheme_id", ondelete="CASCADE"),
        nullable=False,
    )
    calculation_run_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, nullable=False)
    calculation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    input_parameters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    validation_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    validation_messages: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    scheme = relationship("FieldScheme", back_populates="calculations")
