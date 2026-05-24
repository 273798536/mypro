from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import TaskStatus, ConflictStrategy
from app.schemas import (
    TaskSubmitRequest, TaskSubmitResponse, TaskResponse,
    TaskDetailResponse, TaskListResponse, TaskHistoryResponse,
    ManualHandleRequest, RetryRequest, CancelRequest,
    FreezeRequest, CloseRequest, StatisticsResponse,
    DeadLetterListResponse, DeadLetterTaskResponse
)
from app.services.task_service import TaskService
from app.services.dead_letter_service import DeadLetterService
from app.services.export_service import ExportService

router = APIRouter()

@router.post("/tasks", response_model=TaskSubmitResponse, summary="提交投标资料任务")
def submit_task(request: TaskSubmitRequest, db: Session = Depends(get_db)):
    task, message = TaskService.create_task(db, request)
    return TaskSubmitResponse(
        task_id=task.id,
        batch_id=task.batch_id,
        status=task.status,
        message=message
    )

@router.get("/tasks", response_model=TaskListResponse, summary="获取任务列表")
def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    tender_no: Optional[str] = None,
    submitter: Optional[str] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    total, items = TaskService.list_tasks(
        db, page, page_size, status, tender_no, submitter, batch_id
    )
    return TaskListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[TaskResponse.model_validate(item) for item in items]
    )

@router.get("/tasks/{task_id}", response_model=TaskDetailResponse, summary="获取任务详情")
def get_task_detail(task_id: int, db: Session = Depends(get_db)):
    detail = TaskService.get_task_detail(db, task_id)
    if not detail:
        raise HTTPException(status_code=404, detail="任务不存在")
    return detail

@router.get("/tasks/{task_id}/histories", response_model=list[TaskHistoryResponse], summary="获取任务历史记录")
def get_task_histories(task_id: int, db: Session = Depends(get_db)):
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    histories = TaskService.get_task_histories(db, task_id)
    return [TaskHistoryResponse.model_validate(h) for h in histories]

@router.post("/tasks/{task_id}/retry", response_model=TaskResponse, summary="手动重试任务")
def retry_task(task_id: int, request: RetryRequest, db: Session = Depends(get_db)):
    task = TaskService.retry_task(db, task_id, request)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或当前状态不支持重试")
    return TaskResponse.model_validate(task)

@router.post("/tasks/{task_id}/cancel", response_model=TaskResponse, summary="取消任务")
def cancel_task(task_id: int, request: CancelRequest, db: Session = Depends(get_db)):
    task = TaskService.cancel_task(db, task_id, request)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或当前状态不支持取消")
    return TaskResponse.model_validate(task)

@router.post("/tasks/{task_id}/manual", response_model=TaskResponse, summary="人工改判任务状态")
def manual_handle(task_id: int, request: ManualHandleRequest, db: Session = Depends(get_db)):
    task = TaskService.manual_handle(db, task_id, request)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或当前状态不支持人工改判")
    return TaskResponse.model_validate(task)

@router.post("/tasks/{task_id}/freeze", response_model=TaskResponse, summary="冻结任务（导出前锁定）")
def freeze_task(task_id: int, request: FreezeRequest, db: Session = Depends(get_db)):
    task = TaskService.freeze_task(db, task_id, request)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或已冻结")
    return TaskResponse.model_validate(task)

@router.post("/tasks/{task_id}/unfreeze", response_model=TaskResponse, summary="解冻任务")
def unfreeze_task(
    task_id: int,
    operator: str = Query(..., description="操作人"),
    remark: Optional[str] = Query(None, description="备注"),
    db: Session = Depends(get_db)
):
    task = TaskService.unfreeze_task(db, task_id, operator, remark)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或未冻结")
    return TaskResponse.model_validate(task)

@router.post("/tasks/{task_id}/close", response_model=TaskResponse, summary="关闭任务（补偿入账后）")
def close_task(task_id: int, request: CloseRequest, db: Session = Depends(get_db)):
    task = TaskService.close_task(db, task_id, request)
    if not task:
        raise HTTPException(status_code=400, detail="任务不存在或已关闭")
    return TaskResponse.model_validate(task)

@router.get("/dead-letters", response_model=DeadLetterListResponse, summary="获取死信队列列表")
def list_dead_letters(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    handled: Optional[bool] = None,
    is_recoverable: Optional[bool] = None,
    retry_classification: Optional[str] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    total, items = DeadLetterService.list_dead_letters(
        db, page, page_size, handled, is_recoverable, retry_classification, batch_id
    )
    
    result_items = []
    for item in items:
        dl_response = DeadLetterTaskResponse.model_validate(item)
        task = TaskService.get_task(db, item.task_id)
        if task:
            dl_response.task_detail = TaskResponse.model_validate(task)
        result_items.append(dl_response)
    
    return DeadLetterListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=result_items
    )

@router.get("/dead-letters/{dead_letter_id}", response_model=DeadLetterTaskResponse, summary="获取死信详情")
def get_dead_letter(dead_letter_id: int, db: Session = Depends(get_db)):
    dead_letter = DeadLetterService.get_dead_letter(db, dead_letter_id)
    if not dead_letter:
        raise HTTPException(status_code=404, detail="死信不存在")
    
    response = DeadLetterTaskResponse.model_validate(dead_letter)
    task = TaskService.get_task(db, dead_letter.task_id)
    if task:
        response.task_detail = TaskResponse.model_validate(task)
    
    return response

@router.post("/dead-letters/{dead_letter_id}/mark-handled", response_model=DeadLetterTaskResponse, summary="标记死信已处理")
def mark_dead_letter_handled(
    dead_letter_id: int,
    handler: str = Query(..., description="处理人"),
    handle_result: str = Query(..., description="处理结果"),
    remark: Optional[str] = Query(None, description="备注"),
    db: Session = Depends(get_db)
):
    dead_letter = DeadLetterService.mark_handled(
        db, dead_letter_id, handler, handle_result, remark
    )
    if not dead_letter:
        raise HTTPException(status_code=404, detail="死信不存在")
    return DeadLetterTaskResponse.model_validate(dead_letter)

@router.get("/statistics", response_model=StatisticsResponse, summary="获取统计数据")
def get_statistics(db: Session = Depends(get_db)):
    stats = TaskService.get_statistics(db)
    return StatisticsResponse(**stats)

@router.get("/dead-letters/classification/stats", summary="获取死信分类统计")
def get_classification_stats(db: Session = Depends(get_db)):
    return DeadLetterService.get_classification_stats(db)

@router.get("/export/tasks/csv", summary="导出任务列表CSV")
def export_tasks_csv(
    status: Optional[TaskStatus] = None,
    tender_no: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    csv_content = ExportService.export_tasks_to_csv(
        db, status, tender_no, start_date, end_date
    )
    
    filename = f"tender_tasks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([csv_content.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/histories/csv", summary="导出历史记录CSV")
def export_histories_csv(
    task_id: Optional[int] = None,
    batch_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    csv_content = ExportService.export_histories_to_csv(
        db, task_id, batch_id, start_date, end_date
    )
    
    filename = f"task_histories_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([csv_content.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/tasks/excel", summary="导出任务列表Excel")
def export_tasks_excel(
    status: Optional[TaskStatus] = None,
    tender_no: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    try:
        excel_content = ExportService.export_tasks_to_excel(
            db, status, tender_no, start_date, end_date
        )
        
        filename = f"tender_tasks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            iter([excel_content.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="pandas和openpyxl库未安装，无法导出Excel")
