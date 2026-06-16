from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import (
    get_db, LoraRecord, ProcessingLog, HumanFeedback,
    GrayComparison, SafetyRule
)
from app.schemas import (
    LoraRecordCreate, LoraRecordUpdate, LoraRecordOut, LoraRecordDetail,
    ProcessingLogCreate, ProcessingLogOut,
    HumanFeedbackCreate, HumanFeedbackOut,
    GrayComparisonCreate, GrayComparisonOut,
    SafetyRuleCreate, SafetyRuleOut,
    TraceRecord, ExportRequest, SummaryStats, BatchFeedbackRequest
)
from app.services.safety_service import (
    run_safety_check, evaluate_merge_result, deduplicate_feedback,
    dedupe_feedback_batch, init_default_safety_rules
)
from app.services.export_service import export_ledger, get_summary_stats
from app.services.sample_service import generate_all_samples
from app.services.export_service import run_gray_comparison

router = APIRouter(prefix="/api", tags=["core"])


@router.post("/records", response_model=LoraRecordOut)
def create_record(data: LoraRecordCreate, db: Session = Depends(get_db)):
    existing = db.query(LoraRecord).filter(LoraRecord.lora_id == data.lora_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"LoRA编号 {data.lora_id} 已存在")

    record = LoraRecord(**data.model_dump())
    db.add(record)
    db.flush()

    log = ProcessingLog(
        record_id=record.id,
        stage="create",
        action="create_record",
        operator="api_user",
        detail=data.model_dump()
    )
    db.add(log)
    db.commit()
    db.refresh(record)
    return record


