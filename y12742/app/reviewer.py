from typing import List, Dict, Any, Optional
from datetime import datetime
from . import db
from .calculator import list_drafts, get_draft

VALID_STATUSES = {"pending", "reviewing", "approved", "rejected"}
STATUS_FLOW = {
    "pending": ["reviewing", "approved", "rejected"],
    "reviewing": ["approved", "rejected", "pending"],
    "approved": ["reviewing", "rejected"],
    "rejected": ["reviewing", "pending", "approved"],
}


def _check_flow(from_status: str, to_status: str) -> bool:
    return to_status in STATUS_FLOW.get(from_status, [])


def update_review(
    draft_id: int,
    status: str,
    reviewer: str = "TA",
    opinion: str = ""
) -> Dict[str, Any]:
    if status not in VALID_STATUSES:
        raise ValueError(f"无效状态: {status}, 可选: {VALID_STATUSES}")
    conn = db.get_conn()
    try:
        row = conn.execute(
            "SELECT r.status, d.batch_id FROM reviews r JOIN calc_drafts d ON d.id=r.draft_id WHERE r.draft_id=?",
            (draft_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"草稿 {draft_id} 不存在或未创建复核记录")
        old_status = row["status"]
        batch_id = row["batch_id"]
        if not _check_flow(old_status, status):
            raise ValueError(f"状态流转非法: {old_status} -> {status}")
        conn.execute(
            "UPDATE reviews SET status=?, reviewer=?, review_opinion=?, reviewed_at=? WHERE draft_id=?",
            (status, reviewer, opinion, datetime.now().isoformat(timespec="seconds"), draft_id)
        )
        conn.commit()
        db.log_run(
            batch_id, "update_review",
            detail=f"draft_id={draft_id}: {old_status} -> {status}, reviewer={reviewer}"
        )
        return {"draft_id": draft_id, "old_status": old_status, "new_status": status}
    finally:
        conn.close()


def batch_update_review(
    draft_ids: List[int],
    status: str,
    reviewer: str = "TA",
    opinion: str = ""
) -> List[Dict[str, Any]]:
    results = []
    for did in draft_ids:
        try:
            results.append(update_review(did, status, reviewer=reviewer, opinion=opinion))
        except Exception as e:
            results.append({"draft_id": did, "error": str(e)})
    return results


def batch_approve_warnings(
    batch_id: int,
    reviewer: str = "TA",
    opinion: str = ""
) -> List[Dict[str, Any]]:
    warnings = [d for d in list_drafts(batch_id) if d.get("is_warning")]
    return batch_update_review(
        [d["id"] for d in warnings], "reviewing",
        reviewer=reviewer,
        opinion=opinion or "进入复核流程（原因为异常/误差过大）"
    )


def batch_approve_all(batch_id: int, reviewer: str = "TA") -> List[Dict[str, Any]]:
    drafts = list_drafts(batch_id)
    return batch_update_review(
        [d["id"] for d in drafts], "approved",
        reviewer=reviewer, opinion="整批通过"
    )


def get_review_summary(batch_id: int) -> Dict[str, int]:
    drafts = list_drafts(batch_id)
    summary = {s: 0 for s in VALID_STATUSES}
    for d in drafts:
        s = d.get("review_status") or "pending"
        summary[s] = summary.get(s, 0) + 1
    return summary
