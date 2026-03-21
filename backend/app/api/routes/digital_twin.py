from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.digital_twin import ScenarioResult, StageInput
from app.services.digital_twin import run_scenario

router = APIRouter(prefix="/digital-twin")


@router.post("/run", response_model=ScenarioResult)
def run_digital_twin(
    stages: list[StageInput],
    _user=Depends(get_current_user),
) -> ScenarioResult:
    return run_scenario(stages)
