from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .routers import api_router
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import crud


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        stats = crud.get_system_stats(db)
        if stats["total_batches"] == 0:
            crud.initialize_sample_data(db)
            print("示例数据初始化完成")
    finally:
        db.close()

    yield


app = FastAPI(
    title="可靠性寿命曲线分析系统",
    description="投研助理与学生共用的可靠性寿命曲线数据处理与复核平台",
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


@app.get("/")
def root():
    return {
        "name": "可靠性寿命曲线分析系统",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": "/api"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
