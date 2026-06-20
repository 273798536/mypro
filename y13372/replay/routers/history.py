from __future__ import annotations
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from replay.database import get_db
from replay.models import ReplaySession, ReplayHistory
from replay.schemas import ReplaySessionCreate, ReplaySessionOut, ReplayHistoryOut
from replay.engine import add_history, rerun_session, finish_session

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=ReplaySessionOut)
def create_session(payload: ReplaySessionCreate, db: Session = Depends(get_db)):
    session = ReplaySession(
        session_name=payload.session_name,
        status="running",
        config=payload.config,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    add_history(
        db,
        session_id=session.id,
        event_type="session_created",
        event_detail={"session_name": payload.session_name},
    )

    return session


@router.get("/", response_model=List[ReplaySessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(ReplaySession).order_by(ReplaySession.started_at.desc()).all()


@router.get("/{session_id}", response_model=ReplaySessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    return db.query(ReplaySession).filter(ReplaySession.id == session_id).first()


@router.post("/{session_id}/rerun", response_model=ReplaySessionOut)
def rerun(session_id: int, db: Session = Depends(get_db)):
    session = rerun_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/finish", response_model=ReplaySessionOut)
def finish(session_id: int, db: Session = Depends(get_db)):
    session = finish_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/{session_id}/history", response_model=List[ReplayHistoryOut])
def get_session_history(session_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ReplayHistory)
        .filter(ReplayHistory.session_id == session_id)
        .order_by(ReplayHistory.created_at)
        .all()
    )
