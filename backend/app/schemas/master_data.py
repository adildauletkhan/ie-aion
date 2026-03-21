from pydantic import BaseModel, ConfigDict, Field


class NgduBase(BaseModel):
    code: str
    name: str
    short_name: str | None = Field(default=None, alias="shortName")
    region: str | None = None
    status: str | None = None
    extraction_company_id: int | None = Field(default=None, alias="extractionCompanyId")

    model_config = ConfigDict(populate_by_name=True)


class NgduCreate(NgduBase):
    pass


class NgduUpdate(NgduBase):
    pass


class NgduRead(NgduBase):
    id: int


class MasterDataBase(BaseModel):
    code: str
    name: str
    short_name: str | None = Field(default=None, alias="shortName")
    capacity: float
    current_month: float = Field(alias="currentMonth")
    current_day: float = Field(alias="currentDay")
    region: str | None = None
    status: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class ProcessingPlantBase(MasterDataBase):
    transportation_section_id: int | None = Field(default=None, alias="transportationSectionId")


class ProcessingPlantCreate(ProcessingPlantBase):
    pass


class ProcessingPlantUpdate(ProcessingPlantBase):
    pass


class ProcessingPlantRead(ProcessingPlantBase):
    id: int


class TransportationSectionBase(MasterDataBase):
    transportation_company_id: int | None = Field(default=None, alias="transportationCompanyId")


class TransportationSectionCreate(TransportationSectionBase):
    pass


class TransportationSectionUpdate(TransportationSectionBase):
    pass


class TransportationSectionRead(TransportationSectionBase):
    id: int


class NpsStationBase(MasterDataBase):
    transportation_section_id: int | None = Field(default=None, alias="transportationSectionId")


class NpsStationCreate(NpsStationBase):
    pass


class NpsStationUpdate(NpsStationBase):
    pass


class NpsStationRead(NpsStationBase):
    id: int


class OilFieldBase(MasterDataBase):
    extraction_company_id: int | None = Field(default=None, alias="extractionCompanyId")
    ngdu_id: int | None = Field(default=None, alias="ngduId")


class ExportDestinationBase(MasterDataBase):
    transportation_section_id: int | None = Field(default=None, alias="transportationSectionId")


class ExportDestinationCreate(ExportDestinationBase):
    pass


class ExportDestinationUpdate(ExportDestinationBase):
    pass


class ExportDestinationRead(ExportDestinationBase):
    id: int


class OilFieldCreate(OilFieldBase):
    pass


class OilFieldUpdate(OilFieldBase):
    pass


class OilFieldRead(OilFieldBase):
    id: int


class ExtractionCompanyBase(MasterDataBase):
    pass


class ExtractionCompanyCreate(ExtractionCompanyBase):
    pass


class ExtractionCompanyUpdate(ExtractionCompanyBase):
    pass


class ExtractionCompanyRead(ExtractionCompanyBase):
    id: int


class TransportationCompanyBase(MasterDataBase):
    pass


class TransportationCompanyCreate(TransportationCompanyBase):
    pass


class TransportationCompanyUpdate(TransportationCompanyBase):
    pass


class TransportationCompanyRead(TransportationCompanyBase):
    id: int
