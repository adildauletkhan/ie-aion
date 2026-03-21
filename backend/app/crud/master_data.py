from sqlalchemy.orm import Session

from app.models.master_data import (
    ExtractionCompany,
    ExportDestination,
    Ngdu,
    NpsStation,
    OilField,
    ProcessingPlant,
    TransportationCompany,
    TransportationSection,
)


def _list_items(db: Session, model) -> list:
    return db.query(model).order_by(model.id.asc()).all()


def _get_item(db: Session, model, item_id: int):
    return db.get(model, item_id)


def _create_item(db: Session, model, payload: dict):
    item = model(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _update_item(db: Session, item, payload: dict):
    for key, value in payload.items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _delete_item(db: Session, item) -> None:
    db.delete(item)
    db.commit()


def list_processing_plants(db: Session) -> list[ProcessingPlant]:
    return _list_items(db, ProcessingPlant)


def get_processing_plant(db: Session, item_id: int) -> ProcessingPlant | None:
    return _get_item(db, ProcessingPlant, item_id)


def create_processing_plant(db: Session, payload: dict) -> ProcessingPlant:
    return _create_item(db, ProcessingPlant, payload)


def update_processing_plant(db: Session, item: ProcessingPlant, payload: dict) -> ProcessingPlant:
    return _update_item(db, item, payload)


def delete_processing_plant(db: Session, item: ProcessingPlant) -> None:
    _delete_item(db, item)


def list_transportation_sections(db: Session) -> list[TransportationSection]:
    return _list_items(db, TransportationSection)


def get_transportation_section(db: Session, item_id: int) -> TransportationSection | None:
    return _get_item(db, TransportationSection, item_id)


def create_transportation_section(db: Session, payload: dict) -> TransportationSection:
    return _create_item(db, TransportationSection, payload)


def update_transportation_section(
    db: Session,
    item: TransportationSection,
    payload: dict,
) -> TransportationSection:
    return _update_item(db, item, payload)


def delete_transportation_section(db: Session, item: TransportationSection) -> None:
    _delete_item(db, item)


def list_nps_stations(db: Session) -> list[NpsStation]:
    return _list_items(db, NpsStation)


def get_nps_station(db: Session, item_id: int) -> NpsStation | None:
    return _get_item(db, NpsStation, item_id)


def create_nps_station(db: Session, payload: dict) -> NpsStation:
    return _create_item(db, NpsStation, payload)


def update_nps_station(db: Session, item: NpsStation, payload: dict) -> NpsStation:
    return _update_item(db, item, payload)


def delete_nps_station(db: Session, item: NpsStation) -> None:
    _delete_item(db, item)


def list_oil_fields(
    db: Session, extraction_company_id: int | None = None, ngdu_id: int | None = None
) -> list[OilField]:
    q = db.query(OilField)
    if extraction_company_id is not None:
        q = q.filter(OilField.extraction_company_id == extraction_company_id)
    if ngdu_id is not None:
        q = q.filter(OilField.ngdu_id == ngdu_id)
    return q.order_by(OilField.id.asc()).all()


def get_oil_field(db: Session, item_id: int) -> OilField | None:
    return _get_item(db, OilField, item_id)


def create_oil_field(db: Session, payload: dict) -> OilField:
    return _create_item(db, OilField, payload)


def update_oil_field(db: Session, item: OilField, payload: dict) -> OilField:
    return _update_item(db, item, payload)


def delete_oil_field(db: Session, item: OilField) -> None:
    _delete_item(db, item)


def list_extraction_companies(db: Session) -> list[ExtractionCompany]:
    return _list_items(db, ExtractionCompany)


def get_extraction_company(db: Session, item_id: int) -> ExtractionCompany | None:
    return _get_item(db, ExtractionCompany, item_id)


def create_extraction_company(db: Session, payload: dict) -> ExtractionCompany:
    return _create_item(db, ExtractionCompany, payload)


def update_extraction_company(
    db: Session,
    item: ExtractionCompany,
    payload: dict,
) -> ExtractionCompany:
    return _update_item(db, item, payload)


def delete_extraction_company(db: Session, item: ExtractionCompany) -> None:
    _delete_item(db, item)


def list_transportation_companies(db: Session) -> list[TransportationCompany]:
    return _list_items(db, TransportationCompany)


def get_transportation_company(db: Session, item_id: int) -> TransportationCompany | None:
    return _get_item(db, TransportationCompany, item_id)


def create_transportation_company(db: Session, payload: dict) -> TransportationCompany:
    return _create_item(db, TransportationCompany, payload)


def update_transportation_company(
    db: Session,
    item: TransportationCompany,
    payload: dict,
) -> TransportationCompany:
    return _update_item(db, item, payload)


def delete_transportation_company(db: Session, item: TransportationCompany) -> None:
    _delete_item(db, item)


def list_export_destinations(db: Session) -> list[ExportDestination]:
    return _list_items(db, ExportDestination)


def get_export_destination(db: Session, item_id: int) -> ExportDestination | None:
    return _get_item(db, ExportDestination, item_id)


def create_export_destination(db: Session, payload: dict) -> ExportDestination:
    return _create_item(db, ExportDestination, payload)


def update_export_destination(db: Session, item: ExportDestination, payload: dict) -> ExportDestination:
    return _update_item(db, item, payload)


def delete_export_destination(db: Session, item: ExportDestination) -> None:
    _delete_item(db, item)


# --- NGDU ---


def list_ngdus(db: Session, extraction_company_id: int | None = None) -> list[Ngdu]:
    q = db.query(Ngdu)
    if extraction_company_id is not None:
        q = q.filter(Ngdu.extraction_company_id == extraction_company_id)
    return q.order_by(Ngdu.id.asc()).all()


def get_ngdu(db: Session, item_id: int) -> Ngdu | None:
    return _get_item(db, Ngdu, item_id)


def create_ngdu(db: Session, payload: dict) -> Ngdu:
    return _create_item(db, Ngdu, payload)


def update_ngdu(db: Session, item: Ngdu, payload: dict) -> Ngdu:
    return _update_item(db, item, payload)


def delete_ngdu(db: Session, item: Ngdu) -> None:
    _delete_item(db, item)
