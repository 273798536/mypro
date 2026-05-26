from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Request, Body
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import os
import json

from database import get_db, WaveOrder, PickDifference, ReviewScan, TempSupplement, ShiftRecord, ImportSource, AsyncTask

class CorrectExceptionRequest(BaseModel):
    corrected_data: Dict[str, Any]
    reason: str
    operator: str = "system"

class ReplayWaveRequest(BaseModel):
    operator: str = "system"
    reason: str = ""
    include_inventory: bool = True
from services import (
    ImportService, AsyncTaskService, ReplayService, ReconciliationService,
    ExportService, ExceptionService
)
from utils import model_to_dict, setup_logger, generate_id
from config import IMPORT_DIR, EXPORT_DIR

logger = setup_logger("api")
app = FastAPI(title="仓内波次拣货验收回放链路API", version="1.0.0")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    content_type = request.headers.get('content-type', '')
    is_file_upload = content_type.startswith('multipart/form-data')
    
    if is_file_upload:
        body_str = '[FILE UPLOAD]'
    else:
        body_str = ''
    
    response = await call_next(request)
    
    try:
        from database import OperationLog
        db = next(get_db())
        
        log = OperationLog(
            log_id=generate_id('LOG'),
            operation_type='http_request',
            operator=request.headers.get('X-Operator', 'api'),
            module='api',
            action=request.method,
            request_info=json.dumps({
                'url': str(request.url),
                'method': request.method,
                'headers': {k: v for k, v in request.headers.items() if k.lower() not in ['content-type']},
                'body': body_str[:1000]
            }, ensure_ascii=False),
            response_info=json.dumps({
                'status_code': response.status_code
            }, ensure_ascii=False),
            ip_address=request.client.host if request.client else ''
        )
        db.add(log)
        db.commit()
        db.close()
    except Exception as e:
        logger.error(f"Failed to log request: {e}")
    
    return response

@app.get("/")
def root():
    return {"message": "仓内波次拣货验收回放链路服务", "version": "1.0.0"}

