"""训练验证泄漏检测模块"""

from __future__ import annotations

from typing import Iterable

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .dedup import jaccard_similarity, normalize_text, sequence_similarity
from .models import LeakageRecord, LeakageResult, Sample, SplitType


def detect_leakage_tfidf(
    train_samples: list[Sample],
    val_samples: list[Sample],
    threshold: float = 0.80,
) -> list[tuple[int, int, float]]:
    """使用 TF-IDF + 余弦相似度批量检测训练/验证泄漏"""
    if not train_samples or not val_samples:
        return []

    train_texts = [normalize_text(s.content) for s in train_samples]
    val_texts = [normalize_text(s.content) for s in val_samples]

    try:
        vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(2, 4))
        vectorizer.fit(train_texts + val_texts)
        train_mat = vectorizer.transform(train_texts)
        val_mat = vectorizer.transform(val_texts)
    except ValueError:
        return []

    pairs: list[tuple[int, int, float]] = []
    batch_size = 200
    n_train = train_mat.shape[0]
    n_val = val_mat.shape[0]

    for v_start in range(0, n_val, batch_size):
        v_end = min(v_start + batch_size, n_val)
        sim = cosine_similarity(val_mat[v_start:v_end], train_mat)
        for i in range(sim.shape[0]):
            v_idx = v_start + i
            for t_idx in range(n_train):
                if sim[i, t_idx] >= threshold:
                    pairs.append((t_idx, v_idx, float(sim[i, t_idx])))
    return pairs


def detect_leakage_pairwise(
    train_samples: list[Sample],
    val_samples: list[Sample],
    threshold: float = 0.80,
) -> list[tuple[int, int, float]]:
    """使用两两比较精确检测（小规模数据集）"""
    pairs: list[tuple[int, int, float]] = []
    for ti, ts in enumerate(train_samples):
        for vi, vs in enumerate(val_samples):
            j_sim = jaccard_similarity(ts.content, vs.content)
            if j_sim < threshold * 0.6:
                continue
            s_sim = sequence_similarity(ts.content, vs.content)
            final = max(j_sim, s_sim)
            if final >= threshold:
                pairs.append((ti, vi, final))
    return pairs


def detect_leakage(
    samples: Iterable[Sample],
    threshold: float = 0.80,
    auto: bool = True,
) -> LeakageResult:
    """检测训练/验证集之间的泄漏

    auto=True 时根据数据量自动选择批量或两两方式
    """
    sample_list = list(samples)
    train_samples = [s for s in sample_list if s.split == SplitType.TRAIN]
    val_samples = [s for s in sample_list if s.split in (SplitType.VAL, SplitType.TEST)]

    if not train_samples or not val_samples:
        return LeakageResult([], train_samples, val_samples)

    total_pairs = len(train_samples) * len(val_samples)
    if auto and total_pairs > 5000:
        raw_pairs = detect_leakage_tfidf(train_samples, val_samples, threshold)
    else:
        raw_pairs = detect_leakage_pairwise(train_samples, val_samples, threshold)

    leakage_records: list[LeakageRecord] = []
    leaked_train_ids: set[str] = set()
    leaked_val_ids: set[str] = set()

    for ti, vi, sim in raw_pairs:
        ts = train_samples[ti]
        vs = val_samples[vi]
        leaked_train_ids.add(ts.sample_id)
        leaked_val_ids.add(vs.sample_id)
        method = "tfidf_cosine" if (auto and total_pairs > 5000) else "hybrid_pairwise"
        leakage_records.append(
            LeakageRecord(
                train_sample_id=ts.sample_id,
                val_sample_id=vs.sample_id,
                similarity=round(sim, 4),
                method=method,
            )
        )

    safe_train = [s for s in train_samples if s.sample_id not in leaked_train_ids]
    safe_val = [s for s in val_samples if s.sample_id not in leaked_val_ids]

    return LeakageResult(leakage_records, safe_train, safe_val)


def filter_leaked(
    samples: Iterable[Sample],
    remove_from: str = "val",
) -> list[Sample]:
    """基于泄漏检测结果过滤样本

    remove_from: 'val' 从验证集移除泄漏，'train' 从训练集移除，'both' 两边都移除
    """
    result = detect_leakage(samples)
    if not result.has_leakage:
        return list(samples)

    leaked_train_ids = {r.train_sample_id for r in result.leakage_records}
    leaked_val_ids = {r.val_sample_id for r in result.leakage_records}

    kept: list[Sample] = []
    for s in samples:
        if s.split == SplitType.TRAIN and remove_from in ("train", "both"):
            if s.sample_id in leaked_train_ids:
                continue
        if s.split in (SplitType.VAL, SplitType.TEST) and remove_from in ("val", "both"):
            if s.sample_id in leaked_val_ids:
                continue
        kept.append(s)
    return kept
