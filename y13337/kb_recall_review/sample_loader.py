import csv
import os
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .models import SampleRecord, DuplicateInfo


def load_samples_from_csv(file_path: str, sheet_name: str = "default") -> List[SampleRecord]:
    samples = []
    if not os.path.exists(file_path):
        return samples

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):
            sample_id = row.get("sample_id", row.get("id", "")).strip()
            query = row.get("query", row.get("question", "")).strip()
            expected_knowledge_id = row.get("expected_knowledge_id", row.get("knowledge_id", "")).strip()
            expected_knowledge_title = row.get("expected_knowledge_title", row.get("knowledge_title", "")).strip()
            notes = row.get("notes", row.get("remark", "")).strip() or None
            tags_str = row.get("tags", "").strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []
            is_bad_data = row.get("is_bad_data", "").strip().lower() in ("yes", "true", "1", "是")
            bad_data_reason = row.get("bad_data_reason", "").strip() or None

            if not sample_id:
                sample_id = f"auto_{idx}"

            sample = SampleRecord(
                sample_id=sample_id,
                query=query,
                expected_knowledge_id=expected_knowledge_id,
                expected_knowledge_title=expected_knowledge_title,
                raw_row_index=idx,
                source_sheet=sheet_name,
                notes=notes,
                tags=tags,
                is_bad_data=is_bad_data,
                bad_data_reason=bad_data_reason,
            )
            samples.append(sample)

    return samples


def detect_duplicates(samples: List[SampleRecord]) -> Tuple[List[DuplicateInfo], Dict[str, List[SampleRecord]]]:
    id_groups = defaultdict(list)
    for sample in samples:
        id_groups[sample.sample_id].append(sample)

    duplicates = []
    duplicate_groups = {}

    for sample_id, group in id_groups.items():
        if len(group) > 1:
            occurrences = []
            has_conflict = False
            conflict_details = []

            expected_ids = set(s.expected_knowledge_id for s in group if s.expected_knowledge_id)
            queries = set(s.query for s in group if s.query)

            if len(expected_ids) > 1:
                has_conflict = True
                conflict_details.append(f"预期知识ID不一致: {expected_ids}")
            if len(queries) > 1:
                has_conflict = True
                conflict_details.append(f"查询文本不一致")

            for s in group:
                occurrences.append({
                    "row_index": s.raw_row_index,
                    "source_sheet": s.source_sheet,
                    "notes": s.notes,
                    "is_bad_data": s.is_bad_data,
                })

            dup_info = DuplicateInfo(
                sample_id=sample_id,
                duplicate_count=len(group),
                occurrences=occurrences,
                conflict_found=has_conflict,
                conflict_details="; ".join(conflict_details) if conflict_details else None,
            )
            duplicates.append(dup_info)
            duplicate_groups[sample_id] = group

    return duplicates, duplicate_groups


def get_unique_samples(samples: List[SampleRecord]) -> List[SampleRecord]:
    seen = {}
    for sample in samples:
        if sample.sample_id not in seen:
            seen[sample.sample_id] = sample
        else:
            existing = seen[sample.sample_id]
            if not existing.notes and sample.notes:
                seen[sample.sample_id] = sample
            if not existing.expected_knowledge_title and sample.expected_knowledge_title:
                seen[sample.sample_id] = sample
    return list(seen.values())


def flag_bad_data(samples: List[SampleRecord]) -> List[SampleRecord]:
    for sample in samples:
        if sample.is_bad_data:
            continue
        if not sample.query or not sample.expected_knowledge_id:
            sample.is_bad_data = True
            sample.bad_data_reason = "关键字段缺失"
    return samples
