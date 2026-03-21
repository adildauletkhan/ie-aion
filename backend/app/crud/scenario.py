import datetime as dt
import uuid

from sqlalchemy.orm import Session

from app.models.scenario import Scenario
from app.models.scenario_result import ScenarioResult
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate


def list_scenarios(db: Session) -> list[Scenario]:
    return db.query(Scenario).order_by(Scenario.created_at.desc()).all()


def get_scenario(db: Session, scenario_id: uuid.UUID) -> Scenario | None:
    return db.query(Scenario).filter(Scenario.id == scenario_id).first()


def create_scenario(db: Session, data: ScenarioCreate) -> Scenario:
    stages = data.stages or []
    scenario = Scenario(
        name=data.name,
        description=data.description,
        status=data.status,
        owner=data.owner,
        approval_status=data.approval_status,
        comments=data.comments,
        usd_kzt=data.usd_kzt,
        oil_price_kz=data.oil_price_kz,
        brent_price=data.brent_price,
        kzt_inflation=data.kzt_inflation,
        created_at=dt.datetime.utcnow(),
        inputs=[stage.model_dump(by_alias=True) for stage in stages],
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def update_scenario(db: Session, scenario: Scenario, data: ScenarioUpdate) -> Scenario:
    scenario.name = data.name
    scenario.description = data.description
    scenario.status = data.status
    scenario.owner = data.owner
    scenario.approval_status = data.approval_status
    scenario.comments = data.comments
    scenario.usd_kzt = data.usd_kzt
    scenario.oil_price_kz = data.oil_price_kz
    scenario.brent_price = data.brent_price
    scenario.kzt_inflation = data.kzt_inflation
    if data.stages is not None:
        scenario.inputs = [stage.model_dump(by_alias=True) for stage in data.stages]
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def delete_scenario(db: Session, scenario: Scenario) -> None:
    db.delete(scenario)
    db.commit()


def upsert_result(
    db: Session,
    scenario: Scenario,
    total_gap: float,
    bottleneck: str,
    utilization: float,
) -> ScenarioResult:
    if scenario.result:
        scenario.result.total_gap = total_gap
        scenario.result.bottleneck = bottleneck
        scenario.result.utilization = utilization
        db.add(scenario.result)
    else:
        scenario.result = ScenarioResult(
            scenario_id=scenario.id,
            total_gap=total_gap,
            bottleneck=bottleneck,
            utilization=utilization,
        )
        db.add(scenario.result)
    scenario.status = "done"
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario.result
