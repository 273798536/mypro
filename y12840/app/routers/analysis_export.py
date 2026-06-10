from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas
from ..services.export_report import (
    add_image_annotation,
    add_diff_analysis,
    build_export,
    list_export_reports,
    get_export_report,
)

router = APIRouter(prefix="/api/analysis", tags=["analysis-export"])


@router.post("/image-annotation", response_model=schemas.ImageAnnotationOut)
def create_image_annotation(data: schemas.ImageAnnotationCreate, db: Session = Depends(get_db)):
    ann = add_image_annotation(db, data)
    if not ann:
        raise HTTPException(status_code=404, detail="样本不存在")
    return ann


@router.post("/diff-analysis", response_model=schemas.DifferentialAnalysisOut)
def create_diff_analysis(data: schemas.DifferentialAnalysisCreate, db: Session = Depends(get_db)):
    diff = add_diff_analysis(db, data)
    if not diff:
        raise HTTPException(status_code=404, detail="样本不存在")
    return diff


@router.post("/export")
def export_report(data: schemas.ExportRequest, db: Session = Depends(get_db)):
    result = build_export(db, data)
    if not result:
        raise HTTPException(status_code=400, detail="没有符合条件的样本可导出，请检查筛选条件")
    report = result["report"]
    samples = result["included_samples"]
    return {
        "report_id": report.report_id,
        "batch_id": report.batch_id,
        "included_samples_count": len(samples),
        "excluded_samples_count": len(report.excluded_samples),
        "excluded_reasons": report.excluded_reasons,
        "qc_summary": report.qc_summary,
        "data_hash": report.data_hash,
        "exported_by": report.exported_by,
        "created_at": report.created_at,
        "samples": samples,
    }


@router.get("/exports/")
def list_reports(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    reports = list_export_reports(db, skip, limit)
    return [
        {
            "report_id": r.report_id,
            "batch_id": r.batch_id,
            "included_samples_count": len(r.included_samples),
            "excluded_samples_count": len(r.excluded_samples),
            "qc_summary": r.qc_summary,
            "data_hash": r.data_hash,
            "exported_by": r.exported_by,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.get("/exports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db)):
    result = get_export_report(db, report_id)
    if not result:
        raise HTTPException(status_code=404, detail="报告不存在")
    report = result["report"]
    samples = result["samples"]
    return {
        "report_id": report.report_id,
        "batch_id": report.batch_id,
        "included_samples_count": len(samples),
        "excluded_samples_count": len(report.excluded_samples),
        "excluded_reasons": report.excluded_reasons,
        "qc_summary": report.qc_summary,
        "data_hash": report.data_hash,
        "exported_by": report.exported_by,
        "created_at": report.created_at,
        "samples": samples,
    }
