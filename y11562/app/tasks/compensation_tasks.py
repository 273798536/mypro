import random
import time
from datetime import datetime
from celery import Task
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.models import CompensationStatus, FailureType
from app.services.compensation_service import (
    process_compensation,
    handle_processing_success,
    handle_processing_failure,
    get_pending_retry_compensations,
    get_compensation_by_no,
    update_compensation_celery_task_id,
    retry_compensation
)


class SQLAlchemyTask(Task):
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()


def simulate_external_system_call(compensation_no: str) -> tuple[bool, str, FailureType]:
    """
    模拟外部系统调用，用于演示：
    - 30% 成功率
    - 40% 可重试失败（网络超时等）
    - 20% 需要人工介入（数据校验问题）
    - 10% 永久失败（数据不存在）
    """
    rand = random.random()
    
    if rand < 0.3:
        return True, "补偿成功", None
    elif rand < 0.7:
        return False, "外部系统连接超时，请稍后重试", FailureType.RETRYABLE
    elif rand < 0.9:
        return False, "入住单数据校验不通过，请人工核实", FailureType.NEED_MANUAL
    else:
        return False, "入住单号不存在，无法进行补偿", FailureType.PERMANENT


@celery_app.task(base=SQLAlchemyTask, bind=True, name="process_compensation")
def process_compensation_task(self, compensation_no: str):
    db = self.db
    
    compensation = get_compensation_by_no(db, compensation_no)
    if not compensation:
        return {"status": "error", "message": "补偿记录不存在"}
    
    if compensation.status not in [CompensationStatus.PENDING, CompensationStatus.WAITING_RETRY]:
        return {"status": "error", "message": f"当前状态{compensation.status.value}不允许处理"}
    
    update_compensation_celery_task_id(db, compensation.id, self.request.id)
    
    success, message, status = process_compensation(db, compensation_no)
    if not success:
        return {"status": "error", "message": message}
    
    time.sleep(1)
    
    success, result_message, failure_type = simulate_external_system_call(compensation_no)
    
    if success:
        handle_processing_success(db, compensation_no)
        return {
            "status": "success",
            "compensation_no": compensation_no,
            "message": result_message
        }
    else:
        handle_processing_failure(
            db=db,
            compensation_no=compensation_no,
            error_message=result_message,
            failure_type=failure_type
        )
        return {
            "status": "failed",
            "compensation_no": compensation_no,
            "failure_type": failure_type.value if failure_type else None,
            "message": result_message
        }


@celery_app.task(base=SQLAlchemyTask, bind=True, name="retry_pending_compensations")
def retry_pending_compensations_task(self):
    db = self.db
    
    compensations = get_pending_retry_compensations(db)
    results = []
    
    for comp in compensations:
        success, message, new_status = retry_compensation(
            db=db,
            compensation_no=comp.compensation_no,
            operator="system",
            remark="定时自动重试"
        )
        
        if success and new_status == CompensationStatus.PENDING:
            process_compensation_task.delay(comp.compensation_no)
        
        results.append({
            "compensation_no": comp.compensation_no,
            "success": success,
            "message": message,
            "new_status": new_status.value if success else None
        })
    
    return {
        "total": len(compensations),
        "results": results
    }


@celery_app.task(base=SQLAlchemyTask, bind=True, name="recovery_stuck_compensations")
def recovery_stuck_compensations_task(self):
    db = self.db
    
    from app.services.compensation_service import get_processing_compensations
    
    compensations = get_processing_compensations(db)
    now = datetime.utcnow()
    recovered = []
    
    for comp in compensations:
        if comp.last_processed_at:
            time_diff = (now - comp.last_processed_at).total_seconds()
            if time_diff > 1800:
                success, message, new_status = retry_compensation(
                    db=db,
                    compensation_no=comp.compensation_no,
                    operator="system",
                    remark=f"服务恢复自动重置，处理超时{int(time_diff)}秒"
                )
                
                if success and new_status == CompensationStatus.PENDING:
                    process_compensation_task.delay(comp.compensation_no)
                    recovered.append({
                        "compensation_no": comp.compensation_no,
                        "timeout_seconds": int(time_diff),
                        "message": message
                    })
    
    return {
        "checked_count": len(compensations),
        "recovered_count": len(recovered),
        "recovered": recovered
    }


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        60.0,
        retry_pending_compensations_task.s(),
        name='retry pending compensations every minute'
    )
    
    sender.add_periodic_task(
        300.0,
        recovery_stuck_compensations_task.s(),
        name='recovery stuck compensations every 5 minutes'
    )
