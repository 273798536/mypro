from __future__ import annotations

from datetime import datetime

from .conflict import ConflictDetector
from .models import (
    ConflictRecord,
    ExperimentGroup,
    ExperimentSnapshot,
    GroupComparison,
    MetricData,
    PowerResult,
    SampleInfo,
    TraceLink,
)
from .power import PowerAnalyzer
from .trace import TraceChain


class PowerReport:
    def __init__(
        self,
        analyzer: PowerAnalyzer,
        conflict_detector: ConflictDetector,
        trace_chain: TraceChain,
    ):
        self.analyzer = analyzer
        self.conflict_detector = conflict_detector
        self.trace_chain = trace_chain

    def generate(
        self,
        experiment_name: str,
        groups: list[ExperimentGroup],
        metrics: list[MetricData],
        sample_infos: list[SampleInfo] | None = None,
    ) -> tuple[str, ExperimentSnapshot]:
        snapshot_id = f"snap_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        sample_infos = sample_infos or []

        delay_events = ConflictDetector.build_delay_events(metrics)

        power_results: list[PowerResult] = []
        group_comparisons: list[GroupComparison] = []

        control_group = next((g for g in groups if g.is_control), groups[0] if groups else None)
        treatment_groups = [g for g in groups if not g.is_control]

        for metric in metrics:
            pr = self.analyzer.analyze(metric)
            power_results.append(pr)

            if control_group and treatment_groups:
                for tg in treatment_groups:
                    comp = self.analyzer.compute_group_comparison(
                        metric, control_group.group_id, tg.group_id
                    )
                    group_comparisons.append(comp)
                    tl = self.trace_chain.link_power_to_comparison(pr, comp)
                    pr.group_comparison_id = comp.comparison_id

        conflicts = self.conflict_detector.detect_all(
            groups, metrics, sample_infos, group_comparisons, delay_events
        )

        for pr in power_results:
            metric_conflicts = [
                c
                for c in conflicts
                if pr.metric_id in c.sources
                or any(
                    pr.metric_id in str(c.intermediate_values.values())
                    for _ in [1]
                )
            ]
            pr.conflict_ids = [c.conflict_id for c in metric_conflicts]
            self.trace_chain.link_power_to_conflicts(pr, metric_conflicts)

        for comp in group_comparisons:
            comp_conflicts = [
                c
                for c in conflicts
                if c.conflict_type.value == "uneven_group"
                and comp.control_group_id in c.sources
                and comp.treatment_group_id in c.sources
                and comp.metric_id in c.sources
            ]
            self.trace_chain.link_comparison_to_conflicts(comp, comp_conflicts)

        for conflict in conflicts:
            for de_id in conflict.related_delay_events:
                self.trace_chain.link_conflict_to_delay(conflict, de_id)

        snapshot = ExperimentSnapshot(
            snapshot_id=snapshot_id,
            experiment_name=experiment_name,
            groups=groups,
            metrics=metrics,
            sample_infos=sample_infos,
            delay_events=delay_events,
            conflicts=conflicts,
            power_results=power_results,
            group_comparisons=group_comparisons,
            trace_links=self.trace_chain.get_all_links(),
        )

        report_text = self._format_report(snapshot)
        return report_text, snapshot

    def _format_report(self, snapshot: ExperimentSnapshot) -> str:
        lines: list[str] = []
        w = 72

        lines.append("=" * w)
        lines.append(f"灰度发布实验功效报告")
        lines.append(f"实验: {snapshot.experiment_name}")
        lines.append(f"快照: {snapshot.snapshot_id}")
        lines.append(f"时间: {snapshot.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * w)

        lines.append("")
        lines.append("一、实验分组")
        lines.append("-" * w)
        for g in snapshot.groups:
            role = "对照组" if g.is_control else "实验组"
            channels = ", ".join(g.channel_ids) if g.channel_ids else "无"
            cities = ", ".join(g.city_ids) if g.city_ids else "无"
            lines.append(f"  {role}: {g.group_name} ({g.group_id})")
            lines.append(f"    流量比例: {g.traffic_ratio:.1%}  渠道: {channels}  城市: {cities}")

        lines.append("")
        lines.append("二、指标数据与延迟情况")
        lines.append("-" * w)
        for m in snapshot.metrics:
            delay_flag = ""
            if m.delay_status.value != "on_time":
                delay_flag = f"  ⚠ 延迟 {m.delay_hours:.1f}h"
            lines.append(f"  {m.metric_name} ({m.metric_id}) 单位: {m.unit}{delay_flag}")
            lines.append(
                f"    对照: mean={m.control_mean:.4f}, std={m.control_std:.4f}, n={m.control_n}"
            )
            lines.append(
                f"    实验: mean={m.treatment_mean:.4f}, std={m.treatment_std:.4f}, n={m.treatment_n}"
            )
            if m.source_channel or m.source_city:
                lines.append(f"    来源: 渠道={m.source_channel}, 城市={m.source_city}")

        if snapshot.sample_infos:
            lines.append("")
            lines.append("三、样本量检查")
            lines.append("-" * w)
            for si in snapshot.sample_infos:
                status = "✓ 充足" if si.is_sufficient else "✗ 不足"
                lines.append(
                    f"  {si.group_id}: 需要={si.required_n}, "
                    f"实际={si.actual_n}, 缺口={si.shortfall} [{status}]"
                )

        lines.append("")
        lines.append("四、功效分析（含中间推导过程）")
        lines.append("-" * w)
        for pr in snapshot.power_results:
            lines.append(f"  指标: {pr.metric_name} ({pr.metric_id})")
            lines.append(f"  结果ID: {pr.result_id}")
            lines.append(f"  ────────────────────────────────")
            for step in pr.intermediate_steps:
                inputs_str = ", ".join(f"{k}={v}" for k, v in step.inputs.items())
                output_str = step.output
                if isinstance(output_str, list):
                    output_str = f"[{output_str[0]:.6f}, {output_str[1]:.6f}]"
                elif isinstance(output_str, float):
                    output_str = f"{output_str:.6f}"
                lines.append(f"    [{step.step_name}]")
                lines.append(f"      公式: {step.formula}")
                lines.append(f"      输入: {inputs_str}")
                lines.append(f"      输出: {output_str} {step.unit}")
                if step.note:
                    lines.append(f"      说明: {step.note}")
            lines.append(f"  ────────────────────────────────")
            lines.append(f"  功效: {pr.achieved_power:.4f}  (目标: {self.analyzer.desired_power})")
            lines.append(
                f"  {1-pr.alpha:.0%} 置信区间: "
                f"[{pr.confidence_interval_lower:.6f}, {pr.confidence_interval_upper:.6f}]"
            )
            lines.append(f"  效应量(Cohen's d): {pr.effect_size:.4f}")
            lines.append(f"  MDE: {pr.mde:.6f}")
            lines.append(
                f"  样本: 需要={pr.required_n_per_group}/组, "
                f"实际 对照={pr.actual_n_control} 实验={pr.actual_n_treatment}"
            )
            lines.append(
                f"  显著性: {'是 ✓' if pr.is_significant else '否 ✗'} "
                f"(alpha={pr.alpha})"
            )
            if pr.conflict_ids:
                lines.append(f"  关联冲突: {', '.join(pr.conflict_ids)}")
            lines.append("")

        lines.append("五、分组对比")
        lines.append("-" * w)
        for comp in snapshot.group_comparisons:
            balance_str = "均衡" if comp.is_balanced else "不均衡"
            lines.append(
                f"  {comp.control_group_id} vs {comp.treatment_group_id} "
                f"| 指标: {comp.metric_name}"
            )
            lines.append(
                f"    对照均值={comp.control_mean:.4f}  "
                f"实验均值={comp.treatment_mean:.4f}"
            )
            lines.append(
                f"    绝对差异={comp.absolute_diff:.4f}  "
                f"相对差异={comp.relative_diff:.4%}"
            )
            lines.append(
                f"    样本: 对照={comp.control_n}, 实验={comp.treatment_n}  "
                f"平衡比={comp.balance_ratio:.2f} [{balance_str}]"
            )
            for step in comp.intermediate_steps:
                output_str = step.output
                if isinstance(output_str, float):
                    output_str = f"{output_str:.4f}"
                elif isinstance(output_str, bool):
                    output_str = "是" if output_str else "否"
                lines.append(
                    f"    [{step.step_name}] {step.formula} → {output_str} ({step.unit})"
                )
                if step.note:
                    lines.append(f"      {step.note}")
            lines.append("")

        lines.append("六、冲突检测与延迟事件（按时序排列）")
        lines.append("-" * w)
        if snapshot.delay_events:
            lines.append("  延迟事件:")
            for de in snapshot.delay_events:
                lines.append(
                    f"    #{de.sequence_order:02d} {de.description}"
                )
                lines.append(
                    f"         影响: 指标={de.affected_metrics}, "
                    f"延迟={de.delay_hours:.1f}h"
                )
            lines.append("")

        conflict_lines = ConflictDetector.format_conflict_timeline(snapshot.conflicts)
        for cl in conflict_lines:
            lines.append(f"  {cl}")

        lines.append("")
        lines.append("七、追溯链（结果→分析→对比→冲突）")
        lines.append("-" * w)
        for pr in snapshot.power_results:
            trace_links = self.trace_chain.trace_from_result(pr.result_id)
            trace_lines = TraceChain.format_trace(trace_links, pr.result_id)
            for tl in trace_lines:
                lines.append(tl)
            lines.append("")

        lines.append("=" * w)
        lines.append("报告结束")
        lines.append("=" * w)

        return "\n".join(lines)
