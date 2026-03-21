"""
Скрипт для добавления тестовых данных в БД
Запуск: python seed_test_data.py
"""
import os
import sys
from pathlib import Path

# Добавляем путь к приложению
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text

# Загружаем .env
from dotenv import load_dotenv
load_dotenv()

# Database URL из .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL не найден в .env файле!")
    sys.exit(1)

print(f"🔌 Подключение к: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'БД'}")

def seed_data():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Проверяем существующие данные
        result = conn.execute(text("SELECT COUNT(*) FROM oil_fields"))
        count = result.scalar()
        
        print(f"📊 Текущее количество месторождений: {count}")
        
        if count > 0:
            print("✅ Данные уже есть в базе!")
            result = conn.execute(text("SELECT id, code, name FROM oil_fields LIMIT 5"))
            print("\n📋 Существующие месторождения:")
            for row in result:
                print(f"  - ID {row.id}: {row.name} ({row.code})")
            return
        
        print("\n🔄 Добавляем тестовые данные...")
        
        # Сначала добавляем добывающую компанию (нужна для FK в oil_fields)
        conn.execute(
            text("""
                INSERT INTO extraction_companies (code, name, short_name, capacity, current_month, current_day, region, status)
                SELECT 'KMG', 'КазМунайГаз', 'КМГ', 100000, 8000, 270, 'Казахстан', 'active'
                WHERE NOT EXISTS (SELECT 1 FROM extraction_companies WHERE code = 'KMG')
            """)
        )
        conn.commit()
        r = conn.execute(text("SELECT id FROM extraction_companies WHERE code = 'KMG'"))
        row = r.fetchone()
        company_id = row[0] if row else None

        # Добавляем тестовые месторождения (capacity, current_month, current_day — NOT NULL)
        test_fields = [
            ("TENGIZ", "Тенгиз", "Тенгиз"),
            ("KASHAGAN", "Кашаган", "Кашаган"),
            ("KARACHAGANAK", "Карачаганак", "КГК"),
            ("UZEN", "Узень", "Узень"),
            ("ZHETYBAI", "Жетыбай", "ЖБ"),
        ]
        
        for code, name, short_name in test_fields:
            conn.execute(
                text("""
                    INSERT INTO oil_fields (code, name, short_name, capacity, current_month, current_day, region, status, extraction_company_id)
                    SELECT :code, :name, :short_name, 50000, 4000, 135, 'Атырауская область', 'active', :company_id
                    WHERE NOT EXISTS (SELECT 1 FROM oil_fields WHERE code = :code)
                """),
                {"code": code, "name": name, "short_name": short_name, "company_id": company_id}
            )
        
        conn.commit()
        
        # Проверяем результат
        result = conn.execute(text("SELECT COUNT(*) FROM oil_fields"))
        new_count = result.scalar()
        
        print(f"\n✅ Добавлено месторождений: {new_count}")
        print("\n📋 Список:")
        result = conn.execute(text("SELECT id, code, name, short_name FROM oil_fields"))
        for row in result:
            print(f"  - ID {row.id}: {row.name} / {row.short_name} ({row.code})")
        
        print("\n🎉 Тестовые данные успешно добавлены!")
        print("Обновите страницу в браузере (Ctrl+R или Cmd+R)")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        print("\nПроверьте:")
        print("1. Запущен ли PostgreSQL")
        print("2. Правильные ли данные подключения в .env")
        print("3. Созданы ли таблицы (запустите alembic upgrade head)")
        sys.exit(1)
