from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..schemas import ProcessingRecordResponse
from ..models import ProcessingRecord, BeachInfo, InspectionRecord, BuoyData

router = APIRouter()


@router.get("/records", response_model=List[ProcessingRecordResponse], summary="获取处理记录列表")
def get_processing_records(
    batch_no: Optional[str] = Query(None, description="批次号"),
    beach_id: Optional[int] = Query(None, description="浴场ID"),
    risk_level: Optional[str] = Query(None, description="风险等级"),
    calculation_status: Optional[str] = Query(None, description="计算状态"),
    has_abnormal: Optional[bool] = Query(None, description="是否有异常"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    skip: int = Query(0, description="跳过条数"),
    limit: int = Query(100, description="返回条数"),
    db: Session = Depends(get_db)
):
    """
    获取统一的处理记录列表，界面和报告共用同一批数据

    - 支持多条件过滤
    - 所有数据来自同一数据源，确保界面和报告一致
    """
    query = db.query(ProcessingRecord)

    if batch_no:
        query = query.filter(ProcessingRecord.batch_no == batch_no)
    if beach_id:
        query = query.filter(ProcessingRecord.beach_id == beach_id)
    if risk_level:
        query = query.filter(ProcessingRecord.risk_level == risk_level)
    if calculation_status:
        query = query.filter(ProcessingRecord.calculation_status == calculation_status)
    if has_abnormal is not None:
        if has_abnormal:
            query = query.filter(
                (ProcessingRecord.is_drift_abnormal == True) |
                (ProcessingRecord.is_water_abnormal == True)
            )
        else:
            query = query.filter(
                (ProcessingRecord.is_drift_abnormal == False) &
                (ProcessingRecord.is_water_abnormal == False)
            )
    if start_time:
        query = query.filter(ProcessingRecord.process_time >= start_time)
    if end_time:
        query = query.filter(ProcessingRecord.process_time <= end_time)

    records = query.order_by(ProcessingRecord.process_time.desc())\
                   .offset(skip).limit(limit).all()

    return records


@router.get("/records/{record_id}", response_model=ProcessingRecordResponse, summary="获取处理记录详情")
def get_processing_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单条处理记录的详细信息，包括关联的巡检记录、浮标数据和浴场信息
    """
    record = db.query(ProcessingRecord)\
               .filter(ProcessingRecord.id == record_id)\
               .first()

    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    return record


@router.get("/statistics", summary="获取处理记录统计信息")
def get_processing_statistics(
    batch_no: Optional[str] = Query(None, description="批次号"),
    db: Session = Depends(get_db)
):
    """
    获取处理记录的统计信息，供仪表盘和报告使用
    """
    query = db.query(ProcessingRecord)
    if batch_no:
        query = query.filter(ProcessingRecord.batch_no == batch_no)

    total = query.count()
    success = query.filter(ProcessingRecord.calculation_status == "success").count()
    partial = query.filter(ProcessingRecord.calculation_status == "partial").count()
    failed = query.filter(ProcessingRecord.calculation_status == "failed").count()

    high_risk = query.filter(ProcessingRecord.risk_level == "高风险").count()
    medium_risk = query.filter(ProcessingRecord.risk_level == "中风险").count()
    low_risk = query.filter(ProcessingRecord.risk_level == "低风险").count()
    normal = query.filter(ProcessingRecord.risk_level == "正常").count()

    drift_abnormal = query.filter(ProcessingRecord.is_drift_abnormal == True).count()
    water_abnormal = query.filter(ProcessingRecord.is_water_abnormal == True).count()

    return {
        "total": total,
        "calculation_status": {
            "success": success,
            "partial": partial,
            "failed": failed
        },
        "risk_level": {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk,
            "normal": normal
        },
        "abnormal_types": {
            "trajectory_drift": drift_abnormal,
            "water_quality": water_abnormal
        }
    }
