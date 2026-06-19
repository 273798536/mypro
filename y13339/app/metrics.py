"""指标计算模块 - Recall@K, MRR, 异常样本检测"""
from typing import List, Tuple
from .models import RecallResult
import statistics


def _match_at_k(result: RecallResult, k: int) -> bool:
    if not result.expected_material_id:
        return False
    recalled = result.recalled_material_ids[:k]
    return result.expected_material_id in recalled


def _rank_of_expected(result: RecallResult) -> int:
    if not result.expected_material_id:
        return 0
    try:
        idx = result.recalled_material_ids.index(result.expected_material_id)
        return idx + 1
    except ValueError:
        return 0


def compute_metrics(
    results: List[RecallResult],
) -> Tuple[dict, List[str]]:
    """
    计算指标并识别拉偏结论的异常样本。

    返回: (指标字典, 异常样本ID列表)
    """
    total = len(results)
    if total == 0:
        return {"recall_at_1": 0.0, "recall_at_3": 0.0, "recall_at_5": 0.0, "mrr": 0.0, "total_samples": 0}, []

    r1 = sum(1 for r in results if _match_at_k(r, 1)) / total
    r3 = sum(1 for r in results if _match_at_k(r, 3)) / total
    r5 = sum(1 for r in results if _match_at_k(r, 5)) / total

    ranks = [_rank_of_expected(r) for r in results]
    recip = [1.0 / r if r > 0 else 0.0 for r in ranks]
    mrr = sum(recip) / total

    for r in results:
        r.matched = _match_at_k(r, max(len(r.recalled_material_ids), 5))
        rank = _rank_of_expected(r)
        if r.expected_material_id:
            if rank == 0:
                r.match_details = "未召回"
            elif rank == 1:
                r.match_details = "完美命中Top1"
            else:
                r.match_details = f"命中第{rank}位"
        else:
            r.match_details = "缺少期望标注"

    outliers: List[str] = []
    if total >= 5:
        scores = []
        for r in results:
            s = r.recalled_scores[0] if r.recalled_scores else 0.0
            scores.append((r.sample_id, s, r.matched))

        if scores:
            mean_s = statistics.mean([s for _, s, _ in scores])
            stdev_s = statistics.pstdev([s for _, s, _ in scores]) if total > 1 else 0.0

            for sid, s, matched in scores:
                if stdev_s > 0.001:
                    z = (s - mean_s) / stdev_s
                    if abs(z) > 2.0 and not matched:
                        outliers.append(sid)
                        for r in results:
                            if r.sample_id == sid:
                                if "outlier" not in r.tags:
                                    r.tags.append("outlier")
                                r.match_details += f" [分数异常Z={z:.2f}]"
                                break

    false_negative_ids = [r.sample_id for r in results if r.expected_material_id and not _match_at_k(r, 5)]
    for fid in false_negative_ids:
        if fid not in outliers:
            outliers.append(fid)

    metrics = {
        "recall_at_1": round(r1, 4),
        "recall_at_3": round(r3, 4),
        "recall_at_5": round(r5, 4),
        "mrr": round(mrr, 4),
        "total_samples": total,
    }
    return metrics, outliers
