from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.crud.master_data import (
    create_extraction_company,
    create_export_destination,
    create_ngdu,
    create_nps_station,
    create_oil_field,
    create_processing_plant,
    create_transportation_company,
    create_transportation_section,
    delete_extraction_company,
    delete_export_destination,
    delete_ngdu,
    delete_nps_station,
    delete_oil_field,
    delete_processing_plant,
    delete_transportation_company,
    delete_transportation_section,
    get_extraction_company,
    get_export_destination,
    get_ngdu,
    get_nps_station,
    get_oil_field,
    get_processing_plant,
    get_transportation_company,
    get_transportation_section,
    list_extraction_companies,
    list_export_destinations,
    list_ngdus,
    list_nps_stations,
    list_oil_fields,
    list_processing_plants,
    list_transportation_companies,
    list_transportation_sections,
    update_extraction_company,
    update_export_destination,
    update_ngdu,
    update_nps_station,
    update_oil_field,
    update_processing_plant,
    update_transportation_company,
    update_transportation_section,
)
from app.schemas.master_data import (
    ExtractionCompanyCreate,
    ExtractionCompanyRead,
    ExtractionCompanyUpdate,
    ExportDestinationCreate,
    ExportDestinationRead,
    ExportDestinationUpdate,
    NgduCreate,
    NgduRead,
    NgduUpdate,
    NpsStationCreate,
    NpsStationRead,
    NpsStationUpdate,
    OilFieldCreate,
    OilFieldRead,
    OilFieldUpdate,
    ProcessingPlantCreate,
    ProcessingPlantRead,
    ProcessingPlantUpdate,
    TransportationCompanyCreate,
    TransportationCompanyRead,
    TransportationCompanyUpdate,
    TransportationSectionCreate,
    TransportationSectionRead,
    TransportationSectionUpdate,
)

router = APIRouter(prefix="/master-data")


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.get("/processing-plants", response_model=list[ProcessingPlantRead])
def list_processing_plants_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProcessingPlantRead]:
    items = list_processing_plants(db)
    return [
        ProcessingPlantRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
            transportation_section_id=item.transportation_section_id,
        )
        for item in items
    ]


@router.post("/processing-plants", response_model=ProcessingPlantRead)
def create_processing_plant_api(
    payload: ProcessingPlantCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ProcessingPlantRead:
    item = create_processing_plant(db, payload.model_dump())
    return ProcessingPlantRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.get("/processing-plants/{item_id}", response_model=ProcessingPlantRead)
def get_processing_plant_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProcessingPlantRead:
    item = get_processing_plant(db, item_id)
    if not item:
        raise _not_found()
    return ProcessingPlantRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.put("/processing-plants/{item_id}", response_model=ProcessingPlantRead)
def update_processing_plant_api(
    item_id: int,
    payload: ProcessingPlantUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ProcessingPlantRead:
    item = get_processing_plant(db, item_id)
    if not item:
        raise _not_found()
    updated = update_processing_plant(db, item, payload.model_dump())
    return ProcessingPlantRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
        transportation_section_id=updated.transportation_section_id,
    )


@router.delete("/processing-plants/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_processing_plant_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_processing_plant(db, item_id)
    if not item:
        raise _not_found()
    delete_processing_plant(db, item)


@router.get("/transportation-sections", response_model=list[TransportationSectionRead])
def list_transportation_sections_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TransportationSectionRead]:
    items = list_transportation_sections(db)
    return [
        TransportationSectionRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
            transportation_company_id=item.transportation_company_id,
        )
        for item in items
    ]


@router.post("/transportation-sections", response_model=TransportationSectionRead)
def create_transportation_section_api(
    payload: TransportationSectionCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> TransportationSectionRead:
    item = create_transportation_section(db, payload.model_dump())
    return TransportationSectionRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_company_id=item.transportation_company_id,
    )


@router.get("/transportation-sections/{item_id}", response_model=TransportationSectionRead)
def get_transportation_section_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransportationSectionRead:
    item = get_transportation_section(db, item_id)
    if not item:
        raise _not_found()
    return TransportationSectionRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_company_id=item.transportation_company_id,
    )


@router.put("/transportation-sections/{item_id}", response_model=TransportationSectionRead)
def update_transportation_section_api(
    item_id: int,
    payload: TransportationSectionUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> TransportationSectionRead:
    item = get_transportation_section(db, item_id)
    if not item:
        raise _not_found()
    updated = update_transportation_section(db, item, payload.model_dump())
    return TransportationSectionRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
        transportation_company_id=updated.transportation_company_id,
    )


