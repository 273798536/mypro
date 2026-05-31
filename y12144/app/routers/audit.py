from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Arrival, DataStatus
from app.schemas import AuditLogOut, ArrivalOut
from app.audit_service import get_magnitude_updates, get_status_flow
from app.status_machine import get_status_display, get_verifier_display

router = APIRouter()


@router.get("/logs", response_model=List[AuditLogOut])
def list_audit_logs(
    arrival_id: Optional[int] = None,
    field_name: Optional[str] = None,
    operator: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if arrival_id:
        query = query.filter(AuditLog.arrival_id == arrival_id)
    if field_name:
        query = query.filter(AuditLog.field_name == field_name)
    if operator:
        query = query.filter(AuditLog.operator == operator)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/arrival/{arrival_id}", response_model=List[AuditLogOut])
def get_arrival_audit(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    logs = db.query(AuditLog).filter(
        AuditLog.arrival_id == arrival_id
    ).order_by(AuditLog.created_at.asc()).all()
    return logs


@router.get("/magnitude-updates", response_model=List[ArrivalOut])
def list_magnitude_updates(
    event_tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    arrivals = get_magnitude_updates(db, event_tag)
    return arrivals


@router.get("/status-flow/{arrival_id}")
def get_arrival_status_flow(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    logs = get_status_flow(db, arrival_id)
    
    flow = []
    current_status = None
    
    if arrival.has_magnitude_update:
        flow.append({
            "type": "magnitude_update",
            "time": arrival.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
            "content": f"震级备注更新: {arrival.magnitude_remark}",
            "impact": "结论已更新，需重新审核"
        })
    
    for log in logs:
        flow.append({
            "type": "status_change",
            "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "from": get_status_display(DataStatus(log.old_value)) if log.old_value else "初始状态",
            "to": get_status_display(DataStatus(log.new_value)) if log.new_value else "",
            "operator": log.operator,
            "reason": log.change_reason or ""
        })
    
    if not flow:
        flow.append({
            "type": "info",
            "message": f"当前状态: {get_status_display(arrival.status)}，无变更记录"
        })
    
    return {
        "arrival_id": arrival_id,
        "station_code": arrival.station.station_code if arrival.station else "",
        "event_tag": arrival.event_tag,
        "phase": arrival.phase,
        "current_status": get_status_display(arrival.status),
        "current_verifier": get_verifier_display(arrival.next_verifier) if arrival.next_verifier else "",
        "has_magnitude_update": arrival.has_magnitude_update,
        "magnitude_remark": arrival.magnitude_remark,
        "flow": flow
    }


@router.get("/pending-actions")
def get_pending_actions(db: Session = Depends(get_db)):
    from app.models import NextVerifier
    
    pending = []
    
    pending_arrivals = db.query(Arrival).filter(
        Arrival.status.in_([
            DataStatus.PENDING_CONFIRM,
            DataStatus.MISSING_ARRIVAL,
            DataStatus.WRONG_VELOCITY,
            DataStatus.DUPLICATE_STATION
        ])
    ).all()
    
    for arr in pending_arrivals:
        verifier = arr.next_verifier
        if not verifier:
            if arr.status == DataStatus.MISSING_ARRIVAL:
                verifier = NextVerifier.DATA_COLLECTOR
            elif arr.status == DataStatus.WRONG_VELOCITY:
                verifier = NextVerifier.VELOCITY_EXPERT
            elif arr.status == DataStatus.DUPLICATE_STATION:
                verifier = NextVerifier.STATION_MANAGER
            else:
                verifier = NextVerifier.DATA_COLLECTOR
        
        pending.append({
            "arrival_id": arr.id,
            "event_tag": arr.event_tag,
            "station_code": arr.station.station_code if arr.station else "",
            "phase": arr.phase,
            "status": get_status_display(arr.status),
            "next_verifier": get_verifier_display(verifier),
            "action_required": _get_action_description(arr.status),
            "remark": arr.remark or ""
        })
    
    return {
        "total_pending": len(pending),
        "by_verifier": {
            "数据采集员": len([p for p in pending if p["next_verifier"] == "数据采集员"]),
            "波速专家": len([p for p in pending if p["next_verifier"] == "波速专家"]),
            "台站管理员": len([p for p in pending if p["next_verifier"] == "台站管理员"]),
            "教师": len([p for p in pending if p["next_verifier"] == "教师"]),
        },
        "items": pending
    }


def _get_action_description(status: DataStatus) -> str:
    actions = {
        DataStatus.PENDING_CONFIRM: "确认到时数据是否正确",
        DataStatus.MISSING_ARRIVAL: "补录缺失的到时数据",
        DataStatus.WRONG_VELOCITY: "核对并修正波速模型版本",
        DataStatus.DUPLICATE_STATION: "处理重复台站，去重或合并",
    }
    return actions.get(status, "待处理")


@router.get("/summary")
def get_audit_summary(db: Session = Depends(get_db)):
    total_arrivals = db.query(Arrival).count()
    normal_arrivals = db.query(Arrival).filter(Arrival.status == DataStatus.NORMAL).count()
    confirmed_arrivals = db.query(Arrival).filter(Arrival.status == DataStatus.CONFIRMED).count()
    rejected_arrivals = db.query(Arrival).filter(Arrival.status == DataStatus.REJECTED).count()
    pending_arrivals = total_arrivals - normal_arrivals - confirmed_arrivals - rejected_arrivals
    
    magnitude_updated = db.query(Arrival).filter(Arrival.has_magnitude_update == True).count()
    
    total_changes = db.query(AuditLog).count()
    status_changes = db.query(AuditLog).filter(AuditLog.field_name == "status").count()
    magnitude_changes = db.query(AuditLog).filter(AuditLog.field_name == "magnitude_remark").count()
    
    return {
        "arrivals_summary": {
            "total": total_arrivals,
            "normal": normal_arrivals,
            "confirmed": confirmed_arrivals,
            "rejected": rejected_arrivals,
            "pending": pending_arrivals,
            "magnitude_updated": magnitude_updated,
        },
        "audit_summary": {
            "total_changes": total_changes,
            "status_changes": status_changes,
            "magnitude_changes": magnitude_changes,
            "other_changes": total_changes - status_changes - magnitude_changes,
        },
        "data_quality": {
            "normal_rate": f"{(normal_arrivals + confirmed_arrivals) / max(total_arrivals, 1) * 100:.1f}%",
            "pending_rate": f"{pending_arrivals / max(total_arrivals, 1) * 100:.1f}%",
            "reject_rate": f"{rejected_arrivals / max(total_arrivals, 1) * 100:.1f}%",
        }
    }
