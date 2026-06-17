from typing import List, Dict, Tuple
from collections import defaultdict
from .models import VersionNote, DuplicateEvaluation, EvaluationSample, JudgmentStatus


class DuplicateDetector:
    def __init__(self):
        self.duplicate_map: Dict[str, List[str]] = defaultdict(list)

    def detect_from_notes(
        self, version_notes: List[VersionNote]
    ) -> List[DuplicateEvaluation]:
        duplicates: List[DuplicateEvaluation] = []

        for note in version_notes:
            sample_id = self._extract_sample_id(note.content)
            if sample_id:
                self.duplicate_map[sample_id].append(note.version)

        for sample_id, versions in self.duplicate_map.items():
            if len(versions) >= 2:
                reason = self._analyze_duplicate_reason(version_notes, versions)
                impact = self._analyze_impact_scope(versions)

                dup = DuplicateEvaluation(
                    sample_id=sample_id,
                    duplicate_count=len(versions),
                    versions=versions,
                    reason=reason,
                    impact_scope=impact,
                    confirmed=False,
                )
                duplicates.append(dup)

        for note in version_notes:
            sample_id = self._extract_sample_id(note.content)
            if sample_id and len(self.duplicate_map.get(sample_id, [])) >= 2:
                note.is_duplicate = True
                note.duplicate_with = ", ".join(
                    v for v in self.duplicate_map[sample_id] if v != note.version
                )

        return duplicates

    def mark_samples_pending(
        self,
        samples: List[EvaluationSample],
        duplicates: List[DuplicateEvaluation],
    ) -> List[EvaluationSample]:
        pending_ids = {d.sample_id for d in duplicates if not d.confirmed}

        for sample in samples:
            if sample.sample_id in pending_ids:
                sample.status = JudgmentStatus.TO_CONFIRM
                dup_info = next(
                    (d for d in duplicates if d.sample_id == sample.sample_id),
                    None,
                )
                if dup_info:
                    sample.notes = (
                        f"存在重复评测，涉及版本：{', '.join(dup_info.versions)}。"
                        f"待确认原因：{dup_info.reason}"
                    )

        return samples

    def confirm_duplicate(
        self, duplicates: List[DuplicateEvaluation], sample_id: str
    ) -> bool:
        for dup in duplicates:
            if dup.sample_id == sample_id:
                dup.confirmed = True
                return True
        return False

    def generate_pending_summary(
        self, duplicates: List[DuplicateEvaluation]
    ) -> List[Dict]:
        return [
            {
                "sample_id": d.sample_id,
                "versions": d.versions,
                "reason": d.reason,
                "impact_scope": d.impact_scope,
                "confirmed": d.confirmed,
            }
            for d in duplicates
            if not d.confirmed
        ]

    @staticmethod
    def _extract_sample_id(content: str) -> str:
        import re

        patterns = [
            r"样本[IＤ][D][:：]?\s*([A-Za-z0-9_]+)",
            r"conversation[_-]id[:：]?\s*([A-Za-z0-9_]+)",
            r"(SAMPLE[_-]?[0-9]+)",
            r"\[([A-Z]+[_-]?[0-9]+)\]",
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).upper().replace("-", "_")

        return ""

    @staticmethod
    def _analyze_duplicate_reason(
        notes: List[VersionNote], versions: List[str]
    ) -> str:
        relevant_notes = [n for n in notes if n.version in versions]

        if len(relevant_notes) >= 2:
            first = relevant_notes[0].content
            last = relevant_notes[-1].content

            if "重新评测" in last or "重跑" in last:
                return "同一样本在不同版本中被重复评测，疑似版本迭代后重跑"
            if "补充" in last or "追加" in last:
                return "后补说明中包含已评测样本，需确认是否覆盖原结果"
            if "撤回" in first or "撤回" in last:
                return "样本存在撤回记录后又被重新评测"
            if first[:30] == last[:30]:
                return "版本说明内容高度相似，疑似重复提交"

        return f"样本在{len(versions)}个版本中均有评测记录，需人工确认评测目的"

    @staticmethod
    def _analyze_impact_scope(versions: List[str]) -> str:
        if len(versions) == 2:
            return f"仅影响 {versions[0]} 和 {versions[1]} 两个版本的对比结果"
        else:
            return (
                f"涉及 {len(versions)} 个版本，"
                f"可能影响 {versions[0]} 至 {versions[-1]} 期间的所有指标统计"
            )
