"""训练验证泄漏检测器 - 识别训练集与验证/测试集之间的数据泄漏."""

import re
from typing import List, Dict, Tuple, Optional, Set
from difflib import SequenceMatcher
from collections import defaultdict

from .models import (
    QASample,
    LeakRecord,
    SplitType,
    IssueType,
    IssueSeverity,
)


def _normalize_for_leak(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9]", "", text)
    return text.lower()


def _char_ngrams(text: str, n: int = 3) -> Set[str]:
    normalized = _normalize_for_leak(text)
    if len(normalized) < n:
        return {normalized} if normalized else set()
    return {normalized[i : i + n] for i in range(len(normalized) - n + 1)}


def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


def _sequence_similarity(a: str, b: str) -> float:
    na = _normalize_for_leak(a)
    nb = _normalize_for_leak(b)
    if not na or not nb:
        return 0.0
    return SequenceMatcher(None, na, nb).ratio()


def _combined_similarity(q1: str, a1: str, q2: str, a2: str) -> Tuple[float, List[str]]:
    matched_fields = []
    q_sim = max(
        _jaccard_similarity(_char_ngrams(q1), _char_ngrams(q2)),
        _sequence_similarity(q1, q2),
    )
    a_sim = max(
        _jaccard_similarity(_char_ngrams(a1), _char_ngrams(a2)),
        _sequence_similarity(a1, a2),
    )
    content1 = q1 + " " + a1
    content2 = q2 + " " + a2
    c_sim = max(
        _jaccard_similarity(_char_ngrams(content1), _char_ngrams(content2)),
        _sequence_similarity(content1, content2),
    )
    if q_sim >= 0.9:
        matched_fields.append("question")
    if a_sim >= 0.9:
        matched_fields.append("answer")
    overall = max(q_sim, a_sim, c_sim)
    if overall == c_sim and "question" not in matched_fields and "answer" not in matched_fields:
        matched_fields.append("combined")
    return overall, matched_fields


def _preview(text: str, max_len: int = 60) -> str:
    if not text:
        return ""
    return text[:max_len] + ("..." if len(text) > max_len else "")


def _generate_plain_text_explanation(
    train_sample: QASample,
    val_sample: QASample,
    similarity: float,
    matched_fields: List[str],
) -> str:
    field_desc = {
        "question": "问题内容",
        "answer": "回答内容",
        "combined": "问答整体",
    }
    matched_desc = "、".join(field_desc.get(f, f) for f in matched_fields)
    if not matched_desc:
        matched_desc = "内容"
    sim_pct = int(round(similarity * 100))
    train_group = train_sample.group or "未分组"
    val_group = val_sample.group or "未分组"
    lines = [
        "【训练验证泄漏拦截说明】",
        f"这条样本被拦下的原因是：它和训练集中的另一条样本在{matched_desc}上相似度高达 {sim_pct}%，",
        "如果同时出现在训练集和验证集里，模型会在验证时「见过」这道题，验证分数就虚高，不能真实反映模型能力。",
        "",
        "具体情况：",
        f"• 训练集样本 (ID: {train_sample.sample_id[:8]}...)，分组：{train_group}",
        f"  问题摘要：{_preview(train_sample.question)}",
        f"• 验证集样本 (ID: {val_sample.sample_id[:8]}...)，分组：{val_group}",
        f"  问题摘要：{_preview(val_sample.question)}",
        "",
        "处理建议：二选一保留即可，推荐保留来源更可靠、人工标注更完整的那条。",
    ]
    preserved_notes = []
    for note in train_sample.human_notes:
        preserved_notes.append(f"【训练集人工备注·原话保留】{note.preserved_original or note.content}")
    for note in val_sample.human_notes:
        preserved_notes.append(f"【验证集人工备注·原话保留】{note.preserved_original or note.content}")
    if preserved_notes:
        lines.append("")
        lines.append("相关人工备注（原话保留，未做改写）：")
        lines.extend(preserved_notes)
    return "\n".join(lines)


