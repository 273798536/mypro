from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import hashlib
import json

from app.models import (
    ExceptionBatch,
    ExceptionRecord,
    ExceptionStatus,
    RecordStatus,
    ActionType,
    StatusHistory,
    OperationLog,
    FailedRecord,
    RecordStatus,
)
from app.services.exception_detector import ExceptionDetector


class StateMachine:
    def __init__(self, db: Session):
        self.db = db

    def _generate_record_key(
        self, branch_id: str, exception_type: str, exception_date: datetime, teller_id: str, extra: str = ""
    ) -> str:
        key_data = f"{branch_id}:{exception_type}:{exception_date.date().isoformat()}:{teller_id}:{extra}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _generate_batch_no(self, branch_id: str, batch_date: datetime) -> str:
        import random
        date_str = batch_date.strftime("%Y%m%d")
        time_str = datetime.now().strftime("%H%M%S%f")
        random_str = f"{random.randint(0, 9999):04d}"
        return f"BATCH-{branch_id}-{date_str}-{time_str}-{random_str}"

    def _add_status_history(
        self,
        batch_id: int,
        action_type: ActionType,
        from_status: Optional[str],
        to_status: str,
        operator: str,
        reason: Optional[str] = None,
        record_id: Optional[int] = None,
        change_details: Optional[Dict[str, Any]] = None,
    ) -> StatusHistory:
        history = StatusHistory(
            batch_id=batch_id,
            record_id=record_id,
            action_type=action_type,
            from_status=from_status,
            to_status=to_status,
            operator=operator,
            reason=reason,
            change_details=change_details,
        )
        self.db.add(history)
        return history

    def _add_operation_log(
        self,
        operator: str,
        action: str,
        batch_id: Optional[int] = None,
        record_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> OperationLog:
        log = OperationLog(
            batch_id=batch_id,
            record_id=record_id,
            operator=operator,
            action=action,
            details=details,
        )
        self.db.add(log)
        return log

    def create_batch(
        self,
        branch_id: str,
        branch_name: str,
        batch_date: datetime,
        start_date: datetime,
        end_date: datetime,
        operator: str,
    ) -> ExceptionBatch:
        batch_no = self._generate_batch_no(branch_id, batch_date)

        batch = ExceptionBatch(
            batch_no=batch_no,
            branch_id=branch_id,
            branch_name=branch_name,
            batch_date=batch_date,
            status=ExceptionStatus.DRAFT,
            created_by=operator,
        )
        self.db.add(batch)
        self.db.flush()

        detector = ExceptionDetector(self.db)
        exceptions, failed = detector.detect_all_exceptions(branch_id, start_date, end_date)

        unprocessed_count = 0
        corrected_count = 0
        need_manual_count = 0
        failed_count = len(failed)

        for exc_data in exceptions:
            raw_data = exc_data.get("raw_data", {})
            extra_info = ""
            if raw_data:
                extra_info = hashlib.md5(json.dumps(raw_data, sort_keys=True, default=str).encode()).hexdigest()[:8]
            
            record_key = self._generate_record_key(
                branch_id,
                exc_data["exception_type"],
                exc_data["exception_date"],
                exc_data.get("teller_id", ""),
                extra_info,
            )

            existing_record = (
                self.db.query(ExceptionRecord)
                .filter(ExceptionRecord.record_key == record_key)
                .first()
            )

            if existing_record:
                existing_record.raw_data = exc_data["raw_data"]
                existing_record.description = exc_data["description"]
                existing_record.blocking_point = exc_data["blocking_point"]
                existing_record.batch_id = batch.id
                record = existing_record
            else:
                record = ExceptionRecord(
                    batch_id=batch.id,
                    record_key=record_key,
                    branch_id=branch_id,
                    exception_type=exc_data["exception_type"],
                    status=RecordStatus.UNPROCESSED,
                    exception_date=exc_data["exception_date"],
                    teller_id=exc_data.get("teller_id"),
                    teller_name=exc_data.get("teller_name"),
                    description=exc_data["description"],
                    blocking_point=exc_data["blocking_point"],
                    source_type=exc_data["source_type"],
                    source_ids=exc_data["source_ids"],
                    raw_data=exc_data["raw_data"],
                )
                self.db.add(record)

            if record.status == RecordStatus.UNPROCESSED:
                unprocessed_count += 1
            elif record.status == RecordStatus.CORRECTED:
                corrected_count += 1
            elif record.status == RecordStatus.NEED_MANUAL_CONFIRM:
                need_manual_count += 1

        for fail_data in failed:
            failed_record = FailedRecord(
                batch_id=batch.id,
                record_key=f"fail-{batch.id}-{hashlib.md5(json.dumps(fail_data).encode()).hexdigest()[:8]}",
                source_type=fail_data["source_type"],
                raw_data=fail_data.get("raw_data"),
                error_message=fail_data["error_message"],
                error_type=fail_data["error_type"],
            )
            self.db.add(failed_record)

        batch.total_records = unprocessed_count + corrected_count + need_manual_count
        batch.unprocessed_records = unprocessed_count
        batch.corrected_records = corrected_count
        batch.need_manual_confirm_records = need_manual_count
        batch.failed_records = failed_count

        self._add_status_history(
            batch_id=batch.id,
            action_type=ActionType.CREATE_BATCH,
            from_status=None,
            to_status=ExceptionStatus.DRAFT,
            operator=operator,
            change_details={
                "branch_id": branch_id,
                "branch_name": branch_name,
                "date_range": [start_date.isoformat(), end_date.isoformat()],
            },
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.CREATE_BATCH,
            batch_id=batch.id,
            details={"batch_no": batch_no, "record_count": batch.total_records},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def submit_for_review(self, batch_id: int, operator: str) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status not in [ExceptionStatus.DRAFT, ExceptionStatus.ATTACHMENT_UPLOADED]:
            raise ValueError(f"Cannot submit batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.PENDING_REVIEW

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.SUBMIT_REVIEW,
            from_status=old_status,
            to_status=ExceptionStatus.PENDING_REVIEW,
            operator=operator,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.SUBMIT_REVIEW,
            batch_id=batch_id,
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def review_approve(
        self, batch_id: int, operator: str, reason: Optional[str] = None
    ) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != ExceptionStatus.PENDING_REVIEW:
            raise ValueError(f"Cannot approve batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.APPROVED

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.REVIEW_APPROVE,
            from_status=old_status,
            to_status=ExceptionStatus.APPROVED,
            operator=operator,
            reason=reason,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.REVIEW_APPROVE,
            batch_id=batch_id,
            details={"reason": reason},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def review_reject(
        self, batch_id: int, operator: str, reason: str
    ) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != ExceptionStatus.PENDING_REVIEW:
            raise ValueError(f"Cannot reject batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.REJECTED

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.REVIEW_REJECT,
            from_status=old_status,
            to_status=ExceptionStatus.REJECTED,
            operator=operator,
            reason=reason,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.REVIEW_REJECT,
            batch_id=batch_id,
            details={"reason": reason},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def modify_judgment(
        self,
        record_id: int,
        operator: str,
        new_status: str,
        manual_reason: str,
    ) -> ExceptionRecord:
        record = (
            self.db.query(ExceptionRecord).filter(ExceptionRecord.id == record_id).first()
        )
        if not record:
            raise ValueError(f"Record {record_id} not found")

        old_status = record.status
        record.status = new_status
        record.manual_reason = manual_reason
        record.reviewer = operator
        record.reviewed_at = datetime.now()
        record.before_status = old_status
        record.after_status = new_status

        self._add_status_history(
            batch_id=record.batch_id,
            action_type=ActionType.MODIFY_JUDGMENT,
            from_status=old_status,
            to_status=new_status,
            operator=operator,
            reason=manual_reason,
            record_id=record_id,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.MODIFY_JUDGMENT,
            batch_id=record.batch_id,
            record_id=record_id,
            details={"old_status": old_status, "new_status": new_status, "reason": manual_reason},
        )

        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == record.batch_id).first()
        if batch:
            if old_status == RecordStatus.UNPROCESSED:
                batch.unprocessed_records -= 1
            elif old_status == RecordStatus.CORRECTED:
                batch.corrected_records -= 1
            elif old_status == RecordStatus.NEED_MANUAL_CONFIRM:
                batch.need_manual_confirm_records -= 1

            if new_status == RecordStatus.UNPROCESSED:
                batch.unprocessed_records += 1
            elif new_status == RecordStatus.CORRECTED:
                batch.corrected_records += 1
            elif new_status == RecordStatus.NEED_MANUAL_CONFIRM:
                batch.need_manual_confirm_records += 1

        self.db.commit()
        self.db.refresh(record)
        return record

    def freeze_batch(
        self, batch_id: int, operator: str, reason: str
    ) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        old_status = batch.status
        batch.status = ExceptionStatus.FROZEN
        batch.frozen_at = datetime.now()
        batch.frozen_by = operator
        batch.frozen_reason = reason

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.FREEZE,
            from_status=old_status,
            to_status=ExceptionStatus.FROZEN,
            operator=operator,
            reason=reason,
            change_details={"before_freeze_status": old_status},
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.FREEZE,
            batch_id=batch_id,
            details={"reason": reason, "before_status": old_status},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def unfreeze_batch(self, batch_id: int, operator: str) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != ExceptionStatus.FROZEN:
            raise ValueError(f"Batch is not frozen")

        histories = (
            self.db.query(StatusHistory)
            .filter(
                StatusHistory.batch_id == batch_id,
                StatusHistory.action_type == ActionType.FREEZE,
            )
            .order_by(StatusHistory.created_at.desc())
            .first()
        )

        restore_status = histories.from_status if histories else ExceptionStatus.DRAFT
        batch.status = restore_status
        batch.frozen_at = None
        batch.frozen_by = None
        batch.frozen_reason = None

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.UNFREEZE,
            from_status=ExceptionStatus.FROZEN,
            to_status=restore_status,
            operator=operator,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.UNFREEZE,
            batch_id=batch_id,
            details={"restored_status": restore_status},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def settle_batch(self, batch_id: int, operator: str) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status not in [ExceptionStatus.APPROVED, ExceptionStatus.FROZEN]:
            raise ValueError(f"Cannot settle batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.SETTLED
        batch.settled_at = datetime.now()

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.SETTLE,
            from_status=old_status,
            to_status=ExceptionStatus.SETTLED,
            operator=operator,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.SETTLE,
            batch_id=batch_id,
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def revert_batch(self, batch_id: int, operator: str, reason: str) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status != ExceptionStatus.SETTLED:
            raise ValueError(f"Cannot revert batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.REVERTED

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.REVERT,
            from_status=old_status,
            to_status=ExceptionStatus.REVERTED,
            operator=operator,
            reason=reason,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.REVERT,
            batch_id=batch_id,
            details={"reason": reason},
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def archive_batch(self, batch_id: int, operator: str) -> ExceptionBatch:
        batch = self.db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch.status not in [ExceptionStatus.SETTLED, ExceptionStatus.REJECTED, ExceptionStatus.REVERTED]:
            raise ValueError(f"Cannot archive batch in status {batch.status}")

        old_status = batch.status
        batch.status = ExceptionStatus.ARCHIVED
        batch.archived_at = datetime.now()

        self._add_status_history(
            batch_id=batch_id,
            action_type=ActionType.ARCHIVE,
            from_status=old_status,
            to_status=ExceptionStatus.ARCHIVED,
            operator=operator,
        )

        self._add_operation_log(
            operator=operator,
            action=ActionType.ARCHIVE,
            batch_id=batch_id,
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch
