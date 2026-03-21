import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.scenario import create_scenario, delete_scenario, get_scenario, list_scenarios, update_scenario, upsert_result
from app.schemas.digital_twin import StageInput
from app.schemas.scenario import ScenarioCreate, ScenarioResultSummary, ScenarioUpdate, ScenarioWithResult
from app.services.digital_twin import run_scenario

router = APIRouter(prefix="/scenarios")


def serialize_scenario(scenario) -> ScenarioWithResult:
    result = None
    if scenario.result:
        result = ScenarioResultSummary(
            total_gap=scenario.result.total_gap,
            bottleneck=scenario.result.bottleneck,
            utilization=scenario.result.utilization,
        )
    stages = scenario.inputs or []
    return ScenarioWithResult(
        id=str(scenario.id),
        name=scenario.name,
        description=scenario.description,
        status=scenario.status,
        owner=scenario.owner,
        approval_status=scenario.approval_status,
        comments=scenario.comments,
        usd_kzt=scenario.usd_kzt,
        oil_price_kz=scenario.oil_price_kz,
        brent_price=scenario.brent_price,
        kzt_inflation=scenario.kzt_inflation,
        created_at=scenario.created_at.date().isoformat(),
        stages=stages,
        result=result,
    )


@router.get("", response_model=list[ScenarioWithResult])
def list_all(
    db: Session = Depends(get_db),
) -> list[ScenarioWithResult]:
    return [serialize_scenario(scenario) for scenario in list_scenarios(db)]


@router.post("", response_model=ScenarioWithResult)
def create(
    payload: ScenarioCreate,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioWithResult:
    scenario = create_scenario(db, payload)
    return serialize_scenario(scenario)


@router.get("/{scenario_id}", response_model=ScenarioWithResult)
def get_one(
    scenario_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ScenarioWithResult:
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return serialize_scenario(scenario)


@router.put("/{scenario_id}", response_model=ScenarioWithResult)
def update(
    scenario_id: uuid.UUID,
    payload: ScenarioUpdate,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioWithResult:
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    scenario = update_scenario(db, scenario, payload)
    return serialize_scenario(scenario)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    scenario_id: uuid.UUID,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    delete_scenario(db, scenario)


@router.post("/{scenario_id}/run", response_model=ScenarioWithResult)
def run(
    scenario_id: uuid.UUID,
    stages: list[StageInput] | None = None,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioWithResult:
    scenario = get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    scenario_stages = stages or scenario.inputs or []
    if not scenario_stages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario stages are empty")
    result = run_scenario(scenario_stages)
    utilization = max((row.utilization for row in result.stages), default=0)
    upsert_result(
        db,
        scenario,
        total_gap=result.gap,
        bottleneck=result.bottleneck_label,
        utilization=utilization,
    )
    return serialize_scenario(scenario)
