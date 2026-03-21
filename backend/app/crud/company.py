from sqlalchemy.orm import Session

from app.models.company import Company


def get_all(db: Session) -> list[Company]:
    return db.query(Company).order_by(Company.name).all()


def get_by_id(db: Session, company_id: int) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def get_by_code(db: Session, code: str) -> Company | None:
    return db.query(Company).filter(Company.code == code).first()


def create(db: Session, name: str, code: str) -> Company:
    company = Company(name=name, code=code)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update(db: Session, company_id: int, *, name: str | None = None, code: str | None = None, is_active: bool | None = None) -> Company | None:
    company = get_by_id(db, company_id)
    if not company:
        return None
    if name is not None:
        company.name = name
    if code is not None:
        company.code = code
    if is_active is not None:
        company.is_active = is_active
    db.commit()
    db.refresh(company)
    return company


def delete(db: Session, company_id: int) -> bool:
    company = get_by_id(db, company_id)
    if not company:
        return False
    db.delete(company)
    db.commit()
    return True
