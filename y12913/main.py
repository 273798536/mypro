from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import init_db, get_db
from app.api.routes import router as api_router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "app", "static")

app = FastAPI(
    title="LoRA 合并版本台账",
    description="MLOps LoRA版本管理工具 - 灰度对比、安全检查、人工反馈、报告导出",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def read_root():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "name": "LoRA 合并版本台账 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/records"
    }


@app.get("/health")
def health_check():
    db = next(get_db())
    try:
        from app.database import LoraRecord
        count = db.query(LoraRecord).count()
        return {"status": "ok", "record_count": count}
    finally:
        db.close()
