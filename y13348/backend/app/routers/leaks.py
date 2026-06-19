from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from ..database import get_db
from ..models import SampleLeakAlert, ReviewSession, User, LeakStatus, SessionComment
from ..schemas import (
    SampleLeakAlertBase, SampleLeakAlertResponse,
    LeakConfirmRequest, LeakResolveRequest
)
from ..auth import get_current_reviewer, get_current_any_role

router = APIRouter()


@router.get("", response_model=list[SampleLeakAlertResponse])
def list_leak_alerts(
    session_id: int = None,
    status: LeakStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(SampleLeakAlert)
    
    if session_id:
        query = query.filter(SampleLeakAlert.session_id == session_id)
    if status:
        query = query.filter(SampleLeakAlert.status == status)
    
    alerts = query.order_by(SampleLeakAlert.detected_at.desc()).all()
    return [SampleLeakAlertResponse.model_validate(a) for a in alerts]


@router.post("", response_model=SampleLeakAlertResponse)
def create_leak_alert(
    alert_data: SampleLeakAlertBase,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    alert = SampleLeakAlert(
        **alert_data.model_dump(),
        session_id=session_id,
        status=LeakStatus.DETECTED
    )
    db.add(alert)
    
    session.has_sample_leak = True
    session.status = "waiting_confirm"
    session.updated_at = func.now()
    
    comment = SessionComment(
        session_id=session_id,
        author_id=current_user.id,
        content=f"检测到样本泄漏：{alert_data.suspected_cause or '待确认原因'}。影响样本数：{alert_data.affected_count}。已暂停处理，请先确认原因和影响范围。",
        comment_type="alert",
        metadata={"action": "leak_detected", "alert_id": None}
    )
    db.add(comment)
    
    db.commit()
    db.refresh(alert)
    
    comment.metadata["alert_id"] = alert.id
    db.commit()
    
    return SampleLeakAlertResponse.model_validate(alert)


@router.get("/{alert_id}", response_model=SampleLeakAlertResponse)
def get_leak_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    alert = db.query(SampleLeakAlert).filter(SampleLeakAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="泄漏警告不存在"
        )
    return SampleLeakAlertResponse.model_validate(alert)


@router.post("/{alert_id}/confirm", response_model=SampleLeakAlertResponse)
def confirm_leak(
    alert_id: int,
    confirm_data: LeakConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    alert = db.query(SampleLeakAlert).filter(SampleLeakAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="泄漏警告不存在"
        )
    
    if alert.status in [LeakStatus.RESOLVED, LeakStatus.DISMISSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该警告已处理完成，无法重复确认"
        )
    
    alert.status = confirm_data.status
    alert.confirmed_cause = confirm_data.confirmed_cause
    alert.confirmed_by = current_user.id
    alert.confirmed_at = func.now()
    
    comment = SessionComment(
        session_id=alert.session_id,
        author_id=current_user.id,
        content=f"样本泄漏已确认：{confirm_data.confirmed_cause}。请评估影响范围后进行处理。",
        comment_type="note",
        metadata={"action": "leak_confirmed", "alert_id": alert_id}
    )
    db.add(comment)
    
    db.commit()
    db.refresh(alert)
    
    return SampleLeakAlertResponse.model_validate(alert)


@router.post("/{alert_id}/resolve", response_model=SampleLeakAlertResponse)
def resolve_leak(
    alert_id: int,
    resolve_data: LeakResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    alert = db.query(SampleLeakAlert).filter(SampleLeakAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="泄漏警告不存在"
        )
    
    if alert.status == LeakStatus.DETECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先确认泄漏原因，再进行解决处理"
        )
    
    if alert.status in [LeakStatus.RESOLVED, LeakStatus.DISMISSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该警告已处理完成"
        )
    
    alert.status = resolve_data.status
    alert.resolution_notes = resolve_data.resolution_notes
    alert.resolved_by = current_user.id
    alert.resolved_at = func.now()
    
    session = db.query(ReviewSession).filter(ReviewSession.id == alert.session_id).first()
    if session:
        remaining_alerts = db.query(SampleLeakAlert).filter(
            SampleLeakAlert.session_id == alert.session_id,
            SampleLeakAlert.status.in_([LeakStatus.DETECTED, LeakStatus.CONFIRMED])
        ).count()
        
        if remaining_alerts == 0:
            session.has_sample_leak = False
        
        session.updated_at = func.now()
    
    comment = SessionComment(
        session_id=alert.session_id,
        author_id=current_user.id,
        content=f"样本泄漏已处理：{resolve_data.resolution_notes}",
        comment_type="system",
        metadata={"action": "leak_resolved", "alert_id": alert_id}
    )
    db.add(comment)
    
    db.commit()
    db.refresh(alert)
    
    return SampleLeakAlertResponse.model_validate(alert)


@router.post("/{alert_id}/dismiss")
def dismiss_leak(
    alert_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    alert = db.query(SampleLeakAlert).filter(SampleLeakAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="泄漏警告不存在"
        )
    
    if alert.status in [LeakStatus.RESOLVED, LeakStatus.DISMISSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该警告已处理完成"
        )
    
    alert.status = LeakStatus.DISMISSED
    alert.resolution_notes = f"误报警告，原因：{reason}"
    alert.resolved_by = current_user.id
    alert.resolved_at = func.now()
    
    session = db.query(ReviewSession).filter(ReviewSession.id == alert.session_id).first()
    if session:
        remaining_alerts = db.query(SampleLeakAlert).filter(
            SampleLeakAlert.session_id == alert.session_id,
            SampleLeakAlert.status.in_([LeakStatus.DETECTED, LeakStatus.CONFIRMED])
        ).count()
        
        if remaining_alerts == 0:
            session.has_sample_leak = False
        
        session.updated_at = func.now()
    
    comment = SessionComment(
        session_id=alert.session_id,
        author_id=current_user.id,
        content=f"样本泄漏警告已驳回：{reason}",
        comment_type="system",
        metadata={"action": "leak_dismissed", "alert_id": alert_id}
    )
    db.add(comment)
    
    db.commit()
    
    return {
        "message": "泄漏警告已驳回",
        "alert_id": alert_id,
        "reason": reason
    }


@router.get("/session/{session_id}/impact-analysis")
def get_impact_analysis(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    active_alerts = db.query(SampleLeakAlert).filter(
        SampleLeakAlert.session_id == session_id,
        SampleLeakAlert.status.in_([LeakStatus.DETECTED, LeakStatus.CONFIRMED])
    ).all()
    
    total_affected = sum(alert.affected_count for alert in active_alerts)
    
    affected_items = []
    for alert in active_alerts:
        if alert.affected_items:
            affected_items.extend(alert.affected_items)
    
    return {
        "session_id": session_id,
        "session_name": session.session_name,
        "active_alerts_count": len(active_alerts),
        "total_affected_items": total_affected,
        "unique_affected_items": len(affected_items),
        "alerts": [
            {
                "id": alert.id,
                "leak_type": alert.leak_type,
                "status": alert.status,
                "suspected_cause": alert.suspected_cause,
                "confirmed_cause": alert.confirmed_cause,
                "affected_count": alert.affected_count,
                "impact_scope": alert.impact_scope,
                "detected_at": alert.detected_at
            }
            for alert in active_alerts
        ],
        "recommendation": "请先确认所有泄漏原因和影响范围，处理完毕后再继续会话处理。"
    }
