from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Tuple
from datetime import datetime

from app.models import Batch, WorkOrder
from app.enums import BatchStatus, WorkOrderStatus, DuplicateStrategy, ChangeType
from app.schemas import BatchCreate, BatchUpdate, BatchReview, BatchFreeze, BatchCancel, WorkOrderCreate
from app.services.change_log_service import log_change


def get_batch(db: Session, batch_id: int) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.id == batch_id).first()


def get_batch_by_no(db: Session, batch_no: str) -> Optional[Batch]:
    return db.query(Batch).filter(Batch.batch_no == batch_no).first()


def get_batches(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[BatchStatus] = None,
    road_section: Optional[str] = None,
) -> Tuple[List[Batch], int]:
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status.value)
    if road_section:
        query = query.filter(Batch.road_section.like(f"%{road_section}%"))
    total = query.count()
    batches = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
    return batches, total


def _update_batch_stats(db: Session, batch: Batch):
    batch.total_work_orders = len(batch.work_orders)
    batch.abnormal_count = sum(1 for wo in batch.work_orders if wo.is_abnormal)


def create_batch(db: Session, batch_data: BatchCreate, created_by: str = None) -> Batch:
    existing = get_batch_by_no(db, batch_data.batch_no)
    if existing:
        raise ValueError(f"批次号 {batch_data.batch_no} 已存在")

    db_batch = Batch(
        batch_no=batch_data.batch_no,
        name=batch_data.name,
        description=batch_data.description,
        road_section=batch_data.road_section,
        shift=batch_data.shift,
        operator=batch_data.operator,
        spare_part_batch=batch_data.spare_part_batch,
        status=BatchStatus.DRAFT.value,
        created_by=created_by,
        updated_by=created_by,
    )
    db.add(db_batch)
    db.flush()

    log_change(
        db,
        ChangeType.CREATE,
        batch_id=db_batch.id,
        new_value=f"创建批次: {batch_data.batch_no}",
        changed_by=created_by,
    )

    for wo_data in batch_data.work_orders:
        _create_work_order_internal(db, db_batch.id, wo_data, created_by)

    _update_batch_stats(db, db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def update_batch(db: Session, batch_id: int, batch_data: BatchUpdate, updated_by: str = None) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status in [BatchStatus.FROZEN.value, BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value, BatchStatus.CANCELLED.value]:
        raise ValueError(f"批次状态为 {db_batch.status}，不允许修改")

    for field, value in batch_data.model_dump(exclude_unset=True).items():
        old_value = getattr(db_batch, field)
        if old_value != value:
            log_change(
                db,
                ChangeType.UPDATE,
                batch_id=batch_id,
                field_name=field,
                old_value=old_value,
                new_value=value,
                changed_by=updated_by,
            )
            setattr(db_batch, field, value)

    db_batch.updated_by = updated_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def submit_for_review(db: Session, batch_id: int, submitted_by: str = None) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status != BatchStatus.DRAFT.value:
        raise ValueError(f"只有草稿状态的批次可以提交审核，当前状态: {db_batch.status}")

    old_status = db_batch.status
    db_batch.status = BatchStatus.PENDING_REVIEW.value

    log_change(
        db,
        ChangeType.STATUS_CHANGE,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        change_reason="提交审核",
        changed_by=submitted_by,
    )

    db_batch.updated_by = submitted_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def review_batch(db: Session, batch_id: int, review_data: BatchReview) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status != BatchStatus.PENDING_REVIEW.value:
        raise ValueError(f"只有待审核状态的批次可以复核，当前状态: {db_batch.status}")

    old_status = db_batch.status
    if review_data.review_result == "approved":
        db_batch.status = BatchStatus.APPROVED.value
    elif review_data.review_result == "rejected":
        db_batch.status = BatchStatus.REJECTED.value
    else:
        raise ValueError(f"无效的复核结果: {review_data.review_result}")

    log_change(
        db,
        ChangeType.STATUS_CHANGE,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        change_reason=f"复核: {review_data.review_comment or review_data.review_result}",
        changed_by=review_data.reviewed_by,
    )

    for work_order in db_batch.work_orders:
        work_order.review_result = review_data.review_result
        work_order.review_comment = review_data.review_comment
        work_order.reviewed_by = review_data.reviewed_by
        work_order.reviewed_at = datetime.now()

    db_batch.updated_by = review_data.reviewed_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def freeze_batch(db: Session, batch_id: int, freeze_data: BatchFreeze) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status == BatchStatus.FROZEN.value:
        raise ValueError("批次已冻结")

    if db_batch.status in [BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value, BatchStatus.CANCELLED.value]:
        raise ValueError(f"批次状态为 {db_batch.status}，不允许冻结")

    db_batch.status_before_freeze = db_batch.status
    db_batch.status = BatchStatus.FROZEN.value
    db_batch.frozen_at = datetime.now()
    db_batch.frozen_by = freeze_data.frozen_by
    db_batch.freeze_reason = freeze_data.freeze_reason

    log_change(
        db,
        ChangeType.FREEZE,
        batch_id=batch_id,
        field_name="status",
        old_value=db_batch.status_before_freeze,
        new_value=db_batch.status,
        change_reason=freeze_data.freeze_reason,
        changed_by=freeze_data.frozen_by,
    )

    db_batch.updated_by = freeze_data.frozen_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def unfreeze_batch(db: Session, batch_id: int, unfrozen_by: str = None) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status != BatchStatus.FROZEN.value:
        raise ValueError(f"只有冻结状态的批次可以解冻，当前状态: {db_batch.status}")

    old_status = db_batch.status
    db_batch.status = db_batch.status_before_freeze or BatchStatus.DRAFT.value
    db_batch.status_before_freeze = None

    log_change(
        db,
        ChangeType.UNFREEZE,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        changed_by=unfrozen_by,
    )

    db_batch.updated_by = unfrozen_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def settle_batch(db: Session, batch_id: int, settled_by: str = None) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status != BatchStatus.APPROVED.value:
        raise ValueError(f"只有已通过状态的批次可以结算，当前状态: {db_batch.status}")

    old_status = db_batch.status
    db_batch.status = BatchStatus.SETTLED.value
    db_batch.settled_at = datetime.now()
    db_batch.settled_by = settled_by

    log_change(
        db,
        ChangeType.SETTLE,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        changed_by=settled_by,
    )

    db_batch.updated_by = settled_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def archive_batch(db: Session, batch_id: int, archived_by: str = None) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status != BatchStatus.SETTLED.value:
        raise ValueError(f"只有已结算状态的批次可以归档，当前状态: {db_batch.status}")

    old_status = db_batch.status
    db_batch.status = BatchStatus.ARCHIVED.value
    db_batch.archived_at = datetime.now()
    db_batch.archived_by = archived_by

    log_change(
        db,
        ChangeType.ARCHIVE,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        changed_by=archived_by,
    )

    db_batch.updated_by = archived_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def cancel_batch(db: Session, batch_id: int, cancel_data: BatchCancel) -> Batch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status in [BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value]:
        raise ValueError(f"批次状态为 {db_batch.status}，不允许撤销")

    old_status = db_batch.status
    db_batch.status = BatchStatus.CANCELLED.value
    db_batch.cancelled_at = datetime.now()
    db_batch.cancelled_by = cancel_data.cancelled_by
    db_batch.cancel_reason = cancel_data.cancel_reason

    log_change(
        db,
        ChangeType.CANCEL,
        batch_id=batch_id,
        field_name="status",
        old_value=old_status,
        new_value=db_batch.status,
        change_reason=cancel_data.cancel_reason,
        changed_by=cancel_data.cancelled_by,
    )

    db_batch.updated_by = cancel_data.cancelled_by
    db.commit()
    db.refresh(db_batch)
    return db_batch


def _create_work_order_internal(db: Session, batch_id: int, wo_data: WorkOrderCreate, created_by: str = None):
    db_wo = WorkOrder(batch_id=batch_id, **wo_data.model_dump())
    db.add(db_wo)
    db.flush()

    log_change(
        db,
        ChangeType.CREATE,
        batch_id=batch_id,
        work_order_id=db_wo.id,
        new_value=f"创建工单: {wo_data.order_no}",
        changed_by=created_by,
    )
    return db_wo


def add_work_orders(
    db: Session,
    batch_id: int,
    work_orders: List[WorkOrderCreate],
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE,
    added_by: str = None,
) -> Tuple[List[WorkOrder], int, int]:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    if db_batch.status in [BatchStatus.FROZEN.value, BatchStatus.SETTLED.value, BatchStatus.ARCHIVED.value, BatchStatus.CANCELLED.value]:
        raise ValueError(f"批次状态为 {db_batch.status}，不允许添加工单")

    existing_order_nos = {wo.order_no for wo in db_batch.work_orders}
    added = 0
    skipped = 0

    results = []
    for wo_data in work_orders:
        if wo_data.order_no in existing_order_nos:
            if duplicate_strategy == DuplicateStrategy.IGNORE:
                skipped += 1
                continue
            elif duplicate_strategy == DuplicateStrategy.OVERWRITE:
                existing_wo = next(wo for wo in db_batch.work_orders if wo.order_no == wo_data.order_no)
                for field, value in wo_data.model_dump().items():
                    setattr(existing_wo, field, value)
                log_change(
                    db,
                    ChangeType.UPDATE,
                    batch_id=batch_id,
                    work_order_id=existing_wo.id,
                    old_value="(覆盖前)",
                    new_value=f"覆盖工单: {wo_data.order_no}",
                    changed_by=added_by,
                )
                added += 1
            elif duplicate_strategy == DuplicateStrategy.APPEND:
                new_wo = _create_work_order_internal(db, batch_id, wo_data, added_by)
                results.append(new_wo)
                added += 1
        else:
            new_wo = _create_work_order_internal(db, batch_id, wo_data, added_by)
            results.append(new_wo)
            added += 1
            existing_order_nos.add(wo_data.order_no)

    _update_batch_stats(db, db_batch)
    db.commit()
    return results, added, skipped


def delete_batch(db: Session, batch_id: int, deleted_by: str = None) -> bool:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return False

    if db_batch.status not in [BatchStatus.DRAFT.value, BatchStatus.CANCELLED.value]:
        raise ValueError(f"只有草稿或已撤销状态的批次可以删除，当前状态: {db_batch.status}")

    log_change(
        db,
        ChangeType.DELETE,
        batch_id=batch_id,
        old_value=f"删除批次: {db_batch.batch_no}",
        changed_by=deleted_by,
    )

    db.delete(db_batch)
    db.commit()
    return True
