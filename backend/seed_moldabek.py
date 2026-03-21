"""
Тестовые данные для м/р Восточный Молдабек (id=61):
  - 3 горизонта (пласта-горизонта)
  - 5 пластов
  - 5 зон дренирования
  - 10 скважин (7 доб., 2 нагн., 1 набл.)
  - Текущие показатели добычи
  - Годовой план на 2026

Запуск: python3 seed_moldabek.py
"""
import os, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL не найден в .env!"); sys.exit(1)

engine = create_engine(DATABASE_URL)
OIL_FIELD_ID = 61  # Восточный Молдабек


def run():
    with engine.connect() as c:

        # ── 0. Проверка ──────────────────────────────────────────────────────
        name = c.execute(text("SELECT name FROM oil_fields WHERE id=:id"), {"id": OIL_FIELD_ID}).scalar()
        if not name:
            print(f"❌ Месторождение с id={OIL_FIELD_ID} не найдено!"); return
        print(f"✅ Месторождение: {name} (id={OIL_FIELD_ID})")

        existing_wells = c.execute(
            text("SELECT COUNT(*) FROM wells WHERE oil_field_id=:id"), {"id": OIL_FIELD_ID}
        ).scalar()
        if existing_wells:
            print(f"⚠️  Данные уже есть ({existing_wells} скважин). Удалите вручную или пропустите.")

        # ── 1. Горизонты ─────────────────────────────────────────────────────
        horizons = [
            dict(
                code="YUK-1", name="Юрский комплекс ЮК-1",
                depth_top=980.0, depth_bottom=1240.0,
                stratigraphic_age="Юра (келловей-оксфорд)",
                lithology="Песчаник мелкозернистый, алевролит",
                porosity=0.21, permeability=85.0, effective_thickness=18.5,
            ),
            dict(
                code="NEO-1", name="Неокомский комплекс НК-1",
                depth_top=1260.0, depth_bottom=1540.0,
                stratigraphic_age="Мел нижний (неоком)",
                lithology="Песчаник среднезернистый, карбонатный цемент",
                porosity=0.18, permeability=62.0, effective_thickness=14.2,
            ),
            dict(
                code="APT-1", name="Аптский горизонт АПТ-1",
                depth_top=820.0, depth_bottom=950.0,
                stratigraphic_age="Мел (апт)",
                lithology="Алевролит, глинистый песчаник",
                porosity=0.15, permeability=35.0, effective_thickness=9.8,
            ),
        ]

        horizon_ids = {}
        for h in horizons:
            c.execute(text("""
                INSERT INTO reservoir_horizons
                    (oil_field_id, code, name, depth_top, depth_bottom,
                     stratigraphic_age, lithology, porosity, permeability, effective_thickness)
                VALUES
                    (:oil_field_id, :code, :name, :depth_top, :depth_bottom,
                     :stratigraphic_age, :lithology, :porosity, :permeability, :effective_thickness)
                ON CONFLICT (oil_field_id, name) DO UPDATE SET
                    code=EXCLUDED.code, depth_top=EXCLUDED.depth_top,
                    depth_bottom=EXCLUDED.depth_bottom, porosity=EXCLUDED.porosity,
                    permeability=EXCLUDED.permeability, effective_thickness=EXCLUDED.effective_thickness
                RETURNING id
            """), {"oil_field_id": OIL_FIELD_ID, **h})
            c.commit()
            hid = c.execute(text("SELECT id FROM reservoir_horizons WHERE oil_field_id=:f AND code=:c"),
                            {"f": OIL_FIELD_ID, "c": h["code"]}).scalar()
            horizon_ids[h["code"]] = hid
            print(f"  Горизонт: {h['name']} → id={hid}")

        # ── 2. Пласты ────────────────────────────────────────────────────────
        formations_data = [
            dict(horizon_code="YUK-1", code="EM-YUK1A", name="Пласт ЮК-1А",
                 depth_top=990.0,  depth_bottom=1080.0,
                 area=4.8, average_thickness=24.0, effective_thickness=19.2,
                 net_to_gross=0.80, porosity=0.222, permeability=92.0,
                 saturation_oil=0.68, saturation_water=0.32, saturation_gas=None,
                 viscosity_oil=4.8, density_oil=0.863,
                 formation_volume_factor=1.08, gas_oil_ratio=28.0,
                 initial_pressure=112.0, initial_temperature=46.0,
                 reserves_geological=8.4, reserves_recoverable=3.8, recovery_factor=0.45),
            dict(horizon_code="YUK-1", code="EM-YUK1B", name="Пласт ЮК-1Б",
                 depth_top=1100.0, depth_bottom=1180.0,
                 area=3.2, average_thickness=18.0, effective_thickness=14.4,
                 net_to_gross=0.80, porosity=0.198, permeability=74.0,
                 saturation_oil=0.64, saturation_water=0.36, saturation_gas=None,
                 viscosity_oil=5.2, density_oil=0.871,
                 formation_volume_factor=1.06, gas_oil_ratio=22.0,
                 initial_pressure=118.0, initial_temperature=47.0,
                 reserves_geological=4.9, reserves_recoverable=2.1, recovery_factor=0.43),
            dict(horizon_code="NEO-1", code="EM-NK1A", name="Пласт НК-1А",
                 depth_top=1280.0, depth_bottom=1390.0,
                 area=5.6, average_thickness=30.0, effective_thickness=22.5,
                 net_to_gross=0.75, porosity=0.185, permeability=68.0,
                 saturation_oil=0.61, saturation_water=0.39, saturation_gas=None,
                 viscosity_oil=6.1, density_oil=0.878,
                 formation_volume_factor=1.05, gas_oil_ratio=18.0,
                 initial_pressure=135.0, initial_temperature=52.0,
                 reserves_geological=11.2, reserves_recoverable=4.5, recovery_factor=0.40),
            dict(horizon_code="NEO-1", code="EM-NK1B", name="Пласт НК-1Б",
                 depth_top=1420.0, depth_bottom=1510.0,
                 area=2.9, average_thickness=14.5, effective_thickness=11.2,
                 net_to_gross=0.77, porosity=0.172, permeability=51.0,
                 saturation_oil=0.59, saturation_water=0.41, saturation_gas=None,
                 viscosity_oil=6.8, density_oil=0.884,
                 formation_volume_factor=1.04, gas_oil_ratio=15.0,
                 initial_pressure=142.0, initial_temperature=54.0,
                 reserves_geological=6.1, reserves_recoverable=2.4, recovery_factor=0.39),
            dict(horizon_code="APT-1", code="EM-APT1", name="Пласт АПТ-1",
                 depth_top=830.0, depth_bottom=940.0,
                 area=2.1, average_thickness=12.0, effective_thickness=9.0,
                 net_to_gross=0.75, porosity=0.154, permeability=38.0,
                 saturation_oil=0.55, saturation_water=0.45, saturation_gas=None,
                 viscosity_oil=7.4, density_oil=0.891,
                 formation_volume_factor=1.03, gas_oil_ratio=11.0,
                 initial_pressure=96.0, initial_temperature=41.0,
                 reserves_geological=3.2, reserves_recoverable=1.2, recovery_factor=0.37),
        ]

        formation_ids = {}
        for f in formations_data:
            h_id = horizon_ids[f["horizon_code"]]
            c.execute(text("""
                INSERT INTO reservoir_formations
                    (oil_field_id, horizon_id, code, name, depth_top, depth_bottom,
                     area, average_thickness, effective_thickness, net_to_gross,
                     porosity, permeability, saturation_oil, saturation_water, saturation_gas,
                     viscosity_oil, density_oil, formation_volume_factor, gas_oil_ratio,
                     initial_pressure, initial_temperature,
                     reserves_geological, reserves_recoverable, recovery_factor)
                VALUES
                    (:oil_field_id, :h_id, :code, :name, :depth_top, :depth_bottom,
                     :area, :average_thickness, :effective_thickness, :net_to_gross,
                     :porosity, :permeability, :saturation_oil, :saturation_water, :saturation_gas,
                     :viscosity_oil, :density_oil, :formation_volume_factor, :gas_oil_ratio,
                     :initial_pressure, :initial_temperature,
                     :reserves_geological, :reserves_recoverable, :recovery_factor)
                ON CONFLICT (oil_field_id, code) DO UPDATE SET name=EXCLUDED.name
                RETURNING id
            """), {"oil_field_id": OIL_FIELD_ID, "h_id": h_id,
                   "average_thickness": f["average_thickness"], **{k: v for k, v in f.items() if k != "horizon_code"}})
            c.commit()
            fid = c.execute(text("SELECT id FROM reservoir_formations WHERE oil_field_id=:f AND code=:c"),
                            {"f": OIL_FIELD_ID, "c": f["code"]}).scalar()
            formation_ids[f["code"]] = fid
            print(f"  Пласт: {f['name']} → id={fid}")

        # ── 3. Зоны дренирования ─────────────────────────────────────────────
        zones_data = [
            dict(formation_code="EM-YUK1A", code="ZN-YUK1A-C", name="Центральный блок ЮК-1А",
                 geometry_type="circle", geometry_radius=950.0,
                 current_state="production", current_pressure=88.0, current_production_rate=42.5,
                 reserves_initial=3.8, reserves_remaining=2.6, reserves_produced=1.2,
                 development_stage="active", current_kin=0.316, target_kin=0.45),
            dict(formation_code="EM-YUK1A", code="ZN-YUK1A-N", name="Северный блок ЮК-1А",
                 geometry_type="circle", geometry_radius=720.0,
                 current_state="production", current_pressure=79.0, current_production_rate=28.0,
                 reserves_initial=2.1, reserves_remaining=1.5, reserves_produced=0.6,
                 development_stage="active", current_kin=0.286, target_kin=0.42),
            dict(formation_code="EM-YUK1B", code="ZN-YUK1B-C", name="Центральный блок ЮК-1Б",
                 geometry_type="circle", geometry_radius=820.0,
                 current_state="production", current_pressure=91.0, current_production_rate=19.5,
                 reserves_initial=2.1, reserves_remaining=1.6, reserves_produced=0.5,
                 development_stage="active", current_kin=0.238, target_kin=0.43),
            dict(formation_code="EM-NK1A", code="ZN-NK1A-C", name="Центральный блок НК-1А",
                 geometry_type="circle", geometry_radius=1100.0,
                 current_state="production", current_pressure=104.0, current_production_rate=35.0,
                 reserves_initial=4.5, reserves_remaining=3.5, reserves_produced=1.0,
                 development_stage="active", current_kin=0.222, target_kin=0.40),
            dict(formation_code="EM-NK1B", code="ZN-NK1B-C", name="Центральный блок НК-1Б",
                 geometry_type="circle", geometry_radius=680.0,
                 current_state="production", current_pressure=115.0, current_production_rate=14.0,
                 reserves_initial=2.4, reserves_remaining=2.0, reserves_produced=0.4,
                 development_stage="early", current_kin=0.167, target_kin=0.39),
        ]

        zone_ids = {}
        for z in zones_data:
            f_id = formation_ids[z["formation_code"]]
            c.execute(text("""
                INSERT INTO reservoir_drainage_zones
                    (oil_field_id, formation_id, code, name, geometry_type, geometry_radius,
                     current_state, current_pressure, current_production_rate,
                     reserves_initial, reserves_remaining, reserves_produced,
                     development_stage, current_kin, target_kin)
                VALUES
                    (:oil_field_id, :f_id, :code, :name, :geometry_type, :geometry_radius,
                     :current_state, :current_pressure, :current_production_rate,
                     :reserves_initial, :reserves_remaining, :reserves_produced,
                     :development_stage, :current_kin, :target_kin)
                ON CONFLICT (oil_field_id, code) DO UPDATE SET name=EXCLUDED.name
                RETURNING id
            """), {"oil_field_id": OIL_FIELD_ID, "f_id": f_id,
                   **{k: v for k, v in z.items() if k != "formation_code"}})
            c.commit()
            zid = c.execute(text("SELECT id FROM reservoir_drainage_zones WHERE oil_field_id=:f AND code=:c"),
                            {"f": OIL_FIELD_ID, "c": z["code"]}).scalar()
            zone_ids[z["code"]] = zid
            print(f"  Зона: {z['name']} → id={zid}")

        # ── 4. Скважины ──────────────────────────────────────────────────────
        # latitude/longitude ~ Мангистауская обл. (44°N, 52°E)
        wells_data = [
            # Добывающие
            dict(name="5601", well_type="production", status="active",
                 lat=44.1520, lon=52.3810, depth=1148.0,
                 formation_code="EM-YUK1A", zone_code="ZN-YUK1A-C"),
            dict(name="5602", well_type="production", status="active",
                 lat=44.1548, lon=52.3852, depth=1155.0,
                 formation_code="EM-YUK1A", zone_code="ZN-YUK1A-C"),
            dict(name="5603", well_type="production", status="active",
                 lat=44.1495, lon=52.3780, depth=1142.0,
                 formation_code="EM-YUK1A", zone_code="ZN-YUK1A-N"),
            dict(name="5604", well_type="production", status="active",
                 lat=44.1460, lon=52.3740, depth=1138.0,
                 formation_code="EM-YUK1A", zone_code="ZN-YUK1A-N"),
            dict(name="5605", well_type="production", status="inactive",
                 lat=44.1580, lon=52.3900, depth=1162.0,
                 formation_code="EM-YUK1B", zone_code="ZN-YUK1B-C"),
            dict(name="5606", well_type="production", status="active",
                 lat=44.1610, lon=52.3950, depth=1175.0,
                 formation_code="EM-YUK1B", zone_code="ZN-YUK1B-C"),
            dict(name="5607", well_type="production", status="active",
                 lat=44.1440, lon=52.3690, depth=1358.0,
                 formation_code="EM-NK1A", zone_code="ZN-NK1A-C"),
            # Нагнетательные
            dict(name="5608", well_type="injection", status="active",
                 lat=44.1560, lon=52.3870, depth=1168.0,
                 formation_code="EM-YUK1A", zone_code="ZN-YUK1A-C"),
            dict(name="5609", well_type="injection", status="active",
                 lat=44.1490, lon=52.3820, depth=1365.0,
                 formation_code="EM-NK1A", zone_code="ZN-NK1A-C"),
            # Наблюдательная
            dict(name="5610", well_type="observation", status="active",
                 lat=44.1530, lon=52.3835, depth=1480.0,
                 formation_code="EM-NK1B", zone_code="ZN-NK1B-C"),
        ]

        inserted_wells = 0
        for w in wells_data:
            f_id = formation_ids[w["formation_code"]]
            z_id = zone_ids[w["zone_code"]]
            existing = c.execute(
                text("SELECT id FROM wells WHERE oil_field_id=:f AND name=:n"),
                {"f": OIL_FIELD_ID, "n": w["name"]}
            ).scalar()
            if existing:
                print(f"  Скважина {w['name']} уже существует, пропускаем")
                continue
            c.execute(text("""
                INSERT INTO wells
                    (name, oil_field_id, formation_id, zone_id, well_type,
                     status, latitude, longitude, depth_current)
                VALUES
                    (:name, :oil_field_id, :f_id, :z_id, :well_type,
                     :status, :lat, :lon, :depth)
            """), {"oil_field_id": OIL_FIELD_ID, "f_id": f_id, "z_id": z_id,
                   "name": w["name"], "well_type": w["well_type"],
                   "status": w["status"], "lat": w["lat"], "lon": w["lon"],
                   "depth": w["depth"]})
            inserted_wells += 1
        c.commit()
        print(f"\n  Создано скважин: {inserted_wells}")

        # ── 5. Текущие показатели месторождения ──────────────────────────────
        # Суммарная добыча: ~139 т/сут, ~4 170 т/мес, мощность ~200 т/сут
        c.execute(text("""
            UPDATE oil_fields
            SET capacity      = 200.0,
                current_day   = 139.0,
                current_month = 4170.0
            WHERE id = :id
        """), {"id": OIL_FIELD_ID})
        c.commit()
        print("  Обновлены текущие показатели: capacity=200, current_day=139, current_month=4170")

        # ── 6. Годовой план 2026 ─────────────────────────────────────────────
        import uuid, json
        plan_name = "Восточный Молдабек — план 2026"
        existing_plan = c.execute(
            text("SELECT id FROM annual_plans WHERE name=:n"), {"n": plan_name}
        ).scalar()

        if not existing_plan:
            plan_id = str(uuid.uuid4())
            c.execute(text("""
                INSERT INTO annual_plans (id, name, year, status, baseline_source, created_at)
                VALUES (:id, :name, 2026, 'approved', 'master-data', NOW())
            """), {"id": plan_id, "name": plan_name})

            scen_id = str(uuid.uuid4())
            c.execute(text("""
                INSERT INTO annual_plan_scenarios (id, plan_id, name, status, created_at)
                VALUES (:id, :plan_id, 'Базовый', 'approved', NOW())
            """), {"id": scen_id, "plan_id": plan_id})

            # Месячный план добычи по м/р (тонн): слегка снижается к концу года
            monthly_plan = [4500, 4480, 4460, 4440, 4420, 4400,
                            4380, 4360, 4340, 4320, 4300, 4280]

            c.execute(text("""
                INSERT INTO annual_plan_lines
                    (scenario_id, stage, asset_type, asset_code, asset_name, capacity, monthly_plan, notes)
                VALUES
                    (:scen_id, 'UP', 'oil_field', 'EMG_VMOLD', 'Восточный Молдабек',
                     200.0, :monthly_plan, 'Базовый план — органическая добыча')
            """), {"scen_id": scen_id, "monthly_plan": json.dumps(monthly_plan)})

            c.commit()
            print(f"  Создан план 2026: id={plan_id}")
        else:
            print(f"  План 2026 уже существует: id={existing_plan}")

        # ── Итог ─────────────────────────────────────────────────────────────
        print("\n" + "="*55)
        print(f"✅ Восточный Молдабек — данные загружены успешно!")
        hz_cnt = c.execute(text("SELECT COUNT(*) FROM reservoir_horizons WHERE oil_field_id=:id"), {"id": OIL_FIELD_ID}).scalar()
        fm_cnt = c.execute(text("SELECT COUNT(*) FROM reservoir_formations WHERE oil_field_id=:id"), {"id": OIL_FIELD_ID}).scalar()
        zn_cnt = c.execute(text("SELECT COUNT(*) FROM reservoir_drainage_zones WHERE oil_field_id=:id"), {"id": OIL_FIELD_ID}).scalar()
        wl_cnt = c.execute(text("SELECT COUNT(*) FROM wells WHERE oil_field_id=:id"), {"id": OIL_FIELD_ID}).scalar()
        print(f"  Горизонтов: {hz_cnt}")
        print(f"  Пластов:    {fm_cnt}")
        print(f"  Зон:        {zn_cnt}")
        print(f"  Скважин:    {wl_cnt}")
        print("="*55)


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        import traceback
        print(f"\n❌ Ошибка: {e}")
        traceback.print_exc()
        sys.exit(1)
