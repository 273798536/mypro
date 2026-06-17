import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from . import models, schemas, crud
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="信贷评分人工改判系统", description="AI产品阿宁 - 信贷评分人工改判管理后台")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.get("/api/samples", response_model=schemas.SampleListResponse, summary="样本列表（带筛选）")
def list_samples(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    has_label_conflict: Optional[bool] = None,
    has_name_mismatch: Optional[bool] = None,
    has_material_mismatch: Optional[bool] = None,
    keyword: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    db: Session = Depends(get_db),
):
    total, items = crud.get_samples(
        db, skip=skip, limit=limit, status=status,
        has_label_conflict=has_label_conflict,
        has_name_mismatch=has_name_mismatch,
        has_material_mismatch=has_material_mismatch,
        keyword=keyword, min_score=min_score, max_score=max_score,
    )
    return {"total": total, "items": items}


@app.get("/api/samples/{sample_id}", response_model=schemas.SampleDetail, summary="样本详情")
def get_sample_detail(sample_id: int, db: Session = Depends(get_db)):
    sample = crud.get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样本不存在")
    return sample


@app.post("/api/samples", response_model=schemas.SampleDetail, summary="创建样本")
def create_sample(sample: schemas.SampleCreate, db: Session = Depends(get_db)):
    existing = crud.get_sample_by_no(db, sample.sample_no)
    if existing:
        raise HTTPException(status_code=400, detail="样本编号已存在")
    return crud.create_sample(db, sample)


@app.post("/api/samples/{sample_id}/adjustments", response_model=schemas.ManualAdjustment, summary="提交人工改判")
def create_adjustment(
    sample_id: int,
    adjustment: schemas.ManualAdjustmentCreate,
    db: Session = Depends(get_db),
):
    sample = crud.get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样本不存在")
    result = crud.create_manual_adjustment(db, sample_id, adjustment)
    return result


@app.get("/api/samples/{sample_id}/adjustments", response_model=List[schemas.ManualAdjustment], summary="改判历史溯源")
def get_adjustment_history(sample_id: int, db: Session = Depends(get_db)):
    sample = crud.get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样本不存在")
    return crud.get_adjustment_history(db, sample_id)


@app.get("/api/review/stats", response_model=schemas.ReviewStats, summary="评审统计")
def review_stats(db: Session = Depends(get_db)):
    return crud.get_review_stats(db)


@app.get("/api/review/anomalies", response_model=List[schemas.AnomalySample], summary="异常样本分析（拉偏结论的样本）")
def review_anomalies(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_anomaly_samples(db, limit=limit)


@app.get("/api/samples/export", summary="导出样本数据")
def export_samples(status: Optional[str] = None, db: Session = Depends(get_db)):
    data = crud.export_samples(db, status=status)
    return JSONResponse(content={
        "total": len(data),
        "columns": list(data[0].keys()) if data else [],
        "data": data,
    })


@app.put("/api/label-conflicts/{conflict_id}/resolve", response_model=schemas.LabelConflict, summary="解决标签冲突")
def resolve_conflict(
    conflict_id: int,
    resolution: str = Query(..., description="解决方案: adopt_a/adopt_b/manual/pending"),
    resolved_by: str = Query(..., description="解决人"),
    db: Session = Depends(get_db),
):
    result = crud.resolve_label_conflict(db, conflict_id, resolution, resolved_by)
    if not result:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return result


@app.put("/api/samples/{sample_id}/status", response_model=schemas.SampleList, summary="更新样本状态")
def update_status(
    sample_id: int,
    status: str = Query(..., description="新状态"),
    adjuster: str = Query("system", description="操作人"),
    db: Session = Depends(get_db),
):
    valid_statuses = ["pending_review", "processed", "material_missing", "manual_adjusted"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，有效值: {valid_statuses}")
    result = crud.update_sample_status(db, sample_id, status, adjuster)
    if not result:
        raise HTTPException(status_code=404, detail="样本不存在")
    return result


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "信贷评分人工改判系统"}
