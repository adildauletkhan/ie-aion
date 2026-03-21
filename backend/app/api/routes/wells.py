from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.api.deps import get_db

router = APIRouter()


@router.get("/wells")
def list_wells(
    oil_field_id: Optional[int] = Query(None),
    formation_id: Optional[int] = Query(None),
    zone_id: Optional[int] = Query(None),
    well_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Получить список скважин с фильтрацией
    """
    query = """
        SELECT 
            w.id,
            w.name,
            w.oil_field_id AS "oilFieldId",
            w.formation_id AS "formationId",
            w.zone_id AS "zoneId",
            w.well_type AS "wellType",
            w.status,
            w.latitude,
            w.longitude,
            w.depth_current AS "depthCurrent",
            f.name AS "formationName",
            z.name AS "zoneName",
            of.name AS "oilFieldName"
        FROM wells w
        LEFT JOIN reservoir_formations f ON w.formation_id = f.id
        LEFT JOIN reservoir_drainage_zones z ON w.zone_id = z.id
        LEFT JOIN oil_fields of ON w.oil_field_id = of.id
        WHERE 1=1
    """
    
    params = {}
    
    if oil_field_id is not None:
        query += " AND w.oil_field_id = :oil_field_id"
        params['oil_field_id'] = oil_field_id
    
    if formation_id is not None:
        query += " AND w.formation_id = :formation_id"
        params['formation_id'] = formation_id
    
    if zone_id is not None:
        query += " AND w.zone_id = :zone_id"
        params['zone_id'] = zone_id
    
    if well_type is not None:
        query += " AND w.well_type = :well_type"
        params['well_type'] = well_type
    
    query += " ORDER BY w.name"
    
    result = db.execute(text(query), params)
    rows = result.mappings().all()
    
    return [dict(row) for row in rows]


@router.get("/wells/{well_id}")
def get_well(
    well_id: int,
    db: Session = Depends(get_db),
):
    """
    Получить детали скважины
    """
    query = """
        SELECT 
            w.id,
            w.name,
            w.oil_field_id AS "oilFieldId",
            w.formation_id AS "formationId",
            w.zone_id AS "zoneId",
            w.well_type AS "wellType",
            w.status,
            w.latitude,
            w.longitude,
            w.depth_current AS "depthCurrent",
            f.name AS "formationName",
            z.name AS "zoneName",
            of.name AS "oilFieldName"
        FROM wells w
        LEFT JOIN reservoir_formations f ON w.formation_id = f.id
        LEFT JOIN reservoir_drainage_zones z ON w.zone_id = z.id
        LEFT JOIN oil_fields of ON w.oil_field_id = of.id
        WHERE w.id = :well_id
    """
    
    result = db.execute(text(query), {'well_id': well_id})
    row = result.mappings().first()
    
    if not row:
        return {"detail": "Well not found"}, 404
    
    return dict(row)
