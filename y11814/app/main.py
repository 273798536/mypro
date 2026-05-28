from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api.trades import router as trades_router
from app.api.materials import router as materials_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="大宗交易成交后核对协议、席位、资金和限售规则的台账后端服务",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trades_router, prefix=settings.API_V1_PREFIX)
app.include_router(materials_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def on_startup():
    create_tables()


@app.get("/", tags=["健康检查"])
def health_check():
    return {
        "service": settings.PROJECT_NAME,
        "status": "running",
        "api_docs": f"/docs"
    }
