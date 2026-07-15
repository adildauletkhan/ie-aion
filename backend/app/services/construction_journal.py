"""Применение подтверждённого суточного отчёта к строительным данным.

Вызывается из POST /journal. Работает в рамках одной транзакции роутера
(коммит делает вызывающий код). Реализует логику из cursor-prompt-backend-phase1.md
(§4) и ie-aion-brigades-journal-dynamics-spec.md (§3.4, §4.2).
"""

import datetime as dt

from sqlalchemy.orm import Session

from app.crud import construction as crud
from app.models.construction import ScheduleTask
from app.schemas.construction import JournalEntryIn, JournalSubmitRequest

# Порог существенного отрицательного отклонения для создания Deviation.
DEVIATION_THRESHOLD_PCT = -10.0

# Сопоставление типа блокера (из речи) с видом отклонения (Deviation.kind).
_BLOCKER_TO_KIND = {
    "resource": "resource",
    "dependency": "dependency",
    "quality": "quality",
    "external": "external",
    "none": "schedule",
}

# Нормализация severity риска в severity отклонения.
_RISK_TO_SEVERITY = {
    "critical": "critical",
    "risk": "risk",
    "attention": "attention",
    "none": "risk",  # порог уже нарушен, поэтому минимум "risk"
}

_APPLICABLE_CONFIDENCE = ("high", "medium")


def _blocker_type(entry: JournalEntryIn) -> str:
    if entry.blocker and entry.blocker.type:
        return entry.blocker.type
    return "none"


def _risk_severity(entry: JournalEntryIn) -> str:
    if entry.risk and entry.risk.severity:
        return entry.risk.severity
    return "none"


def _entry_to_journal_data(
    entry: JournalEntryIn,
    report_date: dt.date,
    author_foreman_id: str | None,
    raw_quote: str | None,
    applied: bool,
) -> dict:
    blocker_type = _blocker_type(entry)
    risk_sev = _risk_severity(entry)
    return {
        "date": report_date,
        "zone": entry.zone,
        "task_id": entry.task_id if applied else None,
        "work_type": entry.work_type,
        "plan_pct": entry.plan_pct,
        "fact_pct": entry.fact_pct,
        "delta_pct": entry.delta_pct,
        "source": "voice",
        "author_foreman_id": author_foreman_id,
        "blocker_type": blocker_type if blocker_type != "none" else None,
        "blocker_description": entry.blocker.description if entry.blocker else None,
        "risk_delay_days": entry.risk.delay_days if entry.risk else None,
        "risk_severity": risk_sev if risk_sev != "none" else None,
        "responsible": entry.responsible,
        "actions": entry.recommended_actions or [],
        "raw_transcript": raw_quote,
        "photos": [],  # TODO: фото прикрепляются отдельным эндпоинтом позже
        "confirmed": applied,
        "match_confidence": entry.match_confidence,
    }


