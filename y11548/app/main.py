from fastapi import FastAPI
from .database import engine, Base
from .routers import auth, batches, materials, logistics, borrow, scans, imports, reconciliation, exports, logs

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="线下展会物料验收回放链路 API",
    description="物料清单、物流签收、现场借用记录和扫码明细的全链路管理系统",
    version="1.0.0",
    tags_metadata=[
        {"name": "认证", "description": "用户登录和权限管理"},
        {"name": "展会批次", "description": "展会批次创建和状态管理"},
        {"name": "物料清单", "description": "物料清单CRUD操作"},
        {"name": "物流签收", "description": "物流签收记录管理"},
        {"name": "借用记录", "description": "现场借用记录和归还追踪"},
        {"name": "扫码明细", "description": "扫码出入库记录"},
        {"name": "数据导入", "description": "批量导入Excel/CSV数据"},
        {"name": "对账与异常", "description": "账实核对和异常检测"},
        {"name": "数据导出", "description": "报表导出功能"},
        {"name": "操作日志", "description": "全链路操作追踪"},
    ]
)

app.include_router(auth.router)
app.include_router(batches.router)
app.include_router(materials.router)
app.include_router(logistics.router)
app.include_router(borrow.router)
app.include_router(scans.router)
app.include_router(imports.router)
app.include_router(reconciliation.router)
app.include_router(exports.router)
app.include_router(logs.router)


@app.get("/", tags=["系统"])
async def root():
    return {
        "name": "线下展会物料验收回放链路服务",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health", tags=["系统"])
async def health_check():
    return {"status": "healthy"}
