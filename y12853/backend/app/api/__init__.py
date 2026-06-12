from fastapi import APIRouter
from app.api import tide_window, import_data, trajectory_cleaning, example_data

api_router = APIRouter()
api_router.include_router(tide_window.router)
api_router.include_router(import_data.router)
api_router.include_router(trajectory_cleaning.router)
api_router.include_router(example_data.router)
