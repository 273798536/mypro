from fastapi import APIRouter

from .reviews import router as reviews_router

api_router = APIRouter()
api_router.include_router(reviews_router)

__all__ = ["api_router"]
