import re
from difflib import SequenceMatcher
from typing import List, Tuple, Optional
from ..models.material import Material


class Deduplicator:
    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold

    def _normalize(self, name: str) -> str:
        name = name.lower()
        name = re.sub(r'[vV]\d+(\.\d+)*', '', name)
        name = re.sub(r'\d+版?', '', name)
        name = re.sub(r'[（(【\[].*?[）)】\]]', '', name)
        name = re.sub(r'[_—\-–·\s]+', '', name)
        name = re.sub(r'[，。、！？,.!?\'"]', '', name)
        return name.strip()

    def _extract_version(self, name: str) -> str:
        match = re.search(r'[vV](\d+(?:\.\d+)*)', name)
        if match:
            return match.group(1)
        match = re.search(r'(\d+(?:\.\d+)*)\s*版', name)
        if match:
            return match.group(1)
        return "1.0"

    def similarity(self, name1: str, name2: str) -> float:
        norm1 = self._normalize(name1)
        norm2 = self._normalize(name2)
        if not norm1 or not norm2:
            return 0.0
        return SequenceMatcher(None, norm1, norm2).ratio()

    def find_duplicates(self, target: Material, candidates: List[Material]) -> List[Tuple[Material, float]]:
        duplicates = []
        for candidate in candidates:
            if candidate.id == target.id:
                continue
            if target.duplicate_of and candidate.id == target.duplicate_of:
                continue
            sim = self.similarity(target.name, candidate.name)
            if sim >= self.threshold:
                duplicates.append((candidate, sim))
        duplicates.sort(key=lambda x: x[1], reverse=True)
        return duplicates

    def is_duplicate(self, target: Material, candidates: List[Material]) -> Tuple[bool, Optional[Material], float]:
        duplicates = self.find_duplicates(target, candidates)
        if duplicates:
            best_match, score = duplicates[0]
            return True, best_match, score
        return False, None, 0.0

    def merge_duplicates(self, primary: Material, duplicate: Material, confidence: float) -> Material:
        if not primary.raw_data:
            primary.raw_data = {}
        primary.raw_data[f"merged_{duplicate.id[:8]}"] = {
            "original_name": duplicate.original_name,
            "source": duplicate.source,
            "source_raw": duplicate.source_raw,
            "confidence": confidence,
            "submitted_by": duplicate.submitted_by,
            "submitted_at": duplicate.submitted_at,
            "full_data": duplicate.to_dict()
        }
        if duplicate.notes and duplicate.notes not in primary.notes:
            if primary.notes:
                primary.notes += f"\n\n[来自重复项 {duplicate.original_name}]: {duplicate.notes}"
            else:
                primary.notes = f"[来自重复项 {duplicate.original_name}]: {duplicate.notes}"
        primary.duplicate_of = None
        primary.confidence_score = max(primary.confidence_score, confidence)
        return primary
