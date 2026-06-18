import csv
import os
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime

from .models import (
    SampleRecord,
    ModelResult,
    ManualReviewRecord,
    JudgmentType,
    ReviewStatus,
    ReviewSummary,
    ProcessTimelineEntry,
)


def load_model_results_from_csv(file_path: str, model_version: str, threshold: float) -> List[ModelResult]:
    results = []
    if not os.path.exists(file_path):
        return results

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):
            sample_id = row.get("sample_id", row.get("id", "")).strip()
            recall_knowledge_id = row.get("recall_knowledge_id", row.get("knowledge_id", "")).strip()
            recall_knowledge_title = row.get("recall_knowledge_title", row.get("knowledge_title", "")).strip()
            score_str = row.get("confidence_score", row.get("score", "0")).strip()

            try:
                confidence_score = float(score_str)
            except ValueError:
                confidence_score = 0.0

            rank_str = row.get("rank", "1").strip()
            try:
                rank = int(rank_str)
            except ValueError:
                rank = 1

            threshold_override = row.get("threshold", "").strip()
            actual_threshold = float(threshold_override) if threshold_override else threshold

            result = ModelResult(
                sample_id=sample_id,
                model_version=model_version,
                recall_knowledge_id=recall_knowledge_id,
                recall_knowledge_title=recall_knowledge_title,
                confidence_score=confidence_score,
                rank=rank,
                threshold=actual_threshold,
            )
            results.append(result)

    return results


def load_manual_reviews_from_csv(file_path: str) -> List[ManualReviewRecord]:
    reviews = []
    if not os.path.exists(file_path):
        return reviews

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sample_id = row.get("sample_id", "").strip()
            reviewer = row.get("reviewer", "unknown").strip()
            review_time_str = row.get("review_time", "").strip()
            try:
                review_time = datetime.fromisoformat(review_time_str) if review_time_str else datetime.now()
            except ValueError:
                review_time = datetime.now()

            judgment_str = row.get("judgment", "").strip().lower()
            original_str = row.get("original_judgment", "").strip().lower()

            judgment = _parse_judgment(judgment_str)
            original_judgment = _parse_judgment(original_str) if original_str else judgment

            changed_by_threshold = row.get("changed_by_threshold", "").strip().lower() in ("yes", "true", "1", "是")
            review_notes = row.get("review_notes", row.get("notes", "")).strip() or None
            knowledge_id_confirmed = row.get("knowledge_id_confirmed", "").strip() or None

            review = ManualReviewRecord(
                sample_id=sample_id,
                reviewer=reviewer,
                review_time=review_time,
                judgment=judgment,
                original_judgment=original_judgment,
                changed_by_threshold=changed_by_threshold,
                review_notes=review_notes,
                knowledge_id_confirmed=knowledge_id_confirmed,
            )
            reviews.append(review)

    return reviews


def _parse_judgment(s: str) -> JudgmentType:
    s = s.lower()
    if s in ("correct", "right", "对", "正确"):
        return JudgmentType.CORRECT
    elif s in ("incorrect", "wrong", "错", "错误"):
        return JudgmentType.INCORRECT
    else:
        return JudgmentType.UNCERTAIN


def _model_hit(sample: SampleRecord, result: ModelResult) -> bool:
    if not result.is_above_threshold:
        return False
    return result.recall_knowledge_id == sample.expected_knowledge_id


def compare_models(
    samples: List[SampleRecord],
    old_results: List[ModelResult],
    new_results: List[ModelResult],
) -> Dict[str, Dict]:
    old_map = {r.sample_id: r for r in old_results}
    new_map = {r.sample_id: r for r in new_results}

    comparison = {}
    for sample in samples:
        if sample.is_bad_data:
            continue

        old_r = old_map.get(sample.sample_id)
        new_r = new_map.get(sample.sample_id)

        old_hit = _model_hit(sample, old_r) if old_r else False
        new_hit = _model_hit(sample, new_r) if new_r else False

        threshold_changed = False
        score_delta = None
        if old_r and new_r:
            threshold_changed = old_r.threshold != new_r.threshold
            score_delta = new_r.confidence_score - old_r.confidence_score

        comparison[sample.sample_id] = {
            "sample": sample,
            "old_result": old_r,
            "new_result": new_r,
            "old_hit": old_hit,
            "new_hit": new_hit,
            "hit_changed": old_hit != new_hit,
            "threshold_changed": threshold_changed,
            "score_delta": score_delta,
        }

    return comparison