@router.delete("/transportation-sections/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transportation_section_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_transportation_section(db, item_id)
    if not item:
        raise _not_found()
    delete_transportation_section(db, item)


@router.get("/nps-stations", response_model=list[NpsStationRead])
def list_nps_stations_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NpsStationRead]:
    items = list_nps_stations(db)
    return [
        NpsStationRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
            transportation_section_id=item.transportation_section_id,
        )
        for item in items
    ]


@router.post("/nps-stations", response_model=NpsStationRead)
def create_nps_station_api(
    payload: NpsStationCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NpsStationRead:
    item = create_nps_station(db, payload.model_dump())
    return NpsStationRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.get("/nps-stations/{item_id}", response_model=NpsStationRead)
def get_nps_station_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NpsStationRead:
    item = get_nps_station(db, item_id)
    if not item:
        raise _not_found()
    return NpsStationRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.put("/nps-stations/{item_id}", response_model=NpsStationRead)
def update_nps_station_api(
    item_id: int,
    payload: NpsStationUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NpsStationRead:
    item = get_nps_station(db, item_id)
    if not item:
        raise _not_found()
    updated = update_nps_station(db, item, payload.model_dump())
    return NpsStationRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
        transportation_section_id=updated.transportation_section_id,
    )


@router.delete("/nps-stations/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_nps_station_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_nps_station(db, item_id)
    if not item:
        raise _not_found()
    delete_nps_station(db, item)


@router.get("/oil-fields", response_model=list[OilFieldRead])
def list_oil_fields_api(
    extraction_company_id: int | None = Query(default=None, alias="extractionCompanyId"),
    ngdu_id: int | None = Query(default=None, alias="ngduId"),
    db: Session = Depends(get_db),
) -> list[OilFieldRead]:
    items = list_oil_fields(db, extraction_company_id=extraction_company_id, ngdu_id=ngdu_id)
    return [
        OilFieldRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
            extraction_company_id=item.extraction_company_id,
            ngdu_id=item.ngdu_id,
        )
        for item in items
    ]


@router.post("/oil-fields", response_model=OilFieldRead)
def create_oil_field_api(
    payload: OilFieldCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> OilFieldRead:
    item = create_oil_field(db, payload.model_dump())
    return OilFieldRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        extraction_company_id=item.extraction_company_id,
        ngdu_id=item.ngdu_id,
    )


@router.get("/oil-fields/{item_id}", response_model=OilFieldRead)
def get_oil_field_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OilFieldRead:
    item = get_oil_field(db, item_id)
    if not item:
        raise _not_found()
    return OilFieldRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        extraction_company_id=item.extraction_company_id,
        ngdu_id=item.ngdu_id,
    )


@router.put("/oil-fields/{item_id}", response_model=OilFieldRead)
def update_oil_field_api(
    item_id: int,
    payload: OilFieldUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> OilFieldRead:
    item = get_oil_field(db, item_id)
    if not item:
        raise _not_found()
    updated = update_oil_field(db, item, payload.model_dump())
    return OilFieldRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
        extraction_company_id=updated.extraction_company_id,
        ngdu_id=updated.ngdu_id,
    )


@router.delete("/oil-fields/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_oil_field_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_oil_field(db, item_id)
    if not item:
        raise _not_found()
    delete_oil_field(db, item)


@router.get("/extraction-companies", response_model=list[ExtractionCompanyRead])
def list_extraction_companies_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ExtractionCompanyRead]:
    items = list_extraction_companies(db)
    return [
        ExtractionCompanyRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
        )
        for item in items
    ]


@router.post("/extraction-companies", response_model=ExtractionCompanyRead)
def create_extraction_company_api(
    payload: ExtractionCompanyCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ExtractionCompanyRead:
    item = create_extraction_company(db, payload.model_dump())
    return ExtractionCompanyRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
    )


@router.get("/extraction-companies/{item_id}", response_model=ExtractionCompanyRead)
def get_extraction_company_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExtractionCompanyRead:
    item = get_extraction_company(db, item_id)
    if not item:
        raise _not_found()
    return ExtractionCompanyRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
    )


@router.put("/extraction-companies/{item_id}", response_model=ExtractionCompanyRead)
def update_extraction_company_api(
    item_id: int,
    payload: ExtractionCompanyUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ExtractionCompanyRead:
    item = get_extraction_company(db, item_id)
    if not item:
        raise _not_found()
    updated = update_extraction_company(db, item, payload.model_dump())
    return ExtractionCompanyRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
    )


@router.delete("/extraction-companies/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_extraction_company_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_extraction_company(db, item_id)
    if not item:
        raise _not_found()
    delete_extraction_company(db, item)


@router.get("/transportation-companies", response_model=list[TransportationCompanyRead])
def list_transportation_companies_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TransportationCompanyRead]:
    items = list_transportation_companies(db)
    return [
        TransportationCompanyRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
        )
        for item in items
    ]


