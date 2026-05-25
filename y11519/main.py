from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime

from config import get_settings
from database import get_db, init_db, AsyncSessionLocal
from models import MaterialStatus, TaskStatus, Role, SyncStrategy, MaterialLedger
from schemas import (
    MaterialLedgerCreate, MaterialLedgerUpdate, MaterialLedgerResponse,
    StatusTransition, StatusHistoryResponse, ChangeHistoryResponse,
    SyncBatchRequest, SyncResult, AsyncTaskCreate, AsyncTaskResponse,
    ExportRequest, RoleViewRequest, UserRoleResponse, UserRoleCreate
)
from services import MaterialLedgerService, AsyncTaskService, UserRoleService
from auth import create_token, get_current_user, require_roles, require_permissions
from scheduler import start_scheduler, stop_scheduler, get_scheduler_status, recover_interrupted_tasks

settings = get_settings()
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)


@app.on_event("startup")
async def startup_event():
    await init_db()

    async with AsyncSessionLocal() as db:
        admin = await UserRoleService.get_user_role(db, "admin")
        if not admin:
            await UserRoleService.create_user_role(db, "admin", Role.ADMIN)
            print("[Startup] 已创建默认管理员用户: admin")

    recovered = await recover_interrupted_tasks()
    print(f"[Startup] 恢复中断任务: {recovered} 个")
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()


@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION}


@app.post("/api/auth/login")
async def login(
    username: str,
    password: str = "",
    db: AsyncSession = Depends(get_db)
):
    user_role = await UserRoleService.get_user_role(db, username)
    if not user_role:
        raise HTTPException(status_code=401, detail="用户不存在")

    token = create_token(user_role.username, user_role.role, user_role.site_name)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user_role.username,
        "role": user_role.role,
        "site_name": user_role.site_name,
        "permissions": user_role.permissions
    }


@app.post("/api/ledgers/", response_model=MaterialLedgerResponse)
async def create_ledger(
    ledger_data: MaterialLedgerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.ADMIN))
):
    ledger_data.created_by = current_user["username"]
    ledger_data.operator = current_user["username"]
    return await MaterialLedgerService.create_ledger(db, ledger_data)


@app.get("/api/ledgers/{ledger_id}", response_model=MaterialLedgerResponse)
async def get_ledger(
    ledger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")

    user_role = current_user.get("role")
    user_site = current_user.get("site_name")
    if user_role == Role.SITE_MANAGER.value and user_site and ledger.site_name != user_site:
        raise HTTPException(status_code=403, detail="无权查看其他站点数据")

    return ledger


@app.put("/api/ledgers/{ledger_id}", response_model=MaterialLedgerResponse)
async def update_ledger(
    ledger_id: int,
    update_data: MaterialLedgerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.ADMIN))
):
    update_data.operator = current_user["username"]
    ledger = await MaterialLedgerService.update_ledger(db, ledger_id, update_data)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@app.post("/api/ledgers/status-transition", response_model=MaterialLedgerResponse)
async def status_transition(
    transition: StatusTransition,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.SITE_MANAGER, Role.AUDITOR, Role.ADMIN))
):
    transition.operator = current_user["username"]
    transition.role = Role(current_user["role"])
    ledger = await MaterialLedgerService.transition_status(db, transition)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@app.get("/api/ledgers/{ledger_id}/status-history", response_model=List[StatusHistoryResponse])
async def get_status_history(
    ledger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permissions("view_history", "view_changes"))
):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger.status_histories


@app.get("/api/ledgers/{ledger_id}/change-history", response_model=List[ChangeHistoryResponse])
async def get_change_history(
    ledger_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permissions("view_history", "view_changes"))
):
    ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger.change_histories


@app.post("/api/batch/sync", response_model=SyncResult)
async def sync_batch(
    request: SyncBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.ADMIN))
):
    request.operator = current_user["username"]
    return await MaterialLedgerService.sync_batch(db, request)


@app.post("/api/tasks/", response_model=AsyncTaskResponse)
async def create_async_task(
    task_data: AsyncTaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.ADMIN))
):
    task = await AsyncTaskService.create_task(db, task_data)
    background_tasks.add_task(AsyncTaskService.process_task, db, task.id)
    return task