def apply_manual_reviews(
    comparison: Dict[str, Dict],
    manual_reviews: List[ManualReviewRecord],
) -> Dict[str, Dict]:
    review_map = {}
    for r in manual_reviews:
        if r.sample_id not in review_map or r.review_time > review_map[r.sample_id].review_time:
            review_map[r.sample_id] = r

    for sample_id, comp in comparison.items():
        review = review_map.get(sample_id)
        comp["manual_review"] = review
        comp["final_judgment"] = None
        comp["judgment_source"] = "model"

        if review:
            comp["final_judgment"] = review.judgment
            comp["judgment_source"] = "manual"
            comp["manual_changed"] = review.judgment != review.original_judgment
        else:
            if comp["new_result"]:
                is_hit = comp["new_hit"]
                comp["final_judgment"] = JudgmentType.CORRECT if is_hit else JudgmentType.INCORRECT
                comp["manual_changed"] = False

    return comparison


def compute_metrics(
    comparison: Dict[str, Dict],
    exclude_bad_data: bool = True,
) -> Dict[str, float]:
    valid = {k: v for k, v in comparison.items()}
    if exclude_bad_data:
        valid = {k: v for k, v in valid.items() if not v["sample"].is_bad_data}

    total = len(valid)
    if total == 0:
        return {"total": 0, "old_hit_rate": 0.0, "new_hit_rate": 0.0, "manual_correct_rate": 0.0}

    old_hits = sum(1 for v in valid.values() if v["old_hit"])
    new_hits = sum(1 for v in valid.values() if v["new_hit"])

    manual_correct = 0
    manual_total = 0
    for v in valid.values():
        if v["final_judgment"] is not None and v["judgment_source"] == "manual":
            manual_total += 1
            if v["final_judgment"] == JudgmentType.CORRECT:
                manual_correct += 1

    return {
        "total": total,
        "old_hit_rate": old_hits / total,
        "new_hit_rate": new_hits / total,
        "old_hits": old_hits,
        "new_hits": new_hits,
        "manual_total": manual_total,
        "manual_correct": manual_correct,
        "manual_correct_rate": manual_correct / manual_total if manual_total > 0 else 0.0,
    }


def find_threshold_influenced(comparison: Dict[str, Dict]) -> List[Dict]:
    influenced = []
    for sample_id, comp in comparison.items():
        if not comp["threshold_changed"]:
            continue
        old_r = comp["old_result"]
        new_r = comp["new_result"]
        if not old_r or not new_r:
            continue

        old_above = old_r.is_above_threshold
        new_above = new_r.is_above_threshold

        if old_above != new_above:
            influenced.append({
                "sample_id": sample_id,
                "sample": comp["sample"],
                "old_threshold": old_r.threshold,
                "new_threshold": new_r.threshold,
                "old_score": old_r.confidence_score,
                "new_score": new_r.confidence_score,
                "old_above": old_above,
                "new_above": new_above,
                "direction": "promoted" if new_above and not old_above else "demoted",
            })

    return influenced


def build_timeline(
    samples: List[SampleRecord],
    old_results: List[ModelResult],
    new_results: List[ModelResult],
    manual_reviews: List[ManualReviewRecord],
) -> List[ProcessTimelineEntry]:
    timeline = []

    if old_results:
        any_old = old_results[0]
        timeline.append(ProcessTimelineEntry(
            timestamp=datetime.now(),
            event_type="model_run",
            description=f"旧模型 {any_old.model_version} 运行完成，共 {len(old_results)} 条结果",
            metadata={"model_version": any_old.model_version, "count": len(old_results)},
        ))

    if new_results:
        any_new = new_results[0]
        timeline.append(ProcessTimelineEntry(
            timestamp=datetime.now(),
            event_type="model_run",
            description=f"新模型 {any_new.model_version} 运行完成，共 {len(new_results)} 条结果",
            metadata={"model_version": any_new.model_version, "count": len(new_results)},
        ))

    for review in sorted(manual_reviews, key=lambda r: r.review_time):
        timeline.append(ProcessTimelineEntry(
            timestamp=review.review_time,
            event_type="manual_review",
            description=f"{review.reviewer} 对样本 {review.sample_id} 做出 {review.judgment.value} 判断",
            sample_id=review.sample_id,
            metadata={
                "reviewer": review.reviewer,
                "judgment": review.judgment.value,
                "changed": review.judgment != review.original_judgment,
                "notes": review.review_notes,
            },
        ))

    timeline.sort(key=lambda e: e.timestamp)
    return timeline
