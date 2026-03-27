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
        {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 22200, "planGov": 12800, "planCorp": 14500},
        {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 18500, "planGov": 11200, "planCorp": 12000},
        {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16000, "planGov": 10500, "planCorp": 11200},
        {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 14800, "planGov": 9800, "planCorp": 10500},
    ]
    if "Базовый сценарий" not in existing_names:
        scenarios.append(
            Scenario(
                name="Базовый сценарий",
                description="Текущий баланс мощностей ЕЭС Казахстана без изменений",
                status="done",
                owner="НДЦ СО",
                approval_status="approved",
                comments="Базовая линия для сравнения. Установленная мощность 22.2 ГВт, нагрузка ~14.8 ГВт.",
                usd_kzt=507,
                oil_price_kz=8.5,
                brent_price=4200,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 1),
                inputs=default_inputs,
            )
        )
    if "Baseline" not in existing_names:
        scenarios.append(
            Scenario(
                name="Baseline",
                description="Базовый сценарий энергобаланса KEGOC 2026.",
                status="done",
                owner="Планирование",
                approval_status="approved",
                comments="Базовый уровень для планирования генерации и транзита.",
                usd_kzt=507,
                oil_price_kz=8.5,
                brent_price=4200,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 1),
                inputs=default_inputs,
            )
        )
    if "Зимний максимум нагрузки" not in existing_names:
        scenarios.append(
            Scenario(
                name="Зимний максимум нагрузки",
                description="Сценарий пиковой зимней нагрузки: рост потребления до 16.5 ГВт при t° ниже −35°C",
                status="done",
                owner="НДЦ СО",
                approval_status="approved",
                comments="Моделирование дефицита при экстремальных морозах.",
                usd_kzt=507,
                oil_price_kz=9.2,
                brent_price=4800,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 2),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 22200, "planGov": 15000, "planCorp": 16500},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 18500, "planGov": 13800, "planCorp": 14200},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16000, "planGov": 12800, "planCorp": 13500},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 16500, "planGov": 11200, "planCorp": 16500},
                ],
            )
        )
    if "Рост ВИЭ до 15%" not in existing_names:
        scenarios.append(
            Scenario(
                name="Рост ВИЭ до 15%",
                description="Увеличение доли ВИЭ до 15% в генерации: +2 ГВт ветер/солнце, снижение угольной генерации",
                status="draft",
                owner="Департамент развития",
                approval_status="draft",
                comments="Оценка влияния на баланс и сеть. Требуется маневренная мощность.",
                usd_kzt=507,
                oil_price_kz=8.0,
                brent_price=3800,
                kzt_inflation=7,
                created_at=dt.datetime(2026, 2, 3),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 24200, "planGov": 13500, "planCorp": 15000},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 19200, "planGov": 11800, "planCorp": 12500},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16800, "planGov": 11000, "planCorp": 11800},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 15200, "planGov": 10200, "planCorp": 11000},
                ],
            )
        )
    if "Потеря транзита Север–Юг" not in existing_names:
        scenarios.append(
            Scenario(
                name="Потеря транзита Север–Юг",
                description="Отключение ВЛ 500кВ КарАл. Дефицит 840 МВт на Юге, рост импорта из КР",
                status="done",
                owner="НДЦ СО",
                approval_status="approved",
                comments="Критический сценарий для Южной зоны. Потеря сечения 1240 МВт.",
                usd_kzt=507,
                oil_price_kz=8.5,
                brent_price=4200,
                kzt_inflation=8,
                created_at=dt.datetime(2026, 2, 5),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 22200, "planGov": 12800, "planCorp": 14500},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 17260, "planGov": 9960, "planCorp": 10760},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 15160, "planGov": 9660, "planCorp": 10360},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 14800, "planGov": 9800, "planCorp": 9960},
                ],
            )
        )
    if "Ввод Балхашской ТЭС" not in existing_names:
        scenarios.append(
            Scenario(
                name="Ввод Балхашской ТЭС",
                description="Ввод 1 320 МВт новой генерации на Юге. Снижение дефицита и зависимости от транзита",
                status="draft",
                owner="Инвестиции",
                approval_status="draft",
                comments="Оценка CAPEX 3.5 млрд $. Ввод 2028–2030.",
                usd_kzt=507,
                oil_price_kz=7.8,
                brent_price=3600,
                kzt_inflation=7,
                created_at=dt.datetime(2026, 2, 7),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 23520, "planGov": 14120, "planCorp": 15820},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 18500, "planGov": 11200, "planCorp": 12000},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16800, "planGov": 11000, "planCorp": 12000},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 15800, "planGov": 10500, "planCorp": 11200},
                ],
            )
        )
    if "Рост тарифа БРЭ +30%" not in existing_names:
        scenarios.append(
            Scenario(
                name="Рост тарифа БРЭ +30%",
                description="Повышение тарифа балансирующего рынка на 30%: влияние на стоимость резервов",
                status="draft",
                owner="Финансы",
                approval_status="draft",
                comments="Оценка финансового воздействия на KEGOC и потребителей.",
                usd_kzt=507,
                oil_price_kz=11.0,
                brent_price=5460,
                kzt_inflation=10,
                created_at=dt.datetime(2026, 2, 10),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 22200, "planGov": 12800, "planCorp": 14500},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 18500, "planGov": 11200, "planCorp": 12000},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16000, "planGov": 10500, "planCorp": 11200},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 14200, "planGov": 9400, "planCorp": 10000},
                ],
            )
        )
    if "Дефицит угля (зима)" not in existing_names:
        scenarios.append(
            Scenario(
                name="Дефицит угля (зима)",
                description="Нехватка угля на ГРЭС Экибастуза: снижение генерации на 2 500 МВт при пиковом потреблении",
                status="draft",
                owner="НДЦ СО",
                approval_status="draft",
                comments="Срыв поставок угля при −40°C. Риск каскадного отключения.",
                usd_kzt=507,
                oil_price_kz=9.5,
                brent_price=5000,
                kzt_inflation=9,
                created_at=dt.datetime(2026, 2, 10),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 19700, "planGov": 12800, "planCorp": 14500},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 16000, "planGov": 9700, "planCorp": 10500},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 14000, "planGov": 9200, "planCorp": 9800},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 14800, "planGov": 9800, "planCorp": 12300},
                ],
            )
        )
    if "Экспорт в ЦА +500 МВт" not in existing_names:
        scenarios.append(
            Scenario(
                name="Экспорт в ЦА +500 МВт",
                description="Увеличение экспорта электроэнергии в Узбекистан и Кыргызстан на 500 МВт",
                status="draft",
                owner="Планирование",
                approval_status="draft",
                comments="Межгосударственные контракты на 2027. Требует усиления Южного сечения.",
                usd_kzt=470,
                oil_price_kz=8.5,
                brent_price=4200,
                kzt_inflation=7,
                created_at=dt.datetime(2026, 2, 12),
                inputs=[
                    {"stage": "GENERATION", "label": "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", "capacity": 22200, "planGov": 13300, "planCorp": 15000},
                    {"stage": "TRANSMISSION", "label": "Передача НЭС (500–220 кВ)", "capacity": 18500, "planGov": 11700, "planCorp": 12500},
                    {"stage": "DISTRIBUTION", "label": "Распределение (110–35 кВ)", "capacity": 16000, "planGov": 10500, "planCorp": 11200},
                    {"stage": "CONSUMPTION", "label": "Потребление (промышл./бытов.)", "capacity": 15300, "planGov": 10300, "planCorp": 11000},
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

    # 1. Экибастузская ГРЭС-1 — аварийный блок 500 МВт
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "ГРЭС-1 Экибастуз: аварийное отключение блока 500 МВт (блок №4)",
            "description": "Разрушение лопаток ЦВД турбины К-500-240 блока №4. Аварийный останов, потеря 500 МВт генерации в Северной зоне ЕЭС. Частота снизилась до 49.87 Гц, задействована АЧР ступень 1. Требуется капремонт ротора.",
            "affected_asset_type": "power_plant",
            "affected_asset_id": "GRES-1-EKB",
            "affected_stage": "GENERATION",
            "current_capacity": 4000,
            "impacted_capacity": 3500,
            "capacity_loss": 500,
            "capacity_loss_pct": 12,
            "event_start_datetime": dt.datetime(2026, 1, 15, 3, 42),
            "estimated_downtime_min_days": 14,
            "estimated_downtime_best_days": 30,
            "estimated_downtime_max_days": 45,
            "detected_by": "SCADA / EMS KEGOC",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss_mw": 500, "frequency_drop_hz": 0.13, "achr_activated": True},
            "upstream_impact": {"generation_deficit_mw": 500},
            "downstream_impact": {"south_zone_deficit_mw": 320},
            "financial_impact": {"lost_generation": -85_000_000, "import_cost": -12_000_000, "total": -97_000_000},
        },
        [
            {
                "scenario_name": "Загрузка Аксуской ГРЭС + импорт из РФ",
                "scenario_type": "generation_compensation",
                "description": "Повышение нагрузки Аксуской ГРЭС на 200 МВт, увеличение импорта из России через Кокшетауское сечение на 300 МВт.",
                "strategy_details": {"aksu_increase_mw": 200, "russia_import_mw": 300},
                "baseline_financial_impact": -97_000_000,
                "mitigated_financial_impact": -35_000_000,
                "net_savings": 62_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 1,
                "dependencies": "Резерв Аксуской ГРЭС, договор с ЕЭС России",
                "risks": {"frequency_risk": "Возможно дальнейшее снижение при росте нагрузки"},
                "ai_generated": True,
                "ai_confidence_score": 0.88,
                "ai_ranking": 1,
                "status": "draft",
            },
            {
                "scenario_name": "АЧР + ограничение крупных потребителей",
                "scenario_type": "demand_response",
                "description": "Отключение 320 МВт нагрузки по АЧР в Южной зоне, ограничение 5 крупнейших промпредприятий по регламенту ДП.",
                "strategy_details": {"achr_shed_mw": 320, "industrial_cut_enterprises": 5},
                "baseline_financial_impact": -97_000_000,
                "mitigated_financial_impact": -55_000_000,
                "net_savings": 42_000_000,
                "execution_complexity": "low",
                "execution_timeline_days": 0,
                "dependencies": "Готовность систем АЧР, договора на ограничение",
                "risks": {"social_risk": "Недовольство потребителей, штрафы за ограничения"},
                "ai_generated": True,
                "ai_confidence_score": 0.82,
                "ai_ranking": 2,
                "status": "draft",
            },
        ],
    )

    # 2. Авария на ВЛ 500кВ Карагандинская–Алматинская (КарАл-сечение)
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "catastrophic",
            "status": "scenarios_ready",
            "title": "Авария ВЛ 500кВ «Карагандинская–Алматинская»: потеря транзита Север–Юг",
            "description": "Обрыв грозотроса и КЗ на ВЛ 500кВ в районе Балхаша. Потеря 1 240 МВт транзита из Северной в Южную зону. Дефицит мощности на Юге −840 МВт. Запуск АЧР, отключение 320 МВт нагрузки в Алматы и Шымкенте. Частота 49.62 Гц — угроза каскадного отключения.",
            "affected_asset_type": "transmission_line",
            "affected_asset_id": "VL500-KARAL",
            "affected_stage": "TRANSMISSION",
            "current_capacity": 1400,
            "impacted_capacity": 0,
            "capacity_loss": 1400,
            "capacity_loss_pct": 100,
            "event_start_datetime": dt.datetime(2026, 2, 8, 18, 15),
            "estimated_downtime_min_days": 3,
            "estimated_downtime_best_days": 7,
            "estimated_downtime_max_days": 14,
            "detected_by": "РЗА / ЕМС KEGOC",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"transit_loss_mw": 1240, "frequency_hz": 49.62, "achr_shed_mw": 320},
            "downstream_impact": {"south_deficit_mw": 840},
            "financial_impact": {"unserved_energy": -210_000_000, "emergency_import": -45_000_000, "total": -255_000_000},
        },
        [
            {
                "scenario_name": "Мобилизация Жамбылской ГРЭС + импорт из Кыргызстана",
                "scenario_type": "generation_compensation",
                "description": "Загрузка Жамбылской ГРЭС на 100%, запуск газотурбинных агрегатов, аварийный импорт из Кыргызской энергосистемы 200 МВт.",
                "strategy_details": {"zhambyl_gres_mw": 600, "kyrgyz_import_mw": 200},
                "baseline_financial_impact": -255_000_000,
                "mitigated_financial_impact": -80_000_000,
                "net_savings": 175_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 1,
                "dependencies": "Наличие газа для ГРЭС, договор с Кыргызстаном",
                "risks": {"gas_supply": "Возможна нехватка газа в зимний период"},
                "ai_generated": True,
                "ai_confidence_score": 0.75,
                "ai_ranking": 1,
                "status": "draft",
            },
            {
                "scenario_name": "Графики аварийного отключения + переток через Запад",
                "scenario_type": "demand_response",
                "description": "Веерные отключения 500 МВт в Южной зоне по графику ДП, увеличение перетока Запад→Юг через Кызылординское сечение.",
                "strategy_details": {"rolling_blackout_mw": 500, "west_transit_increase_mw": 180},
                "baseline_financial_impact": -255_000_000,
                "mitigated_financial_impact": -120_000_000,
                "net_savings": 135_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 0,
                "dependencies": "Координация с РЭК, резерв Западной зоны",
                "risks": {"social_impact": "Масштабные отключения в Алматы, социальное напряжение"},
                "ai_generated": True,
                "ai_confidence_score": 0.70,
                "ai_ranking": 2,
                "status": "draft",
            },
        ],
    )

    # 3. ПС 500кВ Алматинская — перегрузка трансформаторов
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "ПС 500кВ Алматинская: перегрузка АТ-1, отключение РЗА",
            "description": "Автотрансформатор АТ-1 (500/220 кВ, 501 МВА) отключён релейной защитой при загрузке 112%. Температура масла превысила 90°C. Потеря 500 МВт трансформаторной мощности на ключевом узле ЮВ Казахстана.",
            "affected_asset_type": "substation_500",
            "affected_asset_id": "PS500-ALMATY",
            "affected_stage": "TRANSMISSION",
            "current_capacity": 1600,
            "impacted_capacity": 1100,
            "capacity_loss": 500,
            "capacity_loss_pct": 31,
            "event_start_datetime": dt.datetime(2026, 7, 22, 14, 30),
            "estimated_downtime_min_days": 5,
            "estimated_downtime_best_days": 14,
            "estimated_downtime_max_days": 30,
            "detected_by": "РЗА / диспетчер МЭС Юга",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"transformer_loss_mva": 501, "overload_pct": 112},
            "downstream_impact": {"almaty_deficit_mw": 350},
            "financial_impact": {"unserved_energy": -62_000_000, "transformer_repair": -18_000_000, "total": -80_000_000},
        },
        [
            {
                "scenario_name": "Перераспределение нагрузки на ПС Восточная + Алатауская",
                "scenario_type": "grid_reconfiguration",
                "description": "Переключение питания на ПС 220кВ Восточная и Алатауская, ограничение нагрузки промышленных потребителей Алматы.",
                "strategy_details": {"redirect_ps": ["Восточная", "Алатауская"], "demand_limit_mw": 200},
                "baseline_financial_impact": -80_000_000,
                "mitigated_financial_impact": -28_000_000,
                "net_savings": 52_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 1,
                "dependencies": "Пропускная способность сети 220кВ, резерв ПС",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.85,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 4. Аномальная жара — пиковая нагрузка +15% в Южной зоне
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "climate",
            "severity": "critical",
            "status": "scenarios_ready",
            "title": "Аномальная жара: рост нагрузки +15% в Южной зоне (Алматы, Шымкент)",
            "description": "Волна жары +45°C в южных регионах. Массовое включение кондиционеров. Суммарный рост потребления +612 МВт сверх плана. Исчерпание резерва мощности, частота на грани 49.95 Гц.",
            "affected_asset_type": "distribution_zone",
            "affected_asset_id": "ZONE-SOUTH",
            "affected_stage": "CONSUMPTION",
            "current_capacity": 4800,
            "impacted_capacity": 4800,
            "capacity_loss": 0,
            "capacity_loss_pct": 0,
            "event_start_datetime": dt.datetime(2026, 7, 10, 12, 0),
            "estimated_downtime_min_days": 3,
            "estimated_downtime_best_days": 7,
            "estimated_downtime_max_days": 14,
            "detected_by": "Прогноз Казгидромет + EMS KEGOC",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"demand_surge_mw": 612, "reserve_remaining_mw": 85, "frequency_hz": 49.95},
            "financial_impact": {"import_cost": -32_000_000, "demand_response_cost": -8_000_000, "total": -40_000_000},
        },
        [
            {
                "scenario_name": "Увеличение импорта + ограничение потребителей по регламенту",
                "scenario_type": "demand_response",
                "description": "Импорт из РФ +380 МВт (максимум), ограничение крупных потребителей по регламенту диспетчерского плана на 3 ч в пик.",
                "strategy_details": {"russia_import_max_mw": 380, "demand_limit_hours": 3, "enterprises_limited": 12},
                "baseline_financial_impact": -40_000_000,
                "mitigated_financial_impact": -15_000_000,
                "net_savings": 25_000_000,
                "execution_complexity": "medium",
                "execution_timeline_days": 0,
                "dependencies": "Пропускная способность межгосударственных сечений, готовность потребителей",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.90,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 5. МАЭК (Актау) — аварийный останов реактора БН-350
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "technical",
            "severity": "catastrophic",
            "status": "scenarios_ready",
            "title": "МАЭК (Актау): аварийный останов энергоблока 380 МВт",
            "description": "Внеплановый останов энергоблока МАЭК из-за неисправности в парогенераторе. Потеря 380 МВт генерации в Западной зоне. Мангыстауская область полностью зависит от единственного источника. Угроза отключения опреснительных установок.",
            "affected_asset_type": "power_plant",
            "affected_asset_id": "MAEK-AKTAU",
            "affected_stage": "GENERATION",
            "current_capacity": 380,
            "impacted_capacity": 0,
            "capacity_loss": 380,
            "capacity_loss_pct": 100,
            "event_start_datetime": dt.datetime(2026, 3, 5, 2, 10),
            "estimated_downtime_min_days": 7,
            "estimated_downtime_best_days": 21,
            "estimated_downtime_max_days": 45,
            "detected_by": "АСУ ТП МАЭК",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"capacity_loss_mw": 380, "desalination_risk": True, "water_supply_days": 3},
            "downstream_impact": {"mangystau_deficit_mw": 380},
            "financial_impact": {"unserved_energy": -120_000_000, "water_crisis_cost": -45_000_000, "total": -165_000_000},
        },
        [
            {
                "scenario_name": "Аварийный транзит из Актобе + мобильные ГТУ",
                "scenario_type": "generation_compensation",
                "description": "Увеличение перетока из Актюбинской зоны на 200 МВт, развёртывание мобильных ГТУ (2×25 МВт) для опреснительных установок.",
                "strategy_details": {"aktobe_transit_mw": 200, "mobile_gtu_mw": 50},
                "baseline_financial_impact": -165_000_000,
                "mitigated_financial_impact": -60_000_000,
                "net_savings": 105_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 2,
                "dependencies": "Пропускная способность ВЛ 220кВ Актобе–Мангыстау, наличие мобильных ГТУ",
                "risks": {"water_crisis": "Без опреснения водоснабжение Актау прекратится через 3 дня"},
                "ai_generated": True,
                "ai_confidence_score": 0.72,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 6. Кибератака на SCADA KEGOC
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "geopolitical",
            "severity": "catastrophic",
            "status": "scenarios_ready",
            "title": "Кибератака на систему EMS/SCADA KEGOC: потеря телеуправления",
            "description": "Обнаружено вредоносное ПО в системе EMS/SCADA центрального диспетчерского пункта. Потеря дистанционного управления 14 ПС 500кВ. Переход на ручное управление через территориальные МЭС. Риск несогласованных действий и каскадных отключений.",
            "affected_asset_type": "substation_500",
            "affected_asset_id": "EMS-KEGOC-CENTRAL",
            "affected_stage": "TRANSMISSION",
            "current_capacity": 18500,
            "impacted_capacity": 18500,
            "capacity_loss": 0,
            "capacity_loss_pct": 0,
            "event_start_datetime": dt.datetime(2026, 5, 18, 22, 0),
            "estimated_downtime_min_days": 1,
            "estimated_downtime_best_days": 3,
            "estimated_downtime_max_days": 7,
            "detected_by": "SOC KEGOC / CERT",
            "created_by": "Служба ИБ",
        },
        {
            "status": "done",
            "direct_impact": {"substations_affected": 14, "manual_control": True, "cascade_risk": "high"},
            "financial_impact": {"incident_response": -25_000_000, "cyber_insurance": -5_000_000, "total": -30_000_000},
        },
        [
            {
                "scenario_name": "Изоляция сегмента + ручное управление через МЭС",
                "scenario_type": "cybersecurity",
                "description": "Изоляция заражённого сегмента сети, переход на голосовое управление через территориальные МЭС. Восстановление EMS из резервной копии.",
                "strategy_details": {"isolate_segment": True, "manual_dispatch": True, "backup_restore_hours": 8},
                "baseline_financial_impact": -30_000_000,
                "mitigated_financial_impact": -12_000_000,
                "net_savings": 18_000_000,
                "execution_complexity": "high",
                "execution_timeline_days": 3,
                "dependencies": "Квалификация персонала МЭС, наличие резервных копий EMS",
                "risks": {"human_error": "Ручное управление 14 ПС повышает риск ошибки оператора"},
                "ai_generated": True,
                "ai_confidence_score": 0.65,
                "ai_ranking": 1,
                "status": "draft",
            },
        ],
    )

    # 7. Массовый выход ВИЭ — резкое падение ветрогенерации
    add_event_with_analysis_and_scenarios(
        {
            "event_type": "climate",
            "severity": "medium",
            "status": "scenarios_ready",
            "title": "Штиль в Северной зоне: падение ветрогенерации на 85%",
            "description": "Антициклон над Центральным Казахстаном. Скорость ветра <3 м/с в течение 48 часов. Выработка ВЭС снизилась с 380 МВт до 57 МВт (−323 МВт). Совпало с плановым ремонтом блока на ГРЭС-2 Экибастуз.",
            "affected_asset_type": "power_plant",
            "affected_asset_id": "VES-NORTH-ZONE",
            "affected_stage": "GENERATION",
            "current_capacity": 380,
            "impacted_capacity": 57,
            "capacity_loss": 323,
            "capacity_loss_pct": 85,
            "event_start_datetime": dt.datetime(2026, 8, 15, 6, 0),
            "estimated_downtime_min_days": 1,
            "estimated_downtime_best_days": 2,
            "estimated_downtime_max_days": 4,
            "detected_by": "Метеослужба + EMS KEGOC",
            "created_by": "НДЦ СО",
        },
        {
            "status": "done",
            "direct_impact": {"ves_output_drop_mw": 323, "coincident_gres2_repair_mw": 500},
            "financial_impact": {"balancing_market_cost": -8_000_000, "total": -8_000_000},
        },
        [
            {
                "scenario_name": "Балансирование за счёт ГЭС + угольных блоков",
                "scenario_type": "generation_compensation",
                "description": "Увеличение выработки ГЭС на каскаде Иртыша на 150 МВт, вывод из холодного резерва блока №2 Аксуской ГРЭС.",
                "strategy_details": {"irtysh_hydro_increase_mw": 150, "aksu_cold_start_mw": 200},
                "baseline_financial_impact": -8_000_000,
                "mitigated_financial_impact": -3_000_000,
                "net_savings": 5_000_000,
                "execution_complexity": "low",
                "execution_timeline_days": 0,
                "dependencies": "Водные ресурсы каскада, готовность блока к пуску",
                "risks": {},
                "ai_generated": True,
                "ai_confidence_score": 0.92,
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
