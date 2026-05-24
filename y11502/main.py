from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.routers import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="售后备件领用重试补偿队列API服务 - 处理维修单、备件扫码、客户签收照的补偿流程",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
