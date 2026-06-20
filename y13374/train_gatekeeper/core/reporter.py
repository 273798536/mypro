import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime

from .models import (
    EvalResult,
    GateState,
    GateDecision,
    Sample,
    Note,
    ParamSnapshot,
)


class ReportGenerator:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.exports_dir = os.path.join(data_dir, "exports")
        self.exceptions_dir = os.path.join(data_dir, "exceptions")
        os.makedirs(self.exports_dir, exist_ok=True)
        os.makedirs(self.exceptions_dir, exist_ok=True)

    def generate_report(
        self,
        result: EvalResult,
        state: GateState,
        samples: Optional[List[Sample]] = None,
        format: str = "json",
    ) -> str:
        report_data = self._build_report_data(result, state, samples)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gatekeeper_report_{result.run_id}_{timestamp}.{format}"
        filepath = os.path.join(self.exports_dir, filename)

        if format == "json":
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
        elif format == "txt":
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(self._format_text_report(report_data))
        elif format == "html":
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(self._format_html_report(report_data))
        else:
            raise ValueError(f"不支持的报告格式: {format}")

        latest_path = os.path.join(self.exports_dir, "latest_report.json")
        with open(latest_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        if samples and result.fail_samples:
            self._export_fail_samples(samples, result)

        if samples and result.boundary_samples:
            self._export_boundary_samples(samples, result)

        return filepath

    def _build_report_data(
        self,
        result: EvalResult,
        state: GateState,
        samples: Optional[List[Sample]] = None,
    ) -> Dict[str, Any]:
        report = {
            "report_version": "1.0",
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "summary": {
                "run_id": result.run_id,
                "decision": result.decision.value,
                "decision_cn": self._decision_cn(result.decision),
                "accuracy": result.accuracy,
                "accuracy_pct": f"{result.accuracy * 100:.2f}%",
                "total_samples": result.total_samples,
                "correct_samples": result.correct_samples,
                "fail_samples_count": len(result.fail_samples),
                "created_at": result.created_at,
            },
            "params": {
                "current": state.current_params.__dict__,
                "snapshot_id": result.param_snapshot_id,
                "param_errors": result.param_errors,
            },
            "param_changes": self._get_param_changes(state),
            "attribution": [a.to_dict() for a in result.attributions],
            "misjudge_explanations": [m.to_dict() for m in result.misjudge_explanations],
            "sample_breakdown": {
                "total": result.total_samples,
                "current": result.total_samples - len(result.old_queue_samples) - len(result.boundary_samples) - len(result.misjudge_samples),
                "old_queue": len(result.old_queue_samples),
                "boundary": len(result.boundary_samples),
                "misjudge": len(result.misjudge_samples),
            },
            "fail_samples": result.fail_samples,
            "next_steps": result.next_steps,
            "notes": [n.to_dict() for n in state.notes],
            "history": {
                "param_snapshots": len(state.param_history),
                "total_notes": len(state.notes),
            },
        }

        if samples:
            report["sample_details"] = self._build_sample_details(samples, result)

        return report

    def _get_param_changes(self, state: GateState) -> List[Dict[str, Any]]:
        if len(state.param_history) < 2:
            return []

        changes_list = []
        for i in range(1, len(state.param_history)):
            prev = state.param_history[i - 1]
            curr = state.param_history[i]
            prev_dict = prev.params.__dict__
            curr_dict = curr.params.__dict__

            diffs = []
            for key in sorted(set(prev_dict.keys()) | set(curr_dict.keys())):
                if prev_dict.get(key) != curr_dict.get(key):
                    diffs.append({
                        "param": key,
                        "old": prev_dict.get(key),
                        "new": curr_dict.get(key),
                    })

            if diffs:
                changes_list.append({
                    "from_snapshot": prev.snapshot_id,
                    "to_snapshot": curr.snapshot_id,
                    "changed_at": curr.created_at,
                    "reason": curr.reason,
                    "changes": diffs,
                })

        return changes_list

    def _build_sample_details(
        self, samples: List[Sample], result: EvalResult
    ) -> List[Dict[str, Any]]:
        sample_map = {s.sample_id: s for s in samples}
        details = []

        for sid in result.fail_samples:
            s = sample_map.get(sid)
            if s:
                details.append({
                    "sample_id": s.sample_id,
                    "content": s.content,
                    "expected_label": s.expected_label,
                    "predicted_label": s.predicted_label,
                    "score": s.score,
                    "source": s.source.value,
                    "is_boundary": s.is_boundary,
                    "is_correct": s.is_correct(),
                })

        return details

    def _decision_cn(self, decision: GateDecision) -> str:
        mapping = {
            GateDecision.PASS: "通过",
            GateDecision.FAIL: "失败",
            GateDecision.WARNING: "警戒",
        }
        return mapping.get(decision, decision.value)

    def _format_text_report(self, report: Dict[str, Any]) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("  训练队列上线守门 评测报告")
        lines.append("=" * 60)
        lines.append("")

        s = report["summary"]
        lines.append(f"【评测结论】 {s['decision_cn']} ({s['decision']})")
        lines.append(f"【运行编号】 {s['run_id']}")
        lines.append(f"【评测时间】 {s['created_at']}")
        lines.append(f"【准确数量】 {s['correct_samples']} / {s['total_samples']}")
        lines.append(f"【准确率】   {s['accuracy_pct']}")
        lines.append("")

        if report["params"]["param_errors"]:
            lines.append("-" * 40)
            lines.append("【参数错误】")
            for i, err in enumerate(report["params"]["param_errors"], 1):
                lines.append(f"  {i}. {err}")
            lines.append("")

        if report["param_changes"]:
            lines.append("-" * 40)
            lines.append("【参数变更历史】")
            for change in report["param_changes"]:
                lines.append(f"  变更时间: {change['changed_at']}")
                if change["reason"]:
                    lines.append(f"  变更原因: {change['reason']}")
                for c in change["changes"]:
                    lines.append(f"    - {c['param']}: {c['old']} → {c['new']}")
                lines.append("")

        lines.append("-" * 40)
        lines.append("【样本构成】")
        sb = report["sample_breakdown"]
        lines.append(f"  总样本数: {sb['total']}")
        lines.append(f"  当前队列: {sb['current']}")
        lines.append(f"  旧版队列: {sb['old_queue']}")
        lines.append(f"  边界样本: {sb['boundary']}")
        lines.append(f"  误判样本: {sb['misjudge']}")
        lines.append("")

        if report["attribution"]:
            lines.append("-" * 40)
            lines.append("【归因分析】")
            for attr in report["attribution"]:
                impact = "影响结论" if attr["impact_decision"] else "不影响结论"
                lines.append(f"  [{attr['factor']}] {impact}")
                lines.append(f"    准确率影响: {attr['impact_accuracy']*100:+.2f} 个百分点")
                lines.append(f"    {attr['description']}")
                if attr["affected_samples"]:
                    lines.append(f"    受影响样本数: {len(attr['affected_samples'])}")
                lines.append("")

        if report["misjudge_explanations"]:
            lines.append("-" * 40)
            lines.append("【旧误判样本解释】")
            for i, m in enumerate(report["misjudge_explanations"], 1):
                status = "已改正" if m["changed_correct"] else "未改正"
                lines.append(f"  {i}. 样本 {m['sample_id']} [{status}]")
                lines.append(f"     预期: {m['expected']}")
                lines.append(f"     旧预测: {m['old_predicted']}  →  新预测: {m['new_predicted']}")
                if m["score_change"] is not None:
                    lines.append(f"     置信度变化: {m['score_change']:+.4f}")
                lines.append(f"     {m['reason']}")
                lines.append("")

        if report["fail_samples"]:
            lines.append("-" * 40)
            lines.append(f"【失败样本列表】共 {len(report['fail_samples'])} 个")
            lines.append(f"  失败样本ID: {', '.join(report['fail_samples'][:20])}")
            if len(report["fail_samples"]) > 20:
                lines.append(f"  ... 还有 {len(report['fail_samples']) - 20} 个")
            lines.append("")

        if report["next_steps"]:
            lines.append("-" * 40)
            lines.append("【下一步操作】")
            for i, step in enumerate(report["next_steps"], 1):
                lines.append(f"  {i}. {step}")
            lines.append("")

        if report["notes"]:
            lines.append("-" * 40)
            lines.append(f"【历史备注】共 {len(report['notes'])} 条")
            for n in report["notes"][-5:]:
                lines.append(f"  [{n['note_type']}] {n['author']} @ {n['created_at']}")
                lines.append(f"    {n['content']}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("报告结束")
        lines.append("=" * 60)

        return "\n".join(lines)

    def _format_html_report(self, report: Dict[str, Any]) -> str:
        s = report["summary"]
        decision_color = {
            "pass": "#22c55e",
            "fail": "#ef4444",
            "warning": "#f59e0b",
        }.get(s["decision"], "#6b7280")

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>训练队列上线守门报告 - {s['run_id']}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; background: #f8fafc; }}
  .container {{ max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
  h1 {{ color: #1e293b; margin-top: 0; }}
  .decision-badge {{ display: inline-block; padding: 8px 16px; border-radius: 6px; color: white; font-weight: bold; background: {decision_color}; }}
  .section {{ margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
  .section h2 {{ color: #334155; font-size: 18px; }}
  .metric-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }}
  .metric-card {{ background: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; }}
  .metric-value {{ font-size: 24px; font-weight: bold; color: #1e293b; }}
  .metric-label {{ color: #64748b; font-size: 14px; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
  th {{ background: #f1f5f9; font-weight: 600; }}
  .step-item {{ padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }}
  .note-item {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 4px; }}
  .next-steps {{ background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; }}
</style>
</head>
<body>
<div class="container">
  <h1>训练队列上线守门 评测报告</h1>
  <p><span class="decision-badge">{s['decision_cn']}</span></p>
  <p>运行编号: <code>{s['run_id']}</code> | 评测时间: {s['created_at']}</p>

  <div class="section">
    <h2>核心指标</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">{s['accuracy_pct']}</div>
        <div class="metric-label">准确率</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{s['correct_samples']} / {s['total_samples']}</div>
        <div class="metric-label">正确 / 总数</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{len(report['fail_samples'])}</div>
        <div class="metric-label">失败样本</div>
      </div>
    </div>
  </div>
"""

        if report["params"]["param_errors"]:
            html += """
  <div class="section">
    <h2>参数错误</h2>
    <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:12px;border-radius:4px;">
"""
            for err in report["params"]["param_errors"]:
                html += f"<p>{err}</p>\n"
            html += "    </div>\n  </div>\n"

        if report["param_changes"]:
            html += """
  <div class="section">
    <h2>参数变更历史</h2>
"""
            for change in report["param_changes"]:
                html += f"<p><strong>{change['changed_at']}</strong>"
                if change["reason"]:
                    html += f" - {change['reason']}"
                html += "</p>\n<table>\n<tr><th>参数</th><th>旧值</th><th>新值</th></tr>\n"
                for c in change["changes"]:
                    html += f"<tr><td>{c['param']}</td><td>{c['old']}</td><td>{c['new']}</td></tr>\n"
                html += "</table>\n"
            html += "  </div>\n"

        if report["attribution"]:
            html += """
  <div class="section">
    <h2>归因分析</h2>
    <table>
      <tr><th>因素</th><th>是否影响结论</th><th>准确率影响</th><th>说明</th></tr>
"""
            for attr in report["attribution"]:
                impact = "是" if attr["impact_decision"] else "否"
                impact_pct = f"{attr['impact_accuracy']*100:+.2f}%"
                html += f"<tr><td>{attr['factor']}</td><td>{impact}</td><td>{impact_pct}</td><td>{attr['description']}</td></tr>\n"
            html += "    </table>\n  </div>\n"

        if report["misjudge_explanations"]:
            html += """
  <div class="section">
    <h2>旧误判样本解释</h2>
    <table>
      <tr><th>样本ID</th><th>状态</th><th>旧预测</th><th>新预测</th><th>原因</th></tr>
"""
            for m in report["misjudge_explanations"]:
                status = "已改正" if m["changed_correct"] else "未改正"
                status_color = "#22c55e" if m["changed_correct"] else "#f59e0b"
                html += f"<tr><td>{m['sample_id']}</td><td style='color:{status_color}'>{status}</td><td>{m['old_predicted']}</td><td>{m['new_predicted']}</td><td>{m['reason']}</td></tr>\n"
            html += "    </table>\n  </div>\n"

        if report["next_steps"]:
            html += """
  <div class="section">
    <h2>下一步操作</h2>
    <div class="next-steps">
"""
            for i, step in enumerate(report["next_steps"], 1):
                html += f"<div class='step-item'>{i}. {step}</div>\n"
            html += "    </div>\n  </div>\n"

        if report["notes"]:
            html += """
  <div class="section">
    <h2>历史备注</h2>
"""
            for n in report["notes"]:
                html += f"<div class='note-item'><strong>[{n['note_type']}]</strong> {n['author']} @ {n['created_at']}<br>{n['content']}</div>\n"
            html += "  </div>\n"

        html += """
</div>
</body>
</html>
"""
        return html

    def _export_fail_samples(self, samples: List[Sample], result: EvalResult):
        sample_map = {s.sample_id: s for s in samples}
        fail_details = []
        for sid in result.fail_samples:
            s = sample_map.get(sid)
            if s:
                fail_details.append({
                    "sample_id": s.sample_id,
                    "content": s.content,
                    "expected_label": s.expected_label,
                    "predicted_label": s.predicted_label,
                    "score": s.score,
                    "source": s.source.value,
                    "is_boundary": s.is_boundary,
                })

        filepath = os.path.join(self.exceptions_dir, "fail_samples.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "run_id": result.run_id,
                "total_fail": len(fail_details),
                "samples": fail_details,
            }, f, ensure_ascii=False, indent=2)

    def _export_boundary_samples(self, samples: List[Sample], result: EvalResult):
        sample_map = {s.sample_id: s for s in samples}
        boundary_details = []
        for sid in result.boundary_samples:
            s = sample_map.get(sid)
            if s:
                boundary_details.append({
                    "sample_id": s.sample_id,
                    "content": s.content,
                    "expected_label": s.expected_label,
                    "predicted_label": s.predicted_label,
                    "score": s.score,
                    "source": s.source.value,
                    "is_correct": s.is_correct(),
                })

        filepath = os.path.join(self.exceptions_dir, "boundary_samples.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump({
                "run_id": result.run_id,
                "total_boundary": len(boundary_details),
                "samples": boundary_details,
            }, f, ensure_ascii=False, indent=2)
