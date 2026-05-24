from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

import config
from database import init_db
from api import router

logging.basicConfig(
    level=config.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="售后备件领用验收回放链路 API",
    description="处理维修单、备件扫码、客户签收照的批次复核服务，支持幂等、撤回、冻结、人工改判等边界场景",
    version="1.0.0"
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
    init_db()
    logger.info("Database initialized")
    logger.info(f"Upload directory: {config.UPLOAD_DIR}")
    logger.info(f"Export directory: {config.EXPORT_DIR}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "spare-part-replay-api"}

@app.get("/")
async def root():
    return {
        "message": "售后备件领用验收回放链路服务",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
