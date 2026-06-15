import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.models.store import db
from app.api.router import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理

    startup: 打印启动日志，确认应用名称、版本、存储路径等信息
    shutdown: 调用 db.save_to_disk() 将内存中的数据持久化到磁盘
    """
    logger.info("=" * 60)
    logger.info(f"启动应用: {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"上传目录: {settings.UPLOAD_DIR}")
    logger.info(f"导出目录: {settings.EXPORT_DIR}")
    logger.info(f"地图服务商: {settings.MAP_PROVIDER}")
    logger.info(f"当前记录数: {len(db.records)}")
    logger.info(f"统一口径数: {len(db.unified_notes)}")
    logger.info(f"导入批次数: {len(db.batches)}")
    logger.info("=" * 60)
    print(f"[STARTUP] {settings.APP_NAME} v{settings.VERSION} 已启动")

    yield

    print("[SHUTDOWN] 正在持久化数据...")
    db.save_to_disk()
    print("[SHUTDOWN] 数据已保存到磁盘，应用关闭")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/exports", StaticFiles(directory=str(settings.EXPORT_DIR)), name="exports")

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    """应用根路径健康检查

    Returns:
        dict: {status, name} 用于确认服务是否正常运行
    """
    return {"status": "ok", "name": settings.APP_NAME}
