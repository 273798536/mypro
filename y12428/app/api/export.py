from __future__ import annotations
import csv
import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.store.memory import store
from app.models.split import SplitStatus
from app.models.history import HistoryEntry
from app.report.human_readable import generate_human_readable_report


router = APIRouter(prefix="/export", tags=["报表导出"])


@router.get("/splits.csv", summary="导出分账明细CSV")
def export_splits_csv(
    school_id: Optional[str] = Query(None),
    status: Optional[SplitStatus] = Query(None),
):
    splits = store.list_splits()
    if school_id:
        splits = [s for s in splits if any(it.school_id == school_id for it in s.items)]
    if status:
        splits = [s for s in splits if s.status == status]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "分账ID", "选课记录ID", "协议ID", "协议版本",
        "学校ID", "角色", "费用类型", "金额", "方向", "规则来源",
        "总金额", "状态", "证据缺口", "创建时间",
    ])

    for sp in splits:
        gaps_str = "; ".join(sp.evidence_gaps) if sp.evidence_gaps else ""
        for item in sp.items:
            writer.writerow([
                sp.id, sp.enrollment_id, sp.agreement_id, sp.agreement_version,
                item.school_id, item.role, item.fee_type, item.amount,
                item.direction, item.rule_source,
                sp.total_amount, sp.status.value, gaps_str,
                sp.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ])

    output.seek(0)
    filename = f"split-details-{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/report", summary="导出人话报告(非技术人员可读)")
def export_human_readable_report(
    split_id: Optional[str] = Query(None, description="指定分账ID，不填则生成全量报告"),
):
    if split_id:
        sp = store.get_split(split_id)
        if not sp:
            return {"error": f"分账明细 {split_id} 不存在"}
        splits = [sp]
    else:
        splits = store.list_splits()

    report = generate_human_readable_report(splits)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="split",
            entity_id=split_id or "bulk",
            action="export_report",
            operator="system",
            remark=f"导出人话报告，包含 {len(splits)} 条分账明细",
        )
    )

    return {
        "report": report,
        "generated_at": datetime.now().isoformat(),
        "split_count": len(splits),
    }


@router.get("/report/plain", summary="导出纯文本人话报告")
def export_plain_text_report(
    split_id: Optional[str] = Query(None),
):
    if split_id:
        sp = store.get_split(split_id)
        if not sp:
            return {"error": f"分账明细 {split_id} 不存在"}
        splits = [sp]
    else:
        splits = store.list_splits()

    report = generate_human_readable_report(splits)
    filename = f"alliance-split-report-{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
    return StreamingResponse(
        iter([report]),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
