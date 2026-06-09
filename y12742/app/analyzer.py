from typing import List, Dict, Any, Optional
from . import db
from .calculator import list_drafts, get_draft, get_teams, get_params


def error_analysis(batch_id: int) -> Dict[str, Any]:
    drafts = list_drafts(batch_id)
    params = get_params(batch_id)
    if not drafts:
        return {"count": 0}

    total = len(drafts)
    warnings = [d for d in drafts if d.get("is_warning")]
    errors = [d["error_magnitude"] for d in drafts if d["error_magnitude"] is not None]
    stability = [d["stability_index"] for d in drafts if d["stability_index"] is not None]
    deltas = [d["rank_delta"] for d in drafts if d["rank_delta"] is not None]

    avg_err = sum(errors) / len(errors) if errors else 0.0
    max_err = max(errors) if errors else 0.0
    avg_stab = sum(stability) / len(stability) if stability else 0.0
    min_stab = min(stability) if stability else 0.0
    avg_delta = sum(abs(d) for d in deltas) / len(deltas) if deltas else 0.0
    max_delta = max(abs(d) for d in deltas) if deltas else 0

    runs = db.list_runs(batch_id)
    return {
        "batch_id": batch_id,
        "count": total,
        "warning_count": len(warnings),
        "warning_ratio": len(warnings) / total if total else 0.0,
        "avg_error_magnitude": avg_err,
        "max_error_magnitude": max_err,
        "avg_stability_index": avg_stab,
        "min_stability_index": min_stab,
        "avg_rank_delta_abs": avg_delta,
        "max_rank_delta_abs": max_delta,
        "threshold": params.get("warning_error_threshold", 0.15),
        "params": params,
        "warnings": warnings,
        "runs": runs,
    }


def trace_draft(draft_id: int) -> Dict[str, Any]:
    draft = get_draft(draft_id)
    if not draft:
        raise ValueError(f"草稿 {draft_id} 不存在")
    batch_id = draft["batch_id"]
    runs = db.list_runs(batch_id)
    params = get_params(batch_id)
    return {
        "draft": draft,
        "params": params,
        "runs": runs,
        "source_team": {
            "team_name": draft["team_name"],
            "raw_score": draft["raw_score"],
            "raw_rank": draft["raw_rank"],
        },
        "calc_trace": {
            "adjusted_score": draft["adjusted_score"],
            "adjusted_rank": draft["adjusted_rank"],
            "stability_index": draft["stability_index"],
            "rank_delta": draft["rank_delta"],
            "error_magnitude": draft["error_magnitude"],
            "is_warning": bool(draft["is_warning"]),
            "warning_reason": draft["warning_reason"],
            "calc_note": draft["calc_note"],
        },
        "review": {
            "status": draft.get("review_status"),
            "reviewer": draft.get("reviewer"),
            "opinion": draft.get("review_opinion"),
            "reviewed_at": draft.get("reviewed_at"),
        },
    }


def explain_error(batch_id: int) -> str:
    ana = error_analysis(batch_id)
    lines = []
    lines.append(f"批次 {batch_id} 误差与稳定性解释")
    lines.append("=" * 60)
    lines.append(f"队伍数: {ana.get('count', 0)}")
    lines.append(f"警告阈值: {ana.get('threshold', 0.15)}")
    lines.append(f"警告记录数: {ana.get('warning_count', 0)} ({ana.get('warning_ratio', 0):.2%})")
    lines.append(f"平均误差幅度: {ana.get('avg_error_magnitude', 0):.4f}")
    lines.append(f"最大误差幅度: {ana.get('max_error_magnitude', 0):.4f}")
    lines.append(f"平均稳定性指数: {ana.get('avg_stability_index', 0):.4f}")
    lines.append(f"最低稳定性指数: {ana.get('min_stability_index', 0):.4f}")
    lines.append(f"平均排名波动(绝对值): {ana.get('avg_rank_delta_abs', 0):.2f}")
    lines.append(f"最大排名波动(绝对值): {ana.get('max_rank_delta_abs', 0)}")
    lines.append("")
    lines.append("警告记录明细:")
    for w in ana.get("warnings", [])[:20]:
        lines.append(
            f"  - draft_id={w['id']} {w['team_name']}: "
            f"原始排名={w['raw_rank']}→调整后={w['adjusted_rank']} "
            f"(delta={w['rank_delta']}), 误差={w['error_magnitude']:.4f}, "
            f"稳定性={w['stability_index']:.4f}, 状态={w.get('review_status')}"
        )
    lines.append("")
    lines.append("参数表:")
    for k, v in ana.get("params", {}).items():
        lines.append(f"  - {k} = {v}")
    return "\n".join(lines)
