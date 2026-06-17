"""报告生成器：生成拆解报告 + 工单备注摘要。"""

from __future__ import annotations

from io import StringIO
from typing import List

from ..engine import DecomposedResult, DuplicateIssue, GrayCompareResult
from ..models import SampleSet


class ReportGenerator:
    """生成灰度对比报告。"""

    def __init__(self) -> None:
        self._buf = StringIO()

    def _writeln(self, line: str = "") -> None:
        self._buf.write(line + "\n")

    def generate(
        self,
        baseline_samples: SampleSet,
        candidate_samples: SampleSet,
        compare_result: GrayCompareResult,
        decomposed: DecomposedResult,
        duplicate_issues: List[DuplicateIssue],
    ) -> str:
        self._buf = StringIO()
        self._header(baseline_samples, candidate_samples, compare_result)
        self._duplicate_warnings(duplicate_issues)
        self._metrics(compare_result)
        self._decomposition(decomposed)
        self._ticket_remark(compare_result, decomposed, duplicate_issues)
        return self._buf.getvalue()

    def _header(
        self,
        baseline: SampleSet,
        candidate: SampleSet,
        result: GrayCompareResult,
    ) -> None:
        self._writeln("=" * 60)
        self._writeln("信贷评分灰度对比报告")
        self._writeln("=" * 60)
        self._writeln(f"基线样本集  : {baseline.name} ({baseline.set_id[:8]}) 规模 {baseline.size}")
        self._writeln(
            f"候选样本集  : {candidate.name} ({candidate.set_id[:8]}) 规模 {candidate.size}"
        )
        self._writeln("")

    def _duplicate_warnings(self, issues: List[DuplicateIssue]) -> None:
        if not issues:
            return
        self._writeln("[!] 待确认：检测到重复评测，请先处理以下问题再看最终结论")
        self._writeln("-" * 60)
        for i, issue in enumerate(issues, 1):
            self._writeln(f"  {i}. {issue.description()}")
        self._writeln("")

    def _metrics(self, result: GrayCompareResult) -> None:
        m = result.metrics
        self._writeln("一、总体决策变化")
        self._writeln("-" * 60)
        self._writeln(f"  总样本数        : {m.get('total_samples', 0)}")
        self._writeln(f"  决策变化数      : {m.get('changed_count', 0)}")
        self._writeln(f"  变化率          : {m.get('changed_rate', 0):.2%}")
        self._writeln("")
        self._writeln("  决策流向：")
        flows = [
            ("pass -> review", m.get("pass_to_review", 0)),
            ("pass -> reject", m.get("pass_to_reject", 0)),
            ("review -> pass", m.get("review_to_pass", 0)),
            ("review -> reject", m.get("review_to_reject", 0)),
            ("reject -> pass", m.get("reject_to_pass", 0)),
            ("reject -> review", m.get("reject_to_review", 0)),
        ]
        for label, count in flows:
            if count:
                self._writeln(f"    {label:<16} : {count}")
        self._writeln("")

    def _decomposition(self, decomposed: DecomposedResult) -> None:
        self._writeln("二、变化拆解（样本变化 / 阈值变化 / 人工改判）")
        self._writeln("-" * 60)
        summary = decomposed.summary()
        self._writeln(
            f"  样本变化  : {summary['sample_change']} 条  "
            f"阈值变化  : {summary['threshold_change']} 条  "
            f"人工改判  : {summary['manual_change']} 条"
        )
        self._writeln("")

        for title, group in [
            ("2.1 样本变化（新增/移除）", decomposed.sample_change),
            ("2.2 阈值变化导致的决策变化", decomposed.threshold_change),
            ("2.3 人工改判", decomposed.manual_change),
        ]:
            self._writeln(f"  {title}")
            if not group.changes:
                self._writeln("    (无)")
            else:
                for key, cnt in group.summary.items():
                    self._writeln(f"    {key}: {cnt}")
                top = group.changes[:5]
                for c in top:
                    self._writeln(
                        f"      - {c.sample_id[:8]}: "
                        f"{c.before_decision or 'N/A'} -> {c.after_decision or 'N/A'}"
                        f"{(' | ' + c.reason) if c.reason else ''}"
                    )
                if len(group.changes) > 5:
                    self._writeln(f"      ... 共 {len(group.changes)} 条")
            self._writeln("")

    def _ticket_remark(
        self,
        result: GrayCompareResult,
        decomposed: DecomposedResult,
        issues: List[DuplicateIssue],
    ) -> None:
        self._writeln("三、工单备注摘要（可直接粘贴到线上工单）")
        self._writeln("-" * 60)
        self._writeln("【信贷评分灰度对比】评审会前备注")
        m = result.metrics
        self._writeln(
            f"- 本次灰度共 {m.get('total_samples', 0)} 个样本，"
            f"决策变化 {m.get('changed_count', 0)} 个（变化率 {m.get('changed_rate', 0):.2%}）。"
        )
        s = decomposed.summary()
        self._writeln(
            f"- 变化来源：样本变化 {s['sample_change']} / "
            f"阈值变化 {s['threshold_change']} / 人工改判 {s['manual_change']}。"
        )
        changed_flows = []
        for label, key in [
            ("pass→review", "pass_to_review"),
            ("pass→reject", "pass_to_reject"),
            ("review→pass", "review_to_pass"),
            ("review→reject", "review_to_reject"),
            ("reject→pass", "reject_to_pass"),
            ("reject→review", "reject_to_review"),
        ]:
            if m.get(key, 0):
                changed_flows.append(f"{label} {m[key]}")
        if changed_flows:
            self._writeln(f"- 主要流向：{'、'.join(changed_flows)}。")
        if issues:
            self._writeln("- 待确认：存在重复评测，需先确认影响范围后再下最终结论。")
        self._writeln("")
