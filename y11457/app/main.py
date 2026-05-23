from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.api import auth, sources, queue, reports, imports, logs

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="社区团购售后重试补偿队列 API",
    description="""
    # 社区团购售后重试补偿队列服务
    
    ## 核心功能
    
    1. **数据源管理**
       - 团长退款表
       - 仓库复核表
       - 用户备注
       - 手工改价表
    
    2. **补偿队列**
       - 建账、排队
       - 限次重试
       - 人工接管
       - 补偿入账
       - 关闭
    
    3. **数据追溯**
       - 操作日志
       - 前后差异对比
       - 报表到单条记录链路
    
    4. **异常处理**
       - 坏数据隔离
       - 失败列表
       - 重试分类
       - 死信处理
    
    5. **权限体系**
       - 录入 (data_entry)
       - 复核 (reviewer)
       - 主管 (supervisor)
       - 只读 (read_only)
    
    ## 角色权限说明
    
    | 角色 | 可见字段 | 可操作动作 |
    |------|----------|------------|
    | 录入 | 基础字段 | 创建、查看 |
    | 复核 | 含审核字段 | 创建、查看、更新、审核、分配 |
    | 主管 | 全部字段 | 全部操作 |
    | 只读 | 非敏感字段 | 查看、导出 |
    """,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(queue.router)
app.include_router(reports.router)
app.include_router(imports.router)
app.include_router(logs.router)


@app.get("/")
async def root():
    return {
        "name": "社区团购售后重试补偿队列 API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
