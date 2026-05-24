from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.api.v1 import auth, delivery, repair, deduction, queue, report, shift


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="外协加工对账重试补偿队列系统 - 解决夜间抢修无单、分批返工重复扣款等问题",
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

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["认证"])
app.include_router(delivery.router, prefix=f"{settings.API_V1_STR}/deliveries", tags=["外协送货单"])
app.include_router(repair.router, prefix=f"{settings.API_V1_STR}/repairs", tags=["返修记录"])
app.include_router(deduction.router, prefix=f"{settings.API_V1_STR}/deductions", tags=["扣款明细"])
app.include_router(shift.router, prefix=f"{settings.API_V1_STR}/shifts", tags=["班次记录"])
app.include_router(queue.router, prefix=f"{settings.API_V1_STR}/queue", tags=["补偿队列"])
app.include_router(report.router, prefix=f"{settings.API_V1_STR}/reports", tags=["报表与追溯"])


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
