from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Dict, Tuple

from .models import (
    CheckResult,
    GrayComparisonResult,
    ComparisonDiff,
    Finding,
    Severity,
)


def _finding_signature(finding: Finding) -> Tuple[str, str, int, str]:
    return (
        finding.rule_id,
        finding.matched_text,
        finding.line_number,
        finding.source_file,
    )


def compare_results(
    base_result: CheckResult,
    target_result: CheckResult,
) -> GrayComparisonResult:
    base_map: Dict[Tuple[str, str, int, str], Finding] = {}
    target_map: Dict[Tuple[str, str, int, str], Finding] = {}

    for f in base_result.findings:
        sig = _finding_signature(f)
        base_map[sig] = f

    for f in target_result.findings:
        sig = _finding_signature(f)
        target_map[sig] = f

    all_sigs = set(base_map.keys()) | set(target_map.keys())
    diffs: List[ComparisonDiff] = []

    new_findings = 0
    resolved_findings = 0
    severity_changed = 0

    for sig in all_sigs:
        base_finding = base_map.get(sig)
        target_finding = target_map.get(sig)

        if base_finding and not target_finding:
            resolved_findings += 1
            diff = ComparisonDiff(
                finding_id=base_finding.finding_id,
                rule_id=base_finding.rule_id,
                matched_text=base_finding.matched_text,
                line_number=base_finding.line_number,
                source_file=base_finding.source_file,
                status="resolved",
                base_only=True,
                base_severity=base_finding.severity,
            )
            diffs.append(diff)

        elif not base_finding and target_finding:
            new_findings += 1
            diff = ComparisonDiff(
                finding_id=target_finding.finding_id,
                rule_id=target_finding.rule_id,
                matched_text=target_finding.matched_text,
                line_number=target_finding.line_number,
                source_file=target_finding.source_file,
                status="new",
                target_only=True,
                target_severity=target_finding.severity,
            )
            diffs.append(diff)

        else:
            base_sev = base_finding.severity
            target_sev = target_finding.severity
            if base_sev != target_sev:
                severity_changed += 1
                diff = ComparisonDiff(
                    finding_id=target_finding.finding_id,
                    rule_id=target_finding.rule_id,
                    matched_text=target_finding.matched_text,
                    line_number=target_finding.line_number,
                    source_file=target_finding.source_file,
                    status="severity_changed",
                    severity_changed=True,
                    base_severity=base_sev,
                    target_severity=target_sev,
                )
                diffs.append(diff)

    summary = {
        "total_base_findings": len(base_result.findings),
        "total_target_findings": len(target_result.findings),
        "new_findings": new_findings,
        "resolved_findings": resolved_findings,
        "severity_changed": severity_changed,
        "unchanged": len(all_sigs) - new_findings - resolved_findings - severity_changed,
        "base_prompt_version": base_result.prompt_version,
        "target_prompt_version": target_result.prompt_version,
        "base_sample_batch": base_result.sample_batch,
        "target_sample_batch": target_result.sample_batch,
        "base_review_round": base_result.review_round,
        "target_review_round": target_result.review_round,
    }

    return GrayComparisonResult(
        comparison_id=str(uuid.uuid4()),
        base_result_id=base_result.result_id,
        target_result_id=target_result.result_id,
        compare_time=datetime.now(),
        total_base_findings=len(base_result.findings),
        total_target_findings=len(target_result.findings),
        new_findings=new_findings,
        resolved_findings=resolved_findings,
        severity_changed=severity_changed,
        diffs=diffs,
        summary=summary,
    )


def get_severity_order() -> Dict[Severity, int]:
    return {
        Severity.HIGH: 3,
        Severity.MEDIUM: 2,
        Severity.LOW: 1,
        Severity.INFO: 0,
    }


def severity_increased(base: Severity, target: Severity) -> bool:
    order = get_severity_order()
    return order[target] > order[base]
