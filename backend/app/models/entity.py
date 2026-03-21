from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    gov_plan: Mapped[float] = mapped_column(Float, nullable=False)
    corp_plan: Mapped[float] = mapped_column(Float, nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    processing_plant_id: Mapped[int | None] = mapped_column(ForeignKey("processing_plants.id"), nullable=True)
    transportation_section_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_sections.id"),
        nullable=True,
    )
    nps_station_id: Mapped[int | None] = mapped_column(ForeignKey("nps_stations.id"), nullable=True)
    oil_field_id: Mapped[int | None] = mapped_column(ForeignKey("oil_fields.id"), nullable=True)
    extraction_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("extraction_companies.id"),
        nullable=True,
    )
    transportation_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("transportation_companies.id"),
        nullable=True,
    )

    processing_plant = relationship("ProcessingPlant")
    transportation_section = relationship("TransportationSection")
    nps_station = relationship("NpsStation")
    oil_field = relationship("OilField")
    extraction_company = relationship("ExtractionCompany")
    transportation_company = relationship("TransportationCompany")
