from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.entity import list_capacity_rows
from app.schemas.entity import CapacityRow

router = APIRouter(prefix="/capacity")


@router.get("", response_model=list[CapacityRow])
def list_capacity(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CapacityRow]:
    entities = list_capacity_rows(db)
    return [
        CapacityRow(
            entity=entity.entity,
            capacity=entity.capacity,
            gov_plan=entity.gov_plan,
            corp_plan=entity.corp_plan,
        )
        for entity in entities
    ]
