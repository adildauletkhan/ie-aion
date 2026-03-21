import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud import field_scheme as field_crud
from app.schemas.field_scheme import (
    CalculationResult,
    FieldObjectTypeRead,
    FieldSchemeCreate,
    FieldSchemeFullResponse,
    FieldSchemeRead,
    FieldSchemeUpdate,
    SchemeConnectionCreate,
    SchemeConnectionRead,
    SchemeConnectionUpdate,
    SchemeObjectCreate,
    SchemeObjectRead,
    SchemeObjectUpdate,
    ValidationResult,
)
from app.services.field_scheme_calculations import FlowBalanceCalculator

router = APIRouter(prefix="/field-schemes")


def _serialize_object_type(obj) -> FieldObjectTypeRead:
    return FieldObjectTypeRead(
        id=str(obj.id),
        code=obj.code,
        name=obj.name,
        category=obj.category,
        iconName=obj.icon_name,
        color=obj.color,
        defaultProperties=obj.default_properties,
    )


def _serialize_scheme(scheme) -> FieldSchemeRead:
    return FieldSchemeRead(
        id=str(scheme.id),
        oilFieldId=scheme.oil_field_id,
        name=scheme.name,
        description=scheme.description,
        isActive=scheme.is_active,
        isBaseline=scheme.is_baseline,
        canvasWidth=scheme.canvas_width,
        canvasHeight=scheme.canvas_height,
        zoomLevel=scheme.zoom_level,
        version=scheme.version,
        parentSchemeId=str(scheme.parent_scheme_id) if scheme.parent_scheme_id else None,
        createdBy=scheme.created_by,
        createdAt=scheme.created_at,
        updatedAt=scheme.updated_at,
    )


def _serialize_object(obj) -> SchemeObjectRead:
    return SchemeObjectRead(
        id=str(obj.id),
        schemeId=str(obj.scheme_id),
        objectTypeId=str(obj.object_type_id),
        objectCode=obj.object_code,
        objectName=obj.object_name,
        positionX=obj.position_x,
        positionY=obj.position_y,
        width=obj.width,
        height=obj.height,
        properties=obj.properties or {},
        color=obj.color,
        rotation=obj.rotation,
        linkedAssetType=obj.linked_asset_type,
        linkedAssetId=obj.linked_asset_id,
        notes=obj.notes,
        objectType=_serialize_object_type(obj.object_type),
        createdAt=obj.created_at,
        updatedAt=obj.updated_at,
    )


def _serialize_connection(conn) -> SchemeConnectionRead:
    return SchemeConnectionRead(
        id=str(conn.id),
        schemeId=str(conn.scheme_id),
        sourceObjectId=str(conn.source_object_id),
        targetObjectId=str(conn.target_object_id),
        connectionType=conn.connection_type,
        flowProperties=conn.flow_properties or {},
        color=conn.color,
        lineStyle=conn.line_style,
        lineWidth=conn.line_width,
        animated=conn.animated,
        pathPoints=conn.path_points,
        createdAt=conn.created_at,
    )


def _build_scheme_data(objects, connections) -> dict:
    return {
        "objects": [
            {
                "id": str(obj.id),
                "object_code": obj.object_code,
                "properties": obj.properties or {},
                "object_type": {
                    "code": obj.object_type.code,
                    "name": obj.object_type.name,
                },
            }
            for obj in objects
        ],
        "connections": [
            {
                "id": str(conn.id),
                "source_object_id": str(conn.source_object_id),
                "target_object_id": str(conn.target_object_id),
                "connection_type": conn.connection_type,
                "flow_properties": conn.flow_properties or {},
            }
            for conn in connections
        ],
    }


@router.get("/field-object-types", response_model=list[FieldObjectTypeRead])
def list_object_types(db: Session = Depends(get_db)) -> list[FieldObjectTypeRead]:
    field_crud.ensure_object_types(db)
    return [_serialize_object_type(obj) for obj in field_crud.list_object_types(db)]


