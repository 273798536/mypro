"""样本泄漏检测模块"""
from typing import List, Tuple
from .models import RecallResult, LeakInfo, Material
from collections import Counter


def _text_overlap(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    a_set = set(a.lower())
    b_set = set(b.lower())
    inter = a_set & b_set
    union = a_set | b_set
    return len(inter) / len(union) if union else 0.0


def detect_sample_leak(
    results: List[RecallResult],
    materials: dict,
) -> Tuple[LeakInfo, List[str]]:
    """
    检测样本泄漏。返回 (泄漏信息, 警告列表)
    泄漏判定规则（任一触发即疑似）：
    1. query与召回材料内容重合度异常高(>0.9)且排名第一
    2. 同一材料被召回次数占比异常高(>80%)且均为完美匹配
    3. expected_material_id 直接出现在 query 正文中
    """
    leak = LeakInfo()
    warnings: List[str] = []
    suspected: List[str] = []
    reasons: List[str] = []

    first_place_material: Counter = Counter()

    for r in results:
        if r.expected_material_id and r.expected_material_id in r.query:
            suspected.append(r.sample_id)
            reasons.append(f"样本{r.sample_id}: expected_id出现在query中")

        if r.recalled_material_ids:
            top_id = r.recalled_material_ids[0]
            first_place_material[top_id] += 1

            top_mat = materials.get(top_id)
            if top_mat and top_mat.material_content:
                overlap = _text_overlap(r.query, top_mat.material_content)
                if overlap > 0.9 and r.recalled_scores and r.recalled_scores[0] > 0.98:
                    if r.sample_id not in suspected:
                        suspected.append(r.sample_id)
                    reasons.append(f"样本{r.sample_id}: query与top1材料重合度{overlap:.2f}, 分数{r.recalled_scores[0]:.3f}")

    if results:
        for mat_id, cnt in first_place_material.items():
            ratio = cnt / len(results)
            if ratio > 0.8 and len(results) >= 5:
                mat = materials.get(mat_id)
                mat_name = mat.material_name if mat else mat_id
                leak_reason = f"材料[{mat_name}]占据top1比例{ratio:.2%}, 疑似标签泄漏"
                reasons.append(leak_reason)
                for r in results:
                    if r.recalled_material_ids and r.recalled_material_ids[0] == mat_id:
                        if r.sample_id not in suspected:
                            suspected.append(r.sample_id)

    if suspected:
        leak.detected = True
        leak.suspected_samples = suspected
        leak.reasons = reasons
        impact_ratio = len(suspected) / len(results) if results else 0
        leak.impact_scope = f"涉及{len(suspected)}/{len(results)}条样本, 占比{impact_ratio:.2%}"
        warnings.append(f"检测到{len(suspected)}条疑似泄漏样本")

    return leak, warnings
