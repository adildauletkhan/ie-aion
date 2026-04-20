from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_admin
from app.core.security import hash_password
from app.crud import user as user_crud
from app.crud import role as role_crud
from app.crud import company as company_crud
from app.crud import user_activity_log as log_crud
from app.models.user import User, UserWorkspace
from app.models.master_data import ExtractionCompany
from app.schemas.admin import (
    UserRead,
    UserCreate,
    UserUpdate,
    RoleRead,
    RoleCreate,
    CompanyRead,
    CompanyCreate,
    CompanyUpdate,
    ActivityLogRead,
    SystemStatsResponse,
)

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


def _log(db: Session, user: User, action: str, details: str | None = None) -> None:
    log_crud.create(db, user_id=user.id, action=action, details=details)


# --- Users ---
@router.get("/users", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = user_crud.get_all(db)
    return [
        UserRead(
            id=u.id,
            username=u.username,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            display_name=u.display_name,
            email=u.email,
            company_id=u.company_id,
            company_name=u.company.name if u.company else None,
        )
        for u in users
    ]


@router.post("/users", response_model=UserRead)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_crud.get_by_username(db, body.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    user = user_crud.create_user(
        db,
        username=body.username,
        password=body.password,
        role=body.role,
        display_name=body.display_name,
        email=body.email,
        company_id=body.company_id,
    )
    _log(db, current_user, "user_created", f"username={body.username}")
    return UserRead(
        id=user.id,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        display_name=user.display_name,
        email=user.email,
        company_id=user.company_id,
        company_name=user.company.name if user.company else None,
    )


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updates = body.model_dump(exclude_unset=True, by_alias=False)
    updated = user_crud.update_user(db, user_id, **updates)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _log(db, current_user, "user_updated", f"user_id={user_id}")
    return UserRead(
        id=updated.id,
        username=updated.username,
        role=updated.role,
        is_active=updated.is_active,
        created_at=updated.created_at,
        display_name=updated.display_name,
        email=updated.email,
        company_id=updated.company_id,
        company_name=updated.company.name if updated.company else None,
    )


# --- Change user password ---
class ChangePasswordRequest(BaseModel):
    new_password: str


@router.post("/users/{user_id}/change-password", status_code=status.HTTP_200_OK)
def change_user_password(
    user_id: int,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пароль должен содержать минимум 6 символов")
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    _log(db, current_user, "password_changed", f"user_id={user_id} username={user.username}")
    return {"ok": True}


# --- User Workspace Access ---

class WorkspaceAssignment(BaseModel):
    extraction_company_id: int
    is_default: bool = False


@router.get("/workspaces")
def list_all_workspaces(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Список всех рабочих пространств (ExtractionCompany) для назначения пользователям."""
    companies = db.query(ExtractionCompany).order_by(ExtractionCompany.name).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "shortName": c.short_name,
            "workspaceScope": c.workspace_scope,
        }
        for c in companies
    ]


@router.get("/users/{user_id}/workspaces")
def get_user_workspaces(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Текущие рабочие пространства пользователя."""
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    rows = db.query(UserWorkspace).filter(UserWorkspace.user_id == user_id).all()
    return [{"extraction_company_id": r.extraction_company_id, "is_default": r.is_default} for r in rows]


@router.put("/users/{user_id}/workspaces", status_code=status.HTTP_200_OK)
def set_user_workspaces(
    user_id: int,
    assignments: list[WorkspaceAssignment],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Заменить список рабочих пространств пользователя (полная замена)."""
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete all existing
    db.query(UserWorkspace).filter(UserWorkspace.user_id == user_id).delete()

    # Ensure at most one default
    has_default = any(a.is_default for a in assignments)

    for idx, item in enumerate(assignments):
        is_def = item.is_default if has_default else (idx == 0 and len(assignments) > 0)
        db.add(UserWorkspace(
            user_id=user_id,
            extraction_company_id=item.extraction_company_id,
            is_default=is_def,
        ))

    # If active_workspace_id is no longer in the list, reset it
    valid_ids = {a.extraction_company_id for a in assignments}
    if user.active_workspace_id and user.active_workspace_id not in valid_ids:
        default_item = next((a for a in assignments if a.is_default), assignments[0] if assignments else None)
        user.active_workspace_id = default_item.extraction_company_id if default_item else None

    db.commit()
    _log(db, current_user, "user_workspaces_updated", f"user_id={user_id} count={len(assignments)}")
    return {"ok": True, "count": len(assignments)}


# --- Roles ---
@router.get("/roles", response_model=list[RoleRead])
def list_roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return role_crud.get_all(db)


@router.post("/roles", response_model=RoleRead)
def create_role(
    body: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if role_crud.get_by_name(db, body.name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role name already exists")
    role = role_crud.create(db, name=body.name)
    _log(db, current_user, "role_created", f"name={body.name}")
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not role_crud.delete(db, role_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _log(db, current_user, "role_deleted", f"role_id={role_id}")


# --- Companies ---
@router.get("/companies", response_model=list[CompanyRead])
def list_companies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    companies = company_crud.get_all(db)
    return [
        CompanyRead(
            id=c.id,
            name=c.name,
            code=c.code,
            is_active=c.is_active,
            created_at=c.created_at,
        )
        for c in companies
    ]


@router.post("/companies", response_model=CompanyRead)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if company_crud.get_by_code(db, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company code already exists")
    company = company_crud.create(db, name=body.name, code=body.code)
    _log(db, current_user, "company_created", f"code={body.code}")
    return CompanyRead(
        id=company.id,
        name=company.name,
        code=company.code,
        is_active=company.is_active,
        created_at=company.created_at,
    )


@router.patch("/companies/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = company_crud.update(
        db, company_id, name=body.name, code=body.code, is_active=body.is_active
    )
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _log(db, current_user, "company_updated", f"company_id={company_id}")
    return CompanyRead(
        id=company.id,
        name=company.name,
        code=company.code,
        is_active=company.is_active,
        created_at=company.created_at,
    )


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not company_crud.delete(db, company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _log(db, current_user, "company_deleted", f"company_id={company_id}")


# --- Activity logs ---
@router.get("/activity-logs", response_model=list[ActivityLogRead])
def list_activity_logs(
    limit: int = 500,
    user_id: int | None = None,
    action: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = log_crud.get_all(db, limit=limit, user_id=user_id, action=action)
    users = {u.id: u.username for u in user_crud.get_all(db)}
    return [
        ActivityLogRead(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            details=log.details,
            created_at=log.created_at,
            username=users.get(log.user_id),
        )
        for log in logs
    ]


# --- System stats ---
@router.get("/system-stats", response_model=SystemStatsResponse)
def system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dialect = db.get_bind().dialect.name if db.get_bind() else ""
    db_size_mb = 0.0
    if dialect == "postgresql":
        r = db.execute(text("SELECT pg_database_size(current_database())")).scalar()
        if r is not None:
            db_size_mb = round(r / (1024 * 1024), 2)
    elif dialect == "sqlite":
        r = db.execute(text("SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()")).scalar()
        if r is not None:
            db_size_mb = round(r / (1024 * 1024), 2)

    from app.models.user import User as UserModel
    from app.models.role import Role
    from app.models.company import Company
    from app.models.user_activity_log import UserActivityLog
    users_count = db.query(UserModel).count()
    roles_count = db.query(Role).count()
    companies_count = db.query(Company).count()
    activity_logs_count = db.query(UserActivityLog).count()

    return SystemStatsResponse(
        db_size_mb=db_size_mb,
        users_count=users_count,
        roles_count=roles_count,
        companies_count=companies_count,
        activity_logs_count=activity_logs_count,
    )