class LeakDetector:
    """训练验证泄漏检测器.

    核心设计：
    - 泄漏检测结果不会藏在汇总里，每条泄漏都有独立记录
    - 每条泄漏记录附带一段普通话解释，产品经理可直接复制
    - 样本的人工备注原话保留，不做自动改写
    """

    def __init__(
        self,
        question_threshold: float = 0.92,
        answer_threshold: float = 0.90,
        overall_threshold: float = 0.88,
        ngram_size: int = 3,
    ):
        self.question_threshold = question_threshold
        self.answer_threshold = answer_threshold
        self.overall_threshold = overall_threshold
        self.ngram_size = ngram_size

    def detect(
        self,
        samples: List[QASample],
        train_splits: Optional[Set[SplitType]] = None,
        val_splits: Optional[Set[SplitType]] = None,
    ) -> List[LeakRecord]:
        train_splits = train_splits or {SplitType.TRAIN}
        val_splits = val_splits or {SplitType.VAL, SplitType.TEST}
        train_samples = [s for s in samples if s.split in train_splits]
        val_samples = [s for s in samples if s.split in val_splits]
        if not train_samples or not val_samples:
            return []
        train_ngrams: Dict[str, List[QASample]] = defaultdict(list)
        for ts in train_samples:
            for ng in _char_ngrams(ts.question, self.ngram_size):
                train_ngrams[ng].append(ts)
            for ng in _char_ngrams(ts.answer, self.ngram_size):
                train_ngrams[ng].append(ts)
        leak_records: List[LeakRecord] = []
        seen_pairs: Set[Tuple[str, str]] = set()
        for vs in val_samples:
            candidate_ids: Set[str] = set()
            for ng in _char_ngrams(vs.question, self.ngram_size):
                for ts in train_ngrams.get(ng, []):
                    candidate_ids.add(ts.sample_id)
            for ng in _char_ngrams(vs.answer, self.ngram_size):
                for ts in train_ngrams.get(ng, []):
                    candidate_ids.add(ts.sample_id)
            candidate_map = {ts.sample_id: ts for ts in train_samples if ts.sample_id in candidate_ids}
            for train_id, ts in candidate_map.items():
                pair_key = (train_id, vs.sample_id)
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                similarity, matched_fields = _combined_similarity(
                    ts.question, ts.answer, vs.question, vs.answer
                )
                is_leak = False
                leak_reason_parts = []
                q_sim = _sequence_similarity(ts.question, vs.question)
                a_sim = _sequence_similarity(ts.answer, vs.answer)
                if q_sim >= self.question_threshold:
                    is_leak = True
                    leak_reason_parts.append(f"问题相似度 {int(q_sim * 100)}% ≥ 阈值 {int(self.question_threshold * 100)}%")
                if a_sim >= self.answer_threshold:
                    is_leak = True
                    leak_reason_parts.append(f"回答相似度 {int(a_sim * 100)}% ≥ 阈值 {int(self.answer_threshold * 100)}%")
                if similarity >= self.overall_threshold and not is_leak:
                    is_leak = True
                    leak_reason_parts.append(f"整体相似度 {int(similarity * 100)}% ≥ 阈值 {int(self.overall_threshold * 100)}%")
                if is_leak:
                    plain_explanation = _generate_plain_text_explanation(
                        ts, vs, similarity, matched_fields
                    )
                    preserved_notes = []
                    for note in ts.human_notes:
                        preserved_notes.append(note.preserved_original or note.content)
                    for note in vs.human_notes:
                        preserved_notes.append(note.preserved_original or note.content)
                    record = LeakRecord(
                        issue_type=IssueType.TRAIN_VAL_LEAK,
                        severity=IssueSeverity.BLOCKER,
                        train_sample_id=ts.sample_id,
                        val_sample_id=vs.sample_id,
                        train_question_preview=_preview(ts.question),
                        val_question_preview=_preview(vs.question),
                        similarity_score=round(similarity, 4),
                        leak_reason="；".join(leak_reason_parts) if leak_reason_parts else f"相似度 {int(similarity * 100)}%",
                        plain_text_explanation=plain_explanation,
                        matched_fields=matched_fields,
                        preserved_human_notes=preserved_notes,
                        metadata={
                            "question_similarity": round(q_sim, 4),
                            "answer_similarity": round(a_sim, 4),
                        },
                    )
                    leak_records.append(record)
        leak_records.sort(key=lambda r: r.similarity_score, reverse=True)
        return leak_records

    def get_blocked_val_ids(self, leak_records: List[LeakRecord]) -> Set[str]:
        return {lr.val_sample_id for lr in leak_records}
