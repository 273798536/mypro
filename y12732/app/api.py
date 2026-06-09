from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from .database import engine, Base, get_db
from . import models, schemas, crud, reporting

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="导数符号变化表投研工具",
    description="支持导数符号变化表的导入、复核、状态推进、报告导出与追溯查询",
    version="1.0.0"
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.post("/api/batches", response_model=schemas.BatchOut)
def create_batch(batch_in: schemas.BatchCreate, db: Session = Depends(get_db)):
    return crud.create_batch(db, batch_in)


@app.get("/api/batches", response_model=List[schemas.BatchOut])
def list_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_batches(db, skip=skip, limit=limit)


@app.get("/api/batches/{batch_id}", response_model=schemas.BatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@app.get("/api/batches/no/{batch_no}", response_model=schemas.BatchOut)
def get_batch_by_no(batch_no: str, db: Session = Depends(get_db)):
    db_batch = crud.get_batch_by_no(db, batch_no)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@app.put("/api/batches/{batch_id}/status", response_model=schemas.BatchOut)
def update_batch_status(
    batch_id: int,
    status_update: schemas.BatchStatusUpdate,
    db: Session = Depends(get_db)
):
    db_batch = crud.update_batch_status(db, batch_id, status_update)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@app.get("/api/batches/{batch_id}/transitions", response_model=List[schemas.StatusTransitionOut])
def get_batch_transitions(batch_id: int, db: Session = Depends(get_db)):
    return crud.get_status_transitions(db, batch_id)


@app.post("/api/batches/{batch_id}/import", response_model=schemas.ImportResult)
def import_records(
    batch_id: int,
    records: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    try:
        return crud.import_records(db, batch_id, records)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/records", response_model=List[schemas.DerivativeRecordOut])
def list_records(
    batch_id: Optional[int] = Query(None),
    only_anomaly: bool = Query(False),
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.list_records(
        db, batch_id=batch_id, only_anomaly=only_anomaly,
        status=status, skip=skip, limit=limit
    )


@app.get("/api/records/{record_id}", response_model=schemas.DerivativeRecordDetail)
def get_record(record_id: int, db: Session = Depends(get_db)):
    db_record = crud.get_record(db, record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db_record


@app.get("/api/records/{record_id}/trace", response_model=schemas.TraceResult)
def trace_record(record_id: int, db: Session = Depends(get_db)):
    result = crud.trace_record(db, record_id)
    if not result:
        raise HTTPException(status_code=404, detail="记录不存在或无法追溯")
    return result


@app.get("/api/records/{record_id}/logs", response_model=List[schemas.ReviewLogOut])
def get_record_logs(record_id: int, db: Session = Depends(get_db)):
    return crud.get_review_logs(db, record_id)


@app.post("/api/records/{record_id}/review", response_model=schemas.DerivativeRecordOut)
def review_record(
    record_id: int,
    review: schemas.RecordReview,
    db: Session = Depends(get_db)
):
    db_record = crud.review_record(db, record_id, review)
    if not db_record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db_record


@app.put("/api/records/{record_id}/fix", response_model=schemas.DerivativeRecordOut)
def fix_record(
    record_id: int,
    fix: schemas.RecordFix,
    db: Session = Depends(get_db)
):
    db_record = crud.fix_record(db, record_id, fix)
    if not db_record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db_record


@app.post("/api/reports", response_model=schemas.ReportSnapshotOut)
def create_report(
    batch_id: int = Query(..., description="批次ID"),
    created_by: str = Query("system", description="创建人"),
    title: Optional[str] = Query(None, description="报告标题"),
    db: Session = Depends(get_db)
):
    snapshot = reporting.create_report_snapshot(db, batch_id, created_by=created_by, title=title)
    if not snapshot:
        raise HTTPException(status_code=404, detail="批次不存在")
    return snapshot


@app.get("/api/reports", response_model=List[schemas.ReportSnapshotOut])
def list_reports(
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return reporting.list_report_snapshots(db, batch_id=batch_id)


@app.get("/api/reports/{snapshot_id}", response_model=schemas.ReportSnapshotOut)
def get_report(snapshot_id: int, db: Session = Depends(get_db)):
    snapshot = reporting.get_report_snapshot(db, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="报告不存在")
    return snapshot


@app.get("/api/reports/{snapshot_id}/export", response_class=PlainTextResponse)
def export_report(snapshot_id: int, db: Session = Depends(get_db)):
    text = reporting.export_report_text(db, snapshot_id)
    if not text:
        raise HTTPException(status_code=404, detail="报告不存在")
    return PlainTextResponse(
        content=text,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=derivative_report_{snapshot_id}.txt"}
    )


@app.get("/api/batches/{batch_id}/chart-data")
def get_chart_data(
    batch_id: int,
    use_snapshot: bool = Query(True, description="是否复用报告快照数据"),
    db: Session = Depends(get_db)
):
    data = reporting.export_chart_data(db, batch_id, use_snapshot=use_snapshot)
    if not data:
        raise HTTPException(status_code=404, detail="批次无数据")
    return data


@app.get("/api/compare")
def compare_history(
    batch_ids: Optional[str] = Query(None, description="批次ID，逗号分隔，如 1,2,3"),
    limit: int = Query(5, description="默认对比最近几批"),
    db: Session = Depends(get_db)
):
    parsed_batch_ids = None
    if batch_ids:
        try:
            parsed_batch_ids = [int(x.strip()) for x in batch_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="batch_ids 格式错误，请用逗号分隔整数")
    return reporting.compare_batches_with_report(db, batch_ids=parsed_batch_ids, limit=limit)


@app.post("/api/demo/seed", response_model=Dict[str, Any])
def seed_demo_data(db: Session = Depends(get_db)):
    from .demo_data import seed_all
    result = seed_all(db)
    return result
