import os
import json
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import Counter

from .database import DatabaseManager
from .audit_engine import AuditResult, AuditEngine, AuditConclusion, SEVERITY_ORDER


TYPE_LABEL = {
    "pass": "通过",
    "fail": "不通过",
    "pending_confirmation": "待确认",
    "missing_feedback": "缺人工反馈",
    "skewed_evaluation": "评测偏科",
    "conflict": "结论冲突",
    "duplicate": "重复",
    "critical_error": "严重错误"
}

SEVERITY_LABEL = {
    "info": "信息",
    "warning": "警告",
    "error": "错误",
    "critical": "严重"
}

OVERALL_STATUS_ORDER = ["严重错误", "不通过", "缺人工反馈", "待确认", "评测偏科", "结论冲突", "通过"]


class ExportManager:
    def __init__(self, db: DatabaseManager, engine: AuditEngine):
        self.db = db
        self.engine = engine

    def _normalize_conclusion(self, c) -> Dict[str, Any]:
        if isinstance(c, AuditConclusion):
            detail = c.detail if isinstance(c.detail, dict) else {"raw": c.detail}
            return {
                "conclusion_id": c.conclusion_id,
                "material_pair_key": c.material_pair_key,
                "training_material_id": c.training_material_id,
                "evaluation_material_id": c.evaluation_material_id,
                "conclusion_type": c.conclusion_type,
                "severity": c.severity,
                "summary": c.summary,
                "detail_json": json.dumps(c.detail, ensure_ascii=False),
                "actionable_items_json": json.dumps(c.actionable_items, ensure_ascii=False),
                "created_at": c.created_at,
                "training_file": detail.get("training_file"),
                "evaluation_file": detail.get("evaluation_file"),
            }
        return c

    def _build_unified_payload(self, run_id: str,
                               summary: Optional[Dict[str, Any]] = None,
                               conclusions: Optional[List[Any]] = None) -> Dict[str, Any]:
        if summary is None or conclusions is None:
            with self.db._get_conn() as conn:
                run_row = conn.execute(
                    "SELECT r.*, t.batch_name as training_name, t.batch_id as t_bid, "
                    "e.batch_name as evaluation_name, e.batch_id as e_bid "
                    "FROM audit_runs r "
                    "JOIN batches t ON r.training_batch_id = t.batch_id "
                    "JOIN batches e ON r.evaluation_batch_id = e.batch_id "
                    "WHERE r.run_id=?",
                    (run_id,)
                ).fetchone()
                if not run_row:
                    raise ValueError(f"Run not found: {run_id}")
                run = dict(run_row)
            fetched_conclusions = self.engine.get_run_conclusions(run_id, only_latest=True)
            by_type = Counter(c["conclusion_type"] for c in fetched_conclusions)
            by_severity = Counter(c["severity"] for c in fetched_conclusions)
            total = len(fetched_conclusions)
            pass_count = by_type.get("pass", 0)
            overall_parts = []
            for t in ("critical_error", "fail", "missing_feedback",
                      "pending_confirmation", "skewed_evaluation", "pass"):
                c = by_type.get(t, 0)
                if c or t == "pass":
                    overall_parts.append(f"{TYPE_LABEL.get(t, t)} {c} 项")
            overall_status = "待确认" if any(
                by_type.get(t, 0) > 0 for t in (
                    "critical_error", "fail", "missing_feedback",
                    "pending_confirmation", "skewed_evaluation"
                )
            ) else "通过"
            overall = f"【总体结论：{overall_status}】" + "；".join(overall_parts) + f"；共审计 {total} 对材料。"
            summary = {
                "run_id": run_id,
                "training_batch": run["training_name"],
                "training_batch_id": run["t_bid"],
                "evaluation_batch": run["evaluation_name"],
                "evaluation_batch_id": run["e_bid"],
                "run_at": run["run_at"],
                "input_dir": run["input_dir"],
                "output_dir": run["output_dir"],
                "status": run["status"],
                "total": total,
                "overall": overall,
                "overall_status": overall_status,
                "by_type": dict(by_type),
                "by_severity": dict(by_severity),
                "pass_rate": round(pass_count / total, 4) if total else 0.0,
                "errors": []
            }
            conclusions = fetched_conclusions
        payload_conclusions = []
        for raw_c in conclusions:
            c = self._normalize_conclusion(raw_c)
            detail = {}
            if c.get("detail_json"):
                try:
                    detail = json.loads(c["detail_json"])
                except (json.JSONDecodeError, TypeError):
                    detail = {"raw": c["detail_json"]}
            actionables = []
            if c.get("actionable_items_json"):
                try:
                    actionables = json.loads(c["actionable_items_json"])
                except (json.JSONDecodeError, TypeError):
                    actionables = [c["actionable_items_json"]]
            payload_conclusions.append({
                "conclusion_id": c["conclusion_id"],
                "material_pair_key": c["material_pair_key"],
                "conclusion_type": c["conclusion_type"],
                "conclusion_type_label": TYPE_LABEL.get(c["conclusion_type"], c["conclusion_type"]),
                "severity": c["severity"],
                "severity_label": SEVERITY_LABEL.get(c["severity"], c["severity"]),
                "summary": c["summary"],
                "training_file": c.get("training_file"),
                "evaluation_file": c.get("evaluation_file"),
                "detail": detail,
                "actionable_items": actionables,
                "created_at": c.get("created_at")
            })
        payload_conclusions.sort(
            key=lambda x: (
                SEVERITY_ORDER.get(x["severity"], 99),
                x["conclusion_type"],
                x["material_pair_key"]
            )
        )
        return {"summary": summary, "conclusions": payload_conclusions}

    def render_console_summary(self, payload: Dict[str, Any]) -> str:
        s = payload["summary"]
        lines = [
            "=" * 70,
            f"审计运行ID: {s['run_id']}",
            f"运行时间  : {s.get('run_at', '')}",
            f"训练批次  : {s.get('training_batch', '')} ({s.get('training_batch_id', '')})",
            f"评测批次  : {s.get('evaluation_batch', '')} ({s.get('evaluation_batch_id', '')})",
            f"运行状态  : {s.get('status', '')}",
            "-" * 70,
            s["overall"],
            f"通过率    : {s.get('pass_rate', 0) * 100:.1f}% ({s.get('by_type', {}).get('pass', 0)}/{s.get('total', 0)})",
            "",
            "按类型分布:"
        ]
        for t, c in sorted(s.get("by_type", {}).items()):
            lines.append(f"  - {TYPE_LABEL.get(t, t):<8}: {c}")
        lines.append("按严重程度分布:")
        for sev, c in sorted(s.get("by_severity", {}).items()):
            lines.append(f"  - {SEVERITY_LABEL.get(sev, sev):<4}: {c}")
        lines.append("")
        lines.append("审计结论明细（前10条，完整内容请导出文件）:")
        for i, c in enumerate(payload["conclusions"][:10]):
            sev_tag = f"[{c['severity_label']}]"
            type_tag = f"[{c['conclusion_type_label']}]"
            lines.append(f"  {i + 1:>2}. {sev_tag}{type_tag} {c['summary']}")
            if c["actionable_items"]:
                lines.append(f"      建议: {c['actionable_items'][0]}")
        if len(payload["conclusions"]) > 10:
            lines.append(f"  ... 另有 {len(payload['conclusions']) - 10} 条结论略")
        lines.append("=" * 70)
        return "\n".join(lines)

    def export_json(self, payload: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return output_path

    def export_csv(self, payload: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            s = payload["summary"]
            writer.writerow(["# 模型卡生成审计 - 总体摘要"])
            writer.writerow(["总体结论", s["overall_status"]])
            writer.writerow(["审计运行ID", s["run_id"]])
            writer.writerow(["运行时间", s.get("run_at", "")])
            writer.writerow(["训练批次", s.get("training_batch", "")])
            writer.writerow(["评测批次", s.get("evaluation_batch", "")])
            writer.writerow(["通过率", f"{s.get('pass_rate', 0) * 100:.1f}%"])
            writer.writerow(["结论总数", s.get("total", 0)])
            for t, c in s.get("by_type", {}).items():
                writer.writerow([f"分布-{TYPE_LABEL.get(t, t)}", c])
            writer.writerow([])
            writer.writerow([
                "# 序号", "结论ID", "严重程度", "结论类型",
                "训练材料", "评测材料", "摘要", "可操作建议"
            ])
            for i, c in enumerate(payload["conclusions"], 1):
                writer.writerow([
                    i, c["conclusion_id"], c["severity_label"], c["conclusion_type_label"],
                    c.get("training_file") or "",
                    c.get("evaluation_file") or "",
                    c["summary"],
                    " | ".join(c["actionable_items"])
                ])
        return output_path

    def export_markdown(self, payload: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        s = payload["summary"]
        lines = [
            "# 模型卡生成审计报告",
            "",
            f"**运行ID**: `{s['run_id']}`  ",
            f"**运行时间**: {s.get('run_at', '')}  ",
            f"**训练批次**: {s.get('training_batch', '')} (`{s.get('training_batch_id', '')}`)  ",
            f"**评测批次**: {s.get('evaluation_batch', '')} (`{s.get('evaluation_batch_id', '')}`)  ",
            "",
            "## 总体结论",
            "",
            f"> **{s['overall_status']}** — 通过率 {s.get('pass_rate', 0) * 100:.1f}% "
            f"({s.get('by_type', {}).get('pass', 0)}/{s.get('total', 0)})",
            "",
            s["overall"],
            "",
            "### 按类型分布",
            "",
            "| 类型 | 数量 |",
            "|------|------|",
        ]
        for t, c in sorted(s.get("by_type", {}).items()):
            lines.append(f"| {TYPE_LABEL.get(t, t)} | {c} |")
        lines.extend([
            "",
            "### 按严重程度",
            "",
            "| 严重程度 | 数量 |",
            "|----------|------|",
        ])
        for sev, c in sorted(s.get("by_severity", {}).items()):
            lines.append(f"| {SEVERITY_LABEL.get(sev, sev)} | {c} |")
        lines.extend([
            "",
            "## 审计结论明细",
            "",
            "| # | 严重 | 类型 | 训练材料 | 评测材料 | 摘要 |",
            "|---|------|------|----------|----------|------|",
        ])
        for i, c in enumerate(payload["conclusions"], 1):
            lines.append(
                f"| {i} | {c['severity_label']} | {c['conclusion_type_label']} | "
                f"{c.get('training_file') or '-'} | "
                f"{c.get('evaluation_file') or '-'} | {c['summary']} |"
            )
            if c["actionable_items"]:
                lines.append("")
                for item in c["actionable_items"]:
                    lines.append(f"> 💡 {item}")
                lines.append("")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return output_path

    def export_all(self, run_id: str, output_dir: str,
                   summary: Optional[Dict[str, Any]] = None,
                   conclusions_result: Optional[AuditResult] = None) -> Dict[str, str]:
        conclusions = None
        if conclusions_result is not None:
            conclusions = conclusions_result.conclusions
        payload = self._build_unified_payload(run_id, summary, conclusions)
        os.makedirs(output_dir, exist_ok=True)
        paths = {
            "console": self.render_console_summary(payload),
            "json": self.export_json(payload, os.path.join(output_dir, f"audit_{run_id}.json")),
            "csv": self.export_csv(payload, os.path.join(output_dir, f"audit_{run_id}.csv")),
            "md": self.export_markdown(payload, os.path.join(output_dir, f"audit_{run_id}.md")),
        }
        return paths
