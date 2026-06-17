from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from prompt_impact import errors as E
from prompt_impact import trace as trace_mod
from prompt_impact.models import Finding
from prompt_impact.parsing import ParsedInputs
from prompt_impact.store import Store


@dataclass
class ReplayResult:
    eval_run_id: str
    total_samples: int
    covered_samples: int
    missing_findings: List[str] = field(default_factory=list)
    unexplained: List[str] = field(default_factory=list)
    findings: List[Finding] = field(default_factory=list)
    errors: List[E.ActionableError] = field(default_factory=list)
    status: str = "incomplete"

    def to_dict(self) -> dict:
        return {
            "eval_run_id": self.eval_run_id,
            "total_samples": self.total_samples,
            "covered_samples": self.covered_samples,
            "missing_findings": self.missing_findings,
            "unexplained": self.unexplained,
            "findings": [f.to_dict() for f in self.findings],
            "errors": [e.to_dict() for e in self.errors],
            "status": self.status,
        }


def replay(inputs: ParsedInputs, store: Store, eval_run_id: str) -> ReplayResult:
    run = next((r for r in inputs.eval_runs if r.eval_run_id == eval_run_id), None)
    if run is None:
        return ReplayResult(
            eval_run_id=eval_run_id,
            total_samples=0,
            covered_samples=0,
            errors=[E.missing_eval_run(eval_run_id)],
            status="missing",
        )
    samples = {r.sample_id for r in run.results}
    findings = [f for f in store.findings_list() if f.eval_run_id == eval_run_id and not f.resolved]
    covered = {f.sample_key for f in findings}
    missing = sorted(samples - covered)
    trace_index = {r.finding_id: r for r in trace_mod.build_trace_records(store)}
    unexplained = []
    errors: List[E.ActionableError] = []
    for f in findings:
        rec = trace_index.get(f.id)
        if rec is None or not rec.complete:
            unexplained.append(f.id)
            err = E.ActionableError(
                code=E.REPLAY_INCOMPLETE,
                message=f"评测回放: 结论 {f.id} 无法解释（缺少来源证据）",
                detail={"finding_id": f.id, "eval_run_id": eval_run_id},
            )
            errors.append(err)
    for sid in missing:
        errors.append(
            E.ActionableError(
                code=E.REPLAY_INCOMPLETE,
                message=f"评测回放: 样本 {sid} 在 {eval_run_id} 中无对应结论记录",
                severity=E.WARN,
                blocking=E.NON_BLOCKING,
                detail={"sample_id": sid, "eval_run_id": eval_run_id},
            )
        )
    status = "complete" if not missing and not unexplained else "incomplete"
    return ReplayResult(
        eval_run_id=eval_run_id,
        total_samples=len(samples),
        covered_samples=len(covered & samples),
        missing_findings=missing,
        unexplained=unexplained,
        findings=findings,
        errors=errors,
        status=status,
    )


def render_replay(result: ReplayResult) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append(f"评测回放 · {result.eval_run_id}")
    lines.append("=" * 60)
    lines.append(f"状态        : {result.status}")
    lines.append(f"样本覆盖    : {result.covered_samples}/{result.total_samples}")
    lines.append(f"未覆盖样本  : {len(result.missing_findings)}")
    lines.append(f"无法解释    : {len(result.unexplained)}")
    if result.missing_findings:
        lines.append("缺失结论的样本:")
        for sid in result.missing_findings:
            lines.append(f"  - {sid}")
    if result.unexplained:
        lines.append("无法解释的结论:")
        for fid in result.unexplained:
            lines.append(f"  - {fid}")
    if result.errors:
        lines.append("可操作错误:")
        for e in result.errors:
            lines.append(f"  [{e.code}] {e.message}")
            lines.append(f"      -> {e.remediation}")
    lines.append("=" * 60)
    return "\n".join(lines)