@app.get("/api/tasks/{task_id}", response_model=AsyncTaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    task = await AsyncTaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.get("/api/tasks/failed/summary")
async def get_failed_tasks_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permissions("view_all", "view_history"))
):
    failed_tasks = await AsyncTaskService.get_failed_tasks(db)
    return {
        "wait_retry_count": len(failed_tasks["wait_retry"]),
        "wait_manual_count": len(failed_tasks["wait_manual"]),
        "permanent_failed_count": len(failed_tasks["permanent_failed"]),
        "wait_retry": [
            {"id": t.id, "task_name": t.task_name, "error_message": t.error_message, "retry_count": t.retry_count, "next_retry_at": t.next_retry_at.isoformat() if t.next_retry_at else None}
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
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.OPERATOR, Role.ADMIN))
):
    task = await AsyncTaskService.retry_task(db, task_id, force)
    if not task:
        raise HTTPException(status_code=400, detail="任务不可重试")
    background_tasks.add_task(AsyncTaskService.process_task, db, task.id)
    return task


@app.post("/api/tasks/{task_id}/mark-manual", response_model=AsyncTaskResponse)
async def mark_task_manual(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.ADMIN, Role.SITE_MANAGER))
):
    task = await AsyncTaskService.mark_manual(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/export/")
async def export_data(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permissions("export"))
):
    from sqlalchemy import select

    query = select(MaterialLedger)
    if request.ledger_ids:
        query = query.where(MaterialLedger.id.in_(request.ledger_ids))
    elif request.batch_no:
        query = query.where(MaterialLedger.batch_no == request.batch_no)
    else:
        raise HTTPException(status_code=400, detail="必须指定ledger_ids或batch_no")

    result = await db.execute(query)
    ledgers = result.scalars().all()

    if not ledgers:
        return {
            "export_time": datetime.now().isoformat(),
            "operator": current_user["username"],
            "desensitized": request.desensitize,
            "total_count": 0,
            "exported_count": 0,
            "data": []
        }

    export_data = []
    ledger_ids = []
    for ledger in ledgers:
        if request.desensitize:
            data = await MaterialLedgerService.desensitize_ledger(ledger)
        else:
            data = {c.name: getattr(ledger, c.name) for c in ledger.__table__.columns}
        export_data.append(data)
        ledger_ids.append(ledger.id)

    exported_count = await MaterialLedgerService.mark_ledgers_as_exported(
        db, ledger_ids, current_user["username"]
    )

    return {
        "export_time": datetime.now().isoformat(),
        "operator": current_user["username"],
        "desensitized": request.desensitize,
        "total_count": len(export_data),
        "exported_count": exported_count,
        "data": export_data
    }


@app.post("/api/role-view/")
async def get_role_view(
    request: RoleViewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.SITE_MANAGER, Role.AUDITOR, Role.ADMIN))
):
    user_role = current_user.get("role")
    user_site = current_user.get("site_name")

    if user_role == Role.SITE_MANAGER.value:
        request.site_name = user_site
        request.role = Role.SITE_MANAGER

    return await MaterialLedgerService.get_role_view(db, request.role, request.site_name)


@app.post("/api/users/", response_model=UserRoleResponse)
async def create_user(
    user_data: UserRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.ADMIN))
):
    return await UserRoleService.create_user_role(db, user_data.username, user_data.role, user_data.site_name)


@app.get("/api/users/{username}", response_model=UserRoleResponse)
async def get_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.ADMIN))
):
    user = await UserRoleService.get_user_role(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@app.get("/api/scheduler/status")
async def scheduler_status(current_user: dict = Depends(require_roles(Role.ADMIN))):
    return await get_scheduler_status()


@app.post("/api/scheduler/recover")
async def recover_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles(Role.ADMIN))
):
    count = await recover_interrupted_tasks()
    return {"recovered_count": count}


@app.get("/api/health")
async def health_check():
    scheduler_info = await get_scheduler_status()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "scheduler": scheduler_info
    }
