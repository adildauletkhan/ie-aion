from sqlalchemy.orm import Session

from app.models.role import Role


def get_all(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.name).all()


def get_by_name(db: Session, name: str) -> Role | None:
    return db.query(Role).filter(Role.name == name).first()


def create(db: Session, name: str) -> Role:
    role = Role(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def delete(db: Session, role_id: int) -> bool:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        return False
    db.delete(role)
    db.commit()
    return True
