from fastapi import FastAPI
from app.models.database import engine, Base
from app.routers import batch, complaint, export_audit
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="家电安装回访验收回放链路 API",
    description="处理预约单、师傅定位、用户评价、异常照片的投诉单合并服务",
    version="1.0.0",
)

app.include_router(batch.router)
app.include_router(complaint.router)
app.include_router(export_audit.router)


@app.get("/")
async def root():
    return {
        "service": "家电安装回访验收回放链路服务",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "batch_submit": "POST /api/v1/batch/submit",
            "complaint_create": "POST /api/v1/complaint/create",
            "complaint_merge": "POST /api/v1/complaint/merge",
            "export": "POST /api/v1/export",
            "reconcile": "POST /api/v1/reconcile",
            "audit_logs": "GET /api/v1/audit-logs",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
