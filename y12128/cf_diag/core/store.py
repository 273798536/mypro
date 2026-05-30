import json
import copy
from datetime import datetime
from typing import Optional

from .models import (
    BehaviorRecord,
    ExposureRecord,
    SimilarityResult,
    CorrectionRecord,
    DiagnosisResult,
    ColdStartRecord,
)


class DataStore:
    def __init__(self):
        self.user_behaviors: dict[str, list[BehaviorRecord]] = {}
        self.item_tags: dict[str, list[str]] = {}
        self.rating_matrix: dict[str, dict[str, float]] = {}
        self.exposure_records: dict[str, list[ExposureRecord]] = {}
        self.similarity_results: dict[str, SimilarityResult] = {}
        self.corrections: list[CorrectionRecord] = []
        self.diagnoses: list[DiagnosisResult] = []
        self.cold_starts: dict[str, ColdStartRecord] = {}
        self._data_version: int = 1
        self._snapshot_before_exposure: Optional[dict] = None

    @property
    def data_version(self) -> int:
        return self._data_version

    def increment_version(self):
        self._data_version += 1

    def _make_sim_key(self, item_a: str, item_b: str, method: str) -> str:
        pair = tuple(sorted([item_a, item_b]))
        return f"{pair[0]}|{pair[1]}|{method}"

    def add_behaviors(self, records: list[BehaviorRecord]):
        for r in records:
            self.user_behaviors.setdefault(r.user_id, []).append(r)

    def set_item_tags(self, tags: dict[str, list[str]]):
        self.item_tags = tags

    def set_rating_matrix(self, matrix: dict[str, dict[str, float]]):
        self.rating_matrix = matrix

    def add_exposures(self, records: list[ExposureRecord]):
        for r in records:
            self.exposure_records.setdefault(r.user_id, []).append(r)
        self.increment_version()

    def snapshot_before_exposure(self):
        self._snapshot_before_exposure = {
            k: copy.deepcopy(v) for k, v in self.similarity_results.items()
        }

    def get_changed_after_exposure(self) -> list[dict]:
        if self._snapshot_before_exposure is None:
            return []
        changed = []
        for key, result in self.similarity_results.items():
            old = self._snapshot_before_exposure.get(key)
            if old is None or old.score != result.score or old.status != result.status:
                changed.append({
                    "key": key,
                    "old_score": old.score if old else None,
                    "new_score": result.score,
                    "old_status": old.status if old else None,
                    "new_status": result.status,
                })
        return changed

    def upsert_similarity(self, result: SimilarityResult):
        key = self._make_sim_key(result.item_a, result.item_b, result.method)
        result.data_version = self._data_version
        self.similarity_results[key] = result

    def get_similarity(self, item_a: str, item_b: str, method: str) -> Optional[SimilarityResult]:
        key = self._make_sim_key(item_a, item_b, method)
        return self.similarity_results.get(key)

    def add_correction(self, correction: CorrectionRecord):
        self.corrections.append(correction)
        self.increment_version()

    def add_diagnosis(self, diag: DiagnosisResult):
        self.diagnoses.append(diag)

    def add_cold_start(self, record: ColdStartRecord):
        self.cold_starts[record.item_id] = record

    def get_all_items(self) -> set[str]:
        items = set()
        for uid, ratings in self.rating_matrix.items():
            for iid in ratings:
                items.add(iid)
        for iid in self.item_tags:
            items.add(iid)
        for uid, behaviors in self.user_behaviors.items():
            for b in behaviors:
                items.add(b.item_id)
        return items

    def get_item_interaction_count(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for uid, ratings in self.rating_matrix.items():
            for iid in ratings:
                counts[iid] = counts.get(iid, 0) + 1
        for uid, behaviors in self.user_behaviors.items():
            for b in behaviors:
                counts[b.item_id] = counts.get(b.item_id, 0) + 1
        return counts

    def trace_forward_from_behavior(self, user_id: str) -> list[dict]:
        behaviors = self.user_behaviors.get(user_id, [])
        result = []
        for b in behaviors:
            related = []
            for key, sim in self.similarity_results.items():
                if sim.item_a == b.item_id or sim.item_b == b.item_id:
                    related.append({
                        "similarity_key": key,
                        "score": sim.score,
                        "method": sim.method,
                        "status": sim.status,
                    })
            result.append({
                "behavior": {"user_id": b.user_id, "item_id": b.item_id, "action": b.action},
                "related_similarities": related,
            })
        return result

    def trace_backward_to_tags(self, item_id: str) -> dict:
        tags = self.item_tags.get(item_id, [])
        related_sims = []
        for key, sim in self.similarity_results.items():
            if sim.item_a == item_id or sim.item_b == item_id:
                other = sim.item_b if sim.item_a == item_id else sim.item_a
                related_sims.append({
                    "other_item": other,
                    "score": sim.score,
                    "method": sim.method,
                    "status": sim.status,
                    "other_tags": self.item_tags.get(other, []),
                })
        corrections = [
            c for c in self.corrections
            if any(item_id in k for k in c.affected_result_keys)
        ]
        return {
            "item_id": item_id,
            "tags": tags,
            "related_similarities": related_sims,
            "corrections": [
                {"correction_id": c.correction_id, "field": c.field,
                 "old_value": c.old_value, "new_value": c.new_value, "reason": c.reason}
                for c in corrections
            ],
        }

    def to_dict(self) -> dict:
        return {
            "data_version": self._data_version,
            "user_behaviors": {
                uid: [{"item_id": b.item_id, "action": b.action, "timestamp": b.timestamp}
                      for b in blist]
                for uid, blist in self.user_behaviors.items()
            },
            "item_tags": self.item_tags,
            "rating_matrix": self.rating_matrix,
            "exposure_count": sum(len(v) for v in self.exposure_records.values()),
            "similarity_count": len(self.similarity_results),
            "correction_count": len(self.corrections),
            "cold_start_count": len(self.cold_starts),
            "diagnosis_count": len(self.diagnoses),
        }

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