def apply_journal(db: Session, project_id: str, payload: JournalSubmitRequest) -> dict:
    report_date = payload.report_date
    author_foreman_id = payload.author_foreman_id
    raw_quote = payload.raw_quote

    applied_count = 0
    clarification_count = 0
    created_deviations = 0
    journal_entry_ids: list[str] = []

    for entry in payload.entries:
        confidence = (entry.match_confidence or "").lower()
        is_applicable = bool(entry.task_id) and confidence in _APPLICABLE_CONFIDENCE

        if is_applicable:
            task = crud.get_task(db, entry.task_id)
            if task is None:
                # task_id указан, но не найден в WBS — уходит в ручную верификацию
                is_applicable = False

        if is_applicable:
            task = crud.get_task(db, entry.task_id)
            # 1. Обновляем факт по задаче
            if entry.fact_pct is not None:
                task.actual_progress_pct = entry.fact_pct
                if task.fact_start is None and entry.fact_pct > 0:
                    task.fact_start = report_date
                if entry.fact_pct >= 100:
                    task.status = "done"
                    task.fact_finish = report_date
                elif task.status == "planned":
                    task.status = "in_progress"

            # 2. ZonePlanFact по захватке
            blocker_type = _blocker_type(entry)
            risk_sev = _risk_severity(entry)
            lag_days = entry.risk.delay_days if (entry.risk and risk_sev != "none") else None
            if entry.zone:
                crud.upsert_zone_plan_fact(
                    db,
                    project_id=project_id,
                    zone=entry.zone,
                    date=report_date,
                    plan_pct=entry.plan_pct,
                    fact_pct=entry.fact_pct,
                    lag_days=lag_days,
                )

            # 3. Deviation при существенном отставании или активном блокере
            delta = entry.delta_pct
            has_blocker = blocker_type != "none"
            if (delta is not None and delta <= DEVIATION_THRESHOLD_PCT) or has_blocker:
                crud.create_deviation(
                    db,
                    project_id=project_id,
                    zone=entry.zone,
                    kind=_BLOCKER_TO_KIND.get(blocker_type, "schedule"),
                    severity=_RISK_TO_SEVERITY.get(risk_sev, "risk"),
                    delta_pct=delta,
                    description=(entry.blocker.description if entry.blocker else None)
                    or (entry.risk.description if entry.risk else None),
                    task_id=entry.task_id,
                )
                created_deviations += 1

            journal_data = _entry_to_journal_data(
                entry, report_date, author_foreman_id, raw_quote, applied=True
            )
            created = crud.create_journal_entry(db, project_id, journal_data)
            journal_entry_ids.append(str(created.entry_id))
            applied_count += 1
        else:
            # unmatched / no_context / low confidence — в очередь ручной верификации ПТО
            journal_data = _entry_to_journal_data(
                entry, report_date, author_foreman_id, raw_quote, applied=False
            )
            created = crud.create_journal_entry(db, project_id, journal_data)
            journal_entry_ids.append(str(created.entry_id))
            clarification_count += 1

    # 4. Пересчёт точки S-кривой (EVM) на дату отчёта
    recalc_progress_curve(db, project_id, report_date)

    return {
        "applied_count": applied_count,
        "clarification_count": clarification_count,
        "created_deviations": created_deviations,
        "journal_entry_ids": journal_entry_ids,
        "message": (
            f"Применено {applied_count} записей, "
            f"{clarification_count} в очереди верификации, "
            f"создано отклонений: {created_deviations}."
        ),
    }


def recalc_progress_curve(db: Session, project_id: str, report_date: dt.date) -> None:
    """
    UPSERT точки ProgressCurvePoint на report_date по всем задачам проекта.

    EV = Σ budget * actual% / 100
    PV = Σ budget * planned% / 100 по задачам с plan_start <= report_date
    AC = Σ task.ac (если задан хотя бы у одной задачи), иначе None.

    budget(task) = task.pv, если задано, иначе planned_progress_pct как прокси-вес.
    TODO: для корректного EVM нужен реальный вес/стоимость задачи (см. CostItem в
          construction-overview.md §4) и источник фактических затрат (AC) из ERP/1С.
    """
    tasks = crud.list_tasks(db, project_id)

    ev_total = 0.0
    pv_total = 0.0
    ac_total = 0.0
    has_ac = False

    for task in tasks:
        budget = _task_budget(task)
        actual = float(task.actual_progress_pct or 0)
        planned = float(task.planned_progress_pct or 0)

        ev_total += budget * actual / 100.0

        if task.plan_start is None or task.plan_start <= report_date:
            pv_total += budget * planned / 100.0

        if task.ac is not None:
            has_ac = True
            ac_total += float(task.ac)

    crud.upsert_progress_curve_point(
        db,
        project_id=project_id,
        date=report_date,
        pv=round(pv_total, 2),
        ev=round(ev_total, 2),
        ac=round(ac_total, 2) if has_ac else None,
    )


def _task_budget(task: ScheduleTask) -> float:
    if task.pv is not None:
        return float(task.pv)
    return float(task.planned_progress_pct or 0)
