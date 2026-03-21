"""
Скрипт для добавления данных АО "Эмбамунайгаз":
 - extraction_company: ЭМГ
 - 4 НГДУ
 - 17 месторождений
 - workspace_scope обновляется для КМГ → "all"
 - workspace для admin-пользователя привязывается к обоим компаниям

Запуск: python seed_emg_data.py
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL не найден в .env!")
    sys.exit(1)

print(f"🔌 Подключение к: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'БД'}")


def seed():
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # -------------------------------------------------
        # 0. Проверить/добавить столбец workspace_scope
        # -------------------------------------------------
        conn.execute(text("""
            ALTER TABLE extraction_companies
            ADD COLUMN IF NOT EXISTS workspace_scope VARCHAR(20) NOT NULL DEFAULT 'own'
        """))

        # -------------------------------------------------
        # 1. Получить/создать КМГ — scope = "all"
        # -------------------------------------------------
        kmg = conn.execute(
            text("SELECT id FROM extraction_companies WHERE code = 'KMG' LIMIT 1")
        ).fetchone()
        if kmg:
            kmg_id = kmg[0]
            conn.execute(
                text("UPDATE extraction_companies SET workspace_scope = 'all' WHERE id = :id"),
                {"id": kmg_id},
            )
            print(f"✅ КМГ id={kmg_id}, workspace_scope→all")
        else:
            r = conn.execute(
                text("""
                    INSERT INTO extraction_companies (code, name, short_name, capacity, current_month, current_day, region, status, workspace_scope)
                    VALUES ('KMG', 'АО НК "Казмунайгаз"', 'КМГ', 100.0, 80.0, 2.7, 'Казахстан', 'active', 'all')
                    RETURNING id
                """)
            )
            kmg_id = r.fetchone()[0]
            print(f"✅ КМГ создан id={kmg_id}")

        # -------------------------------------------------
        # 2. Создать ЭМГ
        # -------------------------------------------------
        emg = conn.execute(
            text("SELECT id FROM extraction_companies WHERE code = 'EMG' LIMIT 1")
        ).fetchone()
        if emg:
            emg_id = emg[0]
            conn.execute(
                text("UPDATE extraction_companies SET workspace_scope = 'own' WHERE id = :id"),
                {"id": emg_id},
            )
            print(f"✅ ЭМГ уже существует id={emg_id}")
        else:
            r = conn.execute(
                text("""
                    INSERT INTO extraction_companies (code, name, short_name, capacity, current_month, current_day, region, status, workspace_scope)
                    VALUES ('EMG', 'АО "Эмбамунайгаз"', 'ЭМГ', 44.0, 36.0, 1.2, 'Атырауская область', 'active', 'own')
                    RETURNING id
                """)
            )
            emg_id = r.fetchone()[0]
            print(f"✅ ЭМГ создан id={emg_id}")

        # -------------------------------------------------
        # 3. Создать таблицу ngdus (если ещё нет — миграция)
        # -------------------------------------------------
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ngdus (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(200) NOT NULL,
                short_name VARCHAR(100),
                region VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                extraction_company_id INTEGER REFERENCES extraction_companies(id) ON DELETE SET NULL
            )
        """))

        # -------------------------------------------------
        # 4. Создать 4 НГДУ Эмбамунайгаз
        # -------------------------------------------------
        ngdus = [
            ("ZHAIYK", "НГДУ «Жайыкмунайгаз»", "Жайыкмунайгаз", "Западно-Казахстанская область"),
            ("ZHYLOY", "НГДУ «Жылыоймунайгаз»", "Жылыоймунайгаз", "Атырауская область"),
            ("DOSSOR", "НГДУ «Доссормунайгаз»", "Доссормунайгаз", "Атырауская область"),
            ("KAYNAR", "НГДУ «Кайнармунайгаз»", "Кайнармунайгаз", "Атырауская область"),
        ]
        ngdu_ids: dict[str, int] = {}
        for code, name, short_name, region in ngdus:
            existing = conn.execute(
                text("SELECT id FROM ngdus WHERE code = :code LIMIT 1"), {"code": code}
            ).fetchone()
            if existing:
                ngdu_ids[code] = existing[0]
                print(f"  ↪ НГДУ {short_name} уже есть id={existing[0]}")
            else:
                r = conn.execute(
                    text("""
                        INSERT INTO ngdus (code, name, short_name, region, status, extraction_company_id)
                        VALUES (:code, :name, :short_name, :region, 'active', :ec_id)
                        RETURNING id
                    """),
                    {"code": code, "name": name, "short_name": short_name, "region": region, "ec_id": emg_id},
                )
                ngdu_ids[code] = r.fetchone()[0]
                print(f"  ✅ НГДУ {short_name} создан id={ngdu_ids[code]}")

        # -------------------------------------------------
        # 5. Добавить столбец ngdu_id в oil_fields (если нет)
        # -------------------------------------------------
        conn.execute(text("""
            ALTER TABLE oil_fields
            ADD COLUMN IF NOT EXISTS ngdu_id INTEGER REFERENCES ngdus(id) ON DELETE SET NULL
        """))

        # -------------------------------------------------
        # 6. Создать 17 месторождений ЭМГ
        # -------------------------------------------------
        fields = [
            # (code, name, short_name, ngdu_code, cap, cur_month, cur_day)
            ("EMG_BALG",   "С. Балгимбаев",       "С. Балгимбаев",     "ZHAIYK", 1.2,  0.749, 0.025),
            ("EMG_KYZ",    "Камышитовый Ю.З.",     "Камышит. Ю.З.",     "ZHAIYK", 8.0,  5.136, 0.171),
            ("EMG_KYV",    "Камышитовый Ю.В.",     "Камышит. Ю.В.",     "ZHAIYK", 9.0,  5.958, 0.199),
            ("EMG_ZHAN",   "Жаналап",              "Жаналап",           "ZHAIYK", 10.0, 6.848, 0.228),
            ("EMG_GRAN",   "Гран",                 "Гран",              "ZHAIYK", 2.5,  1.464, 0.049),
            ("EMG_YUVN",   "ЮВ Новобогатинское",   "ЮВ Новобогатин.",   "ZHAIYK", 6.5,  4.110, 0.137),
            ("EMG_NURZ",   "С. Нуржанов",          "С. Нуржанов",       "ZHYLOY", 20.0, 13.752, 0.458),
            ("EMG_DOSM",   "Досмухамбетовское",    "Досмухамбет.",      "ZHYLOY", 9.0,  6.048, 0.202),
            ("EMG_TER",    "Терень-Узек",          "Терень-Узек",       "ZHYLOY", 1.5,  0.796, 0.027),
            ("EMG_MAKAT",  "В. Макат",             "В. Макат",          "DOSSOR", 6.0,  3.528, 0.118),
            ("EMG_BOTAH",  "Ботахан",              "Ботахан",           "DOSSOR", 3.0,  1.832, 0.061),
            ("EMG_ALT",    "Алтыкуль",             "Алтыкуль",          "DOSSOR", 2.5,  1.496, 0.050),
            ("EMG_KOSH",   "Кошкар",               "Кошкар",            "DOSSOR", 0.8,  0.380, 0.013),
            ("EMG_ZHOL",   "Б. Жоламанов",         "Б. Жоламанов",      "KAYNAR", 4.5,  2.672, 0.089),
            ("EMG_UAZ",    "Уаз",                  "Уаз",               "KAYNAR", 1.8,  0.980, 0.033),
            ("EMG_UAZV",   "Уаз Восточный",        "Уаз Восточный",     "KAYNAR", 10.0, 6.471, 0.216),
            ("EMG_UAZS",   "Уаз Северный",         "Уаз Северный",      "KAYNAR", 2.5,  1.544, 0.051),
            ("EMG_VMOLD",  "Восточный Молдабек",   "В. Молдабек",       "KAYNAR", 3.2,  2.010, 0.067),
        ]

        for code, name, short_name, ngdu_code, cap, cur_month, cur_day in fields:
            ngdu_id = ngdu_ids.get(ngdu_code)
            existing = conn.execute(
                text("SELECT id FROM oil_fields WHERE code = :code LIMIT 1"), {"code": code}
            ).fetchone()
            if existing:
                conn.execute(
                    text("""
                        UPDATE oil_fields
                        SET ngdu_id = :ngdu_id, extraction_company_id = :ec_id
                        WHERE id = :id
                    """),
                    {"ngdu_id": ngdu_id, "ec_id": emg_id, "id": existing[0]},
                )
                print(f"  ↪ Месторождение {name} обновлено")
            else:
                conn.execute(
                    text("""
                        INSERT INTO oil_fields (code, name, short_name, capacity, current_month, current_day, region, status, extraction_company_id, ngdu_id)
                        VALUES (:code, :name, :short_name, :cap, :cur_month, :cur_day, 'Казахстан', 'active', :ec_id, :ngdu_id)
                    """),
                    {
                        "code": code, "name": name, "short_name": short_name,
                        "cap": cap, "cur_month": cur_month, "cur_day": cur_day,
                        "ec_id": emg_id, "ngdu_id": ngdu_id,
                    },
                )
                print(f"  ✅ Месторождение {name} создано")

        # -------------------------------------------------
        # 7. Таблица user_workspaces (если нет)
        # -------------------------------------------------
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_workspaces (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                extraction_company_id INTEGER NOT NULL REFERENCES extraction_companies(id) ON DELETE CASCADE,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                CONSTRAINT uq_user_workspace UNIQUE (user_id, extraction_company_id)
            )
        """))

        # active_workspace_id on users
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS active_workspace_id INTEGER REFERENCES extraction_companies(id) ON DELETE SET NULL
        """))

        # -------------------------------------------------
        # 8. Привязать admin-пользователя к обоим workspaces
        # -------------------------------------------------
        admin_user = conn.execute(
            text("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
        ).fetchone()
        if admin_user:
            admin_id = admin_user[0]
            for ec_id_val, is_default in [(kmg_id, True), (emg_id, False)]:
                conn.execute(
                    text("""
                        INSERT INTO user_workspaces (user_id, extraction_company_id, is_default)
                        VALUES (:uid, :ec_id, :def)
                        ON CONFLICT (user_id, extraction_company_id) DO NOTHING
                    """),
                    {"uid": admin_id, "ec_id": ec_id_val, "def": is_default},
                )
            # Set default active workspace for admin → КМГ
            conn.execute(
                text("UPDATE users SET active_workspace_id = :ec_id WHERE id = :uid"),
                {"ec_id": kmg_id, "uid": admin_id},
            )
            print(f"✅ Admin (id={admin_id}) привязан к КМГ и ЭМГ workspaces")
        else:
            print("⚠️  Пользователь admin не найден — workspace не привязан")

        conn.commit()
        print("\n🎉 Данные ЭМГ успешно загружены!")


if __name__ == "__main__":
    seed()
