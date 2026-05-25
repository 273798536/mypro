import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api import router as api_router
from app.task_engine import start_task_scheduler, stop_task_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("正在初始化数据库...")
    init_db()
    logger.info("数据库初始化完成")
    
    logger.info("正在启动任务调度器...")
    start_task_scheduler()
    logger.info("任务调度器已启动")
    
    yield
    
    logger.info("正在停止任务调度器...")
    stop_task_scheduler()
    logger.info("任务调度器已停止")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="投标资料封版验收回放链路服务 API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", summary="根路径")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }


if __name__ == "__main__":
    import uvicorn
    import os
    reload_enabled = os.getenv("RELOAD_ENABLED", "false").lower() == "true"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=reload_enabled,
        log_level="info"
    )
