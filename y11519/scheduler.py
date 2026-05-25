import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from typing import Optional
from datetime import datetime

from database import AsyncSessionLocal
from services import AsyncTaskService
from models import TaskStatus

scheduler: Optional[AsyncIOScheduler] = None


async def process_pending_retry_tasks():
    async with AsyncSessionLocal() as db:
        tasks = await AsyncTaskService.get_pending_retry_tasks(db)
        for task in tasks:
            try:
                task.status = TaskStatus.PENDING.value
                task.error_message = None
                await db.commit()
                await AsyncTaskService.process_task(db, task.id)
            except Exception as e:
                print(f"[Scheduler] 任务 {task.id} 自动续跑失败: {e}")


async def recover_interrupted_tasks():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from models import AsyncTask

        result = await db.execute(
            select(AsyncTask).where(
                AsyncTask.status == TaskStatus.PROCESSING.value
            )
        )
        interrupted_tasks = result.scalars().all()

        for task in interrupted_tasks:
            task.status = TaskStatus.WAIT_RETRY.value
            task.retry_count += 1
            task.error_message = "服务中断，任务恢复后重新执行"
            task.next_retry_at = datetime.now()
            await db.commit()
            print(f"[Scheduler] 已恢复中断任务: {task.id}")

        return len(interrupted_tasks)


def start_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        return scheduler

    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        process_pending_retry_tasks,
        IntervalTrigger(seconds=30),
        id="process_retry_tasks",
        name="处理待重试任务",
        replace_existing=True
    )

    scheduler.start()
    print("[Scheduler] 任务调度器已启动")
    return scheduler


def stop_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        print("[Scheduler] 任务调度器已停止")


async def get_scheduler_status() -> dict:
    global scheduler
    if not scheduler:
        return {"running": False, "jobs": []}

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": str(job.next_run_time) if job.next_run_time else None
        })

    return {
        "running": scheduler.running,
        "jobs": jobs
    }
