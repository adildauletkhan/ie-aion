"""Activity tracking endpoints — available to all authenticated users."""
import datetime as dt

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud import user_activity_log as log_crud
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.admin import ActivityLogRead

router = APIRouter(prefix="/activity")


class TrackEvent(BaseModel):
    action: str
    details: str | None = None


@router.post("/track", status_code=204)
def track_event(
    body: TrackEvent,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_crud.create(db, user_id=current_user.id, action=body.action, details=body.details)


@router.get("/logs", response_model=list[ActivityLogRead])
def list_logs(
    limit: int = Query(500, le=2000),
    user_id: int | None = Query(None),
    action: str | None = Query(None),
    date_from: dt.date | None = Query(None),
    date_to: dt.date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs visible to admins; regular users see only their own."""
    effective_user_id = user_id
    if current_user.role != "admin":
        effective_user_id = current_user.id

    logs = log_crud.get_all(db, limit=limit, user_id=effective_user_id, action=action, date_from=date_from, date_to=date_to)
    users = {u.id: u for u in user_crud.get_all(db)}
    return [
        ActivityLogRead(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            details=log.details,
            created_at=log.created_at,
            username=users.get(log.user_id, None) and users[log.user_id].username,
        )
        for log in logs
    ]


@router.get("/actions")
def list_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return log_crud.get_distinct_actions(db)


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        return {"error": "admin only"}
    stats = log_crud.get_stats(db)
    users = {u.id: u.username for u in user_crud.get_all(db)}
    for item in stats.get("top_users", []):
        item["username"] = users.get(item["user_id"], f"user#{item['user_id']}")
    return stats
