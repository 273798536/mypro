from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, init_db
from app.models import WorkOrderStatus, Role, SourceType, TaskType
from app.schemas import (
    WorkOrder, WorkOrderCreate, WorkOrderUpdate, WorkOrderDetail,
    StatusChangeRequest, FreezeRequest, ExportRequest,
    JudgmentCreate, EvidenceCreate, ImportResult,
    User, UserCreate,
    RetryTaskCreate, DeadLetterResolveRequest,
    ReplaySessionCreate, ReplayToTimestampRequest
)
from app.services import (
    get_work_order, get_work_orders, create_work_order, update_work_order,
    change_work_order_status, freeze_work_order, add_judgment, add_evidence,
    export_work_orders, get_user_by_id, create_user,
    WorkOrderStateError, WorkOrderFrozenError, DuplicateSubmissionError,
    PermissionError, get_role_view_config, apply_role_view
)
from app.importer import import_file, ImportError, PartialImportError, SourceType

app = FastAPI(
    title="城市照明抢修权限追责台账 API",
    description="巡检照片、报修热线、备件批次和手工改价表互相印证的台账管理系统",
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    init_db()


@app.exception_handler(WorkOrderStateError)
def handle_state_error(request, exc: WorkOrderStateError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "STATE_ERROR"})


@app.exception_handler(WorkOrderFrozenError)
def handle_frozen_error(request, exc: WorkOrderFrozenError):
    return JSONResponse(status_code=403, content={"detail": str(exc), "code": "FROZEN_ERROR"})


@app.exception_handler(DuplicateSubmissionError)
def handle_duplicate_error(request, exc: DuplicateSubmissionError):
    return JSONResponse(status_code=409, content={"detail": str(exc), "code": "DUPLICATE_ERROR"})


@app.exception_handler(PermissionError)
def handle_permission_error(request, exc: PermissionError):
    return JSONResponse(status_code=403, content={"detail": str(exc), "code": "PERMISSION_ERROR"})


@app.exception_handler(ImportError)
def handle_import_error(request, exc: ImportError):
    if isinstance(exc, PartialImportError):
        return JSONResponse(
            status_code=207,
            content={
                "detail": str(exc),
                "code": "PARTIAL_IMPORT",
                "success": exc.success_count,
                "failed": exc.failed_count,
                "errors": exc.errors,
            }
        )
    return JSONResponse(status_code=400, content={"detail": str(exc), "code": "IMPORT_ERROR"})


@app.post("/api/users/", response_model=User, tags=["用户管理"])
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    from app.services import get_user_by_username
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    return create_user(db, user.username, user.real_name, user.role, user.password)


