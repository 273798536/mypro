from fastapi import FastAPI
from app.database import engine, Base
from app.api import compensation, import_data, export_data
from app.celery_app import celery_app

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="酒店前台夜审重试补偿队列 API",
    description="处理半夜换房和延住导致房费、押金、发票不同步的补偿队列服务",
    version="1.0.0"
)

app.include_router(import_data.router, prefix="/api/v1/import", tags=["导入"])
app.include_router(compensation.router, prefix="/api/v1/compensation", tags=["补偿队列"])
app.include_router(export_data.router, prefix="/api/v1/export", tags=["导出"])


@app.get("/health")
def health_check():
    return {"status": "healthy", "celery_connected": celery_app.control.ping() is not None}


@app.get("/")
def root():
    return {
        "service": "酒店前台夜审重试补偿队列服务",
        "version": "1.0.0",
        "docs": "/docs"
    }
