from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import io

from app.database import get_db
from app.models import Sample, RevisionBatch, ModelVersion, STATUS_DEFINITIONS
from app.schemas import (
    RevisionBatchOut, ModelVersionOut, SampleOut, SampleUpdate,
    FilterParams, StatisticsOut, PageSummaryOut, CompareResult,
    ModelVersionBase, RevisionBatchBase,
)
from app.processor import (
    parse_csv_content, import_samples_from_df, apply_filters,
    compute_statistics, status_to_text,
)
from app.exporter import (
    build_export_buffer, build_summary_text, compare_batches, samples_to_dataframe,
)

router = APIRouter(prefix="/api", tags=["revision"])


@router.get("/model-versions", response_model=List[ModelVersionOut])
def list_model_versions(db: Session = Depends(get_db)):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()


@router.post("/model-versions", response_model=ModelVersionOut)
def create_model_version(data: ModelVersionBase, db: Session = Depends(get_db)):
    existing = db.query(ModelVersion).filter(ModelVersion.version_tag == data.version_tag).first()
    if existing:
        raise HTTPException(400, f"版本标签 {data.version_tag} 已存在")
    mv = ModelVersion(version_tag=data.version_tag, description=data.description)
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


@router.get("/batches", response_model=List[RevisionBatchOut])
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(RevisionBatch).order_by(RevisionBatch.created_at.desc()).all()
    result = []
    for b in batches:
        out = RevisionBatchOut.model_validate(b, from_attributes=True)
        out.sample_count = db.query(Sample).filter(Sample.batch_id == b.id).count()
        out.drift_count = db.query(Sample).filter(Sample.batch_id == b.id, Sample.is_threshold_drift == True).count()
        out.confirmed_count = db.query(Sample).filter(Sample.batch_id == b.id, Sample.final_status == "confirmed").count()
        out.rejected_count = db.query(Sample).filter(Sample.batch_id == b.id, Sample.final_status == "rejected").count()
        result.append(out)
    return result


