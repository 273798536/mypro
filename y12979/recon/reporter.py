from __future__ import annotations

import os
from typing import Dict, List

from jinja2 import Environment, FileSystemLoader

from .models import ReconResult, ReconSession, ReconStatus, RollbackRecord


def _get_status_icon(status: ReconStatus) -> str:
    icons = {
        ReconStatus.MATCHED: "✓ 顺利",
        ReconStatus.PENDING: "? 待确认",
        ReconStatus.ANOMALY: "✗ 异常",
        ReconStatus.BLOCKED_DUPLICATE_MIGRATION: "⛔ 拦截",
    }
    return icons.get(status, "")


def generate_report(session: ReconSession, is_rerun: bool = False, run_count: int = 1) -> str:
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    env = Environment(loader=FileSystemLoader(template_dir), autoescape=True)
    template = env.get_template("report.html")

    stats = _compute_stats(session.results)
    wo_ids, txn_amounts, wo_amounts, status_labels = _build_amount_chart_data(session.results)

    context = {
        "session_id": session.session_id,
        "input_dir": session.input_dir,
        "output_dir": session.output_dir,
        "started_at": session.started_at,
        "fingerprint": session.input_fingerprint,
        "is_rerun": is_rerun,
        "run_count": run_count,
        "stats": stats,
        "results": session.results,
        "rollbacks": session.rollbacks,
        "data_dict_changes": session.data_dict_changes,
        "perm_audits": session.perm_audits,
        "wo_ids": wo_ids,
        "txn_amounts": txn_amounts,
        "wo_amounts": wo_amounts,
        "status_labels": status_labels,
    }
    return template.render(**context)


def write_report(output_dir: str, html_content: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    fpath = os.path.join(output_dir, "recon_report.html")
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(html_content)
    return fpath


def _compute_stats(results: List[ReconResult]) -> Dict[str, int]:
    stats = {"matched": 0, "pending": 0, "anomaly": 0, "blocked": 0}
    for r in results:
        if r.status == ReconStatus.MATCHED:
            stats["matched"] += 1
        elif r.status == ReconStatus.PENDING:
            stats["pending"] += 1
        elif r.status == ReconStatus.ANOMALY:
            stats["anomaly"] += 1
        elif r.status == ReconStatus.BLOCKED_DUPLICATE_MIGRATION:
            stats["blocked"] += 1
    return stats


def _build_amount_chart_data(results: List[ReconResult]):
    wo_ids = []
    txn_amounts = []
    wo_amounts = []
    status_labels = []
    for r in results:
        label = r.transaction.work_order_id or r.transaction.transaction_id
        if len(label) > 16:
            label = label[:14] + "…"
        wo_ids.append(label)
        txn_amounts.append(round(r.transaction.amount, 2))
        wo_amounts.append(round(r.work_order.expected_amount, 2) if r.work_order else 0)
        status_labels.append(_get_status_icon(r.status))
    return wo_ids, txn_amounts, wo_amounts, status_labels
