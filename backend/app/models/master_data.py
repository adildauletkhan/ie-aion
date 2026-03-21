from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Ngdu(Base):
    """Нефтегазодобывающее управление — структурное подразделение добывающей компании."""

    __tablename__ = "ngdus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="active")
    extraction_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("extraction_companies.id", ondelete="SET NULL"), nullable=True
    )

    extraction_company: Mapped["ExtractionCompany | None"] = relationship(
        "ExtractionCompany", back_populates="ngdus"
    )
    oil_fields: Mapped[list["OilField"]] = relationship("OilField", back_populates="ngdu")


class ProcessingPlant(Base):
    __tablename__ = "processing_plants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transportation_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_sections.id"),
        nullable=True,
    )
    transportation_section: Mapped["TransportationSection | None"] = relationship(
        "TransportationSection",
        back_populates="processing_plants",
    )


class TransportationSection(Base):
    __tablename__ = "transportation_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transportation_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_companies.id"),
        nullable=True,
    )
    transportation_company: Mapped["TransportationCompany | None"] = relationship(
        "TransportationCompany",
        back_populates="transportation_sections",
    )
    nps_stations: Mapped[list["NpsStation"]] = relationship(
        "NpsStation",
        back_populates="transportation_section",
    )
    processing_plants: Mapped[list["ProcessingPlant"]] = relationship(
        "ProcessingPlant",
        back_populates="transportation_section",
    )
    export_destinations: Mapped[list["ExportDestination"]] = relationship(
        "ExportDestination",
        back_populates="transportation_section",
    )


class NpsStation(Base):
    __tablename__ = "nps_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transportation_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_sections.id"),
        nullable=True,
    )
    transportation_section: Mapped["TransportationSection | None"] = relationship(
        "TransportationSection",
        back_populates="nps_stations",
    )


class OilField(Base):
    __tablename__ = "oil_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    extraction_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("extraction_companies.id"),
        nullable=True,
    )
    ngdu_id: Mapped[int | None] = mapped_column(
        ForeignKey("ngdus.id", ondelete="SET NULL"), nullable=True
    )
    extraction_company: Mapped["ExtractionCompany | None"] = relationship(
        "ExtractionCompany",
        back_populates="oil_fields",
    )
    ngdu: Mapped["Ngdu | None"] = relationship("Ngdu", back_populates="oil_fields")



    # Reservoir Twin relationships
    reservoir_horizons: Mapped[list["ReservoirHorizon"]] = relationship(
        "ReservoirHorizon", back_populates="oil_field"
    )
    reservoir_formations: Mapped[list["ReservoirFormation"]] = relationship(
        "ReservoirFormation", back_populates="oil_field"
    )
    reservoir_drainage_zones: Mapped[list["ReservoirDrainageZone"]] = relationship(
        "ReservoirDrainageZone", back_populates="oil_field"
    )

class ExtractionCompany(Base):
    __tablename__ = "extraction_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Workspace visibility: "all" = КМГ-level (sees everything),
    # "own" = sees only own assets + inherited transport/export
    workspace_scope: Mapped[str] = mapped_column(String(20), nullable=False, default="own")
    oil_fields: Mapped[list["OilField"]] = relationship(
        "OilField",
        back_populates="extraction_company",
    )
    ngdus: Mapped[list["Ngdu"]] = relationship("Ngdu", back_populates="extraction_company")


class TransportationCompany(Base):
    __tablename__ = "transportation_companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transportation_sections: Mapped[list["TransportationSection"]] = relationship(
        "TransportationSection",
        back_populates="transportation_company",
    )


class ExportDestination(Base):
    __tablename__ = "export_destinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    current_month: Mapped[float] = mapped_column(Float, nullable=False)
    current_day: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transportation_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_sections.id"),
        nullable=True,
    )
    transportation_section: Mapped["TransportationSection | None"] = relationship(
        "TransportationSection",
        back_populates="export_destinations",
    )
