import math
from itertools import combinations
from cf_diag.core.models import SimilarityResult
from cf_diag.core.cold_start import detect_cold_start


def _cosine_similarity(vec_a: list, vec_b: list) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _pearson_similarity(vec_a: list, vec_b: list) -> float:
    n = len(vec_a)
    if n == 0:
        return 0.0
    mean_a = sum(vec_a) / n
    mean_b = sum(vec_b) / n
    centered_a = [a - mean_a for a in vec_a]
    centered_b = [b - mean_b for b in vec_b]
    num = sum(ca * cb for ca, cb in zip(centered_a, centered_b))
    den_a = math.sqrt(sum(ca * ca for ca in centered_a))
    den_b = math.sqrt(sum(cb * cb for cb in centered_b))
    if den_a == 0 or den_b == 0:
        return 0.0
    return num / (den_a * den_b)


def _jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    if union == 0:
        return 0.0
    return intersection / union


def _build_item_vectors(rating_matrix: dict) -> dict:
    all_users = set()
    for uid in rating_matrix:
        all_users.add(uid)
    user_list = sorted(all_users)

    item_vectors: dict[str, list] = {}
    for uid, ratings in rating_matrix.items():
        for iid, score in ratings.items():
            if iid not in item_vectors:
                item_vectors[iid] = [0.0] * len(user_list)
            idx = user_list.index(uid)
            item_vectors[iid][idx] = score
    return item_vectors


def _resolve_cold_start(cold_items) -> tuple:
    is_cold = False
    status = "confirmed"
    for rec in cold_items:
        if rec.status == "pending":
            is_cold = True
            status = "pending"
            break
        elif rec.status == "confirmed_cold":
            is_cold = True
            status = "cold_start_confirmed"
    return is_cold, status


def compute_cosine(store) -> list[SimilarityResult]:
    item_vectors = _build_item_vectors(store.rating_matrix)
    items = sorted(item_vectors.keys())
    results = []
    for a, b in combinations(items, 2):
        score = _cosine_similarity(item_vectors[a], item_vectors[b])
        cold_items = detect_cold_start(store, a, b)
        is_cold, cold_status = _resolve_cold_start(cold_items)
        result = SimilarityResult(
            item_a=a,
            item_b=b,
            method="cosine",
            score=round(score, 6),
            is_cold_start=is_cold,
            status=cold_status,
        )
        store.upsert_similarity(result)
        results.append(result)
    return results


def compute_pearson(store) -> list[SimilarityResult]:
    item_vectors = _build_item_vectors(store.rating_matrix)
    items = sorted(item_vectors.keys())
    results = []
    for a, b in combinations(items, 2):
        score = _pearson_similarity(item_vectors[a], item_vectors[b])
        cold_items = detect_cold_start(store, a, b)
        is_cold, cold_status = _resolve_cold_start(cold_items)
        result = SimilarityResult(
            item_a=a,
            item_b=b,
            method="pearson",
            score=round(score, 6),
            is_cold_start=is_cold,
            status=cold_status,
        )
        store.upsert_similarity(result)
        results.append(result)
    return results


def compute_jaccard(store) -> list[SimilarityResult]:
    if not store.item_tags:
        return []
    items = sorted(store.item_tags.keys())
    results = []
    for a, b in combinations(items, 2):
        set_a = set(store.item_tags.get(a, []))
        set_b = set(store.item_tags.get(b, []))
        score = _jaccard_similarity(set_a, set_b)
        cold_items = detect_cold_start(store, a, b)
        is_cold, cold_status = _resolve_cold_start(cold_items)
        result = SimilarityResult(
            item_a=a,
            item_b=b,
            method="jaccard",
            score=round(score, 6),
            is_cold_start=is_cold,
            status=cold_status,
        )
        store.upsert_similarity(result)
        results.append(result)
    return results


def compute_all_similarities(store) -> list[SimilarityResult]:
    all_results = []
    all_results.extend(compute_cosine(store))
    all_results.extend(compute_pearson(store))
    all_results.extend(compute_jaccard(store))
    return all_results
