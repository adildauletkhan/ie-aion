"""API строительного домена (Фаза 1 + аутентификация бота из ПРОМПТА C).

Разделение аутентификации:
- Эндпоинты бота (active-tasks, journal POST, link/by-telegram, by-invite) —
  Depends(verify_bot_api_key) (заголовок X-Bot-Api-Key).
- Эндпоинты UI (проект, задачи, журнал GET, foremen/crews CRUD, таймлайн
  отклонений, спарклайн) — Depends(get_current_user) (Basic Auth).
Два механизма не смешиваются на одном эндпоинте.
"""

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_bot_api_key
from app.crud import construction as crud
from app.models.construction import Crew, DailyJournalEntry, Deviation, Foreman, ScheduleTask
from app.models.user import User
from app.schemas.construction import (
    ActiveTaskRead,
    CrewCreate,
    CrewRead,
    DailyJournalEntryRead,
    DeviationTimelineRead,
    ForemanCreate,
    ForemanRead,
    ForemanTelegramRead,
    JournalSubmitRequest,
    JournalSubmitResponse,
    LinkTelegramRequest,
    ManualJournalEntryCreate,
    ProgressCurveRead,
    ProjectRead,
    ScheduleTaskRead,
    SparklinePoint,
    ZonePlanFactRead,
)
from app.services import construction_journal

router = APIRouter(prefix="/construction")


# ==========================================================================
# Сериализаторы
# ==========================================================================


def _ff(value) -> float | None:
    return float(value) if value is not None else None


def _serialize_active_task(task: ScheduleTask) -> ActiveTaskRead:
    return ActiveTaskRead(
        task_id=task.task_id,
        wbs_code=task.wbs_code,
        name=task.name,
        zone=task.zone,
        phase_id=task.phase_id,
        planned_progress_pct=_ff(task.planned_progress_pct),
        status=task.status,
        responsible=task.responsible,
    )


def _serialize_task(task: ScheduleTask) -> ScheduleTaskRead:
    return ScheduleTaskRead(
        taskId=task.task_id,
        projectId=task.project_id,
        wbsCode=task.wbs_code,
        name=task.name,
        zone=task.zone,
        phaseId=task.phase_id,
        plannedProgressPct=_ff(task.planned_progress_pct),
        actualProgressPct=_ff(task.actual_progress_pct),
        status=task.status,
        responsible=task.responsible,
        planStart=task.plan_start,
        planFinish=task.plan_finish,
        factStart=task.fact_start,
        factFinish=task.fact_finish,
        pv=_ff(task.pv),
        ev=_ff(task.ev),
        ac=_ff(task.ac),
    )


def _serialize_foreman(f: Foreman, last_report: dt.date | None) -> ForemanRead:
    crew = f.crew
    return ForemanRead(
        foremanId=str(f.foreman_id),
        projectId=f.project_id,
        fullName=f.full_name,
        phone=f.phone,
        role=f.role,
        crewId=str(f.crew_id) if f.crew_id else None,
        crewName=crew.name if crew else None,
        contractorName=crew.contractor_name if crew else None,
        defaultZone=f.default_zone,
        telegramUserId=f.telegram_user_id,
        telegramLinkStatus=f.telegram_link_status,
        inviteCode=f.invite_code,
        active=f.active,
        lastReportDate=last_report,
        createdAt=f.created_at,
        updatedAt=f.updated_at,
    )


def _serialize_crew(c: Crew) -> CrewRead:
    return CrewRead(
        crewId=str(c.crew_id),
        projectId=c.project_id,
        name=c.name,
        contractorName=c.contractor_name,
        specialization=c.specialization,
        plannedHeadcount=c.planned_headcount,
    )


def _serialize_journal(entry: DailyJournalEntry) -> DailyJournalEntryRead:
    return DailyJournalEntryRead(
        entryId=str(entry.entry_id),
        projectId=entry.project_id,
        date=entry.date,
        zone=entry.zone,
        taskId=entry.task_id,
        workType=entry.work_type,
        planPct=_ff(entry.plan_pct),
        factPct=_ff(entry.fact_pct),
        deltaPct=_ff(entry.delta_pct),
        source=entry.source,
        authorForemanId=str(entry.author_foreman_id) if entry.author_foreman_id else None,
        authorUserId=entry.author_user_id,
        blockerType=entry.blocker_type,
        blockerDescription=entry.blocker_description,
        riskDelayDays=entry.risk_delay_days,
        riskSeverity=entry.risk_severity,
        responsible=entry.responsible,
        actions=entry.actions or [],
        rawTranscript=entry.raw_transcript,
        photos=entry.photos or [],
        confirmed=entry.confirmed,
        matchConfidence=entry.match_confidence,
        createdAt=entry.created_at,
    )


def _serialize_deviation(d: Deviation) -> DeviationTimelineRead:
    return DeviationTimelineRead(
        id=str(d.id),
        projectId=d.project_id,
        taskId=d.task_id,
        zone=d.zone,
        kind=d.kind,
        severity=d.severity,
        deltaPct=_ff(d.delta_pct),
        description=d.description,
        detectedAt=d.detected_at,
        resolvedAt=d.resolved_at,
    )


