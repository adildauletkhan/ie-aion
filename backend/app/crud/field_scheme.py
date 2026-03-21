import datetime as dt

from sqlalchemy.orm import Session

from app.models.field_scheme import (
    FieldObjectType,
    FieldScheme,
    FieldSchemeConnection,
    FieldSchemeObject,
)

DEFAULT_OBJECT_TYPES = [
    ("production_well", "Добывающая скважина", "well", "well-icon", "#2563eb", {"debit_oil": 0, "debit_water": 0, "debit_gas": 0, "status": "active"}),
    ("injection_well", "Нагнетательная скважина", "well", "injection-well-icon", "#dc2626", {"injection_volume": 0, "pressure": 0, "status": "active"}),
    ("agzu", "АГЗУ", "equipment", "agzu-icon", "#059669", {"capacity": 0, "connected_wells": 0, "status": "operational"}),
    ("uppn", "УППН", "equipment", "uppn-icon", "#d97706", {"capacity": 0, "water_cut_in": 0, "water_cut_out": 0}),
    ("vpn", "ВПН", "equipment", "vpn-icon", "#0891b2", {"capacity": 0, "pressure": 0}),
    ("ppn", "ППН", "equipment", "ppn-icon", "#7c3aed", {"capacity": 0, "quality_out": 0}),
    ("kun", "КУН", "equipment", "kun-icon", "#db2777", {"pumps_count": 0, "total_power": 0}),
    ("rvs", "РВС", "storage", "rvs-icon", "#65a30d", {"volume": 0, "current_level": 0, "product_type": "oil"}),
    ("dns", "ДНС", "equipment", "dns-icon", "#ea580c", {"capacity": 0, "separation_stages": 3}),
    ("cps", "ЦПС", "equipment", "cps-icon", "#8b5cf6", {"capacity": 0, "inputs_count": 0}),
    ("separator", "Сепаратор", "equipment", "separator-icon", "#0d9488", {"pressure": 0, "temperature": 0}),
    ("pump", "Насос", "equipment", "pump-icon", "#0369a1", {"power": 0, "flow_rate": 0}),
    ("valve", "Задвижка", "valves", "valve-icon", "#475569", {"dn_mm": 0, "type": "шиберная", "drive": "ручной", "status": "open"}),
    ("ball_valve", "Кран шаровой", "valves", "ball-valve-icon", "#475569", {"dn_mm": 0, "drive": "ручной", "status": "open"}),
    ("check_valve", "Обратный клапан", "valves", "check-valve-icon", "#475569", {"dn_mm": 0, "status": "open"}),
    ("oil_pipeline", "Нефтепровод межпромысловый", "pipelines", "pipeline-icon", "#475569", {"diameter_mm": 0, "length_km": 0, "material": "", "pressure_atm": 0, "capacity_m3_per_day": 0}),
    ("water_pipeline", "Водовод (для закачки)", "pipelines", "pipeline-icon", "#475569", {"diameter_mm": 0, "length_km": 0, "pressure_atm": 0}),
    ("gas_pipeline", "Газопровод", "pipelines", "pipeline-icon", "#475569", {"diameter_mm": 0, "length_km": 0, "pressure_atm": 0, "gas_composition": ""}),
    ("product_pipeline", "Продуктопровод", "pipelines", "pipeline-icon", "#475569", {"diameter_mm": 0, "length_km": 0, "pressure_atm": 0}),
    ("collector", "Коллектор сборный", "pipelines", "collector-icon", "#475569", {"inputs_count": 0, "capacity": 0}),
    ("tap_in", "Точка врезки", "nodes", "tap-in-icon", "#475569", {"diameter_mm": 0, "pressure_atm": 0}),
    ("tee", "Тройник", "nodes", "tee-icon", "#475569", {"diameter_mm": 0}),
    ("reducer", "Переход (редукция диаметра)", "nodes", "reducer-icon", "#475569", {"from_diameter_mm": 0, "to_diameter_mm": 0}),
    ("shutoff_node", "Запорный узел", "nodes", "shutoff-node-icon", "#475569", {"dn_mm": 0, "status": "open"}),
    ("bpv", "БПВ (Блок подготовки воды)", "water_preparation", "bpv-icon", "#475569", {"capacity": 0, "turbidity": 0, "mechanical_impurities": 0}),
    ("water_treatment", "Очистные сооружения", "water_preparation", "water-treatment-icon", "#475569", {"capacity": 0}),
    ("wash_water_tank", "Резервуар промывочной воды", "water_preparation", "wash-water-tank-icon", "#475569", {"volume": 0, "current_level": 0}),
    ("gcs", "ГКС (Газокомпрессорная станция)", "gas_preparation", "gcs-icon", "#475569", {"capacity": 0, "compressors_count": 0, "discharge_pressure": 0}),
    ("ukpg", "УКПГ (Установка комплексной подготовки газа)", "gas_preparation", "ukpg-icon", "#475569", {"capacity": 0, "drying_degree": 0}),
    ("flare", "Факельная установка", "gas_preparation", "flare-icon", "#475569", {"flare_height": 0, "burn_capacity": 0}),
    ("bg", "БГ (Блок гребенки)", "prep_objects", "bg-icon", "#475569", {"capacity": 0, "inputs_count": 0}),
    ("bkns", "БКНС", "prep_objects", "bkns-icon", "#475569", {"capacity": 0, "pumps_count": 0}),
    ("settling_tank", "Отстойник", "prep_objects", "settling-tank-icon", "#475569", {"capacity": 0, "retention_time": 0}),
    ("metering_tank", "Емкость замерная", "prep_objects", "metering-tank-icon", "#475569", {"volume": 0, "current_level": 0}),
    ("kns_ppd", "КНС (Кустовая насосная станция ППД)", "ppd_system", "kns-ppd-icon", "#475569", {"injection_volume_m3_per_day": 0, "pressure_atm": 0, "pumps_count": 0}),
    ("reagent_dosing", "Блок дозирования реагентов", "ppd_system", "reagent-dosing-icon", "#475569", {"capacity": 0}),
    ("water_intake_well", "Водозаборная скважина", "ppd_system", "water-intake-well-icon", "#475569", {"capacity": 0}),
    ("booster_pump_station", "Насосная станция подкачки", "ppd_system", "booster-pump-station-icon", "#475569", {"capacity": 0, "pressure_atm": 0}),
    ("circulation_system", "Система оборотного водоснабжения", "circulation", "circulation-system-icon", "#475569", {"capacity": 0}),
    ("transfer_pump_station", "Насосная станция перекачки", "circulation", "transfer-pump-station-icon", "#475569", {"capacity": 0, "pressure_atm": 0}),
    ("tp", "ТП (Трансформаторная подстанция)", "power_supply", "tp-icon", "#475569", {"power_kva": 0, "voltage": 0}),
    ("des", "ДЭС (Дизельная электростанция)", "power_supply", "des-icon", "#475569", {"power_kw": 0}),
    ("lep", "ЛЭП (Линия электропередач)", "power_supply", "lep-icon", "#475569", {"length_km": 0, "voltage": 0}),
    ("ru", "РУ (Распределительное устройство)", "power_supply", "ru-icon", "#475569", {"capacity": 0}),
    ("boiler_house", "Котельная", "heat_supply", "boiler-house-icon", "#475569", {"thermal_power": 0, "fuel_type": ""}),
    ("heat_exchanger", "Теплообменник", "heat_supply", "heat-exchanger-icon", "#475569", {"capacity": 0}),
    ("heat_pipeline", "Теплотрасса", "heat_supply", "heat-pipeline-icon", "#475569", {"length_km": 0}),
    ("oil_heater", "Печь нагрева нефти", "oil_heating", "oil-heater-icon", "#475569", {"heating_temperature": 0, "capacity": 0}),
    ("heat_exchange_unit", "Теплообменная установка", "oil_heating", "heat-exchange-unit-icon", "#475569", {"capacity": 0}),
    ("sikn", "СИКН", "metering", "sikn-icon", "#475569", {"accuracy": 0, "range": ""}),
    ("uza", "УЗА", "metering", "uza-icon", "#475569", {"accuracy": 0}),
    ("flow_meter", "Расходомер", "metering", "flow-meter-icon", "#475569", {"range": "", "accuracy": 0}),
    ("telemechanics_point", "Пункт телемеханики", "telemetry", "telemechanics-point-icon", "#475569", {"capacity": 0}),
    ("control_cabinet", "Шкаф управления", "telemetry", "control-cabinet-icon", "#475569", {"channels": 0}),
    ("sensor", "Датчик", "telemetry", "sensor-icon", "#475569", {"sensor_type": "pressure", "range": ""}),
    ("spill_pond", "Амбар (для сбора утечек/разливов)", "ecology", "spill-pond-icon", "#475569", {"volume": 0, "lining": ""}),
    ("sludge_pond", "Шламовый амбар", "ecology", "sludge-pond-icon", "#475569", {"volume": 0}),
    ("flare_utilization", "Факел для утилизации газа", "ecology", "flare-utilization-icon", "#475569", {"flare_height": 0, "burn_capacity": 0}),
    ("vapor_recovery", "Система улавливания паров нефти", "ecology", "vapor-recovery-icon", "#475569", {"capacity": 0}),
    ("fire_tank", "Пожарный резервуар", "safety", "fire-tank-icon", "#475569", {"volume": 0}),
    ("fire_suppression", "Система пожаротушения", "safety", "fire-suppression-icon", "#475569", {"capacity": 0}),
    ("emergency_tank", "Аварийная емкость", "safety", "emergency-tank-icon", "#475569", {"volume": 0}),
    ("field_road", "Дорога внутрипромысловая", "transport", "field-road-icon", "#475569", {"length_km": 0}),
    ("shift_camp", "Вахтовый поселок", "transport", "shift-camp-icon", "#475569", {"capacity": 0}),
    ("bpo", "База производственного обслуживания (БПО)", "transport", "bpo-icon", "#475569", {"capacity": 0}),
    ("mto_warehouse", "Склад МТО", "transport", "mto-warehouse-icon", "#475569", {"capacity": 0}),
]


