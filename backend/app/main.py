import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend directory before anything else is imported
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.crud import field_scheme as field_crud
from app.crud.user import ensure_admin
from app.crud.role import get_by_name, create as create_role
from app.crud.company import get_all as get_all_companies, create as create_company
from app.db.base import Base
from app.db.session import SessionLocal, engine

settings = get_settings()

app = FastAPI(title="Capacity Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint - redirects to API documentation"""
    from fastapi.responses import HTMLResponse
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Capacity Navigator API</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
            }
            .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 500px;
            }
            h1 {
                color: #333;
                margin-bottom: 1rem;
            }
            p {
                color: #666;
                margin-bottom: 2rem;
                line-height: 1.6;
            }
            .btn {
                display: inline-block;
                padding: 0.75rem 2rem;
                margin: 0.5rem;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 600;
                transition: all 0.3s;
            }
            .btn:hover {
                background: #5568d3;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            .btn-secondary {
                background: #48bb78;
            }
            .btn-secondary:hover {
                background: #38a169;
            }
            .version {
                color: #999;
                font-size: 0.9rem;
                margin-top: 2rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Capacity Navigator API</h1>
            <p>Добро пожаловать в API Capacity Navigator.<br>Для работы с системой используйте документацию.</p>
            <a href="/docs" class="btn">📚 API Документация</a>
            <a href="/redoc" class="btn btn-secondary">📖 ReDoc</a>
            <p class="version">Powered by FastAPI</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


app.include_router(api_router)


def ensure_default_roles(db) -> None:
    for name in ("admin", "viewer", "manager"):
        if get_by_name(db, name) is None:
            create_role(db, name)


def ensure_default_companies(db) -> None:
    if get_all_companies(db):
        return
    for name, code in [
        ("Gravity AI", "GRAVITY"),
        ("Транспортная компания", "TRANS"),
        ("Добывающая компания", "EXTRACT"),
    ]:
        create_company(db, name=name, code=code)


def add_user_columns_if_missing(db) -> None:
    """Добавить колонки display_name, email, company_id в users, если их ещё нет (миграция)."""
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("users")} if "users" in insp.get_table_names() else set()
    if "display_name" in cols and "email" in cols and "company_id" in cols:
        return
    dialect = engine.dialect.name
    if dialect == "sqlite":
        if "display_name" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(200)"))
        if "email" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
        if "company_id" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN company_id INTEGER"))
    elif dialect == "postgresql":
        if "display_name" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(200)"))
        if "email" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
        if "company_id" not in cols:
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)"))
    db.commit()


@app.on_event("startup")
def create_admin_user() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_default_roles(db)
        ensure_default_companies(db)
        add_user_columns_if_missing(db)
        ensure_admin(db, settings.admin_user, settings.admin_password)
        field_crud.ensure_object_types(db)
    finally:
        db.close()
