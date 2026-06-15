from fastapi import APIRouter

from app.api.endpoints import (
    upload,
    records,
    consistency,
    coord,
    merge,
    export,
    notes,
)

api_router = APIRouter()

api_router.include_router(upload.router)
api_router.include_router(records.router)
api_router.include_router(consistency.router)
api_router.include_router(coord.router)
api_router.include_router(merge.router)
api_router.include_router(export.router)
api_router.include_router(notes.router)
