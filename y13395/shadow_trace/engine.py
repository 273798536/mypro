from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Callable, Iterable

from .models import (
    TraceRecord,
    TaskStatus,
    PollutionStatus,
    RunStats,
    HumanReview,
)


DEFAULT_PREDICATE_SUCCESS = "pass"
DEFAULT_PREDICATE_FAIL = "fail"


def default_evaluator(rec: TraceRecord) -> bool:
    if rec.prediction_score is None or rec.threshold is None:
        return True
    if rec.ground_truth is not None and rec.predicted_label is not None:
        return str(rec.ground_truth).strip() == str(rec.predicted_label).strip()
    return rec.prediction_score >= rec.threshold


@dataclass
class ProcessResult:
    records: List[TraceRecord]
    stats: RunStats
    failed_queue: List[TraceRecord]
    success_queue: List[TraceRecord]
    review_queue: List[TraceRecord]

    def by_status(self, status: TaskStatus) -> List[TraceRecord]:
        return [r for r in self.records if r.status == status]

    def by_pollution(self, pollution: PollutionStatus) -> List[TraceRecord]:
        return [r for r in self.records if r.pollution == pollution]

    @classmethod
    def from_records(cls, records: List[TraceRecord]) -> "ProcessResult":
        stats = RunStats()
        failed: List[TraceRecord] = []
        success: List[TraceRecord] = []
        review: List[TraceRecord] = []
        for r in records:
            stats.inc(r.status)
            stats.inc_pollution(r.pollution)
            if r.status == TaskStatus.FAILED or r.status == TaskStatus.BAD_ROW:
                failed.append(r)
            elif r.status == TaskStatus.SUCCESS or r.status == TaskStatus.HUMAN_OVERRULED or r.status == TaskStatus.FINALIZED:
                success.append(r)
            elif r.status == TaskStatus.PENDING_REVIEW:
                review.append(r)
        return cls(
            records=list(records),
            stats=stats,
            failed_queue=failed,
            success_queue=success,
            review_queue=review,
        )


