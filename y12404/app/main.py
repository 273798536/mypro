from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import Base, engine
from app.api.endpoints import royalty, master_data

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="跨境音乐版税预提系统",
    description="海外流媒体平台版税预提管理系统 - 支持查询明细、状态变更、历史追溯、预提试算、版税归集和报表导出",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(royalty.router, prefix="/api/v1")
app.include_router(master_data.router, prefix="/api/v1")


@app.get("/", summary="系统状态")
def root():
    return {
        "status": "running",
        "service": "跨境音乐版税预提系统",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", summary="健康检查")
def health_check():
    return {"status": "healthy"}
