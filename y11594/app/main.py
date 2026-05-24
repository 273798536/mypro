from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, get_db
from app.routers import auth, ledger, export, manager
from app.core.auto_check import run_system_health_check
from app.models.all_models import *


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="仓内波次拣货权限追责台账 API",
    description="完整的仓内波次拣货追责台账系统，包含权限控制、状态流转、脏数据处理、导出、经理视图等功能",
    version="1.0.0",
    lifespan=lifespan
)


app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(ledger.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)
app.include_router(manager.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "仓内波次拣货权限追责台账 API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-05-25T00:00:00Z"}


@app.get("/system-check")
def system_check(db: Session = Depends(get_db)):
    result = run_system_health_check(db)
    return {"message": "系统健康检查完成", "data": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
