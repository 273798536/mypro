from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, get_db
from app.auth import create_default_users
from app.routers import (
    auth,
    return_applications,
    compensation_queue,
    external_receipts,
    audit_logs,
    quality_records,
    logistics_records,
)

Base.metadata.create_all(bind=engine)

db = next(get_db())
create_default_users(db)
db.close()

app = FastAPI(
    title="仓库退供复核重试补偿队列 API",
    description="""
    本系统用于处理仓库退供复核流程中的异常情况，提供可信的记录追踪和补偿机制。

    ## 核心功能

    - **外部回执提交**：支持供应商回执批量导入
    - **排队重试**：自动排队、限次重试、指数退避
    - **人工接管**：异常单人工介入、改判、补偿入账
    - **审计追踪**：所有状态变更记录时间、操作者、原因
    - **数据一致性**：重复提交策略、导出冻结、历史追溯

    ## 默认账号

    | 用户名 | 密码 | 角色 |
    |--------|------|------|
    | admin | admin123 | 系统管理员 |
    | procurement | proc123 | 采购内勤 |
    | warehouse | ware123 | 仓库管理员 |
    | quality | qual123 | 质检员 |
    | supplier | supp123 | 供应商用户 |
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

app.include_router(auth.router)
app.include_router(return_applications.router)
app.include_router(compensation_queue.router)
app.include_router(external_receipts.router)
app.include_router(audit_logs.router)
app.include_router(quality_records.router)
app.include_router(logistics_records.router)


@app.get("/", tags=["系统"])
def root():
    return {
        "message": "仓库退供复核重试补偿队列 API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["系统"])
def health_check():
    return {"status": "healthy"}
