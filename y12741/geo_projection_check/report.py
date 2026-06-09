from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .models import ValidationResult


def _severity_symbol(sev: str) -> str:
    mapping = {"info": "·", "warning": "⚠", "error": "✗", "critical": "✖"}
    return mapping.get(sev, "?")


class ReportGenerator:
    @staticmethod
    def terminal_summary(result: ValidationResult) -> str:
        lines: list[str] = []
        b = result.bundle
        lines.append("═" * 62)
        lines.append(f"几何投影误差校验  ·  材料批次: {b.label or b.bundle_id}")
        lines.append("═" * 62)
        lines.append(
            f"题目 {len(b.questions)} 项  |  评分记录 {len(b.scores)} 条  |  "
            f"加载告警 {len(b.load_warnings)} 条"
        )
        if b.params:
            lines.append(
                f"参数: {b.params.projection_type.value}  容差={b.params.tolerance_px}px  "
                f"scale={b.params.scale_factor}"
            )
        lines.append("─" * 62)
        total = result.total_errors
        out = result.out_of_tolerance
        lines.append(f"误差统计: 共 {total} 条  超差 {out} 条  合格 {total - out} 条")
        if result.chart_comparison and result.chart_comparison.get("compared"):
            cc = result.chart_comparison
            lines.append(
                f"图表前后差异: 公共点 {len(cc['common_keys'])}  "
                f"新增 {len(cc['added_keys'])}  删除 {len(cc['removed_keys'])}  "
                f"变动 {cc['reversal_count']}"
            )
        if result.conflicts:
            lines.append(f"约束冲突: {len(result.conflicts)} 处")
        if result.boundary_gaps:
            lines.append(f"边界样例缺口: {len(result.boundary_gaps)} 项 -> {', '.join(result.boundary_gaps)}")
        lines.append("─" * 62)
        for e in result.errors:
            tag = _severity_symbol(e.severity.value)
            extra = ""
            if e.chart_diff_delta:
                dx, dy = e.chart_diff_delta
                extra = f"  [图表Δ=({dx:+.1f},{dy:+.1f})]"
            lines.append(
                f" {tag} {e.item_id:<8}  err={e.distance_px:>7.2f}px  "
                f"{'OK' if e.within_tolerance else 'OUT'}{extra}"
            )
        if result.conflicts:
            lines.append("─" * 62)
            lines.append("【约束冲突定位】")
            for c in result.conflicts:
                mat = " | ".join(c.material_sources) or "未标注来源"
                lines.append(f"  ✖ [{c.severity.value.upper()}] {c.description}")
                lines.append(f"      卡在材料: {mat}")
                if c.item_ids:
                    lines.append(f"      涉及题目: {', '.join(c.item_ids)}")
        lines.append("═" * 62)
        return "\n".join(lines)

    @staticmethod
    def committee_report(result: ValidationResult) -> str:
        lines: list[str] = []
        b = result.bundle
        lines.append("# 几何投影误差校验 · 投委会报告")
        lines.append("")
        lines.append(f"- **批次标识**: {b.label or b.bundle_id}")
        lines.append(f"- **校验时间**: {result.computed_at.isoformat(timespec='seconds')}")
        lines.append(f"- **材料构成**: 题目 {len(b.questions)} 项，评分 {len(b.scores)} 条")
        if b.params and b.params.last_maintained_by:
            lines.append(f"- **参数维护人**: {b.params.last_maintained_by}")
        lines.append("")
        lines.append("## 结论摘要")
        total = result.total_errors
        out = result.out_of_tolerance
        ok = total - out
        lines.append(f"- 投影点校验: {ok}/{total} 在容差内，{out} 项超差")
        if result.conflicts:
            lines.append(f"- 约束冲突: 检出 **{len(result.conflicts)}** 处（见下方定位）")
        else:
            lines.append("- 约束冲突: 未检出")
        if result.boundary_gaps:
            lines.append(
                f"- 边界样例缺口: **{len(result.boundary_gaps)}** 项 ({', '.join(result.boundary_gaps)})，已先完成其余校验"
            )
        lines.append("")
        if result.conflicts:
            lines.append("## 约束冲突定位（投委会关注）")
            lines.append("")
            for idx, c in enumerate(result.conflicts, 1):
                lines.append(f"### 冲突 #{idx}  [{c.severity.value.upper()}]")
                lines.append("")
                lines.append(f"- 描述: {c.description}")
                lines.append(f"- 约束 A: {c.constraint_a}")
                lines.append(f"- 约束 B: {c.constraint_b}")
                lines.append(f"- 材料来源: {', '.join(c.material_sources) if c.material_sources else '未标注'}")
                if c.item_ids:
                    lines.append(f"- 涉及题目: {', '.join(c.item_ids)}")
                lines.append("")
        lines.append("## 详细误差表")
        lines.append("")
        lines.append("| 题目 | 期望 | 实际 | 误差(px) | 容差内 | 图表前后Δ | 来源 |")
        lines.append("|------|------|------|----------|--------|-----------|------|")
        for e in result.errors:
            exp = f"({e.expected[0]:.1f},{e.expected[1]:.1f})" if e.expected else "N/A"
            act = f"({e.actual[0]:.1f},{e.actual[1]:.1f})"
            delta = f"({e.chart_diff_delta[0]:+.1f},{e.chart_diff_delta[1]:+.1f})" if e.chart_diff_delta else "-"
            src = Path(e.source_material).name if e.source_material else "-"
            lines.append(
                f"| {e.item_id} | {exp} | {act} | {e.distance_px:.2f} | "
                f"{'是' if e.within_tolerance else '否'} | {delta} | {src} |"
            )
        lines.append("")
        if result.boundary_gaps:
            lines.append("## 待补材料清单")
            lines.append("")
            for item_id in result.boundary_gaps:
                lines.append(f"- [ ] 补录 {item_id} 的评分记录")
            lines.append("")
        if b.load_warnings:
            lines.append("## 加载阶段告警")
            lines.append("")
            for w in b.load_warnings:
                lines.append(f"- {w}")
            lines.append("")
        return "\n".join(lines)

    @staticmethod
    def to_json(result: ValidationResult, path: Optional[str | Path] = None) -> dict:
        data = {
            "bundle_id": result.bundle.bundle_id,
            "label": result.bundle.label,
            "computed_at": result.computed_at.isoformat(),
            "summary": {
                "total_errors": result.total_errors,
                "out_of_tolerance": result.out_of_tolerance,
                "conflicts": len(result.conflicts),
                "boundary_gaps": list(result.boundary_gaps),
            },
            "errors": [
                {
                    "item_id": e.item_id,
                    "expected": list(e.expected) if e.expected else None,
                    "actual": list(e.actual),
                    "distance_px": e.distance_px,
                    "within_tolerance": e.within_tolerance,
                    "severity": e.severity.value,
                    "source_material": e.source_material,
                    "chart_diff_delta": list(e.chart_diff_delta) if e.chart_diff_delta else None,
                }
                for e in result.errors
            ],
            "conflicts": [
                {
                    "constraint_a": c.constraint_a,
                    "constraint_b": c.constraint_b,
                    "item_ids": c.item_ids,
                    "material_sources": c.material_sources,
                    "description": c.description,
                    "severity": c.severity.value,
                }
                for c in result.conflicts
            ],
            "chart_comparison": result.chart_comparison,
            "notes": [
                {
                    "author": n.author,
                    "decision": n.decision.value,
                    "comment": n.comment,
                    "target_error_id": n.target_error_id,
                    "target_conflict_id": n.target_conflict_id,
                }
                for n in result.notes
            ],
        }
        if path:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        return data
