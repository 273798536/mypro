from __future__ import annotations

from typing import List, Optional

from models import (
    CorrectionRecord,
    JudgmentStatus,
    ProcessingStats,
    QASample,
    RowStatus,
    VersionNote,
)


def _is_bad_row(sample: QASample) -> bool:
    if not sample.sample_id.strip():
        return True
    if not sample.question.strip() or not sample.answer.strip():
        return True
    return False


def _is_skip_row(sample: QASample, note: Optional[VersionNote]) -> bool:
    if sample.predicted_status == JudgmentStatus.SKIPPED:
        return True
    if note and sample.sample_id in note.missing_references:
        return True
    if sample.notes and ("跳过" in sample.notes or "skip" in sample.notes.lower()):
        return True
    return False


def classify_rows(samples: List[QASample], note: Optional[VersionNote] = None) -> ProcessingStats:
    stats = ProcessingStats(total=len(samples))

    for s in samples:
        if _is_bad_row(s):
            s.row_status = RowStatus.BAD
            s.bad_reason = s.bad_reason or "关键字段缺失（ID/问题/答案为空）"
            stats.bad += 1
            stats.bad_samples.append(s.sample_id)
        elif _is_skip_row(s, note):
            s.row_status = RowStatus.SKIPPED
            stats.skipped += 1
            stats.skipped_samples.append(s.sample_id)
        else:
            s.row_status = RowStatus.PROCESSED
            if s.final_status == JudgmentStatus.PENDING:
                s.final_status = s.predicted_status
            stats.processed += 1
            stats.processed_samples.append(s.sample_id)

    return stats


def apply_manual_correction(
    sample: QASample,
    operator: str,
    new_status: JudgmentStatus,
    reason: str,
) -> QASample:
    record = CorrectionRecord(
        operator=operator,
        old_status=sample.final_status,
        new_status=new_status,
        reason=reason,
    )
    sample.corrections.append(record)
    sample.final_status = new_status
    sample.row_status = RowStatus.PROCESSED
    return sample


def supplement_missing_sample(
    sample: QASample,
    operator: str,
    reference_answer: Optional[str] = None,
    question: Optional[str] = None,
    answer: Optional[str] = None,
) -> QASample:
    if question:
        sample.question = question
    if answer:
        sample.answer = answer
    if reference_answer:
        sample.reference_answer = reference_answer

    if _is_bad_row(sample):
        sample.bad_reason = "补录后仍有关键字段缺失"
        return sample

    sample.row_status = RowStatus.PROCESSED
    sample.bad_reason = None
    if sample.final_status == JudgmentStatus.PENDING:
        sample.final_status = sample.predicted_status
    sample.notes = (sample.notes or "") + f" [补录人：{operator}]"
    return sample


def compute_metrics(samples: List[QASample]) -> dict:
    valid = [s for s in samples if s.row_status == RowStatus.PROCESSED]
    total = len(valid)
    correct = sum(1 for s in valid if s.final_status == JudgmentStatus.CORRECT)
    incorrect = sum(1 for s in valid if s.final_status == JudgmentStatus.INCORRECT)
    pending = sum(1 for s in valid if s.final_status == JudgmentStatus.PENDING)
    return {
        "有效样本数": total,
        "正确数": correct,
        "错误数": incorrect,
        "待确认数": pending,
        "正确率": round(correct / total, 4) if total > 0 else 0.0,
    }
