import datetime as dt
import uuid

from sqlalchemy.orm import Session

from app.models.annual_plan import AnnualPlan, AnnualPlanLine, AnnualPlanScenario, AnnualPlanIssue
from app.schemas.annual_plan import AnnualPlanCreate, AnnualPlanScenarioCreate


def list_plans(db: Session) -> list[AnnualPlan]:
    return db.query(AnnualPlan).order_by(AnnualPlan.created_at.desc()).all()


def create_plan(db: Session, data: AnnualPlanCreate) -> AnnualPlan:
    plan = AnnualPlan(
        name=data.name,
        year=data.year,
        status=data.status,
        baseline_source=data.baseline_source,
        created_at=dt.datetime.utcnow(),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def get_plan(db: Session, plan_id: uuid.UUID) -> AnnualPlan | None:
    return db.query(AnnualPlan).filter(AnnualPlan.id == plan_id).first()


def list_scenarios(db: Session, plan_id: uuid.UUID) -> list[AnnualPlanScenario]:
    return db.query(AnnualPlanScenario).filter(AnnualPlanScenario.plan_id == plan_id).order_by(
        AnnualPlanScenario.created_at.desc()
    ).all()


def create_scenario(db: Session, plan: AnnualPlan, data: AnnualPlanScenarioCreate) -> AnnualPlanScenario:
    scenario = AnnualPlanScenario(
        plan_id=plan.id,
        name=data.name,
        status=data.status,
        created_at=dt.datetime.utcnow(),
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def get_scenario(db: Session, scenario_id: uuid.UUID) -> AnnualPlanScenario | None:
    return db.query(AnnualPlanScenario).filter(AnnualPlanScenario.id == scenario_id).first()


def list_lines(db: Session, scenario_id: uuid.UUID, stage: str | None = None) -> list[AnnualPlanLine]:
    query = db.query(AnnualPlanLine).filter(AnnualPlanLine.scenario_id == scenario_id)
    if stage:
        query = query.filter(AnnualPlanLine.stage == stage)
    return query.order_by(AnnualPlanLine.id.asc()).all()


def upsert_lines(db: Session, scenario_id: uuid.UUID, lines: list[dict]) -> None:
    for payload in lines:
        line = (
            db.query(AnnualPlanLine)
            .filter(AnnualPlanLine.id == payload["id"], AnnualPlanLine.scenario_id == scenario_id)
            .first()
        )
        if not line:
            continue
        line.monthly_plan = payload["monthly_plan"]
        line.notes = payload.get("notes", "")
        db.add(line)
    db.commit()


def clear_issues(db: Session, scenario_id: uuid.UUID) -> None:
    db.query(AnnualPlanIssue).filter(AnnualPlanIssue.scenario_id == scenario_id).delete()
    db.commit()


def add_issues(db: Session, scenario_id: uuid.UUID, issues: list[dict]) -> list[AnnualPlanIssue]:
    records = [AnnualPlanIssue(scenario_id=scenario_id, **issue) for issue in issues]
    db.add_all(records)
    db.commit()
    return records