@app.get("/api/users/{user_id}", response_model=User, tags=["用户管理"])
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = get_user_by_id(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return db_user


@app.post("/api/work-orders/", response_model=WorkOrder, tags=["工单管理"])
def create_new_work_order(work_order: WorkOrderCreate, db: Session = Depends(get_db)):
    try:
        return create_work_order(db, work_order)
    except DuplicateSubmissionError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/api/work-orders/", tags=["工单管理"])
def read_work_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[WorkOrderStatus] = None,
    creator_id: Optional[int] = None,
    viewer_role: Optional[Role] = None,
    db: Session = Depends(get_db)
):
    work_orders = get_work_orders(db, skip=skip, limit=limit, status=status, creator_id=creator_id)
    
    if viewer_role:
        result = []
        for wo in work_orders:
            wo_dict = {
                "id": wo.id,
                "work_order_no": wo.work_order_no,
                "title": wo.title,
                "description": wo.description,
                "location": wo.location,
                "status": wo.status.value,
                "spare_part_batch": wo.spare_part_batch,
                "hotline_number": wo.hotline_number,
                "inspection_photo_ref": wo.inspection_photo_ref,
                "creator_id": wo.creator_id,
                "creator": {
                    "id": wo.creator.id,
                    "username": wo.creator.username,
                    "real_name": wo.creator.real_name,
                    "role": wo.creator.role.value,
                    "created_at": wo.creator.created_at,
                    "is_active": wo.creator.is_active,
                } if wo.creator else None,
                "created_at": wo.created_at,
                "updated_at": wo.updated_at,
                "is_frozen": wo.is_frozen,
                "frozen_at": wo.frozen_at,
                "status_transitions": [
                    {
                        "id": t.id,
                        "work_order_id": t.work_order_id,
                        "from_status": t.from_status.value if t.from_status else None,
                        "to_status": t.to_status.value,
                        "operator_id": t.operator_id,
                        "operator": {
                            "id": t.operator.id,
                            "username": t.operator.username,
                            "real_name": t.operator.real_name,
                            "role": t.operator.role.value,
                            "created_at": t.operator.created_at,
                            "is_active": t.operator.is_active,
                        } if t.operator else None,
                        "occurred_at": t.occurred_at,
                        "reason": t.reason,
                    }
                    for t in wo.status_transitions
                ],
                "evidences": [
                    {
                        "id": e.id,
                        "work_order_id": e.work_order_id,
                        "evidence_type": e.evidence_type,
                        "reference": e.reference,
                        "description": e.description,
                        "uploaded_by": e.uploaded_by,
                        "uploaded_at": e.uploaded_at,
                        "is_original": e.is_original,
                    }
                    for e in wo.evidences
                ],
                "judgments": [
                    {
                        "id": j.id,
                        "work_order_id": j.work_order_id,
                        "judge_id": j.judge_id,
                        "made_at": j.made_at,
                        "judgment_type": j.judgment_type,
                        "reason": j.reason,
                        "previous_data": j.previous_data,
                        "new_data": j.new_data,
                    }
                    for j in wo.judgments
                ],
            }
            result.append(apply_role_view(wo_dict, viewer_role))
        return result
    
    return work_orders


@app.get("/api/work-orders/{work_order_id}", tags=["工单管理"])
def read_work_order(
    work_order_id: int,
    viewer_role: Optional[Role] = None,
    db: Session = Depends(get_db)
):
    db_wo = get_work_order(db, work_order_id=work_order_id)
    if db_wo is None:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    if viewer_role:
        wo_dict = {
            "id": db_wo.id,
            "work_order_no": db_wo.work_order_no,
            "title": db_wo.title,
            "description": db_wo.description,
            "location": db_wo.location,
            "status": db_wo.status.value,
            "spare_part_batch": db_wo.spare_part_batch,
            "hotline_number": db_wo.hotline_number,
            "inspection_photo_ref": db_wo.inspection_photo_ref,
            "manual_price_adjustment": db_wo.manual_price_adjustment,
            "raw_record_id": db_wo.raw_record_id,
            "raw_record": {
                "id": db_wo.raw_record.id,
                "import_record_id": db_wo.raw_record.import_record_id,
                "original_line_number": db_wo.raw_record.original_line_number,
                "original_data": db_wo.raw_record.original_data,
                "parsed_data": db_wo.raw_record.parsed_data,
                "parse_error": db_wo.raw_record.parse_error,
                "is_parsed": db_wo.raw_record.is_parsed,
                "created_at": db_wo.raw_record.created_at,
            } if db_wo.raw_record else None,
            "creator_id": db_wo.creator_id,
            "creator": {
                "id": db_wo.creator.id,
                "username": db_wo.creator.username,
                "real_name": db_wo.creator.real_name,
                "role": db_wo.creator.role.value,
                "created_at": db_wo.creator.created_at,
                "is_active": db_wo.creator.is_active,
            } if db_wo.creator else None,
            "created_at": db_wo.created_at,
            "updated_at": db_wo.updated_at,
            "is_frozen": db_wo.is_frozen,
            "frozen_at": db_wo.frozen_at,
            "frozen_by": db_wo.frozen_by,
            "status_transitions": [
                {
                    "id": t.id,
                    "work_order_id": t.work_order_id,
                    "from_status": t.from_status.value if t.from_status else None,
                    "to_status": t.to_status.value,
                    "operator_id": t.operator_id,
                    "operator": {
                        "id": t.operator.id,
                        "username": t.operator.username,
                        "real_name": t.operator.real_name,
                        "role": t.operator.role.value,
                        "created_at": t.operator.created_at,
                        "is_active": t.operator.is_active,
                    } if t.operator else None,
                    "occurred_at": t.occurred_at,
                    "reason": t.reason,
                }
                for t in db_wo.status_transitions
            ],
            "evidences": [
                {
                    "id": e.id,
                    "work_order_id": e.work_order_id,
                    "evidence_type": e.evidence_type,
                    "reference": e.reference,
                    "description": e.description,
                    "uploaded_by": e.uploaded_by,
                    "uploaded_at": e.uploaded_at,
                    "is_original": e.is_original,
                }
                for e in db_wo.evidences
            ],
            "judgments": [
                {
                    "id": j.id,
                    "work_order_id": j.work_order_id,
                    "judge_id": j.judge_id,
                    "made_at": j.made_at,
                    "judgment_type": j.judgment_type,
                    "reason": j.reason,
                    "previous_data": j.previous_data,
                    "new_data": j.new_data,
                }
                for j in db_wo.judgments
            ],
        }
        return apply_role_view(wo_dict, viewer_role)
    
    return db_wo


