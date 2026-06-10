import hashlib
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from .sample_import import get_sample_detail
from .. import models, schemas


def add_image_annotation(
    db: Session,
    data: schemas.ImageAnnotationCreate,
) -> Optional[models.ImageAnnotation]:
    sample = get_sample_detail(db, data.sample_id)
    if not sample:
        return None
    ann = models.ImageAnnotation(
        sample_id=data.sample_id,
        pca_plot_path=data.pca_plot_path,
        cluster_label=data.cluster_label,
        outlier_flag=data.outlier_flag,
        annotation_text=data.annotation_text,
        annotated_by=data.annotated_by,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


def add_diff_analysis(
    db: Session,
    data: schemas.DifferentialAnalysisCreate,
) -> Optional[models.DifferentialAnalysis]:
    sample = get_sample_detail(db, data.sample_id)
    if not sample:
        return None
    diff = models.DifferentialAnalysis(
        sample_id=data.sample_id,
        source_material=data.source_material,
        comparison_group=data.comparison_group,
        significant_markers=data.significant_markers,
        conclusion=data.conclusion,
        trace_to_source=data.trace_to_source,
    )
    db.add(diff)
    if not sample.material_source and data.source_material:
        sample.material_source = data.source_material
    db.commit()
    db.refresh(diff)
    return diff


def compute_data_hash(samples: List[models.Sample]) -> str:
    payload = []
    for s in sorted(samples, key=lambda x: x.id):
        payload.append({
            "id": s.id,
            "barcode": s.barcode,
            "status": s.review_status,
            "quality_rating": s.quality_rating,
            "can_use": s.can_use_directly,
            "needs_review": s.needs_teacher_review,
            "low_quality": s.low_quality_reads,
        })
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def build_export(
    db: Session,
    data: schemas.ExportRequest,
) -> Optional[Dict[str, Any]]:
    if data.include_all_valid:
        query = db.query(models.Sample).filter(models.Sample.review_status == "qc_passed")
        if data.batch_id:
            query = query.filter(models.Sample.import_batch_id == data.batch_id)
        samples = query.all()
    elif data.sample_ids:
        samples = [
            s for s in [get_sample_detail(db, sid) for sid in data.sample_ids]
            if s is not None
        ]
    elif data.batch_id:
        samples = db.query(models.Sample).filter(
            models.Sample.import_batch_id == data.batch_id,
            models.Sample.review_status == "qc_passed",
        ).all()
    else:
        return None

    if not samples:
        return None

    all_samples_query = db.query(models.Sample)
    if data.batch_id:
        all_samples_query = all_samples_query.filter(models.Sample.import_batch_id == data.batch_id)
    all_samples = all_samples_query.all()

    included = [s for s in samples if s.review_status == "qc_passed"]
    excluded = [s for s in all_samples if s.id not in [i.id for i in included]]

    excluded_reasons = {}
    for s in excluded:
        reasons = []
        if s.review_status == "rejected":
            reasons.append(f"已驳回: {s.unusable_reason or '未说明原因'}")
        if s.low_quality_reads:
            reasons.append(f"低质量读段: {s.low_quality_detail or '标记为低质量'}")
        if s.needs_teacher_review:
            reasons.append("需生物老师复核（空值/重复/备注混写）")
        if s.review_status in ("imported", "reviewing"):
            reasons.append(f"状态未完成: {s.review_status}")
        if s.review_status == "needs_bio_review":
            reasons.append("待生物老师复核")
        excluded_reasons[s.barcode] = reasons or ["未通过筛选"]

    qc_summary = {
        "total": len(all_samples),
        "included": len(included),
        "excluded": len(excluded),
        "direct_usable": sum(1 for s in included if s.can_use_directly),
        "needs_teacher_review": sum(1 for s in included if s.needs_teacher_review),
        "low_quality_count": sum(1 for s in all_samples if s.low_quality_reads),
    }

    data_hash = compute_data_hash(included)
    report_id = f"REPORT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    report = models.ExportReport(
        report_id=report_id,
        batch_id=data.batch_id,
        included_samples=[s.id for s in included],
        excluded_samples=[s.id for s in excluded],
        excluded_reasons=excluded_reasons,
        qc_summary=qc_summary,
        data_hash=data_hash,
        exported_by=data.exported_by,
    )
    db.add(report)

    for s in included:
        if s.review_status == "qc_passed":
            from .qc_review import _log_status
            s.review_status = "exported"
            _log_status(db, s.id, "qc_passed", "exported", data.exported_by, f"报告导出: {report_id}")

    db.commit()
    db.refresh(report)

    return {
        "report": report,
        "included_samples": included,
    }


def list_export_reports(db: Session, skip: int = 0, limit: int = 50) -> List[models.ExportReport]:
    return db.query(models.ExportReport).order_by(models.ExportReport.created_at.desc()).offset(skip).limit(limit).all()


def get_export_report(db: Session, report_id: str) -> Optional[Dict[str, Any]]:
    report = db.query(models.ExportReport).filter(models.ExportReport.report_id == report_id).first()
    if not report:
        return None
    samples = db.query(models.Sample).filter(models.Sample.id.in_(report.included_samples)).all()
    return {"report": report, "samples": samples}
