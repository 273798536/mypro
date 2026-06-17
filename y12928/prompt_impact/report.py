from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import List

from prompt_impact import errors as E
from prompt_impact import trace as trace_mod
from prompt_impact.models import (
    Report,
    RunManifest,
    SEV_BLOCKER,
    SEV_INFO,
    SEV_WARN,
    STATUS_FAIL,
    STATUS_PASS,
    STATUS_PENDING,
    STATUS_RESOLVED,
)
from prompt_impact.store import Store

GATE_PASS = "PASS"
GATE_PENDING = "PENDING"
GATE_FAIL = "FAIL"

KIND_LABEL = {
    "eval_result": "评测结果",
    "training_validation_leakage": "训练验证泄漏",
    "prompt_regression": "Prompt 回退",
}


def _gate(findings, errors) -> str:
    blocking_errors = [e for e in errors if e.blocking == E.BLOCKING]
    unresolved = [f for f in findings if not f.resolved]
    blocker = [f for f in unresolved if f.severity == SEV_BLOCKER]
    pending = [f for f in unresolved if f.status == STATUS_PENDING]
    if blocking_errors or blocker:
        return GATE_FAIL
    if pending:
        return GATE_PENDING
    return GATE_PASS


def build_summary(findings, errors, materials) -> dict:
    by_status = Counter(f.status for f in findings)
    by_kind = Counter(f.kind for f in findings)
    by_sev = Counter(f.severity for f in findings)
    unresolved = [f for f in findings if not f.resolved]
    blocking_errors = [e for e in errors if e.blocking == E.BLOCKING]
    return {
        "total_findings": len(findings),
        "unresolved": len(unresolved),
        "by_status": {
            STATUS_PASS: by_status.get(STATUS_PASS, 0),
            STATUS_FAIL: by_status.get(STATUS_FAIL, 0),
            STATUS_PENDING: by_status.get(STATUS_PENDING, 0),
            STATUS_RESOLVED: by_status.get(STATUS_RESOLVED, 0),
        },
        "by_kind": dict(by_kind),
        "by_severity": {
            SEV_BLOCKER: by_sev.get(SEV_BLOCKER, 0),
            SEV_WARN: by_sev.get(SEV_WARN, 0),
            SEV_INFO: by_sev.get(SEV_INFO, 0),
        },
        "materials": len(materials),
        "blocking_errors": len(blocking_errors),
        "gate_decision": _gate(findings, errors),
    }


def build_report(
    store: Store,
    manifest: RunManifest,
    run_id: str,
    now: str,
    parse_errors: List[E.ActionableError],
) -> Report:
    findings = sorted(store.findings_list(), key=lambda f: (f.kind, f.status, f.id))
    untraceable = trace_mod.detect_untraceable(store)
    errors = list(parse_errors) + list(untraceable)
    summary = build_summary(findings, errors, store.materials.values())
    summary["new_findings"] = len(manifest.new_findings)
    summary["changed_findings"] = len(manifest.changed_findings)
    summary["resolved_findings"] = len(manifest.resolved_findings)
    gate = _gate(findings, errors)
    summary["gate_decision"] = gate
    return Report(
        run_id=run_id,
        generated_at=now,
        gate_decision=gate,
        summary=summary,
        findings=findings,
        errors=errors,
        manifest=manifest,
    )


def to_markdown(report: Report) -> str:
    s = report.summary
    lines = []
    lines.append("# Prompt 改动影响报告")
    lines.append("")
    lines.append(f"- 运行 ID: `{report.run_id}`")
    lines.append(f"- 生成时间: {report.generated_at}")
    gate_label = {"PASS": "通过 ✅", "PENDING": "待确认 ⚠", "FAIL": "不通过 ❌"}.get(report.gate_decision, report.gate_decision)
    lines.append(f"- 门禁结论: **{gate_label}** (`{report.gate_decision}`)")
    lines.append("")
    lines.append("## 概要")
    lines.append("")
    lines.append("| 指标 | 数值 |")
    lines.append("| --- | --- |")
    lines.append(f"| 结论总数 | {s['total_findings']} |")
    lines.append(f"| 未结清 | {s['unresolved']} |")
    lines.append(f"| 通过/失败/待确认/已解决 | {s['by_status']['pass']}/{s['by_status']['fail']}/{s['by_status']['pending_confirmation']}/{s['by_status']['resolved']} |")
    lines.append(f"| 阻断/警告/提示 | {s['by_severity']['blocker']}/{s['by_severity']['warn']}/{s['by_severity']['info']} |")
    lines.append(f"| 本次新增/变更/已解决 | {s['new_findings']}/{s['changed_findings']}/{s['resolved_findings']} |")
    lines.append(f"| 阻断错误数 | {s['blocking_errors']} |")
    lines.append(f"| 来源材料数 | {s['materials']} |")
    lines.append("")
    lines.append("## 结论明细")
    lines.append("")
    if not report.findings:
        lines.append("_暂无结论记录。_")
    for f in report.findings:
        label = KIND_LABEL.get(f.kind, f.kind)
        flag = "✅" if f.status == "pass" else ("❌" if f.status == "fail" else ("⚠" if f.status == "pending_confirmation" else "✔(已解决)"))
        lines.append(f"### {flag} {label} · `{f.id}`")
        lines.append(f"- 状态: `{f.status}`  严重度: `{f.severity}`  prompt: `{f.prompt_version}`  eval: `{f.eval_run_id}`  样本: `{f.sample_key}`")
        lines.append(f"- 结论: {f.conclusion}")
        if f.evidence:
            lines.append("- 来源:")
            for e in f.evidence:
                loc = e.path
                if e.line_start is not None:
                    loc += f"#L{e.line_start}"
                    if e.line_end and e.line_end != e.line_start:
                        loc += f"-L{e.line_end}"
                lines.append(f"  - `{loc}`")
        lines.append("")
    lines.append("## 可操作错误")
    lines.append("")
    if not report.errors:
        lines.append("_无错误。_")
    for e in report.errors:
        lines.append(f"- **[{e.code}]** {e.message}")
        if e.missing_artifact:
            lines.append(f"  - 缺失材料: `{e.missing_artifact}`")
        lines.append(f"  - 处置建议: {e.remediation}")
        if e.detail:
            lines.append(f"  - 详情: `{json.dumps(e.detail, ensure_ascii=False)}`")
    return "\n".join(lines) + "\n"


