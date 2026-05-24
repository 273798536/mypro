from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import router as api_router
from app.database import engine, Base
from app.queue.worker import QueueWorker
from app.config import settings

queue_worker = QueueWorker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    queue_worker.start()
    yield
    queue_worker.stop()

app = FastAPI(
    title="投标资料封版重试补偿队列服务 API",
    description="处理投标资料封版的重试补偿队列服务，支持资质文件、报价版本、盖章扫描件等附件的提交、重试、人工接管等功能",
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

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tender-queue-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
