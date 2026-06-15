from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..schemas import TraceResponse
from ..models import AnomalyRecord, ProcessingRecord, InspectionRecord, BuoyData, BeachInfo

router = APIRouter()


@router.get("/anomaly/{anomaly_no}", response_model=TraceResponse, summary="追溯异常记录")
def trace_anomaly(
    anomaly_no: str,
    db: Session = Depends(get_db)
):
    """
    从异常记录往回追溯，完整链路：
    异常记录 → 处理记录 → 巡检记录（含照片） + 浮标数据 → 浴场信息 → 处理意见

    验收标准：能查到巡检照片和处理意见才算顺
    """
    anomaly = db.query(AnomalyRecord)\
                .filter(AnomalyRecord.anomaly_no == anomaly_no)\
                .first()

    if not anomaly:
        raise HTTPException(status_code=404, detail="异常记录不存在")

    processing = db.query(ProcessingRecord)\
                   .filter(ProcessingRecord.id == anomaly.processing_record_id)\
                   .first()

    if not processing:
        raise HTTPException(status_code=404, detail="关联的处理记录不存在")

    inspection = None
    if processing.inspection_id:
        inspection = db.query(InspectionRecord)\
                       .filter(InspectionRecord.id == processing.inspection_id)\
                       .first()

    buoy_data = None
    if processing.buoy_data_id:
        buoy_data = db.query(BuoyData)\
                      .filter(BuoyData.id == processing.buoy_data_id)\
                      .first()

    beach = db.query(BeachInfo)\
              .filter(BeachInfo.id == anomaly.beach_id)\
              .first()

    if not beach:
        raise HTTPException(status_code=404, detail="浴场信息不存在")

    trace_path = []
    trace_path.append({
        "step": 1,
        "name": "异常记录",
        "type": "anomaly",
        "id": anomaly.id,
        "info": f"{anomaly.anomaly_type} - {anomaly.anomaly_level}",
        "detail": anomaly.description
    })

    trace_path.append({
        "step": 2,
        "name": "处理记录",
        "type": "processing",
        "id": processing.id,
        "info": f"批次: {processing.batch_no}",
        "detail": f"风险等级: {processing.risk_level}, 处理意见: {processing.processing_opinion or '未填写'}"
    })

    if inspection:
        trace_path.append({
            "step": 3,
            "name": "巡检记录",
            "type": "inspection",
            "id": inspection.id,
            "info": f"编号: {inspection.record_no}",
            "detail": f"巡检时间: {inspection.inspection_time}, 巡检员: {inspection.inspector or '未知'}",
            "has_photo": inspection.photo_path is not None,
            "photo_path": inspection.photo_path,
            "photo_name": inspection.photo_name
        })

    if buoy_data:
        trace_path.append({
            "step": 4,
            "name": "浮标数据",
            "type": "buoy",
            "id": buoy_data.id,
            "info": f"浮标: {buoy_data.buoy_id}",
            "detail": f"记录时间: {buoy_data.record_time}, 数据完整性: {'完整' if not buoy_data.is_missing else '部分缺失'}"
        })

    trace_path.append({
        "step": 5,
        "name": "浴场信息",
        "type": "beach",
        "id": beach.id,
        "info": f"{beach.name} ({beach.code})",
        "detail": f"坐标: {beach.latitude}, {beach.longitude}, 安全半径: {beach.safe_zone_radius}米"
    })

    if processing.processing_opinion:
        trace_path.append({
            "step": 6,
            "name": "处理意见",
            "type": "opinion",
            "info": f"处理人: {processing.processed_by or '系统'}",
            "detail": processing.processing_opinion,
            "time": processing.processed_at
        })

    if processing.review_opinion:
        trace_path.append({
            "step": 7,
            "name": "复核意见",
            "type": "review",
            "info": f"复核人: {processing.reviewed_by}",
            "detail": processing.review_opinion,
            "time": processing.reviewed_at
        })

    return {
        "anomaly": anomaly,
        "processing_record": processing,
        "inspection": inspection,
        "buoy_data": buoy_data,
        "beach": beach,
        "trace_path": trace_path
    }


@router.get("/check-chain/{anomaly_no}", summary="检查追溯链路完整性")
def check_trace_chain(
    anomaly_no: str,
    db: Session = Depends(get_db)
):
    """
    检查追溯链路是否完整，用于验收测试

    返回：各环节是否可追溯，特别是照片和处理意见
    """
    anomaly = db.query(AnomalyRecord)\
                .filter(AnomalyRecord.anomaly_no == anomaly_no)\
                .first()

    if not anomaly:
        return {"valid": False, "reason": "异常记录不存在"}

    processing = db.query(ProcessingRecord)\
                   .filter(ProcessingRecord.id == anomaly.processing_record_id)\
                   .first()

    if not processing:
        return {"valid": False, "reason": "处理记录不存在"}

    inspection = None
    if processing.inspection_id:
        inspection = db.query(InspectionRecord)\
                       .filter(InspectionRecord.id == processing.inspection_id)\
                       .first()

    result = {
        "valid": True,
        "anomaly_found": True,
        "processing_found": True,
        "inspection_found": inspection is not None,
        "has_photo": inspection.photo_path is not None if inspection else False,
        "has_processing_opinion": processing.processing_opinion is not None,
        "photo_path": inspection.photo_path if inspection else None,
        "photo_name": inspection.photo_name if inspection else None,
        "processing_opinion": processing.processing_opinion,
        "review_opinion": processing.review_opinion,
        "message": "追溯链路完整"
    }

    if not result["has_photo"]:
        result["message"] = "缺少巡检照片"
        result["valid"] = False
    elif not result["has_processing_opinion"]:
        result["message"] = "缺少处理意见"
        result["valid"] = False

    return result
