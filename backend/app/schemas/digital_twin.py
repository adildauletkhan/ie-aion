from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StageInput(BaseModel):
    stage: Literal["UP", "MID", "DOWN", "EXPORT"]
    label: str
    capacity: float
    plan_corp: float = Field(alias="planCorp")
    plan_gov: float = Field(alias="planGov")

    model_config = ConfigDict(populate_by_name=True)


class StageResultRow(BaseModel):
    stage: str
    label: str
    capacity: float
    plan_gov: float = Field(alias="planGov")
    plan_corp: float = Field(alias="planCorp")
    total_plan: float = Field(alias="totalPlan")
    utilization: float
    status: Literal["green", "yellow", "red"]
    is_bottleneck: bool = Field(alias="isBottleneck")

    model_config = ConfigDict(populate_by_name=True)


class ScenarioResult(BaseModel):
    feasible_volume: float = Field(alias="feasibleVolume")
    bottleneck_stage: str = Field(alias="bottleneckStage")
    bottleneck_label: str = Field(alias="bottleneckLabel")
    gap: float
    stages: list[StageResultRow]

    model_config = ConfigDict(populate_by_name=True)
