from __future__ import annotations

import json
import os
from typing import Iterable

import pandas as pd

from .models import Anomaly, BoundarySample, CheckResult, CheckStep, HistoricalAnswer
from .tracer import ParamDiff


def _step_rows(steps: Iterable[CheckStep]) -> list[dict]:
    rows = []
    for s in steps:
        rows.append({
            "步骤ID": s.step_id,
            "步骤名": s.step_name,
            "描述": s.description,
            "结果变化": "是" if s.changed else "否",
            "变更前": str(s.result_before),
            "变更后": str(s.result_after),
            "详情": s.detail,
        })
    return rows


def _anomaly_rows(anomalies: Iterable[Anomaly]) -> list[dict]:
    rows = []
    for a in anomalies:
        rows.append({
            "异常类型": a.anomaly_type.value,
            "消息": a.message,
            "关联材料ID": a.material.material_id if a.material else "",
            "关联材料名称": a.material.name if a.material else "",
            "源行号": a.source_line if a.source_line is not None else "",
            "原始引用": a.raw_reference or "",
        })
    return rows


def _sample_rows(samples: Iterable[BoundarySample]) -> list[dict]:
    rows = []
    for s in samples:
        rows.append({
            "样本标签": s.label,
            "值": s.value,
            "单位": s.unit.value,
            "类别": s.bound_type,
            "是否合规": "是" if s.within_bound else "否",
        })
    return rows


def _diff_rows(diffs: Iterable[ParamDiff]) -> list[dict]:
    rows = []
    for idx, d in enumerate(diffs):
        for f in d.fields_changed:
            rows.append({
                "第几次调参": idx + 1,
                "参数名": f.field,
                "变更前": str(f.old_value),
                "变更后": str(f.new_value),
                "影响说明": f.impact,
            })
        for k, v in d.result_diff.items():
            rows.append({
                "第几次调参": idx + 1,
                "参数名": f"[结果] {k}",
                "变更前": str(v.get("before")),
                "变更后": str(v.get("after")),
                "影响说明": "校验结果变化",
            })
    return rows


