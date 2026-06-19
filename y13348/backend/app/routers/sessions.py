from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import ReviewSession, User, SessionStatus, SessionComment
from ..schemas import (
    ReviewSessionCreate, ReviewSessionUpdate,
    ReviewSessionResponse, ReviewSessionDetailResponse,
    RerunRequest, SessionCommentCreate
)
from ..auth import get_current_any_role, get_current_reviewer

router = APIRouter()


def _enrich_session_response(session: ReviewSession, db: Session) -> ReviewSessionResponse:
    creator = db.query(User).filter(User.id == session.created_by).first()
    assignee = db.query(User).filter(User.id == session.assigned_to).first() if session.assigned_to else None
    
    corrections_count = len([c for c in session.corrections if not c.is_overridden])
    
    response = ReviewSessionResponse.model_validate(session)
    response.creator_name = creator.full_name if creator else None
    response.assignee_name = assignee.full_name if assignee else None
    response.corrections_count = corrections_count
    response.comments_count = len(session.comments)
    response.leak_alerts_count = len(session.leak_alerts)
    return response


@router.get("", response_model=list[ReviewSessionResponse])
def list_sessions(
    status: Optional[SessionStatus] = Query(None, description="按状态过滤"),
    assigned_to: Optional[int] = Query(None, description="按分配人过滤"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(ReviewSession)
    
    if status:
        query = query.filter(ReviewSession.status == status)
    if assigned_to:
        query = query.filter(ReviewSession.assigned_to == assigned_to)
    
    sessions = query.order_by(ReviewSession.updated_at.desc()).all()
    return [_enrich_session_response(s, db) for s in sessions]


@router.post("", response_model=ReviewSessionResponse)
def create_session(
    session_data: ReviewSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = ReviewSession(
        **session_data.model_dump(),
        created_by=current_user.id,
        status=SessionStatus.PENDING
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _enrich_session_response(session, db)


@router.get("/{session_id}", response_model=ReviewSessionDetailResponse)
def get_session_detail(
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
    
    response = ReviewSessionDetailResponse.model_validate(session)
    creator = db.query(User).filter(User.id == session.created_by).first()
    assignee = db.query(User).filter(User.id == session.assigned_to).first() if session.assigned_to else None
    
    response.creator_name = creator.full_name if creator else None
    response.assignee_name = assignee.full_name if assignee else None
    
    for correction in response.corrections:
        operator = db.query(User).filter(User.id == correction.operator_id).first()
        correction.operator_name = operator.full_name if operator else None
    
    for comment in response.comments:
        author = db.query(User).filter(User.id == comment.author_id).first()
        comment.author_name = author.full_name if author else None
    
    response.corrections_count = len([c for c in session.corrections if not c.is_overridden])
    response.comments_count = len(session.comments)
    response.leak_alerts_count = len(session.leak_alerts)
    
    return response


@router.put("/{session_id}", response_model=ReviewSessionResponse)
def update_session(
    session_id: int,
    update_data: ReviewSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    
    session.updated_at = func.now()
    db.commit()
    db.refresh(session)
    return _enrich_session_response(session, db)


@router.post("/{session_id}/rerun")
def rerun_session(
    session_id: int,
    rerun_data: RerunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(ReviewSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    comment = SessionComment(
        session_id=session_id,
        author_id=current_user.id,
        content=f"重跑会话，原因：{rerun_data.reason}。{'保留' if rerun_data.preserve_corrections else '不保留'}历史人工修正。",
        comment_type="system",
        metadata={"action": "rerun", "preserve_corrections": rerun_data.preserve_corrections}
    )
    db.add(comment)
    
    if not rerun_data.preserve_corrections:
        for correction in session.corrections:
            correction.is_overridden = True
            correction.overridden_at = func.now()
    
    session.status = SessionStatus.PROCESSING
    session.updated_at = func.now()
    session.last_processed_at = func.now()
    
    db.commit()
    
    return {
        "message": "会话已开始重跑",
        "session_id": session_id,
        "preserve_corrections": rerun_data.preserve_corrections
    }


@router.post("/{session_id}/process")
def process_session(
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
    
    has_active_leak = any(
        alert.status in ["detected", "confirmed"] 
        for alert in session.leak_alerts
    )
    
    if has_active_leak:
        session.status = SessionStatus.WAITING_CONFIRM
        
        comment = SessionComment(
            session_id=session_id,
            author_id=current_user.id,
            content="检测到样本泄漏，已暂停处理。请先确认泄漏原因和影响范围。",
            comment_type="system",
            metadata={"action": "process_paused", "reason": "sample_leak"}
        )
        db.add(comment)
        db.commit()
        
        return {
            "message": "检测到样本泄漏，处理已暂停。请先确认泄漏原因。",
            "session_id": session_id,
            "status": SessionStatus.WAITING_CONFIRM,
            "leak_alerts_count": len([a for a in session.leak_alerts if a.status in ["detected", "confirmed"]])
        }
    
    session.status = SessionStatus.PROCESSING
    session.last_processed_at = func.now()
    session.updated_at = func.now()
    db.commit()
    
    return {
        "message": "会话开始处理",
        "session_id": session_id,
        "status": SessionStatus.PROCESSING
    }


@router.post("/{session_id}/complete")
def complete_session(
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
    
    has_active_leak = any(
        alert.status in ["detected", "confirmed"] 
        for alert in session.leak_alerts
    )
    
    if has_active_leak:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="存在未处理的样本泄漏警告，无法完成会话。请先处理泄漏问题。"
        )
    
    session.status = SessionStatus.COMPLETED
    session.updated_at = func.now()
    
    comment = SessionComment(
        session_id=session_id,
        author_id=current_user.id,
        content="会话处理完成",
        comment_type="system",
        metadata={"action": "complete"}
    )
    db.add(comment)
    db.commit()
    
    return {
        "message": "会话已完成",
        "session_id": session_id,
        "completed_at": datetime.utcnow().isoformat()
    }
