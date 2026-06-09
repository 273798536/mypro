from fastapi import APIRouter
from . import batches, records, review, calculate, reports, system

api_router = APIRouter()

api_router.include_router(batches.router)
api_router.include_router(records.router)
api_router.include_router(review.router)
api_router.include_router(calculate.router)
api_router.include_router(reports.router)
api_router.include_router(system.router)