@router.get("", response_model=list[FieldSchemeRead])
def list_schemes(
    oil_field_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[FieldSchemeRead]:
    return [_serialize_scheme(scheme) for scheme in field_crud.list_schemes(db, oil_field_id)]


@router.post("", response_model=FieldSchemeRead, status_code=status.HTTP_201_CREATED)
def create_scheme(payload: FieldSchemeCreate, db: Session = Depends(get_db)) -> FieldSchemeRead:
    scheme = field_crud.create_scheme(db, payload.model_dump(by_alias=False))
    return _serialize_scheme(scheme)


@router.get("/{scheme_id}", response_model=FieldSchemeFullResponse)
def get_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> FieldSchemeFullResponse:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    objects = field_crud.list_objects(db, scheme.id)
    connections = field_crud.list_connections(db, scheme.id)
    return FieldSchemeFullResponse(
        scheme=_serialize_scheme(scheme),
        objects=[_serialize_object(obj) for obj in objects],
        connections=[_serialize_connection(conn) for conn in connections],
    )


@router.put("/{scheme_id}", response_model=FieldSchemeRead)
def update_scheme(
    scheme_id: uuid.UUID,
    payload: FieldSchemeUpdate,
    db: Session = Depends(get_db),
) -> FieldSchemeRead:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    updated = field_crud.update_scheme(db, scheme, payload.model_dump(by_alias=False, exclude_unset=True))
    return _serialize_scheme(updated)


@router.delete("/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    field_crud.delete_scheme(db, scheme)


@router.get("/{scheme_id}/objects", response_model=list[SchemeObjectRead])
def list_objects(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> list[SchemeObjectRead]:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return [_serialize_object(obj) for obj in field_crud.list_objects(db, scheme.id)]


@router.post("/{scheme_id}/objects", response_model=SchemeObjectRead, status_code=status.HTTP_201_CREATED)
def create_object(
    scheme_id: uuid.UUID,
    payload: SchemeObjectCreate,
    db: Session = Depends(get_db),
) -> SchemeObjectRead:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    obj = field_crud.create_object(db, scheme.id, payload.model_dump(by_alias=False))
    return _serialize_object(obj)


@router.put("/{scheme_id}/objects/{obj_id}", response_model=SchemeObjectRead)
def update_object(
    scheme_id: uuid.UUID,
    obj_id: uuid.UUID,
    payload: SchemeObjectUpdate,
    db: Session = Depends(get_db),
) -> SchemeObjectRead:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    obj = field_crud.get_object(db, obj_id)
    if not obj or obj.scheme_id != scheme.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    updated = field_crud.update_object(db, obj, payload.model_dump(by_alias=False, exclude_unset=True))
    return _serialize_object(updated)


@router.delete("/{scheme_id}/objects/{obj_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_object(
    scheme_id: uuid.UUID,
    obj_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    obj = field_crud.get_object(db, obj_id)
    if not obj or obj.scheme_id != scheme.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    field_crud.delete_object(db, obj)


@router.get("/{scheme_id}/connections", response_model=list[SchemeConnectionRead])
def list_connections(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> list[SchemeConnectionRead]:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return [_serialize_connection(conn) for conn in field_crud.list_connections(db, scheme.id)]


@router.post("/{scheme_id}/connections", response_model=SchemeConnectionRead, status_code=status.HTTP_201_CREATED)
def create_connection(
    scheme_id: uuid.UUID,
    payload: SchemeConnectionCreate,
    db: Session = Depends(get_db),
) -> SchemeConnectionRead:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    conn = field_crud.create_connection(db, scheme.id, payload.model_dump(by_alias=False))
    return _serialize_connection(conn)


@router.put("/{scheme_id}/connections/{conn_id}", response_model=SchemeConnectionRead)
def update_connection(
    scheme_id: uuid.UUID,
    conn_id: uuid.UUID,
    payload: SchemeConnectionUpdate,
    db: Session = Depends(get_db),
) -> SchemeConnectionRead:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    conn = field_crud.get_connection(db, conn_id)
    if not conn or conn.scheme_id != scheme.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    updated = field_crud.update_connection(db, conn, payload.model_dump(by_alias=False, exclude_unset=True))
    return _serialize_connection(updated)


@router.delete("/{scheme_id}/connections/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    scheme_id: uuid.UUID,
    conn_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    conn = field_crud.get_connection(db, conn_id)
    if not conn or conn.scheme_id != scheme.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    field_crud.delete_connection(db, conn)


@router.post("/{scheme_id}/validate", response_model=ValidationResult)
def validate_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> ValidationResult:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    objects = field_crud.list_objects(db, scheme.id)
    connections = field_crud.list_connections(db, scheme.id)
    calculator = FlowBalanceCalculator(_build_scheme_data(objects, connections))
    result = calculator.calculate_flows()
    return ValidationResult(status=result["status"], messages=result["validation_messages"])


@router.post("/{scheme_id}/calculate", response_model=CalculationResult)
def calculate_scheme(scheme_id: uuid.UUID, db: Session = Depends(get_db)) -> CalculationResult:
    scheme = field_crud.get_scheme(db, scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    objects = field_crud.list_objects(db, scheme.id)
    connections = field_crud.list_connections(db, scheme.id)
    start = time.perf_counter()
    calculator = FlowBalanceCalculator(_build_scheme_data(objects, connections))
    result = calculator.calculate_flows()
    elapsed = int((time.perf_counter() - start) * 1000)
    return CalculationResult(
        calculationType="flow_balance",
        results={
            "node_flows": result["node_flows"],
            "bottlenecks": result["bottlenecks"],
        },
        validation=ValidationResult(status=result["status"], messages=result["validation_messages"]),
        executionTimeMs=elapsed,
    )
