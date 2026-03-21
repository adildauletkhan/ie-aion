import datetime as dt

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user_activity_log import UserActivityLog


def create(db: Session, user_id: int, action: str, details: str | None = None) -> UserActivityLog:
    log = UserActivityLog(user_id=user_id, action=action, details=details)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_all(
    db: Session,
    limit: int = 500,
    user_id: int | None = None,
    action: str | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
) -> list[UserActivityLog]:
    q = db.query(UserActivityLog)
    if user_id is not None:
        q = q.filter(UserActivityLog.user_id == user_id)
    if action:
        q = q.filter(UserActivityLog.action == action)
    if date_from:
        q = q.filter(UserActivityLog.created_at >= dt.datetime.combine(date_from, dt.time.min))
    if date_to:
        q = q.filter(UserActivityLog.created_at <= dt.datetime.combine(date_to, dt.time.max))
    return q.order_by(UserActivityLog.created_at.desc()).limit(limit).all()


def get_distinct_actions(db: Session) -> list[str]:
    rows = db.query(UserActivityLog.action).distinct().all()
    return sorted([r[0] for r in rows])


def get_stats(db: Session) -> dict:
    """Aggregated stats for the activity dashboard."""
    today = dt.date.today()
    week_ago = today - dt.timedelta(days=7)

    total = db.query(func.count(UserActivityLog.id)).scalar() or 0
    today_count = (
        db.query(func.count(UserActivityLog.id))
        .filter(UserActivityLog.created_at >= dt.datetime.combine(today, dt.time.min))
        .scalar() or 0
    )
    week_count = (
        db.query(func.count(UserActivityLog.id))
        .filter(UserActivityLog.created_at >= dt.datetime.combine(week_ago, dt.time.min))
        .scalar() or 0
    )
    unique_users_today = (
        db.query(func.count(func.distinct(UserActivityLog.user_id)))
        .filter(UserActivityLog.created_at >= dt.datetime.combine(today, dt.time.min))
        .scalar() or 0
    )
    logins_today = (
        db.query(func.count(UserActivityLog.id))
        .filter(
            UserActivityLog.action == "login",
            UserActivityLog.created_at >= dt.datetime.combine(today, dt.time.min),
        )
        .scalar() or 0
    )

    # Top modules (last 30 days)
    thirty_days_ago = today - dt.timedelta(days=30)
    module_rows = (
        db.query(UserActivityLog.details, func.count(UserActivityLog.id).label("cnt"))
        .filter(
            UserActivityLog.action == "page_view",
            UserActivityLog.created_at >= dt.datetime.combine(thirty_days_ago, dt.time.min),
        )
        .group_by(UserActivityLog.details)
        .order_by(func.count(UserActivityLog.id).desc())
        .limit(10)
        .all()
    )
    top_modules = [{"module": r[0] or "unknown", "count": r[1]} for r in module_rows]

    # Top users (last 30 days)
    user_rows = (
        db.query(UserActivityLog.user_id, func.count(UserActivityLog.id).label("cnt"))
        .filter(UserActivityLog.created_at >= dt.datetime.combine(thirty_days_ago, dt.time.min))
        .group_by(UserActivityLog.user_id)
        .order_by(func.count(UserActivityLog.id).desc())
        .limit(10)
        .all()
    )
    top_users = [{"user_id": r[0], "count": r[1]} for r in user_rows]

    # Activity by day (last 14 days)
    daily_rows = (
        db.query(
            func.date(UserActivityLog.created_at).label("day"),
            func.count(UserActivityLog.id).label("cnt"),
        )
        .filter(UserActivityLog.created_at >= dt.datetime.combine(today - dt.timedelta(days=13), dt.time.min))
        .group_by(func.date(UserActivityLog.created_at))
        .order_by(func.date(UserActivityLog.created_at))
        .all()
    )
    daily = [{"date": str(r[0]), "count": r[1]} for r in daily_rows]

    return {
        "total": total,
        "today": today_count,
        "week": week_count,
        "unique_users_today": unique_users_today,
        "logins_today": logins_today,
        "top_modules": top_modules,
        "top_users": top_users,
        "daily": daily,
    }
