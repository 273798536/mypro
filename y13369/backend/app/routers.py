from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from . import schemas, models
from .database import get_db
from .import_service import process_import
from .analysis_service import compare_runs, get_dashboard_stats

router = APIRouter(prefix="/api", tags=["gatekeeper"])


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    return get_dashboard_stats(db)


@router.get("/runs", response_model=List[schemas.EvaluationRun])
def list_runs(model_version: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.EvaluationRun).order_by(models.EvaluationRun.created_at.desc())
    if model_version:
        q = q.filter(models.EvaluationRun.model_version == model_version)
    runs = q.all()
    result = []
    for r in runs:
        cnt = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.run_id == r.id).count()
        result.append(schemas.EvaluationRun(
            id=r.id,
            model_version=r.model_version,
            evaluator=r.evaluator,
            source_file=r.source_file,
            original_filename=r.original_filename,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            record_count=cnt,
        ))
    return result


@router.get("/runs/{run_id}", response_model=schemas.EvaluationRun)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.EvaluationRun).filter(models.EvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="评测批次不存在")
    cnt = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.run_id == run.id).count()
    return schemas.EvaluationRun(
        id=run.id,
        model_version=run.model_version,
        evaluator=run.evaluator,
        source_file=run.source_file,
        original_filename=run.original_filename,
        status=run.status,
        notes=run.notes,
        created_at=run.created_at,
        record_count=cnt,
    )


@router.post("/import", response_model=schemas.ImportResult)
def import_evaluation(
    model_version: str = Form(...),
    evaluator: str = Form(...),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    run_id, count, warnings, mapped = process_import(db, file, model_version, evaluator, notes)
    return schemas.ImportResult(
        run_id=run_id,
        record_count=count,
        warnings=warnings,
        auto_mapped_fields=mapped,
    )


@router.get("/runs/{run_id}/records", response_model=List[schemas.EvaluationRecord])
def list_records(
    run_id: int,
    anomaly_only: Optional[bool] = False,
    judged_only: Optional[bool] = False,
    query_keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.run_id == run_id)
    if anomaly_only:
        q = q.filter(models.EvaluationRecord.anomaly_flag != "")
    if query_keyword:
        like = f"%{query_keyword}%"
        q = q.filter((models.EvaluationRecord.query_text.like(like)) | (models.EvaluationRecord.query_id.like(like)))
    q = q.order_by(models.EvaluationRecord.original_row_index.asc()).offset(skip).limit(limit)
    return q.all()


@router.get("/records/{record_id}", response_model=schemas.EvaluationRecord)
def get_record(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="评测记录不存在")
    return rec


@router.get("/records/{record_id}/history", response_model=List[schemas.EvaluationRecord])
def get_record_history(record_id: int, db: Session = Depends(get_db)):
    rec = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="评测记录不存在")
    history = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.query_id == rec.query_id,
    ).order_by(models.EvaluationRecord.created_at.asc()).all()
    return history


@router.post("/judgments", response_model=schemas.ManualJudgment)
def create_judgment(data: schemas.ManualJudgmentCreate, db: Session = Depends(get_db)):
    rec = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.id == data.record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="评测记录不存在")
    j = models.ManualJudgment(**data.model_dump())
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


@router.get("/records/{record_id}/judgments", response_model=List[schemas.ManualJudgment])
def list_judgments(record_id: int, db: Session = Depends(get_db)):
    return db.query(models.ManualJudgment).filter(
        models.ManualJudgment.record_id == record_id,
    ).order_by(models.ManualJudgment.created_at.desc()).all()


@router.post("/anomalies", response_model=schemas.AnomalyRecord)
def create_anomaly(data: schemas.AnomalyRecordCreate, db: Session = Depends(get_db)):
    a = models.AnomalyRecord(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/anomalies/{anomaly_id}", response_model=schemas.AnomalyRecord)
def update_anomaly(anomaly_id: int, data: schemas.AnomalyRecordBase, db: Session = Depends(get_db)):
    a = db.query(models.AnomalyRecord).filter(models.AnomalyRecord.id == anomaly_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="异常记录不存在")
    for k, v in data.model_dump().items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.get("/anomalies", response_model=List[schemas.AnomalyRecord])
def list_anomalies(
    status: Optional[str] = None,
    run_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.AnomalyRecord)
    if status:
        q = q.filter(models.AnomalyRecord.status == status)
    if run_id:
        q = q.join(models.EvaluationRecord).filter(models.EvaluationRecord.run_id == run_id)
    return q.order_by(models.AnomalyRecord.created_at.desc()).all()


@router.get("/compare", response_model=schemas.ComparisonResult)
def compare_evaluations(run_a: int, run_b: int, db: Session = Depends(get_db)):
    try:
        return compare_runs(db, run_a, run_b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/field-mappings", response_model=List[schemas.FieldMapping])
def list_field_mappings(run_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.FieldMapping)
    if run_id:
        q = q.filter((models.FieldMapping.run_id == run_id) | (models.FieldMapping.is_global == True))
    else:
        q = q.filter(models.FieldMapping.is_global == True)
    return q.all()


@router.post("/field-mappings", response_model=schemas.FieldMapping)
def create_field_mapping(data: schemas.FieldMappingCreate, db: Session = Depends(get_db)):
    fm = models.FieldMapping(**data.model_dump())
    db.add(fm)
    db.commit()
    db.refresh(fm)
    return fm


@router.post("/runs/{run_id}/export")
def export_run(run_id: int, db: Session = Depends(get_db)):
    import json
    from fastapi.responses import JSONResponse

    run = db.query(models.EvaluationRun).filter(models.EvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="评测批次不存在")
    records = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.run_id == run_id).all()
    judgments = db.query(models.ManualJudgment).join(models.EvaluationRecord).filter(
        models.EvaluationRecord.run_id == run_id,
    ).all()
    anomalies = db.query(models.AnomalyRecord).join(models.EvaluationRecord).filter(
        models.EvaluationRecord.run_id == run_id,
    ).all()

    export_data = {
        "run": {
            "id": run.id,
            "model_version": run.model_version,
            "evaluator": run.evaluator,
            "original_filename": run.original_filename,
            "notes": run.notes,
            "created_at": run.created_at.isoformat(),
        },
        "records": [
            {
                "id": r.id,
                "query_id": r.query_id,
                "query_text": r.query_text,
                "metrics": r.metrics,
                "anomaly_flag": r.anomaly_flag,
                "anomaly_desc": r.anomaly_desc,
                "original_fields": r.original_fields,
                "judgments": [
                    {
                        "id": j.id,
                        "judge_type": j.judge_type,
                        "before_value": j.before_value,
                        "after_value": j.after_value,
                        "reason": j.reason,
                        "judge_name": j.judge_name,
                        "created_at": j.created_at.isoformat(),
                    }
                    for j in r.judgments
                ],
                "anomalies": [
                    {
                        "id": a.id,
                        "anomaly_type": a.anomaly_type,
                        "original_description": a.original_description,
                        "status": a.status,
                        "handler": a.handler,
                        "notes": a.notes,
                        "created_at": a.created_at.isoformat(),
                    }
                    for a in r.anomalies
                ],
            }
            for r in records
        ],
    }
    return JSONResponse(content=export_data)
