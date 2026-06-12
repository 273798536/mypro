from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import warnings

warnings.filterwarnings("ignore")

from .database import get_db, engine, Base
from . import models, schemas
from .services import (
    create_batch_with_records, update_judgment, get_batch_status,
    get_record_changes, get_batch_changes
)
from .advanced_services import (
    create_student_note, apply_student_note, get_note_impacts,
    check_recalc_consistency, submit_evidence, get_records_needing_evidence,
    export_batch_csv
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="最短路径批量验算系统",
    description="社区公示版：支持单位换算偏差说明、改判来源追溯、学生错题备注影响分析、外推越界检测、复算一致性校验、证据状态追踪、CSV明细导出",
    version="1.0.0"
)


@app.post("/api/batch/verify", response_model=schemas.BatchVerifyResponse, tags=["批量验算"])
def batch_verify(request: schemas.BatchCreateRequest, db: Session = Depends(get_db)):
    try:
        result = create_batch_with_records(db, request)
        return schemas.BatchVerifyResponse(
            batch_id=result["batch"].id,
            total_records=len(result["records"]),
            records=[schemas.PathRecordResponse.model_validate(r) for r in result["records"]],
            warnings=[schemas.ExtrapolationWarningResponse.model_validate(w) for w in result["warnings"] if hasattr(w, 'id')],
            unit_conversions=result["unit_conversions"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batch/{batch_id}/status", response_model=schemas.BatchStatusResponse, tags=["批量验算"])
def get_status(batch_id: int, db: Session = Depends(get_db)):
    try:
        status = get_batch_status(db, batch_id)
        return schemas.BatchStatusResponse(**status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/batch/{batch_id}/records", response_model=List[schemas.PathRecordResponse], tags=["批量验算"])
def list_batch_records(batch_id: int, db: Session = Depends(get_db)):
    records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()
    return [schemas.PathRecordResponse.model_validate(r) for r in records]


@app.get("/api/record/{record_id}", response_model=schemas.PathRecordResponse, tags=["记录管理"])
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.PathRecord).filter(models.PathRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return schemas.PathRecordResponse.model_validate(record)


@app.put("/api/record/judgment", response_model=schemas.PathRecordResponse, tags=["记录管理"])
def change_judgment(request: schemas.ChangeJudgmentRequest, db: Session = Depends(get_db)):
    try:
        record = update_judgment(db, request)
        return schemas.PathRecordResponse.model_validate(record)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/record/{record_id}/changes", response_model=List[schemas.ChangeHistoryResponse], tags=["变更追溯"])
def list_record_changes(record_id: int, db: Session = Depends(get_db)):
    changes = get_record_changes(db, record_id)
    return [schemas.ChangeHistoryResponse.model_validate(c) for c in changes]


@app.get("/api/batch/{batch_id}/changes", response_model=List[schemas.ChangeHistoryResponse], tags=["变更追溯"])
def list_all_changes(batch_id: int, db: Session = Depends(get_db)):
    changes = get_batch_changes(db, batch_id)
    return [schemas.ChangeHistoryResponse.model_validate(c) for c in changes]


@app.post("/api/note", response_model=schemas.StudentNoteResponse, tags=["学生错题备注"])
def add_note(request: schemas.StudentNoteCreate, db: Session = Depends(get_db)):
    try:
        note = create_student_note(db, request)
        return schemas.StudentNoteResponse.model_validate(note)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batch/{batch_id}/notes", response_model=List[schemas.StudentNoteResponse], tags=["学生错题备注"])
def list_notes(batch_id: int, db: Session = Depends(get_db)):
    notes = db.query(models.StudentNote).filter(models.StudentNote.batch_id == batch_id).all()
    return [schemas.StudentNoteResponse.model_validate(n) for n in notes]


@app.post("/api/note/apply", tags=["学生错题备注"])
def apply_note(request: schemas.NoteApplyRequest,
               applied_by: str = Query(..., description="操作人"),
               db: Session = Depends(get_db)):
    try:
        result = apply_student_note(db, request, applied_by)
        return {
            "note_id": result["note"].id,
            "note_code": result["note"].note_code,
            "impacted_records_count": result["impacted_records_count"],
            "impacts": [schemas.NoteImpactResponse.model_validate(imp) for imp in result["impacts"]]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/note/{note_id}/impacts", response_model=List[schemas.NoteImpactResponse], tags=["学生错题备注"])
def list_note_impacts(note_id: int, db: Session = Depends(get_db)):
    impacts = get_note_impacts(db, note_id)
    return [schemas.NoteImpactResponse.model_validate(i) for i in impacts]


@app.get("/api/record/{record_id}/warnings", response_model=List[schemas.ExtrapolationWarningResponse], tags=["越界检测"])
def list_record_warnings(record_id: int, db: Session = Depends(get_db)):
    warnings = db.query(models.ExtrapolationWarning).filter(models.ExtrapolationWarning.record_id == record_id).all()
    return [schemas.ExtrapolationWarningResponse.model_validate(w) for w in warnings]


@app.post("/api/recalc/consistency", response_model=List[schemas.ConsistencyCheckResponse], tags=["复算一致性"])
def recalc_consistency(batch_id: int = Query(...), db: Session = Depends(get_db)):
    try:
        results = check_recalc_consistency(db, batch_id)
        return [schemas.ConsistencyCheckResponse(**r) for r in results]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/evidence", response_model=schemas.EvidenceItemResponse, tags=["证据管理"])
def add_evidence(request: schemas.EvidenceSubmitRequest, db: Session = Depends(get_db)):
    try:
        evidence = submit_evidence(db, request)
        return schemas.EvidenceItemResponse.model_validate(evidence)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/batch/{batch_id}/evidence-needed", response_model=List[schemas.PathRecordResponse], tags=["证据管理"])
def list_evidence_needed(batch_id: int, db: Session = Depends(get_db)):
    records = get_records_needing_evidence(db, batch_id)
    return [schemas.PathRecordResponse.model_validate(r) for r in records]


@app.get("/api/batch/{batch_id}/export", tags=["CSV导出"])
def export_csv(batch_id: int, db: Session = Depends(get_db)):
    try:
        csv_content = export_batch_csv(db, batch_id)
        buffer = io.BytesIO(csv_content.encode("utf-8-sig"))
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=path_verify_batch_{batch_id}.csv"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
