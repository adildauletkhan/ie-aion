"""CRUD-функции строительного домена (db: Session первым аргументом)."""

import datetime as dt
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.construction import (
    ConstructionProject,
    Crew,
    DailyJournalEntry,
    Deviation,
    Foreman,
    Phase,
    ProgressCurvePoint,
    ScheduleTask,
    ZonePlanFact,
)

# --------------------------------------------------------------------------
# Projects / tasks
# --------------------------------------------------------------------------


def get_project(db: Session, project_id: str) -> ConstructionProject | None:
    return db.get(ConstructionProject, project_id)


def list_tasks(db: Session, project_id: str) -> list[ScheduleTask]:
    stmt = (
        select(ScheduleTask)
        .where(ScheduleTask.project_id == project_id)
        .order_by(ScheduleTask.phase_id, ScheduleTask.wbs_code)
    )
    return list(db.scalars(stmt))


def list_active_tasks(db: Session, project_id: str) -> list[ScheduleTask]:
    stmt = (
        select(ScheduleTask)
        .where(
            ScheduleTask.project_id == project_id,
            ScheduleTask.status.in_(("in_progress", "planned")),
        )
        .order_by(ScheduleTask.phase_id, ScheduleTask.wbs_code)
    )
    return list(db.scalars(stmt))


def get_task(db: Session, task_id: str) -> ScheduleTask | None:
    return db.get(ScheduleTask, task_id)


def list_phases(db: Session, project_id: str) -> list[Phase]:
    stmt = select(Phase).where(Phase.project_id == project_id).order_by(Phase.phase_id)
    return list(db.scalars(stmt))


# --------------------------------------------------------------------------
# ZonePlanFact
# --------------------------------------------------------------------------


def upsert_zone_plan_fact(
    db: Session,
    project_id: str,
    zone: str,
    date: dt.date,
    plan_pct: float | None,
    fact_pct: float | None,
    lag_days: int | None,
) -> ZonePlanFact:
    stmt = select(ZonePlanFact).where(
        ZonePlanFact.project_id == project_id,
        ZonePlanFact.zone == zone,
        ZonePlanFact.date == date,
    )
    row = db.scalars(stmt).first()
    if row is None:
        row = ZonePlanFact(
            id=uuid.uuid4(),
            project_id=project_id,
            zone=zone,
            date=date,
        )
        db.add(row)
    if plan_pct is not None:
        row.plan_pct = plan_pct
    if fact_pct is not None:
        row.fact_pct = fact_pct
    if lag_days is not None:
        row.lag_days = lag_days
    row.updated_at = dt.datetime.utcnow()
    return row


def list_zone_plan_fact(db: Session, project_id: str) -> list[ZonePlanFact]:
    stmt = (
        select(ZonePlanFact)
        .where(ZonePlanFact.project_id == project_id)
        .order_by(ZonePlanFact.date.desc())
    )
    return list(db.scalars(stmt))


# --------------------------------------------------------------------------
# Deviations
# --------------------------------------------------------------------------


def create_deviation(
    db: Session,
    project_id: str,
    zone: str | None,
    kind: str,
    severity: str,
    delta_pct: float | None,
    description: str | None,
    task_id: str | None = None,
) -> Deviation:
    dev = Deviation(
        id=uuid.uuid4(),
        project_id=project_id,
        task_id=task_id,
        zone=zone,
        kind=kind,
        severity=severity,
        delta_pct=delta_pct,
        description=description,
        detected_at=dt.datetime.utcnow(),
    )
    db.add(dev)
    return dev


