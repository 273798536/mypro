from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.api.batches import router as batches_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="线下展会物料异常回执状态机API - 处理物料清单、物流签收、现场借用记录，支持批次管理、状态流转、冻结结算、撤回归档等功能",
    lifespan=lifespan
)

app.include_router(batches_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
