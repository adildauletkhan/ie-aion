from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    display_name: str | None = None
    email: str | None = None
    company_id: int | None = None
    company_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"
    display_name: str | None = None
    email: str | None = None
    company_id: int | None = None


class UserUpdate(BaseModel):
    is_active: bool | None = Field(default=None, alias="isActive")
    role: str | None = None
    display_name: str | None = Field(default=None, alias="displayName")
    email: str | None = None
    company_id: int | None = Field(default=None, alias="companyId")

    model_config = ConfigDict(populate_by_name=True)


class RoleRead(BaseModel):
    id: int
    name: str


class RoleCreate(BaseModel):
    name: str


class CompanyRead(BaseModel):
    id: int
    name: str
    code: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyCreate(BaseModel):
    name: str
    code: str


class CompanyUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ActivityLogRead(BaseModel):
    id: int
    user_id: int
    action: str
    details: str | None = None
    created_at: datetime
    username: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SystemStatsResponse(BaseModel):
    db_size_mb: float
    users_count: int
    roles_count: int
    companies_count: int
    activity_logs_count: int
