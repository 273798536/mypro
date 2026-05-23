import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.middleware.auth import AuthMiddleware
from app.api import warehouse, returns, repair, tasks, imports, exports, reconciliation
from app.task_processor import TaskProcessor

task_processor = TaskProcessor(poll_interval=5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("Database initialized")
    
    asyncio.create_task(task_processor.run())
    print("Task processor started")
    
    yield
    
    task_processor.stop()
    print("Task processor stopped")


app = FastAPI(
    title="设备租赁归还验收回放链路 API",
    description="处理设备租赁归还验收、押金扣减、对账、导出等业务流程",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(warehouse.router, prefix="/api/v1")
app.include_router(returns.router, prefix="/api/v1")
app.include_router(repair.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(exports.router, prefix="/api/v1")
app.include_router(reconciliation.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "service": "设备租赁归还验收回放链路服务",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
