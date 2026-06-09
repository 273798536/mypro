import csv
import os
from datetime import datetime
from typing import Dict, Any, Optional
from . import db
from .calculator import list_drafts, get_params
from .analyzer import error_analysis, explain_error


def _safe_tag(tag: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in (tag or "batch"))


def _output_dir() -> str:
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
    os.makedirs(d, exist_ok=True)
    return d


def export_report(batch_id: int, output_dir: Optional[str] = None) -> Dict[str, Any]:
    batch = db.get_batch(batch_id)
    if not batch:
        raise ValueError(f"批次 {batch_id} 不存在")
    drafts = list_drafts(batch_id)
    if not drafts:
        raise ValueError(f"批次 {batch_id} 尚无计算草稿，请先运行计算")
    params = get_params(batch_id)
    ana = error_analysis(batch_id)

    tag = _safe_tag(batch["batch_tag"])
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = output_dir or _output_dir()
    os.makedirs(base_dir, exist_ok=True)

    csv_name = f"rank_stability_{tag}_{ts}.csv"
    csv_path = os.path.join(base_dir, csv_name)
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "draft_id", "team_name", "raw_score", "raw_rank",
            "adjusted_score", "adjusted_rank", "stability_index",
            "rank_delta", "error_magnitude", "is_warning", "warning_reason",
            "review_status", "reviewer", "review_opinion", "calc_note"
        ])
        for d in drafts:
            writer.writerow([
                d["id"], d["team_name"], d["raw_score"], d["raw_rank"],
                d["adjusted_score"], d["adjusted_rank"], d["stability_index"],
                d["rank_delta"], d["error_magnitude"],
                "是" if d["is_warning"] else "否",
                d.get("warning_reason") or "",
                d.get("review_status") or "pending",
                d.get("reviewer") or "",
                d.get("review_opinion") or "",
                d.get("calc_note") or "",
            ])

    params_name = f"params_{tag}_{ts}.csv"
    params_path = os.path.join(base_dir, params_name)
    with open(params_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["param_key", "param_value", "description"])
        for k, v in params.items():
            writer.writerow([k, v, ""])

    txt_name = f"report_{tag}_{ts}.txt"
    txt_path = os.path.join(base_dir, txt_name)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"赛事积分排名稳定性 - 批次报告\n")
        f.write(f"批次标签: {batch['batch_tag']}\n")
        f.write(f"批次ID: {batch['id']}\n")
        f.write(f"创建时间: {batch['created_at']}\n")
        f.write(f"源文件: {batch.get('source_file') or '-'}\n")
        f.write(f"备注: {batch.get('remark') or '-'}\n")
        f.write(f"报告生成时间: {datetime.now().isoformat(timespec='seconds')}\n")
        f.write("\n" + "=" * 60 + "\n")
        f.write(explain_error(batch_id))
        f.write("\n" + "=" * 60 + "\n")
        f.write("处理痕迹 (run_records):\n")
        for r in ana.get("runs", []):
            f.write(
                f"  [{r['created_at']}] phase={r['phase']} operator={r.get('operator') or '-'} "
                f"detail={r.get('detail') or ''}\n"
            )

    db.log_run(batch_id, "export_report", detail=f"files={csv_name}, {params_name}, {txt_name}")
    return {
        "csv": csv_path,
        "params_csv": params_path,
        "report_txt": txt_path,
        "batch_tag": tag,
        "timestamp": ts,
    }