def to_terminal_summary(report: Report) -> str:
    s = report.summary
    gate_label = {"PASS": "通过 ✅", "PENDING": "待确认 ⚠", "FAIL": "不通过 ❌"}.get(report.gate_decision, report.gate_decision)
    lines = []
    lines.append("=" * 60)
    lines.append("Prompt 改动影响报告 · 摘要")
    lines.append("=" * 60)
    lines.append(f"门禁结论      : {gate_label}  ({report.gate_decision})")
    lines.append(f"运行 ID       : {report.run_id}")
    lines.append(f"结论(未结清)   : {s['total_findings']} ({s['unresolved']})  "
                 f"通过 {s['by_status']['pass']} / 失败 {s['by_status']['fail']} / 待确认 {s['by_status']['pending_confirmation']} / 已解决 {s['by_status']['resolved']}")
    lines.append(f"严重度        : 阻断 {s['by_severity']['blocker']} / 警告 {s['by_severity']['warn']} / 提示 {s['by_severity']['info']}")
    lines.append(f"本次变动      : 新增 {s['new_findings']} / 变更 {s['changed_findings']} / 已解决 {s['resolved_findings']}")
    lines.append(f"阻断错误      : {s['blocking_errors']}  来源材料: {s['materials']}")
    lines.append("-" * 60)
    blockers = [f for f in report.findings if not f.resolved and f.severity == SEV_BLOCKER]
    if blockers:
        lines.append("阻断项:")
        for f in blockers[:5]:
            lines.append(f"  ❌ [{KIND_LABEL.get(f.kind, f.kind)}] {f.id}  {f.summary}")
    pendings = [f for f in report.findings if not f.resolved and f.status == STATUS_PENDING]
    if pendings:
        lines.append("待确认项:")
        for f in pendings[:5]:
            lines.append(f"  ⚠ {f.id}  {f.summary}")
    if report.errors:
        lines.append("可操作错误:")
        for e in report.errors[:5]:
            lines.append(f"  [{e.code}] {e.message}")
            lines.append(f"      -> {e.remediation}")
    lines.append("=" * 60)
    return "\n".join(lines)


def assert_consistent(report: Report, md: str, terminal: str) -> None:
    gate = report.gate_decision
    gate_label = {"PASS": "通过 ✅", "PENDING": "待确认 ⚠", "FAIL": "不通过 ❌"}.get(gate, gate)
    if gate_label not in md:
        raise RuntimeError(f"导出 Markdown 门禁标注缺失: 期望 {gate_label}")
    if gate_label not in terminal:
        raise RuntimeError(f"终端摘要门禁标注缺失: 期望 {gate_label}")
    md_fail = "不通过 ❌" in md
    term_fail = "不通过 ❌" in terminal
    if md_fail != term_fail:
        raise RuntimeError("导出与摘要门禁不一致(通过/不通过标注不一致)")
    bs = report.summary.get("by_status", {})
    sev = report.summary.get("by_severity", {})
    pending_count = bs.get(STATUS_PENDING, 0)
    blocker_count = sev.get(SEV_BLOCKER, 0)
    blocking_errors = report.summary.get("blocking_errors", 0)
    if pending_count > 0 and gate == GATE_PASS:
        raise RuntimeError("门禁判定为通过，但存在待确认结论，导出与明细不一致")
    if (blocker_count > 0 or blocking_errors > 0) and gate != GATE_FAIL:
        raise RuntimeError("存在阻断项或阻断错误，但门禁未判定为不通过，导出与明细不一致")
    if pending_count == 0 and blocker_count == 0 and blocking_errors == 0 and gate not in (GATE_PASS,):
        raise RuntimeError("无阻断且无待确认，但门禁未判定为通过，导出与明细不一致")



def save_artifacts(report: Report, store: Store, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    md = to_markdown(report)
    terminal = to_terminal_summary(report)
    assert_consistent(report, md, terminal)
    (output_dir / "report.json").write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "report.md").write_text(md, encoding="utf-8")
    (output_dir / "errors.jsonl").write_text(
        "\n".join(json.dumps(e.to_dict(), ensure_ascii=False) for e in report.errors) + ("\n" if report.errors else ""),
        encoding="utf-8",
    )
    trace_records = trace_mod.build_trace_records(store)
    (output_dir / "trace_index.jsonl").write_text(
        "\n".join(json.dumps(r.to_dict(), ensure_ascii=False) for r in trace_records) + ("\n" if trace_records else ""),
        encoding="utf-8",
    )
    if report.manifest:
        (output_dir / "manifest.json").write_text(
            json.dumps(report.manifest.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (output_dir / "summary.txt").write_text(terminal, encoding="utf-8")
