from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="客服知识库发布异常回执状态机 API",
    description="管理客服知识库发布异常回执的完整生命周期，包括批次创建、数据导入、复核改判、冻结结算、撤回归档等功能",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")


@app.get("/")
async def root():
    return {
        "service": "客服知识库发布异常回执状态机服务",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health_check": "/api/v1/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