@router.post("/batches", response_model=RevisionBatchOut)
def create_batch(data: RevisionBatchBase, db: Session = Depends(get_db)):
    mv = db.query(ModelVersion).filter(ModelVersion.id == data.model_version_id).first()
    if not mv:
        raise HTTPException(404, "模型版本不存在")
    batch = RevisionBatch(**data.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.post("/batches/{batch_id}/import")
def import_batch(
    batch_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    batch = db.query(RevisionBatch).filter(RevisionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "批次不存在")
    content = file.file.read()
    df, field_mapping = parse_csv_content(content, file.filename or "")
    original_columns = list(df.columns)
    imported, drifted, warnings = import_samples_from_df(db, df, batch_id, original_columns)
    batch.source_file = file.filename
    db.commit()
    return {
        "imported": imported,
        "drifted": drifted,
        "warnings": warnings,
        "field_mapping": field_mapping,
    }


@router.get("/samples", response_model=List[SampleOut])
def list_samples(
    batch_id: Optional[int] = None,
    final_status: Optional[str] = None,
    is_threshold_drift: Optional[bool] = None,
    manual_process_status: Optional[str] = None,
    sample_id: Optional[str] = None,
    product_id: Optional[str] = None,
    keyword: Optional[str] = None,
    offset: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    params = FilterParams(
        batch_id=batch_id, final_status=final_status,
        is_threshold_drift=is_threshold_drift,
        manual_process_status=manual_process_status,
        sample_id=sample_id, product_id=product_id, keyword=keyword,
    )
    q = apply_filters(db.query(Sample), params)
    return q.order_by(Sample.id.asc()).offset(offset).limit(limit).all()


@router.get("/samples/{sample_id}", response_model=SampleOut)
def get_sample(sample_id: int, db: Session = Depends(get_db)):
    s = db.query(Sample).filter(Sample.id == sample_id).first()
    if not s:
        raise HTTPException(404, "样本不存在")
    return s


@router.patch("/samples/{sample_id}", response_model=SampleOut)
def update_sample(sample_id: int, data: SampleUpdate, db: Session = Depends(get_db)):
    s = db.query(Sample).filter(Sample.id == sample_id).first()
    if not s:
        raise HTTPException(404, "样本不存在")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(s, key, value)
    db.commit()
    db.refresh(s)
    return s


@router.get("/statistics", response_model=StatisticsOut)
def get_statistics(
    batch_id: Optional[int] = None,
    final_status: Optional[str] = None,
    is_threshold_drift: Optional[bool] = None,
    manual_process_status: Optional[str] = None,
    sample_id: Optional[str] = None,
    product_id: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    params = FilterParams(
        batch_id=batch_id, final_status=final_status,
        is_threshold_drift=is_threshold_drift,
        manual_process_status=manual_process_status,
        sample_id=sample_id, product_id=product_id, keyword=keyword,
    )
    return compute_statistics(db, params)


@router.get("/page-summary", response_model=PageSummaryOut)
def get_page_summary(
    batch_id: int,
    final_status: Optional[str] = None,
    is_threshold_drift: Optional[bool] = None,
    manual_process_status: Optional[str] = None,
    sample_id: Optional[str] = None,
    product_id: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    batch = db.query(RevisionBatch).filter(RevisionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "批次不存在")
    params = FilterParams(
        batch_id=batch_id, final_status=final_status,
        is_threshold_drift=is_threshold_drift,
        manual_process_status=manual_process_status,
        sample_id=sample_id, product_id=product_id, keyword=keyword,
    )
    stats = compute_statistics(db, params)
    filter_cond = params.model_dump()
    status_text = {k: status_to_text(k) for k in STATUS_DEFINITIONS.keys()}
    return PageSummaryOut(
        batch_id=batch.id,
        batch_name=batch.batch_name,
        model_version=batch.model_version.version_tag if batch.model_version else "",
        generated_at=datetime.now(),
        statistics=StatisticsOut(**stats),
        filter_condition=filter_cond,
        status_text=status_text,
    )


@router.get("/export")
def export_samples(
    batch_id: Optional[int] = None,
    final_status: Optional[str] = None,
    is_threshold_drift: Optional[bool] = None,
    manual_process_status: Optional[str] = None,
    sample_id: Optional[str] = None,
    product_id: Optional[str] = None,
    keyword: Optional[str] = None,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    db: Session = Depends(get_db),
):
    params = FilterParams(
        batch_id=batch_id, final_status=final_status,
        is_threshold_drift=is_threshold_drift,
        manual_process_status=manual_process_status,
        sample_id=sample_id, product_id=product_id, keyword=keyword,
    )
    q = apply_filters(db.query(Sample), params)
    samples = q.order_by(Sample.id.asc()).all()
    data, media_type = build_export_buffer(samples, format)
    ext = "xlsx" if format == "xlsx" else "csv"
    filename = f"商品属性人工改判_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export-summary")
def export_summary(
    batch_id: int,
    final_status: Optional[str] = None,
    is_threshold_drift: Optional[bool] = None,
    manual_process_status: Optional[str] = None,
    sample_id: Optional[str] = None,
    product_id: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    batch = db.query(RevisionBatch).filter(RevisionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "批次不存在")
    params = FilterParams(
        batch_id=batch_id, final_status=final_status,
        is_threshold_drift=is_threshold_drift,
        manual_process_status=manual_process_status,
        sample_id=sample_id, product_id=product_id, keyword=keyword,
    )
    stats = compute_statistics(db, params)
    filter_cond = {k: v for k, v in params.model_dump().items() if v is not None and v != ""}
    text = build_summary_text(batch, stats, filter_cond)
    filename = f"页面摘要_{batch.batch_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    return StreamingResponse(
        io.BytesIO(text.encode("utf-8")),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/compare", response_model=CompareResult)
def compare_two_batches(left_batch_id: int, right_batch_id: int, db: Session = Depends(get_db)):
    result = compare_batches(db, left_batch_id, right_batch_id)
    if not result:
        raise HTTPException(404, "批次不存在")
    return result


@router.get("/status-definitions")
def get_status_definitions():
    return STATUS_DEFINITIONS
