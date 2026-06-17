import json
from dataclasses import dataclass, asdict, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path

from .config import SAMPLES_FILE, SAMPLE_STATUS, MAX_TEXT_LENGTH


@dataclass
class WeakSample:
    sample_id: str
    text: str
    source: str
    human_note: str = ""
    status: str = SAMPLE_STATUS["PENDING"]
    created_at: str = ""
    processed_at: str = ""
    truncation_info: Dict[str, Any] = field(default_factory=dict)
    rule_hits: List[Dict[str, Any]] = field(default_factory=list)
    grayscale_score: float = 0.0
    grayscale_evidence: List[str] = field(default_factory=list)
    review_history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WeakSample":
        return cls(**data)

    def is_truncated(self) -> bool:
        return len(self.text) > MAX_TEXT_LENGTH

    def truncation_detail(self) -> Dict[str, Any]:
        if not self.is_truncated():
            return {"is_truncated": False}
        return {
            "is_truncated": True,
            "original_length": len(self.text),
            "max_allowed": MAX_TEXT_LENGTH,
            "overflow_chars": len(self.text) - MAX_TEXT_LENGTH,
            "visible_preview": self.text[:80] + "..." if len(self.text) > 80 else self.text,
            "truncated_tail": "..." + self.text[-60:] if len(self.text) > 60 else "",
        }


class SampleStore:
    def __init__(self, file_path: Path = SAMPLES_FILE):
        self.file_path = file_path
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write([])

    def _read(self) -> List[Dict[str, Any]]:
        with open(self.file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write(self, data: List[Dict[str, Any]]) -> None:
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_all(self) -> List[WeakSample]:
        return [WeakSample.from_dict(d) for d in self._read()]

    def get(self, sample_id: str) -> Optional[WeakSample]:
        for s in self._read():
            if s["sample_id"] == sample_id:
                return WeakSample.from_dict(s)
        return None

    def add(self, sample: WeakSample) -> None:
        data = self._read()
        data.append(sample.to_dict())
        self._write(data)

    def update(self, sample: WeakSample) -> None:
        data = self._read()
        for i, s in enumerate(data):
            if s["sample_id"] == sample.sample_id:
                data[i] = sample.to_dict()
                break
        self._write(data)

    def list_by_status(self, status: str) -> List[WeakSample]:
        return [s for s in self.list_all() if s.status == status]


class SampleProcessor:
    def __init__(self, store: SampleStore, rule_engine):
        self.store = store
        self.rule_engine = rule_engine

    def process_sample(self, sample: WeakSample) -> WeakSample:
        sample.processed_at = datetime.now().isoformat()

        sample.truncation_info = sample.truncation_detail()

        rule_result = self.rule_engine.evaluate(sample)
        sample.rule_hits = rule_result["hits"]
        sample.grayscale_score = rule_result["grayscale_score"]
        sample.grayscale_evidence = rule_result["evidence"]

        if sample.is_truncated() and not self.rule_engine.is_truncation_allowed(sample):
            sample.status = SAMPLE_STATUS["REVIEW"]
            sample.review_history.append({
                "timestamp": sample.processed_at,
                "action": "flag_for_review",
                "reason": "长文本截断触发安全拦截",
                "detail": f"原文长度 {sample.truncation_info['original_length']} 超过上限 {sample.truncation_info['max_allowed']}",
            })
            self.store.update(sample)
            return sample

        score = sample.grayscale_score
        if score >= self.rule_engine.pass_threshold:
            sample.status = SAMPLE_STATUS["PASSED"]
        elif score >= self.rule_engine.review_threshold:
            sample.status = SAMPLE_STATUS["REVIEW"]
        else:
            sample.status = SAMPLE_STATUS["REJECTED"]

        sample.review_history.append({
            "timestamp": sample.processed_at,
            "action": f"auto_set_status_{sample.status}",
            "reason": f"灰度评分 {score:.3f}",
            "evidence": sample.grayscale_evidence,
        })

        self.store.update(sample)
        return sample

    def confirm_sample(self, sample_id: str, reviewer_note: str = "") -> Optional[WeakSample]:
        sample = self.store.get(sample_id)
        if not sample:
            return None
        sample.status = SAMPLE_STATUS["CONFIRMED"]
        sample.review_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "human_confirmed",
            "reviewer_note": reviewer_note,
        })
        self.store.update(sample)
        return sample

    def reject_sample(self, sample_id: str, reviewer_note: str = "") -> Optional[WeakSample]:
        sample = self.store.get(sample_id)
        if not sample:
            return None
        sample.status = SAMPLE_STATUS["REJECTED"]
        sample.review_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "human_rejected",
            "reviewer_note": reviewer_note,
        })
        self.store.update(sample)
        return sample
