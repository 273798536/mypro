from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import conflicts, schedules, stage, histories

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="琴房课时排期冲突检测系统：自动检测排期冲突、文件名与曲目不匹配、时码偏差、演奏者冲突，支持异常队列筛选导出、撤回记录与结论关联、操作历史审计。",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conflicts.router, prefix=settings.API_V1_STR)
app.include_router(schedules.router, prefix=settings.API_V1_STR)
app.include_router(stage.router, prefix=settings.API_V1_STR)
app.include_router(stage.router_rep, prefix=settings.API_V1_STR)
app.include_router(histories.router, prefix=settings.API_V1_STR)


@app.get("/", summary="系统状态")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "running",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR,
    }


@app.get("/health", summary="健康检查")
def health_check():
    return {"status": "ok"}
