from app.models import Batch, BatchStatus, StatusTransition, DataIssue, IssueSeverity
from datetime import datetime
from sqlalchemy.orm import Session

STATUS_TRANSITION_MAP = {
    BatchStatus.DRAFT: [BatchStatus.IMPORTED, BatchStatus.REJECTED],
    BatchStatus.IMPORTED: [BatchStatus.UNDER_REVIEW, BatchStatus.REJECTED],
    BatchStatus.UNDER_REVIEW: [BatchStatus.APPROVED, BatchStatus.IMPORTED, BatchStatus.REJECTED],
    BatchStatus.APPROVED: [BatchStatus.COMPLETED, BatchStatus.UNDER_REVIEW],
    BatchStatus.REJECTED: [BatchStatus.DRAFT, BatchStatus.IMPORTED],
    BatchStatus.COMPLETED: []
}

STATUS_LABEL_CN = {
    BatchStatus.DRAFT: "草稿",
    BatchStatus.IMPORTED: "已导入",
    BatchStatus.UNDER_REVIEW: "复核中",
    BatchStatus.APPROVED: "已审核",
    BatchStatus.COMPLETED: "已完成",
    BatchStatus.REJECTED: "已退回"
}


def can_transition(from_status: BatchStatus, to_status: BatchStatus) -> bool:
    return to_status in STATUS_TRANSITION_MAP.get(from_status, [])


def get_available_transitions(current_status: BatchStatus) -> list:
    transitions = STATUS_TRANSITION_MAP.get(current_status, [])
    return [(t, STATUS_LABEL_CN[t]) for t in transitions]


def advance_status(db: Session, batch_id: int, target_status: BatchStatus,
                   operator: str, remark: str = None) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"批次ID {batch_id} 不存在")

    if not can_transition(batch.status, target_status):
        raise ValueError(
            f"无法从状态 '{STATUS_LABEL_CN.get(batch.status, batch.status)}' "
            f"跳转到 '{STATUS_LABEL_CN.get(target_status, target_status)}'"
        )

    if target_status in [BatchStatus.UNDER_REVIEW, BatchStatus.APPROVED]:
        unresolved = db.query(DataIssue).filter(
            DataIssue.batch_id == batch_id,
            DataIssue.is_resolved == False,
            DataIssue.severity == IssueSeverity.ERROR
        ).count()
        if unresolved > 0 and target_status == BatchStatus.APPROVED:
            raise ValueError(f"存在 {unresolved} 个严重数据问题未解决, 无法审核通过")

    transition = StatusTransition(
        batch_id=batch.id,
        from_status=batch.status,
        to_status=target_status,
        operator=operator,
        remark=remark
    )
    db.add(transition)

    batch.status = target_status
    batch.updated_at = datetime.now()
    if operator:
        if target_status in [BatchStatus.UNDER_REVIEW, BatchStatus.APPROVED, BatchStatus.COMPLETED]:
            batch.reviewer = operator
        elif target_status in [BatchStatus.IMPORTED, BatchStatus.DRAFT]:
            batch.operator = operator

    if target_status == BatchStatus.COMPLETED:
        batch.completed_at = datetime.now()

    db.commit()
    db.refresh(batch)
    return batch


def get_status_history(db: Session, batch_id: int) -> list:
    return db.query(StatusTransition).filter(
        StatusTransition.batch_id == batch_id
    ).order_by(StatusTransition.transition_at.asc()).all()
