from __future__ import annotations

from collections import defaultdict
from typing import Any

from .models import DataRecord, DedupResult, compute_content_hash, generate_id


class Deduplicator:
    """确定性样本去重器

    策略：
    1. 基于 content_hash 精确去重（优先，确定性 O(1)）
    2. 基于用户指定字段组合的指纹去重（可选）
    3. 保留最早出现的记录，记录同组其他为重复

    同一批数据重复跑结果完全一致。
    """

    def __init__(self, hash_algorithm: str = "xxhash64", fingerprint_fields: list[str] | None = None):
        self.hash_algorithm = hash_algorithm
        self.fingerprint_fields = fingerprint_fields or []

    def run(self, records: list[DataRecord]) -> dict[str, Any]:
        if not records:
            return {"kept_records": [], "results": [], "summary": self._empty_summary()}

        by_hash: dict[str, list[DataRecord]] = defaultdict(list)
        for rec in records:
            key = self._make_key(rec)
            by_hash[key].append(rec)

        kept: list[DataRecord] = []
        results: list[DedupResult] = []
        total_input = len(records)

        for key, group in sorted(by_hash.items(), key=lambda kv: kv[0]):
            group_sorted = sorted(
                group,
                key=lambda r: (
                    r.timestamp if r.timestamp is not None else float("inf"),
                    r.line_number,
                    r.record_id,
                ),
            )
            main = group_sorted[0]
            dup_ids = [r.record_id for r in group_sorted[1:]]
            main.dedup_group_id = group_id = generate_id("grp")
            for r in group_sorted[1:]:
                r.dedup_group_id = group_id
            kept.append(main)
            if dup_ids:
                results.append(DedupResult(
                    group_id=group_id,
                    kept_record_id=main.record_id,
                    duplicate_record_ids=dup_ids,
                    duplicate_count=len(dup_ids),
                    similarity=1.0 if self._is_exact_hash(key) else 0.0,
                    reason="exact_hash_match" if self._is_exact_hash(key) else "fingerprint_match",
                ))

        duplicates_removed = total_input - len(kept)
        summary = {
            "total_input": total_input,
            "total_after_dedup": len(kept),
            "duplicates_removed": duplicates_removed,
            "duplicate_ratio": round(duplicates_removed / max(total_input, 1), 6),
            "groups_with_duplicates": len(results),
            "hash_algorithm": self.hash_algorithm,
            "fingerprint_fields": self.fingerprint_fields,
        }
        return {"kept_records": kept, "results": results, "summary": summary}

    def _make_key(self, rec: DataRecord) -> str:
        if not self.fingerprint_fields:
            return f"H:{rec.content_hash}"
        subset = {k: rec.raw_content.get(k) for k in self.fingerprint_fields}
        return "F:" + compute_content_hash(subset, self.hash_algorithm)

    @staticmethod
    def _is_exact_hash(key: str) -> bool:
        return key.startswith("H:")

    @staticmethod
    def _empty_summary() -> dict[str, Any]:
        return {
            "total_input": 0,
            "total_after_dedup": 0,
            "duplicates_removed": 0,
            "duplicate_ratio": 0.0,
            "groups_with_duplicates": 0,
            "fingerprint_fields": [],
        }
