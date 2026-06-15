from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import io
import csv
import json

from ..database import get_db
from ..models import ProcessingRecord, AnomalyRecord, DataGap, BeachInfo

router = APIRouter()


def _generate_csv(rows, headers):
    """生成CSV格式数据"""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue().encode('utf-8-sig')


@router.get("/processing-records", summary="导出处理记录")
def export_processing_records(
    batch_no: Optional[str] = Query(None, description="批次号"),
    beach_id: Optional[int] = Query(None, description="浴场ID"),
    risk_level: Optional[str] = Query(None, description="风险等级"),
    format: str = Query("csv", description="导出格式: csv/json"),
    db: Session = Depends(get_db)
):
    """
    导出处理记录，用于生成报告

    - 与界面使用同一数据源，确保一致性
    - 支持CSV和JSON格式
    """
    query = db.query(ProcessingRecord)

    if batch_no:
        query = query.filter(ProcessingRecord.batch_no == batch_no)
    if beach_id:
        query = query.filter(ProcessingRecord.beach_id == beach_id)
    if risk_level:
        query = query.filter(ProcessingRecord.risk_level == risk_level)

    records = query.order_by(ProcessingRecord.process_time.desc()).all()

    rows = []
    for r in records:
        beach = db.query(BeachInfo).filter(BeachInfo.id == r.beach_id).first()
        rows.append({
            "处理记录ID": r.id,
            "批次号": r.batch_no,
            "浴场": beach.name if beach else "",
            "处理时间": r.process_time.strftime("%Y-%m-%d %H:%M:%S") if r.process_time else "",
            "轨迹漂移量(米)": r.trajectory_drift or "",
            "漂移异常": "是" if r.is_drift_abnormal else "否",
            "漂移计算说明": r.drift_calculation_note or "",
            "水质等级": r.water_quality_level or "",
            "水质评分": r.water_quality_score or "",
            "水质异常": "是" if r.is_water_abnormal else "否",
            "水质计算说明": r.water_calculation_note or "",
            "风险等级": r.risk_level,
            "风险评分": r.risk_score or "",
            "计算状态": r.calculation_status,
            "失败原因": r.failure_reason or "",
            "处理意见": r.processing_opinion or "",
            "处理人": r.processed_by or "",
            "处理时间": r.processed_at.strftime("%Y-%m-%d %H:%M:%S") if r.processed_at else "",
            "是否复核": "是" if r.is_reviewed else "否",
            "复核意见": r.review_opinion or "",
            "复核人": r.reviewed_by or "",
        })

    headers = list(rows[0].keys()) if rows else []

    if format.lower() == "json":
        content = json.dumps(rows, ensure_ascii=False, indent=2).encode('utf-8')
        media_type = "application/json"
        filename = f"processing_records_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    else:
        content = _generate_csv(rows, headers)
        media_type = "text/csv"
        filename = f"processing_records_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/anomalies", summary="导出异常记录")
def export_anomalies(
    anomaly_type: Optional[str] = Query(None, description="异常类型"),
    anomaly_level: Optional[str] = Query(None, description="异常等级"),
    is_resolved: Optional[bool] = Query(None, description="是否已解决"),
    format: str = Query("csv", description="导出格式: csv/json"),
    db: Session = Depends(get_db)
):
    """
    导出异常记录
    """
    query = db.query(AnomalyRecord)

    if anomaly_type:
        query = query.filter(AnomalyRecord.anomaly_type == anomaly_type)
    if anomaly_level:
        query = query.filter(AnomalyRecord.anomaly_level == anomaly_level)
    if is_resolved is not None:
        query = query.filter(AnomalyRecord.is_resolved == is_resolved)

    anomalies = query.order_by(AnomalyRecord.occurrence_time.desc()).all()

    rows = []
    for a in anomalies:
        beach = db.query(BeachInfo).filter(BeachInfo.id == a.beach_id).first()
        rows.append({
            "异常编号": a.anomaly_no,
            "浴场": beach.name if beach else "",
            "异常类型": a.anomaly_type,
            "异常等级": a.anomaly_level,
            "异常描述": a.description,
            "异常值": a.anomaly_value or "",
            "阈值": a.threshold or "",
            "单位": a.unit or "",
            "计算公式": a.formula or "",
            "发生时间": a.occurrence_time.strftime("%Y-%m-%d %H:%M:%S") if a.occurrence_time else "",
            "是否解决": "是" if a.is_resolved else "否",
            "解决说明": a.resolution_note or "",
        })

    headers = list(rows[0].keys()) if rows else []

    if format.lower() == "json":
        content = json.dumps(rows, ensure_ascii=False, indent=2).encode('utf-8')
        media_type = "application/json"
        filename = f"anomalies_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    else:
        content = _generate_csv(rows, headers)
        media_type = "text/csv"
        filename = f"anomalies_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/gaps", summary="导出数据缺口清单")
