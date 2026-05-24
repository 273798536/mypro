from fastapi import APIRouter

from app.api.batches import router as batches_router
from app.api.imports import router as imports_router
from app.api.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(batches_router)
api_router.include_router(imports_router)
api_router.include_router(reports_router)

__all__ = ["api_router"]
