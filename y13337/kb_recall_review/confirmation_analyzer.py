from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .models import (
    SampleRecord,
    DuplicateInfo,
    ModelResult,
    ManualReviewRecord,
    JudgmentType,
    ReviewStatus,
)


class NeedsConfirmationItem:
    def __init__(
        self,
        sample_id: str,
        reason: str,
        impact_scope: str,
        raw_rows: List[int],
        details: Optional[Dict] = None,
    ):
        self.sample_id = sample_id
        self.reason = reason
        self.impact_scope = impact_scope
        self.raw_rows = raw_rows
        self.details = details or {}
        self.status = ReviewStatus.NEEDS_CONFIRMATION

    def to_dict(self) -> Dict:
        return {
            "sample_id": self.sample_id,
            "reason": self.reason,
            "impact_scope": self.impact_scope,
            "raw_rows": ", ".join(str(r) for r in self.raw_rows),
            "status": self.status.value,
            **self.details,
        }


def analyze_duplicate_impact(
    duplicates: List[DuplicateInfo],
    duplicate_groups: Dict[str, List[SampleRecord]],
    old_results: List[ModelResult],
    new_results: List[ModelResult],
    manual_reviews: List[ManualReviewRecord],
) -> List[NeedsConfirmationItem]:
    items = []

    old_map = {r.sample_id: r for r in old_results}
    new_map = {r.sample_id: r for r in new_results}

    review_map = defaultdict(list)
    for r in manual_reviews:
        review_map[r.sample_id].append(r)

    for dup in duplicates:
        group = duplicate_groups.get(dup.sample_id, [])
        if not group:
            continue

        raw_rows = [s.raw_row_index for s in group if s.raw_row_index is not None]

        reasons = []
        impact_points = []

        if dup.conflict_found:
            reasons.append(f"样本信息冲突: {dup.conflict_details}")
            impact_points.append("样本标注基准不统一，影响准确率计算")

        old_r = old_map.get(dup.sample_id)
        new_r = new_map.get(dup.sample_id)

        if old_r and new_r:
            if old_r.confidence_score != new_r.confidence_score:
                reasons.append("新旧模型结果存在差异")
                impact_points.append("模型对比结论受重复评测影响")

        sample_reviews = review_map.get(dup.sample_id, [])
        if len(sample_reviews) > 1:
            judgments = set(r.judgment.value for r in sample_reviews)
            if len(judgments) > 1:
                reasons.append(f"人工改判存在多个版本: {judgments}")
                impact_points.append("最终判断需确认以哪次人工评测为准")
            reviewers = set(r.reviewer for r in sample_reviews)
            if len(reviewers) > 1:
                impact_points.append(f"涉及 {len(reviewers)} 位评测人员的判断")

        if not reasons:
            reasons.append(f"样本重复出现 {dup.duplicate_count} 次")
            impact_points.append("重复统计可能导致指标偏差")

        item = NeedsConfirmationItem(
            sample_id=dup.sample_id,
            reason="; ".join(reasons),
            impact_scope="; ".join(impact_points),
            raw_rows=raw_rows,
            details={
                "duplicate_count": dup.duplicate_count,
                "source_sheets": list(set(s.source_sheet for s in group if s.source_sheet)),
                "has_manual_review": len(sample_reviews) > 0,
                "review_count": len(sample_reviews),
            },
        )
        items.append(item)

    return items


def analyze_bad_data_impact(
    samples: List[SampleRecord],
    comparison: Dict[str, Dict],
) -> List[NeedsConfirmationItem]:
    items = []
    bad_samples = [s for s in samples if s.is_bad_data]

    for sample in bad_samples:
        raw_row = sample.raw_row_index if sample.raw_row_index else []
        if not isinstance(raw_row, list):
            raw_row = [raw_row] if raw_row else []

        reason = sample.bad_data_reason or "数据质量异常"
        impact = "该样本不计入正式指标，建议从样本表中清理或修正"

        comp = comparison.get(sample.sample_id)
        details = {}
        if comp:
            if comp.get("old_result"):
                details["old_score"] = comp["old_result"].confidence_score
            if comp.get("new_result"):
                details["new_score"] = comp["new_result"].confidence_score

        item = NeedsConfirmationItem(
            sample_id=sample.sample_id,
            reason=reason,
            impact_scope=impact,
            raw_rows=raw_row,
            details=details,
        )
        items.append(item)

    return items


def analyze_threshold_vs_manual(
    comparison: Dict[str, Dict],
    threshold_influenced: List[Dict],
) -> List[NeedsConfirmationItem]:
    items = []

    for infl in threshold_influenced:
        sample_id = infl["sample_id"]
        comp = comparison.get(sample_id)
        if not comp:
            continue

        manual = comp.get("manual_review")
        if not manual:
            continue

        raw_row = comp["sample"].raw_row_index
        raw_rows = [raw_row] if raw_row else []

        if manual.changed_by_threshold:
            continue

        model_judgment = JudgmentType.CORRECT if infl["new_above"] else JudgmentType.INCORRECT

        if model_judgment != manual.judgment:
            reason = (
                f"阈值调整导致模型判断从 {infl['old_above']} 变为 {infl['new_above']}，"
                f"但人工判断为 {manual.judgment.value}，需确认阈值是否覆盖了人工结论"
            )
            impact = "阈值变化可能盖过人工判断，违反人工改判优先原则"

            item = NeedsConfirmationItem(
                sample_id=sample_id,
                reason=reason,
                impact_scope=impact,
                raw_rows=raw_rows,
                details={
                    "old_threshold": infl["old_threshold"],
                    "new_threshold": infl["new_threshold"],
                    "old_score": infl["old_score"],
                    "new_score": infl["new_score"],
                    "direction": infl["direction"],
                    "manual_judgment": manual.judgment.value,
                    "reviewer": manual.reviewer,
                },
            )
            items.append(item)

    return items


def summarize_confirmation_items(
    items: List[NeedsConfirmationItem],
) -> Dict:
    total = len(items)
    by_reason = defaultdict(int)
    sample_ids = set()

    for item in items:
        sample_ids.add(item.sample_id)
        reason_key = item.reason.split(";")[0][:30]
        by_reason[reason_key] += 1

    return {
        "total_items": total,
        "unique_samples": len(sample_ids),
        "by_reason": dict(by_reason),
    }
