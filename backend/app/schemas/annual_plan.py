from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AnnualPlanBase(BaseModel):
    name: str
    year: int
    status: Literal["draft", "approved"] = "draft"
    baseline_source: str = Field(default="master-data", alias="baselineSource")

    model_config = ConfigDict(populate_by_name=True)


class AnnualPlanCreate(AnnualPlanBase):
    pass


class AnnualPlanRead(AnnualPlanBase):
    id: str
    created_at: str = Field(alias="createdAt")


class AnnualPlanScenarioBase(BaseModel):
    name: str
    status: Literal["draft", "approved"] = "draft"


class AnnualPlanScenarioCreate(AnnualPlanScenarioBase):
    pass


class AnnualPlanScenarioRead(AnnualPlanScenarioBase):
    id: str
    plan_id: str = Field(alias="planId")
    created_at: str = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AnnualPlanLineBase(BaseModel):
    stage: Literal["UP", "MID", "DOWN", "EXPORT"]
    asset_type: str = Field(alias="assetType")
    asset_code: str = Field(alias="assetCode")
    asset_name: str = Field(alias="assetName")
    capacity: float
    monthly_plan: list[float] = Field(alias="monthlyPlan")
    notes: str = ""

    model_config = ConfigDict(populate_by_name=True)


class AnnualPlanLineUpdate(BaseModel):
    id: int
    monthly_plan: list[float] = Field(alias="monthlyPlan")
    notes: str = ""

    model_config = ConfigDict(populate_by_name=True)


class AnnualPlanLineRead(AnnualPlanLineBase):
    id: int


class AnnualPlanIssueRead(BaseModel):
    id: int
    severity: Literal["critical", "warning"]
    month: int
    stage: str
    asset_code: str | None = Field(default=None, alias="assetCode")
    message: str
    gap: float

    model_config = ConfigDict(populate_by_name=True)


class AnnualPlanValidationResult(BaseModel):
    bottleneck_stage: str = Field(alias="bottleneckStage")
    bottleneck_month: int = Field(alias="bottleneckMonth")
    issues: list[AnnualPlanIssueRead]

    model_config = ConfigDict(populate_by_name=True)
