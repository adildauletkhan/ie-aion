from pydantic import BaseModel, ConfigDict, Field


class EntityBase(BaseModel):
    entity: str
    type: str
    capacity: float
    gov_plan: float = Field(alias="govPlan")
    corp_plan: float = Field(alias="corpPlan")
    region: str
    status: str
    processing_plant_id: int | None = Field(default=None, alias="processingPlantId")
    transportation_section_id: int | None = Field(default=None, alias="transportationSectionId")
    nps_station_id: int | None = Field(default=None, alias="npsStationId")
    oil_field_id: int | None = Field(default=None, alias="oilFieldId")
    extraction_company_id: int | None = Field(default=None, alias="extractionCompanyId")
    transportation_company_id: int | None = Field(default=None, alias="transportationCompanyId")
    processing_plant_code: str | None = Field(default=None, alias="processingPlantCode")
    transportation_section_code: str | None = Field(default=None, alias="transportationSectionCode")
    nps_station_code: str | None = Field(default=None, alias="npsStationCode")
    oil_field_code: str | None = Field(default=None, alias="oilFieldCode")
    extraction_company_code: str | None = Field(default=None, alias="extractionCompanyCode")
    transportation_company_code: str | None = Field(default=None, alias="transportationCompanyCode")

    model_config = ConfigDict(populate_by_name=True)


class EntityCreate(EntityBase):
    pass


class EntityUpdate(EntityBase):
    pass


class EntityRead(EntityBase):
    id: int


class CapacityRow(BaseModel):
    entity: str
    capacity: float
    gov_plan: float = Field(alias="govPlan")
    corp_plan: float = Field(alias="corpPlan")

    model_config = ConfigDict(populate_by_name=True)
