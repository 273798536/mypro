from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..schemas import ReviewRequest, ProcessingRecordResponse
from ..models import ProcessingRecord
from ..utils.calculator import (
    TrajectoryDriftCalculator, WaterQualityCalculator, calculate_risk_level
)

router = APIRouter()

drift_calc = TrajectoryDriftCalculator()
water_calc = WaterQualityCalculator()


@router.post("/submit", response_model=ProcessingRecordResponse, summary="提交复核意见")
def submit_review(
    request: ReviewRequest,
    db: Session = Depends(get_db)
):
    """
    港口调度员提交复核意见，支持重新计算

    - **processing_record_id**: 处理记录ID
    - **review_opinion**: 复核意见
    - **reviewed_by**: 复核人
    - **need_recalculate**: 是否需要重新计算
    """
    record = db.query(ProcessingRecord)\
               .filter(ProcessingRecord.id == request.processing_record_id)\
               .first()

    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    record.is_reviewed = True
    record.review_opinion = request.review_opinion
    record.reviewed_by = request.reviewed_by
    record.reviewed_at = datetime.now()

    if request.need_recalculate:
        if record.buoy_data:
            buoy = record.buoy_data
            beach = record.beach

            if buoy.latitude and buoy.longitude and beach and beach.safe_zone_radius:
                drift_result = drift_calc.calculate(
                    beach.latitude, beach.longitude,
                    buoy.latitude, buoy.longitude,
                    beach.safe_zone_radius
                )
                if not drift_result["failure_reason"]:
                    record.trajectory_drift = drift_result["drift_distance"]
                    record.is_drift_abnormal = drift_result["is_abnormal"]
                    record.drift_calculation_note = drift_result["calculation_note"]

            water_result = water_calc.calculate(
                water_temperature=buoy.water_temperature,
                ph_value=buoy.ph_value,
                dissolved_oxygen=buoy.dissolved_oxygen,
                turbidity=buoy.turbidity,
                salinity=buoy.salinity
            )
            if not water_result["failure_reason"]:
                record.water_quality_level = water_result["quality_level"]
                record.water_quality_score = water_result["quality_score"]
                record.is_water_abnormal = water_result["is_abnormal"]
                record.water_calculation_note = water_result["calculation_note"]

            drift_abnormal = record.is_drift_abnormal or False
            water_abnormal = record.is_water_abnormal or False
            drift_value = record.trajectory_drift or 0
            water_score = record.water_quality_score or 100

            risk = calculate_risk_level(drift_abnormal, water_abnormal, drift_value, water_score)
            record.risk_level = risk["risk_level"]
            record.risk_score = risk["risk_score"]

            record.calculation_status = "success"
            record.failure_reason = None

    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)

    return record


@router.put("/processing-opinion/{record_id}", response_model=ProcessingRecordResponse, summary="修改处理意见")
def update_processing_opinion(
    record_id: int,
    processing_opinion: str,
    processed_by: str,
    db: Session = Depends(get_db)
):
    """
    修改处理意见，无需重新导入即可修正

    - **record_id**: 处理记录ID
    - **processing_opinion**: 新的处理意见
    - **processed_by**: 处理人
    """
    record = db.query(ProcessingRecord)\
               .filter(ProcessingRecord.id == record_id)\
               .first()

    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    record.processing_opinion = processing_opinion
    record.processed_by = processed_by
    record.processed_at = datetime.now()
    record.updated_at = datetime.now()

    db.commit()
    db.refresh(record)

    return record


@router.get("/pending", summary="获取待复核记录列表")
def get_pending_reviews(
    db: Session = Depends(get_db)
):
    """
    获取所有待复核的记录，供港口调度员处理
    """
    from ..schemas import ProcessingRecordResponse

    records = db.query(ProcessingRecord)\
                .filter(ProcessingRecord.is_reviewed == False)\
                .order_by(ProcessingRecord.process_time.desc())\
                .all()

    return records
