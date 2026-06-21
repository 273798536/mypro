from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    BAD_ROW = "bad_row"
    PENDING_REVIEW = "pending_review"
    HUMAN_OVERRULED = "human_overruled"
    FINALIZED = "finalized"
    RETRY = "retry"


class PollutionStatus(str, Enum):
    CLEAN = "clean"
    SUSPECTED = "suspected_pollution"
    CONFIRMED = "confirmed_pollution"


@dataclass
class HumanReview:
    reviewer: str
    original_status: TaskStatus
    new_status: TaskStatus
    reason: str
    reviewed_at: datetime = field(default_factory=datetime.now)
    review_id: str = field(default_factory=lambda: uuid4().hex[:8])


@dataclass
class TraceRecord:
    sample_id: str
    raw_data: Dict[str, Any]
    row_number: int
    status: TaskStatus = TaskStatus.PENDING
    pollution: PollutionStatus = PollutionStatus.CLEAN
    prediction_score: Optional[float] = None
    threshold: Optional[float] = None
    ground_truth: Optional[str] = None
    predicted_label: Optional[str] = None
    error_message: Optional[str] = None
    process_log: List[str] = field(default_factory=list)
    review_history: List[HumanReview] = field(default_factory=list)
    final_conclusion: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    record_id: str = field(default_factory=lambda: uuid4().hex[:12])
    version_tag: Optional[str] = None

    def add_log(self, msg: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        self.process_log.append(f"[{ts}] {msg}")
        self.updated_at = datetime.now()

    def apply_human_review(
        self,
        reviewer: str,
        new_status: TaskStatus,
        reason: str,
        final_conclusion: Optional[str] = None,
    ) -> HumanReview:
        review = HumanReview(
            reviewer=reviewer,
            original_status=self.status,
            new_status=new_status,
            reason=reason,
        )
        self.review_history.append(review)
        self.status = new_status
        if final_conclusion:
            self.final_conclusion = final_conclusion
        else:
            self.final_conclusion = f"人工改判: {reason}"
        self.add_log(
            f"人工改判@{reviewer}: {review.original_status.value} → {new_status.value}, 理由: {reason}"
        )
        return review

    def set_pollution(self, status: PollutionStatus, note: str = "") -> None:
        self.pollution = status
        self.add_log(f"污染标记变更为 {status.value}: {note}")

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        d["pollution"] = self.pollution.value
        d["created_at"] = self.created_at.isoformat()
        d["updated_at"] = self.updated_at.isoformat()
        for r in d["review_history"]:
            r["original_status"] = r["original_status"].value
            r["new_status"] = r["new_status"].value
            r["reviewed_at"] = r["reviewed_at"].isoformat() if isinstance(r["reviewed_at"], datetime) else r["reviewed_at"]
        return d


@dataclass
class RunStats:
    total: int = 0
    success: int = 0
    failed: int = 0
    skipped: int = 0
    bad_rows: int = 0
    pending_review: int = 0
    human_overruled: int = 0
    finalized: int = 0
    retry: int = 0
    clean: int = 0
    suspected_pollution: int = 0
    confirmed_pollution: int = 0

    def inc(self, status: TaskStatus) -> None:
        self.total += 1
        k = status.value
        if hasattr(self, k):
            setattr(self, k, getattr(self, k) + 1)

    def inc_pollution(self, p: PollutionStatus) -> None:
        if p == PollutionStatus.CLEAN:
            self.clean += 1
        elif p == PollutionStatus.SUSPECTED:
            self.suspected_pollution += 1
        elif p == PollutionStatus.CONFIRMED:
            self.confirmed_pollution += 1

    def summary_lines(self) -> List[str]:
        lines = [
            f"  总数:        {self.total}",
            f"  成功:        {self.success}",
            f"  失败:        {self.failed}",
            f"  跳过:        {self.skipped}",
            f"  坏行:        {self.bad_rows}",
            f"  待人工复核:  {self.pending_review}",
            f"  人工改判:    {self.human_overruled}",
            f"  已定案:      {self.finalized}",
            f"  重试:        {self.retry}",
            "  --- 污染标记 ---",
            f"  正常样本:    {self.clean}",
            f"  疑似污染:    {self.suspected_pollution}",
            f"  确认污染:    {self.confirmed_pollution}",
        ]
        return lines


@dataclass
class VersionDiff:
    version_a: str
    version_b: str
    sample_diff: Dict[str, Any] = field(default_factory=dict)
    threshold_diff: Dict[str, Any] = field(default_factory=dict)
    human_review_diff: Dict[str, Any] = field(default_factory=dict)
    metric_diff: Dict[str, Any] = field(default_factory=dict)
    status_diff: Dict[str, Any] = field(default_factory=dict)
