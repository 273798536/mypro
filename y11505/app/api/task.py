from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.constants import TaskStatus
from app.tasks.task_manager import TaskManager
from app.tasks.data_processing import DataProcessingTask
from app.schemas.common import TaskResponse, OperationResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[dict])
def list_tasks(
    status: TaskStatus = Query(None, description="任务状态过滤"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    
    if status:
        tasks = db.query(__import__('app.models').models.AsyncTask).filter(
            __import__('app.models').models.AsyncTask.status == status
        ).order_by(__import__('app.models').models.AsyncTask.created_at.desc()).limit(limit).all()
    else:
        tasks = db.query(__import__('app.models').models.AsyncTask).order_by(
            __import__('app.models').models.AsyncTask.created_at.desc()
        ).limit(limit).all()
    
    return [
        {
            "task_id": t.id,
            "task_name": t.task_name,
            "task_type": t.task_type,
            "status": t.status,
            "batch_id": t.batch_id,
            "retry_count": t.retry_count,
            "max_retries": t.max_retries,
            "error_message": t.error_message,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }
        for t in tasks
    ]


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    manager = TaskManager(db)
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return TaskResponse(
        task_id=task.id,
        task_name=task.task_name,
        status=task.status,
        message=task.error_message,
        result=task.result,
        created_at=task.created_at,
    )


@router.post("/process-batch", response_model=OperationResponse)
def create_process_batch_task(
    batch_id: str = Query(..., description="批次ID"),
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    manager.register_handler("process_batch", DataProcessingTask.process_batch_import)
    
    task = manager.create_task(
        task_name="批次数据处理",
        task_type="process_batch",
        payload={"batch_id": batch_id},
        batch_id=batch_id,
        operator=operator,
    )
    
    return OperationResponse(
        success=True,
        message="任务创建成功",
        data={"task_id": task.id},
    )


@router.post("/validate-batch", response_model=OperationResponse)
def create_validate_batch_task(
    batch_id: str = Query(..., description="批次ID"),
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    manager.register_handler("validate_batch", DataProcessingTask.validate_batch_data)
    
    task = manager.create_task(
        task_name="批次数据校验",
        task_type="validate_batch",
        payload={"batch_id": batch_id},
        batch_id=batch_id,
        operator=operator,
    )
    
    return OperationResponse(
        success=True,
        message="任务创建成功",
        data={"task_id": task.id},
    )


@router.post("/simulate-failure", response_model=OperationResponse)
def create_simulate_failure_task(
    failure_type: str = Query("transient", description="失败类型: transient/manual/permanent"),
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    manager.register_handler("simulate_failure", DataProcessingTask.simulate_failure)
    
    task = manager.create_task(
        task_name=f"失败模拟-{failure_type}",
        task_type="simulate_failure",
        payload={"failure_type": failure_type, "current_attempt": 1},
        operator=operator,
    )
    
    return OperationResponse(
        success=True,
        message="失败模拟任务创建成功",
        data={"task_id": task.id},
    )


@router.post("/run-pending", response_model=OperationResponse)
def run_pending_tasks(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    manager.register_handler("process_batch", DataProcessingTask.process_batch_import)
    manager.register_handler("validate_batch", DataProcessingTask.validate_batch_data)
    manager.register_handler("simulate_failure", DataProcessingTask.simulate_failure)
    
    results = manager.run_pending_tasks(limit=limit)
    return OperationResponse(
        success=True,
        message=f"执行了 {results['success'] + results['failed'] + results['waiting_manual']} 个任务",
        data=results,
    )


@router.post("/{task_id}/retry", response_model=OperationResponse)
def retry_task(
    task_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    success = manager.retry_task(task, operator)
    if not success:
        return OperationResponse(success=False, message="任务状态不允许重试")
    
    return OperationResponse(success=True, message="任务已标记为重试")


@router.post("/{task_id}/mark-failed", response_model=OperationResponse)
def mark_task_permanent_failed(
    task_id: str,
    reason: str = Query(..., description="失败原因"),
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    manager = TaskManager(db)
    task = manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    success = manager.mark_as_permanent_failed(task, reason, operator)
    if not success:
        return OperationResponse(success=False, message="只有等待人工处理的任务才能标记为永久失败")
    
    return OperationResponse(success=True, message="任务已标记为永久失败")


@router.post("/recover", response_model=OperationResponse)
def recover_after_restart(db: Session = Depends(get_db)):
    manager = TaskManager(db)
    recovered = manager.recover_after_restart()
    return OperationResponse(
        success=True,
        message=f"服务恢复完成，恢复了 {recovered} 个卡住的任务",
        data={"recovered_count": recovered},
    )
