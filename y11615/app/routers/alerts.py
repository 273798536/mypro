from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.models import Alert, AlertType
from app.schemas.schemas import Alert as AlertSchema

router = APIRouter()


@router.get("/", response_model=List[AlertSchema], summary="获取预警列表")
def get_alerts(
    alert_type: Optional[AlertType] = Query(None, description="预警类型"),
    customer_id: Optional[int] = None,
    resolved: Optional[bool] = Query(False, description="是否已解决"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if customer_id:
        query = query.filter(Alert.customer_id == customer_id)
    if resolved is not None:
        query = query.filter(Alert.is_resolved == resolved)
    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return alerts


@router.get("/{alert_id}", response_model=AlertSchema, summary="获取预警详情")
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="预警不存在")
    return alert


@router.post("/{alert_id}/resolve", summary="标记预警为已解决")
def resolve_alert(
    alert_id: int,
    resolution_notes: str = Query("", description="处理备注"),
    resolved_by: str = Query("system", description="处理人"),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="预警不存在")
    alert.is_resolved = True
    alert.resolved_by = resolved_by
    alert.resolved_at = datetime.now()
    alert.resolution_notes = resolution_notes
    db.commit()
    return {"success": True, "message": "预警已标记为已解决"}


@router.post("/check-promises", summary="检查承诺付款日期")
def check_promise_dates(db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    alerts_created = service.check_promise_dates()
    return {"alerts_created": alerts_created}


@router.get("/summary", summary="预警汇总统计")
def get_alerts_summary(db: Session = Depends(get_db)):
    total_unresolved = db.query(Alert).filter(Alert.is_resolved == False).count()
    by_type = db.query(
        Alert.alert_type,
        Alert.is_resolved
    ).all()

    type_counts = {}
    for atype, resolved in by_type:
        key = atype.value
        if key not in type_counts:
            type_counts[key] = {"total": 0, "unresolved": 0}
        type_counts[key]["total"] += 1
        if not resolved:
            type_counts[key]["unresolved"] += 1

    return {
        "total_unresolved": total_unresolved,
        "by_type": type_counts
    }
