from fastapi import FastAPI
from contextlib import asynccontextmanager
from typing import Dict, Any

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.batches import router as batches_router
from app.services.task_scheduler import TaskScheduler
from app.services.task_service import TaskService
from app.models import TaskStatus


def example_task_handler(input_data: Dict[str, Any]) -> Dict[str, Any]:
    material_code = input_data.get("material_code")
    return {
        "processed": True,
        "material_code": material_code,
        "timestamp": "processed"
    }


def device_location_verify_handler(input_data: Dict[str, Any]) -> Dict[str, Any]:
    material_code = input_data.get("material_code")
    last_location = input_data.get("last_known_location")
    return {
        "verified": True,
        "material_code": material_code,
        "location": last_location,
        "result": "位置信息已核实"
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    TaskScheduler.register_handler("核实丢失设备去向", device_location_verify_handler)
    TaskScheduler.register_handler("example_task", example_task_handler)
    
    TaskScheduler.start()
    
    yield
    
    TaskScheduler.shutdown()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="线下展会物料异常回执状态机API - 处理物料清单、物流签收、现场借用记录，支持批次管理、状态流转、冻结结算、撤回归档等功能",
    lifespan=lifespan
)

app.include_router(batches_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "task_scheduler_running": TaskScheduler.is_running()
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "task_scheduler_running": TaskScheduler.is_running()
    }


@app.get("/api/v1/tasks/stats")
def get_task_stats():
    db = SessionLocal()
    try:
        total = TaskService.get_pending_tasks(db)
        waiting_manual = TaskService.get_waiting_manual_tasks(db)
        
        from app.models import AsyncTask
        all_tasks = db.query(AsyncTask).all()
        stats = {
            "total": len(all_tasks),
            "pending": sum(1 for t in all_tasks if t.status == TaskStatus.PENDING),
            "running": sum(1 for t in all_tasks if t.status == TaskStatus.RUNNING),
            "waiting_retry": sum(1 for t in all_tasks if t.status == TaskStatus.WAITING_RETRY),
            "waiting_manual": len(waiting_manual),
            "permanent_failed": sum(1 for t in all_tasks if t.status == TaskStatus.PERMANENT_FAILED),
            "completed": sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED),
            "scheduler_running": TaskScheduler.is_running()
        }
        return stats
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
