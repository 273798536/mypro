from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from io import BytesIO
from openpyxl import Workbook
from datetime import datetime

from . import models, schemas, services
from .database import get_db

router = APIRouter(prefix="/api", tags=["buffer"])


@router.get("/records", response_model=List[schemas.BufferRecordSummary])
def list_records(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return services.get_buffer_records(db, skip=skip, limit=limit, status=status, keyword=keyword)


@router.get("/records/{record_id}", response_model=schemas.BufferRecordDetail)
def get_record(record_id: int, db: Session = Depends(get_db)):
    rec = services.get_buffer_record(db, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.post("/records", response_model=schemas.BufferRecordDetail)
def create_record(
    data: schemas.BufferRecordCreate,
    skip_duplicate_check: bool = Query(False, description="是否跳过重复校验"),
    db: Session = Depends(get_db),
):
    try:
        return services.create_buffer_record(db, data, skip_duplicate_check=skip_duplicate_check)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/records/{record_id}", response_model=schemas.BufferRecordDetail)
def update_record(record_id: int, data: schemas.BufferRecordUpdate, db: Session = Depends(get_db)):
    rec = services.update_buffer_record(db, record_id, data)
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.post("/records/{record_id}/status", response_model=schemas.BufferRecordDetail)
def change_status(record_id: int, data: schemas.StatusTransition, db: Session = Depends(get_db)):
    try:
        rec = services.transition_status(db, record_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    ok = services.delete_buffer_record(db, record_id)
    if not ok:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True}


@router.post("/calc/concentration", response_model=schemas.ConcentrationCalcResponse)
def calc_concentration(req: schemas.ConcentrationCalcRequest):
    try:
        return services.calc_concentration(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calc/balance", response_model=schemas.BalanceCalcResponse)
def calc_balance(req: schemas.BalanceCalcRequest):
    return services.calc_balance(req)


@router.get("/records/{record_id}/report")
def export_report(record_id: int, db: Session = Depends(get_db)):
    rec = services.get_buffer_record(db, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")

    wb = Workbook()
    ws = wb.active
    ws.title = "缓冲液配方报告"

    content = services.build_report_content(rec)

    ws.append(["缓冲液配方报告"])
    ws.append([])
    ws.append(["批次号", content["batch_no"]])
    ws.append(["记录日期", content["record_date"]])
    ws.append(["缓冲液名称", content["buffer_name"]])
    ws.append(["目标pH", content["target_ph"]])
    ws.append(["实际pH", content["actual_ph"] or "—"])
    ws.append(["目标体积(L)", content["target_volume"]])
    ws.append(["实际体积(L)", content["actual_volume"] or "—"])
    ws.append(["操作人员", content["operator"] or "—"])
    ws.append(["复核人员", content["reviewer"] or "—"])
    ws.append(["状态", content["status"]])
    ws.append(["称量精度", content["precision_summary"]])
    ws.append(["温度曲线", content["temp_summary"]])
    ws.append(["备注", content["remark"] or "—"])
    ws.append(["导出时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    ws.append([])

    ws.append(["=== 配方组分 ==="])
    ws.append(["试剂名称", "分子式", "摩尔质量(g/mol)", "目标浓度(mol/L)", "实际浓度(mol/L)", "理论质量(g)", "实际称量(g)", "纯度"])
    for c in content["components"]:
        ws.append([
            c["reagent_name"], c["formula"] or "—", c["molar_mass"],
            c["target_concentration"], c["actual_concentration"] or "—",
            c["theoretical_mass"] or "—", c["actual_mass"] or "—", c["purity"],
        ])
    ws.append([])

    ws.append(["=== 称量记录 ==="])
    ws.append(["试剂名称", "理论质量(g)", "实际称量(g)", "允许误差(%)", "实际误差(%)", "是否通过"])
    for w in content["weighing_records"]:
        is_pass_text = "通过" if w["is_pass"] else ("不合格" if w["is_pass"] is False else "未判定")
        ws.append([
            w["reagent_name"], w["theoretical_mass"], w["actual_mass"],
            w["tolerance_pct"], w["error_pct"] or "—", is_pass_text,
        ])
    ws.append([])

    ws.append(["=== 温度曲线 ==="])
    ws.append(["时间(分钟)", "设定温度(℃)", "实际温度(℃)", "偏差(℃)"])
    for t in content["temperature_points"]:
        diff = round(t["actual_temp"] - t["set_temp"], 2)
        ws.append([t["time_minute"], t["set_temp"], t["actual_temp"], diff])
    ws.append([])

    status_line = "最终结论: " + content["status"]
    if content["precision_pass"] is False or content["temp_curve_pass"] is False:
        status_line += "（存在不合格项，需复核）"
    elif content["precision_pass"] is True and content["temp_curve_pass"] is True:
        status_line += "（所有检测项通过）"
    ws.append([status_line])

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"buffer_report_{content['batch_no']}_{content['record_date']}.xlsx"
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/records/{record_id}/report-preview")
def get_report_preview(record_id: int, db: Session = Depends(get_db)):
    rec = services.get_buffer_record(db, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    return services.build_report_content(rec)
