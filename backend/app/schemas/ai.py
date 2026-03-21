from pydantic import BaseModel, Field


class AiSources(BaseModel):
    master_data: bool = Field(default=True, alias="masterData")
    geology: bool = Field(default=True)
    scenarios: bool = Field(default=True)
    annual_plans: bool = Field(default=True, alias="annualPlans")
    results: bool = Field(default=True)
    crisis: bool = Field(default=True)
    entities: bool = Field(default=True)

    model_config = {"populate_by_name": True}


class AiChatRequest(BaseModel):
    question: str
    sources: AiSources
    skip_direct_answer: bool = Field(default=False, alias="skipDirectAnswer")

    model_config = {"populate_by_name": True}


class AiChatResponse(BaseModel):
    answer: str
    used_sources: list[str] = Field(default_factory=list, alias="usedSources")

    model_config = {"populate_by_name": True}
