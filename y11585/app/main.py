from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api.v1 import router as api_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="法务合同履约异常回执状态机 API",
    description="处理合同PDF、付款节点、验收邮件和手工改价表的合同履约状态管理系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR, tags=["contracts"])


@app.get("/")
def root():
    return {
        "message": "法务合同履约异常回执状态机服务",
        "version": "1.0.0",
        "api_docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
