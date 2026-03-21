import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.crud.annual_plan import (
    add_issues,
    clear_issues,
    create_plan,
    create_scenario,
    get_plan,
    get_scenario,
    list_lines,
    list_plans,
    list_scenarios,
    upsert_lines,
)
from app.schemas.annual_plan import (
    AnnualPlanCreate,
    AnnualPlanIssueRead,
    AnnualPlanLineRead,
    AnnualPlanLineUpdate,
    AnnualPlanRead,
    AnnualPlanScenarioCreate,
    AnnualPlanScenarioRead,
    AnnualPlanValidationResult,
)
from app.services.annual_planning import build_baseline_lines, validate_plan

router = APIRouter(prefix="/annual-plans")


def _serialize_plan(plan) -> AnnualPlanRead:
    return AnnualPlanRead(
        id=str(plan.id),
        name=plan.name,
        year=plan.year,
        status=plan.status,
        baseline_source=plan.baseline_source,
        created_at=plan.created_at.date().isoformat(),
    )


def _serialize_scenario(scenario) -> AnnualPlanScenarioRead:
    return AnnualPlanScenarioRead(
        id=str(scenario.id),
        plan_id=str(scenario.plan_id),
        name=scenario.name,
        status=scenario.status,
        created_at=scenario.created_at.date().isoformat(),
    )


@router.get("", response_model=list[AnnualPlanRead])
def list_all(
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnnualPlanRead]:
    return [_serialize_plan(plan) for plan in list_plans(db)]


@router.post("", response_model=AnnualPlanRead)
def create(
    payload: AnnualPlanCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> AnnualPlanRead:
    plan = create_plan(db, payload)
    baseline = AnnualPlanScenarioCreate(name="Baseline", status="draft")
    conservative = AnnualPlanScenarioCreate(name="Conservative", status="draft")
    aggressive = AnnualPlanScenarioCreate(name="Aggressive", status="draft")
    for scenario_payload in (baseline, conservative, aggressive):
        scenario = create_scenario(db, plan, scenario_payload)
        build_baseline_lines(db, scenario)
    return _serialize_plan(plan)


@router.get("/{plan_id}", response_model=AnnualPlanRead)
def get_one(
    plan_id: uuid.UUID,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnnualPlanRead:
    plan = get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return _serialize_plan(plan)


@router.get("/{plan_id}/scenarios", response_model=list[AnnualPlanScenarioRead])
def list_plan_scenarios(
    plan_id: uuid.UUID,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnnualPlanScenarioRead]:
    plan = get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return [_serialize_scenario(scenario) for scenario in list_scenarios(db, plan.id)]


@router.post("/{plan_id}/scenarios", response_model=AnnualPlanScenarioRead)
def create_plan_scenario(
    plan_id: uuid.UUID,
    payload: AnnualPlanScenarioCreate,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnnualPlanScenarioRead:
    plan = get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    scenario = create_scenario(db, plan, payload)
    build_baseline_lines(db, scenario)
    return _serialize_scenario(scenario)


@router.get("/{plan_id}/scenarios/{scenario_id}/lines", response_model=list[AnnualPlanLineRead])
def list_scenario_lines(
    plan_id: uuid.UUID,
    scenario_id: uuid.UUID,
    stage: str | None = None,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AnnualPlanLineRead]:
    scenario = get_scenario(db, scenario_id)
    if not scenario or str(scenario.plan_id) != str(plan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    lines = list_lines(db, scenario.id, stage)
    return [
        AnnualPlanLineRead(
            id=line.id,
            stage=line.stage,
            asset_type=line.asset_type,
            asset_code=line.asset_code,
            asset_name=line.asset_name,
            capacity=line.capacity,
            monthly_plan=line.monthly_plan,
            notes=line.notes,
        )
        for line in lines
    ]


@router.put("/{plan_id}/scenarios/{scenario_id}/lines", status_code=status.HTTP_204_NO_CONTENT)
def update_scenario_lines(
    plan_id: uuid.UUID,
    scenario_id: uuid.UUID,
    payload: list[AnnualPlanLineUpdate],
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    scenario = get_scenario(db, scenario_id)
    if not scenario or str(scenario.plan_id) != str(plan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    updates = [{"id": line.id, "monthly_plan": line.monthly_plan, "notes": line.notes} for line in payload]
    upsert_lines(db, scenario.id, updates)


@router.post("/{plan_id}/scenarios/{scenario_id}/validate", response_model=AnnualPlanValidationResult)
def validate_scenario(
    plan_id: uuid.UUID,
    scenario_id: uuid.UUID,
    _user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnnualPlanValidationResult:
    scenario = get_scenario(db, scenario_id)
    if not scenario or str(scenario.plan_id) != str(plan_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    lines = list_lines(db, scenario.id, None)
    issues_raw, bottleneck = validate_plan(lines)
    clear_issues(db, scenario.id)
    issues = add_issues(db, scenario.id, issues_raw)
    return AnnualPlanValidationResult(
        bottleneck_stage=bottleneck["stage"],
        bottleneck_month=bottleneck["month"],
        issues=[
            AnnualPlanIssueRead(
                id=issue.id,
                severity=issue.severity,
                month=issue.month,
                stage=issue.stage,
                asset_code=issue.asset_code,
                message=issue.message,
                gap=issue.gap,
            )
            for issue in issues
        ],
    )
