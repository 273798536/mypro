"""
样本回放器：误判样本回放与改判解释
Sample Replayer: Misjudged Sample Replay & Verdict Change Explanation

核心职责：
- 把旧模型误判样本放回回放流程，解释为什么改判
- 边界样本与最终结论必须关联
- 所有改判必须给出逐条依据，不能只给光秃秃的结论
"""

from __future__ import annotations

import uuid
from typing import Callable, Dict, List, Optional

from .metrics import CompressionMetrics
from .models import (
    Conclusion,
    CompressionSample,
    ProcessingRecord,
    ProcessingStage,
    SampleVerdict,
)


VERDICT_PRIORITY = {
    SampleVerdict.CORRUPT: 0,
    SampleVerdict.ANOMALY: 1,
    SampleVerdict.BOUNDARY: 2,
    SampleVerdict.COMPRESSED: 3,
    SampleVerdict.NORMAL: 4,
}


class SampleReplayer:

    def __init__(self, metrics_engine: CompressionMetrics,
                 verdict_rules: Optional[Dict[SampleVerdict, Callable[[CompressionSample], bool]]] = None) -> None:
        self.metrics = metrics_engine
        self._records: List[ProcessingRecord] = []
        self._conclusions: List[Conclusion] = []
        self.verdict_rules = verdict_rules or self._default_rules()

    def _default_rules(self) -> Dict[SampleVerdict, Callable[[CompressionSample], bool]]:
        def _corrupt(s: CompressionSample) -> bool:
            for e in s.log_entries:
                if e.is_corrupt:
                    return True
            return False

        def _anomaly(s: CompressionSample) -> bool:
            for name, m in s.metrics.items():
                if m.boundary is None:
                    continue
                if m.is_within_bounds is False:
                    severity = 0
                    if name == "kl_divergence" and m.value > 0.1:
                        severity += 1
                    if name == "accuracy_drop_percent" and m.value > 0.03:
                        severity += 1
                    if severity >= 1:
                        return True
            return False

        def _boundary(s: CompressionSample) -> bool:
            near = False
            for name, m in s.metrics.items():
                if m.boundary is None or m.is_within_bounds is None:
                    continue
                if m.boundary.upper is not None and m.boundary.upper != 0:
                    ratio = m.value / m.boundary.upper
                    if 0.85 <= ratio <= 1.0 and m.is_within_bounds:
                        near = True
                        break
                if m.boundary.lower is not None and m.boundary.lower != 0:
                    ratio = m.value / m.boundary.lower
                    if 1.0 <= ratio <= 1.15 and m.is_within_bounds:
                        near = True
                        break
            if near:
                s.is_boundary_sample = True
                return True
            return False

        def _compressed(s: CompressionSample) -> bool:
            r = s.metrics.get("compression_ratio")
            if r is not None and r.value >= 1.5:
                return True
            if s.metrics.get("weight_sparsity") is not None:
                return True
            return False

        return {
            SampleVerdict.CORRUPT: _corrupt,
            SampleVerdict.ANOMALY: _anomaly,
            SampleVerdict.BOUNDARY: _boundary,
            SampleVerdict.COMPRESSED: _compressed,
        }

    def _make_record(self, action: str, inputs: Dict, outputs: Dict,
                     sample_refs: List[str], notes: List[str]) -> ProcessingRecord:
        rec = ProcessingRecord(
            record_id=f"REPLAY-{uuid.uuid4().hex[:12]}",
            stage=ProcessingStage.REPLAY_EXECUTION,
            action=action,
            inputs=inputs,
            outputs=outputs,
            log_refs=sample_refs,
            operator="SampleReplayer",
            notes=notes,
        )
        self._records.append(rec)
        return rec

    def _make_conclusion(self, title: str, body: str,
                         sample: CompressionSample,
                         severity: str = "INFO") -> Conclusion:
        c = Conclusion(
            conclusion_id=f"CONCL-{uuid.uuid4().hex[:10]}",
            title=title,
            body=body,
            evidence_sample_ids=[sample.sample_id],
            evidence_log_refs=sample.all_log_refs(),
            evidence_metric_names=list(sample.metrics.keys()),
            severity=severity,
        )
        self._conclusions.append(c)
        sample.linked_conclusion_ids.append(c.conclusion_id)
        return c

    def _check_boundary_violations(self, sample: CompressionSample) -> List[str]:
        violations = []
        for name, m in sample.metrics.items():
            if m.boundary and m.is_within_bounds is False:
                violations.append(
                    f"指标[{name}]={m.format_value()} 越界。"
                    f"边界: {m.boundary.describe()}；"
                    f"预期行为: {m.boundary.expected_behavior}"
                )
        return violations

    def _explain_verdict(self, sample: CompressionSample) -> str:
        reasons = []

        kl = sample.metrics.get("kl_divergence")
        ratio = sample.metrics.get("compression_ratio")
        drop = sample.metrics.get("accuracy_drop_percent")
        sparsity = sample.metrics.get("weight_sparsity")
        fisher = sample.metrics.get("fisher_information_norm")

        if sample.verdict == SampleVerdict.CORRUPT:
            corrupt_entries = [e for e in sample.log_entries if e.is_corrupt]
            for e in corrupt_entries:
                reasons.append(f"日志行{e.as_reference()}为坏数据({e.corrupt_reason})")
            return "；".join(reasons) if reasons else "检测到坏数据行"

        if kl and kl.is_within_bounds is False:
            reasons.append(
                f"KL散度={kl.format_value()}超过阈值"
                f"(边界:{kl.boundary.describe() if kl.boundary else '未设'})，"
                f"来源:{kl.used_log_refs}"
            )
        if drop and drop.is_within_bounds is False:
            reasons.append(
                f"精度掉点={drop.format_value()}"
                f"(边界:{drop.boundary.describe() if drop.boundary else '未设'})，"
                f"来源:{drop.used_log_refs}"
            )
        if ratio and ratio.is_within_bounds is False:
            reasons.append(
                f"压缩比={ratio.format_value()}"
                f"(边界:{ratio.boundary.describe() if ratio.boundary else '未设'})"
            )
        if sparsity and sparsity.is_within_bounds is False:
            reasons.append(
                f"稀疏度={sparsity.format_value()}"
                f"(边界:{sparsity.boundary.describe() if sparsity.boundary else '未设'})"
            )
        if fisher and fisher.is_within_bounds is False:
            reasons.append(
                f"Fisher范数越界={fisher.format_value()}，"
                f"提示该层参数敏感，来源:{fisher.used_log_refs}"
            )
        if sample.is_boundary_sample and not reasons:
            reasons.append("指标接近边界阈值，标记为边界样本（用于复现边缘case）")
        if not reasons:
            reasons.append("全部指标在边界内，判定正常")
        return "；".join(reasons)

    def replay_sample(self, sample: CompressionSample,
                      prev_verdict: Optional[SampleVerdict] = None,
                      prev_reason: str = "") -> CompressionSample:
        log_refs = sample.all_log_refs()
        self._make_record(
            "开始回放样本",
            {
                "sample_id": sample.sample_id,
                "prev_verdict": str(prev_verdict) if prev_verdict else None,
                "prev_reason": prev_reason,
                "metrics_present": list(sample.metrics.keys()),
            },
            {},
            log_refs,
            [
                f"样本ID={sample.sample_id}",
                f"输入引用={sample.input_ref}",
                f"旧判定={prev_verdict}",
                f"旧理由={prev_reason[:80]}",
            ],
        )

        sample.prev_verdict = prev_verdict
        sample.prev_reason = prev_reason

        new_verdict = SampleVerdict.NORMAL
        for verdict in sorted(VERDICT_PRIORITY, key=lambda v: VERDICT_PRIORITY[v]):
            rule_fn = self.verdict_rules.get(verdict)
            if rule_fn and rule_fn(sample):
                new_verdict = verdict
                break

        sample.verdict = new_verdict
        sample.boundary_violations = self._check_boundary_violations(sample)
        sample.verdict_reason = self._explain_verdict(sample)

        changed = (prev_verdict is not None and prev_verdict != new_verdict)
        action_tag = "[改判]" if changed else "[维持]"
        self._make_record(
            f"样本判定{action_tag}",
            {
                "sample_id": sample.sample_id,
                "prev": str(prev_verdict),
                "new": str(new_verdict),
            },
            {
                "verdict_reason": sample.verdict_reason,
                "boundary_violations_count": len(sample.boundary_violations),
            },
            log_refs,
            [
                f"旧判定: {prev_verdict} → 新判定: {new_verdict}",
                f"理由摘要: {sample.verdict_reason[:150]}",
            ],
        )

        if changed:
            title = f"改判结论: {prev_verdict} → {new_verdict}"
            body = (
                f"样本[{sample.sample_id}]由旧模型判定为{prev_verdict}，"
                f"新系统改判为{new_verdict}。\n\n"
                f"改判依据：{sample.verdict_reason}\n\n"
                f"旧理由：{prev_reason or '(未提供旧理由)'}\n\n"
                f"边界样本={sample.is_boundary_sample}，"
                f"边界违规条数={len(sample.boundary_violations)}"
            )
            sev = "WARNING" if sample.verdict in (SampleVerdict.ANOMALY, SampleVerdict.BOUNDARY) else "INFO"
            self._make_conclusion(title, body, sample, severity=sev)
        elif sample.boundary_violations:
            title = f"越界结论: {new_verdict}"
            body = (
                f"样本[{sample.sample_id}]触发指标越界。\n\n"
                f"越界明细：{'; '.join(sample.boundary_violations)}\n\n"
                f"判定理由：{sample.verdict_reason}"
            )
            self._make_conclusion(title, body, sample, severity="ERROR")
        elif sample.is_boundary_sample:
            title = "边界样本结论"
            body = (
                f"样本[{sample.sample_id}]为边界样本，接近阈值，建议纳入回归集合。\n\n"
                f"判定理由：{sample.verdict_reason}"
            )
            self._make_conclusion(title, body, sample, severity="INFO")

        self._records.append(ProcessingRecord(
            record_id=f"VERDICT-{uuid.uuid4().hex[:12]}",
            stage=ProcessingStage.SAMPLE_VERDICT,
            action=f"判定样本{sample.sample_id}",
            inputs={"metrics": {k: m.value for k, m in sample.metrics.items()}},
            outputs={"verdict": str(new_verdict), "reason": sample.verdict_reason},
            log_refs=log_refs,
            operator="SampleReplayer",
            notes=[sample.verdict_reason[:200]],
        ))
        return sample

    def explain_change_detail(self, sample: CompressionSample) -> str:
        lines = []
        lines.append(f"=== 样本 {sample.sample_id} 改判说明 ===")
        lines.append(f"输入引用: {', '.join(sample.all_log_refs()) or '无'}")
        lines.append(f"版本别名: {sample.version_alias or '无'}")
        lines.append(f"旧模型判定: {sample.prev_verdict}")
        lines.append(f"旧判定理由: {sample.prev_reason or '(未提供)'}")
        lines.append(f"新系统判定: {sample.verdict}")
        lines.append(f"新判定理由: {sample.verdict_reason}")
        if sample.boundary_violations:
            lines.append("边界违规:")
            for v in sample.boundary_violations:
                lines.append(f"  - {v}")
        lines.append("指标明细:")
        for name, m in sample.metrics.items():
            lines.append(f"  {name}: {m.format_value()} {m.status_tag()}")
            if m.boundary:
                lines.append(f"    边界: {m.boundary.describe()}")
            if m.used_log_refs:
                lines.append(f"    日志来源: {', '.join(m.used_log_refs)}")
        if sample.linked_conclusion_ids:
            lines.append(f"关联结论ID: {', '.join(sample.linked_conclusion_ids)}")
        return "\n".join(lines)

    def drain_records(self) -> List[ProcessingRecord]:
        recs = self._records
        self._records = []
        return recs

    def drain_conclusions(self) -> List[Conclusion]:
        cs = self._conclusions
        self._conclusions = []
        return cs

    def peek_records(self) -> List[ProcessingRecord]:
        return list(self._records)

    def peek_conclusions(self) -> List[Conclusion]:
        return list(self._conclusions)
