from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import QuestionBank, Question, AuditLog, ActionType
from app.schemas import QuestionBankCreate, QuestionBankOut, QuestionOut, ImportResult, SplitUpdateItem, QuestionItem
from app.services.import_service import (
    import_questions_from_json,
    import_questions_from_csv,
    update_splits_and_dedup,
)

router = APIRouter(prefix="/api/banks", tags=["题库管理"])


@router.post("", response_model=QuestionBankOut)
def create_bank(data: QuestionBankCreate, db: Session = Depends(get_db)):
    bank = QuestionBank(name=data.name, description=data.description, source=data.source)
    db.add(bank)
    db.commit()
    db.refresh(bank)

    log = AuditLog(bank_id=bank.id, action=ActionType.CREATE, actor="system", detail=f"创建题库「{bank.name}」")
    db.add(log)
    db.commit()
    return bank


@router.get("", response_model=List[QuestionBankOut])
def list_banks(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(QuestionBank).offset(skip).limit(limit).all()


@router.get("/{bank_id}", response_model=QuestionBankOut)
def get_bank(bank_id: int, db: Session = Depends(get_db)):
    bank = db.query(QuestionBank).filter(QuestionBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="题库不存在")
    return bank


@router.get("/{bank_id}/questions", response_model=List[QuestionOut])
def list_questions(bank_id: int, skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.bank_id == bank_id).offset(skip).limit(limit).all()


@router.post("/{bank_id}/import/json", response_model=ImportResult)
def import_json(bank_id: int, payload: List[QuestionItem], db: Session = Depends(get_db)):
    import json as json_lib
    try:
        data = [item.model_dump() for item in payload]
        return import_questions_from_json(db, bank_id, json_lib.dumps(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{bank_id}/import/csv", response_model=ImportResult)
def import_csv(bank_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = file.file.read().decode("utf-8")
        return import_questions_from_csv(db, bank_id, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV解析失败: {str(e)}")


@router.post("/{bank_id}/splits", response_model=dict)
def update_splits(bank_id: int, updates: List[SplitUpdateItem], db: Session = Depends(get_db)):
    try:
        updated = update_splits_and_dedup(db, bank_id, updates)
        return {"updated": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bank_id}/audit", response_model=list)
def get_bank_audit(bank_id: int, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).filter(AuditLog.bank_id == bank_id).order_by(AuditLog.created_at).all()
    return [
        {
            "id": l.id,
            "action": l.action.value,
            "actor": l.actor,
            "detail": l.detail,
            "snapshot": l.snapshot,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