class TraceEngine:
    def __init__(
        self,
        evaluator: Optional[Callable[[TraceRecord], bool]] = None,
        auto_review_threshold: Optional[float] = None,
    ) -> None:
        self.evaluator = evaluator or default_evaluator
        self.auto_review_threshold = auto_review_threshold

    def process(
        self,
        records: Iterable[TraceRecord],
        fail_on_error: bool = False,
    ) -> ProcessResult:
        stats = RunStats()
        processed: List[TraceRecord] = []
        failed_queue: List[TraceRecord] = []
        success_queue: List[TraceRecord] = []
        review_queue: List[TraceRecord] = []

        for rec in records:
            if rec.status in (TaskStatus.BAD_ROW, TaskStatus.SKIPPED):
                processed.append(rec)
                stats.inc(rec.status)
                stats.inc_pollution(rec.pollution)
                if rec.status == TaskStatus.BAD_ROW:
                    failed_queue.append(rec)
                continue

            try:
                rec.status = TaskStatus.PROCESSING
                rec.add_log("开始处理")
                passed = self.evaluator(rec)

                if self.auto_review_threshold is not None and rec.prediction_score is not None:
                    margin = abs(rec.prediction_score - (rec.threshold or 0.0))
                    if margin < self.auto_review_threshold:
                        rec.status = TaskStatus.PENDING_REVIEW
                        rec.add_log(
                            f"分数接近阈值 (score={rec.prediction_score}, "
                            f"threshold={rec.threshold}, margin={margin:.4f}) → 待人工复核"
                        )
                        review_queue.append(rec)
                        processed.append(rec)
                        stats.inc(TaskStatus.PENDING_REVIEW)
                        stats.inc_pollution(rec.pollution)
                        continue

                if passed:
                    rec.status = TaskStatus.SUCCESS
                    rec.add_log(
                        f"判定成功 (score={rec.prediction_score}, threshold={rec.threshold})"
                    )
                    success_queue.append(rec)
                    stats.inc(TaskStatus.SUCCESS)
                else:
                    rec.status = TaskStatus.FAILED
                    rec.error_message = (
                        f"判定失败: score={rec.prediction_score}, "
                        f"threshold={rec.threshold}, ground_truth={rec.ground_truth}, "
                        f"predicted={rec.predicted_label}"
                    )
                    rec.add_log(f"判定失败: {rec.error_message}")
                    failed_queue.append(rec)
                    stats.inc(TaskStatus.FAILED)

            except Exception as e:
                rec.status = TaskStatus.FAILED
                rec.error_message = f"处理异常: {e}"
                rec.add_log(f"处理异常: {e}")
                failed_queue.append(rec)
                stats.inc(TaskStatus.FAILED)
                if fail_on_error:
                    raise

            stats.inc_pollution(rec.pollution)
            processed.append(rec)

        return ProcessResult(
            records=processed,
            stats=stats,
            failed_queue=failed_queue,
            success_queue=success_queue,
            review_queue=review_queue,
        )

    @staticmethod
    def apply_human_review(
        record: TraceRecord,
        reviewer: str,
        new_status: TaskStatus,
        reason: str,
        final_conclusion: Optional[str] = None,
    ) -> HumanReview:
        review = record.apply_human_review(reviewer, new_status, reason, final_conclusion)
        if new_status in (TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.HUMAN_OVERRULED):
            record.status = TaskStatus.HUMAN_OVERRULED
            if not record.final_conclusion:
                record.final_conclusion = f"人工改判@{reviewer}: {reason}"
        return review

    @staticmethod
    def filter_records(
        records: Iterable[TraceRecord],
        statuses: Optional[List[TaskStatus]] = None,
        pollutions: Optional[List[PollutionStatus]] = None,
        sample_ids: Optional[List[str]] = None,
        version_tags: Optional[List[str]] = None,
        with_reviews: Optional[bool] = None,
    ) -> List[TraceRecord]:
        result: List[TraceRecord] = []
        for r in records:
            if statuses and r.status not in statuses:
                continue
            if pollutions and r.pollution not in pollutions:
                continue
            if sample_ids and r.sample_id not in sample_ids:
                continue
            if version_tags and r.version_tag not in version_tags:
                continue
            if with_reviews is True and not r.review_history:
                continue
            if with_reviews is False and r.review_history:
                continue
            result.append(r)
        return result

    @staticmethod
    def finalize(record: TraceRecord, conclusion: str) -> None:
        record.final_conclusion = conclusion
        record.status = TaskStatus.FINALIZED
        record.add_log(f"最终定案: {conclusion}")

    @staticmethod
    def save_state(records: Iterable[TraceRecord], file_path: str) -> None:
        data = [r.to_dict() for r in records]
        os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def load_state(file_path: str) -> List[TraceRecord]:
        from datetime import datetime

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records: List[TraceRecord] = []
        for item in data:
            reviews: List[HumanReview] = []
            for rv in item.get("review_history", []):
                reviews.append(
                    HumanReview(
                        reviewer=rv["reviewer"],
                        original_status=TaskStatus(rv["original_status"]),
                        new_status=TaskStatus(rv["new_status"]),
                        reason=rv["reason"],
                        reviewed_at=datetime.fromisoformat(rv["reviewed_at"]),
                        review_id=rv.get("review_id", ""),
                    )
                )
            rec = TraceRecord(
                sample_id=item["sample_id"],
                raw_data=item.get("raw_data", {}),
                row_number=item.get("row_number", 0),
                status=TaskStatus(item.get("status", "pending")),
                pollution=PollutionStatus(item.get("pollution", "clean")),
                prediction_score=item.get("prediction_score"),
                threshold=item.get("threshold"),
                ground_truth=item.get("ground_truth"),
                predicted_label=item.get("predicted_label"),
                error_message=item.get("error_message"),
                process_log=item.get("process_log", []),
                review_history=reviews,
                final_conclusion=item.get("final_conclusion"),
                created_at=datetime.fromisoformat(item["created_at"]),
                updated_at=datetime.fromisoformat(item["updated_at"]),
                record_id=item.get("record_id", ""),
                version_tag=item.get("version_tag"),
            )
            records.append(rec)
        return records
