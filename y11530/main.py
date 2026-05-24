from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="银行网点排班异常回执状态机API服务",
    lifespan=lifespan,
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
