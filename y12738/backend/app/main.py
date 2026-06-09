from __future__ import annotations

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import io

from .database import engine, get_db, Base
from . import models, schemas, services

Base.metadata.create_all(bind=engine)

app = FastAPI(title="矩阵特征值可视化系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/batches/import", response_model=schemas.ImportResult)
async def import_batch(
    file: UploadFile = File(...),
    source: str = Query("error_analysis", description="导入来源：error_analysis 或 constraint_check"),
    operator: str = Query("排课老师", description="操作人"),
    db: Session = Depends(get_db),
):
    if source not in ("error_analysis", "constraint_check"):
        raise HTTPException(status_code=400, detail="source 必须为 error_analysis 或 constraint_check")
    content = await file.read()
    result = services.import_records_from_file(db, content, file.filename, source, operator)
    return result


@app.get("/api/batches", response_model=List[schemas.ImportBatchOut])
def list_batches(
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(models.ImportBatch)
    if source:
        q = q.filter(models.ImportBatch.source == source)
    return q.order_by(models.ImportBatch.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/batches/{batch_id}", response_model=schemas.ImportBatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(models.ImportBatch).filter(models.ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@app.get("/api/batches/{batch_id}/records", response_model=schemas.PagedResponse)
def list_batch_records(
    batch_id: int,
    page: int = 1,
    page_size: int = 50,
    status: Optional[str] = None,
    error_level: Optional[str] = None,
    has_issue: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.QuestionRecord).filter(models.QuestionRecord.batch_id == batch_id)
    if status:
        q = q.filter(models.QuestionRecord.status == status)
    if error_level:
        q = q.filter(models.QuestionRecord.error_level == error_level)
    if has_issue:
        q = q.filter(
            (models.QuestionRecord.has_empty == True) |
            (models.QuestionRecord.has_duplicate == True) |
            (models.QuestionRecord.remark_mixed == True) |
            (models.QuestionRecord.error_level != "normal")
        )
    total = q.count()
    items = q.order_by(models.QuestionRecord.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return schemas.PagedResponse(total=total, page=page, page_size=page_size, items=items)


@app.get("/api/batches/{batch_id}/chart", response_model=schemas.ChartDataResponse)
def get_batch_chart(batch_id: int, db: Session = Depends(get_db)):
    data = services.get_batch_chart_data(db, batch_id)
    if not data:
        raise HTTPException(status_code=404, detail="批次不存在")
    return data


@app.get("/api/batches/{batch_id}/issues", response_model=List[schemas.QualityIssueOut])
def list_batch_issues(batch_id: int, resolved: Optional[bool] = None, db: Session = Depends(get_db)):
    q = db.query(models.QualityIssue).filter(models.QualityIssue.batch_id == batch_id)
    if resolved is not None:
        q = q.filter(models.QualityIssue.resolved == resolved)
    return q.order_by(models.QualityIssue.severity.desc(), models.QualityIssue.id.asc()).all()


@app.get("/api/batches/{batch_id}/export")
def export_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(models.ImportBatch).filter(models.ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    data = services.export_batch_data(db, batch_id)
    filename = f"eigenvalue_{batch.batch_no}.xlsx"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/records/{record_id}", response_model=schemas.QuestionRecordOut)
def get_record(record_id: int, db: Session = Depends(get_db)):
    r = db.query(models.QuestionRecord).filter(models.QuestionRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    return r


@app.put("/api/records/{record_id}", response_model=schemas.QuestionRecordOut)
def update_record(record_id: int, data: schemas.QuestionRecordUpdate, db: Session = Depends(get_db)):
    updated = services.update_record(db, record_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="记录不存在")
    return updated


@app.get("/api/records/{record_id}/audit", response_model=List[schemas.AuditLogOut])
def get_audit_logs(record_id: int, db: Session = Depends(get_db)):
    return services.get_record_audit_logs(db, record_id)


@app.post("/api/issues/{issue_id}/resolve")
def resolve_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(models.QualityIssue).filter(models.QualityIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="问题不存在")
    issue.resolved = True
    db.commit()
    db.refresh(issue)
    return {"ok": True, "issue_id": issue.id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