@app.post("/api/import/wave-orders")
def import_wave_orders(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(IMPORT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    import_service = ImportService(db)
    result = import_service.import_wave_orders(file_path, file.filename)
    return {"code": 0, "message": "success", "data": result}

@app.post("/api/import/pick-differences")
def import_pick_differences(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(IMPORT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    import_service = ImportService(db)
    result = import_service.import_pick_differences(file_path, file.filename)
    return {"code": 0, "message": "success", "data": result}

@app.post("/api/import/review-scans")
def import_review_scans(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(IMPORT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    import_service = ImportService(db)
    result = import_service.import_review_scans(file_path, file.filename)
    return {"code": 0, "message": "success", "data": result}

@app.post("/api/import/temp-supplements")
def import_temp_supplements(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(IMPORT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    import_service = ImportService(db)
    result = import_service.import_temp_supplements(file_path, file.filename)
    return {"code": 0, "message": "success", "data": result}

@app.post("/api/import/shift-records")
def import_shift_records(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(IMPORT_DIR, f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    import_service = ImportService(db)
    result = import_service.import_shift_records(file_path, file.filename)
    return {"code": 0, "message": "success", "data": result}

@app.get("/api/wave-orders")
def list_wave_orders(
    wave_no: Optional[str] = None,
    shift_code: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(WaveOrder)
    if wave_no:
        query = query.filter(WaveOrder.wave_no == wave_no)
    if shift_code:
        query = query.filter(WaveOrder.shift_code == shift_code)
    if is_duplicate is not None:
        query = query.filter(WaveOrder.is_duplicate == is_duplicate)
    
    total = query.count()
    items = query.order_by(WaveOrder.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/wave-orders/{id}")
def get_wave_order(id: int, db: Session = Depends(get_db)):
    item = db.query(WaveOrder).filter(WaveOrder.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"code": 0, "message": "success", "data": model_to_dict(item)}

@app.get("/api/pick-differences")
def list_pick_differences(
    wave_no: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(PickDifference)
    if wave_no:
        query = query.filter(PickDifference.wave_no == wave_no)
    if is_duplicate is not None:
        query = query.filter(PickDifference.is_duplicate == is_duplicate)
    
    total = query.count()
    items = query.order_by(PickDifference.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/review-scans")
def list_review_scans(
    wave_no: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ReviewScan)
    if wave_no:
        query = query.filter(ReviewScan.wave_no == wave_no)
    if is_duplicate is not None:
        query = query.filter(ReviewScan.is_duplicate == is_duplicate)
    
    total = query.count()
    items = query.order_by(ReviewScan.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/temp-supplements")
def list_temp_supplements(
    wave_no: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(TempSupplement)
    if wave_no:
        query = query.filter(TempSupplement.wave_no == wave_no)
    if is_duplicate is not None:
        query = query.filter(TempSupplement.is_duplicate == is_duplicate)
    
    total = query.count()
    items = query.order_by(TempSupplement.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/shift-records")
def list_shift_records(
    shift_code: Optional[str] = None,
    shift_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ShiftRecord)
    if shift_code:
        query = query.filter(ShiftRecord.shift_code == shift_code)
    if shift_date:
        query = query.filter(ShiftRecord.shift_date == shift_date)
    
    total = query.count()
    items = query.order_by(ShiftRecord.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.post("/api/replay/wave/{wave_no}")
def replay_wave(wave_no: str, request: ReplayWaveRequest, db: Session = Depends(get_db)):
    task_service = AsyncTaskService(db)
    task = task_service.create_task(
        task_type='replay_wave',
        task_name=f'回放波次-{wave_no}',
        payload={
            'wave_no': wave_no,
            'operator': request.operator,
            'reason': request.reason,
            'include_inventory': request.include_inventory
        },
        priority=1
    )
    return {"code": 0, "message": "success", "data": {"task_id": task.task_id}}

@app.get("/api/replay/history/{wave_no}")
def get_replay_history(wave_no: str, db: Session = Depends(get_db)):
    replay_service = ReplayService(db)
    history = replay_service.get_wave_history(wave_no)
    return {"code": 0, "message": "success", "data": history}

@app.get("/api/replay/detail/{replay_id}")
def get_replay_detail(replay_id: str, db: Session = Depends(get_db)):
    replay_service = ReplayService(db)
    try:
        detail = replay_service.get_replay_detail(replay_id)
        return {"code": 0, "message": "success", "data": detail}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/inventory/snapshots")
def list_inventory_snapshots(
    wave_no: Optional[str] = None,
    replay_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    from database import InventorySnapshot
    query = db.query(InventorySnapshot)
    if wave_no:
        query = query.filter(InventorySnapshot.wave_no == wave_no)
    if replay_id:
        query = query.filter(InventorySnapshot.replay_id == replay_id)
    
    total = query.count()
    items = query.order_by(InventorySnapshot.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/step-diffs")
def list_step_diffs(
    wave_no: Optional[str] = None,
    replay_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    from database import StepDiffRecord
    query = db.query(StepDiffRecord)
    if wave_no:
        query = query.filter(StepDiffRecord.wave_no == wave_no)
    if replay_id:
        query = query.filter(StepDiffRecord.replay_id == replay_id)
    
    total = query.count()
    items = query.order_by(StepDiffRecord.step_order.asc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.post("/api/reconciliation/{wave_no}")
def reconcile_wave(wave_no: str, db: Session = Depends(get_db)):
    task_service = AsyncTaskService(db)
    task = task_service.create_task(
        task_type='reconciliation',
        task_name=f'对账波次-{wave_no}',
        payload={'wave_no': wave_no},
        priority=1
    )
    return {"code": 0, "message": "success", "data": {"task_id": task.task_id}}

@app.post("/api/export/{report_type}")
def export_report(
    report_type: str,
    wave_no: Optional[str] = None,
    replay_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    params = {}
    if wave_no:
        params['wave_no'] = wave_no
    if replay_id:
        params['replay_id'] = replay_id
    
    task_service = AsyncTaskService(db)
    task = task_service.create_task(
        task_type='export_report',
        task_name=f'导出报表-{report_type}',
        payload={'report_type': report_type, 'params': params},
        priority=2
    )
    return {"code": 0, "message": "success", "data": {"task_id": task.task_id}}

@app.get("/api/export/download/{filename}")
def download_export(filename: str):
    filepath = os.path.join(EXPORT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(filepath, filename=filename)

@app.get("/api/tasks")
def list_tasks(
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(AsyncTask)
    if status:
        query = query.filter(AsyncTask.status == status)
    if task_type:
        query = query.filter(AsyncTask.task_type == task_type)
    
    total = query.count()
    items = query.order_by(AsyncTask.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"code": 0, "message": "success", "data": model_to_dict(task)}

@app.post("/api/tasks/resume")
def resume_failed_tasks(db: Session = Depends(get_db)):
    task_service = AsyncTaskService(db)
    resumed = task_service.resume_failed_tasks()
    return {"code": 0, "message": "success", "data": {"resumed_count": len(resumed)}}

@app.get("/api/exceptions")
def list_exceptions(
    wave_no: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    from database import ExceptionRecord
    query = db.query(ExceptionRecord)
    if wave_no:
        query = query.filter(ExceptionRecord.wave_no == wave_no)
    if status:
        query = query.filter(ExceptionRecord.status == status)
    
    total = query.count()
    items = query.order_by(ExceptionRecord.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.get("/api/exceptions/{exception_id}")
def get_exception_detail(exception_id: str, db: Session = Depends(get_db)):
    exception_service = ExceptionService(db)
    detail = exception_service.get_exception_detail(exception_id)
    return {"code": 0, "message": "success", "data": detail}

@app.post("/api/exceptions/{exception_id}/correct")
def correct_exception(
    exception_id: str,
    request: CorrectExceptionRequest,
    db: Session = Depends(get_db)
):
    exception_service = ExceptionService(db)
    result = exception_service.correct_exception(
        exception_id,
        request.corrected_data,
        request.reason,
        request.operator
    )
    return {"code": 0, "message": "success", "data": result}

@app.get("/api/import-sources")
def list_import_sources(
    source_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ImportSource)
    if source_type:
        query = query.filter(ImportSource.source_type == source_type)
    
    total = query.count()
    items = query.order_by(ImportSource.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [model_to_dict(item) for item in items]
        }
    }

@app.on_event("startup")
async def startup_event():
    from worker import TaskWorker
    app.state.worker = TaskWorker()
    app.state.worker.start()

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, 'worker'):
        app.state.worker.stop()

if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT
    uvicorn.run(app, host=API_HOST, port=API_PORT)