def _require_project(db: Session, project_id: str):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


# ==========================================================================
# BOT-FACING (X-Bot-Api-Key)
# ==========================================================================


@router.get(
    "/projects/{project_id}/active-tasks",
    response_model=list[ActiveTaskRead],
    dependencies=[Depends(verify_bot_api_key)],
)
def get_active_tasks(project_id: str, db: Session = Depends(get_db)) -> list[ActiveTaskRead]:
    _require_project(db, project_id)
    return [_serialize_active_task(t) for t in crud.list_active_tasks(db, project_id)]


@router.post(
    "/projects/{project_id}/journal",
    response_model=JournalSubmitResponse,
    dependencies=[Depends(verify_bot_api_key)],
)
def submit_journal(
    project_id: str,
    payload: JournalSubmitRequest,
    db: Session = Depends(get_db),
) -> JournalSubmitResponse:
    _require_project(db, project_id)
    try:
        summary = construction_journal.apply_journal(db, project_id, payload)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return JournalSubmitResponse(**summary)


@router.get(
    "/foremen/by-telegram/{telegram_user_id}",
    response_model=ForemanTelegramRead,
    dependencies=[Depends(verify_bot_api_key)],
)
def foreman_by_telegram(telegram_user_id: int, db: Session = Depends(get_db)) -> ForemanTelegramRead:
    f = crud.get_foreman_by_telegram(db, telegram_user_id)
    if f is None or f.telegram_link_status != "linked":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foreman not linked")
    return ForemanTelegramRead(
        foreman_id=str(f.foreman_id),
        project_id=f.project_id,
        full_name=f.full_name,
        default_zone=f.default_zone,
        telegram_link_status=f.telegram_link_status,
        role=f.role,
    )


@router.get(
    "/foremen/by-invite/{invite_code}",
    response_model=ForemanTelegramRead,
    dependencies=[Depends(verify_bot_api_key)],
)
def foreman_by_invite(invite_code: str, db: Session = Depends(get_db)) -> ForemanTelegramRead:
    """Для бота: найти бригадира по коду приглашения перед link-telegram."""
    f = crud.get_foreman_by_invite_code(db, invite_code)
    if f is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite code not found")
    return ForemanTelegramRead(
        foreman_id=str(f.foreman_id),
        project_id=f.project_id,
        full_name=f.full_name,
        default_zone=f.default_zone,
        telegram_link_status=f.telegram_link_status,
        role=f.role,
    )


@router.post(
    "/foremen/{foreman_id}/link-telegram",
    response_model=ForemanTelegramRead,
    dependencies=[Depends(verify_bot_api_key)],
)
def link_telegram(
    foreman_id: uuid.UUID,
    payload: LinkTelegramRequest,
    db: Session = Depends(get_db),
) -> ForemanTelegramRead:
    f = crud.get_foreman(db, foreman_id)
    if f is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foreman not found")

    # Идемпотентность: тот же telegram_user_id уже привязан к этому бригадиру.
    if f.telegram_link_status == "linked" and f.telegram_user_id == payload.telegram_user_id:
        return _telegram_read(f)

    if not f.invite_code or f.invite_code != payload.invite_code:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invite code invalid or already used")

    existing = crud.get_foreman_by_telegram(db, payload.telegram_user_id)
    if existing is not None and existing.foreman_id != f.foreman_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Telegram account is already linked to another foreman",
        )

    f.telegram_user_id = payload.telegram_user_id
    f.telegram_link_status = "linked"
    f.invite_code = None  # код одноразовый
    f.updated_at = dt.datetime.utcnow()
    db.commit()
    db.refresh(f)
    return _telegram_read(f)


def _telegram_read(f: Foreman) -> ForemanTelegramRead:
    return ForemanTelegramRead(
        foreman_id=str(f.foreman_id),
        project_id=f.project_id,
        full_name=f.full_name,
        default_zone=f.default_zone,
        telegram_link_status=f.telegram_link_status,
        role=f.role,
    )


# ==========================================================================
# UI-FACING (Basic Auth)
# ==========================================================================


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProjectRead:
    p = _require_project(db, project_id)
    return ProjectRead(
        projectId=p.project_id,
        name=p.name,
        developer=p.developer,
        bac=_ff(p.bac),
        dataDate=p.data_date,
        planStart=p.plan_start,
        planFinish=p.plan_finish,
        factStart=p.fact_start,
    )


@router.get("/projects/{project_id}/tasks", response_model=list[ScheduleTaskRead])
def list_tasks(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ScheduleTaskRead]:
    _require_project(db, project_id)
    return [_serialize_task(t) for t in crud.list_tasks(db, project_id)]


@router.get("/projects/{project_id}/zone-plan-fact", response_model=list[ZonePlanFactRead])
def list_zone_plan_fact(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ZonePlanFactRead]:
    _require_project(db, project_id)
    return [
        ZonePlanFactRead(
            id=str(z.id),
            projectId=z.project_id,
            zone=z.zone,
            date=z.date,
            planPct=_ff(z.plan_pct),
            factPct=_ff(z.fact_pct),
            lagDays=z.lag_days,
        )
        for z in crud.list_zone_plan_fact(db, project_id)
    ]


