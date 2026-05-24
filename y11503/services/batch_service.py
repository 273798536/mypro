from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import List, Optional, Tuple
import json
import hashlib

import models
import schemas
import config

class BatchService:
    def __init__(self, db: Session):
        self.db = db

    def _log_operation(self, batch_id: int, operation: str, operator: str,
                       old_status: Optional[str] = None, new_status: Optional[str] = None,
                       changed_fields: Optional[dict] = None, remark: Optional[str] = None):
        log = models.OperationLog(
            batch_id=batch_id,
            operation=operation,
            operator=operator,
            old_status=old_status,
            new_status=new_status,
            changed_fields=json.dumps(changed_fields) if changed_fields else None,
            remark=remark
        )
        self.db.add(log)

    def _update_part_status(self, part: models.SparePart, status: str, message: str = None):
        part.status = status
        part.validation_result = "pass" if status == config.PartStatus.NORMAL else "fail"
        part.validation_message = message
        part.updated_at = datetime.utcnow()

    def check_idempotency(self, idempotency_key: str, request_data: dict = None) -> Tuple[bool, Optional[models.Batch], str]:
        record = self.db.query(models.IdempotencyRecord).filter(
            models.IdempotencyRecord.idempotency_key == idempotency_key
        ).first()

        if not record:
            return False, None, "No duplicate found"

        existing_batch = self.db.query(models.Batch).filter(
            models.Batch.batch_no == record.batch_no
        ).first()

        return True, existing_batch, f"Duplicate detected, strategy: {existing_batch.duplicate_strategy if existing_batch else 'unknown'}"

    def _save_idempotency_record(self, idempotency_key: str, batch_no: str, request_data: dict, status: str, message: str):
        request_hash = hashlib.sha256(json.dumps(request_data, sort_keys=True).encode()).hexdigest() if request_data else None
        record = models.IdempotencyRecord(
            idempotency_key=idempotency_key,
            batch_no=batch_no,
            request_hash=request_hash,
            result_status=status,
            result_message=message
        )
        self.db.add(record)

    def create_batch(self, batch_data: schemas.BatchCreate) -> models.Batch:
        is_duplicate, existing_batch, msg = self.check_idempotency(batch_data.idempotency_key)

        if is_duplicate and existing_batch:
            if batch_data.duplicate_strategy == config.DuplicateStrategy.IGNORE:
                return existing_batch
            elif batch_data.duplicate_strategy == config.DuplicateStrategy.OVERWRITE:
                self.db.delete(existing_batch)
                self.db.query(models.IdempotencyRecord).filter(
                    models.IdempotencyRecord.batch_no == existing_batch.batch_no
                ).delete()
                self.db.commit()
            elif batch_data.duplicate_strategy == config.DuplicateStrategy.APPEND:
                return self._append_to_batch(existing_batch, batch_data)

        batch = models.Batch(
            batch_no=batch_data.batch_no,
            operator=batch_data.operator,
            description=batch_data.description,
            idempotency_key=batch_data.idempotency_key,
            duplicate_strategy=batch_data.duplicate_strategy,
            status=config.BatchStatus.DRAFT
        )
        self.db.add(batch)
        self.db.flush()

        order_map = {}
        for ro_data in batch_data.repair_orders:
            ro = models.RepairOrder(
                batch_id=batch.id,
                **ro_data.model_dump()
            )
            self.db.add(ro)
            self.db.flush()
            order_map[ro.order_no] = ro.id

        for part_data in batch_data.parts:
            part_dict = part_data.model_dump()
            repair_order_no = part_dict.pop('repair_order_no', None)
            repair_order_id = order_map.get(repair_order_no) if repair_order_no else None

            part = models.SparePart(
                batch_id=batch.id,
                repair_order_id=repair_order_id,
                **part_dict
            )
            self.db.add(part)

        batch.total_parts = len(batch_data.parts)

        self._log_operation(
            batch_id=batch.id,
            operation="CREATE",
            operator=batch_data.operator,
            new_status=config.BatchStatus.DRAFT,
            changed_fields={"batch_no": batch_data.batch_no, "total_parts": batch.total_parts},
            remark=batch_data.description
        )

        self._save_idempotency_record(
            idempotency_key=batch_data.idempotency_key,
            batch_no=batch_data.batch_no,
            request_data=batch_data.model_dump(),
            status="created",
            message="Batch created successfully"
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def _append_to_batch(self, batch: models.Batch, batch_data: schemas.BatchCreate) -> models.Batch:
        order_map = {ro.order_no: ro.id for ro in batch.repair_orders}

        for ro_data in batch_data.repair_orders:
            if ro_data.order_no not in order_map:
                ro = models.RepairOrder(batch_id=batch.id, **ro_data.model_dump())
                self.db.add(ro)
                self.db.flush()
                order_map[ro.order_no] = ro.id

        existing_barcodes = {p.barcode for p in batch.parts if p.barcode}
        appended_count = 0

        for part_data in batch_data.parts:
            if part_data.barcode and part_data.barcode in existing_barcodes:
                continue
            part_dict = part_data.model_dump()
            repair_order_no = part_dict.pop('repair_order_no', None)
            repair_order_id = order_map.get(repair_order_no) if repair_order_no else None

            part = models.SparePart(batch_id=batch.id, repair_order_id=repair_order_id, **part_dict)
            self.db.add(part)
            appended_count += 1
            if part_data.barcode:
                existing_barcodes.add(part_data.barcode)

        batch.total_parts += appended_count
        batch.updated_at = datetime.utcnow()

        self._log_operation(
            batch_id=batch.id,
            operation="APPEND",
            operator=batch_data.operator,
            old_status=batch.status,
            new_status=batch.status,
            changed_fields={"appended_parts": appended_count, "total_parts": batch.total_parts}
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def submit_batch(self, batch_no: str, submit_data: schemas.BatchSubmit) -> Tuple[models.Batch, List[str]]:
        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        if batch.status not in config.BatchStatus.CAN_SUBMIT:
            raise ValueError(f"Cannot submit batch in status: {batch.status}")

        errors = []
        success_count = 0
        fail_count = 0

        for part in batch.parts:
            part_errors = self._validate_part(part)
            if part_errors:
                self._update_part_status(part, config.PartStatus.PENDING, "; ".join(part_errors))
                errors.extend([f"Part {part.part_code}: {e}" for e in part_errors])
                fail_count += 1
            else:
                final_status = self._determine_part_status(part)
                self._update_part_status(part, final_status, "Validation passed")
                success_count += 1

        old_status = batch.status
        batch.status = config.BatchStatus.SUBMITTED if not errors else config.BatchStatus.PARTIAL_FAILED
        batch.success_parts = success_count
        batch.failed_parts = fail_count
        batch.submitted_at = datetime.utcnow()
        batch.error_message = "; ".join(errors) if errors else None

        self._log_operation(
            batch_id=batch.id,
            operation="SUBMIT",
            operator=submit_data.operator,
            old_status=old_status,
            new_status=batch.status,
            changed_fields={"success_parts": success_count, "failed_parts": fail_count},
            remark=submit_data.remark
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch, errors

    def _validate_part(self, part: models.SparePart) -> List[str]:
        errors = []
        if not part.part_code:
            errors.append("part_code is required")
        if part.quantity <= 0:
            errors.append("quantity must be positive")
        if part.is_returned and part.is_scrapped:
            errors.append("cannot be both returned and scrapped")
            part.is_mixed = True
        return errors

    def _determine_part_status(self, part: models.SparePart) -> str:
        if part.is_scrapped:
            return config.PartStatus.SCRAPPED
        if part.is_returned:
            return config.PartStatus.RETURNED
        return config.PartStatus.NORMAL

    def withdraw_batch(self, batch_no: str, withdraw_data: schemas.BatchWithdraw) -> models.Batch:
        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        if batch.status not in config.BatchStatus.CAN_WITHDRAW:
            raise ValueError(f"Cannot withdraw batch in status: {batch.status}")

        old_status = batch.status
        batch.status = config.BatchStatus.WITHDRAWN

        for part in batch.parts:
            part.status = config.PartStatus.PENDING
            part.validation_result = None
            part.validation_message = None

        self._log_operation(
            batch_id=batch.id,
            operation="WITHDRAW",
            operator=withdraw_data.operator,
            old_status=old_status,
            new_status=config.BatchStatus.WITHDRAWN,
            changed_fields={"reason": withdraw_data.reason},
            remark=withdraw_data.reason
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def freeze_batch(self, batch_no: str, freeze_data: schemas.BatchFreeze) -> models.Batch:
        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        if batch.status not in config.BatchStatus.CAN_FREEZE:
            raise ValueError(f"Cannot freeze batch in status: {batch.status}")

        old_status = batch.status
        batch.status = config.BatchStatus.FROZEN
        batch.frozen_at = datetime.utcnow()

        self._log_operation(
            batch_id=batch.id,
            operation="FREEZE",
            operator=freeze_data.operator,
            old_status=old_status,
            new_status=config.BatchStatus.FROZEN,
            changed_fields={"frozen_at": batch.frozen_at.isoformat()},
            remark=freeze_data.reason
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def revise_batch(self, batch_no: str, revise_data: schemas.BatchRevise) -> models.Batch:
        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        if batch.status not in config.BatchStatus.CAN_REVISE:
            raise ValueError(f"Cannot revise batch in status: {batch.status}")

        old_status = batch.status
        batch.status = config.BatchStatus.REVISED

        if revise_data.parts:
            order_map = {ro.order_no: ro.id for ro in batch.repair_orders}
            for part_data in revise_data.parts:
                part_dict = part_data.model_dump()
                repair_order_no = part_dict.pop('repair_order_no', None)
                repair_order_id = order_map.get(repair_order_no) if repair_order_no else None
                part = models.SparePart(batch_id=batch.id, repair_order_id=repair_order_id, **part_dict)
                self.db.add(part)
            batch.total_parts += len(revise_data.parts)

        self._log_operation(
            batch_id=batch.id,
            operation="REVISE",
            operator=revise_data.operator,
            old_status=old_status,
            new_status=config.BatchStatus.REVISED,
            changed_fields={"added_parts": len(revise_data.parts)},
            remark=revise_data.remark
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def judge_batch(self, batch_no: str, judge_data: schemas.BatchJudge) -> models.Batch:
        batch = self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        old_status = batch.status
        new_status = config.BatchStatus.APPROVED if judge_data.approved else config.BatchStatus.REJECTED

        if judge_data.part_ids:
            for part in batch.parts:
                if part.id in judge_data.part_ids:
                    if judge_data.approved:
                        self._update_part_status(part, config.PartStatus.NORMAL, "人工改判通过")
                    else:
                        self._update_part_status(part, config.PartStatus.PENDING, "人工改判不通过")

        batch.status = new_status

        self._log_operation(
            batch_id=batch.id,
            operation="JUDGE",
            operator=judge_data.operator,
            old_status=old_status,
            new_status=new_status,
            changed_fields={"approved": judge_data.approved, "part_ids": judge_data.part_ids},
            remark=judge_data.reason
        )

        self.db.commit()
        self.db.refresh(batch)
        return batch

    def get_batch(self, batch_no: str) -> Optional[models.Batch]:
        return self.db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()

    def list_batches(self, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> Tuple[int, List[models.Batch]]:
        query = self.db.query(models.Batch)
        if status:
            query = query.filter(models.Batch.status == status)
        total = query.count()
        batches = query.order_by(models.Batch.created_at.desc()).offset(skip).limit(limit).all()
        return total, batches

    def get_operation_logs(self, batch_no: str) -> List[models.OperationLog]:
        batch = self.get_batch(batch_no)
        if not batch:
            return []
        return self.db.query(models.OperationLog).filter(
            models.OperationLog.batch_id == batch.id
        ).order_by(models.OperationLog.created_at.desc()).all()
