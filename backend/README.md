# Backend (FastAPI)

## Setup
1. Create and activate a virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and adjust values.
4. Run migrations:
   - `alembic upgrade head`
5. Seed sample data (optional):
   - `python -m app.seed`

## Run
- `uvicorn app.main:app --reload --port 8000`

## Auth
- Basic Auth is required for all endpoints.
- Admin user is auto-created at startup from `ADMIN_USER` and `ADMIN_PASSWORD`.
