"""API routes for Reservoir Twin"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db
from app import crud

router = APIRouter(prefix="/reservoir-twin", tags=["reservoir-twin"])


@router.get("/horizons")
def list_horizons(oil_field_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    horizons = crud.reservoir_twin.list_horizons(db, oil_field_id=oil_field_id)
    return [
        {
            "id": h.id,
            "oilFieldId": h.oil_field_id,
            "name": h.name,
            "code": h.code,
            "depthTop": h.depth_top,
            "depthBottom": h.depth_bottom,
            "stratigraphicAge": h.stratigraphic_age,
            "lithology": h.lithology,
            "porosity": h.porosity,
            "permeability": h.permeability,
            "effectiveThickness": h.effective_thickness,
        }
        for h in horizons
    ]


@router.post("/horizons")
def create_horizon(data: dict, db: Session = Depends(get_db)):
    horizon = crud.reservoir_twin.create_horizon(db, **{
        "oil_field_id": data["oilFieldId"],
        "name": data["name"],
        "code": data["code"],
        "depth_top": data["depthTop"],
        "depth_bottom": data["depthBottom"],
        "stratigraphic_age": data.get("stratigraphicAge"),
        "lithology": data.get("lithology"),
        "porosity": data.get("porosity"),
        "permeability": data.get("permeability"),
        "effective_thickness": data.get("effectiveThickness"),
    })
    return {"id": horizon.id}


@router.get("/formations")
def list_formations(
    oil_field_id: Optional[int] = Query(None),
    horizon_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    formations = crud.reservoir_twin.list_formations(db, oil_field_id=oil_field_id, horizon_id=horizon_id)
    return [
        {
            "id": f.id,
            "horizonId": f.horizon_id,
            "code": f.code,
            "name": f.name,
            "area": f.area,
            "effectiveThickness": f.effective_thickness,
        }
        for f in formations
    ]


@router.post("/formations")
def create_formation(data: dict, db: Session = Depends(get_db)):
    formation = crud.reservoir_twin.create_formation(db, **{
        "oil_field_id": data["oilFieldId"],
        "horizon_id": data["horizonId"],
        "code": data["code"],
        "name": data["name"],
        "depth_top": data["depthTop"],
        "depth_bottom": data["depthBottom"],
        "area": data["area"],
        "average_thickness": data["averageThickness"],
        "effective_thickness": data["effectiveThickness"],
        "net_to_gross": data["netToGross"],
        "porosity": data["porosity"],
        "permeability": data["permeability"],
        "saturation_oil": data["saturationOil"],
        "saturation_water": data["saturationWater"],
        "saturation_gas": data.get("saturationGas"),
        "viscosity_oil": data["viscosityOil"],
        "density_oil": data["densityOil"],
        "formation_volume_factor": data.get("formationVolumeFactor"),
        "gas_oil_ratio": data.get("gasOilRatio"),
        "initial_pressure": data["initialPressure"],
        "initial_temperature": data["initialTemperature"],
        "reserves_geological": data["reservesGeological"],
        "reserves_recoverable": data["reservesRecoverable"],
        "recovery_factor": data.get("recoveryFactor"),
    })
    return {"id": formation.id}


@router.get("/zones")
def list_zones(
    oil_field_id: Optional[int] = Query(None),
    formation_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    zones = crud.reservoir_twin.list_zones(db, oil_field_id=oil_field_id, formation_id=formation_id)
    return [
        {
            "id": z.id,
            "formationId": z.formation_id,
            "code": z.code,
            "name": z.name,
            "geometryType": z.geometry_type,
            "currentKin": z.current_kin,
        }
        for z in zones
    ]


@router.post("/zones")
def create_zone(data: dict, db: Session = Depends(get_db)):
    zone = crud.reservoir_twin.create_zone(db, **{
        "oil_field_id": data["oilFieldId"],
        "formation_id": data["formationId"],
        "code": data["code"],
        "name": data["name"],
        "geometry_type": data["geometryType"],
        "geometry_radius": data.get("geometryRadius"),
        "geometry_polygon": data.get("geometryPolygon"),
        "current_state": data["currentState"],
        "current_pressure": data.get("currentPressure"),
        "current_production_rate": data.get("currentProductionRate"),
        "reserves_initial": data["reservesInitial"],
        "reserves_remaining": data["reservesRemaining"],
        "reserves_produced": data.get("reservesProduced"),
        "development_stage": data["developmentStage"],
        "current_kin": data["currentKin"],
        "target_kin": data.get("targetKin"),
    })
    return {"id": zone.id}
