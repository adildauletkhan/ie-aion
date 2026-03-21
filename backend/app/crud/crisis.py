import datetime as dt
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.crisis import (
    CrisisActionItem,
    CrisisEvent,
    CrisisExecutionMonitoring,
    CrisisExecutionPlan,
    CrisisImpactAnalysis,
    CrisisNotification,
    CrisisResponseScenario,
)


def create_event(db: Session, payload: dict) -> CrisisEvent:
    event = CrisisEvent(**payload)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events(db: Session) -> list[CrisisEvent]:
    return db.query(CrisisEvent).order_by(CrisisEvent.created_at.desc()).all()


def get_event(db: Session, event_id) -> CrisisEvent | None:
    return db.query(CrisisEvent).filter(CrisisEvent.id == event_id).first()


def update_event(db: Session, event: CrisisEvent, payload: dict) -> CrisisEvent:
    for key, value in payload.items():
        setattr(event, key, value)
    event.updated_at = dt.datetime.utcnow()
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def create_impact_analysis(db: Session, event_id, payload: dict) -> CrisisImpactAnalysis:
    analysis = CrisisImpactAnalysis(crisis_event_id=event_id, **payload)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def update_impact_analysis(db: Session, analysis: CrisisImpactAnalysis, payload: dict) -> CrisisImpactAnalysis:
    for key, value in payload.items():
        setattr(analysis, key, value)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def get_latest_analysis(db: Session, event_id) -> CrisisImpactAnalysis | None:
    return (
        db.query(CrisisImpactAnalysis)
        .filter(CrisisImpactAnalysis.crisis_event_id == event_id)
        .order_by(CrisisImpactAnalysis.analysis_run_at.desc())
        .first()
    )


def replace_response_scenarios(db: Session, event_id, scenarios: Iterable[dict]) -> list[CrisisResponseScenario]:
    db.query(CrisisResponseScenario).filter(CrisisResponseScenario.crisis_event_id == event_id).delete()
    created = [CrisisResponseScenario(crisis_event_id=event_id, **payload) for payload in scenarios]
    db.add_all(created)
    db.commit()
    for scenario in created:
        db.refresh(scenario)
    return created


def list_response_scenarios(db: Session, event_id) -> list[CrisisResponseScenario]:
    return (
        db.query(CrisisResponseScenario)
        .filter(CrisisResponseScenario.crisis_event_id == event_id)
        .order_by(CrisisResponseScenario.ai_ranking.asc().nulls_last())
        .all()
    )


def get_response_scenario(db: Session, scenario_id) -> CrisisResponseScenario | None:
    return db.query(CrisisResponseScenario).filter(CrisisResponseScenario.id == scenario_id).first()


def select_response_scenario(db: Session, scenario: CrisisResponseScenario, selected_by: str | None) -> CrisisResponseScenario:
    scenario.status = "selected"
    scenario.selected_by = selected_by
    scenario.selected_at = dt.datetime.utcnow()
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def create_execution_plan(db: Session, payload: dict) -> CrisisExecutionPlan:
    plan = CrisisExecutionPlan(**payload)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def list_execution_plans(db: Session, event_id) -> list[CrisisExecutionPlan]:
    return (
        db.query(CrisisExecutionPlan)
        .filter(CrisisExecutionPlan.crisis_event_id == event_id)
        .order_by(CrisisExecutionPlan.start_date.desc().nulls_last())
        .all()
    )


def add_action_items(db: Session, items: Iterable[dict]) -> list[CrisisActionItem]:
    created = [CrisisActionItem(**payload) for payload in items]
    db.add_all(created)
    db.commit()
    for item in created:
        db.refresh(item)
    return created


def list_action_items(db: Session, plan_id) -> list[CrisisActionItem]:
    return (
        db.query(CrisisActionItem)
        .filter(CrisisActionItem.execution_plan_id == plan_id)
        .order_by(CrisisActionItem.deadline.asc().nulls_last())
        .all()
    )


def get_action_item(db: Session, action_id) -> CrisisActionItem | None:
    return db.query(CrisisActionItem).filter(CrisisActionItem.id == action_id).first()


def update_action_item(db: Session, item: CrisisActionItem, payload: dict) -> CrisisActionItem:
    for key, value in payload.items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def add_monitoring_entry(db: Session, payload: dict) -> CrisisExecutionMonitoring:
    record = CrisisExecutionMonitoring(**payload)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_monitoring_entries(db: Session, plan_id) -> list[CrisisExecutionMonitoring]:
    return (
        db.query(CrisisExecutionMonitoring)
        .filter(CrisisExecutionMonitoring.execution_plan_id == plan_id)
        .order_by(CrisisExecutionMonitoring.recorded_at.desc())
        .all()
    )


def create_notification(db: Session, payload: dict) -> CrisisNotification:
    notification = CrisisNotification(**payload)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_notifications(db: Session, event_id) -> list[CrisisNotification]:
    return (
        db.query(CrisisNotification)
        .filter(CrisisNotification.crisis_event_id == event_id)
        .order_by(CrisisNotification.sent_at.desc())
        .all()
    )
