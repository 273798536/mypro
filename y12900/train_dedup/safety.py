"""安全拦截与来源追踪模块

负责把结论拉回来源材料，确保每条处理结果都能追溯到原始行号、图片名或备注
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .models import AuditAction, AuditEntry, RecordStatus, Sample, SourceRef


@dataclass
class SafetyGateResult:
    """安全门处理结果"""

    passed: list[Sample]
    blocked: list[Sample]
    review: list[Sample]
    audit_entries: list[AuditEntry]


def trace_source(sample: Sample) -> dict:
    """提取样本的来源追溯信息"""
    info: dict = {
        "sample_id": sample.sample_id,
        "content_hash": sample.content_hash(),
    }
    if sample.source_ref:
        info["source_file"] = sample.source_ref.source_file
        if sample.source_ref.line_number is not None:
            info["line_number"] = sample.source_ref.line_number
        if sample.source_ref.image_name:
            info["image_name"] = sample.source_ref.image_name
        if sample.source_ref.remark:
            info["remark"] = sample.source_ref.remark
    return info


def format_source_trace(info: dict) -> str:
    """格式化来源追溯信息，供人类阅读"""
    parts = [f"样本 {info.get('sample_id', '?')}"]
    if "source_file" in info:
        parts.append(f"来源文件: {info['source_file']}")
    if "line_number" in info:
        parts.append(f"行号: {info['line_number']}")
    if "image_name" in info:
        parts.append(f"图片: {info['image_name']}")
    if "remark" in info:
        parts.append(f"备注: {info['remark']}")
    parts.append(f"内容指纹: {info.get('content_hash', '?')}")
    return " | ".join(parts)


def classify_sample(sample: Sample) -> RecordStatus:
    """根据样本元数据判断当前状态（优先级从高到低）"""
    if sample.metadata.get("bad_reason"):
        return RecordStatus.BAD
    if sample.metadata.get("leakage_flag"):
        return RecordStatus.LEAKAGE
    if sample.metadata.get("removed_by"):
        return RecordStatus.DUPLICATE
    if sample.metadata.get("needs_review_reason"):
        return RecordStatus.NEEDS_REVIEW
    return RecordStatus.CLEAN


def safety_gate(
    samples: Iterable[Sample],
    operator: str = "system",
    require_source_ref: bool = False,
) -> SafetyGateResult:
    """安全门：拦截异常记录，保留来源追溯

    - 所有样本必须能追溯到来源
    - 被标记为 bad / duplicate / leakage 的样本会被拦截
    - needs_review 的样本进入复核队列
    """
    sample_list = list(samples)
    passed: list[Sample] = []
    blocked: list[Sample] = []
    review: list[Sample] = []
    audit_entries: list[AuditEntry] = []

    for s in sample_list:
        trace = trace_source(s)
        status = classify_sample(s)

        if require_source_ref and not s.source_ref:
            status = RecordStatus.NEEDS_REVIEW
            s.metadata["needs_review_reason"] = "缺少来源引用，无法追溯"

        if status == RecordStatus.CLEAN:
            passed.append(s)
            audit_entries.append(
                AuditEntry(
                    action=AuditAction.CREATE,
                    sample_id=s.sample_id,
                    detail={"status": "clean", "trace": trace},
                    operator=operator,
                )
            )
        elif status == RecordStatus.NEEDS_REVIEW:
            review.append(s)
            audit_entries.append(
                AuditEntry(
                    action=AuditAction.FLAG_REVIEW,
                    sample_id=s.sample_id,
                    detail={
                        "status": "needs_review",
                        "reason": s.metadata.get("needs_review_reason", ""),
                        "trace": trace,
                    },
                    operator=operator,
                )
            )
        else:
            blocked.append(s)
            if status == RecordStatus.BAD:
                action = AuditAction.FLAG_BAD
            elif status == RecordStatus.DUPLICATE:
                action = AuditAction.DEDUP
            else:
                action = AuditAction.DETECT_LEAKAGE
            audit_entries.append(
                AuditEntry(
                    action=action,
                    sample_id=s.sample_id,
                    detail={
                        "status": status.value,
                        "reason": s.metadata.get(
                            "bad_reason"
                        )
                        or s.metadata.get("removed_by")
                        or s.metadata.get("leakage_reason", ""),
                        "trace": trace,
                    },
                    operator=operator,
                )
            )

    return SafetyGateResult(passed, blocked, review, audit_entries)


def build_report_lines(
    result: SafetyGateResult,
    include_content: bool = False,
) -> list[str]:
    """生成可读的报告行"""
    lines: list[str] = []
    lines.append("=" * 70)
    lines.append("训练集近重复清洗 - 安全拦截报告")
    lines.append("=" * 70)
    lines.append(f"[PASS] 可直接使用: {len(result.passed)} 条")
    lines.append(f"[REVIEW] 待算法产品经理复核: {len(result.review)} 条")
    lines.append(f"[BLOCK] 已拦截（坏数据/重复/泄漏）: {len(result.blocked)} 条")
    lines.append("-" * 70)

    if result.passed:
        lines.append("\n## 可直接使用（训练组可直接导入）")
        for s in result.passed:
            lines.append(f"  ✓ {format_source_trace(trace_source(s))}")
            if include_content:
                lines.append(f"      内容: {s.content[:80]}...")

    if result.review:
        lines.append("\n## 待复核（需算法产品经理确认）")
        for s in result.review:
            reason = s.metadata.get("needs_review_reason", "")
            lines.append(f"  ? {format_source_trace(trace_source(s))}")
            lines.append(f"      原因: {reason}")
            if include_content:
                lines.append(f"      内容: {s.content[:80]}...")

    if result.blocked:
        lines.append("\n## 已拦截（不会进入训练流程）")
        for s in result.blocked:
            status = classify_sample(s).value
            reason = (
                s.metadata.get("bad_reason")
                or s.metadata.get("removed_by")
                or s.metadata.get("leakage_reason", "")
            )
            lines.append(f"  ✗ [{status.upper()}] {format_source_trace(trace_source(s))}")
            lines.append(f"      原因: {reason}")
            if include_content:
                lines.append(f"      内容: {s.content[:80]}...")

    lines.append("\n" + "=" * 70)
    return lines
