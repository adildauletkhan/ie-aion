import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FieldObjectTypeRead(BaseModel):
    id: str
    code: str
    name: str
    category: str | None = None
    icon_name: str | None = Field(default=None, alias="iconName")
    color: str | None = None
    default_properties: dict | None = Field(default=None, alias="defaultProperties")

    model_config = ConfigDict(populate_by_name=True)


class FieldSchemeBase(BaseModel):
    oil_field_id: int | None = Field(default=None, alias="oilFieldId")
    name: str
    description: str | None = None
    is_active: bool = Field(default=True, alias="isActive")
    is_baseline: bool = Field(default=False, alias="isBaseline")
    canvas_width: int = Field(default=2000, alias="canvasWidth")
    canvas_height: int = Field(default=1500, alias="canvasHeight")
    zoom_level: float = Field(default=1.0, alias="zoomLevel")

    model_config = ConfigDict(populate_by_name=True)


class FieldSchemeCreate(FieldSchemeBase):
    pass


class FieldSchemeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")
    is_baseline: bool | None = Field(default=None, alias="isBaseline")
    canvas_width: int | None = Field(default=None, alias="canvasWidth")
    canvas_height: int | None = Field(default=None, alias="canvasHeight")
    zoom_level: float | None = Field(default=None, alias="zoomLevel")

    model_config = ConfigDict(populate_by_name=True)


class FieldSchemeRead(FieldSchemeBase):
    id: str
    version: int
    parent_scheme_id: str | None = Field(default=None, alias="parentSchemeId")
    created_by: int | None = Field(default=None, alias="createdBy")
    created_at: dt.datetime = Field(alias="createdAt")
    updated_at: dt.datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class SchemeObjectBase(BaseModel):
    object_type_id: str = Field(alias="objectTypeId")
    object_code: str = Field(alias="objectCode")
    object_name: str | None = Field(default=None, alias="objectName")
    position_x: int = Field(alias="positionX")
    position_y: int = Field(alias="positionY")
    width: int = 120
    height: int = 80
    properties: dict[str, Any] = Field(default_factory=dict)
    color: str | None = None
    rotation: int = 0
    linked_asset_type: str | None = Field(default=None, alias="linkedAssetType")
    linked_asset_id: int | None = Field(default=None, alias="linkedAssetId")
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class SchemeObjectCreate(SchemeObjectBase):
    pass


class SchemeObjectUpdate(BaseModel):
    object_code: str | None = Field(default=None, alias="objectCode")
    object_name: str | None = Field(default=None, alias="objectName")
    position_x: int | None = Field(default=None, alias="positionX")
    position_y: int | None = Field(default=None, alias="positionY")
    width: int | None = None
    height: int | None = None
    properties: dict[str, Any] | None = None
    color: str | None = None
    rotation: int | None = None
    linked_asset_type: str | None = Field(default=None, alias="linkedAssetType")
    linked_asset_id: int | None = Field(default=None, alias="linkedAssetId")
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class SchemeObjectRead(SchemeObjectBase):
    id: str
    scheme_id: str = Field(alias="schemeId")
    object_type: FieldObjectTypeRead = Field(alias="objectType")
    created_at: dt.datetime = Field(alias="createdAt")
    updated_at: dt.datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class SchemeConnectionBase(BaseModel):
    source_object_id: str = Field(alias="sourceObjectId")
    target_object_id: str = Field(alias="targetObjectId")
    connection_type: str = Field(alias="connectionType")
    flow_properties: dict[str, Any] = Field(default_factory=dict, alias="flowProperties")
    color: str | None = None
    line_style: str = Field(default="solid", alias="lineStyle")
    line_width: int = Field(default=2, alias="lineWidth")
    animated: bool = False
    path_points: list[dict[str, int]] | None = Field(default=None, alias="pathPoints")

    model_config = ConfigDict(populate_by_name=True)


class SchemeConnectionCreate(SchemeConnectionBase):
    pass


class SchemeConnectionUpdate(BaseModel):
    connection_type: str | None = Field(default=None, alias="connectionType")
    flow_properties: dict[str, Any] | None = Field(default=None, alias="flowProperties")
    color: str | None = None
    line_style: str | None = Field(default=None, alias="lineStyle")
    line_width: int | None = Field(default=None, alias="lineWidth")
    animated: bool | None = None
    path_points: list[dict[str, int]] | None = Field(default=None, alias="pathPoints")

    model_config = ConfigDict(populate_by_name=True)


class SchemeConnectionRead(SchemeConnectionBase):
    id: str
    scheme_id: str = Field(alias="schemeId")
    created_at: dt.datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class FieldSchemeFullResponse(BaseModel):
    scheme: FieldSchemeRead
    objects: list[SchemeObjectRead]
    connections: list[SchemeConnectionRead]

    model_config = ConfigDict(populate_by_name=True)


class ValidationResult(BaseModel):
    status: str
    messages: list[dict[str, Any]]


class CalculationResult(BaseModel):
    calculation_type: str = Field(alias="calculationType")
    results: dict[str, Any]
    validation: ValidationResult
    execution_time_ms: int = Field(alias="executionTimeMs")

    model_config = ConfigDict(populate_by_name=True)
