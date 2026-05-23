import asyncio
import json
import traceback
from datetime import datetime
from typing import Callable, Dict, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import crud
from app.models import TaskStatus


class TaskHandler:
    def __init__(self):
        self.handlers: Dict[str, Callable] = {}

    def register(self, task_type: str):
        def decorator(func: Callable):
            self.handlers[task_type] = func
            return func
        return decorator

    async def handle(self, task_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if task_type not in self.handlers:
            raise ValueError(f"No handler registered for task type: {task_type}")
        return await self.handlers[task_type](payload)


task_handler = TaskHandler()


class TaskProcessor:
    def __init__(self, poll_interval: int = 5):
        self.poll_interval = poll_interval
        self.running = False

    async def process_task(self, task) -> None:
        db: Session = SessionLocal()
        try:
            crud.async_task.update_status(db, task.task_id, TaskStatus.PROCESSING)
            
            payload = json.loads(task.payload) if task.payload else {}
            result = await task_handler.handle(task.task_type, payload)
            
            crud.async_task.update_status(db, task.task_id, TaskStatus.SUCCESS, result=result)
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            stack_trace = traceback.format_exc()
            
            db.refresh(task)
            if task.retry_count >= task.max_retries - 1:
                if self._requires_manual_intervention(e):
                    crud.async_task.update_status(
                        db, task.task_id, TaskStatus.MANUAL,
                        error_message=f"{error_msg}\n{stack_trace}"
                    )
                else:
                    crud.async_task.update_status(
                        db, task.task_id, TaskStatus.PERMANENT_FAIL,
                        error_message=f"{error_msg}\n{stack_trace}"
                    )
            else:
                crud.async_task.update_status(
                    db, task.task_id, TaskStatus.RETRY,
                    error_message=error_msg
                )
        finally:
            db.close()

    def _requires_manual_intervention(self, exception: Exception) -> bool:
        manual_exceptions = [
            "DataConflictError",
            "ValidationError",
            "PermissionError",
        ]
        return any(ex in type(exception).__name__ for ex in manual_exceptions)

    async def run(self) -> None:
        self.running = True
        while self.running:
            db: Session = SessionLocal()
            try:
                tasks = crud.async_task.get_pending_tasks(db, limit=10)
                for task in tasks:
                    await self.process_task(task)
            except Exception as e:
                print(f"Task processor error: {e}")
            finally:
                db.close()
            await asyncio.sleep(self.poll_interval)

    def stop(self) -> None:
        self.running = False


@task_handler.register("calculate_deposit_deduction")
async def handle_deposit_deduction(payload: Dict[str, Any]) -> Dict[str, Any]:
    from app.business_logic import calculate_deposit_deduction
    
    warehouse_order_no = payload.get("warehouse_order_no")
    return_record_ids = payload.get("return_record_ids", [])
    operator = payload.get("operator")
    
    db = SessionLocal()
    try:
        result = calculate_deposit_deduction(db, warehouse_order_no, return_record_ids, operator)
        return {
            "deduction_no": result.deduction_no,
            "total_deduction": result.total_deduction,
            "detail_items": result.detail_items,
            "evidence_chain": result.evidence_chain
        }
    finally:
        db.close()


@task_handler.register("process_import_batch")
async def handle_import_batch(payload: Dict[str, Any]) -> Dict[str, Any]:
    from app.import_service import process_import_file
    
    file_path = payload.get("file_path")
    import_type = payload.get("import_type")
    operator = payload.get("operator")
    
    db = SessionLocal()
    try:
        result = process_import_file(db, file_path, import_type, operator)
        return {
            "batch_no": result.batch_no,
            "total_count": result.total_count,
            "success_count": result.success_count,
            "failed_count": result.failed_count
        }
    finally:
        db.close()


@task_handler.register("generate_export")
async def handle_generate_export(payload: Dict[str, Any]) -> Dict[str, Any]:
    from app.export_service import generate_export
    
    export_type = payload.get("export_type")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    customer_id = payload.get("customer_id")
    include_evidence = payload.get("include_evidence", True)
    
    db = SessionLocal()
    try:
        file_path = generate_export(
            db, export_type, start_date, end_date, customer_id, include_evidence
        )
        return {"file_path": file_path}
    finally:
        db.close()
