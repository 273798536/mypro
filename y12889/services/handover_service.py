from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
from models import (
    Experiment, RiskNotification, BlockReason,
    ExperimentStatus, BuoyData
)
from schemas import MonthlyHandoverResponse, BlockedRecordSummary


class HandoverService:
    @staticmethod
    def get_monthly_handover(db: Session, year: int, month: int) -> MonthlyHandoverResponse:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        experiments = (
            db.query(Experiment)
            .filter(
                Experiment.start_date >= start_date,
                Experiment.start_date < end_date
            )
            .all()
        )

        blocked_records = []
        unavailable_count = 0
        available_count = 0

        for exp in experiments:
            risks = (
                db.query(RiskNotification)
                .filter(
                    RiskNotification.experiment_id == exp.id,
                    RiskNotification.is_resolved == False
                )
                .all()
            )

            if risks:
                unavailable_count += 1
                for risk in risks:
                    buoy = None
                    if risk.related_data_type == "buoy" and risk.related_data_id:
                        buoy = (
                            db.query(BuoyData)
                            .filter(BuoyData.id == risk.related_data_id)
                            .first()
                        )

                    blocked_records.append(
                        BlockedRecordSummary(
                            experiment_id=exp.id,
                            experiment_no=exp.experiment_no,
                            vessel_name=exp.vessel_name,
                            block_reason=risk.block_reason,
                            block_description=risk.description,
                            depth_value=buoy.depth if buoy and risk.block_reason == BlockReason.NEGATIVE_DEPTH else None,
                            record_time=buoy.record_time if buoy else None,
                            notification_no=risk.notification_no
                        )
                    )
            else:
                if exp.status in [ExperimentStatus.APPROVED, ExperimentStatus.COMPLETED, ExperimentStatus.EXPORTED]:
                    available_count += 1
                else:
                    unavailable_count += 1

        month_str = f"{year}年{month}月"

        return MonthlyHandoverResponse(
            month=month_str,
            total_experiments=len(experiments),
            available_count=available_count,
            unavailable_count=unavailable_count,
            blocked_records=blocked_records
        )

    @staticmethod
    def get_unavailable_records(db: Session, experiment_id: int = None) -> List[BlockedRecordSummary]:
        query = (
            db.query(RiskNotification)
            .filter(RiskNotification.is_resolved == False)
        )

        if experiment_id:
            query = query.filter(RiskNotification.experiment_id == experiment_id)

        risks = query.order_by(RiskNotification.created_at.desc()).all()

        result = []
        for risk in risks:
            exp = db.query(Experiment).filter(Experiment.id == risk.experiment_id).first()
            buoy = None

            if risk.related_data_type == "buoy" and risk.related_data_id:
                buoy = (
                    db.query(BuoyData)
                    .filter(BuoyData.id == risk.related_data_id)
                    .first()
                )

            result.append(
                BlockedRecordSummary(
                    experiment_id=risk.experiment_id,
                    experiment_no=exp.experiment_no if exp else "UNKNOWN",
                    vessel_name=exp.vessel_name if exp else "UNKNOWN",
                    block_reason=risk.block_reason,
                    block_description=risk.description,
                    depth_value=buoy.depth if buoy and risk.block_reason == BlockReason.NEGATIVE_DEPTH else None,
                    record_time=buoy.record_time if buoy else None,
                    notification_no=risk.notification_no
                )
            )

        return result
