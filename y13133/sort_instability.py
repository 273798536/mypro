import math
from typing import List, Tuple, Dict, Any

Point = Tuple[float, float]


class InstabilityRecord:
    def __init__(self):
        self.category: str = ""
        self.point_indices: List[int] = []
        self.points: List[Point] = []
        self.detail: str = ""
        self.metric: float = 0.0
        self.metric_name: str = ""


def detect_sort_instability(
    points: List[Point],
    sort_order: List[int],
    collinear_groups: List[List[int]],
    intermediate_steps: List[Dict[str, Any]],
    angle_threshold: float = 1e-6,
    cross_threshold: float = 1e-9,
) -> Tuple[List[InstabilityRecord], List[InstabilityRecord]]:
    unstable: List[InstabilityRecord] = []
    stable: List[InstabilityRecord] = []

    for gi, group in enumerate(collinear_groups):
        rec = InstabilityRecord()
        rec.category = "collinear_on_hull_edge"
        rec.point_indices = group
        rec.points = [points[i] for i in group]
        rec.detail = (
            f"共线点组 #{gi}: {len(group)}个点极角差在阈值{angle_threshold}内，"
            f"排序顺序取决于距离二级排序，可能因浮点误差翻转"
        )
        rec.metric = angle_threshold
        rec.metric_name = "angle_threshold"
        unstable.append(rec)

    for step in intermediate_steps:
        if step.get("step") != "cross_product":
            continue
        c = step["cross_value"]
        if 0 < abs(c) < cross_threshold:
            rec = InstabilityRecord()
            rec.category = "near_zero_cross_product"
            rec.point_indices = step.get("check_indices", [])
            rec.points = step.get("check_points", [])
            rec.detail = (
                f"叉积值{c:.2e}接近零阈值{cross_threshold}，"
                f"微小坐标变化可能改变凸包顶点取舍判定"
            )
            rec.metric = abs(c)
            rec.metric_name = "abs_cross_product"
            unstable.append(rec)
        elif abs(c) >= cross_threshold:
            rec = InstabilityRecord()
            rec.category = "stable_cross_product"
            rec.point_indices = step.get("check_indices", [])
            rec.points = step.get("check_points", [])
            rec.detail = f"叉积值{c:.2e}，判定稳定"
            rec.metric = abs(c)
            rec.metric_name = "abs_cross_product"
            stable.append(rec)

    seen_duplicates = set()
    for i in range(len(sort_order)):
        for j in range(i + 1, len(sort_order)):
            pi = points[sort_order[i]]
            pj = points[sort_order[j]]
            dist = math.hypot(pi[0] - pj[0], pi[1] - pj[1])
            if dist < angle_threshold and (sort_order[j], sort_order[i]) not in seen_duplicates:
                rec = InstabilityRecord()
                rec.category = "near_duplicate_points"
                rec.point_indices = [sort_order[i], sort_order[j]]
                rec.points = [pi, pj]
                rec.detail = (
                    f"点{sort_order[i]}与点{sort_order[j]}距离{dist:.2e}极近，"
                    f"排序先后可能因浮点精度翻转"
                )
                rec.metric = dist
                rec.metric_name = "point_distance"
                unstable.append(rec)
                seen_duplicates.add((sort_order[i], sort_order[j]))

    return unstable, stable
