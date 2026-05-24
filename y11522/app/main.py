from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import Base, engine
from app.api.v1 import imports, queue, reports

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="家电安装回访重试补偿队列服务 API - 处理改约、二次上门、差评补偿的自动化队列管理",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.API_V1_PREFIX
app.include_router(imports.router, prefix=api_prefix)
app.include_router(queue.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
