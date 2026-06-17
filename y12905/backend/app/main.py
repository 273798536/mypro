from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .errors.handlers import register_error_handlers
from .routers import (
    prompt_versions,
    eval_samples,
    gray_compare,
    statistics,
    human_feedback,
    replay,
    export,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MLOps 提示词版本灰度看板 API",
    description="提示词版本管理、灰度对比、分布统计、人工反馈决策引擎",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-summary-hash", "x-export-checksum"],
)

register_error_handlers(app)

app.include_router(prompt_versions.router)
app.include_router(eval_samples.router)
app.include_router(gray_compare.router)
app.include_router(statistics.router)
app.include_router(human_feedback.router)
app.include_router(replay.router)
app.include_router(export.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "prompt-gray-dashboard"}
