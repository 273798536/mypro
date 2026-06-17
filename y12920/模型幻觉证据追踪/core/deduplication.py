import json
import re
import uuid
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher

from fuzzywuzzy import fuzz

from .models import HallucinationRecord, RecordStatus, DuplicateGroup, SourceMaterial


class SampleDeduplicator:
    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            storage_dir = Path(__file__).parent.parent / "data"
        self.storage_dir = Path(storage_dir)
        self.groups_dir = self.storage_dir / "duplicate_groups"
        self.groups_dir.mkdir(parents=True, exist_ok=True)
        self.duplicate_groups: Dict[str, DuplicateGroup] = {}
        self._load_groups()

    def _load_groups(self) -> None:
        for file_path in self.groups_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("merged_at"):
                    data["merged_at"] = datetime.fromisoformat(data["merged_at"])
                group = DuplicateGroup(**data)
                self.duplicate_groups[group.group_id] = group
            except Exception:
                continue

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', '', text)
        text = re.sub(r'\s+', '', text)
        return text

    def calculate_similarity(self, text1: str, text2: str) -> float:
        norm1 = self._normalize_text(text1)
        norm2 = self._normalize_text(text2)

        if not norm1 or not norm2:
            return 0.0

        if norm1 == norm2:
            return 1.0

        levenshtein_score = fuzz.ratio(norm1, norm2) / 100.0
        sequence_score = SequenceMatcher(None, norm1, norm2).ratio()

        combined_score = (levenshtein_score * 0.6 + sequence_score * 0.4)
        return round(combined_score, 4)

    def find_duplicates(self, records: List[HallucinationRecord],
                        threshold: float = 0.85) -> List[DuplicateGroup]:
        duplicate_groups: List[DuplicateGroup] = []
        processed = set()

        for i, record in enumerate(records):
            if record.record_id in processed:
                continue

            group_members = [record.record_id]
            max_similarity = 0.0
            match_type = "exact" if record.input_query == record.model_output else "fuzzy"

            for j, other in enumerate(records):
                if i == j or other.record_id in processed:
                    continue

                input_sim = self.calculate_similarity(record.input_query, other.input_query)
                output_sim = self.calculate_similarity(record.model_output, other.model_output)
                source_sim = self._calculate_source_similarity(
                    record.source_materials, other.source_materials
                )

                overall_sim = (input_sim * 0.4 + output_sim * 0.4 + source_sim * 0.2)

                if overall_sim >= threshold:
                    group_members.append(other.record_id)
                    max_similarity = max(max_similarity, overall_sim)
                    processed.add(other.record_id)

                    if input_sim >= 0.95 and output_sim >= 0.95:
                        match_type = "exact"

            if len(group_members) > 1:
                processed.add(record.record_id)
                group = DuplicateGroup(
                    group_id=f"dup_{uuid.uuid4().hex[:8]}",
                    primary_record_id=group_members[0],
                    duplicate_record_ids=group_members[1:],
                    similarity_score=max_similarity if max_similarity > 0 else threshold,
                    match_type=match_type,
                )
                duplicate_groups.append(group)
                self.duplicate_groups[group.group_id] = group
                self._save_group(group)

        return duplicate_groups

    def _calculate_source_similarity(self, sources1: List[SourceMaterial],
                                     sources2: List[SourceMaterial]) -> float:
        if not sources1 or not sources2:
            return 0.0

        ids1 = {s.material_id for s in sources1}
        ids2 = {s.material_id for s in sources2}

        if not ids1 or not ids2:
            return 0.0

        intersection = len(ids1 & ids2)
        union = len(ids1 | ids2)

        return intersection / union if union > 0 else 0.0

    def mark_duplicates(self, records: List[HallucinationRecord],
                        groups: List[DuplicateGroup]) -> List[HallucinationRecord]:
        record_map = {r.record_id: r for r in records}

        for group in groups:
            primary = record_map.get(group.primary_record_id)
            if primary:
                primary.duplicate_group_id = group.group_id
                primary.updated_at = datetime.now()

            for dup_id in group.duplicate_record_ids:
                dup_record = record_map.get(dup_id)
                if dup_record:
                    dup_record.status = RecordStatus.DUPLICATE
                    dup_record.duplicate_of = group.primary_record_id
                    dup_record.duplicate_group_id = group.group_id
                    dup_record.updated_at = datetime.now()

        return records

    def get_source_trail(self, record: HallucinationRecord,
                         all_records: List[HallucinationRecord]) -> Dict[str, Any]:
        trail = {
            "record_id": record.record_id,
            "is_duplicate": record.status == RecordStatus.DUPLICATE,
            "source_materials": [
                {
                    "material_id": s.material_id,
                    "source_type": s.source_type,
                    "content_preview": s.content[:200] + "..." if len(s.content) > 200 else s.content,
                }
                for s in record.source_materials
            ],
        }

        if record.duplicate_of:
            trail["duplicate_of"] = record.duplicate_of
            original = next((r for r in all_records if r.record_id == record.duplicate_of), None)
            if original:
                trail["original_sources"] = [
                    {
                        "material_id": s.material_id,
                        "source_type": s.source_type,
                    }
                    for s in original.source_materials
                ]

        if record.duplicate_group_id:
            group = self.duplicate_groups.get(record.duplicate_group_id)
            if group:
                trail["duplicate_group"] = {
                    "group_id": group.group_id,
                    "similarity_score": group.similarity_score,
                    "match_type": group.match_type,
                    "all_members": [group.primary_record_id] + group.duplicate_record_ids,
                }

        return trail

    def _save_group(self, group: DuplicateGroup) -> None:
        file_path = self.groups_dir / f"{group.group_id}.json"
        data = group.model_dump()
        if data.get("merged_at"):
            data["merged_at"] = data["merged_at"].isoformat()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_statistics(self) -> Dict[str, Any]:
        total_groups = len(self.duplicate_groups)
        total_duplicates = sum(
            len(g.duplicate_record_ids) for g in self.duplicate_groups.values()
        )
        exact_matches = sum(
            1 for g in self.duplicate_groups.values() if g.match_type == "exact"
        )
        fuzzy_matches = total_groups - exact_matches

        return {
            "total_duplicate_groups": total_groups,
            "total_duplicate_records": total_duplicates,
            "exact_match_groups": exact_matches,
            "fuzzy_match_groups": fuzzy_matches,
            "avg_similarity": (
                round(sum(g.similarity_score for g in self.duplicate_groups.values()) / total_groups, 4)
                if total_groups > 0 else 0.0
            ),
        }
