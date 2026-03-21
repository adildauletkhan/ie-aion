"""CRUD operations for Reservoir Twin"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.reservoir_twin import ReservoirHorizon, ReservoirFormation, ReservoirDrainageZone


# Horizons
def list_horizons(db: Session, oil_field_id: Optional[int] = None):
    query = db.query(ReservoirHorizon)
    if oil_field_id:
        query = query.filter(ReservoirHorizon.oil_field_id == oil_field_id)
    return query.all()


def get_horizon(db: Session, horizon_id: int):
    return db.query(ReservoirHorizon).filter(ReservoirHorizon.id == horizon_id).first()


def create_horizon(db: Session, **data):
    horizon = ReservoirHorizon(**data)
    db.add(horizon)
    db.commit()
    db.refresh(horizon)
    return horizon


# Formations
def list_formations(db: Session, oil_field_id: Optional[int] = None, horizon_id: Optional[int] = None):
    query = db.query(ReservoirFormation)
    if oil_field_id:
        query = query.filter(ReservoirFormation.oil_field_id == oil_field_id)
    if horizon_id:
        query = query.filter(ReservoirFormation.horizon_id == horizon_id)
    return query.all()


def get_formation(db: Session, formation_id: int):
    return db.query(ReservoirFormation).filter(ReservoirFormation.id == formation_id).first()


def create_formation(db: Session, **data):
    formation = ReservoirFormation(**data)
    db.add(formation)
    db.commit()
    db.refresh(formation)
    return formation


# Drainage Zones
def list_zones(db: Session, oil_field_id: Optional[int] = None, formation_id: Optional[int] = None):
    query = db.query(ReservoirDrainageZone)
    if oil_field_id:
        query = query.filter(ReservoirDrainageZone.oil_field_id == oil_field_id)
    if formation_id:
        query = query.filter(ReservoirDrainageZone.formation_id == formation_id)
    return query.all()


def get_zone(db: Session, zone_id: int):
    return db.query(ReservoirDrainageZone).filter(ReservoirDrainageZone.id == zone_id).first()


def create_zone(db: Session, **data):
    zone = ReservoirDrainageZone(**data)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone
