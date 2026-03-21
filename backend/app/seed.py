import datetime as dt
import os

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.annual_plan import AnnualPlan, AnnualPlanScenario
from app.models.entity import Entity
from app.models.master_data import (
    ExtractionCompany,
    ExportDestination,
    NpsStation,
    OilField,
    ProcessingPlant,
    TransportationCompany,
    TransportationSection,
)
from app.models.scenario import Scenario
from app.models.scenario_result import ScenarioResult
from app.models.user import User
from app.models.crisis import CrisisEvent, CrisisImpactAnalysis, CrisisResponseScenario
from app.models.field_scheme import FieldObjectType
from app.services.annual_planning import build_baseline_lines


def seed_entities(db: Session) -> None:
    if db.query(Entity).count() > 0:
        return
    def build_plans(capacity: float) -> tuple[float, float]:
        gov = round(capacity * 0.45, 2)
        corp = round(capacity * 0.35, 2)
        return gov, corp

    entities: list[Entity] = []

    for plant in db.query(ProcessingPlant).all():
        gov_plan, corp_plan = build_plans(plant.capacity)
        entities.append(
            Entity(
                entity=plant.name,
                type="Завод",
                capacity=plant.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=plant.region or "—",
                status=plant.status or "active",
                processing_plant_id=plant.id,
            )
        )

    for section in db.query(TransportationSection).all():
        gov_plan, corp_plan = build_plans(section.capacity)
        entities.append(
            Entity(
                entity=section.name,
                type="Участок",
                capacity=section.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=section.region or "—",
                status=section.status or "active",
                transportation_section_id=section.id,
            )
        )

    for station in db.query(NpsStation).all():
        gov_plan, corp_plan = build_plans(station.capacity)
        entities.append(
            Entity(
                entity=station.name,
                type="НПС",
                capacity=station.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=station.region or "—",
                status=station.status or "active",
                nps_station_id=station.id,
            )
        )

    for field in db.query(OilField).all():
        gov_plan, corp_plan = build_plans(field.capacity)
        entities.append(
            Entity(
                entity=field.name,
                type="Месторождение",
                capacity=field.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=field.region or "—",
                status=field.status or "active",
                oil_field_id=field.id,
            )
        )

    for company in db.query(ExtractionCompany).all():
        gov_plan, corp_plan = build_plans(company.capacity)
        entities.append(
            Entity(
                entity=company.name,
                type="Добывающая компания",
                capacity=company.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=company.region or "—",
                status=company.status or "active",
                extraction_company_id=company.id,
            )
        )

    for company in db.query(TransportationCompany).all():
        gov_plan, corp_plan = build_plans(company.capacity)
        entities.append(
            Entity(
                entity=company.name,
                type="Транспортная компания",
                capacity=company.capacity,
                gov_plan=gov_plan,
                corp_plan=corp_plan,
                region=company.region or "—",
                status=company.status or "active",
                transportation_company_id=company.id,
            )
        )

    db.add_all(entities)
    db.commit()


def seed_scenarios(db: Session) -> None:
    existing_names = {row.name for row in db.query(Scenario.name).all()}
    scenarios = []
    default_inputs = [
        {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 12000, "planGov": 4800, "planCorp": 5500},
        {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9500, "planGov": 4600, "planCorp": 4200},
        {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 8000, "planGov": 4500, "planCorp": 3800},
        {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 6000, "planGov": 3000, "planCorp": 3000},
    ]
    if "Базовый сценарий" not in existing_names:
        scenarios.append(
            Scenario(
                name="Базовый сценарий",
                description="Текущие мощности и планы без изменений",
                status="done",
                owner="Аналитика",
                approval_status="approved",
                comments="Базовая линия для сравнения.",
            usd_kzt=507,
            oil_price_kz=70,
            brent_price=75,
            kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 1),
                inputs=default_inputs,
            )
        )
    if "Baseline" not in existing_names:
        scenarios.append(
            Scenario(
                name="Baseline",
                description="Baseline scenario aligned with current master data.",
                status="done",
                owner="Planning",
                approval_status="approved",
                comments="Default baseline for planning.",
                usd_kzt=507,
                oil_price_kz=70,
                brent_price=75,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 1),
                inputs=default_inputs,
            )
        )
    if "Conservative" not in existing_names:
        scenarios.append(
            Scenario(
                name="Conservative",
                description="Lower throughput scenario for risk assessment.",
                status="draft",
                owner="Planning",
                approval_status="draft",
                comments="Reduced volumes and cautious assumptions.",
                usd_kzt=507,
                oil_price_kz=68,
                brent_price=72,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 2),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 10500, "planGov": 4200, "planCorp": 4800},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 8800, "planGov": 4000, "planCorp": 3800},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 7600, "planGov": 3600, "planCorp": 3300},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 5200, "planGov": 2400, "planCorp": 2400},
                ],
            )
        )
    if "Aggressive" not in existing_names:
        scenarios.append(
            Scenario(
                name="Aggressive",
                description="Higher throughput scenario for growth.",
                status="draft",
                owner="Planning",
                approval_status="draft",
                comments="Increased volumes with higher utilization.",
                usd_kzt=507,
                oil_price_kz=72,
                brent_price=78,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 3),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 13000, "planGov": 5200, "planCorp": 6000},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 10200, "planGov": 5000, "planCorp": 4600},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 8800, "planGov": 4300, "planCorp": 4000},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 7000, "planGov": 3300, "planCorp": 3300},
                ],
            )
        )
    if "Рост GOV +20%" not in existing_names:
        scenarios.append(
            Scenario(
                name="Рост GOV +20%",
                description="Увеличение гос. заказа на 20% по всем заводам",
                status="done",
                owner="Планирование",
                approval_status="approved",
                comments="Сценарий оценки влияния гос.заказа.",
            usd_kzt=507,
            oil_price_kz=70,
            brent_price=75,
            kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 3),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 12000, "planGov": 5760, "planCorp": 5500},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9500, "planGov": 5520, "planCorp": 4200},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 8000, "planGov": 5400, "planCorp": 3800},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 6000, "planGov": 3600, "planCorp": 3000},
                ],
            )
        )
    if "Новый завод Е" not in existing_names:
        scenarios.append(
            Scenario(
                name="Новый завод Е",
                description="Добавление нового завода мощностью 2000",
                status="draft",
                owner="Инвестиции",
                approval_status="draft",
                comments="Требует оценки CAPEX и сроков.",
            usd_kzt=507,
            oil_price_kz=70,
            brent_price=75,
            kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 7),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 12000, "planGov": 4800, "planCorp": 5500},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9500, "planGov": 4600, "planCorp": 4200},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 10000, "planGov": 4500, "planCorp": 3800},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 6000, "planGov": 3000, "planCorp": 3000},
                ],
            )
        )
    if "Ограничение OPEC+" not in existing_names:
        scenarios.append(
            Scenario(
                name="Ограничение OPEC+",
                description="Снижение добычи из-за ограничений квот",
                status="draft",
                owner="Планирование",
                approval_status="draft",
                comments="Требуется согласование квот.",
            usd_kzt=507,
            oil_price_kz=68,
            brent_price=72,
            kzt_inflation=7.5,
                created_at=dt.datetime(2026, 2, 10),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 11000, "planGov": 4200, "planCorp": 5000},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9000, "planGov": 4200, "planCorp": 3900},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 7800, "planGov": 4000, "planCorp": 3400},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 5200, "planGov": 2600, "planCorp": 2600},
                ],
            )
        )
    if "Падение цены на нефть" not in existing_names:
        scenarios.append(
            Scenario(
                name="Падение цены на нефть",
                description="Сокращение добычи и экспорта из-за низких цен",
                status="draft",
                owner="Финансы",
                approval_status="draft",
                comments="Пересмотр планов на основе ценового шока.",
            usd_kzt=507,
            oil_price_kz=55,
            brent_price=60,
            kzt_inflation=9,
                created_at=dt.datetime(2026, 2, 10),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 10000, "planGov": 3800, "planCorp": 4200},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 8500, "planGov": 3600, "planCorp": 3400},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 7600, "planGov": 3500, "planCorp": 3200},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 4800, "planGov": 2200, "planCorp": 2200},
                ],
            )
        )
    if "Падение курса доллар" not in existing_names:
        scenarios.append(
            Scenario(
                name="Падение курса доллар",
                description="Изменение экспортной выручки и перераспределение планов",
                status="draft",
                owner="Финансы",
                approval_status="draft",
                comments="Фокус на внутренний рынок.",
            usd_kzt=470,
            oil_price_kz=70,
            brent_price=75,
            kzt_inflation=10,
                created_at=dt.datetime(2026, 2, 10),
                inputs=[
                    {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 11500, "planGov": 4500, "planCorp": 5000},
                    {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9200, "planGov": 4300, "planCorp": 4000},
                    {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 8200, "planGov": 4200, "planCorp": 3500},
                    {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 5400, "planGov": 2400, "planCorp": 2400},
                ],
            )
        )
    if scenarios:
        db.add_all(scenarios)
        db.commit()

    # Backfill missing inputs/metadata for existing scenarios.
    scenario_defaults = {
        "Базовый сценарий": {
            "owner": "Аналитика",
            "approval_status": "approved",
            "comments": "Базовая линия для сравнения.",
            "inputs": default_inputs,
        },
        "Рост GOV +20%": {
            "owner": "Планирование",
            "approval_status": "approved",
            "comments": "Сценарий оценки влияния гос.заказа.",
            "inputs": [
                {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 12000, "planGov": 5760, "planCorp": 5500},
                {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9500, "planGov": 5520, "planCorp": 4200},
                {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 8000, "planGov": 5400, "planCorp": 3800},
                {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 6000, "planGov": 3600, "planCorp": 3000},
            ],
        },
        "Новый завод Е": {
            "owner": "Инвестиции",
            "approval_status": "draft",
            "comments": "Требует оценки CAPEX и сроков.",
            "inputs": [
                {"stage": "UP", "label": "Добыча (Upstream)", "capacity": 12000, "planGov": 4800, "planCorp": 5500},
                {"stage": "MID", "label": "Транспорт (Midstream)", "capacity": 9500, "planGov": 4600, "planCorp": 4200},
                {"stage": "DOWN", "label": "Переработка (Downstream)", "capacity": 10000, "planGov": 4500, "planCorp": 3800},
                {"stage": "EXPORT", "label": "Экспорт (Crude)", "capacity": 6000, "planGov": 3000, "planCorp": 3000},
            ],
        },
        "Ограничение OPEC+": {
            "owner": "Планирование",
            "approval_status": "draft",
            "comments": "Требуется согласование квот.",
        },
        "Падение цены на нефть": {
            "owner": "Финансы",
            "approval_status": "draft",
            "comments": "Пересмотр планов на основе ценового шока.",
        },
        "Падение курса доллар": {
            "owner": "Финансы",
            "approval_status": "draft",
            "comments": "Фокус на внутренний рынок.",
        },
    }
    for scenario in db.query(Scenario).all():
        defaults = scenario_defaults.get(scenario.name)
        if not defaults:
            continue
        if not scenario.owner:
            scenario.owner = defaults["owner"]
        if not scenario.approval_status:
            scenario.approval_status = defaults["approval_status"]
        if not scenario.comments:
            scenario.comments = defaults["comments"]
        if not scenario.inputs:
            if "inputs" in defaults:
                scenario.inputs = defaults["inputs"]
        if scenario.usd_kzt == 0:
            scenario.usd_kzt = 507
        if scenario.oil_price_kz == 0:
            scenario.oil_price_kz = 70
        if scenario.brent_price == 0:
            scenario.brent_price = 75
        if scenario.kzt_inflation == 0:
            scenario.kzt_inflation = 8
        db.add(scenario)
    db.commit()

    baseline = db.query(Scenario).filter(Scenario.name == "Базовый сценарий").first()
    growth = db.query(Scenario).filter(Scenario.name == "Рост GOV +20%").first()
    results = []
    if baseline and not baseline.result:
        results.append(
            ScenarioResult(
                scenario_id=baseline.id,
                total_gap=650,
                bottleneck="Завод Г",
                utilization=78,
            )
        )
    if growth and not growth.result:
        results.append(
            ScenarioResult(
                scenario_id=growth.id,
                total_gap=200,
                bottleneck="Завод Б",
                utilization=91,
            )
        )
    if results:
        db.add_all(results)
        db.commit()