@router.post("/transportation-companies", response_model=TransportationCompanyRead)
def create_transportation_company_api(
    payload: TransportationCompanyCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> TransportationCompanyRead:
    item = create_transportation_company(db, payload.model_dump())
    return TransportationCompanyRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
    )


@router.get("/transportation-companies/{item_id}", response_model=TransportationCompanyRead)
def get_transportation_company_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransportationCompanyRead:
    item = get_transportation_company(db, item_id)
    if not item:
        raise _not_found()
    return TransportationCompanyRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
    )


@router.put("/transportation-companies/{item_id}", response_model=TransportationCompanyRead)
def update_transportation_company_api(
    item_id: int,
    payload: TransportationCompanyUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> TransportationCompanyRead:
    item = get_transportation_company(db, item_id)
    if not item:
        raise _not_found()
    updated = update_transportation_company(db, item, payload.model_dump())
    return TransportationCompanyRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
    )


@router.delete("/transportation-companies/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transportation_company_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_transportation_company(db, item_id)
    if not item:
        raise _not_found()
    delete_transportation_company(db, item)


@router.get("/export-destinations", response_model=list[ExportDestinationRead])
def list_export_destinations_api(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ExportDestinationRead]:
    items = list_export_destinations(db)
    return [
        ExportDestinationRead(
            id=item.id,
            code=item.code,
            name=item.name,
            short_name=item.short_name,
            capacity=item.capacity,
            current_month=item.current_month,
            current_day=item.current_day,
            region=item.region,
            status=item.status,
            transportation_section_id=item.transportation_section_id,
        )
        for item in items
    ]


@router.post("/export-destinations", response_model=ExportDestinationRead)
def create_export_destination_api(
    payload: ExportDestinationCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ExportDestinationRead:
    item = create_export_destination(db, payload.model_dump())
    return ExportDestinationRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.get("/export-destinations/{item_id}", response_model=ExportDestinationRead)
def get_export_destination_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExportDestinationRead:
    item = get_export_destination(db, item_id)
    if not item:
        raise _not_found()
    return ExportDestinationRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        capacity=item.capacity,
        current_month=item.current_month,
        current_day=item.current_day,
        region=item.region,
        status=item.status,
        transportation_section_id=item.transportation_section_id,
    )


@router.put("/export-destinations/{item_id}", response_model=ExportDestinationRead)
def update_export_destination_api(
    item_id: int,
    payload: ExportDestinationUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> ExportDestinationRead:
    item = get_export_destination(db, item_id)
    if not item:
        raise _not_found()
    updated = update_export_destination(db, item, payload.model_dump())
    return ExportDestinationRead(
        id=updated.id,
        code=updated.code,
        name=updated.name,
        short_name=updated.short_name,
        capacity=updated.capacity,
        current_month=updated.current_month,
        current_day=updated.current_day,
        region=updated.region,
        status=updated.status,
        transportation_section_id=updated.transportation_section_id,
    )


@router.delete("/export-destinations/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_export_destination_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_export_destination(db, item_id)
    if not item:
        raise _not_found()
    delete_export_destination(db, item)


# ============================================================
# NGDU
# ============================================================


def _ngdu_read(item) -> NgduRead:
    return NgduRead(
        id=item.id,
        code=item.code,
        name=item.name,
        short_name=item.short_name,
        region=item.region,
        status=item.status,
        extraction_company_id=item.extraction_company_id,
    )


@router.get("/ngdus", response_model=list[NgduRead])
def list_ngdus_api(
    extraction_company_id: int | None = Query(default=None, alias="extractionCompanyId"),
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[NgduRead]:
    items = list_ngdus(db, extraction_company_id=extraction_company_id)
    return [_ngdu_read(i) for i in items]


@router.post("/ngdus", response_model=NgduRead)
def create_ngdu_api(
    payload: NgduCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NgduRead:
    item = create_ngdu(db, payload.model_dump())
    return _ngdu_read(item)


@router.get("/ngdus/{item_id}", response_model=NgduRead)
def get_ngdu_api(
    item_id: int,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NgduRead:
    item = get_ngdu(db, item_id)
    if not item:
        raise _not_found()
    return _ngdu_read(item)


@router.put("/ngdus/{item_id}", response_model=NgduRead)
def update_ngdu_api(
    item_id: int,
    payload: NgduUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> NgduRead:
    item = get_ngdu(db, item_id)
    if not item:
        raise _not_found()
    updated = update_ngdu(db, item, payload.model_dump())
    return _ngdu_read(updated)


@router.delete("/ngdus/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ngdu_api(
    item_id: int,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    item = get_ngdu(db, item_id)
    if not item:
        raise _not_found()
    delete_ngdu(db, item)
