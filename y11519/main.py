from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime

from config import get_settings
from database import get_db, init_db
from models import MaterialStatus, TaskStatus, Role, SyncStrategy, MaterialLedger
from schemas import (
    MaterialLedgerCreate, MaterialLedgerUpdate, MaterialLedgerResponse,
    StatusTransition, StatusHistoryResponse, ChangeHistoryResponse,
    SyncBatchRequest, SyncResult, AsyncTaskCreate, AsyncTaskResponse,
    ExportRequest, RoleViewRequest, UserRoleResponse, UserRoleCreate
)
from services import MaterialLedgerService, AsyncTaskService, UserRoleService

settings = get_settings()
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION}


@app.post("/api/ledgers/", response_model=MaterialLedgerResponse)
async def create_ledger(
    ledger_data: MaterialLedgerCreate,
    db: AsyncSession = Depends(get_db)
):
    return await MaterialLedgerService.create_ledger(db, ledger_data)


@app.get("/api/ledgers/{ledger_id}", response_model=MaterialLedgerResponse)
async def get_ledger(ledger_id: int, db: AsyncSession = Depends(get_db)):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@app.put("/api/ledgers/{ledger_id}", response_model=MaterialLedgerResponse)
async def update_ledger(
    ledger_id: int,
    update_data: MaterialLedgerUpdate,
    db: AsyncSession = Depends(get_db)
):
    ledger = await MaterialLedgerService.update_ledger(db, ledger_id, update_data)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@app.post("/api/ledgers/status-transition", response_model=MaterialLedgerResponse)
async def status_transition(
    transition: StatusTransition,
    db: AsyncSession = Depends(get_db)
):
    ledger = await MaterialLedgerService.transition_status(db, transition)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@app.get("/api/ledgers/{ledger_id}/status-history", response_model=List[StatusHistoryResponse])
async def get_status_history(ledger_id: int, db: AsyncSession = Depends(get_db)):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger.status_histories


@app.get("/api/ledgers/{ledger_id}/change-history", response_model=List[ChangeHistoryResponse])
async def get_change_history(ledger_id: int, db: AsyncSession = Depends(get_db)):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger.change_histories


@app.post("/api/batch/sync", response_model=SyncResult)
async def sync_batch(
    request: SyncBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    return await MaterialLedgerService.sync_batch(db, request)


@app.post("/api/tasks/", response_model=AsyncTaskResponse)
async def create_async_task(
    task_data: AsyncTaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    task = await AsyncTaskService.create_task(db, task_data)
    background_tasks.add_task(AsyncTaskService.process_task, db, task.id)
    return task


@app.get("/api/tasks/{task_id}", response_model=AsyncTaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await AsyncTaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.get("/api/tasks/failed/summary")
async def get_failed_tasks_summary(db: AsyncSession = Depends(get_db)):
    failed_tasks = await AsyncTaskService.get_failed_tasks(db)
    return {
        "wait_retry_count": len(failed_tasks["wait_retry"]),
        "wait_manual_count": len(failed_tasks["wait_manual"]),
        "permanent_failed_count": len(failed_tasks["permanent_failed"]),
        "wait_retry": [
            {"id": t.id, "task_name": t.task_name, "error_message": t.error_message, "retry_count": t.retry_count}
            for t in failed_tasks["wait_retry"]
        ],
        "wait_manual": [
            {"id": t.id, "task_name": t.task_name, "error_message": t.error_message}
            for t in failed_tasks["wait_manual"]
        ],
        "permanent_failed": [
            {"id": t.id, "task_name": t.task_name, "error_message": t.error_message}
            for t in failed_tasks["permanent_failed"]
        ]
    }


@app.post("/api/tasks/{task_id}/retry", response_model=AsyncTaskResponse)
async def retry_task(
    task_id: int,
    force: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    task = await AsyncTaskService.retry_task(db, task_id, force)
    if not task:
        raise HTTPException(status_code=400, detail="任务不可重试")
    background_tasks.add_task(AsyncTaskService.process_task, db, task.id)
    return task


@app.post("/api/tasks/{task_id}/mark-manual", response_model=AsyncTaskResponse)
async def mark_task_manual(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await AsyncTaskService.mark_manual(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/export/")
async def export_data(request: ExportRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    query = select(MaterialLedger)
    if request.ledger_ids:
        query = query.where(MaterialLedger.id.in_(request.ledger_ids))
    elif request.batch_no:
        query = query.where(MaterialLedger.batch_no == request.batch_no)

    result = await db.execute(query)
    ledgers = result.scalars().all()

    export_data = []
    for ledger in ledgers:
        if request.desensitize:
            data = await MaterialLedgerService.desensitize_ledger(ledger)
        else:
            data = {c.name: getattr(ledger, c.name) for c in ledger.__table__.columns}
        export_data.append(data)

    return {
        "export_time": datetime.now().isoformat(),
        "operator": request.operator,
        "desensitized": request.desensitize,
        "total_count": len(export_data),
        "data": export_data
    }


@app.post("/api/role-view/")
async def get_role_view(request: RoleViewRequest, db: AsyncSession = Depends(get_db)):
    return await MaterialLedgerService.get_role_view(db, request.role, request.site_name)


@app.post("/api/users/", response_model=UserRoleResponse)
async def create_user(user_data: UserRoleCreate, db: AsyncSession = Depends(get_db)):
    return await UserRoleService.create_user_role(db, user_data.username, user_data.role, user_data.site_name)


@app.get("/api/users/{username}", response_model=UserRoleResponse)
async def get_user(username: str, db: AsyncSession = Depends(get_db)):
    user = await UserRoleService.get_user_role(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