class ReportGenerator:
    def __init__(self, output_dir: str) -> None:
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_text_report(
        self,
        answer: HistoricalAnswer,
        result: CheckResult,
        diffs: list[ParamDiff] | None = None,
        filename: str = "check_report.txt",
    ) -> str:
        path = os.path.join(self.output_dir, filename)
        lines: list[str] = []
        lines.append("=" * 60)
        lines.append("排队窗口边界校验报告")
        lines.append("=" * 60)
        lines.append(f"历史答案ID: {answer.answer_id}")
        lines.append(f"来源文件: {answer.source_file or '-'}")
        lines.append(f"材料数: {len(answer.materials)}")
        lines.append(f"状态: {result.status.value}")
        lines.append(f"排序稳定: {result.sort_stable}")
        if result.computed_value is not None:
            lines.append(
                f"计算值: {result.computed_value:.4f} "
                f"{result.computed_unit.value if result.computed_unit else ''}"
            )
        lines.append(f"使用公式: {result.formula_applied or '-'}")
        lines.append("")
        lines.append("-- 异常列表 --")
        if result.anomalies:
            for i, a in enumerate(result.anomalies, 1):
                loc = f" (源行 {a.source_line})" if a.source_line else ""
                lines.append(f"[{i}] {a.anomaly_type.value}{loc}: {a.message}")
                if a.raw_reference:
                    lines.append(f"    原始引用: {a.raw_reference}")
        else:
            lines.append("(无异常)")
        lines.append("")
        lines.append("-- 边界样本 --")
        for s in result.boundary_samples:
            tag = "合规" if s.within_bound else "越界"
            lines.append(
                f"  {s.label}: {s.value} {s.unit.value} [{tag}]"
            )
        lines.append("")
        lines.append("-- 步骤追踪（可看出哪一步导致结果变化） --")
        for s in result.steps:
            marker = " *变化* " if s.changed else "   -   "
            lines.append(
                f"{marker}{s.step_id} {s.step_name}: "
                f"{s.result_before} -> {s.result_after}"
            )
            if s.detail:
                lines.append(f"        说明: {s.detail}")
        if diffs:
            lines.append("")
            lines.append("-- 参数调档差异 --")
            for idx, d in enumerate(diffs, 1):
                lines.append(f"第 {idx} 次调参:")
                for f in d.fields_changed:
                    lines.append(f"  参数 {f.field}: {f.old_value} -> {f.new_value}")
                    lines.append(f"    影响: {f.impact}")
                if d.result_diff:
                    lines.append(f"  结果变化: {d.result_diff}")
        with open(path, "w", encoding="utf-8") as fp:
            fp.write("\n".join(lines) + "\n")
        return path

    def export_excel(
        self,
        answer: HistoricalAnswer,
        result: CheckResult,
        diffs: list[ParamDiff] | None = None,
        filename: str = "check_report.xlsx",
    ) -> str:
        path = os.path.join(self.output_dir, filename)
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            pd.DataFrame([{
                "历史答案ID": answer.answer_id,
                "来源文件": answer.source_file or "",
                "材料数": len(answer.materials),
                "状态": result.status.value,
                "排序稳定": str(result.sort_stable),
                "计算值": result.computed_value if result.computed_value is not None else "",
                "单位": result.computed_unit.value if result.computed_unit else "",
                "使用公式": result.formula_applied or "",
            }]).to_excel(writer, sheet_name="概览", index=False)

            pd.DataFrame([{
                "材料ID": m.material_id,
                "名称": m.name,
                "期望名称": m.expected_name,
                "名称一致": "是" if m.is_name_matched else "否",
                "数量": m.quantity,
                "单位": m.unit.value,
                "源行号": m.source_line if m.source_line is not None else "",
            } for m in answer.materials]).to_excel(writer, sheet_name="材料清单", index=False)

            pd.DataFrame(_step_rows(result.steps)).to_excel(
                writer, sheet_name="步骤追踪", index=False
            )
            pd.DataFrame(_anomaly_rows(result.anomalies)).to_excel(
                writer, sheet_name="异常列表", index=False
            )
            pd.DataFrame(_sample_rows(result.boundary_samples)).to_excel(
                writer, sheet_name="边界样本", index=False
            )
            if diffs:
                pd.DataFrame(_diff_rows(diffs)).to_excel(
                    writer, sheet_name="参数调档差异", index=False
                )
        return path

    def export_json(
        self,
        answer: HistoricalAnswer,
        result: CheckResult,
        diffs: list[ParamDiff] | None = None,
        filename: str = "check_report.json",
    ) -> str:
        path = os.path.join(self.output_dir, filename)
        payload = {
            "historical_answer": {
                "answer_id": answer.answer_id,
                "source_file": answer.source_file,
                "materials": [
                    {
                        "material_id": m.material_id,
                        "name": m.name,
                        "expected_name": m.expected_name,
                        "name_matched": m.is_name_matched,
                        "quantity": m.quantity,
                        "unit": m.unit.value,
                        "source_line": m.source_line,
                    }
                    for m in answer.materials
                ],
            },
            "result": {
                "status": result.status.value,
                "computed_value": result.computed_value,
                "computed_unit": result.computed_unit.value if result.computed_unit else None,
                "formula_applied": result.formula_applied,
                "sort_stable": result.sort_stable,
                "anomalies": [
                    {
                        "type": a.anomaly_type.value,
                        "message": a.message,
                        "material_id": a.material.material_id if a.material else None,
                        "source_line": a.source_line,
                        "raw_reference": a.raw_reference,
                    }
                    for a in result.anomalies
                ],
                "boundary_samples": [
                    {
                        "label": s.label,
                        "value": s.value,
                        "bound_type": s.bound_type,
                        "unit": s.unit.value,
                        "within_bound": s.within_bound,
                    }
                    for s in result.boundary_samples
                ],
                "steps": [
                    {
                        "step_id": s.step_id,
                        "step_name": s.step_name,
                        "description": s.description,
                        "changed": s.changed,
                        "before": str(s.result_before),
                        "after": str(s.result_after),
                        "detail": s.detail,
                    }
                    for s in result.steps
                ],
            },
            "param_diffs": [
                {
                    "config_before": d.config_before,
                    "config_after": d.config_after,
                    "fields_changed": [
                        {
                            "field": f.field,
                            "old_value": f.old_value,
                            "new_value": f.new_value,
                            "impact": f.impact,
                        }
                        for f in d.fields_changed
                    ],
                    "result_diff": d.result_diff,
                }
                for d in (diffs or [])
            ],
        }
        with open(path, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, ensure_ascii=False, indent=2)
        return path

    def quick_handover(self, answer_paths: dict[str, str]) -> str:
        path = os.path.join(self.output_dir, "HANDOVER.txt")
        lines = [
            "教研编辑阿宁 - 排队窗口边界校验 交接卡",
            "------------------------------------",
            "",
            "[样例在哪]",
        ]
        for k, v in answer_paths.items():
            lines.append(f"  - {k}: {v}")
        lines.append("")
        lines.append("[异常在哪]")
        lines.append("  - 报告异常列表 sheet / JSON anomalies 字段")
        lines.append("  - 异常含源行号 & 原始引用，可回溯历史答案原始行")
        lines.append("  - 空集合、排序不稳定会触发【挂起】，需人工确认")
        lines.append("")
        lines.append("[结果怎么导出]")
        lines.append("  - TXT:  check_report.txt   (给复核人看的简明报告)")
        lines.append("  - Excel: check_report.xlsx (含 概览/材料/步骤追踪/异常/边界样本/调参差异)")
        lines.append("  - JSON:  check_report.json (结构化，对接系统)")
        with open(path, "w", encoding="utf-8") as fp:
            fp.write("\n".join(lines) + "\n")
        return path
