from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/api/review", tags=["复核流程"])


@router.post("/sessions", response_model=schemas.ReviewSession)
def create_session(session_data: schemas.ReviewSessionCreate, db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, session_data.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="关联批次不存在")
    return crud.create_review_session(db, session_data)


@router.get("/sessions", response_model=List[schemas.ReviewSession])
def list_sessions(batch_id: Optional[int] = None,
                  skip: int = 0, limit: int = 100,
                  db: Session = Depends(get_db)):
    return crud.list_review_sessions(db, batch_id=batch_id, skip=skip, limit=limit)


@router.get("/sessions/{session_id}", response_model=schemas.ReviewSession)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = crud.get_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    return session


@router.post("/sessions/{session_id}/start", response_model=schemas.ReviewSession)
def start_session(session_id: int, db: Session = Depends(get_db)):
    session = crud.start_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    return session


@router.post("/sessions/{session_id}/complete", response_model=schemas.ReviewSession)
def complete_session(session_id: int, db: Session = Depends(get_db)):
    session = crud.complete_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    return session


@router.get("/sessions/{session_id}/items", response_model=List[schemas.QuestionRecord])
def get_session_items(session_id: int, db: Session = Depends(get_db)):
    session = crud.get_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    return crud.get_review_items(db, session_id)


@router.post("/results", response_model=schemas.ReviewResult)
def create_review_result(result_data: schemas.ReviewResultCreate, db: Session = Depends(get_db)):
    session = crud.get_review_session(db, result_data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    record = crud.get_question_record(db, result_data.record_id)
    if not record:
        raise HTTPException(status_code=404, detail="题目记录不存在")
    if record.batch_id != session.batch_id:
        raise HTTPException(status_code=400, detail="记录不属于该复核会话的批次")

    valid_statuses = ["pending", "reviewing", "passed", "rejected"]
    if result_data.after_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态: {result_data.after_status}")

    return crud.create_review_result(db, result_data)


@router.get("/sessions/{session_id}/results", response_model=List[schemas.ReviewResult])
def get_session_results(session_id: int, skip: int = 0, limit: int = 500,
                        db: Session = Depends(get_db)):
    session = crud.get_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")
    return crud.list_review_results(db, session_id=session_id, skip=skip, limit=limit)


@router.post("/sessions/{session_id}/batch-review")
def batch_review_records(session_id: int,
                         decisions: List[schemas.ReviewResultCreate],
                         db: Session = Depends(get_db)):
    session = crud.get_review_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="复核会话不存在")

    results = []
    for decision in decisions:
        decision.session_id = session_id
        record = crud.get_question_record(db, decision.record_id)
        if record and record.batch_id == session.batch_id:
            result = crud.create_review_result(db, decision)
            results.append({
                "record_id": decision.record_id,
                "status": "success",
                "new_status": decision.after_status
            })
        else:
            results.append({
                "record_id": decision.record_id,
                "status": "failed",
                "reason": "记录不存在或不属于此批次"
            })

    return {
        "session_id": session_id,
        "total": len(decisions),
        "success": sum(1 for r in results if r["status"] == "success"),
        "failed": sum(1 for r in results if r["status"] == "failed"),
        "detail": results
    }
