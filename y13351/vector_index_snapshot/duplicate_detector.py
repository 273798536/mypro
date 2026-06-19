from typing import Any, Dict, List, Optional, Set, Tuple
from collections import defaultdict
from .models import SnapshotRecord, ProcessingStatus, RunIdDuplicateError


class DuplicateDetector:
    def __init__(self):
        self.run_id_index: Dict[str, List[str]] = defaultdict(list)
        self.record_store: Dict[str, SnapshotRecord] = {}
        self.duplicate_pairs: List[Tuple[str, str]] = []

    def register_record(self, record: SnapshotRecord) -> Tuple[bool, Optional[str]]:
        is_duplicate, existing_id = self.check_duplicate(record.run_id)

        if is_duplicate and existing_id:
            record.mark_duplicate(existing_id)
            self.duplicate_pairs.append((existing_id, record.record_id))
            self.run_id_index[record.run_id].append(record.record_id)
            raise RunIdDuplicateError(record.run_id, existing_id, record.record_id)

        self.run_id_index[record.run_id].append(record.record_id)
        self.record_store[record.record_id] = record
        return False, None

    def safe_register(self, record: SnapshotRecord) -> SnapshotRecord:
        try:
            self.register_record(record)
        except RunIdDuplicateError:
            pass
        return record

    def check_duplicate(self, run_id: str) -> Tuple[bool, Optional[str]]:
        existing = self.run_id_index.get(run_id, [])
        if existing:
            return True, existing[0]
        return False, None

    def get_duplicates(self) -> Dict[str, List[str]]:
        return {
            run_id: record_ids
            for run_id, record_ids in self.run_id_index.items()
            if len(record_ids) > 1
        }

    def get_duplicate_records(self, run_id: str) -> List[SnapshotRecord]:
        record_ids = self.run_id_index.get(run_id, [])
        return [
            self.record_store[rid]
            for rid in record_ids
            if rid in self.record_store
        ]

    def filter_duplicates(self, records: List[SnapshotRecord]) -> List[SnapshotRecord]:
        seen_run_ids: Set[str] = set()
        result = []

        for record in records:
            if record.run_id in seen_run_ids:
                if record.processing_status == ProcessingStatus.NORMAL:
                    record.mark_duplicate("prev_in_batch")
            else:
                seen_run_ids.add(record.run_id)
            result.append(record)

        return result

    def get_duplicate_summary(self) -> Dict[str, Any]:
        duplicate_groups = self.get_duplicates()
        total_duplicated = sum(len(ids) for ids in duplicate_groups.values())
        unique_run_ids = len(self.run_id_index)

        return {
            "total_unique_run_ids": unique_run_ids,
            "duplicated_run_id_count": len(duplicate_groups),
            "total_duplicated_records": total_duplicated - len(duplicate_groups),
            "duplicate_groups": duplicate_groups,
            "has_duplicates": len(duplicate_groups) > 0,
        }

    def mark_duplicates_in_batch(self, records: List[SnapshotRecord]) -> List[SnapshotRecord]:
        run_id_first_seen: Dict[str, str] = {}
        results = []

        for record in records:
            if record.run_id in run_id_first_seen:
                first_id = run_id_first_seen[record.run_id]
                if record.processing_status == ProcessingStatus.NORMAL:
                    record.mark_duplicate(first_id)
                self.duplicate_pairs.append((first_id, record.record_id))
            else:
                run_id_first_seen[record.run_id] = record.record_id
            results.append(record)
            self.record_store[record.record_id] = record
            self.run_id_index[record.run_id].append(record.record_id)

        return results

    def is_duplicate_record(self, record_id: str) -> bool:
        record = self.record_store.get(record_id)
        if not record:
            return False
        return record.processing_status == ProcessingStatus.DUPLICATE_RUN_ID

    def get_original_record(self, duplicate_record_id: str) -> Optional[SnapshotRecord]:
        dup_record = self.record_store.get(duplicate_record_id)
        if not dup_record:
            return None

        for error in dup_record.processing_errors:
            if "run_id重复" in error:
                for original_id, dup_id in self.duplicate_pairs:
                    if dup_id == duplicate_record_id:
                        return self.record_store.get(original_id)

        return None

    def clear(self) -> None:
        self.run_id_index.clear()
        self.record_store.clear()
        self.duplicate_pairs.clear()
