import json
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from collections import deque

from .config import QUEUE_FILE, SAMPLE_STATUS
from .sample_processor import WeakSample, SampleStore


@dataclass
class QueueState:
    pending_ids: List[str] = field(default_factory=list)
    review_ids: List[str] = field(default_factory=list)
    last_grayrun_at: str = ""
    grayrun_version: int = 0
    updated_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueueState":
        return cls(**data)


class WeakSampleQueue:
    def __init__(self, store: SampleStore, state_file: Path = QUEUE_FILE):
        self.store = store
        self.state_file = state_file
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.state_file.exists():
            self._save_state(QueueState(updated_at=datetime.now().isoformat()))
        self.state = self._load_state()
        self.reconcile()

    def _load_state(self) -> QueueState:
        with open(self.state_file, "r", encoding="utf-8") as f:
            return QueueState.from_dict(json.load(f))

    def _save_state(self, state: QueueState) -> None:
        state.updated_at = datetime.now().isoformat()
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, ensure_ascii=False, indent=2)

    def _persist(self) -> None:
        self._save_state(self.state)

    def reconcile(self) -> Dict[str, int]:
        all_samples = {s.sample_id: s for s in self.store.list_all()}
        corrected_pending: List[str] = []
        corrected_review: List[str] = []

        for sid in self.state.pending_ids + self.state.review_ids:
            s = all_samples.get(sid)
            if s is None:
                continue
            if s.status == SAMPLE_STATUS["PENDING"]:
                if sid not in corrected_pending:
                    corrected_pending.append(sid)
            elif s.status == SAMPLE_STATUS["REVIEW"]:
                if sid not in corrected_review:
                    corrected_review.append(sid)

        for sid, s in all_samples.items():
            if s.status == SAMPLE_STATUS["PENDING"] and sid not in corrected_pending:
                corrected_pending.append(sid)
            elif s.status == SAMPLE_STATUS["REVIEW"] and sid not in corrected_review:
                corrected_review.append(sid)

        removed_pending = set(self.state.pending_ids) - set(corrected_pending)
        removed_review = set(self.state.review_ids) - set(corrected_review)
        added_pending = set(corrected_pending) - set(self.state.pending_ids)
        added_review = set(corrected_review) - set(self.state.review_ids)

        changed = (
            corrected_pending != self.state.pending_ids
            or corrected_review != self.state.review_ids
        )
        self.state.pending_ids = corrected_pending
        self.state.review_ids = corrected_review
        if changed:
            self._persist()

        return {
            "removed_from_pending": len(removed_pending),
            "removed_from_review": len(removed_review),
            "added_to_pending": len(added_pending),
            "added_to_review": len(added_review),
        }

    def enqueue(self, sample: WeakSample) -> str:
        self.reconcile()
        sid = sample.sample_id
        if sample.status == SAMPLE_STATUS["PENDING"]:
            if sid not in self.state.pending_ids:
                self.state.pending_ids.append(sid)
                self._persist()
            return "pending"
        elif sample.status == SAMPLE_STATUS["REVIEW"]:
            if sid in self.state.pending_ids:
                self.state.pending_ids.remove(sid)
            if sid not in self.state.review_ids:
                self.state.review_ids.append(sid)
                self._persist()
            return "review"
        else:
            if sid in self.state.pending_ids:
                self.state.pending_ids.remove(sid)
                self._persist()
            if sid in self.state.review_ids:
                self.state.review_ids.remove(sid)
                self._persist()
            return "cleared"

    def enqueue_batch(self, samples: List[WeakSample]) -> Dict[str, int]:
        counts = {"pending": 0, "review": 0, "cleared": 0}
        for s in samples:
            bucket = self.enqueue(s)
            counts[bucket] += 1
        return counts

    def next_pending(self, pop: bool = False) -> Optional[WeakSample]:
        self.reconcile()
        if not self.state.pending_ids:
            return None
        sid = self.state.pending_ids[0]
        sample = self.store.get(sid)
        if pop and sample is not None:
            self.state.pending_ids.pop(0)
            self._persist()
        return sample

    def list_pending(self, limit: int = 50) -> List[WeakSample]:
        self.reconcile()
        result: List[WeakSample] = []
        for sid in self.state.pending_ids:
            s = self.store.get(sid)
            if s is not None and s.status == SAMPLE_STATUS["PENDING"]:
                result.append(s)
            if len(result) >= limit:
                break
        return result

    def list_review(self, limit: int = 50) -> List[WeakSample]:
        self.reconcile()
        result: List[WeakSample] = []
        for sid in self.state.review_ids:
            s = self.store.get(sid)
            if s is not None and s.status == SAMPLE_STATUS["REVIEW"]:
                result.append(s)
            if len(result) >= limit:
                break
        return result

    def promote_to_review(self, sample_id: str) -> bool:
        self.reconcile()
        changed = False
        if sample_id in self.state.pending_ids:
            self.state.pending_ids.remove(sample_id)
            changed = True
        if sample_id not in self.state.review_ids:
            self.state.review_ids.append(sample_id)
            changed = True
        if changed:
            self._persist()
        return changed

    def remove_from_review(self, sample_id: str) -> bool:
        self.reconcile()
        changed = False
        if sample_id in self.state.review_ids:
            self.state.review_ids.remove(sample_id)
            changed = True
        if sample_id in self.state.pending_ids:
            self.state.pending_ids.remove(sample_id)
            changed = True
        if changed:
            self._persist()
        return changed

    def bump_grayrun_version(self) -> int:
        self.reconcile()
        self.state.grayrun_version += 1
        self.state.last_grayrun_at = datetime.now().isoformat()
        self._persist()
        return self.state.grayrun_version

    def stats(self) -> Dict[str, Any]:
        fix = self.reconcile()
        all_samples = self.store.list_all()
        status_counts = {}
        for s in all_samples:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1

        return {
            "total_samples": len(all_samples),
            "by_status": status_counts,
            "queue_pending": len(self.state.pending_ids),
            "queue_review": len(self.state.review_ids),
            "queue_reconcile_fixes": fix,
            "grayrun_version": self.state.grayrun_version,
            "last_grayrun_at": self.state.last_grayrun_at,
        }
