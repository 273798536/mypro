"""
历史变更追踪
==============
人工确认前后的变化写入 JSONL，评审会开始前复盘时可以按时间顺序回放，
解释给算法值班人"当时发生了什么、谁改了什么、为什么"。
"""
import os
import json
import datetime
from typing import Dict, List, Optional


def _now_iso() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _log_path(output_dir: str, filename: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    return os.path.join(output_dir, filename)


def append_run_log(result: Dict, output_dir: str, filename: str) -> str:
    """每次验算运行写一条日志，包含：时间、参数快照、异常点、校验结果摘要。"""
    entry = {
        "event": "verify_run",
        "timestamp": _now_iso(),
        "param_version": result["params_snapshot"]["param_version"],
        "params_snapshot": result["params_snapshot"],
        "total_records": len(result["current"]),
        "outlier_keys": result["outlier_keys"],
        "outlier_count": len(result["outlier_keys"]),
        "failed_keys": result["failed_keys"],
        "failed_count": len(result["failed_keys"]),
    }
    path = _log_path(output_dir, filename)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return path


def append_manual_review(
    output_dir: str,
    filename: str,
    reviewer: str,
    combo_key: str,
    decision: str,
    before: Dict,
    after: Dict,
    explanation: str,
) -> str:
    """
    人工确认一条记录时调用。把确认前后变化写进历史，评审会复盘可回放。
    - decision: "accepted_outlier" / "revised_count" / "ignored_old_answer" 等
    - before / after: 变更前后的关键值（历史计数、当前计数、口径等）
    """
    entry = {
        "event": "manual_review",
        "timestamp": _now_iso(),
        "reviewer": reviewer,
        "combo_key": combo_key,
        "decision": decision,
        "before": before,
        "after": after,
        "explanation": explanation,
    }
    path = _log_path(output_dir, filename)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return path


def read_history(output_dir: str, filename: str) -> List[Dict]:
    """读取全部历史，评审会前复盘时调用。"""
    path = _log_path(output_dir, filename)
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def summarize_history(rows: List[Dict]) -> str:
    """把历史整理成人类可读摘要，方便在评审会上解释给算法值班人。"""
    if not rows:
        return "(无历史记录)"
    runs = [r for r in rows if r.get("event") == "verify_run"]
    reviews = [r for r in rows if r.get("event") == "manual_review"]
    lines = [
        f"历史变更摘要：共 {len(runs)} 次验算运行，{len(reviews)} 次人工确认",
        "---- 验算运行 ----",
    ]
    for r in runs[-10:]:
        lines.append(
            f"  [{r['timestamp']}] param={r['param_version']} "
            f"outliers={r['outlier_count']}({r['outlier_keys']}) "
            f"failed={r['failed_count']}({r['failed_keys']})"
        )
    lines.append("---- 人工确认 ----")
    for r in reviews[-10:]:
        lines.append(
            f"  [{r['timestamp']}] reviewer={r['reviewer']} "
            f"combo_key={r['combo_key']} decision={r['decision']} "
            f"explanation={r['explanation']}"
        )
    return "\n".join(lines)
