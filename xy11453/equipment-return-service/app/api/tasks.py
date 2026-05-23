from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas
from app.models import TaskStatus

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/deduction/calculate")
def calculate_deduction_async(
    request: schemas.DeductionCalculationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    task = crud.async_task.create(
        db,
        task_type="calculate_deposit_deduction",
        payload={
            "warehouse_order_no": request.warehouse_order_no,
            "return_record_ids": request.return_record_ids,
            "operator": request.operator
        }
    )
    return {"task_id": task.task_id, "status": TaskStatus.PENDING}


@router.get("/{task_id}", response_model=schemas.AsyncTaskResponse)
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    task = crud.async_task.get_by_task_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/", response_model=List[schemas.AsyncTaskResponse])
def list_tasks(
    status: TaskStatus = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(crud.AsyncTask)
    if status:
        query = query.filter(crud.AsyncTask.status == status)
    return query.offset(skip).limit(limit).all()


@router.get("/manual/pending", response_model=List[schemas.AsyncTaskResponse])
def list_manual_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.async_task.get_manual_tasks(db, skip=skip, limit=limit)


@router.post("/{task_id}/retry")
def retry_task(task_id: str, db: Session = Depends(get_db)):
    task = crud.async_task.get_by_task_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status not in [TaskStatus.MANUAL, TaskStatus.PERMANENT_FAIL]:
        raise HTTPException(status_code=400, detail="Task cannot be retried")
    
    task = crud.async_task.update_status(
        db, task_id, TaskStatus.RETRY, error_message=None
    )
    return {"task_id": task_id, "status": TaskStatus.RETRY}


@router.get("/exceptions/", response_model=List[schemas.ReplayExceptionResponse])
def list_exceptions(
    unresolved_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    if unresolved_only:
        return crud.replay_exception.get_unresolved(db, skip=skip, limit=limit)
    return db.query(crud.ReplayException).offset(skip).limit(limit).all()


@router.get("/exceptions/{exception_no}", response_model=schemas.ReplayExceptionResponse)
def get_exception(exception_no: str, db: Session = Depends(get_db)):
    exc = db.query(crud.ReplayException).filter(crud.ReplayException.exception_no == exception_no).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
    return exc