def ensure_object_types(db: Session) -> None:
    existing = {item.code for item in db.query(FieldObjectType).all()}
    new_items = [
        FieldObjectType(
            code=code,
            name=name,
            category=category,
            icon_name=icon,
            color=color,
            default_properties=props,
        )
        for code, name, category, icon, color, props in DEFAULT_OBJECT_TYPES
        if code not in existing
    ]
    if new_items:
        db.add_all(new_items)
        db.commit()


def list_object_types(db: Session) -> list[FieldObjectType]:
    return db.query(FieldObjectType).order_by(FieldObjectType.category.asc(), FieldObjectType.name.asc()).all()


def list_schemes(db: Session, oil_field_id=None) -> list[FieldScheme]:
    query = db.query(FieldScheme)
    if oil_field_id:
        query = query.filter(FieldScheme.oil_field_id == oil_field_id)
    return query.order_by(FieldScheme.updated_at.desc()).all()


def get_scheme(db: Session, scheme_id) -> FieldScheme | None:
    return db.query(FieldScheme).filter(FieldScheme.id == scheme_id).first()


def create_scheme(db: Session, payload: dict) -> FieldScheme:
    scheme = FieldScheme(**payload)
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


def update_scheme(db: Session, scheme: FieldScheme, payload: dict) -> FieldScheme:
    for key, value in payload.items():
        setattr(scheme, key, value)
    scheme.updated_at = dt.datetime.utcnow()
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


