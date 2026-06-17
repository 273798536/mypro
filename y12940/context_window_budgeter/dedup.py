from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from .models import SampleRecord, RecordStatus
from .utils import (
    is_empty_or_whitespace,
    has_mixed_notes,
    detect_label_issues,
    detect_data_leak,
    has_duplicate_indicators,
    fuzzy_match_score,
    sanitize_text,
    count_tokens,
)


class DeduplicationResult:
    def __init__(self):
        self.duplicate_groups: Dict[str, List[SampleRecord]] = defaultdict(list)
        self.dirty_records: List[Dict] = []
        self.pending_review: List[Dict] = []
        self.clean_records: List[SampleRecord] = []
        self.stats: Dict[str, int] = defaultdict(int)


class Deduplicator:
    def __init__(
        self,
        allowed_labels: Optional[List[str]] = None,
        fuzzy_threshold: float = 0.9,
        enable_fuzzy_match: bool = True,
    ):
        self.allowed_labels = allowed_labels
        self.fuzzy_threshold = fuzzy_threshold
        self.enable_fuzzy_match = enable_fuzzy_match

    def process(self, records: List[SampleRecord]) -> DeduplicationResult:
        result = DeduplicationResult()
        seen_hashes: Dict[str, SampleRecord] = {}
        all_records = []

        for record in records:
            record.tokens_prompt = count_tokens(record.prompt)
            record.tokens_response = count_tokens(record.response)
            record.recompute_hashes()
            all_records.append(record)

        for record in all_records:
            is_dirty, issues = self._check_dirty(record)
            if is_dirty:
                record.status = RecordStatus.DIRTY
                result.dirty_records.append({
                    "record_id": record.record_id,
                    "issues": issues,
                    "preview": self._get_preview(record)
                })
                result.stats["dirty"] += 1
                continue

            is_pending, pending_issues = self._check_pending_review(record)
            if is_pending:
                record.status = RecordStatus.PENDING
                result.pending_review.append({
                    "record_id": record.record_id,
                    "issues": pending_issues,
                    "preview": self._get_preview(record)
                })
                result.stats["pending"] += 1
                continue

            dedup_hash = record.deduplication_hash
            if dedup_hash in seen_hashes:
                existing = seen_hashes[dedup_hash]
                if record.record_id not in [r.record_id for r in result.duplicate_groups[dedup_hash]]:
                    if existing.record_id not in [r.record_id for r in result.duplicate_groups[dedup_hash]]:
                        result.duplicate_groups[dedup_hash].append(existing)
                    result.duplicate_groups[dedup_hash].append(record)
                record.status = RecordStatus.DIRTY
                record.tags.append("duplicate")
                existing.tags.append("duplicate_original")
                result.stats["duplicates"] += 1
                result.dirty_records.append({
                    "record_id": record.record_id,
                    "issues": [f"精确重复样本，与 {existing.record_id} 重复"],
                    "preview": self._get_preview(record)
                })
                result.stats["dirty"] += 1
                continue

            if self.enable_fuzzy_match:
                is_fuzzy_dup, matched_with = self._check_fuzzy_duplicate(
                    record, list(seen_hashes.values())
                )
                if is_fuzzy_dup:
                    fuzzy_key = f"fuzzy_{matched_with.deduplication_hash}"
                    if matched_with not in result.duplicate_groups[fuzzy_key]:
                        result.duplicate_groups[fuzzy_key].append(matched_with)
                    result.duplicate_groups[fuzzy_key].append(record)
                    record.status = RecordStatus.DIRTY
                    record.tags.append("fuzzy_duplicate")
                    result.stats["fuzzy_duplicates"] += 1
                    result.dirty_records.append({
                        "record_id": record.record_id,
                        "issues": [f"模糊重复样本，与 {matched_with.record_id} 相似"],
                        "preview": self._get_preview(record)
                    })
                    result.stats["dirty"] += 1
                    continue

            seen_hashes[dedup_hash] = record
            record.status = RecordStatus.CLEAN
            result.clean_records.append(record)
            result.stats["clean"] += 1

        return result

    def _check_dirty(self, record: SampleRecord) -> Tuple[bool, List[str]]:
        issues = []

        if is_empty_or_whitespace(record.prompt):
            issues.append("prompt为空")
        if is_empty_or_whitespace(record.response):
            issues.append("response为空")
        if is_empty_or_whitespace(record.label):
            issues.append("标签为空")

        label_dirty, label_issues = detect_label_issues(record.label, self.allowed_labels)
        if label_dirty and "标签为空" not in issues:
            issues.extend(label_issues)

        leak_detected, leak_issues = detect_data_leak(record.prompt, record.response)
        if leak_detected:
            issues.extend(leak_issues)

        dup_ind, dup_issues = has_duplicate_indicators(record.prompt + " " + record.response)
        if dup_ind:
            issues.extend(dup_issues)

        return len(issues) > 0, issues

    def _check_pending_review(self, record: SampleRecord) -> Tuple[bool, List[str]]:
        issues = []

        mixed_notes, note_issues = has_mixed_notes(record.prompt)
        if mixed_notes:
            issues.extend([f"prompt {i}" for i in note_issues])
        mixed_notes_r, note_issues_r = has_mixed_notes(record.response)
        if mixed_notes_r:
            issues.extend([f"response {i}" for i in note_issues_r])

        if len(record.prompt.strip()) < 5 and not is_empty_or_whitespace(record.prompt):
            issues.append("prompt过短，疑似标注不完整")

        if "待确认" in record.label or "可能" in record.label or "不确定" in record.label:
            issues.append("标签含不确定表述，需人工确认")

        return len(issues) > 0, issues

    def _check_fuzzy_duplicate(
        self, record: SampleRecord, existing_records: List[SampleRecord]
    ) -> Tuple[bool, Optional[SampleRecord]]:
        for existing in existing_records:
            prompt_score = fuzzy_match_score(record.prompt, existing.prompt)
            response_score = fuzzy_match_score(record.response, existing.response)
            combined_score = (prompt_score + response_score) / 2
            if combined_score >= self.fuzzy_threshold:
                return True, existing
        return False, None

    def _get_preview(self, record: SampleRecord, max_len: int = 80) -> str:
        prompt_preview = sanitize_text(record.prompt)[:max_len]
        label_preview = sanitize_text(record.label)[:30]
        return f"[label:{label_preview}] {prompt_preview}..."

    def print_report(self, result: DeduplicationResult) -> str:
        lines = ["=" * 60, "样本去重与脏数据检测报告", "=" * 60]
        total = result.stats['clean'] + result.stats['pending'] + result.stats['dirty']
        lines.append(f"总样本数: {total}")
        lines.append(f"  ✅ 干净样本: {result.stats['clean']}")
        lines.append(f"  ⚠️  待复核: {result.stats['pending']}")
        lines.append(f"  ❌ 脏数据: {result.stats['dirty']}")
        lines.append(f"  🔄 精确重复: {result.stats['duplicates']} (已包含在脏数据中)")
        lines.append(f"  🔄 模糊重复: {result.stats['fuzzy_duplicates']} (已包含在脏数据中)")

        if result.duplicate_groups:
            lines.append("\n重复样本组:")
            for key, group in result.duplicate_groups.items():
                lines.append(f"  组 [{key[:8]}...]: {len(group)} 条")
                for rec in group:
                    lines.append(f"    - {rec.record_id}: {self._get_preview(rec, 50)}")

        if result.pending_review:
            lines.append("\n待复核样本:")
            for item in result.pending_review:
                lines.append(f"  - {item['record_id']}: {', '.join(item['issues'])}")
                lines.append(f"    {item['preview']}")

        if result.dirty_records:
            lines.append("\n脏数据样本:")
            for item in result.dirty_records:
                lines.append(f"  - {item['record_id']}: {', '.join(item['issues'])}")
                lines.append(f"    {item['preview']}")

        return "\n".join(lines)
