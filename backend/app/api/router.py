from fastapi import APIRouter

from app.api.routes import ai, annual_plans, capacity, crisis, digital_twin, entities, field_schemes, master_data, scenarios, admin, me, activity
from app.api.routes import reservoir_twin, wells, well_logs

api_router = APIRouter(prefix="/api")
api_router.include_router(me.router, tags=["me"])
api_router.include_router(digital_twin.router, tags=["digital-twin"])
api_router.include_router(scenarios.router, tags=["scenarios"])
api_router.include_router(entities.router, tags=["entities"])
api_router.include_router(capacity.router, tags=["capacity"])
api_router.include_router(master_data.router, tags=["master-data"])
api_router.include_router(annual_plans.router, tags=["annual-plans"])
api_router.include_router(ai.router, tags=["ai"])
api_router.include_router(crisis.router, tags=["crisis"])
api_router.include_router(field_schemes.router, tags=["field-schemes"])
api_router.include_router(reservoir_twin.router, tags=["reservoir-twin"])
api_router.include_router(wells.router, tags=["wells"])
api_router.include_router(well_logs.router, tags=["well-logs"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(activity.router, tags=["activity"])
