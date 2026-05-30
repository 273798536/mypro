from fastapi import FastAPI
from contextlib import asynccontextmanager
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.database import Base, engine
from app.routers import data_collection, equipment, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="热泵换热效率计算与分析平台 - 统一COP计算、持久化存储、异常追踪、工况分组",
    lifespan=lifespan
)

app.include_router(data_collection.router)
app.include_router(equipment.router)
app.include_router(reports.router)


@app.get("/", tags=["系统"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "endpoints": {
            "数据采集": "/api/data",
            "设备档案": "/api/equipment",
            "报表导出": "/api/reports"
        },
        "docs": "/docs"
    }


@app.get("/health", tags=["系统"])
def health_check():
    return {"status": "healthy", "database": "connected"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
