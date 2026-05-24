from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, init_db
from app.models import WorkOrderStatus, Role, SourceType
from app.schemas import (
    WorkOrder, WorkOrderCreate, WorkOrderUpdate, WorkOrderDetail,
    StatusChangeRequest, FreezeRequest, ExportRequest,
    JudgmentCreate, EvidenceCreate, ImportResult,
    User, UserCreate
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


@app.get("/api/work-orders/", response_model=List[WorkOrder], tags=["工单管理"])
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
        return [apply_role_view(wo.__dict__, viewer_role) for wo in work_orders]
    
    return work_orders


@app.get("/api/work-orders/{work_order_id}", response_model=WorkOrderDetail, tags=["工单管理"])
def read_work_order(
    work_order_id: int,
    viewer_role: Optional[Role] = None,
    db: Session = Depends(get_db)
):
    db_wo = get_work_order(db, work_order_id=work_order_id)
    if db_wo is None:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    if viewer_role:
        wo_dict = db_wo.__dict__
        wo_dict["raw_record"] = db_wo.raw_record.__dict__ if db_wo.raw_record else None
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
