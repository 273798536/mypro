from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import (
    batches, import_router, status_router,
    validation_router, calculation_router, export_router
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="催化剂活性衰减表管理系统",
    description="支持数据导入、复核、状态推进、配平计算、报告导出的催化剂活性衰减表后端服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batches.router)
app.include_router(import_router.router)
app.include_router(status_router.router)
app.include_router(validation_router.router)
app.include_router(calculation_router.router)
app.include_router(export_router.router)


@app.get("/")
def root():
    return {
        "message": "催化剂活性衰减表管理系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "ok"}