def list_deviations_timeline(db: Session, project_id: str, limit: int = 10) -> list[Deviation]:
    stmt = (
        select(Deviation)
        .where(Deviation.project_id == project_id)
        .order_by(Deviation.detected_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


# --------------------------------------------------------------------------
# ProgressCurvePoint
# --------------------------------------------------------------------------


def upsert_progress_curve_point(
    db: Session,
    project_id: str,
    date: dt.date,
    pv: float | None,
    ev: float | None,
    ac: float | None,
) -> ProgressCurvePoint:
    stmt = select(ProgressCurvePoint).where(
        ProgressCurvePoint.project_id == project_id,
        ProgressCurvePoint.date == date,
    )
    row = db.scalars(stmt).first()
    if row is None:
        row = ProgressCurvePoint(id=uuid.uuid4(), project_id=project_id, date=date)
        db.add(row)
    row.pv = pv
    row.ev = ev
    row.ac = ac
    return row


def list_progress_curve(db: Session, project_id: str) -> list[ProgressCurvePoint]:
    stmt = (
        select(ProgressCurvePoint)
        .where(ProgressCurvePoint.project_id == project_id)
        .order_by(ProgressCurvePoint.date)
    )
    return list(db.scalars(stmt))


def list_progress_sparkline(db: Session, project_id: str, days: int = 14) -> list[ProgressCurvePoint]:
    cutoff = dt.date.today() - dt.timedelta(days=days)
    stmt = (
        select(ProgressCurvePoint)
        .where(
            ProgressCurvePoint.project_id == project_id,
            ProgressCurvePoint.date >= cutoff,
        )
        .order_by(ProgressCurvePoint.date)
    )
    return list(db.scalars(stmt))


# --------------------------------------------------------------------------
# Crews / Foremen
# --------------------------------------------------------------------------


def list_crews(db: Session, project_id: str) -> list[Crew]:
    stmt = select(Crew).where(Crew.project_id == project_id).order_by(Crew.name)
    return list(db.scalars(stmt))


def create_crew(db: Session, project_id: str, data: dict) -> Crew:
    crew = Crew(crew_id=uuid.uuid4(), project_id=project_id, **data)
    db.add(crew)
    db.flush()
    return crew


def get_crew(db: Session, crew_id: uuid.UUID) -> Crew | None:
    return db.get(Crew, crew_id)


def list_foremen(db: Session, project_id: str) -> list[Foreman]:
    stmt = select(Foreman).where(Foreman.project_id == project_id).order_by(Foreman.full_name)
    return list(db.scalars(stmt))


def get_foreman(db: Session, foreman_id: uuid.UUID) -> Foreman | None:
    return db.get(Foreman, foreman_id)


def get_foreman_by_telegram(db: Session, telegram_user_id: int) -> Foreman | None:
    stmt = select(Foreman).where(Foreman.telegram_user_id == telegram_user_id)
    return db.scalars(stmt).first()


def get_foreman_by_invite_code(db: Session, invite_code: str) -> Foreman | None:
    stmt = select(Foreman).where(Foreman.invite_code == invite_code)
    return db.scalars(stmt).first()


def _generate_invite_code(db: Session) -> str:
    """Уникальный одноразовый код приглашения вида INV-XXXXXXXX."""
    for _ in range(10):
        code = "INV-" + secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8].upper()
        if get_foreman_by_invite_code(db, code) is None:
            return code
    return "INV-" + uuid.uuid4().hex[:10].upper()


def create_foreman(db: Session, project_id: str, data: dict) -> Foreman:
    payload = dict(data)
    crew_id = payload.pop("crew_id", None)
    if crew_id is not None and not isinstance(crew_id, uuid.UUID):
        crew_id = uuid.UUID(str(crew_id))
    # invite_code / telegram_link_status задаём явно — не даём payload их перетереть
    foreman = Foreman(
        foreman_id=uuid.uuid4(),
        project_id=project_id,
        invite_code=_generate_invite_code(db),
        telegram_link_status="invited",
        crew_id=crew_id,
        **payload,
    )
    db.add(foreman)
    db.flush()
    return foreman


def last_report_date(db: Session, foreman_id: uuid.UUID) -> dt.date | None:
    stmt = (
        select(DailyJournalEntry.date)
        .where(DailyJournalEntry.author_foreman_id == foreman_id)
        .order_by(DailyJournalEntry.date.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


# --------------------------------------------------------------------------
# Daily journal
# --------------------------------------------------------------------------


def list_journal(
    db: Session,
    project_id: str,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    zone: str | None = None,
    foreman_id: uuid.UUID | None = None,
    confirmed_only: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> list[DailyJournalEntry]:
    stmt = select(DailyJournalEntry).where(DailyJournalEntry.project_id == project_id)
    if date_from is not None:
        stmt = stmt.where(DailyJournalEntry.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(DailyJournalEntry.date <= date_to)
    if zone:
        stmt = stmt.where(DailyJournalEntry.zone == zone)
    if foreman_id is not None:
        stmt = stmt.where(DailyJournalEntry.author_foreman_id == foreman_id)
    if confirmed_only:
        stmt = stmt.where(DailyJournalEntry.confirmed.is_(True))
    stmt = stmt.order_by(DailyJournalEntry.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))


def create_journal_entry(db: Session, project_id: str, data: dict) -> DailyJournalEntry:
    entry = DailyJournalEntry(entry_id=uuid.uuid4(), project_id=project_id, **data)
    db.add(entry)
    db.flush()
    return entry
