from __future__ import annotations

from typing import Dict, List, Optional

from prompt_impact import errors as E
from prompt_impact.models import (
    FINDING_LEAKAGE,
    Finding,
    ProcessingStep,
    SourceRef,
    TraceRecord,
)
from prompt_impact.store import Store


def _distinct_paths(refs: List[SourceRef]) -> List[str]:
    seen = []
    for r in refs:
        if r.path and r.path not in seen:
            seen.append(r.path)
    return seen


def _is_complete(finding: Finding) -> tuple:
    paths = _distinct_paths(finding.evidence)
    if finding.kind == FINDING_LEAKAGE:
        if len(paths) < 2:
            return False, ["缺少训练侧来源证据（应有训练日志/标注 + 验证评测两处来源）"]
        return True, []
    if len(paths) < 1:
        return False, ["缺少任何来源证据，无法倒查"]
    return True, []


def build_trace_records(store: Store) -> List[TraceRecord]:
    records: List[TraceRecord] = []
    for finding in store.findings_list():
        complete, gaps = _is_complete(finding)
        material_keys = []
        for e in finding.evidence:
            if e.material_key and e.material_key not in material_keys:
                material_keys.append(e.material_key)
        steps = [
            ProcessingStep(
                step="ingest",
                description=f"解析并登记 {len(material_keys)} 份来源材料（prompt/model_log/annotation/eval_run）",
                input_material_keys=material_keys,
            ),
            ProcessingStep(
                step="analyze",
                description=f"按 (kind, prompt_version, eval_run_id, sample_key) 计算结论 {finding.kind}",
                input_material_keys=material_keys,
            ),
        ]
        records.append(
            TraceRecord(
                finding_id=finding.id,
                sources=list(finding.evidence),
                processing=steps,
                complete=complete,
                gaps=gaps,
            )
        )
    return records


def trace_for(store: Store, finding_id: str) -> Optional[TraceRecord]:
    finding = store.findings.get(finding_id)
    if finding is None:
        return None
    records = {r.finding_id: r for r in build_trace_records(store)}
    return records.get(finding_id)


def detect_untraceable(store: Store) -> List[E.ActionableError]:
    errors: List[E.ActionableError] = []
    for finding in store.findings_list():
        if finding.resolved:
            continue
        complete, gaps = _is_complete(finding)
        if not complete:
            err = E.leakage_untraceable(finding.id)
            err.detail = {"finding_id": finding.id, "kind": finding.kind, "gaps": gaps, "summary": finding.summary}
            errors.append(err)
    return errors


def render_trace(record: TraceRecord, finding: Optional[Finding]) -> str:
    lines = []
    lines.append(f"追溯报告: {record.finding_id}")
    if finding:
        lines.append(f"  类型: {finding.kind}  状态: {finding.status}  严重: {finding.severity}")
        lines.append(f"  结论: {finding.conclusion}")
    lines.append("  来源 (可点击定位):")
    if not record.sources:
        lines.append("    - (无)  ⚠ 无法倒查到来源")
    for s in record.sources:
        loc = s.path
        if s.line_start is not None:
            loc += f"#L{s.line_start}"
            if s.line_end and s.line_end != s.line_start:
                loc += f"-L{s.line_end}"
        note = f"  [{s.note}]" if s.note else ""
        lines.append(f"    - {loc}{note}")
    lines.append("  处理记录:")
    for p in record.processing:
        keys = ", ".join(p.input_material_keys) or "-"
        lines.append(f"    - [{p.step}] {p.description}  材料: {keys}")
    status = "完整 ✓" if record.complete else "不完整 ✗"
    lines.append(f"  追溯完整性: {status}")
    for g in record.gaps:
        lines.append(f"    缺口: {g}")
    return "\n".join(lines)
