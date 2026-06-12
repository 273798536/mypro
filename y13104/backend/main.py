import uuid
from typing import List, Optional
from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import (
    ParameterSheet, ParameterRow, RegressionResult, AnomalyPoint,
    ReviewStatus, ChangeLog
)
from schemas import (
    ParameterSheetOut, ParameterRowOut, UploadResponse,
    RegressionResultOut, AnomalyPointOut, ReviewUpdate,
    ReviewSummary, ReviewDashboard, RegressionChartData, ScatterPoint
)
from ingestor import ingest_parameter_sheet, load_excel, update_parameter_row
from piecewise_regression import run_regression_for_sheet

Base.metadata.create_all(bind=engine)

app = FastAPI(title="分段回归批量验算")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sheet_out(sheet: ParameterSheet, db: Session) -> ParameterSheetOut:
    row_count = db.query(ParameterRow).filter(ParameterRow.sheet_id == sheet.id).count()
    has_result = db.query(RegressionResult).filter(RegressionResult.sheet_id == sheet.id).first() is not None
    return ParameterSheetOut(
        id=sheet.id, file_name=sheet.file_name, version=sheet.version,
        uploaded_by=sheet.uploaded_by, uploaded_at=sheet.uploaded_at,
        notes=sheet.notes,
        column_mapping=sheet.column_mapping or {},
        raw_columns=sheet.raw_columns or [],
        row_count=row_count, has_result=has_result,
    )


@app.get("/api/sheets", response_model=List[ParameterSheetOut])
def list_sheets(db: Session = Depends(get_db)):
    sheets = db.query(ParameterSheet).order_by(ParameterSheet.uploaded_at.desc()).all()
    return [_sheet_out(s, db) for s in sheets]


