import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from .models import (
    Batch, BatchStatus, Package, TrackingNode, TaxNotice,
    TempRecord, AuditLog, IdempotencyMode
)
from .schemas import BatchCreate, BatchDataAppend

logger = logging.getLogger(__name__)


class StateTransitionError(Exception):
    pass


class IdempotencyHandler:
    def __init__(self, db: Session):
        self.db = db

    def handle_packages(
        self,
        batch_id: str,
        new_packages: List,
        mode: IdempotencyMode
    ) -> Tuple[List[Package], int, int]:
        existing = {p.package_no: p for p in self.db.query(Package).filter(Package.batch_id == batch_id).all()}
        result = []
        added = 0
        updated = 0

        for pkg_data in new_packages:
            if pkg_data.package_no in existing:
                if mode == IdempotencyMode.IGNORE:
                    result.append(existing[pkg_data.package_no])
                elif mode == IdempotencyMode.OVERWRITE:
                    pkg = existing[pkg_data.package_no]
                    for key, value in pkg_data.model_dump().items():
                        if value is not None:
                            setattr(pkg, key, value)
                    pkg.updated_at = datetime.utcnow()
                    result.append(pkg)
                    updated += 1
                elif mode == IdempotencyMode.APPEND:
                    result.append(existing[pkg_data.package_no])
            else:
                pkg = Package(
                    id=str(uuid.uuid4()),
                    batch_id=batch_id,
                    **pkg_data.model_dump()
                )
                self.db.add(pkg)
                result.append(pkg)
                added += 1

        return result, added, updated

    def handle_tracking_nodes(
        self,
        batch_id: str,
        new_nodes: List,
        mode: IdempotencyMode
    ) -> Tuple[List[TrackingNode], int]:
        result = []
        added = 0

        for node_data in new_nodes:
            node = TrackingNode(
                id=str(uuid.uuid4()),
                batch_id=batch_id,
                **node_data.model_dump()
            )
            self.db.add(node)
            result.append(node)
            added += 1

        return result, added

    def handle_tax_notices(
        self,
        batch_id: str,
        new_notices: List,
        mode: IdempotencyMode
    ) -> Tuple[List[TaxNotice], int, int]:
        existing = {n.notice_no: n for n in self.db.query(TaxNotice).filter(
            TaxNotice.batch_id == batch_id, TaxNotice.notice_no.isnot(None)
        ).all()}
        result = []
        added = 0
        updated = 0

        for notice_data in new_notices:
            if notice_data.notice_no and notice_data.notice_no in existing:
                if mode == IdempotencyMode.IGNORE:
                    result.append(existing[notice_data.notice_no])
                elif mode == IdempotencyMode.OVERWRITE:
                    notice = existing[notice_data.notice_no]
                    for key, value in notice_data.model_dump().items():
                        if value is not None:
                            setattr(notice, key, value)
                    result.append(notice)
                    updated += 1
                elif mode == IdempotencyMode.APPEND:
                    result.append(existing[notice_data.notice_no])
            else:
                notice = TaxNotice(
                    id=str(uuid.uuid4()),
                    batch_id=batch_id,
                    **notice_data.model_dump()
                )
                self.db.add(notice)
                result.append(notice)
                added += 1

        return result, added, updated

    def handle_temp_records(
        self,
        batch_id: str,
        new_records: List,
        mode: IdempotencyMode
    ) -> Tuple[List[TempRecord], int]:
        result = []
        added = 0

        for record_data in new_records:
            record = TempRecord(
                id=str(uuid.uuid4()),
                batch_id=batch_id,
                **record_data.model_dump()
            )
            self.db.add(record)
            result.append(record)
            added += 1

        return result, added