@router.get("/records", response_model=List[LoraRecordDetail])
def list_records(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    merge_result: Optional[str] = None,
    is_gray_release: Optional[bool] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(LoraRecord)
    if status:
        query = query.filter(LoraRecord.status == status)
    if merge_result:
        query = query.filter(LoraRecord.merge_result == merge_result)
    if is_gray_release is not None:
        query = query.filter(LoraRecord.is_gray_release == is_gray_release)
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(
            (LoraRecord.lora_name.like(kw)) |
            (LoraRecord.lora_id.like(kw)) |
            (LoraRecord.base_model.like(kw))
        )

    records = query.order_by(LoraRecord.updated_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in records:
        latest_fb = None
        if r.feedbacks:
            latest = sorted(r.feedbacks, key=lambda f: f.created_at, reverse=True)[0]
            latest_fb = {
                "id": latest.id,
                "conclusion": latest.conclusion,
                "reviewer": latest.reviewer,
                "content": latest.content[:200]
            }
        result.append(LoraRecordDetail(
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            log_count=len(r.logs),
            feedback_count=len(r.feedbacks),
            latest_feedback=latest_fb
        ))
    return result


@router.get("/records/{record_id}", response_model=LoraRecordDetail)
def get_record(record_id: int, db: Session = Depends(get_db)):
    r = db.query(LoraRecord).filter(LoraRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")

    latest_fb = None
    if r.feedbacks:
        latest = sorted(r.feedbacks, key=lambda f: f.created_at, reverse=True)[0]
        latest_fb = {
            "id": latest.id,
            "conclusion": latest.conclusion,
            "reviewer": latest.reviewer,
            "content": latest.content
        }
    return LoraRecordDetail(
        **{c.name: getattr(r, c.name) for c in r.__table__.columns},
        log_count=len(r.logs),
        feedback_count=len(r.feedbacks),
        latest_feedback=latest_fb
    )


@router.put("/records/{record_id}", response_model=LoraRecordOut)
def update_record(record_id: int, data: LoraRecordUpdate, db: Session = Depends(get_db)):
    record = db.query(LoraRecord).filter(LoraRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(record, key, val)

    log = ProcessingLog(
        record_id=record.id,
        stage="update",
        action="update_record",
        operator="api_user",
        detail=update_data
    )
    db.add(log)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(LoraRecord).filter(LoraRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(record)
    db.commit()
    return {"success": True}


@router.post("/records/{record_id}/safety-check")
def run_record_safety_check(record_id: int, db: Session = Depends(get_db)):
    record = db.query(LoraRecord).filter(LoraRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    overall, issues = run_safety_check(db, record)
    db.refresh(record)

    merge_result, merge_detail = evaluate_merge_result(record, overall, record.feedbacks)
    record.merge_result = merge_result
    record.merge_result_detail = merge_detail
    db.commit()

    return {
        "record_id": record_id,
        "safety_result": overall,
        "merge_result": merge_result,
        "issues": issues
    }


@router.get("/records/{record_id}/trace", response_model=TraceRecord)
def trace_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(LoraRecord).filter(LoraRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    if record_dict.get("safety_check_detail"):
        record_dict["safety_check_detail"] = record_dict["safety_check_detail"]

    logs = []
    for log in sorted(record.logs, key=lambda l: l.created_at):
        logs.append({
            "id": log.id,
            "stage": log.stage,
            "action": log.action,
            "operator": log.operator,
            "detail": log.detail,
            "result": log.result,
            "error_msg": log.error_msg,
            "created_at": log.created_at,
            "raw_source_snapshot": log.raw_source_snapshot
        })

    feedbacks = []
    for fb in sorted(record.feedbacks, key=lambda f: f.created_at):
        feedbacks.append({
            "id": fb.id,
            "feedback_id": fb.feedback_id,
            "feedback_type": fb.feedback_type,
            "content": fb.content,
            "reviewer": fb.reviewer,
            "conclusion": fb.conclusion,
            "confidence": fb.confidence,
            "created_at": fb.created_at,
            "is_duplicate": fb.is_duplicate,
            "duplicate_of": fb.duplicate_of,
            "source_channel": fb.source_channel,
            "import_batch": fb.import_batch
        })

    source_chain = [
        {
            "node": "原始来源",
            "detail": f"来源渠道: {record.source_type or '未知'}; 引用标识: {record.source_ref or '无'}"
        },
        {
            "node": "数据导入",
            "detail": next((l["detail"] for l in logs if l["stage"] == "import"), "无导入记录")
        },
        {
            "node": "安全检查",
            "detail": next((l["detail"] for l in logs if l["stage"] == "safety_check"), "未检查")
        },
        {
            "node": "合并判定",
            "detail": f"结果={record.merge_result}; 说明={record.merge_result_detail or '无'}"
        },
    ]
    if record.truncation_note:
        source_chain.insert(1, {
            "node": "截断标记",
            "detail": record.truncation_note
        })

    return TraceRecord(
        record=record_dict,
        logs=logs,
        feedbacks=feedbacks,
        source_chain=source_chain
    )


@router.get("/stats/summary", response_model=SummaryStats)
def get_stats(
    status: Optional[str] = Query(None),
    merge_result: Optional[str] = Query(None),
    is_gray_release: Optional[bool] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    filters = {}
    if status:
        filters["status"] = [status]
    if merge_result:
        filters["merge_result"] = [merge_result]
    if is_gray_release is not None:
        filters["is_gray_release"] = is_gray_release
    if date_from:
        filters["date_from"] = datetime.fromisoformat(date_from)
    if date_to:
        filters["date_to"] = datetime.fromisoformat(date_to)
    return get_summary_stats(db, filters or None)


@router.post("/feedbacks", response_model=HumanFeedbackOut)
def create_feedback(data: HumanFeedbackCreate, db: Session = Depends(get_db)):
    record = db.query(LoraRecord).filter(LoraRecord.id == data.record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="关联台账记录不存在")

    existing_by_fid = db.query(HumanFeedback).filter(
        HumanFeedback.feedback_id == data.feedback_id
    ).first()

    fb = HumanFeedback(**data.model_dump())
    is_dup = False

    if existing_by_fid:
        fb.feedback_id = data.feedback_id + "-DUP-" + datetime.utcnow().strftime("%H%M%S%f")
        fb.is_duplicate = True
        fb.duplicate_of = existing_by_fid.id
        is_dup = True
        db.add(fb)
        db.flush()
    else:
        db.add(fb)
        db.flush()
        fb, is_dup = deduplicate_feedback(db, fb)

    if not is_dup:
        merge_result, merge_detail = evaluate_merge_result(record, record.safety_check_result, record.feedbacks)
        record.merge_result = merge_result
        record.merge_result_detail = merge_detail

    log = ProcessingLog(
        record_id=data.record_id,
        stage="feedback",
        action="add_feedback",
        operator=data.reviewer or "api_user",
        detail={"feedback_id": fb.feedback_id, "is_duplicate": is_dup,
                "original_feedback_id": data.feedback_id if is_dup and existing_by_fid else None}
    )
    db.add(log)
    db.commit()
    db.refresh(fb)
    return fb


@router.post("/feedbacks/batch")
def create_feedbacks_batch(data: BatchFeedbackRequest, db: Session = Depends(get_db)):
    created_fbs = []
    seen_in_batch = set()
    for item in data.items:
        record = db.query(LoraRecord).filter(LoraRecord.id == item.record_id).first()
        if not record:
            continue

        fid_key = item.feedback_id
        if fid_key in seen_in_batch:
            # 本批次内重复
            fb = HumanFeedback(
                **item.model_dump(),
                import_batch=data.batch_id or item.import_batch,
                feedback_id=fid_key + "-BATCHDUP-" + str(len(created_fbs)),
                is_duplicate=True
            )
            db.add(fb)
            db.flush()
            created_fbs.append(fb)
            continue

        # 检查数据库内已存在
        existing = db.query(HumanFeedback).filter(
            HumanFeedback.feedback_id == item.feedback_id
        ).first()

        if existing:
            fb = HumanFeedback(
                **item.model_dump(),
                import_batch=data.batch_id or item.import_batch,
                feedback_id=item.feedback_id + "-DUP-" + datetime.utcnow().strftime("%H%M%S%f") + str(len(created_fbs)),
                is_duplicate=True,
                duplicate_of=existing.id
            )
        else:
            fb = HumanFeedback(**item.model_dump(), import_batch=data.batch_id or item.import_batch)

        db.add(fb)
        db.flush()
        created_fbs.append(fb)
        seen_in_batch.add(fid_key)

    stats = dedupe_feedback_batch(db, created_fbs)

    for fb in created_fbs:
        if not fb.is_duplicate:
            record = db.query(LoraRecord).filter(LoraRecord.id == fb.record_id).first()
            if record:
                merge_result, merge_detail = evaluate_merge_result(record, record.safety_check_result, record.feedbacks)
                record.merge_result = merge_result
                record.merge_result_detail = merge_detail

    db.commit()
    return {"success": True, "stats": stats}


@router.get("/records/{record_id}/feedbacks", response_model=List[HumanFeedbackOut])
def list_feedbacks(record_id: int, db: Session = Depends(get_db)):
    return db.query(HumanFeedback).filter(HumanFeedback.record_id == record_id).order_by(HumanFeedback.created_at.desc()).all()


@router.get("/records/{record_id}/logs", response_model=List[ProcessingLogOut])
def list_logs(record_id: int, db: Session = Depends(get_db)):
    return db.query(ProcessingLog).filter(ProcessingLog.record_id == record_id).order_by(ProcessingLog.created_at.desc()).all()


@router.post("/gray-comparisons/run")
def run_gray_compare(
    record_id: int,
    compared_lora_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    results = run_gray_comparison(db, record_id, compared_lora_id)
    return {
        "count": len(results),
        "record_id": record_id,
        "compared_with": compared_lora_id,
        "results": [
            {
                "id": r.id,
                "test_case_id": r.test_case_id,
                "input_prompt": r.input_prompt,
                "output_a": r.output_a,
                "output_b": r.output_b,
                "diff_score": r.diff_score,
                "safety_a": r.safety_a,
                "safety_b": r.safety_b
            }
            for r in results
        ]
    }


@router.get("/gray-comparisons")
def list_gray_comparisons(
    record_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(GrayComparison)
    if record_id:
        query = query.filter(GrayComparison.record_id == record_id)
    results = query.order_by(GrayComparison.created_at.desc()).offset(skip).limit(limit).all()
    return results


@router.get("/safety-rules", response_model=List[SafetyRuleOut])
def list_safety_rules(db: Session = Depends(get_db)):
    init_default_safety_rules(db)
    return db.query(SafetyRule).order_by(SafetyRule.rule_id).all()


@router.post("/safety-rules", response_model=SafetyRuleOut)
def create_safety_rule(data: SafetyRuleCreate, db: Session = Depends(get_db)):
    rule = SafetyRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.post("/export")
def do_export(req: ExportRequest, db: Session = Depends(get_db)):
    file_path, summary = export_ledger(
        db,
        export_type=req.export_type,
        export_format=req.export_format,
        scope_filter=req.scope_filter,
        operator=req.operator
    )
    return {
        "success": True,
        "file_path": file_path,
        "file_name": file_path.split("/")[-1],
        "summary": summary
    }


@router.get("/export/download/{file_name}")
def download_export(file_name: str):
    import os
    from app.services.export_service import EXPORT_DIR
    full_path = os.path.join(EXPORT_DIR, file_name)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        full_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if file_name.endswith(".xlsx") else "text/csv",
        filename=file_name
    )


@router.post("/samples/generate")
def generate_samples(db: Session = Depends(get_db)):
    stats = generate_all_samples(db)
    return {"success": True, "generated": stats}


@router.post("/logs", response_model=ProcessingLogOut)
def create_log(data: ProcessingLogCreate, db: Session = Depends(get_db)):
    log = ProcessingLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