def seed_master_data(db: Session) -> None:
    reset_seed = os.getenv("SEED_RESET", "").lower() in {"1", "true", "yes"}
    if reset_seed:
        db.query(Entity).delete()
        db.query(ProcessingPlant).delete()
        db.query(ExportDestination).delete()
        db.query(NpsStation).delete()
        db.query(TransportationSection).delete()
        db.query(OilField).delete()
        db.query(ExtractionCompany).delete()
        db.query(TransportationCompany).delete()
        db.commit()

    def build_current(capacity: int) -> tuple[int, int]:
        current_month = int(round(capacity / 12))
        current_day = int(round(capacity / 365))
        return current_month, current_day

    extraction_company_map = {}
    transportation_company_map = {}
    transportation_section_map = {}

    processing_seed = [
        ("KZ-REF-ATY", "Атырауский НПЗ", "АНПЗ", 5600, "Атырау", "KZ-TS-AS-01", "active"),
        ("KZ-REF-PVL", "Павлодарский НХЗ", "ПНХЗ", 6000, "Павлодар", "KZ-TS-KTK-01", "active"),
        ("KZ-REF-SHM", "Шымкентский НПЗ", "ШНПЗ", 6000, "Туркестанская", "KZ-TS-KK-01", "maintenance"),
    ]

    transport_company_seed = [
        ("KZ-TR-KTO", "КазТрансОйл", "КТО", 40000, "Казахстан"),
        ("KZ-TR-KTK", "КТК (CPC Pipeline)", "КТК", 65000, "Запад"),
        ("KZ-TR-KTG", "КазТрансГаз", "КТГ", 12000, "Казахстан"),
    ]
    for code, name, short_name, capacity, region in transport_company_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(TransportationCompany).filter(TransportationCompany.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = "active"
        else:
            db.add(
                TransportationCompany(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status="active",
                )
            )
    db.commit()

    transportation_companies = db.query(TransportationCompany).all()
    transportation_company_map = {item.code: item.id for item in transportation_companies}

    transport_section_seed = [
        ("KZ-TS-KTK-01", "КТК: Атырау–Новороссийск", "КТК", 65000, "Запад", "KZ-TR-KTK", "active"),
        ("KZ-TS-AS-01", "Атырау–Самара", "А-С", 15000, "Запад", "KZ-TR-KTO", "active"),
        ("KZ-TS-KK-01", "Кенкияк–Кумколь", "К-К", 8000, "Центр", "KZ-TR-KTO", "maintenance"),
    ]
    for code, name, short_name, capacity, region, company_code, status in transport_section_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(TransportationSection).filter(TransportationSection.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = status
            existing.transportation_company_id = transportation_company_map.get(company_code)
        else:
            db.add(
                TransportationSection(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status=status,
                    transportation_company_id=transportation_company_map.get(company_code),
                )
            )
    db.commit()

    transportation_sections = db.query(TransportationSection).all()
    transportation_section_map = {item.code: item.id for item in transportation_sections}

    for code, name, short_name, capacity, region, section_code, status in processing_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(ProcessingPlant).filter(ProcessingPlant.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = status
            existing.transportation_section_id = transportation_section_map.get(section_code)
        else:
            db.add(
                ProcessingPlant(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status=status,
                    transportation_section_id=transportation_section_map.get(section_code),
                )
            )
    db.commit()

    nps_seed = [
        ("KZ-NPS-ATY", "НПС Атырау", "НПС АТР", 7000, "Атырау", "KZ-TS-KTK-01", "active"),
        ("KZ-NPS-KKY", "НПС Кенкияк", "НПС КЕН", 4500, "Актюбинская", "KZ-TS-KK-01", "active"),
        ("KZ-NPS-KUM", "НПС Кумколь", "НПС КУМ", 3500, "Кызылординская", "KZ-TS-KK-01", "maintenance"),
    ]
    for code, name, short_name, capacity, region, section_code, status in nps_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(NpsStation).filter(NpsStation.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = status
            existing.transportation_section_id = transportation_section_map.get(section_code)
        else:
            db.add(
                NpsStation(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status=status,
                    transportation_section_id=transportation_section_map.get(section_code),
                )
            )
    db.commit()

    extraction_seed = [
        ("KZ-EX-TCO", "Тенгизшевройл (TCO)", "ТШО", 30000, "Атырау"),
        ("KZ-EX-KPO", "Карачаганак Петролиум Оперейтинг (KPO)", "KPO", 12000, "ЗКО"),
        ("KZ-EX-NCOC", "НКОК (NCOC)", "NCOC", 14000, "Атырау"),
        ("KZ-EX-KMG", "КазМунайГаз", "КМГ", 18000, "Казахстан"),
        ("KZ-EX-OMG", "Озенмунайгаз", "ОМГ", 5000, "Мангистауская"),
        ("KZ-EX-EMG", "Эмбамунайгаз", "ЭМГ", 3000, "Атырау"),
        ("KZ-EX-KBM", "Каражанбасмунай", "КБМ", 4000, "Мангистауская"),
        ("KZ-EX-MMG", "Мангистаумунайгаз", "ММГ", 6000, "Мангистауская"),
        ("KZ-EX-KOA", "Казахойл Актобе", "КОА", 2500, "Актюбинская"),
        ("KZ-EX-KGM", "Казгермунай", "КГМ", 3500, "Кызылординская"),
    ]

    for code, name, short_name, capacity, region in extraction_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(ExtractionCompany).filter(ExtractionCompany.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = "active"
        else:
            db.add(
                ExtractionCompany(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status="active",
                )
            )
    db.commit()

    extraction_companies = db.query(ExtractionCompany).all()
    extraction_company_map = {item.code: item.id for item in extraction_companies}

    oil_field_seed = [
        ("KZ-OF-TEN", "Тенгиз", "ТЕН", 30000, "Атырау", "KZ-EX-TCO"),
        ("KZ-OF-KAR", "Карачаганак", "КАР", 12000, "ЗКО", "KZ-EX-KPO"),
        ("KZ-OF-KAS", "Кашаган", "КАШ", 14000, "Атырау", "KZ-EX-NCOC"),
        ("KZ-OF-UZN", "Узень", "УЗН", 3000, "Мангистауская", "KZ-EX-OMG"),
        ("KZ-OF-ZHT", "Жетыбай", "ЖТБ", 2000, "Мангистауская", "KZ-EX-OMG"),
        ("KZ-OF-KLM", "Каламкас", "КЛМ", 2000, "Мангистауская", "KZ-EX-EMG"),
        ("KZ-OF-KNB", "Кенбай", "КНБ", 1000, "Атырау", "KZ-EX-EMG"),
        ("KZ-OF-KRZ", "Каражанбас", "КРЖ", 4000, "Мангистауская", "KZ-EX-KBM"),
        ("KZ-OF-KMG", "Активы КМГ (сводно)", "КМГ", 18000, "Казахстан", "KZ-EX-KMG"),
    ]
    for code, name, short_name, capacity, region, company_code in oil_field_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(OilField).filter(OilField.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = "active"
            existing.extraction_company_id = extraction_company_map.get(company_code)
        else:
            db.add(
                OilField(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status="active",
                    extraction_company_id=extraction_company_map.get(company_code),
                )
            )
    db.commit()

    export_seed = [
        ("KZ-EXP-CPC", "Экспорт через КТК (Новороссийск)", "КТК", 7200, "Запад", "KZ-TS-KTK-01"),
        ("KZ-EXP-AKT", "Экспорт через Актауский порт", "АКТ", 1500, "Каспий", "KZ-TS-AS-01"),
        ("KZ-EXP-CHN-PIPE", "Экспорт в Китай по трубопроводам", "КИТ", 3200, "Центр", "KZ-TS-KK-01"),
    ]
    for code, name, short_name, capacity, region, section_code in export_seed:
        current_month, current_day = build_current(capacity)
        existing = db.query(ExportDestination).filter(ExportDestination.code == code).first()
        if existing:
            existing.name = name
            existing.short_name = short_name
            existing.capacity = capacity
            existing.current_month = current_month
            existing.current_day = current_day
            existing.region = region
            existing.status = "active"
            existing.transportation_section_id = transportation_section_map.get(section_code)
        else:
            db.add(
                ExportDestination(
                    code=code,
                    name=name,
                    short_name=short_name,
                    capacity=capacity,
                    current_month=current_month,
                    current_day=current_day,
                    region=region,
                    status="active",
                    transportation_section_id=transportation_section_map.get(section_code),
                )
            )
    db.commit()


def seed_annual_plans(db: Session) -> None:
    if db.query(AnnualPlan).count() > 0:
        return
    plan = AnnualPlan(
        name="2027 Integrated Plan",
        year=2027,
        status="draft",
        baseline_source="master-data",
        created_at=dt.datetime(2026, 2, 15),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    for scenario_name in ["Baseline", "Conservative", "Aggressive"]:
        scenario = AnnualPlanScenario(
            plan_id=plan.id,
            name=scenario_name,
            status="draft",
            created_at=dt.datetime(2026, 2, 15),
        )
        db.add(scenario)
        db.commit()
        db.refresh(scenario)
        build_baseline_lines(db, scenario)

def seed_users(db: Session) -> None:
    if db.query(User).filter(User.username == "viewer").first() is None:
        db.add(User(username="viewer", hashed_password=hash_password("viewer"), role="viewer", is_active=True))
    admin_user = os.getenv("ADMIN_USER", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "change-me")
    if db.query(User).filter(User.username == admin_user).first() is None:
        db.add(User(username=admin_user, hashed_password=hash_password(admin_password), role="admin", is_active=True))
    db.commit()


def seed_crisis(db: Session) -> None:
    if db.query(CrisisEvent).count() > 0:
        return

    def add_event_with_analysis_and_scenarios(
        event_kw: dict,
        analysis_kw: dict,
        scenarios_list: list[dict],
    ) -> None:
        event = CrisisEvent(**event_kw)
        db.add(event)
        db.flush()
        analysis_kw["crisis_event_id"] = event.id
        db.add(CrisisImpactAnalysis(**analysis_kw))
        for s in scenarios_list:
            s["crisis_event_id"] = event.id
            db.add(CrisisResponseScenario(**s))
        db.flush()

    # 1. Павлодарский НПЗ — аварийный ремонт (завод), 2025
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "Павлодарский НПЗ: аварийный ремонт установки первичной переработки",
            "description": "Обнаружена трещина в печи ЭЛОУ-АВТ-6. Остановка установки на ремонт. Потеря перерабатывающей мощности ~450 тыс. т/мес. Реальный инцидент 2025 — внеплановая остановка.",
            "affected_asset_type": "processing_plant",
            "affected_asset_id": "KZ-REF-PVL",
            "affected_stage": "DOWN",
            "current_capacity": 450,
            "impacted_capacity": 0,
            "capacity_loss": 450,
            "capacity_loss_pct": 100,
            "event_start_datetime": dt.datetime(2025, 6, 12, 4, 30),
            "estimated_downtime_min_days": 21,
            "estimated_downtime_best_days": 45,
            "estimated_downtime_max_days": 60,
            "detected_by": "Технадзор",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 450, "downtime_months": 1.5},
            "upstream_impact": {"surplus_crude": 450},
            "financial_impact": {"lost_margin": -180_000_000, "total": -180_000_000},
        },
        [
            {
                "scenario_name": "Перенаправление сырца на Атырауский НПЗ + экспорт",
                "scenario_type": "redirect",
                "description": "Часть сырья — на Атырауский НПЗ, излишки — экспорт через Актау/КТК.",
                "strategy_details": {"redirect": "Атырау", "export_volume": 200},
                "baseline_financial_impact": -180_000_000,
                "mitigated_financial_impact": -95_000_000,
                "net_savings": 85_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 14,
                "dependencies": "Пропускная способность Атырау, танкеры",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.82,
                "ai_ranking": 1,
                "status": "draft",
            },
            {
                "scenario_name": "Снижение загрузки добычи + импорт светлых",
                "scenario_type": "reduce_production",
                "description": "Временное снижение отбора по Тенгизу/другим, импорт бензина/дизеля.",
                "strategy_details": {"production_cut": 200, "import_products": True},
                "baseline_financial_impact": -180_000_000,
                "mitigated_financial_impact": -120_000_000,
                "net_savings": 60_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 21,
                "dependencies": "Поставщики, логистика",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.75,
                "ai_ranking": 2,
                "status": "draft",
            },
        ],
    )

    # 2. Тенгиз — инцидент на объекте (месторождение), 2025
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "Тенгиз: аварийная остановка УПГ из-за разрыва трубопровода",
            "description": "Разрыв продуктопровода на участке УПГ-1. Остановка одной линии, падение добычи ~800 тыс. т/мес. Реалистичный сценарий по аналогии с инцидентами на Тенгизе.",
            "affected_asset_type": "oil_field",
            "affected_asset_id": "KZ-OF-TEN",
            "affected_stage": "UP",
            "current_capacity": 2500,
            "impacted_capacity": 1700,
            "capacity_loss": 800,
            "capacity_loss_pct": 32,
            "event_start_datetime": dt.datetime(2025, 9, 3, 14, 0),
            "estimated_downtime_min_days": 14,
            "estimated_downtime_best_days": 28,
            "estimated_downtime_max_days": 42,
            "detected_by": "DCS",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 800, "downtime_months": 0.9},
            "downstream_impact": {"deficit_crude": 800},
            "financial_impact": {"lost_revenue": -320_000_000, "total": -320_000_000},
        },
        [
            {
                "scenario_name": "Компенсация за счёт Кашагана и Карачаганака",
                "scenario_type": "redirect",
                "description": "Увеличение отбора по Кашагану и Карачаганаку в пределах возможностей.",
                "strategy_details": {"backfill_from": ["Кашаган", "Карачаганак"]},
                "baseline_financial_impact": -320_000_000,
                "mitigated_financial_impact": -140_000_000,
                "net_savings": 180_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 10,
                "dependencies": "Резерв мощности Кашаган/КЧГ",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.8,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 3. Кашаган — ремонт инфраструктуры (месторождение), 2026
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "Кашаган: планово-внеплановый ремонт островных объектов",
            "description": "Коррозия и необходимость замены участков на морском комплексе. Снижение добычи на 30% на период до 2 месяцев. Типичный риск для шельфовых проектов в Каспии.",
            "affected_asset_type": "oil_field",
            "affected_asset_id": "KZ-OF-KAS",
            "affected_stage": "UP",
            "current_capacity": 1400,
            "impacted_capacity": 980,
            "capacity_loss": 420,
            "capacity_loss_pct": 30,
            "event_start_datetime": dt.datetime(2026, 2, 1, 0, 0),
            "estimated_downtime_min_days": 30,
            "estimated_downtime_best_days": 50,
            "estimated_downtime_max_days": 65,
            "detected_by": "Инспекция",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 420, "downtime_months": 1.7},
            "downstream_impact": {"deficit_crude": 420},
            "financial_impact": {"lost_revenue": -168_000_000, "total": -168_000_000},
        },
        [
            {
                "scenario_name": "Перераспределение экспорта и запасы КТК",
                "scenario_type": "redirect",
                "description": "Использовать накопленные объёмы в системе КТК, снизить экспортную квоту на период.",
                "strategy_details": {"use_buffer": True, "export_adjust": -420},
                "baseline_financial_impact": -168_000_000,
                "mitigated_financial_impact": -90_000_000,
                "net_savings": 78_000_000,
                "execution_complexity": "low",
                "execution_timeline_days": 7,
                "dependencies": "Согласование с КТК",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.88,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 4. Атырауский НПЗ — пожар на установке (завод), 2026
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "catastrophic",
            "status": "scenarios_ready",
            "title": "Атырауский НПЗ: пожар на установке каталитического крекинга",
            "description": "Возгорание в зоне реактора ГК-3. Полная остановка крекинга, частичная — НПЗ. Потеря ~350 тыс. т/мес по переработке. Реалистичный сценарий по аналогии с пожарами на НПЗ в регионе.",
            "affected_asset_type": "processing_plant",
            "affected_asset_id": "KZ-REF-ATY",
            "affected_stage": "DOWN",
            "current_capacity": 350,
            "impacted_capacity": 0,
            "capacity_loss": 350,
            "capacity_loss_pct": 100,
            "event_start_datetime": dt.datetime(2026, 4, 18, 2, 15),
            "estimated_downtime_min_days": 45,
            "estimated_downtime_best_days": 75,
            "estimated_downtime_max_days": 100,
            "detected_by": "Пожарная сигнализация",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 350, "downtime_months": 2.5},
            "upstream_impact": {"surplus_crude": 350},
            "financial_impact": {"lost_margin": -140_000_000, "penalties": -20_000_000, "total": -160_000_000},
        },
        [
            {
                "scenario_name": "Перевод сырья на Павлодар + экспорт сырой нефти",
                "scenario_type": "redirect",
                "description": "Максимальная загрузка Павлодарского НПЗ, остаток — экспорт через КТК/Актау.",
                "strategy_details": {"redirect": "Павлодар", "export_crude": 180},
                "baseline_financial_impact": -160_000_000,
                "mitigated_financial_impact": -70_000_000,
                "net_savings": 90_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 21,
                "dependencies": "Трубопровод, квоты КТК",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.78,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 5. КТК — угроза/атака дронов, остановка экспорта (транспорт), 2025
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "geopolitical",
            "severity": "catastrophic",
            "status": "scenarios_ready",
            "title": "КТК (Новороссийск): угроза атаки БПЛА, приостановка отгрузок",
            "description": "Угроза ударов дронами по терминалу в Новороссийске. Временная приостановка отгрузок танкерами. Потеря экспортной мощности ~1.2 млн т/мес по маршруту КТК. Реалистично по событиям 2024–2025 в регионе.",
            "affected_asset_type": "transportation_section",
            "affected_asset_id": "KZ-TS-KTK-01",
            "affected_stage": "MID",
            "current_capacity": 1200,
            "impacted_capacity": 0,
            "capacity_loss": 1200,
            "capacity_loss_pct": 100,
            "event_start_datetime": dt.datetime(2025, 11, 7, 0, 0),
            "estimated_downtime_min_days": 7,
            "estimated_downtime_best_days": 21,
            "estimated_downtime_max_days": 45,
            "detected_by": "Служба безопасности КТК",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 1200, "downtime_weeks": 3},
            "upstream_impact": {"crude_backlog": 1200},
            "export_impact": {"export_loss": 1200},
            "financial_impact": {"lost_export_revenue": -480_000_000, "demurrage": -30_000_000, "total": -510_000_000},
        },
        [
            {
                "scenario_name": "Переключение на экспорт через Актау и БТД",
                "scenario_type": "redirect",
                "description": "Максимальный экспорт через порт Актау и Баку-Тбилиси-Джейхан в пределах квот.",
                "strategy_details": {"aktau": 400, "btd": 300},
                "baseline_financial_impact": -510_000_000,
                "mitigated_financial_impact": -220_000_000,
                "net_savings": 290_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 14,
                "dependencies": "Квоты Актау/БТД, танкеры",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.72,
                "ai_ranking": 1,
                "status": "draft",
            },
            {
                "scenario_name": "Накопление в хранилищах + отложенный экспорт",
                "scenario_type": "export_import",
                "description": "Накопление нефти в РВС и парках, возобновление отгрузок после снятия угрозы.",
                "strategy_details": {"storage_buffer": True, "delayed_export": True},
                "baseline_financial_impact": -510_000_000,
                "mitigated_financial_impact": -350_000_000,
                "net_savings": 160_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 21,
                "dependencies": "Ёмкости хранения, сроки возобновления КТК",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.68,
                "ai_ranking": 2,
                "status": "draft",
            },
        ],
    )

    # 6. Эмбамунайгаз (ЭМГ) — добывающая компания, технический инцидент
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "ЭМГ (Эмбамунайгаз): аварийная остановка УПН на месторождении Каламкас",
            "description": "Отказ насосного оборудования на УПН. Снижение добычи на месторождениях Каламкас и Кенбай на 40%. Потеря ~1.2 тыс. т/мес. Ремонт с привлечением подрядчика.",
            "affected_asset_type": "extraction_company",
            "affected_asset_id": "KZ-EX-EMG",
            "affected_stage": "UP",
            "current_capacity": 3000,
            "impacted_capacity": 1800,
            "capacity_loss": 1200,
            "capacity_loss_pct": 40,
            "event_start_datetime": dt.datetime(2025, 8, 15, 6, 0),
            "estimated_downtime_min_days": 14,
            "estimated_downtime_best_days": 25,
            "estimated_downtime_max_days": 35,
            "detected_by": "Технический персонал",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 1200, "downtime_months": 0.8},
            "downstream_impact": {"deficit_crude": 1200},
            "financial_impact": {"lost_revenue": -48_000_000, "total": -48_000_000},
        },
        [
            {
                "scenario_name": "Компенсация за счёт Озенмунайгаза и перераспределение потоков",
                "scenario_type": "redirect",
                "description": "Временное увеличение отбора по соседним активам в регионе, оптимизация маршрутов.",
                "strategy_details": {"backfill_from": ["ОМГ"], "pipeline_optimization": True},
                "baseline_financial_impact": -48_000_000,
                "mitigated_financial_impact": -22_000_000,
                "net_savings": 26_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 10,
                "dependencies": "Резерв ОМГ, пропускная способность трубопроводов",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.76,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 7. Мангистаумунайгаз (ММГ) — добывающая компания, геополитический риск
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "geopolitical",
            "severity": "medium",
            "status": "scenarios_ready",
            "title": "Мангистаумунайгаз: задержка поставок оборудования из-за санкций",
            "description": "Задержка ввоза ключевого оборудования для бурения и ремонта скважин. Сдвиг капремонта, риск недобора добычи до 15% в квартале. Оценка потери ~225 тыс. т/мес в пике.",
            "affected_asset_type": "extraction_company",
            "affected_asset_id": "KZ-EX-MMG",
            "affected_stage": "UP",
            "current_capacity": 6000,
            "impacted_capacity": 5100,
            "capacity_loss": 900,
            "capacity_loss_pct": 15,
            "event_start_datetime": dt.datetime(2025, 10, 1, 0, 0),
            "estimated_downtime_min_days": 30,
            "estimated_downtime_best_days": 60,
            "estimated_downtime_max_days": 90,
            "detected_by": "Служба закупок",
            "created_by": "System",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss": 900, "downtime_months": 2.0},
            "downstream_impact": {"deficit_crude": 900},
            "financial_impact": {"lost_revenue": -36_000_000, "total": -36_000_000},
        },
        [
            {
                "scenario_name": "Локализация закупок и аренда буровых установок",
                "scenario_type": "redirect",
                "description": "Переход на поставщиков из дружественных юрисдикций, краткосрочная аренда буровых.",
                "strategy_details": {"local_suppliers": True, "rig_rental": True},
                "baseline_financial_impact": -36_000_000,
                "mitigated_financial_impact": -18_000_000,
                "net_savings": 18_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 21,
                "dependencies": "Квалифицированные подрядчики, таможня",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.7,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    db.commit()


def seed_field_object_types(db: Session) -> None:
    if db.query(FieldObjectType).count() > 0:
        return
    types = [
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
        ("valve", "Задвижка", "infrastructure", "valve-icon", "#475569", {"status": "open", "automated": False}),
    ]
    for code, name, category, icon, color, props in types:
        db.add(
            FieldObjectType(
                code=code,
                name=name,
                category=category,
                icon_name=icon,
                color=color,
                default_properties=props,
            )
        )
    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed_master_data(db)
        seed_entities(db)
        seed_scenarios(db)
        seed_annual_plans(db)
        seed_crisis(db)
        seed_field_object_types(db)
        seed_users(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
