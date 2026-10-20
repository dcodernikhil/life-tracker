from fastapi import APIRouter

from app.api.routes import health, time_entries, transactions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(time_entries.router)
api_router.include_router(transactions.router)
