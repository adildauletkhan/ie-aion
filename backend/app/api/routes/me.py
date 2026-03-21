from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserWorkspace
from app.models.company import Company
from app.models.master_data import ExtractionCompany
from app.schemas.workspace import SetActiveWorkspaceRequest, WorkspaceRead

router = APIRouter()


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Профиль текущего пользователя."""
    company_name = None
    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            company_name = company.name

    # Build workspaces list
    workspace_rows = (
        db.query(UserWorkspace)
        .filter(UserWorkspace.user_id == current_user.id)
        .all()
    )
    workspace_ids = {uw.extraction_company_id: uw.is_default for uw in workspace_rows}

    workspaces: list[dict] = []
    if workspace_ids:
        ec_list = (
            db.query(ExtractionCompany)
            .filter(ExtractionCompany.id.in_(workspace_ids.keys()))
            .all()
        )
        for ec in ec_list:
            workspaces.append(
                {
                    "id": ec.id,
                    "code": ec.code,
                    "name": ec.name,
                    "shortName": ec.short_name,
                    "workspaceScope": ec.workspace_scope,
                    "isDefault": workspace_ids.get(ec.id, False),
                }
            )

    active_workspace_id = current_user.active_workspace_id

    return {
        "username": current_user.username,
        "display_name": current_user.display_name,
        "email": current_user.email,
        "company_name": company_name,
        "workspaces": workspaces,
        "active_workspace_id": active_workspace_id,
    }


@router.put("/me/workspace", status_code=status.HTTP_200_OK)
def set_active_workspace(
    body: SetActiveWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Сохраняет активный workspace пользователя."""
    ec_id = body.extraction_company_id
    # Verify user has access to this workspace
    uw = (
        db.query(UserWorkspace)
        .filter(
            UserWorkspace.user_id == current_user.id,
            UserWorkspace.extraction_company_id == ec_id,
        )
        .first()
    )
    if not uw:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not available for this user",
        )
    current_user.active_workspace_id = ec_id
    db.commit()
    return {"active_workspace_id": ec_id}
