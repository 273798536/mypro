"""样本去重与安全拦截 - 支持增量更新，评测题库补录后自动同步拦截."""

from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict
import json
import os

from .models import QASample, DedupRecord, IssueSeverity
from difflib import SequenceMatcher


class SampleDeduper:
    """样本去重器.

    设计要点：
    - 去重不是一次性判断，而是持续维护拦截库
    - 支持增量更新：评测题库补录后，拦截库自动更新
    - 同时基于内容哈希（精确去重）和相似度（近似去重）
    """

    def __init__(
        self,
        similarity_threshold: float = 0.95,
        content_hash_threshold: float = 1.0,
        enable_incremental: bool = True,
    ):
        self.similarity_threshold = similarity_threshold
        self.content_hash_threshold = content_hash_threshold
        self.enable_incremental = enable_incremental
        self._content_hash_index: Dict[str, QASample] = {}
        self._question_hash_index: Dict[str, List[QASample]] = {}
        self._ngram_index: Dict[str, List[QASample]] = {}
        self._blocked_ids: Set[str] = set()
        self._dedup_records: List[DedupRecord] = []
        self._all_processed: Set[str] = set()

    def _build_ngrams(self, text: str, n: int = 3) -> Set[str]:
        if not text:
            return set()
        normalized = QASample._normalize_text(text)
        if len(normalized) < n:
            return {normalized} if normalized else set()
        result = set()
        for i in range(len(normalized) - n + 1):
            result.add(normalized[i:i + n])
        return result

    def reset(self):
        self._content_hash_index = {}
        self._question_hash_index = {}
        self._ngram_index = {}
        self._blocked_ids = set()
        self._dedup_records = []
        self._all_processed = set()

    def register_existing_samples(self, samples: List[QASample]) -> None:
        for sample in samples:
            if sample.sample_id in self._all_processed:
                continue
            self._content_hash_index.setdefault(sample.content_hash, sample)
            self._question_hash_index.setdefault(sample.question_hash, []).append(sample)
            for ng in self._build_ngrams(sample.question):
                self._ngram_index.setdefault(ng, []).append(sample)
            for ng in self._build_ngrams(sample.answer):
                self._ngram_index.setdefault(ng, []).append(sample)
            self._all_processed.add(sample.sample_id)

    def is_blocked(self, sample_id: str) -> bool:
        return sample_id in self._blocked_ids

    def add_to_blocklist(self, sample_id: str):
        self._blocked_ids.add(sample_id)

    def _compute_similarity(self, s1: QASample, s2: QASample) -> float:
        q1 = s1._normalize_text(s1.question)
        q2 = s2._normalize_text(s2.question)
        a1 = s1._normalize_text(s1.answer)
        a2 = s2._normalize_text(s2.answer)
        if not q1 or not q2 or not a1 or not a2:
            return 0.0
        q_sim = SequenceMatcher(None, q1, q2).ratio()
        a_sim = SequenceMatcher(None, a1, a2).ratio()
        return max(q_sim, a_sim)

    def find_duplicates(
        self,
        samples: List[QASample],
        is_incremental: bool = False,
    ) -> Tuple[List[DedupRecord], Set[str]]:
        new_records: List[DedupRecord] = []
        newly_blocked: Set[str] = set()
        for sample in samples:
            if sample.sample_id in self._blocked_ids:
                continue
            if sample.sample_id in self._all_processed and not is_incremental:
                continue
            exact_match = self._content_hash_index.get(sample.content_hash)
            if exact_match and exact_match.sample_id != sample.sample_id:
                record = DedupRecord(
                    severity=IssueSeverity.WARNING,
                    kept_sample_id=exact_match.sample_id,
                    removed_sample_id=sample.sample_id,
                    kept_question_preview=exact_match.question[:60],
                    removed_question_preview=sample.question[:60],
                    similarity_score=1.0,
                    dedup_reason="内容哈希完全一致（精确去重）",
                    is_incremental=is_incremental,
                )
                new_records.append(record)
                newly_blocked.add(sample.sample_id)
                self._blocked_ids.add(sample.sample_id)
                self._dedup_records.append(record)
                continue
            q_matches = self._question_hash_index.get(sample.question_hash, [])
            for qm in q_matches:
                if qm.sample_id == sample.sample_id:
                    continue
                if qm.sample_id in self._blocked_ids:
                    continue
                sim = self._compute_similarity(sample, qm)
                if sim >= self.similarity_threshold:
                    record = DedupRecord(
                        severity=IssueSeverity.WARNING,
                        kept_sample_id=qm.sample_id,
                        removed_sample_id=sample.sample_id,
                        kept_question_preview=qm.question[:60],
                        removed_question_preview=sample.question[:60],
                        similarity_score=round(sim, 4),
                        dedup_reason=f"问题或回答相似度 {int(sim * 100)}% ≥ 阈值 {int(self.similarity_threshold * 100)}%",
                        is_incremental=is_incremental,
                    )
                    new_records.append(record)
                    newly_blocked.add(sample.sample_id)
                    self._blocked_ids.add(sample.sample_id)
                    self._dedup_records.append(record)
                    break
            if sample.sample_id in newly_blocked:
                continue
            candidate_ids = set()
            for ng in self._build_ngrams(sample.question):
                for cs in self._ngram_index.get(ng, []):
                    if cs.sample_id != sample.sample_id and cs.sample_id not in self._blocked_ids:
                        candidate_ids.add(cs.sample_id)
            for ng in self._build_ngrams(sample.answer):
                for cs in self._ngram_index.get(ng, []):
                    if cs.sample_id != sample.sample_id and cs.sample_id not in self._blocked_ids:
                        candidate_ids.add(cs.sample_id)
            candidate_map = {}
            for cs in self._content_hash_index.values():
                if cs.sample_id in candidate_ids:
                    candidate_map[cs.sample_id] = cs
            for cid, cs in candidate_map.items():
                sim = self._compute_similarity(sample, cs)
                if sim >= self.similarity_threshold:
                    record = DedupRecord(
                        severity=IssueSeverity.WARNING,
                        kept_sample_id=cs.sample_id,
                        removed_sample_id=sample.sample_id,
                        kept_question_preview=cs.question[:60],
                        removed_question_preview=sample.question[:60],
                        similarity_score=round(sim, 4),
                        dedup_reason=f"n-gram 近邻匹配，相似度 {int(sim * 100)}%",
                        is_incremental=is_incremental,
                    )
                    new_records.append(record)
                    newly_blocked.add(sample.sample_id)
                    self._blocked_ids.add(sample.sample_id)
                    self._dedup_records.append(record)
                    break
            if sample.sample_id not in newly_blocked:
                self._content_hash_index.setdefault(sample.content_hash, sample)
                self._question_hash_index.setdefault(sample.question_hash, []).append(sample)
                for ng in self._build_ngrams(sample.question):
                    self._ngram_index.setdefault(ng, []).append(sample)
                for ng in self._build_ngrams(sample.answer):
                    self._ngram_index.setdefault(ng, []).append(sample)
                self._all_processed.add(sample.sample_id)
        return new_records, newly_blocked

    def incremental_update(
        self,
        new_samples: List[QASample],
    ) -> Tuple[List[DedupRecord], Set[str]]:
        return self.find_duplicates(new_samples, is_incremental=True)

    def get_blocked_ids(self) -> Set[str]:
        return set(self._blocked_ids)

    def get_all_dedup_records(self) -> List[DedupRecord]:
        return list(self._dedup_records)