def delete_scheme(db: Session, scheme: FieldScheme) -> None:
    db.delete(scheme)
    db.commit()


def list_objects(db: Session, scheme_id) -> list[FieldSchemeObject]:
    return (
        db.query(FieldSchemeObject)
        .filter(FieldSchemeObject.scheme_id == scheme_id)
        .order_by(FieldSchemeObject.created_at.asc())
        .all()
    )


def get_object(db: Session, obj_id) -> FieldSchemeObject | None:
    return db.query(FieldSchemeObject).filter(FieldSchemeObject.id == obj_id).first()


def create_object(db: Session, scheme_id, payload: dict) -> FieldSchemeObject:
    obj = FieldSchemeObject(scheme_id=scheme_id, **payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_object(db: Session, obj: FieldSchemeObject, payload: dict) -> FieldSchemeObject:
    for key, value in payload.items():
        setattr(obj, key, value)
    obj.updated_at = dt.datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_object(db: Session, obj: FieldSchemeObject) -> None:
    db.delete(obj)
    db.commit()


def list_connections(db: Session, scheme_id) -> list[FieldSchemeConnection]:
    return (
        db.query(FieldSchemeConnection)
        .filter(FieldSchemeConnection.scheme_id == scheme_id)
        .order_by(FieldSchemeConnection.created_at.asc())
        .all()
    )


def get_connection(db: Session, conn_id) -> FieldSchemeConnection | None:
    return db.query(FieldSchemeConnection).filter(FieldSchemeConnection.id == conn_id).first()


def create_connection(db: Session, scheme_id, payload: dict) -> FieldSchemeConnection:
    conn = FieldSchemeConnection(scheme_id=scheme_id, **payload)
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def update_connection(db: Session, conn: FieldSchemeConnection, payload: dict) -> FieldSchemeConnection:
    for key, value in payload.items():
        setattr(conn, key, value)
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def delete_connection(db: Session, conn: FieldSchemeConnection) -> None:
    db.delete(conn)
    db.commit()