class StateMachine:
    VALID_TRANSITIONS: Dict[BatchStatus, set] = {
        BatchStatus.CREATED: {
            BatchStatus.ATTACHMENTS_UPLOADED,
            BatchStatus.UNDER_REVIEW,
            BatchStatus.CANCELLED
        },
        BatchStatus.ATTACHMENTS_UPLOADED: {
            BatchStatus.UNDER_REVIEW,
            BatchStatus.CANCELLED
        },
        BatchStatus.UNDER_REVIEW: {
            BatchStatus.REVIEW_COMPLETED,
            BatchStatus.SETTLEMENT_FROZEN,
            BatchStatus.CANCELLED
        },
        BatchStatus.REVIEW_COMPLETED: {
            BatchStatus.SETTLEMENT_FROZEN,
            BatchStatus.ARCHIVED,
            BatchStatus.UNDER_REVIEW
        },
        BatchStatus.SETTLEMENT_FROZEN: {
            BatchStatus.REVIEW_COMPLETED,
            BatchStatus.ARCHIVED
        },
        BatchStatus.ARCHIVED: set(),
        BatchStatus.CANCELLED: {BatchStatus.ARCHIVED}
    }

    def __init__(self, db: Session):
        self.db = db
        self.idempotency = IdempotencyHandler(db)

    def can_transition(self, current_status: BatchStatus, target_status: BatchStatus) -> bool:
        return target_status in self.VALID_TRANSITIONS.get(current_status, set())

    def transition(
        self,
        batch: Batch,
        target_status: BatchStatus,
        changed_by: str,
        reason: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None
    ) -> Batch:
        if batch.status == target_status:
            logger.info(f"Batch {batch.batch_no} already in state {target_status}")
            return batch

        if not self.can_transition(batch.status, target_status):
            raise StateTransitionError(
                f"Cannot transition from {batch.status} to {target_status}"
            )

        old_status = batch.status
        batch.status = target_status
        batch.updated_at = datetime.utcnow()

        self._create_audit_log(
            batch=batch,
            action="status_transition",
            old_status=old_status.value,
            new_status=target_status.value,
            changed_by=changed_by,
            reason=reason,
            changes=changes
        )

        logger.info(
            f"Batch {batch.batch_no} transitioned: {old_status} -> {target_status} "
            f"by {changed_by}"
        )

        return batch

    def create_batch(self, batch_data: BatchCreate) -> Tuple[Batch, Dict[str, Any]]:
        existing = self.db.query(Batch).filter(Batch.batch_no == batch_data.batch_no).first()

        if existing:
            if batch_data.idempotency_mode == IdempotencyMode.IGNORE:
                logger.info(f"Batch {batch_data.batch_no} exists, ignoring")
                return existing, {"mode": "ignored", "batch_no": batch_data.batch_no}
            elif batch_data.idempotency_mode == IdempotencyMode.APPEND:
                return self._append_to_batch(existing, batch_data)
            elif batch_data.idempotency_mode == IdempotencyMode.OVERWRITE:
                return self._overwrite_batch(existing, batch_data)

        batch_id = str(uuid.uuid4())
        batch = Batch(
            id=batch_id,
            batch_no=batch_data.batch_no,
            source_type=batch_data.source_type,
            customs_code=batch_data.customs_code,
            created_by=batch_data.created_by,
            status=BatchStatus.CREATED
        )
        self.db.add(batch)

        stats = {"packages": 0, "tracking_nodes": 0, "tax_notices": 0, "temp_records": 0}

        if batch_data.packages:
            _, added, _ = self.idempotency.handle_packages(
                batch_id, batch_data.packages, IdempotencyMode.APPEND
            )
            stats["packages"] = added

        if batch_data.tracking_nodes:
            _, added = self.idempotency.handle_tracking_nodes(
                batch_id, batch_data.tracking_nodes, IdempotencyMode.APPEND
            )
            stats["tracking_nodes"] = added

        if batch_data.tax_notices:
            _, added, _ = self.idempotency.handle_tax_notices(
                batch_id, batch_data.tax_notices, IdempotencyMode.APPEND
            )
            stats["tax_notices"] = added

        if batch_data.temp_records:
            _, added = self.idempotency.handle_temp_records(
                batch_id, batch_data.temp_records, IdempotencyMode.APPEND
            )
            stats["temp_records"] = added

        self.db.flush()
        self._update_batch_totals(batch)

        self._create_audit_log(
            batch=batch,
            action="batch_created",
            old_status=None,
            new_status=BatchStatus.CREATED.value,
            changed_by=batch_data.created_by,
            reason="Initial batch creation",
            changes=stats
        )

        self.db.commit()
        self.db.refresh(batch)

        return batch, {"mode": "created", **stats}

    def append_data(self, batch: Batch, data: BatchDataAppend) -> Dict[str, Any]:
        result = self._append_to_batch(batch, data)
        return result[1]

    def _append_to_batch(self, batch: Batch, data: Any) -> Tuple[Batch, Dict[str, Any]]:
        stats = {"mode": "appended", "packages": 0, "tracking_nodes": 0, "tax_notices": 0, "temp_records": 0}

        if hasattr(data, 'packages') and data.packages:
            _, added, updated = self.idempotency.handle_packages(
                batch.id, data.packages, data.idempotency_mode
            )
            stats["packages"] = added
            stats["packages_updated"] = updated

        if hasattr(data, 'tracking_nodes') and data.tracking_nodes:
            _, added = self.idempotency.handle_tracking_nodes(
                batch.id, data.tracking_nodes, data.idempotency_mode
            )
            stats["tracking_nodes"] = added

        if hasattr(data, 'tax_notices') and data.tax_notices:
            _, added, updated = self.idempotency.handle_tax_notices(
                batch.id, data.tax_notices, data.idempotency_mode
            )
            stats["tax_notices"] = added
            stats["tax_notices_updated"] = updated

        if hasattr(data, 'temp_records') and data.temp_records:
            _, added = self.idempotency.handle_temp_records(
                batch.id, data.temp_records, data.idempotency_mode
            )
            stats["temp_records"] = added

        self._update_batch_totals(batch)
        batch.updated_at = datetime.utcnow()

        self._create_audit_log(
            batch=batch,
            action="data_appended",
            old_status=batch.status.value,
            new_status=batch.status.value,
            changed_by=getattr(data, 'changed_by', 'system'),
            reason=f"Data appended with mode: {data.idempotency_mode}",
            changes=stats
        )

        self.db.commit()
        self.db.refresh(batch)

        return batch, stats

    def _overwrite_batch(self, batch: Batch, data: BatchCreate) -> Tuple[Batch, Dict[str, Any]]:
        self.db.query(Package).filter(Package.batch_id == batch.id).delete()
        self.db.query(TrackingNode).filter(TrackingNode.batch_id == batch.id).delete()
        self.db.query(TaxNotice).filter(TaxNotice.batch_id == batch.id).delete()
        self.db.query(TempRecord).filter(TempRecord.batch_id == batch.id).delete()

        batch.source_type = data.source_type
        batch.customs_code = data.customs_code
        batch.updated_at = datetime.utcnow()

        stats = {"mode": "overwritten", "packages": 0, "tracking_nodes": 0, "tax_notices": 0, "temp_records": 0}

        if data.packages:
            _, added, _ = self.idempotency.handle_packages(
                batch.id, data.packages, IdempotencyMode.APPEND
            )
            stats["packages"] = added

        if data.tracking_nodes:
            _, added = self.idempotency.handle_tracking_nodes(
                batch.id, data.tracking_nodes, IdempotencyMode.APPEND
            )
            stats["tracking_nodes"] = added

        if data.tax_notices:
            _, added, _ = self.idempotency.handle_tax_notices(
                batch.id, data.tax_notices, IdempotencyMode.APPEND
            )
            stats["tax_notices"] = added

        if data.temp_records:
            _, added = self.idempotency.handle_temp_records(
                batch.id, data.temp_records, IdempotencyMode.APPEND
            )
            stats["temp_records"] = added

        self._update_batch_totals(batch)

        self._create_audit_log(
            batch=batch,
            action="batch_overwritten",
            old_status=batch.status.value,
            new_status=batch.status.value,
            changed_by=data.created_by,
            reason="Batch data overwritten",
            changes=stats
        )

        self.db.commit()
        self.db.refresh(batch)

        return batch, stats

    def freeze_settlement(
        self,
        batch: Batch,
        frozen_by: str,
        frozen_reason: str
    ) -> Batch:
        batch.status_before_frozen = batch.status.value
        batch.frozen_at = datetime.utcnow()
        batch.frozen_by = frozen_by
        batch.frozen_reason = frozen_reason

        return self.transition(
            batch=batch,
            target_status=BatchStatus.SETTLEMENT_FROZEN,
            changed_by=frozen_by,
            reason=frozen_reason
        )

    def unfreeze_settlement(
        self,
        batch: Batch,
        unfrozen_by: str,
        reason: Optional[str] = None
    ) -> Batch:
        if batch.status != BatchStatus.SETTLEMENT_FROZEN:
            raise StateTransitionError("Batch is not frozen")

        target_status = BatchStatus(batch.status_before_frozen) if batch.status_before_frozen else BatchStatus.REVIEW_COMPLETED

        batch.status = target_status
        batch.updated_at = datetime.utcnow()
        batch.frozen_at = None
        batch.frozen_by = None
        batch.frozen_reason = None
        batch.status_before_frozen = None

        self._create_audit_log(
            batch=batch,
            action="status_transition",
            old_status=BatchStatus.SETTLEMENT_FROZEN.value,
            new_status=target_status.value,
            changed_by=unfrozen_by,
            reason=reason or "Settlement unfrozen"
        )

        self.db.commit()
        self.db.refresh(batch)

        logger.info(
            f"Batch {batch.batch_no} unfrozen: settlement_frozen -> {target_status} "
            f"by {unfrozen_by}"
        )

        return batch

    def archive(self, batch: Batch, archived_by: str, reason: Optional[str] = None) -> Batch:
        return self.transition(
            batch=batch,
            target_status=BatchStatus.ARCHIVED,
            changed_by=archived_by,
            reason=reason or "Batch archived"
        )

    def cancel(self, batch: Batch, cancelled_by: str, reason: Optional[str] = None) -> Batch:
        return self.transition(
            batch=batch,
            target_status=BatchStatus.CANCELLED,
            changed_by=cancelled_by,
            reason=reason or "Batch cancelled"
        )

    def _update_batch_totals(self, batch: Batch) -> None:
        packages = self.db.query(Package).filter(Package.batch_id == batch.id).all()
        batch.total_packages = len(packages)
        batch.total_tax_amount = sum(p.tax_amount or 0 for p in packages)

    def _create_audit_log(
        self,
        batch: Batch,
        action: str,
        old_status: Optional[str],
        new_status: Optional[str],
        changed_by: str,
        reason: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        log = AuditLog(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            changed_at=datetime.utcnow(),
            reason=reason,
            changes=changes
        )
        self.db.add(log)
        return log
