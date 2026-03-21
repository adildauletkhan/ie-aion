import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Получаем DATABASE_URL из переменных окружения Railway
DATABASE_URL = os.getenv("DATABASE_URL")

# Railway использует postgres://, но SQLAlchemy требует postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Создаем engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Проверка соединения перед использованием
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()