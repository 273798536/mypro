from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from models import (
    Experiment, ExperimentStatus, BlockReason,
    RiskNotification, BuoyData
)
from services.trace_service import TraceService
import uuid


class WorkflowService:
    STATUS_TRANSITIONS = {
        ExperimentStatus.IMPORTED: [ExperimentStatus.REVIEWING, ExperimentStatus.BLOCKED],
        ExperimentStatus.REVIEWING: [ExperimentStatus.APPROVED, ExperimentStatus.BLOCKED],
        ExperimentStatus.APPROVED: [ExperimentStatus.COMPLETED, ExperimentStatus.BLOCKED],
        ExperimentStatus.BLOCKED: [ExperimentStatus.REVIEWING, ExperimentStatus.APPROVED],
        ExperimentStatus.COMPLETED: [ExperimentStatus.EXPORTED],
        ExperimentStatus.EXPORTED: []
    }

    @staticmethod
    def can_transition(current: ExperimentStatus, new: ExperimentStatus) -> bool:
        return new in WorkflowService.STATUS_TRANSITIONS.get(current, [])

    @staticmethod
    def update_status(
        db: Session,
        experiment_id: int,
        new_status: ExperimentStatus,
        operator: str,
        remark: str = None
    ) -> Optional[Experiment]:
        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not experiment:
            return None

        old_status = experiment.status

        if not WorkflowService.can_transition(old_status, new_status):
            raise ValueError(
                f"Cannot transition from {old_status.value} to {new_status.value}"
            )

        experiment.status = new_status
        experiment.processed_by = operator
        experiment.updated_at = datetime.now()

        TraceService.add_trace(
            db,
            experiment_id=experiment_id,
            operation="status_update",
            old_status=old_status.value,
            new_status=new_status.value,
            operator=operator,
            remark=remark
        )

        db.commit()
        db.refresh(experiment)
        return experiment

    @staticmethod
    def check_and_notify_risk(
        db: Session,
        experiment_id: int,
        data_id: int,
        data_type: str,
        depth: float = None,
        ph_value: float = None
    ) -> RiskNotification:
        block_reason = None
        description = ""

        if depth is not None and depth < 0:
            block_reason = BlockReason.NEGATIVE_DEPTH
            description = (
                f"浮标数据深度值异常: {depth}米 (深度不能为负)。"
                f"该记录已被拦截，不纳入后续分析。"
                f"关联数据ID: {data_id}, 数据类型: {data_type}。"
                f"风险说明: 海洋深度测量值为负表明传感器可能发生"
                f"倒置、信号干扰或数据传输错误，该数据点无效。"
            )
        elif ph_value is not None and (ph_value < 7.0 or ph_value > 8.5):
            block_reason = BlockReason.ABNORMAL_PH
            description = f"pH值异常: {ph_value}, 超出正常海洋pH范围(7.0-8.5)"

        if not block_reason:
            return None

        notification_no = f"RISK-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        existing = (
            db.query(RiskNotification)
            .filter(
                RiskNotification.experiment_id == experiment_id,
                RiskNotification.related_data_id == data_id,
                RiskNotification.related_data_type == data_type,
                RiskNotification.is_resolved == False
            )
            .first()
        )

        if existing:
            return existing

        notification = RiskNotification(
            experiment_id=experiment_id,
            notification_no=notification_no,
            block_reason=block_reason,
            description=description,
            related_data_id=data_id,
            related_data_type=data_type
        )

        db.add(notification)
        db.flush()

        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if experiment and experiment.status != ExperimentStatus.BLOCKED:
            old_status = experiment.status.value
            experiment.status = ExperimentStatus.BLOCKED
            TraceService.add_trace(
                db,
                experiment_id=experiment_id,
                operation="auto_block",
                old_status=old_status,
                new_status=ExperimentStatus.BLOCKED.value,
                remark=f"数据质量问题自动拦截: {block_reason.value}"
            )

        return notification

    @staticmethod
    def resolve_risk(
        db: Session,
        notification_id: int,
        resolved_by: str,
        resolution_note: str
    ) -> Optional[RiskNotification]:
        notification = (
            db.query(RiskNotification)
            .filter(RiskNotification.id == notification_id)
            .first()
        )
        if not notification:
            return None

        notification.is_resolved = True
        notification.resolved_at = datetime.now()
        notification.resolved_by = resolved_by
        notification.resolution_note = resolution_note

        TraceService.add_trace(
            db,
            experiment_id=notification.experiment_id,
            operation="resolve_risk",
            operator=resolved_by,
            remark=f"解除风险通报 {notification.notification_no}: {resolution_note}",
            affected_data=f"related_data_id={notification.related_data_id}, type={notification.related_data_type}"
        )

        experiment = db.query(Experiment).filter(Experiment.id == notification.experiment_id).first()
        unresolved = (
            db.query(RiskNotification)
            .filter(
                RiskNotification.experiment_id == notification.experiment_id,
                RiskNotification.is_resolved == False
            )
            .count()
        )
        if unresolved == 0 and experiment.status == ExperimentStatus.BLOCKED:
            experiment.status = ExperimentStatus.REVIEWING
            TraceService.add_trace(
                db,
                experiment_id=notification.experiment_id,
                operation="auto_unblock",
                old_status=ExperimentStatus.BLOCKED.value,
                new_status=ExperimentStatus.REVIEWING.value,
                remark="所有风险通报已解除，系统自动恢复至复核状态"
            )

        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_risks_by_experiment(db: Session, experiment_id: int, resolved: bool = None):
        query = db.query(RiskNotification).filter(RiskNotification.experiment_id == experiment_id)
        if resolved is not None:
            query = query.filter(RiskNotification.is_resolved == resolved)
        return query.order_by(RiskNotification.created_at.desc()).all()

    @staticmethod
    def review_experiment_data(db: Session, experiment_id: int) -> dict:
        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not experiment:
            return None

        buoy_data = (
            db.query(BuoyData)
            .filter(BuoyData.experiment_id == experiment_id)
            .all()
        )

        blocked_buoys = [b for b in buoy_data if b.depth < 0]
        valid_buoys = [b for b in buoy_data if b.depth >= 0]

        risks = WorkflowService.get_risks_by_experiment(db, experiment_id, resolved=False)

        return {
            "experiment_id": experiment_id,
            "experiment_no": experiment.experiment_no,
            "status": experiment.status,
            "total_buoy_records": len(buoy_data),
            "valid_buoy_records": len(valid_buoys),
            "blocked_buoy_records": len(blocked_buoys),
            "blocked_details": [
                {
                    "id": b.id,
                    "depth": b.depth,
                    "record_time": b.record_time,
                    "buoy_id": b.buoy_id
                }
                for b in blocked_buoys
            ],
            "unresolved_risks": len(risks),
            "can_approve": len(blocked_buoys) == 0 and len(risks) == 0
        }