@router.get("/projects/{project_id}/progress-curve", response_model=list[ProgressCurveRead])
def list_progress_curve(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ProgressCurveRead]:
    _require_project(db, project_id)
    return [
        ProgressCurveRead(date=p.date, pv=_ff(p.pv), ev=_ff(p.ev), ac=_ff(p.ac))
        for p in crud.list_progress_curve(db, project_id)
    ]


@router.get("/projects/{project_id}/deviations-timeline", response_model=list[DeviationTimelineRead])
def deviations_timeline(
    project_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DeviationTimelineRead]:
    _require_project(db, project_id)
    return [_serialize_deviation(d) for d in crud.list_deviations_timeline(db, project_id, limit)]


@router.get("/projects/{project_id}/progress-sparkline", response_model=list[SparklinePoint])
def progress_sparkline(
    project_id: str,
    days: int = Query(default=14, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SparklinePoint]:
    _require_project(db, project_id)
    return [SparklinePoint(date=p.date, ev=_ff(p.ev)) for p in crud.list_progress_sparkline(db, project_id, days)]


@router.get("/projects/{project_id}/foremen", response_model=list[ForemanRead])
def list_foremen(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ForemanRead]:
    _require_project(db, project_id)
    result = []
    for f in crud.list_foremen(db, project_id):
        result.append(_serialize_foreman(f, crud.last_report_date(db, f.foreman_id)))
    return result


@router.post("/projects/{project_id}/foremen", response_model=ForemanRead, status_code=status.HTTP_201_CREATED)
def create_foreman(
    project_id: str,
    payload: ForemanCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ForemanRead:
    _require_project(db, project_id)
    data = payload.model_dump(by_alias=False)
    f = crud.create_foreman(db, project_id, data)
    db.commit()
    db.refresh(f)
    return _serialize_foreman(f, None)


@router.get("/projects/{project_id}/crews", response_model=list[CrewRead])
def list_crews(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CrewRead]:
    _require_project(db, project_id)
    return [_serialize_crew(c) for c in crud.list_crews(db, project_id)]


@router.post("/projects/{project_id}/crews", response_model=CrewRead, status_code=status.HTTP_201_CREATED)
def create_crew(
    project_id: str,
    payload: CrewCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CrewRead:
    _require_project(db, project_id)
    c = crud.create_crew(db, project_id, payload.model_dump(by_alias=False))
    db.commit()
    db.refresh(c)
    return _serialize_crew(c)


@router.get("/projects/{project_id}/journal", response_model=list[DailyJournalEntryRead])
def list_journal(
    project_id: str,
    date_from: dt.date | None = Query(default=None),
    date_to: dt.date | None = Query(default=None),
    zone: str | None = Query(default=None),
    foreman_id: uuid.UUID | None = Query(default=None),
    confirmed_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DailyJournalEntryRead]:
    _require_project(db, project_id)
    entries = crud.list_journal(
        db,
        project_id,
        date_from=date_from,
        date_to=date_to,
        zone=zone,
        foreman_id=foreman_id,
        confirmed_only=confirmed_only,
        limit=limit,
        offset=offset,
    )
    return [_serialize_journal(e) for e in entries]


@router.post(
    "/projects/{project_id}/journal-manual",
    response_model=DailyJournalEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_manual_journal_entry(
    project_id: str,
    payload: ManualJournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailyJournalEntryRead:
    """Ручное добавление записи из UI (source=manual)."""
    _require_project(db, project_id)
    data = {
        "date": payload.date,
        "zone": payload.zone,
        "task_id": payload.task_id,
        "work_type": payload.work_type,
        "plan_pct": payload.plan_pct,
        "fact_pct": payload.fact_pct,
        "delta_pct": payload.delta_pct,
        "source": "manual",
        "author_user_id": current_user.id,
        "blocker_type": payload.blocker_type,
        "blocker_description": payload.blocker_description,
        "risk_delay_days": payload.risk_delay_days,
        "risk_severity": payload.risk_severity,
        "responsible": payload.responsible,
        "actions": payload.actions or [],
        "photos": [],
        "confirmed": payload.confirmed,
        "match_confidence": "manual",
    }
    entry = crud.create_journal_entry(db, project_id, data)

    # Ручная запись с привязкой к задаче тоже двигает факт и динамику.
    if payload.task_id and payload.fact_pct is not None:
        task = crud.get_task(db, payload.task_id)
        if task is not None:
            task.actual_progress_pct = payload.fact_pct
            if payload.zone:
                crud.upsert_zone_plan_fact(
                    db,
                    project_id=project_id,
                    zone=payload.zone,
                    date=payload.date,
                    plan_pct=payload.plan_pct,
                    fact_pct=payload.fact_pct,
                    lag_days=payload.risk_delay_days,
                )
            construction_journal.recalc_progress_curve(db, project_id, payload.date)

    db.commit()
    db.refresh(entry)
    return _serialize_journal(entry)
