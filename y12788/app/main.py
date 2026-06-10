from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import json
from io import BytesIO
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import (
    get_db, ExperimentRecord, SpectrumData, BatchReport,
    CuringTimeResult, ImportAuditLog
)
from app.import_engine import (
    import_single_experiment, query_canonical, query_by_batch,
    ActionableError, validate_batch_exists
)
from app.concentration_module import (
    build_concentration_regression, predict_concentration, collect_calibration_points
)
from app.export_module import (
    build_export_excel_single, build_export_excel_batch,
    build_export_regression_excel, ConsistencyMismatchError
)

app = FastAPI(title="树脂固化时间判定系统", version="2.0.0")

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _json_error(e: ActionableError):
    return JSONResponse(status_code=400, content=e.to_dict())


@app.exception_handler(ActionableError)
async def actionable_error_handler(request, exc: ActionableError):
    return _json_error(exc)


@app.exception_handler(ConsistencyMismatchError)
async def consistency_error_handler(request, exc: ConsistencyMismatchError):
    return JSONResponse(status_code=409, content={
        "error": True,
        "code": "CONSISTENCY_MISMATCH",
        "message": str(exc),
        "suggestion": "请刷新页面,加载最新数据后重试导出。",
    })


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "树脂固化时间判定系统"}


# ---------- 批次报告管理 ----------
@app.post("/api/batch-report")
def create_batch_report(
    batch_no: str = Form(...),
    resin_type: str = Form(...),
    manufacturer: Optional[str] = Form(None),
    production_date: Optional[str] = Form(None),
    nominal_concentration: Optional[float] = Form(None),
    report_file: Optional[UploadFile] = File(None),
    remark: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    exists = db.query(BatchReport).filter(BatchReport.batch_no == batch_no).first()
    if exists:
        raise ActionableError(
            message=f"批次报告 {batch_no} 已存在",
            suggestion=f"如需修改,请使用 PUT /api/batch-report/{batch_no} 更新;若为不同批次,请核对批号。",
            detail={"batch_no": batch_no}
        )
    file_path = None
    if report_file:
        fname = f"{batch_no}_{report_file.filename}"
        file_path = os.path.join(STATIC_DIR, "batch_reports", fname)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(report_file.file.read())
    br = BatchReport(
        batch_no=batch_no, resin_type=resin_type, manufacturer=manufacturer,
        production_date=production_date, nominal_concentration=nominal_concentration,
        report_file=file_path, remark=remark,
    )
    db.add(br)
    db.commit()
    return {"ok": True, "batch_no": batch_no, "id": br.id}


@app.get("/api/batch-report")
def list_batch_reports(db: Session = Depends(get_db)):
    rows = db.query(BatchReport).order_by(BatchReport.created_at.desc()).all()
    return [{"batch_no": r.batch_no, "resin_type": r.resin_type,
             "manufacturer": r.manufacturer, "nominal_concentration": r.nominal_concentration,
             "production_date": r.production_date, "remark": r.remark}
            for r in rows]


@app.get("/api/batch-report/{batch_no}")
def get_batch_report(batch_no: str, db: Session = Depends(get_db)):
    br = validate_batch_exists(db, batch_no)
    return {
        "batch_no": br.batch_no, "resin_type": br.resin_type,
        "manufacturer": br.manufacturer, "nominal_concentration": br.nominal_concentration,
        "production_date": br.production_date, "remark": br.remark,
        "experiments_count": db.query(ExperimentRecord).filter(
            ExperimentRecord.batch_no == batch_no
        ).count()
    }


# ---------- 谱图判读(日常入口) ----------
@app.post("/api/spectrum/import")
async def import_spectrum(
    spectrum_file: UploadFile = File(..., description="谱图JSON/CSV,字段:time_points,signal_values"),
    batch_no: str = Form(...),
    seq_no: Optional[int] = Form(None),
    operator: Optional[str] = Form(None),
    experiment_date: Optional[str] = Form(None),
    initial_weight: Optional[float] = Form(None),
    curing_agent_ratio: Optional[float] = Form(None),
    actual_concentration: Optional[float] = Form(None),
    remark: Optional[str] = Form(None),
    allow_update: bool = Form(True),
    db: Session = Depends(get_db),
):
    content = await spectrum_file.read()
    payload: Dict[str, Any] = {}
    fname = spectrum_file.filename or "unknown"
    if fname.endswith(".json"):
        payload = json.loads(content.decode("utf-8"))
    elif fname.endswith(".csv"):
        lines = content.decode("utf-8").strip().splitlines()
        t, s = [], []
        start = 0
        if lines and lines[0].strip().lower().startswith(("time", "t,")):
            start = 1
        for line in lines[start:]:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 2:
                try:
                    t.append(float(parts[0]))
                    s.append(float(parts[1]))
                except ValueError:
                    continue
        payload = {"time_points": t, "signal_values": s}
    else:
        raise ActionableError(
            message=f"不支持的文件类型: {fname}",
            suggestion="请上传 .json(包含 time_points + signal_values) 或 .csv(两列: 时间, 信号)。",
            detail={"filename": fname}
        )

    payload.setdefault("file_name", fname)
    payload.setdefault("spectrum_type", payload.get("spectrum_type", "FTIR"))

    try:
        result = import_single_experiment(
            db, batch_no=batch_no, spectrum_payload=payload,
            seq_no=seq_no, operator=operator or "",
            experiment_date=experiment_date or "",
            initial_weight=initial_weight, curing_agent_ratio=curing_agent_ratio,
            actual_concentration=actual_concentration, remark=remark or "",
            allow_update=allow_update, operator_audit=operator or "api",
        )
        return result
    except ActionableError:
        raise


@app.post("/api/spectrum/import-json")
def import_spectrum_json(body: Dict[str, Any], db: Session = Depends(get_db)):
    """程序化接口:直接接收JSON payload,方便样例数据注入"""
    try:
        sp = body.get("spectrum_payload") or body.get("spectrum")
        return import_single_experiment(
            db,
            batch_no=body["batch_no"],
            spectrum_payload=sp,
            seq_no=body.get("seq_no"),
            operator=body.get("operator", ""),
            experiment_date=body.get("experiment_date", ""),
            initial_weight=body.get("initial_weight"),
            curing_agent_ratio=body.get("curing_agent_ratio"),
            actual_concentration=body.get("actual_concentration"),
            remark=body.get("remark", ""),
            allow_update=body.get("allow_update", True),
            operator_audit=body.get("operator") or "api",
        )
    except ActionableError:
        raise


@app.get("/api/spectrum/canonical/{record_no}")
def get_canonical(record_no: str, db: Session = Depends(get_db)):
    return query_canonical(db, record_no)


@app.get("/api/spectrum/by-batch/{batch_no}")
def list_by_batch(batch_no: str, db: Session = Depends(get_db)):
    return query_by_batch(db, batch_no)


@app.get("/api/spectrum/records")
def list_records(
    batch_no: Optional[str] = Query(None),
    judgment: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(ExperimentRecord, CuringTimeResult).outerjoin(
        CuringTimeResult, ExperimentRecord.record_no == CuringTimeResult.record_no
    )
    if batch_no:
        q = q.filter(ExperimentRecord.batch_no == batch_no)
    if judgment:
        q = q.filter(CuringTimeResult.judgment == judgment)
    rows = q.order_by(ExperimentRecord.created_at.desc()).offset(offset).limit(limit).all()
    out = []
    for exp, r in rows:
        out.append({
            "record_no": exp.record_no, "batch_no": exp.batch_no,
            "seq_no": exp.seq_no, "operator": exp.operator,
            "experiment_date": exp.experiment_date,
            "judgment": r.judgment if r else None,
            "gel_time": r.gel_time if r else None,
            "full_cure_time": r.full_cure_time if r else None,
            "confidence": r.confidence if r else None,
        })
    return out


# ---------- 导出(一致性校验) ----------
@app.post("/api/export/single/{record_no}")
def export_single(record_no: str, body: Optional[Dict[str, Any]] = None,
                  db: Session = Depends(get_db)):
    verify_summary = (body or {}).get("verify_summary")
    xlsx = build_export_excel_single(db, record_no, verify_summary=verify_summary)
    return StreamingResponse(
        BytesIO(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="curing_{record_no}.xlsx"'}
    )


@app.post("/api/export/batch/{batch_no}")
def export_batch(batch_no: str, body: Optional[Dict[str, Any]] = None,
                 db: Session = Depends(get_db)):
    verify_summaries = (body or {}).get("verify_summaries")
    xlsx = build_export_excel_batch(db, batch_no, verify_summaries=verify_summaries)
    return StreamingResponse(
        BytesIO(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="batch_{batch_no}.xlsx"'}
    )


# ---------- 浓度换算(月底/课前入口) ----------
@app.post("/api/concentration/regression")
def calc_regression(body: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        reg = build_concentration_regression(
            db,
            x_axis=body.get("x_axis", "peak_area"),
            y_axis=body.get("y_axis", "nominal_concentration"),
            batch_nos=body.get("batch_nos"),
            date_from=body.get("date_from", ""),
            date_to=body.get("date_to", ""),
            exclude_record_nos=body.get("exclude_record_nos"),
        )
        return {
            "method": reg.method, "equation": reg.equation,
            "r_squared": reg.r_squared, "slope": reg.slope,
            "intercept": reg.intercept, "x_label": reg.x_label,
            "y_label": reg.y_label, "points": reg.points,
            "plot_x": reg.plot_x, "plot_y": reg.plot_y,
            "residuals": reg.residuals, "outliers": reg.outliers,
        }
    except ActionableError:
        raise


@app.post("/api/concentration/predict")
def do_predict(body: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        reg = build_concentration_regression(
            db, x_axis=body.get("x_axis", "peak_area"),
            y_axis=body.get("y_axis", "nominal_concentration"),
            batch_nos=body.get("batch_nos"),
            date_from=body.get("date_from", ""), date_to=body.get("date_to", ""),
            exclude_record_nos=body.get("exclude_record_nos"),
        )
        pred = predict_concentration(reg, float(body["x_value"]))
        return {"prediction": pred, "regression": {
            "equation": reg.equation, "r_squared": reg.r_squared
        }}
    except ActionableError:
        raise


@app.post("/api/export/concentration")
def export_regression(body: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        reg = build_concentration_regression(
            db, x_axis=body.get("x_axis", "peak_area"),
            y_axis=body.get("y_axis", "nominal_concentration"),
            batch_nos=body.get("batch_nos"),
            date_from=body.get("date_from", ""), date_to=body.get("date_to", ""),
            exclude_record_nos=body.get("exclude_record_nos"),
        )
        xlsx = build_export_regression_excel(reg)
        return StreamingResponse(
            BytesIO(xlsx),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="concentration_regression.xlsx"'}
        )
    except ActionableError:
        raise


# ---------- 审计日志 ----------
@app.get("/api/audit")
def audit_logs(batch_no: Optional[str] = Query(None), limit: int = 50,
               db: Session = Depends(get_db)):
    q = db.query(ImportAuditLog)
    if batch_no:
        q = q.filter(ImportAuditLog.record_no.like(f"{batch_no}%"))
    rows = q.order_by(ImportAuditLog.created_at.desc()).limit(limit).all()
    return [{
        "id": r.id, "import_batch_id": r.import_batch_id,
        "record_no": r.record_no, "action": r.action,
        "reason": r.reason, "suggestion": r.suggestion,
        "detail": r.detail, "operator": r.operator,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


# ---------- 页面入口 ----------
@app.get("/", response_class=HTMLResponse)
def index():
    index_file = os.path.join(TEMPLATES_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("""
    <h1>树脂固化时间判定系统</h1>
    <p>前端资源未生成,请先完成构建。<a href='/docs'>API文档</a></p>
    """)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
