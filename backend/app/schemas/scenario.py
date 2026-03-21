from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.digital_twin import StageInput


class ScenarioResultSummary(BaseModel):
    total_gap: float = Field(alias="totalGap")
    bottleneck: str
    utilization: float

    model_config = ConfigDict(populate_by_name=True)


class ScenarioBase(BaseModel):
    name: str
    description: str = ""
    status: Literal["draft", "running", "done"] = "draft"
    owner: str = ""
    approval_status: Literal["draft", "approved"] = Field(default="draft", alias="approvalStatus")
    comments: str = ""
    usd_kzt: float = Field(default=507, alias="usdKzt")
    oil_price_kz: float = Field(default=70, alias="oilPriceKz")
    brent_price: float = Field(default=75, alias="brentPrice")
    kzt_inflation: float = Field(default=8, alias="kztInflation")
    stages: list[StageInput] | None = Field(default=None, alias="stages")

    model_config = ConfigDict(populate_by_name=True)


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(ScenarioBase):
    pass


class ScenarioRead(ScenarioBase):
    id: str
    created_at: str = Field(alias="createdAt")


class ScenarioWithResult(ScenarioRead):
    result: Optional[ScenarioResultSummary] = None
