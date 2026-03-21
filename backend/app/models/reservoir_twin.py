"""
Reservoir Twin Models - Геологические модели пластов
"""
from typing import Optional
from sqlalchemy import Integer, String, Float, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ReservoirHorizon(Base):
    """Продуктивный горизонт"""
    __tablename__ = "reservoir_horizons"
    __table_args__ = (
        UniqueConstraint("oil_field_id", "name", name="uq_reservoir_horizons_oil_field_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    oil_field_id: Mapped[int] = mapped_column(ForeignKey("oil_fields.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    depth_top: Mapped[float] = mapped_column(Float, nullable=False)
    depth_bottom: Mapped[float] = mapped_column(Float, nullable=False)
    stratigraphic_age: Mapped[Optional[str]] = mapped_column(String(100))
    lithology: Mapped[Optional[str]] = mapped_column(String(200))
    porosity: Mapped[Optional[float]] = mapped_column(Float)
    permeability: Mapped[Optional[float]] = mapped_column(Float)
    effective_thickness: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    oil_field: Mapped["OilField"] = relationship("OilField", back_populates="reservoir_horizons")
    formations: Mapped[list["ReservoirFormation"]] = relationship(
        "ReservoirFormation", back_populates="horizon", cascade="all, delete-orphan"
    )


class ReservoirFormation(Base):
    """Пласт"""
    __tablename__ = "reservoir_formations"
    __table_args__ = (
        UniqueConstraint("oil_field_id", "code", name="uq_reservoir_formations_oil_field_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    oil_field_id: Mapped[int] = mapped_column(ForeignKey("oil_fields.id"), nullable=False, index=True)
    horizon_id: Mapped[int] = mapped_column(ForeignKey("reservoir_horizons.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    depth_top: Mapped[float] = mapped_column(Float, nullable=False)
    depth_bottom: Mapped[float] = mapped_column(Float, nullable=False)
    area: Mapped[float] = mapped_column(Float, nullable=False)
    average_thickness: Mapped[float] = mapped_column(Float, nullable=False)
    effective_thickness: Mapped[float] = mapped_column(Float, nullable=False)
    net_to_gross: Mapped[float] = mapped_column(Float, nullable=False)
    porosity: Mapped[float] = mapped_column(Float, nullable=False)
    permeability: Mapped[float] = mapped_column(Float, nullable=False)
    saturation_oil: Mapped[float] = mapped_column(Float, nullable=False)
    saturation_water: Mapped[float] = mapped_column(Float, nullable=False)
    saturation_gas: Mapped[Optional[float]] = mapped_column(Float)
    viscosity_oil: Mapped[float] = mapped_column(Float, nullable=False)
    density_oil: Mapped[float] = mapped_column(Float, nullable=False)
    formation_volume_factor: Mapped[Optional[float]] = mapped_column(Float)
    gas_oil_ratio: Mapped[Optional[float]] = mapped_column(Float)
    initial_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    initial_temperature: Mapped[float] = mapped_column(Float, nullable=False)
    reserves_geological: Mapped[float] = mapped_column(Float, nullable=False)
    reserves_recoverable: Mapped[float] = mapped_column(Float, nullable=False)
    recovery_factor: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    oil_field: Mapped["OilField"] = relationship("OilField", back_populates="reservoir_formations")
    horizon: Mapped["ReservoirHorizon"] = relationship("ReservoirHorizon", back_populates="formations")
    drainage_zones: Mapped[list["ReservoirDrainageZone"]] = relationship(
        "ReservoirDrainageZone", back_populates="formation", cascade="all, delete-orphan"
    )


class ReservoirDrainageZone(Base):
    """Зона дренирования"""
    __tablename__ = "reservoir_drainage_zones"
    __table_args__ = (
        UniqueConstraint("oil_field_id", "code", name="uq_reservoir_zones_oil_field_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    oil_field_id: Mapped[int] = mapped_column(ForeignKey("oil_fields.id"), nullable=False, index=True)
    formation_id: Mapped[int] = mapped_column(ForeignKey("reservoir_formations.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    geometry_type: Mapped[str] = mapped_column(String(20), nullable=False)
    geometry_radius: Mapped[Optional[float]] = mapped_column(Float)
    geometry_polygon: Mapped[Optional[str]] = mapped_column(Text)
    current_state: Mapped[str] = mapped_column(String(50), nullable=False)
    current_pressure: Mapped[Optional[float]] = mapped_column(Float)
    current_production_rate: Mapped[Optional[float]] = mapped_column(Float)
    reserves_initial: Mapped[float] = mapped_column(Float, nullable=False)
    reserves_remaining: Mapped[float] = mapped_column(Float, nullable=False)
    reserves_produced: Mapped[Optional[float]] = mapped_column(Float)
    development_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    current_kin: Mapped[float] = mapped_column(Float, nullable=False)
    target_kin: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    oil_field: Mapped["OilField"] = relationship("OilField", back_populates="reservoir_drainage_zones")
    formation: Mapped["ReservoirFormation"] = relationship("ReservoirFormation", back_populates="drainage_zones")
