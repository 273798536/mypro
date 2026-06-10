"""RESTful API 路由。"""
import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas, services
from .utils.import_parser import parse_old_excel
from .utils.sample_data import build_sample_record
from .utils.report_generator import (
    generate_report_plain_explain,
    generate_audit_chain,
    export_pdf,
)
from .config import settings

router = APIRouter(prefix="/api/v1", tags=["酶促反应底物换算"])


# ================= 记录管理 =================
@router.post("/records", response_model=schemas.ProcessingRecordOut, summary="新建/导入处理记录")
def create_record(
    data: schemas.ProcessingRecordCreate,
    operator: str = "system",
    db: Session = Depends(get_db),
):
    d = data.model_dump()
    record = services.create_processing_record(db, d, operator=operator)
    return record


@router.post("/records/from-sample", response_model=schemas.ProcessingRecordOut,
             summary="使用日常样例一键创建（含旧表/补录/漏填单位/重叠峰/称量不足等真实场景）")
def create_from_sample(operator: str = "配方工程师-示例", db: Session = Depends(get_db)):
    sample = build_sample_record()
    record = services.create_processing_record(db, sample, operator=operator)
    return record


@router.post("/records/import-excel", response_model=schemas.ImportResultOut,
             summary="导入旧格式Excel表（自动识别温度单位混用/漏填单位等问题）")
async def import_excel(
    file: UploadFile = File(..., description="旧Excel文件，表头含「条件/底物/峰」等关键词"),
    operator: str = "导入人",
    db: Session = Depends(get_db),
):
    raw = await file.read()
    data, warnings, errors = parse_old_excel(raw, filename=file.filename)
    if errors:
        return schemas.ImportResultOut(success=False, errors=errors, warnings=warnings)

    record = services.create_processing_record(db, data, operator=operator)

    missing_units = record.missing_unit_fields or []
    temp_issues = []
    if record.temp_unit_issue_detail:
        temp_issues = record.temp_unit_issue_detail.get("conditions", [])

    return schemas.ImportResultOut(
        success=True,
        record_id=record.id,
        record_no=record.record_no,
        warnings=warnings,
        errors=[],
        missing_units=missing_units,
        temp_unit_issues=temp_issues,
    )


@router.get("/records", response_model=schemas.ProcessingRecordListOut, summary="分页查询处理记录（重启不丢失）")
def list_records(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    total, items = services.list_records(db, status=status, keyword=keyword, skip=skip, limit=limit)
    return schemas.ProcessingRecordListOut(total=total, items=items)


@router.get("/records/{record_id}", response_model=schemas.ProcessingRecordDetailOut, summary="记录详情（含换算/谱图/条件/状态/审计）")
def get_record(record_id: int, db: Session = Depends(get_db)):
    r = services.get_record_detail(db, record_id)
    if not r:
        raise HTTPException(status_code=404, detail="处理记录不存在")
    return r


# ================= 状态推进 =================
@router.post("/records/{record_id}/status/next", response_model=schemas.ProcessingRecordOut,
             summary="状态推进：imported→reviewing→reviewed→pending_export→exported")
def status_next(record_id: int, payload: schemas.StatusTransitionIn, db: Session = Depends(get_db)):
    ok, msg, rec = services.transition_status(db, record_id, payload.operator, "next", payload.operation_note)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return rec


@router.post("/records/{record_id}/status/back", response_model=schemas.ProcessingRecordOut,
             summary="状态回退（仅允许：reviewing→imported，reviewed→reviewing，pending_export→reviewed）")
def status_back(record_id: int, payload: schemas.StatusTransitionIn, db: Session = Depends(get_db)):
    ok, msg, rec = services.transition_status(db, record_id, payload.operator, "back", payload.operation_note)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return rec


# ================= 复核 =================
@router.post("/records/{record_id}/review", response_model=schemas.ProcessingRecordDetailOut,
             summary="提交复核：处理意见、安全备注、逐项复核备注、谱图判读；自动推进到复核通过")
def submit_review(record_id: int, payload: schemas.ReviewSubmitIn, db: Session = Depends(get_db)):
    ok, msg, rec = services.submit_review(db, record_id, payload)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return rec


# ================= 报告导出 =================
@router.get("/records/{record_id}/report/plain-explain", summary="生成可直接复制给同事的普通话解释")
def get_plain_explain(record_id: int, db: Session = Depends(get_db)):
    r = services.get_record_detail(db, record_id)
    if not r:
        raise HTTPException(status_code=404, detail="处理记录不存在")
    from .schemas import ProcessingRecordDetailOut
    detail = ProcessingRecordDetailOut.model_validate(r).model_dump()
    return {
        "record_no": r.record_no,
        "plain_explain": generate_report_plain_explain(detail),
    }


@router.get("/records/{record_id}/report/audit-chain",
            summary="异常追溯链：从异常点反查处理意见→反应条件→换算→谱图→导入")
def get_audit_chain(record_id: int, anomaly_key: Optional[str] = None, db: Session = Depends(get_db)):
    r = services.get_record_detail(db, record_id)
    if not r:
        raise HTTPException(status_code=404, detail="处理记录不存在")
    from .schemas import ProcessingRecordDetailOut
    detail = ProcessingRecordDetailOut.model_validate(r).model_dump()
    return {
        "record_no": r.record_no,
        "anomaly_key": anomaly_key or "（完整链路）",
        "chain": generate_audit_chain(detail, anomaly_key),
    }


@router.post("/records/{record_id}/report/export", response_model=schemas.ExportResultOut,
             summary="导出PDF报告（含普通话解释/称量精度说明/异常追溯链）")
def export_report(record_id: int, operator: str = "导出人", db: Session = Depends(get_db)):
    r = services.get_record_detail(db, record_id)
    if not r:
        raise HTTPException(status_code=404, detail="处理记录不存在")
    from .schemas import ProcessingRecordDetailOut
    detail = ProcessingRecordDetailOut.model_validate(r).model_dump()
    audit = generate_audit_chain(detail)
    filename = export_pdf(detail, audit)
    plain = generate_report_plain_explain(detail)

    # 推进状态
    if r.status == "reviewed":
        services.transition_status(db, record_id, operator, "next", "生成报告，进入待导出")
    if r.status in ("pending_export", "reviewed"):
        services.transition_status(db, record_id, operator, "next", f"导出PDF：{filename}")

    return schemas.ExportResultOut(
        success=True,
        file_name=filename,
        download_url=f"/api/v1/records/{record_id}/report/download?f={filename}",
        report_plain_explain=plain,
    )


@router.get("/records/{record_id}/report/download", summary="下载已生成的PDF报告")
def download_report(record_id: int, f: str = Query(..., alias="f"), db: Session = Depends(get_db)):
    r = services.get_record_detail(db, record_id)
    if not r:
        raise HTTPException(status_code=404, detail="处理记录不存在")
    safe_name = os.path.basename(f)
    path = Path(settings.EXPORT_DIR) / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="报告文件不存在或已被删除")
    return FileResponse(path=str(path), filename=safe_name,
                        media_type="application/pdf")


# ================= 系统/枚举 =================
@router.get("/enums/status-flow", summary="获取合法的状态流转关系")
def get_status_flow():
    return {
        "flow": services.STATUS_FLOW,
        "allow_back": services.STATUS_ALLOW_BACK,
        "meaning": {
            "imported": "已导入（待复核）",
            "reviewing": "复核中（配方工程师正在复核）",
            "reviewed": "复核通过（可生成报告）",
            "pending_export": "待导出（报告已生成，待下载）",
            "exported": "已导出（流程闭环完成）",
        },
    }
