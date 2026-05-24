from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api import queue, dashboard, export

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="线下展会物料重试补偿队列 API",
    description="物料清单、物流签收、现场借用记录的回执提交、排队、限次重试、人工接管、补偿入账、关闭的完整流程管理",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(queue.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "线下展会物料重试补偿队列 API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
