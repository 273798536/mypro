from __future__ import annotations

import numpy as np
from scipy import stats
from sklearn.metrics.pairwise import cosine_distances
from typing import Dict, List, Tuple

from .models import DistributionStats, DriftStatus


EMBEDDING_DIM = 128
DRIFT_COSINE_THRESHOLD = 0.02
DRIFT_NORM_DIFF_THRESHOLD = 0.05
DRIFT_KS_PVALUE_THRESHOLD = 0.05


def cosine_distance(v1: np.ndarray, v2: np.ndarray) -> float:
    v1_norm = v1 / (np.linalg.norm(v1) + 1e-12)
    v2_norm = v2 / (np.linalg.norm(v2) + 1e-12)
    return float(1.0 - np.dot(v1_norm, v2_norm))


def compute_pairwise_cosine_distances(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True) + 1e-12
    normalized = vectors / norms
    similarity = normalized @ normalized.T
    distances = 1.0 - similarity
    np.fill_diagonal(distances, 0.0)
    return distances


def compute_distribution_stats(
    baseline_vectors: Dict[str, List[float]],
    target_vectors: Dict[str, List[float]],
) -> DistributionStats:
    common_ids = sorted(set(baseline_vectors.keys()) & set(target_vectors.keys()))
    if not common_ids:
        return DistributionStats(
            mean_norm=0.0,
            std_norm=0.0,
            mean_cosine_similarity=0.0,
            ks_statistic=0.0,
            ks_p_value=1.0,
            dimension_wise_drift=[0.0] * EMBEDDING_DIM,
        )

    base_mat = np.array([baseline_vectors[i] for i in common_ids], dtype=np.float64)
    tgt_mat = np.array([target_vectors[i] for i in common_ids], dtype=np.float64)

    base_norms = np.linalg.norm(base_mat, axis=1)
    tgt_norms = np.linalg.norm(tgt_mat, axis=1)
    norm_diff = tgt_norms - base_norms

    base_pairwise = compute_pairwise_cosine_distances(base_mat)
    tgt_pairwise = compute_pairwise_cosine_distances(tgt_mat)
    iu = np.triu_indices(len(common_ids), k=1)
    base_pw_flat = base_pairwise[iu]
    tgt_pw_flat = tgt_pairwise[iu]

    cosine_sims = []
    for i in range(len(common_ids)):
        sim = 1.0 - cosine_distance(base_mat[i], tgt_mat[i])
        cosine_sims.append(sim)

    ks_stat, ks_p = stats.ks_2samp(base_pw_flat, tgt_pw_flat)

    dim_drift = []
    for d in range(base_mat.shape[1]):
        dim_ks, _ = stats.ks_2samp(base_mat[:, d], tgt_mat[:, d])
        dim_drift.append(float(dim_ks))

    return DistributionStats(
        mean_norm=float(np.mean(norm_diff)),
        std_norm=float(np.std(norm_diff)),
        mean_cosine_similarity=float(np.mean(cosine_sims)),
        ks_statistic=float(ks_stat),
        ks_p_value=float(ks_p),
        dimension_wise_drift=dim_drift,
    )


def detect_question_drift(
    baseline_vec: List[float], target_vec: List[float]
) -> Tuple[bool, float, float]:
    bv = np.array(baseline_vec, dtype=np.float64)
    tv = np.array(target_vec, dtype=np.float64)
    cos_dist = cosine_distance(bv, tv)
    norm_diff = abs(float(np.linalg.norm(bv) - np.linalg.norm(tv)))
    drifted = cos_dist >= DRIFT_COSINE_THRESHOLD or norm_diff >= DRIFT_NORM_DIFF_THRESHOLD
    return drifted, cos_dist, norm_diff


def overall_drift_status(
    drift_rate: float, ks_p_value: float, mean_cosine_similarity: float
) -> DriftStatus:
    if drift_rate >= 0.4 or ks_p_value < 0.001 or mean_cosine_similarity < 0.92:
        return DriftStatus.SEVERE_DRIFT
    if drift_rate >= 0.2 or ks_p_value < DRIFT_KS_PVALUE_THRESHOLD or mean_cosine_similarity < 0.96:
        return DriftStatus.SIGNIFICANT_DRIFT
    if drift_rate >= 0.05 or mean_cosine_similarity < 0.98:
        return DriftStatus.MILD_DRIFT
    return DriftStatus.NO_DRIFT
