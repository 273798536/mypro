from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..database import init_db
from .routes import router as api_router

app = FastAPI(
    title="跨境小包清关权限追责台账 API",
    description="""
    跨境小包清关权限追责台账系统 API

    ## 核心功能

    - **记录管理**: 申报表、轨迹节点、补税通知、临时补录单、班次记录
    - **状态流转**: 草稿 → 提交 → 驳回 → 二次确认 → 冻结 → 导出
    - **版本控制**: 每次变更都记录前后差异，支持版本对比
    - **导入导出**: 支持 Excel/CSV 导入，保留原始证据；支持脱敏导出
    - **审计追踪**: 完整的操作日志，支持角色视图和敏感字段处理

    ## 角色权限

    - `data_entry`: 数据录入员（只能看基本信息，敏感字段脱敏）
    - `reviewer`: 审核员（可查看税费，但不能最终确认）
    - `manager`: 经理（完整权限，可最终确认和冻结）
    - `auditor`: 审计员（只读审计权限，可看所有历史）
    - `export_only`: 仅导出（脱敏视图，仅导出用）
    """,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/", tags=["root"])
async def root():
    return {
        "name": "跨境小包清关权限追责台账 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["root"])
async def health_check():
    return {"status": "healthy"}
