import time
import traceback
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Callable
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import (
    RetryQueue, DeadLetterQueue, ReplaySession,
    TaskStatus, TaskType, WorkOrder, StatusTransition
)


class MaxRetriesExceeded(Exception):
    pass


def calculate_next_retry_time(retry_count: int, base_delay: int = 60) -> datetime:
    delay = base_delay * (2 ** retry_count)
    return datetime.utcnow() + timedelta(seconds=delay)


def create_retry_task(
    db: Session,
    task_type: TaskType,
    task_data: Dict[str, Any],
    created_by: Optional[int] = None,
    max_retries: int = 3,
    work_order_id: Optional[int] = None,
    priority: int = 0,
) -> RetryQueue:
    task = RetryQueue(
        task_type=task_type,
        task_data=task_data,
        status=TaskStatus.PENDING,
        retry_count=0,
        max_retries=max_retries,
        next_retry_at=datetime.utcnow(),
        created_by=created_by,
        work_order_id=work_order_id,
        priority=priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_pending_tasks(
    db: Session,
    task_type: Optional[TaskType] = None,
    limit: int = 10,
) -> List[RetryQueue]:
    query = db.query(RetryQueue).filter(
        and_(
            RetryQueue.status.in_([TaskStatus.PENDING, TaskStatus.RETRYING]),
            RetryQueue.next_retry_at <= datetime.utcnow(),
        )
    ).order_by(RetryQueue.priority.desc(), RetryQueue.created_at.asc())
    
    if task_type:
        query = query.filter(RetryQueue.task_type == task_type)
    
    return query.limit(limit).all()


def execute_task(
    db: Session,
    task: RetryQueue,
    executor: Callable[[Dict[str, Any]], Any],
) -> Any:
    task.status = TaskStatus.PROCESSING
    task.updated_at = datetime.utcnow()
    db.commit()
    
    try:
        result = executor(task.task_data)
        
        task.status = TaskStatus.COMPLETED
        task.updated_at = datetime.utcnow()
        db.commit()
        
        return result
        
    except Exception as e:
        task.retry_count += 1
        task.last_error = str(e)
        task.last_retry_at = datetime.utcnow()
        task.updated_at = datetime.utcnow()
        
        if task.retry_count >= task.max_retries:
            task.status = TaskStatus.FAILED
            db.commit()
            
            move_to_dead_letter(
                db,
                task,
                error_message=str(e),
                error_stacktrace=traceback.format_exc(),
            )
            
            raise MaxRetriesExceeded(
                f"Task {task.id} failed after {task.max_retries} retries: {e}"
            )
        else:
            task.status = TaskStatus.RETRYING
            task.next_retry_at = calculate_next_retry_time(task.retry_count)
            db.commit()
            
            raise e


def move_to_dead_letter(
    db: Session,
    task: RetryQueue,
    error_message: str,
    error_stacktrace: Optional[str] = None,
    moved_by: Optional[int] = None,
) -> DeadLetterQueue:
    dlq = DeadLetterQueue(
        original_task_id=task.id,
        task_type=task.task_type,
        task_data=task.task_data,
        error_message=error_message,
        error_stacktrace=error_stacktrace,
        retry_count=task.retry_count,
        moved_by=moved_by,
        work_order_id=task.work_order_id,
    )
    db.add(dlq)
    db.commit()
    db.refresh(dlq)
    return dlq


def get_dead_letter_tasks(
    db: Session,
    task_type: Optional[TaskType] = None,
    only_unresolved: bool = True,
    limit: int = 100,
) -> List[DeadLetterQueue]:
    query = db.query(DeadLetterQueue)
    
    if only_unresolved:
        query = query.filter(DeadLetterQueue.is_resolved == False)
    
    if task_type:
        query = query.filter(DeadLetterQueue.task_type == task_type)
    
    return query.order_by(DeadLetterQueue.moved_at.desc()).limit(limit).all()


def resolve_dead_letter(
    db: Session,
    dlq_id: int,
    resolved_by: int,
    resolution_note: str,
    requeue: bool = False,
) -> Optional[RetryQueue]:
    dlq = db.query(DeadLetterQueue).filter(DeadLetterQueue.id == dlq_id).first()
    if not dlq:
        raise ValueError(f"Dead letter task {dlq_id} not found")
    
    dlq.is_resolved = True
    dlq.resolved_at = datetime.utcnow()
    dlq.resolved_by = resolved_by
    dlq.resolution_note = resolution_note
    db.commit()
    
    if requeue:
        return create_retry_task(
            db,
            task_type=dlq.task_type,
            task_data=dlq.task_data,
            created_by=resolved_by,
            work_order_id=dlq.work_order_id,
        )
    
    return None


def replay_work_order_history(
    db: Session,
    work_order_id: int,
    created_by: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> ReplaySession:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise ValueError(f"Work order {work_order_id} not found")
    
    transitions = db.query(StatusTransition).filter(
        StatusTransition.work_order_id == work_order_id
    ).order_by(StatusTransition.occurred_at.asc()).all()
    
    if not transitions:
        raise ValueError(f"No history found for work order {work_order_id}")
    
    events = []
    for i, t in enumerate(transitions):
        events.append({
            "sequence": i + 1,
            "timestamp": t.occurred_at.isoformat(),
            "from_status": t.from_status.value if t.from_status else None,
            "to_status": t.to_status.value,
            "operator_id": t.operator_id,
            "operator_name": t.operator.real_name if t.operator else None,
            "reason": t.reason,
            "transition_id": t.id,
        })
    
    session = ReplaySession(
        name=name or f"Replay-WO{work_order_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        description=description or f"History replay for work order {work_order_id}",
        work_order_id=work_order_id,
        start_time=transitions[0].occurred_at,
        end_time=transitions[-1].occurred_at,
        created_by=created_by,
        replay_events=events,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


def get_replay_session(
    db: Session,
    session_id: int,
) -> Optional[ReplaySession]:
    return db.query(ReplaySession).filter(ReplaySession.id == session_id).first()


def list_replay_sessions(
    db: Session,
    work_order_id: Optional[int] = None,
    limit: int = 50,
) -> List[ReplaySession]:
    query = db.query(ReplaySession)
    
    if work_order_id:
        query = query.filter(ReplaySession.work_order_id == work_order_id)
    
    return query.order_by(ReplaySession.created_at.desc()).limit(limit).all()


def replay_to_timestamp(
    db: Session,
    session_id: int,
    target_timestamp: datetime,
) -> Dict[str, Any]:
    session = get_replay_session(db, session_id)
    if not session:
        raise ValueError(f"Replay session {session_id} not found")
    
    events_before_target = [
        e for e in session.replay_events
        if datetime.fromisoformat(e["timestamp"]) <= target_timestamp
    ]
    
    if not events_before_target:
        return {
            "session_id": session_id,
            "target_timestamp": target_timestamp.isoformat(),
            "state": "before_first_event",
            "events_applied": 0,
            "current_status": None,
        }
    
    last_event = events_before_target[-1]
    
    return {
        "session_id": session_id,
        "target_timestamp": target_timestamp.isoformat(),
        "state": "replayed",
        "events_applied": len(events_before_target),
        "current_status": last_event["to_status"],
        "last_operator": last_event["operator_name"],
        "last_reason": last_event["reason"],
        "replay_events": events_before_target,
    }


def run_retry_worker(
    db: Session,
    task_executors: Dict[TaskType, Callable],
    poll_interval: int = 5,
    max_iterations: Optional[int] = None,
) -> None:
    iterations = 0
    
    while max_iterations is None or iterations < max_iterations:
        tasks = get_pending_tasks(db, limit=10)
        
        for task in tasks:
            executor = task_executors.get(task.task_type)
            if not executor:
                continue
            
            try:
                execute_task(db, task, executor)
            except MaxRetriesExceeded:
                continue
            except Exception:
                continue
        
        iterations += 1
        if max_iterations is None or iterations < max_iterations:
            time.sleep(poll_interval)


def get_retry_queue_stats(db: Session) -> Dict[str, Any]:
    stats = {
        status.value: db.query(RetryQueue).filter(RetryQueue.status == status).count()
        for status in TaskStatus
    }
    
    dlq_stats = {
        "total": db.query(DeadLetterQueue).count(),
        "unresolved": db.query(DeadLetterQueue).filter(DeadLetterQueue.is_resolved == False).count(),
        "resolved": db.query(DeadLetterQueue).filter(DeadLetterQueue.is_resolved == True).count(),
    }
    
    return {
        "retry_queue": stats,
        "dead_letter_queue": dlq_stats,
    }
