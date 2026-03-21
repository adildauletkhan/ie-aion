from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.entity import list_entities
from app.schemas.entity import EntityRead

router = APIRouter(prefix="/entities")


@router.get("", response_model=list[EntityRead])
def list_all(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EntityRead]:
    entities = list_entities(db)
    return [
        EntityRead(
            id=entity.id,
            entity=entity.entity,
            type=entity.type,
            capacity=entity.capacity,
            gov_plan=entity.gov_plan,
            corp_plan=entity.corp_plan,
            region=entity.region,
            status=entity.status,
            processing_plant_id=entity.processing_plant_id,
            transportation_section_id=entity.transportation_section_id,
            nps_station_id=entity.nps_station_id,
            oil_field_id=entity.oil_field_id,
            extraction_company_id=entity.extraction_company_id,
            transportation_company_id=entity.transportation_company_id,
            processing_plant_code=entity.processing_plant.code if entity.processing_plant else None,
            transportation_section_code=entity.transportation_section.code if entity.transportation_section else None,
            nps_station_code=entity.nps_station.code if entity.nps_station else None,
            oil_field_code=entity.oil_field.code if entity.oil_field else None,
            extraction_company_code=entity.extraction_company.code if entity.extraction_company else None,
            transportation_company_code=entity.transportation_company.code if entity.transportation_company else None,
        )
        for entity in entities
    ]
