import threading
import time
import json
from datetime import datetime
from typing import Dict, Any, Callable, Dict as TypedDict
from app.models import AsyncTask, Ticket, PlaybackException
from app.models.log_models import OperationLog


class TaskHandler:
    _handlers: Dict[str, Callable] = {}

    @classmethod
    def register(cls, task_type: str):
        def decorator(handler_func: Callable):
            cls._handlers[task_type] = handler_func
            return handler_func
        return decorator

    @classmethod
    def get_handler(cls, task_type: str) -> Callable:
        return cls._handlers.get(task_type)

    @classmethod
    def get_all_handlers(cls) -> Dict[str, Callable]:
        return cls._handlers


class TaskScheduler:
    def __init__(self, poll_interval: int = 5):
        self.poll_interval = poll_interval
        self._running = False
        self._thread = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        resumed_count = AsyncTask.resume_pending_after_restart()
        if resumed_count > 0:
            OperationLog.log_operation(
                operation_type='task_resumed',
                operation_module='task_scheduler',
                request_params={'resumed_count': resumed_count},
                response_status='success'
            )

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=10)

    def _run_loop(self):
        while self._running:
            try:
                self._process_tasks()
            except Exception as e:
                print(f"Task scheduler error: {e}")
            time.sleep(self.poll_interval)

    def _process_tasks(self):
        pending_tasks = AsyncTask.get_pending_tasks(limit=5)
        for task in pending_tasks:
            self._execute_task(task)

        retry_tasks = AsyncTask.get_retry_tasks(limit=5)
        for task in retry_tasks:
            self._execute_task(task)

    def _execute_task(self, task: AsyncTask):
        try:
            task.start()
            
            handler = TaskHandler.get_handler(task.task_type)
            if not handler:
                task.mark_failed_permanent(f"No handler found for task type: {task.task_type}")
                return
            
            params = json.loads(task.task_params) if task.task_params else {}
            
            result = handler(task.id, params)
            
            task.mark_success(result)
            
            OperationLog.log_operation(
                operation_type='task_completed',
                operation_module='task_scheduler',
                request_params={'task_id': task.id, 'task_type': task.task_type},
                response_status='success'
            )
            
        except Exception as e:
            error_msg = str(e)
            if "manual" in error_msg.lower() or "requires_human" in str(params.get('error_type', '')):
                task.mark_waiting_manual(error_msg)
            elif "retry" in error_msg.lower():
                task.mark_for_retry(error_msg)
            else:
                task.mark_for_retry(error_msg)
            
            OperationLog.log_operation(
                operation_type='task_failed',
                operation_module='task_scheduler',
                request_params={'task_id': task.id, 'task_type': task.task_type},
                response_data={'error': error_msg, 'status': task.task_status},
                response_status='failed'
            )


@TaskHandler.register('playback_ticket')
def handle_playback_ticket(task_id: int, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.playback_service import PlaybackService
    
    ticket_id = params.get('ticket_id')
    if not ticket_id:
        raise ValueError("Missing ticket_id")
    
    service = PlaybackService()
    result = service.playback_ticket(ticket_id)
    return result


@TaskHandler.register('reconciliation')
def handle_reconciliation(task_id: int, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.reconciliation_service import ReconciliationService
    
    date = params.get('date')
    operator = params.get('operator')
    
    service = ReconciliationService()
    result = service.run_reconciliation(date, operator)
    return result


@TaskHandler.register('export_data')
def handle_export_data(task_id: int, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.export_service import ExportService
    
    export_type = params.get('export_type', 'tickets')
    filters = params.get('filters', {})
    
    service = ExportService()
    result = service.export_data(export_type, filters)
    return result


@TaskHandler.register('process_exception')
def handle_process_exception(task_id: int, params: Dict[str, Any]) -> Dict[str, Any]:
    exception_id = params.get('exception_id')
    action = params.get('action', 'auto_resolve')
    
    exception = PlaybackException.get_by_id(exception_id)
    if not exception:
        raise ValueError(f"Exception {exception_id} not found")
    
    if action == 'auto_resolve':
        exception.resolve("Auto resolved by system", "system")
        return {'status': 'resolved', 'exception_id': exception_id}
    
    return {'status': 'pending_manual', 'exception_id': exception_id}


@TaskHandler.register('batch_playback')
def handle_batch_playback(task_id: int, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.playback_service import PlaybackService
    from app.models import Ticket
    
    ticket_ids = params.get('ticket_ids', [])
    if not ticket_ids:
        raise ValueError("Missing ticket_ids")
    
    service = PlaybackService()
    results = []
    success_count = 0
    failed_count = 0
    
    for ticket_id in ticket_ids:
        try:
            result = service.playback_ticket(ticket_id)
            results.append({
                'ticket_id': ticket_id,
                'status': 'success',
                'verdict': result.get('final_verdict', {})
            })
            success_count += 1
        except Exception as e:
            results.append({
                'ticket_id': ticket_id,
                'status': 'failed',
                'error': str(e)
            })
            failed_count += 1
    
    return {
        'total': len(ticket_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'results': results
    }
