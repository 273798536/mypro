import csv
import io
import orjson
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Literal

from .. import crud
from ..database import get_db
from ..errors.handlers import GrayCompareTaskNotFound, InconsistentPayload
from ..services.consistency import (
    build_compare_summary,
    build_summary_from_diffs,
    verify_export_consistency,
    compute_summary_hash,
)

router = APIRouter(prefix="/api/export", tags=["export"])


DECISION_LABEL = {
    "APPROVED": "可直接用",
    "REVIEW_REQUIRED": "待MLOps复核",
    "RERUN": "需重新评测",
    None: "未审核",
}

DECISION_EMOJI = {
    "APPROVED": "[🟢]",
    "REVIEW_REQUIRED": "[🟡]",
    "RERUN": "[🔴]",
    None: "[⚪]",
}


@router.get("/{compare_id}")
def export_compare(
    compare_id: int,
    format: Literal["csv", "json"] = Query(default="csv", description="导出格式 csv|json"),
    checksum: bool = Query(default=True, description="强制进行一致性校验"),
    db: Session = Depends(get_db),
):
    task = crud.get_gray_compare(db, compare_id)
    if not task:
        raise GrayCompareTaskNotFound.by_id(compare_id)

    raw_diffs = crud.compute_sample_diffs(db, task)
    va = crud.get_prompt_version(db, task.version_a_id)
    vb = crud.get_prompt_version(db, task.version_b_id)
    va_tag = va.version_tag if va else f"id{task.version_a_id}"
    vb_tag = vb.version_tag if vb else f"id{task.version_b_id}"

    summary = build_summary_from_diffs(raw_diffs)
    rows = []
    for d in raw_diffs:
        decision = d.get("decision") or "REVIEW_REQUIRED"
        rows.append({
            "sample_id": d["sample_id"],
            "source_ref": d["source_material_ref"],
            "prompt_version_a": va_tag,
            "prompt_version_b": vb_tag,
            "score_a": d["score_a"],
            "score_b": d["score_b"],
            "score_delta": d["score_delta"],
            "status_a": d["status_a"],
            "status_b": d["status_b"],
            "violations_a": ",".join(d["violations_a"] or []),
            "violations_b": ",".join(d["violations_b"] or []),
            "decision": decision,
            "decision_label": DECISION_LABEL.get(decision, "未审核"),
            "decision_flag": DECISION_EMOJI.get(decision, "[⚪]"),
            "reason": d.get("reason") or "",
        })

    valid, db_hash, combined_checksum = verify_export_consistency(db, task, raw_diffs)
    if checksum and not valid:
        raise InconsistentPayload("界面摘要计数与导出文件计数不一致，请重新生成对比任务")

    summary_block = build_compare_summary(db, task)

    if format == "json":
        body = {
            "compare_id": compare_id,
            "version_a": va_tag,
            "version_b": vb_tag,
            "consistency_flag": task.consistency_flag,
            "summary": summary_block,
            "summary_hash": db_hash,
            "checksum": combined_checksum,
            "samples": rows,
        }
        content = orjson.dumps(body, option=orjson.OPT_INDENT_2)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="compare-{compare_id}.json"',
                "x-summary-hash": db_hash,
                "x-export-checksum": combined_checksum,
            },
        )

    # CSV
    buf = io.StringIO()
    buf.write(f"# 提示词版本灰度对比导出报告\n")
    buf.write(f"# 对比任务ID: {compare_id}  版本A: {va_tag}  版本B: {vb_tag}\n")
    buf.write(f"# 一致性标识: {'安全规则一致' if task.consistency_flag else '⚠️ 安全规则版本不同'}\n")
    buf.write(f"# 摘要HASH: {db_hash}\n")
    buf.write(f"# 导出校验和: {combined_checksum}\n")
    dec = summary.get("decision_counts") or {}
    buf.write(
        f"# 决策统计: 可直接用(APPROVED)={dec.get('APPROVED', 0)}  待复核(REVIEW_REQUIRED)={dec.get('REVIEW_REQUIRED', 0)}  需重跑(RERUN)={dec.get('RERUN', 0)}  总计={summary.get('total_samples', 0)}\n"
    )
    buf.write("#\n")
    fieldnames = list(rows[0].keys()) if rows else [
        "sample_id","source_ref","prompt_version_a","prompt_version_b",
        "score_a","score_b","score_delta","status_a","status_b",
        "violations_a","violations_b","decision","decision_label","decision_flag","reason"
    ]
    w = csv.DictWriter(buf, fieldnames=fieldnames)
    w.writeheader()
    for r in rows:
        w.writerow(r)
    data = buf.getvalue().encode("utf-8-sig")
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="compare-{compare_id}.csv"',
            "x-summary-hash": db_hash,
            "x-export-checksum": combined_checksum,
        },
    )


@router.get("/{compare_id}/preview")
def preview_summary(compare_id: int, db: Session = Depends(get_db)):
    task = crud.get_gray_compare(db, compare_id)
    if not task:
        raise GrayCompareTaskNotFound.by_id(compare_id)
    summary = build_compare_summary(db, task)
    raw_diffs = crud.compute_sample_diffs(db, task)
    decision_counts = {"APPROVED": 0, "REVIEW_REQUIRED": 0, "RERUN": 0}
    for d in raw_diffs:
        k = d.get("decision") or "REVIEW_REQUIRED"
        decision_counts[k] = decision_counts.get(k, 0) + 1
    return {
        "compare_id": compare_id,
        "summary": summary,
        "decision_counts": decision_counts,
        "summary_hash": compute_summary_hash(db, task),
        "consistency_flag": task.consistency_flag,
    }