@app.patch("/api/work-orders/{work_order_id}", response_model=WorkOrder, tags=["工单管理"])
def update_existing_work_order(
    work_order_id: int,
    work_order_update: WorkOrderUpdate,
    operator_id: int = Query(...),
    db: Session = Depends(get_db)
):
    try:
        return update_work_order(db, work_order_id, work_order_update, operator_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/work-orders/{work_order_id}/status", response_model=WorkOrder, tags=["状态流转"])
def change_status(
    work_order_id: int,
    request: StatusChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        wo, _ = change_work_order_status(db, work_order_id, request)
        return wo
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/work-orders/{work_order_id}/freeze", response_model=WorkOrder, tags=["状态流转"])
def freeze(
    work_order_id: int,
    request: FreezeRequest,
    db: Session = Depends(get_db)
):
    try:
        return freeze_work_order(db, work_order_id, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/work-orders/{work_order_id}/evidence", tags=["证据管理"])
def add_work_order_evidence(
    work_order_id: int,
    evidence: EvidenceCreate,
    db: Session = Depends(get_db)
):
    try:
        return add_evidence(db, evidence)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/work-orders/{work_order_id}/judgment", tags=["人工改判"])
def add_work_order_judgment(
    work_order_id: int,
    judgment: JudgmentCreate,
    db: Session = Depends(get_db)
):
    try:
        return add_judgment(db, judgment)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/import/", tags=["数据导入"])
def import_data(
    file: UploadFile = File(...),
    uploaded_by: int = Query(...),
    source_type: Optional[SourceType] = None,
    auto_create: bool = Query(False, description="是否自动创建工单"),
    db: Session = Depends(get_db)
):
    content = file.file.read()
    try:
        result = import_file(
            db,
            filename=file.filename,
            content=content,
            uploaded_by=uploaded_by,
            source_type=source_type,
            auto_create_work_orders=auto_create,
        )
        return result
    except PartialImportError as e:
        return {
            "detail": str(e),
            "code": "PARTIAL_IMPORT",
            "success": e.success_count,
            "failed": e.failed_count,
            "errors": e.errors,
        }
    except ImportError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/export/", tags=["数据导出"])
def export_data(request: ExportRequest, db: Session = Depends(get_db)):
    try:
        export_data, export_log = export_work_orders(db, request)
        return {
            "export_log_id": export_log.id,
            "exported_at": export_log.exported_at,
            "count": len(export_data),
            "mask_sensitive": request.mask_sensitive,
            "data": export_data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/role-view-config/{role}", tags=["角色视图"])
def get_role_view(role: Role):
    return get_role_view_config(role)


@app.post("/api/retry-tasks/", tags=["重试队列"])
def create_retry_task(
    task_data: RetryTaskCreate,
    db: Session = Depends(get_db)
):
    from app.queue_service import create_retry_task
    from app.models import TaskType
    return create_retry_task(
        db,
        task_type=TaskType(task_data.task_type.value),
        task_data=task_data.task_data,
        created_by=task_data.created_by,
        max_retries=task_data.max_retries,
        work_order_id=task_data.work_order_id,
        priority=task_data.priority,
    )


@app.get("/api/retry-tasks/", tags=["重试队列"])
def get_retry_tasks(
    task_type: Optional[TaskType] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    from app.queue_service import get_pending_tasks
    from app.models import TaskType as TT
    tt = TT(task_type.value) if task_type else None
    return get_pending_tasks(db, task_type=tt, limit=limit)


@app.get("/api/queue-stats/", tags=["重试队列"])
def get_queue_stats(db: Session = Depends(get_db)):
    from app.queue_service import get_retry_queue_stats
    return get_retry_queue_stats(db)


@app.get("/api/dead-letter/", tags=["死信队列"])
def get_dead_letter_tasks(
    task_type: Optional[TaskType] = None,
    only_unresolved: bool = True,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.queue_service import get_dead_letter_tasks
    from app.models import TaskType as TT
    tt = TT(task_type.value) if task_type else None
    return get_dead_letter_tasks(db, task_type=tt, only_unresolved=only_unresolved, limit=limit)


@app.post("/api/dead-letter/resolve/", tags=["死信队列"])
def resolve_dead_letter(
    request: DeadLetterResolveRequest,
    db: Session = Depends(get_db)
):
    from app.queue_service import resolve_dead_letter
    try:
        result = resolve_dead_letter(
            db,
            dlq_id=request.dlq_id,
            resolved_by=request.resolved_by,
            resolution_note=request.resolution_note,
            requeue=request.requeue,
        )
        return {
            "status": "resolved",
            "dlq_id": request.dlq_id,
            "requeued": result is not None,
            "new_task_id": result.id if result else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/replay/sessions/", tags=["历史回放"])
def create_replay_session(
    request: ReplaySessionCreate,
    db: Session = Depends(get_db)
):
    from app.queue_service import replay_work_order_history
    try:
        return replay_work_order_history(
            db,
            work_order_id=request.work_order_id,
            created_by=request.created_by,
            name=request.name,
            description=request.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/replay/sessions/", tags=["历史回放"])
def list_replay_sessions(
    work_order_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    from app.queue_service import list_replay_sessions
    return list_replay_sessions(db, work_order_id=work_order_id, limit=limit)


@app.get("/api/replay/sessions/{session_id}", tags=["历史回放"])
def get_replay_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db)
):
    from app.queue_service import get_replay_session
    session = get_replay_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="回放会话不存在")
    return session


@app.post("/api/replay/to-timestamp/", tags=["历史回放"])
def replay_to_time(
    request: ReplayToTimestampRequest,
    db: Session = Depends(get_db)
):
    from app.queue_service import replay_to_timestamp
    try:
        return replay_to_timestamp(
            db,
            session_id=request.session_id,
            target_timestamp=request.target_timestamp,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/status-flow/", tags=["系统信息"])
def get_status_flow():
    from app.services import STATE_TRANSITION_MAP
    return {
        status.value: [s.value for s in states]
        for status, states in STATE_TRANSITION_MAP.items()
    }


@app.get("/api/health/", tags=["系统信息"])
def health_check():
    return {"status": "ok", "service": "城市照明抢修权限追责台账服务"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
