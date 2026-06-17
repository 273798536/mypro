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

    def _load_state(self) -> QueueState:
        with open(self.state_file, "r", encoding="utf-8") as f:
            return QueueState.from_dict(json.load(f))

    def _save_state(self, state: QueueState) -> None:
        state.updated_at = datetime.now().isoformat()
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, ensure_ascii=False, indent=2)

    def _persist(self) -> None:
        self._save_state(self.state)

    def enqueue(self, sample: WeakSample) -> None:
        if sample.sample_id not in self.state.pending_ids:
            self.state.pending_ids.append(sample.sample_id)
            self._persist()

    def enqueue_batch(self, samples: List[WeakSample]) -> int:
        added = 0
        for s in samples:
            if s.sample_id not in self.state.pending_ids:
                self.state.pending_ids.append(s.sample_id)
                added += 1
        if added > 0:
            self._persist()
        return added

    def next_pending(self, pop: bool = False) -> Optional[WeakSample]:
        if not self.state.pending_ids:
            return None
        sid = self.state.pending_ids[0]
        if pop:
            self.state.pending_ids.pop(0)
            self._persist()
        return self.store.get(sid)

    def list_pending(self, limit: int = 50) -> List[WeakSample]:
        ids = self.state.pending_ids[:limit]
        return [self.store.get(sid) for sid in ids if self.store.get(sid)]

    def list_review(self, limit: int = 50) -> List[WeakSample]:
        all_samples = self.store.list_by_status(SAMPLE_STATUS["REVIEW"])
        return all_samples[:limit]

    def promote_to_review(self, sample_id: str) -> bool:
        if sample_id in self.state.pending_ids:
            self.state.pending_ids.remove(sample_id)
        if sample_id not in self.state.review_ids:
            self.state.review_ids.append(sample_id)
            self._persist()
            return True
        return False

    def remove_from_review(self, sample_id: str) -> bool:
        if sample_id in self.state.review_ids:
            self.state.review_ids.remove(sample_id)
            self._persist()
            return True
        return False

    def bump_grayrun_version(self) -> int:
        self.state.grayrun_version += 1
        self.state.last_grayrun_at = datetime.now().isoformat()
        self._persist()
        return self.state.grayrun_version

    def stats(self) -> Dict[str, Any]:
        all_samples = self.store.list_all()
        status_counts = {}
        for s in all_samples:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1

        return {
            "total_samples": len(all_samples),
            "by_status": status_counts,
            "queue_pending": len(self.state.pending_ids),
            "queue_review": len(self.state.review_ids),
            "grayrun_version": self.state.grayrun_version,
            "last_grayrun_at": self.state.last_grayrun_at,
        }
