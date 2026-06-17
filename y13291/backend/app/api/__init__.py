from fastapi import APIRouter
from .routes import router as feedbacks_router

api_router = APIRouter()
api_router.include_router(feedbacks_router)

__all__ = ["api_router"]