def export_gaps(
    batch_no: Optional[str] = Query(None, description="批次号"),
    is_filled: Optional[bool] = Query(False, description="是否已补全"),
    format: str = Query("csv", description="导出格式: csv/json"),
    db: Session = Depends(get_db)
):
    """
    导出数据缺口清单，供港口调度员补全

    - 默认导出未补全的缺口
    """
    query = db.query(DataGap)

    if batch_no:
        query = query.filter(DataGap.batch_no == batch_no)
    if is_filled is not None:
        query = query.filter(DataGap.is_filled == is_filled)

    gaps = query.order_by(DataGap.created_at.desc()).all()

    rows = []
    for g in gaps:
        beach = db.query(BeachInfo).filter(BeachInfo.id == g.beach_id).first()
        rows.append({
            "缺口ID": g.id,
            "批次号": g.batch_no,
            "浴场": beach.name if beach else "",
            "缺口类型": g.gap_type,
            "缺口描述": g.description,
            "缺失数据时间": g.missing_data_time.strftime("%Y-%m-%d %H:%M:%S") if g.missing_data_time else "",
            "缺失字段": g.missing_fields or "",
            "是否补全": "是" if g.is_filled else "否",
            "补全人": g.filled_by or "",
            "补全时间": g.filled_at.strftime("%Y-%m-%d %H:%M:%S") if g.filled_at else "",
            "补全说明": g.fill_note or "",
            "创建时间": g.created_at.strftime("%Y-%m-%d %H:%M:%S") if g.created_at else "",
        })

    headers = list(rows[0].keys()) if rows else []

    if format.lower() == "json":
        content = json.dumps(rows, ensure_ascii=False, indent=2).encode('utf-8')
        media_type = "application/json"
        filename = f"data_gaps_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    else:
        content = _generate_csv(rows, headers)
        media_type = "text/csv"
        filename = f"data_gaps_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/risk-report", summary="导出风险播报报告")
def export_risk_report(
    batch_no: str = Query(..., description="批次号"),
    format: str = Query("csv", description="导出格式: csv/json"),
    db: Session = Depends(get_db)
):
    """
    导出完整的海水浴场风险播报报告

    包含：浴场信息、巡检信息、浮标数据、计算结果、异常信息、风险等级
    所有数据来自同一数据源，确保与界面展示一致
    """
    query = db.query(ProcessingRecord).filter(ProcessingRecord.batch_no == batch_no)
    records = query.order_by(ProcessingRecord.process_time.desc()).all()

    rows = []
    for r in records:
        beach = db.query(BeachInfo).filter(BeachInfo.id == r.beach_id).first()
        inspection = r.inspection
        buoy = r.buoy_data

        row = {
            "浴场名称": beach.name if beach else "",
            "浴场编码": beach.code if beach else "",
            "浴场纬度": beach.latitude if beach else "",
            "浴场经度": beach.longitude if beach else "",
            "安全半径(米)": beach.safe_zone_radius if beach else "",
        }

        if inspection:
            row.update({
                "巡检编号": inspection.record_no,
                "巡检时间": inspection.inspection_time.strftime("%Y-%m-%d %H:%M:%S"),
                "巡检人员": inspection.inspector or "",
                "天气": inspection.weather or "",
                "气温(℃)": inspection.temperature or "",
                "浪高(米)": inspection.wave_height or "",
                "潮位": inspection.tide_level or "",
                "照片名称": inspection.photo_name or "",
                "照片路径": inspection.photo_path or "",
                "巡检备注": inspection.remark or "",
            })

        if buoy:
            row.update({
                "浮标编号": buoy.buoy_id,
                "浮标记录时间": buoy.record_time.strftime("%Y-%m-%d %H:%M:%S"),
                "浮标纬度": buoy.latitude or "",
                "浮标经度": buoy.longitude or "",
                "水温(℃)": buoy.water_temperature or "",
                "pH值": buoy.ph_value or "",
                "溶解氧(mg/L)": buoy.dissolved_oxygen or "",
                "浊度(NTU)": buoy.turbidity or "",
                "盐度(psu)": buoy.salinity or "",
                "流速(m/s)": buoy.current_speed or "",
                "波高(m)": buoy.wave_height or "",
                "数据完整性": "完整" if not buoy.is_missing else "部分缺失",
                "缺失字段": buoy.missing_fields or "",
            })

        row.update({
            "轨迹漂移量(米)": r.trajectory_drift or "",
            "漂移异常": "是" if r.is_drift_abnormal else "否",
            "漂移计算说明": r.drift_calculation_note or "",
            "水质等级": r.water_quality_level or "",
            "水质评分": r.water_quality_score or "",
            "水质异常": "是" if r.is_water_abnormal else "否",
            "水质计算说明": r.water_calculation_note or "",
            "风险等级": r.risk_level,
            "风险评分": r.risk_score or "",
            "计算状态": r.calculation_status,
            "失败原因": r.failure_reason or "",
            "处理意见": r.processing_opinion or "",
            "处理人": r.processed_by or "",
            "是否复核": "是" if r.is_reviewed else "否",
            "复核意见": r.review_opinion or "",
            "复核人": r.reviewed_by or "",
        })

        rows.append(row)

    headers = list(rows[0].keys()) if rows else []

    if format.lower() == "json":
        content = json.dumps(rows, ensure_ascii=False, indent=2).encode('utf-8')
        media_type = "application/json"
        filename = f"risk_report_{batch_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
    else:
        content = _generate_csv(rows, headers)
        media_type = "text/csv"
        filename = f"risk_report_{batch_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
