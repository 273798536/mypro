from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from ..database import get_db
from .. import schemas, crud
from ..cop_calculator import OPERATING_CONDITION_GROUPS

router = APIRouter(prefix="/api/data", tags=["数据采集"])


@router.post("/collect", response_model=schemas.CalculationResult)
def collect_data(
    request: schemas.DataCollectionRequest,
    allow_estimated: bool = Query(False, description="是否允许使用设计流量估算"),
    db: Session = Depends(get_db)
):
    cop_result, anomalies, message = crud.process_data_collection(
        db, request, allow_estimated=allow_estimated
    )

    return schemas.CalculationResult(
        success=cop_result is not None or len(anomalies) > 0,
        message=message,
        cop_result=schemas.COPResultResponse.model_validate(cop_result) if cop_result else None,
        anomalies=[schemas.AnomalyRecordResponse.model_validate(a) for a in anomalies]
    )


@router.post("/flow/{flow_id}/confirm", response_model=schemas.CalculationResult)
def confirm_flow_record(
    flow_id: int,
    flow_rate: float = Query(..., gt=0, description="实际流量值 m³/h"),
    confirmed_by: str = Query(..., description="确认人"),
    db: Session = Depends(get_db)
):
    flow_record, cop_result, anomalies = crud.confirm_flow_record(
        db, flow_id, flow_rate, confirmed_by
    )

    if not flow_record:
        raise HTTPException(status_code=404, detail="流量记录不存在")

    return schemas.CalculationResult(
        success=True,
        message="流量数据已确认，COP已重新计算",
        cop_result=schemas.COPResultResponse.model_validate(cop_result) if cop_result else None,
        anomalies=[schemas.AnomalyRecordResponse.model_validate(a) for a in anomalies]
    )


@router.get("/flow", response_model=List[schemas.FlowRecordResponse])
def get_flow_records(
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_flow_records(db, equipment_id, start_time, end_time, status, skip, limit)


@router.get("/cop", response_model=List[schemas.COPResultResponse])
def get_cop_results(
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    has_anomaly: Optional[bool] = None,
    operating_mode: Optional[str] = None,
    operating_condition_group: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_cop_results(
        db, equipment_id, start_time, end_time, has_anomaly,
        operating_mode, operating_condition_group, skip, limit
    )


@router.get("/anomalies", response_model=List[schemas.AnomalyRecordResponse])
def get_anomaly_records(
    equipment_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    is_resolved: Optional[bool] = None,
    anomaly_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_anomaly_records(
        db, equipment_id, start_time, end_time, is_resolved, anomaly_type, skip, limit
    )


@router.patch("/anomalies/{anomaly_id}/resolve")
def resolve_anomaly(
    anomaly_id: int,
    resolution: str = Query(..., description="解决方案说明"),
    resolved_by: str = Query(..., description="处理人"),
    db: Session = Depends(get_db)
):
    from ..models import AnomalyRecord

    anomaly = db.query(AnomalyRecord).filter(AnomalyRecord.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="异常记录不存在")

    anomaly.is_resolved = True
    anomaly.resolved_at = datetime.now()
    anomaly.resolved_by = resolved_by
    anomaly.resolution = resolution

    db.commit()
    db.refresh(anomaly)

    return {"message": "异常已处理", "anomaly_id": anomaly_id}


@router.get("/operating-conditions", response_model=List[schemas.OperatingConditionGroup])
def get_operating_conditions():
    return OPERATING_CONDITION_GROUPS
