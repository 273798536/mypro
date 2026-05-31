from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import stations, arrivals, velocity, inversion, samples, export, audit

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="地震波到时定位系统",
    description="地震波到时定位后端API - 支持台站管理、到时录入、波速模型、震源反演、残差分析、变更追踪",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router, prefix="/api/stations", tags=["台站管理"])
app.include_router(arrivals.router, prefix="/api/arrivals", tags=["到时记录"])
app.include_router(velocity.router, prefix="/api/velocity", tags=["波速模型"])
app.include_router(inversion.router, prefix="/api/inversion", tags=["震源反演"])
app.include_router(samples.router, prefix="/api/samples", tags=["样例数据"])
app.include_router(export.router, prefix="/api/export", tags=["导出结果"])
app.include_router(audit.router, prefix="/api/audit", tags=["变更追踪"])


@app.get("/api/health", tags=["系统"])
def health_check():
    return {"status": "ok", "service": "地震波到时定位系统"}
