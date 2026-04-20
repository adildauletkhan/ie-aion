from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.user import User


def get_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def create_user(
    db: Session,
    username: str,
    password: str,
    role: str,
    *,
    display_name: str | None = None,
    email: str | None = None,
    company_id: int | None = None,
) -> User:
    user = User(
        username=username,
        hashed_password=hash_password(password),
        role=role,
        display_name=display_name,
        email=email,
        company_id=company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_admin(db: Session, username: str, password: str) -> User:
    existing = get_by_username(db, username)
    if existing:
        # Only enforce role; do NOT reset password (preserves manually changed passwords)
        if existing.role != "admin":
            existing.role = "admin"
            db.commit()
            db.refresh(existing)
        return existing
    return create_user(db, username=username, password=password, role="admin")


def get_all(db: Session) -> list[User]:
    return db.query(User).options(joinedload(User.company)).order_by(User.username).all()


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


_ALLOWED_UPDATE_FIELDS = {"is_active", "role", "display_name", "email", "company_id"}


def update_user(db: Session, user_id: int, **kwargs: object) -> User | None:
    user = get_by_id(db, user_id)
    if not user:
        return None
    for key in _ALLOWED_UPDATE_FIELDS:
        if key in kwargs:
            setattr(user, key, kwargs[key])
    db.commit()
    db.refresh(user)
    return user
