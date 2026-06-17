from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Dict, Tuple, Callable, Optional
from collections import defaultdict
from pathlib import Path

from .models import (
    CheckResult,
    GrayComparisonResult,
    ComparisonDiff,
    Finding,
    Severity,
)


def _content_key(finding: Finding) -> Tuple[str, str]:
    return (finding.rule_id, finding.matched_text)


def _content_line_key(finding: Finding) -> Tuple[str, str, int]:
    return (finding.rule_id, finding.matched_text, finding.line_number)


def _strict_key(finding: Finding, normalize_source: bool) -> Tuple[str, str, int, str]:
    source = _normalize_source(finding.source_file) if normalize_source else finding.source_file
    return (finding.rule_id, finding.matched_text, finding.line_number, source)


def _normalize_source(source_file: str) -> str:
    return Path(source_file).name


MATCH_MODE_CONTENT = "content"
MATCH_MODE_CONTENT_LINE = "content_line"
MATCH_MODE_STRICT = "strict"

MATCH_MODES = (MATCH_MODE_CONTENT, MATCH_MODE_CONTENT_LINE, MATCH_MODE_STRICT)


def _build_key(finding: Finding, match_mode: str, normalize_source: bool):
    if match_mode == MATCH_MODE_CONTENT:
        return _content_key(finding)
    if match_mode == MATCH_MODE_CONTENT_LINE:
        return _content_line_key(finding)
    if match_mode == MATCH_MODE_STRICT:
        return _strict_key(finding, normalize_source)
    raise ValueError(f"不支持的匹配模式: {match_mode}，可选: {list(MATCH_MODES)}")


def _build_groups(
    result: CheckResult,
    match_mode: str,
    normalize_source: bool,
) -> Dict[Tuple, List[Finding]]:
    groups: Dict[Tuple, List[Finding]] = defaultdict(list)
    for f in result.findings:
        key = _build_key(f, match_mode, normalize_source)
        groups[key].append(f)
    return groups


def _max_severity(findings: List[Finding]) -> Severity:
    order = get_severity_order()
    return max(findings, key=lambda f: order[f.severity]).severity


def compare_results(
    base_result: CheckResult,
    target_result: CheckResult,
    match_mode: str = MATCH_MODE_CONTENT,
    normalize_source: bool = True,
    include_unchanged: bool = True,
) -> GrayComparisonResult:
    """
    灰度对比：识别同一业务记录在版本间的延续或变化。

    匹配模式 match_mode：
        - "content"      (默认) 按 (规则ID, 匹配文本) 匹配。
                          适合灰度对比：同一业务数据在不同版本/不同文件中，
                          只要敏感内容相同即视为同一条记录，可识别延续。
        - "content_line" 按 (规则ID, 匹配文本, 行号) 匹配。
        - "strict"       按 (规则ID, 匹配文本, 行号, 源文件) 严格匹配。

    normalize_source：strict 模式下是否把源文件归一化为 basename，
        避免不同版本的同名文件被误判为不同来源。

    include_unchanged：是否在 diffs 中输出 unchanged 记录，
        方便看到哪些业务记录在版本间延续了下来。
    """
    if base_result is None or target_result is None:
        raise ValueError("base_result 与 target_result 不能为空")
    if match_mode not in MATCH_MODES:
        raise ValueError(f"不支持的匹配模式: {match_mode}，可选: {list(MATCH_MODES)}")

    base_groups = _build_groups(base_result, match_mode, normalize_source)
    target_groups = _build_groups(target_result, match_mode, normalize_source)

    all_keys: set = set(base_groups.keys()) | set(target_groups.keys())

    diffs: List[ComparisonDiff] = []
    new_count = 0
    resolved_count = 0
    severity_changed_count = 0
    unchanged_count = 0

    for key in all_keys:
        base_findings = base_groups.get(key, [])
        target_findings = target_groups.get(key, [])

        if base_findings and not target_findings:
            resolved_count += len(base_findings)
            for f in base_findings:
                diffs.append(ComparisonDiff(
                    finding_id=f.finding_id,
                    rule_id=f.rule_id,
                    matched_text=f.matched_text,
                    line_number=f.line_number,
                    source_file=f.source_file,
                    status="resolved",
                    base_only=True,
                    base_severity=f.severity,
                ))

        elif not base_findings and target_findings:
            new_count += len(target_findings)
            for f in target_findings:
                diffs.append(ComparisonDiff(
                    finding_id=f.finding_id,
                    rule_id=f.rule_id,
                    matched_text=f.matched_text,
                    line_number=f.line_number,
                    source_file=f.source_file,
                    status="new",
                    target_only=True,
                    target_severity=f.severity,
                ))

        else:
            base_sev = _max_severity(base_findings)
            target_sev = _max_severity(target_findings)

            if base_sev != target_sev:
                severity_changed_count += len(target_findings)
                for f in target_findings:
                    diffs.append(ComparisonDiff(
                        finding_id=f.finding_id,
                        rule_id=f.rule_id,
                        matched_text=f.matched_text,
                        line_number=f.line_number,
                        source_file=f.source_file,
                        status="severity_changed",
                        severity_changed=True,
                        base_severity=base_sev,
                        target_severity=target_sev,
                    ))
            else:
                unchanged_count += len(target_findings)
                if include_unchanged:
                    for f in target_findings:
                        diffs.append(ComparisonDiff(
                            finding_id=f.finding_id,
                            rule_id=f.rule_id,
                            matched_text=f.matched_text,
                            line_number=f.line_number,
                            source_file=f.source_file,
                            status="unchanged",
                            base_severity=f.severity,
                            target_severity=f.severity,
                        ))

    summary = {
        "total_base_findings": len(base_result.findings),
        "total_target_findings": len(target_result.findings),
        "new_findings": new_count,
        "resolved_findings": resolved_count,
        "severity_changed": severity_changed_count,
        "unchanged": unchanged_count,
        "match_mode": match_mode,
        "normalize_source": normalize_source,
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
        new_findings=new_count,
        resolved_findings=resolved_count,
        severity_changed=severity_changed_count,
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
