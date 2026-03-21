from sqlalchemy.orm import Session

from app.models.entity import Entity


def list_entities(db: Session) -> list[Entity]:
    return db.query(Entity).order_by(Entity.id.asc()).all()


def list_capacity_rows(db: Session) -> list[Entity]:
    return db.query(Entity).filter(Entity.type == "Завод").order_by(Entity.id.asc()).all()
