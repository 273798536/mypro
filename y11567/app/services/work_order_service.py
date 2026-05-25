import json
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from ..models import (
    WorkOrder, WorkOrderStatus, Clue, SourceType,
    RetryRecord, RetryCategory, DeadLetter,
    CompensationRecord, OperationLog, ChangeEvent, DirtyType
)
from .location_matcher import normalize_location, locations_match, generate_order_no
from .dirty_record_service import DirtyRecordService
from ..config import MAX_RETRY_COUNT, RETRY_INTERVAL_MINUTES


class WorkOrderService:
    def __init__(self, db: Session):
        self.db = db

    def _log_change(self, entity_type: str, entity_id: int, field_name: str,
                    old_value: Any, new_value: Any, changed_by: str, change_source: str):
        if old_value == new_value:
            return
        event = ChangeEvent(
            entity_type=entity_type,
            entity_id=entity_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            changed_by=changed_by,
            change_source=change_source
        )
        self.db.add(event)

    def _log_operation(self, work_order_id: int, operation: str,
                       old_value: Any, new_value: Any, operator: str, remarks: str = None):
        log = OperationLog(
            work_order_id=work_order_id,
            operation=operation,
            old_value=old_value,
            new_value=new_value,
            operator=operator,
            remarks=remarks
        )
        self.db.add(log)

    def _find_existing_work_order(self, location: str, window_hours: int = 72) -> Optional[WorkOrder]:
        normalized = normalize_location(location)
        cutoff = datetime.now() - timedelta(hours=window_hours)
        
        candidates = self.db.query(WorkOrder).filter(
            WorkOrder.created_at >= cutoff,
            WorkOrder.status.notin_([WorkOrderStatus.CLOSED, WorkOrderStatus.COMPENSATED])
        ).all()
        
        for wo in candidates:
            if locations_match(location, wo.location):
                return wo
        
        return None

    def submit_clue(self, source_type: SourceType, content: Dict[str, Any],
                    source_id: str = None, operator: str = "system") -> Tuple[WorkOrder, Clue, bool]:
        location = content.get("location", "")
        if not location:
            raise ValueError("location is required")
        
        existing_wo = self._find_existing_work_order(location)
        is_new = False
        
        now = datetime.now()
        
        if existing_wo:
            work_order = existing_wo
        else:
            timestamp_str = now.strftime("%Y%m%d%H%M%S")
            order_no = generate_order_no(location, timestamp_str)
            work_order = WorkOrder(
                order_no=order_no,
                location=location,
                location_normalized=normalize_location(location),
                status=WorkOrderStatus.PENDING,
                description=content.get("description", ""),
                lamp_count=content.get("lamp_count"),
                created_at=now,
                updated_at=now
            )
            self.db.add(work_order)
            self.db.flush()
            is_new = True
            self._log_operation(work_order.id, "create", None, order_no, operator, "工单创建")

        photo_url = content.get("photo_url") or content.get("photo_id")
        hotline_number = content.get("hotline_number") or content.get("phone")
        spare_part_batch = content.get("spare_part_batch") or content.get("batch_no")
        sms_content = content.get("sms_content")
        occurred_at_str = content.get("occurred_at")
        occurred_at = datetime.fromisoformat(occurred_at_str) if occurred_at_str else now

        clue = Clue(
            work_order_id=work_order.id,
            source_type=source_type,
            source_id=source_id,
            location=location,
            location_normalized=normalize_location(location),
            occurred_at=occurred_at,
            content=content,
            photo_url=photo_url,
            hotline_number=hotline_number,
            spare_part_batch=spare_part_batch,
            sms_content=sms_content
        )
        self.db.add(clue)
        self.db.flush()

        dirty_service = DirtyRecordService(self.db)
        issues = dirty_service.analyze_clue(clue, work_order)
        
        if issues:
            dirty_service.mark_dirty(clue.id, issues)
            self._log_operation(
                work_order.id, "clue_dirty",
                None, len(issues),
                operator,
                f"检测到脏记录问题: {issues[0]['reason']}"
            )

        self.db.commit()
        self.db.refresh(work_order)
        self.db.refresh(clue)

        return work_order, clue, is_new

    def get_queue(self, status: WorkOrderStatus = None, limit: int = 100) -> List[WorkOrder]:
        query = self.db.query(WorkOrder)
        if status:
            query = query.filter(WorkOrder.status == status)
        else:
            query = query.filter(
                WorkOrder.status.notin_([WorkOrderStatus.CLOSED, WorkOrderStatus.DEAD_LETTER])
            )
        return query.order_by(WorkOrder.created_at.desc()).limit(limit).all()

    def get_retry_queue(self) -> List[WorkOrder]:
        now = datetime.now()
        return self.db.query(WorkOrder).filter(
            WorkOrder.status.in_([WorkOrderStatus.PENDING, WorkOrderStatus.RETRYING]),
            WorkOrder.retry_count < WorkOrder.max_retries,
            (WorkOrder.next_retry_at == None) | (WorkOrder.next_retry_at <= now)
        ).order_by(WorkOrder.next_retry_at.asc().nullslast()).all()

    def process_retry(self, work_order_id: int, operator: str = "system") -> Tuple[bool, str]:
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return False, "工单不存在"

        if work_order.retry_count >= work_order.max_retries:
            self._move_to_dead_letter(work_order, RetryCategory.SYSTEM_ERROR, "超过最大重试次数")
            return False, "超过最大重试次数，已移入死信队列"

        work_order.retry_count += 1
        work_order.status = WorkOrderStatus.RETRYING
        work_order.last_retry_at = datetime.now()
        
        success = self._execute_retry_logic(work_order)
        
        retry_record = RetryRecord(
            work_order_id=work_order.id,
            retry_no=work_order.retry_count,
            category=RetryCategory.SYSTEM_ERROR,
            error_message=None if success else "模拟重试失败",
            retry_succeeded=success,
            executed_by=operator
        )
        self.db.add(retry_record)

        if success:
            work_order.status = WorkOrderStatus.PROCESSING
            self._log_operation(work_order.id, "retry_success", 
                              work_order.retry_count - 1, work_order.retry_count, 
                              operator, "重试成功")
            self.db.commit()
            return True, "重试成功"
        else:
            if work_order.retry_count >= work_order.max_retries:
                self._move_to_dead_letter(work_order, RetryCategory.SYSTEM_ERROR, "重试失败")
            else:
                work_order.next_retry_at = datetime.now() + timedelta(minutes=RETRY_INTERVAL_MINUTES)
            self._log_operation(work_order.id, "retry_failed",
                              work_order.retry_count - 1, work_order.retry_count,
                              operator, "重试失败")
            self.db.commit()
            return False, "重试失败"

    def _execute_retry_logic(self, work_order: WorkOrder) -> bool:
        import random
        return random.random() > 0.3

    def _move_to_dead_letter(self, work_order: WorkOrder, category: RetryCategory, reason: str):
        dead_letter = DeadLetter(
            work_order_id=work_order.id,
            order_no=work_order.order_no,
            location=work_order.location,
            last_error=reason,
            category=category,
            retry_count=work_order.retry_count
        )
        self.db.add(dead_letter)
        work_order.status = WorkOrderStatus.DEAD_LETTER

    def take_manual(self, work_order_id: int, handler: str) -> Tuple[bool, str]:
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return False, "工单不存在"
        
        old_status = work_order.status.value
        work_order.status = WorkOrderStatus.MANUAL
        work_order.manual_handler = handler
        self._log_operation(work_order.id, "take_manual", old_status, WorkOrderStatus.MANUAL.value,
                          handler, f"人工接管: {handler}")
        self.db.commit()
        return True, "已人工接管"

    def compensate(self, work_order_id: int, amount: float, reason: str,
                   executor: str, voucher_no: str = None) -> Tuple[bool, str]:
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return False, "工单不存在"
        
        compensation = CompensationRecord(
            work_order_id=work_order.id,
            amount=amount,
            reason=reason,
            executed_by=executor,
            voucher_no=voucher_no or f"V{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        self.db.add(compensation)
        
        old_amount = work_order.compensated_amount
        work_order.compensated_amount += amount
        work_order.status = WorkOrderStatus.COMPENSATED
        self._log_operation(work_order.id, "compensate", old_amount, work_order.compensated_amount,
                          executor, f"补偿入账: {amount}元, 原因: {reason}")
        self.db.commit()
        return True, "补偿入账成功"

    def close(self, work_order_id: int, operator: str, remarks: str = None) -> Tuple[bool, str]:
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return False, "工单不存在"
        
        old_status = work_order.status.value
        work_order.status = WorkOrderStatus.CLOSED
        work_order.closed_at = datetime.now()
        self._log_operation(work_order.id, "close", old_status, WorkOrderStatus.CLOSED.value,
                          operator, remarks or "工单关闭")
        self.db.commit()
        return True, "工单已关闭"

    def get_work_order(self, work_order_id: int) -> Optional[WorkOrder]:
        return self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()

    def get_work_order_by_no(self, order_no: str) -> Optional[WorkOrder]:
        return self.db.query(WorkOrder).filter(WorkOrder.order_no == order_no).first()

    def get_clues_by_work_order(self, work_order_id: int) -> List[Clue]:
        return self.db.query(Clue).filter(Clue.work_order_id == work_order_id).order_by(Clue.created_at).all()

    def get_history(self, work_order_id: int) -> List[Dict[str, Any]]:
        logs = self.db.query(OperationLog).filter(
            OperationLog.work_order_id == work_order_id
        ).order_by(OperationLog.operated_at).all()
        
        return [
            {
                "operation": log.operation,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "operator": log.operator,
                "operated_at": log.operated_at.isoformat(),
                "remarks": log.remarks
            }
            for log in logs
        ]
