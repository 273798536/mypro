"""FastAPI 启动入口：酶促反应底物换算系统。"""
from sqlalchemy import text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from . import models  # noqa - 确保模型被导入以便建表
from .api import router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "酶促反应底物换算系统后端接口：支持旧表Excel导入、温度单位混用复核、"
        "浓度换算与谱图判读共用记录、状态推进、导出PDF报告（含普通话解释和异常追溯链）。"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["根"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running",
        "db_path": str(settings.DB_PATH),
        "tips": (
            "1. POST /api/v1/records/from-sample 一键创建贴近日常的样例（含旧表/补录/漏填/重叠峰/称量不足）；"
            "2. POST /api/v1/records/import-excel 上传旧表Excel；"
            "3. POST /api/v1/records/{id}/review 复核并推进；"
            "4. POST /api/v1/records/{id}/report/export 导出PDF报告。"
        ),
    }


@app.get("/health", tags=["根"])
def health():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        return {"ok": True, "db": "connected"}
    except Exception as e:
        return {"ok": False, "db": str(e)}
