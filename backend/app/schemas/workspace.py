from pydantic import BaseModel, ConfigDict, Field


class WorkspaceRead(BaseModel):
    """Workspace (extraction company) доступный пользователю."""

    id: int
    code: str
    name: str
    short_name: str | None = Field(default=None, alias="shortName")
    workspace_scope: str = Field(alias="workspaceScope")
    is_default: bool = Field(alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class NgduWithFields(BaseModel):
    id: int
    code: str
    name: str
    short_name: str | None = Field(default=None, alias="shortName")

    model_config = ConfigDict(populate_by_name=True)


class SetActiveWorkspaceRequest(BaseModel):
    extraction_company_id: int = Field(alias="extractionCompanyId")

    model_config = ConfigDict(populate_by_name=True)
