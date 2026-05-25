from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import router
from app.services import (
    recover_async_tasks, recover_queue_from_async_tasks,
    process_all_pending_async_tasks
)


class BackgroundScheduler:
    def __init__(self):
        self.running = False
        self.task = None
        self.last_recovery_at = None
        self.recovery_count = 0

    async def start(self):
        self.running = True
        print(f"[{datetime.now()}] 启动后台任务调度器...")
        self.task = asyncio.create_task(self._run())

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        print(f"[{datetime.now()}] 后台任务调度器已停止")

    async def _run(self):
        while self.running:
            try:
                db = SessionLocal()
                try:
                    success, manual, failed = process_all_pending_async_tasks(db)
                    if success + manual + failed > 0:
                        print(f"[{datetime.now()}] 后台处理完成: 成功={success}, 等人工={manual}, 失败={failed}")
                finally:
                    db.close()
            except Exception as e:
                print(f"[{datetime.now()}] 后台任务异常: {str(e)}")

            await asyncio.sleep(settings.RETRY_INTERVAL_MINUTES * 60)

    def run_recovery(self) -> dict:
        db = SessionLocal()
        try:
            recovered_tasks = recover_async_tasks(db)
            recovered_queues = recover_queue_from_async_tasks(db)
            self.last_recovery_at = datetime.now()
            self.recovery_count += 1
            result = {
                "recovered_tasks": recovered_tasks,
                "recovered_queues": recovered_queues,
                "recovery_time": self.last_recovery_at.isoformat(),
                "total_recovery_count": self.recovery_count
            }
            print(f"[{datetime.now()}] 服务恢复完成: {result}")
            return result
        finally:
            db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print(f"[{datetime.now()}] 数据库初始化完成")

    recovery_result = scheduler.run_recovery()
    app.state.last_recovery = recovery_result

    await scheduler.start()
    app.state.scheduler = scheduler

    yield

    await scheduler.stop()


app = FastAPI(
    title=settings.APP_NAME,
    description="售后备件领用重试补偿队列API服务 - 支持维修单、备件扫码、客户签收照、供应商对账单、审批邮件全流程处理",
    version="2.0.0",
    lifespan=lifespan
)

app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    recovery_info = getattr(app.state, "last_recovery", None)
    return {
        "service": settings.APP_NAME,
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX,
        "background_scheduler": "running" if scheduler.running else "stopped",
        "last_recovery": recovery_info
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "scheduler_running": scheduler.running,
        "last_recovery_at": scheduler.last_recovery_at.isoformat() if scheduler.last_recovery_at else None
    }


@app.post("/admin/trigger-recovery")
def trigger_recovery():
    result = scheduler.run_recovery()
    return {"success": True, "recovery": result}


@app.get("/admin/scheduler-status")
def scheduler_status():
    return {
        "running": scheduler.running,
        "last_recovery_at": scheduler.last_recovery_at.isoformat() if scheduler.last_recovery_at else None,
        "recovery_count": scheduler.recovery_count
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