@app.post("/api/sheets/upload", response_model=UploadResponse)
async def upload_sheet(
    file: UploadFile = File(...),
    version: str = Form(...),
    uploaded_by: str = Form("unknown"),
    notes: str = Form(""),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        df = load_excel(content, file.filename or "sheet.xlsx")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {e}")

    if df.empty:
        raise HTTPException(status_code=400, detail="文件为空")

    sheet, matches, rows_with_issues = ingest_parameter_sheet(
        db, df,
        file_name=file.filename or "sheet.xlsx",
        version=version,
        uploaded_by=uploaded_by,
        notes=notes,
    )

    warnings = []
    for m in matches:
        if m["chosen"] is None and m["canonical"] not in ("unit", "breakpoint"):
            warnings.append(f"字段[{m['canonical']}未匹配到列，候选：{m['candidates']}")

    return UploadResponse(
    sheet_id=sheet.id,
    file_name=sheet.file_name,
    version=sheet.version,
    row_count=db.query(ParameterRow).filter(ParameterRow.sheet_id == sheet.id).count(),
    column_matches=matches,
    warnings=warnings,
    rows_with_issues=rows_with_issues,
)


@app.get("/api/sheets/{sheet_id}", response_model=ParameterSheetOut)
def get_sheet(sheet_id: int, db: Session = Depends(get_db)):
    sheet = db.query(ParameterSheet).filter(ParameterSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="参数表不存在")
    return _sheet_out(sheet, db)


@app.get("/api/sheets/{sheet_id}/rows", response_model=List[ParameterRowOut])
def list_rows(
    sheet_id: int, only_issues: bool = False, db: Session = Depends(get_db)):
    q = db.query(ParameterRow).filter(ParameterRow.sheet_id == sheet_id)
    if only_issues:
        q = q.filter(ParameterRow.row_status != "ok")
    rows = q.order_by(ParameterRow.excel_row_number).all()
    return rows


@app.get("/api/rows/{row_id}", response_model=ParameterRowOut)
def get_row(row_id: int, db: Session = Depends(get_db)):
    row = db.query(ParameterRow).filter(ParameterRow.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="行不存在")
    return row


@app.patch("/api/rows/{row_id}/edit")
def edit_row(
    row_id: int,
    field_name: str = Form(...),
    new_value: str = Form(...),
    changed_by: str = Form("unknown"),
    reason: str = Form(""),
    db: Session = Depends(get_db),
):
    field_map = {
        "weight": float, "x_value": float, "y_value": float,
        "breakpoint": float, "security_code": str, "security_name": str, "unit": str,
    }
    if field_name not in field_map:
        raise HTTPException(status_code=400, detail=f"不支持的字段: {field_name}")
    try:
        parsed = field_map[field_name](new_value) if new_value != "" else None
    except ValueError:
        raise HTTPException(status_code=400, detail=f"值格式错误")
    row = update_parameter_row(db, row_id, field_name, parsed, changed_by, reason)
    if not row:
        raise HTTPException(status_code=404, detail="行不存在")
    return {"ok": True, "row": ParameterRowOut.model_validate(row)}


@app.post("/api/sheets/{sheet_id}/run", response_model=RegressionResultOut)
def run_regression(
    sheet_id: int,
    num_segments: int = 2,
    z_threshold: float = 2.5,
    db: Session = Depends(get_db),
):
    sheet = db.query(ParameterSheet).filter(ParameterSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="参数表不存在")
    result = run_regression_for_sheet(db, sheet_id, num_segments, z_threshold)
    return RegressionResultOut(
        id=result.id, sheet_id=result.sheet_id, run_at=result.run_at,
        segment_count=result.segment_count, breakpoints=result.breakpoints,
        coefficients=result.coefficients, r_squared=result.r_squared,
        total_points=result.total_points,
        anomaly_count=db.query(AnomalyPoint).filter(
            AnomalyPoint.result_id == result.id,
            AnomalyPoint.is_outlier == True
        ).count(),
    )


@app.get("/api/sheets/{sheet_id}/results", response_model=List[RegressionResultOut])
def list_results(sheet_id: int, db: Session = Depends(get_db)):
    results = db.query(RegressionResult).filter(RegressionResult.sheet_id == sheet_id).order_by(RegressionResult.run_at.desc()).all()
    out = []
    for r in results:
        out.append(RegressionResultOut(
            id=r.id, sheet_id=r.sheet_id, run_at=r.run_at,
            segment_count=r.segment_count, breakpoints=r.breakpoints,
            coefficients=r.coefficients, r_squared=r.r_squared, total_points=r.total_points,
            anomaly_count=db.query(AnomalyPoint).filter(
                AnomalyPoint.result_id == r.id, AnomalyPoint.is_outlier == True
            ).count(),
        ))
    return out


def _build_chart(sheet_id: int, result: RegressionResult, db: Session) -> RegressionChartData:
    anomalies = db.query(AnomalyPoint).filter(AnomalyPoint.result_id == result.id).all()
    points = []
    for a in anomalies:
        points.append(ScatterPoint(
            x=a.x_value, y=a.y_value,
            security_code=a.security_code, security_name=a.security_name,
            param_row_id=a.param_row_id,
            is_anomaly=a.is_outlier, review_status=a.review_status,
        ))

    rows = db.query(ParameterRow).filter(ParameterRow.sheet_id == sheet_id).all()
    xs = [r.x_value for r in rows if r.x_value is not None]
    if xs:
        xmin, xmax = min(xs), max(xs)
    else:
        xmin, xmax = 0.0, 1.0
    pad = (xmax - xmin) * 0.05 or 1.0
    xmin -= pad
    xmax += pad

    fitted = []
    segs = (result.coefficients or {}).get("segments", [])
    for seg in segs:
        lo = seg.get("x_lo") if seg.get("x_lo") is not None else xmin
        hi = seg.get("x_hi") if seg.get("x_hi") is not None else xmax
        lo = max(lo, xmin)
        hi = min(hi, xmax)
        slope = seg.get("slope", 0.0)
        intercept = seg.get("intercept", 0.0)
        fitted.append({
            "segment": seg.get("segment"),
            "x1": lo, "y1": intercept + slope * lo,
            "x2": hi, "y2": intercept + slope * hi,
            "slope": slope, "intercept": intercept,
        })

    return RegressionChartData(
        points=points,
        breakpoints=result.breakpoints or [],
        fitted_lines=fitted,
        r_squared=result.r_squared,
    )


@app.get("/api/sheets/{sheet_id}/dashboard", response_model=ReviewDashboard)
def review_dashboard(sheet_id: int, db: Session = Depends(get_db)):
    sheet = db.query(ParameterSheet).filter(ParameterSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="参数表不存在")

    result = db.query(RegressionResult).filter(
        RegressionResult.sheet_id == sheet_id
    ).order_by(RegressionResult.run_at.desc()).first()

    anomalies: List[AnomalyPointOut] = []
    chart = RegressionChartData()
    summary = ReviewSummary()
    latest_out = None

    if result:
        latest_out = RegressionResultOut(
            id=result.id, sheet_id=result.sheet_id, run_at=result.run_at,
            segment_count=result.segment_count, breakpoints=result.breakpoints,
            coefficients=result.coefficients, r_squared=result.r_squared,
            total_points=result.total_points,
            anomaly_count=db.query(AnomalyPoint).filter(
                AnomalyPoint.result_id == result.id, AnomalyPoint.is_outlier == True
            ).count(),
        )
        anom_rows = db.query(AnomalyPoint).filter(AnomalyPoint.result_id == result.id).order_by(AnomalyPoint.z_score.desc()).all()
        anomalies = [AnomalyPointOut.model_validate(a) for a in anom_rows]
        chart = _build_chart(sheet_id, result, db)

        processed = sum(1 for a in anomalies if a.review_status == ReviewStatus.PROCESSED)
        pending = sum(1 for a in anomalies if a.review_status == ReviewStatus.PENDING_MATERIAL)
        overrule = sum(1 for a in anomalies if a.review_status == ReviewStatus.MANUAL_OVERRULE)
        summary = ReviewSummary(
            processed=processed, pending_material=pending,
            manual_overrule=overrule,
            anomalies=[a for a in anomalies if a.is_outlier],
        )

    logs = db.query(ChangeLog).filter(ChangeLog.sheet_id == sheet_id).order_by(ChangeLog.changed_at.desc()).limit(50).all()
    change_logs = [{
        "id": l.id, "param_row_id": l.param_row_id,
        "changed_by": l.changed_by, "changed_at": l.changed_at.isoformat() if l.changed_at else None,
        "field_name": l.field_name, "old_value": l.old_value, "new_value": l.new_value,
        "reason": l.reason,
    } for l in logs]

    return ReviewDashboard(
        sheet=_sheet_out(sheet, db),
        latest_result=latest_out,
        chart=chart,
        anomalies=anomalies,
        review_summary=summary,
        change_logs=change_logs,
    )


@app.patch("/api/anomalies/{anomaly_id}/review", response_model=AnomalyPointOut)
def update_review(anomaly_id: int, body: ReviewUpdate, db: Session = Depends(get_db)):
    a = db.query(AnomalyPoint).filter(AnomalyPoint.id == anomaly_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="异常点不存在")
    allowed = {ReviewStatus.PROCESSED, ReviewStatus.PENDING_MATERIAL, ReviewStatus.MANUAL_OVERRULE}
    if body.review_status not in allowed:
        raise HTTPException(status_code=400, detail="非法状态")
    a.review_status = body.review_status
    a.reviewer_note = body.reviewer_note
    a.overridden = body.review_status == ReviewStatus.MANUAL_OVERRULE or a.overridden
    db.commit()
    db.refresh(a)
    return AnomalyPointOut.model_validate(a)


@app.get("/api/anomalies/{anomaly_id}/row", response_model=ParameterRowOut)
def get_anomaly_origin_row(anomaly_id: int, db: Session = Depends(get_db)):
    a = db.query(AnomalyPoint).filter(AnomalyPoint.id == anomaly_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="异常点不存在")
    row = db.query(ParameterRow).filter(ParameterRow.id == a.param_row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="原始行不存在")
    return ParameterRowOut.model_validate(row)


@app.get("/api/health")
def health():
    return {"status": "ok"}
