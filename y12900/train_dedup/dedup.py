"""近重复检测算法核心模块"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Iterable

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .models import DedupRecord, DedupResult, Sample


def normalize_text(text: str) -> str:
    """文本归一化：去多余空格、统一小写、去标点"""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s\u4e00-\u9fff]", "", text)
    return text


def char_ngrams(text: str, n: int = 3) -> list[str]:
    """字符级 n-gram"""
    text = normalize_text(text)
    if len(text) < n:
        return [text] if text else []
    return [text[i : i + n] for i in range(len(text) - n + 1)]


def sequence_similarity(a: str, b: str) -> float:
    """基于 difflib 的序列相似度"""
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def jaccard_similarity(a: str, b: str, n: int = 3) -> float:
    """Jaccard 相似度（基于字符 n-gram 集合）"""
    sa = set(char_ngrams(a, n))
    sb = set(char_ngrams(b, n))
    if not sa and not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def minhash_signature(tokens: list[str], num_hashes: int = 128) -> np.ndarray:
    """简化版 MinHash 签名（纯 numpy 实现）"""
    if not tokens:
        return np.zeros(num_hashes, dtype=np.uint32)
    max_val = 2**32 - 1
    rng = np.random.RandomState(42)
    a = rng.randint(1, max_val, size=num_hashes, dtype=np.uint64)
    b = rng.randint(0, max_val, size=num_hashes, dtype=np.uint64)
    token_hashes = np.array(
        [abs(hash(t)) % max_val for t in tokens], dtype=np.uint64
    )
    sigs = np.zeros((num_hashes, len(token_hashes)), dtype=np.uint64)
    for i in range(num_hashes):
        sigs[i] = (a[i] * token_hashes + b[i]) % max_val
    return sigs.min(axis=1).astype(np.uint32)


def estimate_jaccard_from_sig(sig_a: np.ndarray, sig_b: np.ndarray) -> float:
    """从 MinHash 签名估计 Jaccard 相似度"""
    if len(sig_a) != len(sig_b):
        return 0.0
    return float(np.mean(sig_a == sig_b))


def is_bad_data(sample: Sample) -> tuple[bool, str]:
    """检测是否为坏数据"""
    content = sample.content.strip()
    if not content:
        return True, "内容为空"
    if len(content) < 5:
        return True, "内容过短"
    garbage_patterns = [
        r"^(测试|test|demo|示例|占位|todo|待补充)",
        r"^[。，、；：？！,.;:?!\s]+$",
        r"^(.)\1{10,}$",
    ]
    for pat in garbage_patterns:
        if re.match(pat, content, re.IGNORECASE):
            return True, f"匹配垃圾内容模式: {pat}"
    if len(set(content)) <= 2 and len(content) > 20:
        return True, "字符重复度极高"
    return False, ""


def is_near_duplicate(
    a: Sample,
    b: Sample,
    threshold: float = 0.85,
    method: str = "hybrid",
) -> tuple[bool, float, str]:
    """判断两个样本是否近重复

    返回: (是否重复, 相似度, 检测方法)
    """
    if method == "exact":
        sim = 1.0 if normalize_text(a.content) == normalize_text(b.content) else 0.0
        return sim >= threshold, sim, "exact"

    if method == "jaccard":
        sim = jaccard_similarity(a.content, b.content, n=3)
        return sim >= threshold, sim, "jaccard"

    if method == "sequence":
        sim = sequence_similarity(a.content, b.content)
        return sim >= threshold, sim, "sequence"

    # hybrid: 先用 MinHash/Jaccard 快速过滤，再用 sequence 精判
    j_sim = jaccard_similarity(a.content, b.content, n=3)
    if j_sim < threshold * 0.5:
        return False, j_sim, "hybrid_jaccard"
    s_sim = sequence_similarity(a.content, b.content)
    final_sim = max(j_sim, s_sim)
    return final_sim >= threshold, final_sim, "hybrid"


def tfidf_dedup(
    samples: list[Sample],
    threshold: float = 0.85,
) -> list[tuple[int, int, float]]:
    """基于 TF-IDF + 余弦相似度的批量去重"""
    if len(samples) < 2:
        return []

    texts = [normalize_text(s.content) for s in samples]
    try:
        vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(2, 4))
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        return []

    pairs: list[tuple[int, int, float]] = []
    batch_size = 500
    n = matrix.shape[0]
    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        sim = cosine_similarity(matrix[start:end], matrix)
        for i in range(sim.shape[0]):
            global_i = start + i
            for j in range(global_i + 1, n):
                if sim[i, j] >= threshold:
                    pairs.append((global_i, j, float(sim[i, j])))
    return pairs


def run_dedup(
    samples: Iterable[Sample],
    threshold: float = 0.85,
    review_threshold: float = 0.95,
    method: str = "hybrid",
    use_tfidf_batch: bool = True,
    keep_strategy: str = "first",
    by_split: bool = True,
) -> DedupResult:
    """执行完整的去重流程

    keep_strategy: first（保留第一条） / longest（保留最长内容） / newest（保留最新）
    by_split: 按 split 分组去重（训练集内部去重、验证集内部去重），跨 split 的相似不算重复
    review_threshold: 组内平均相似度低于此值时标记为待人工复核
    """
    sample_list = list(samples)
    bad_samples: list[Sample] = []
    candidate_samples: list[Sample] = []

    for s in sample_list:
        bad, reason = is_bad_data(s)
        if bad:
            s.metadata["bad_reason"] = reason
            bad_samples.append(s)
        else:
            candidate_samples.append(s)

    dedup_records: list[DedupRecord] = []
    clean_samples: list[Sample] = []
    needs_review_samples: list[Sample] = []

    if not candidate_samples:
        return DedupResult([], dedup_records, needs_review_samples, bad_samples)

    if by_split:
        split_groups: dict[str, list[int]] = {}
        for idx, s in enumerate(candidate_samples):
            split_groups.setdefault(s.split.value, []).append(idx)
    else:
        split_groups = {"all": list(range(len(candidate_samples)))}

    all_removed: set[int] = set()
    all_review: set[int] = set()
    group_map: dict[int, list[int]] = {}

    for split_name, indices in split_groups.items():
        sub_samples = [candidate_samples[i] for i in indices]

        pairs: list[tuple[int, int, float]] = []
        if use_tfidf_batch and len(sub_samples) >= 20:
            raw_pairs = tfidf_dedup(sub_samples, threshold=threshold)
            for li, ri, sim in raw_pairs:
                pairs.append((indices[li], indices[ri], sim))
        else:
            for li_idx in range(len(sub_samples)):
                for ri_idx in range(li_idx + 1, len(sub_samples)):
                    is_dup, sim, _ = is_near_duplicate(
                        sub_samples[li_idx],
                        sub_samples[ri_idx],
                        threshold=threshold,
                        method=method,
                    )
                    if is_dup:
                        pairs.append((indices[li_idx], indices[ri_idx], sim))

        if not pairs:
            continue

        group_rep: dict[int, int] = {}
        sim_between: dict[frozenset[int], float] = {}

        def find(x: int) -> int:
            while group_rep.get(x, x) != x:
                group_rep[x] = group_rep.get(group_rep[x], group_rep[x])
                x = group_rep[x]
            return x

        for i, j, sim in pairs:
            sim_between[frozenset([i, j])] = sim
            ri, rj = find(i), find(j)
            if ri != rj:
                group_rep[rj] = ri

        groups: dict[int, list[int]] = {}
        for i in indices:
            rep = find(i)
            groups.setdefault(rep, []).append(i)

        for rep, members in groups.items():
            if len(members) == 1:
                continue
            group_map[rep] = members

            if keep_strategy == "longest":
                members.sort(key=lambda idx: -len(candidate_samples[idx].content))
            elif keep_strategy == "newest":
                members.sort(key=lambda idx: candidate_samples[idx].created_at, reverse=True)

            keep_idx = members[0]
            removed_idx = members[1:]

            sims = []
            for r in removed_idx:
                key = frozenset([keep_idx, r])
                if key in sim_between:
                    sims.append(sim_between[key])
                else:
                    sims.append(threshold)
            avg_sim = sum(sims) / len(sims) if sims else threshold

            if avg_sim >= review_threshold:
                keep_sample = candidate_samples[keep_idx]
                removed_ids = [candidate_samples[r].sample_id for r in removed_idx]
                for r in removed_idx:
                    all_removed.add(r)
                    candidate_samples[r].metadata["removed_by"] = keep_sample.sample_id
                    candidate_samples[r].metadata["similarity"] = round(
                        sim_between.get(frozenset([keep_idx, r]), threshold), 4
                    )

                dedup_records.append(
                    DedupRecord(
                        keep_sample_id=keep_sample.sample_id,
                        removed_sample_ids=removed_ids,
                        similarity=round(avg_sim, 4),
                        method=f"{method}_split_{split_name}",
                        reason=f"近重复组（{split_name}），平均相似度 {round(avg_sim, 4)}，共 {len(members)} 条",
                    )
                )
            else:
                for m in members:
                    all_review.add(m)
                    candidate_samples[m].metadata["needs_review_reason"] = (
                        f"疑似近重复组（{split_name} 内，共 {len(members)} 条），"
                        f"平均相似度 {round(avg_sim, 4)}，请人工复核"
                    )

    dup_samples: list[Sample] = []
    for idx in range(len(candidate_samples)):
        if idx in all_removed:
            candidate_samples[idx].metadata["status"] = "duplicate"
            dup_samples.append(candidate_samples[idx])
        elif idx in all_review:
            needs_review_samples.append(candidate_samples[idx])
        else:
            clean_samples.append(candidate_samples[idx])

    needs_review_samples = list(
        {s.sample_id: s for s in needs_review_samples}.values()
    )

    return DedupResult(
        clean_samples=clean_samples,
        dedup_records=dedup_records,
        needs_review_samples=needs_review_samples,
        bad_samples=bad_samples,
        duplicate_samples=dup_samples,
    )
