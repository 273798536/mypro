import math
from typing import List, Tuple, Dict, Any, Optional


Point = Tuple[float, float]


def cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def polar_angle(origin: Point, p: Point) -> float:
    return math.atan2(p[1] - origin[1], p[0] - origin[0])


UNIT_FACTORS = {
    ("px", "px"): 1.0,
    ("px", "mm"): 0.264583,
    ("mm", "px"): 3.779528,
    ("mm", "mm"): 1.0,
    ("px", "cm"): 0.0264583,
    ("cm", "px"): 37.79528,
    ("mm", "cm"): 0.1,
    ("cm", "mm"): 10.0,
}


def convert_area(value: float, from_unit: str, to_unit: str) -> Tuple[float, float]:
    if from_unit == to_unit:
        return value, 1.0
    key = (from_unit, to_unit)
    if key not in UNIT_FACTORS:
        raise ValueError(f"不支持的单位换算: {from_unit} -> {to_unit}")
    linear = UNIT_FACTORS[key]
    area_factor = linear ** 2
    return value * area_factor, area_factor


class HullResult:
    def __init__(self):
        self.hull: List[Point] = []
        self.area: float = 0.0
        self.area_unit: str = "px"
        self.area_converted: Optional[float] = None
        self.converted_unit: Optional[str] = None
        self.conversion_factor: Optional[float] = None
        self.sorted_points: List[Point] = []
        self.intermediate_steps: List[Dict[str, Any]] = []
        self.sort_order: List[int] = []
        self.collinear_groups: List[List[int]] = []
        self.failures: List[Dict[str, Any]] = []
        self.parameters: Dict[str, Any] = {}
        self.draft_notes: List[Dict[str, Any]] = []


def compute_convex_hull(
    points: List[Point],
    input_unit: str = "px",
    output_unit: str = "px",
    collinear_threshold: float = 1e-9,
) -> HullResult:
    result = HullResult()
    result.parameters = {
        "input_unit": input_unit,
        "output_unit": output_unit,
        "collinear_threshold": collinear_threshold,
        "point_count": len(points),
    }

    if len(points) < 3:
        result.failures.append({
            "reason": "点数不足",
            "detail": f"需要至少3个点，实际{len(points)}个",
        })
        result.area = 0.0
        return result

    indexed = list(enumerate(points))
    start_idx = min(indexed, key=lambda ip: (ip[1][1], ip[1][0]))[0]
    start = points[start_idx]

    angles = []
    for i, p in enumerate(points):
        if i == start_idx:
            angles.append((i, 0.0, math.hypot(p[0] - start[0], p[1] - start[1])))
        else:
            a = polar_angle(start, p)
            d = math.hypot(p[0] - start[0], p[1] - start[1])
            angles.append((i, a, d))

    angles.sort(key=lambda x: (x[1], x[2]))
    result.sort_order = [a[0] for a in angles]

    collinear_groups = []
    i = 0
    while i < len(angles):
        group = [angles[i][0]]
        j = i + 1
        while j < len(angles) and abs(angles[j][1] - angles[i][1]) < collinear_threshold:
            group.append(angles[j][0])
            j += 1
        if len(group) > 1:
            collinear_groups.append(group)
        i = j

    result.collinear_groups = collinear_groups
    result.sorted_points = [points[idx] for idx in result.sort_order]

    for gi, group in enumerate(collinear_groups):
        result.intermediate_steps.append({
            "step": "collinear_detection",
            "group_index": gi,
            "point_indices": group,
            "angle": angles[[a[0] for a in angles].index(group[0])][1],
            "count": len(group),
        })

    sorted_pts = [points[idx] for idx in result.sort_order]

    stack: List[Point] = []
    stack_indices: List[int] = []
    for idx in result.sort_order:
        p = points[idx]
        while len(stack) >= 2:
            c = cross(stack[-2], stack[-1], p)
            result.intermediate_steps.append({
                "step": "cross_product",
                "check_points": [stack[-2], stack[-1], p],
                "check_indices": [stack_indices[-2], stack_indices[-1], idx],
                "cross_value": c,
                "decision": "pop" if c <= 0 else "keep",
            })
            if c <= 0:
                stack.pop()
                stack_indices.pop()
            else:
                break
        stack.append(p)
        stack_indices.append(idx)

    if len(stack) < 3:
        result.failures.append({
            "reason": "凸包退化",
            "detail": f"凸包顶点不足3个，实际{len(stack)}个，点可能共线",
        })
        result.hull = stack
        result.area = 0.0
        return result

    result.hull = stack

    n = len(stack)
    area = 0.0
    area_steps = []
    for i in range(n):
        j = (i + 1) % n
        xi, yi = stack[i]
        xj, yj = stack[j]
        term = xi * yj - xj * yi
        area += term
        area_steps.append({
            "i": i,
            "j": j,
            "xi": xi, "yi": yi,
            "xj": xj, "yj": yj,
            "term": term,
            "running_sum": area,
        })

    area = abs(area) / 2.0
    result.intermediate_steps.append({
        "step": "area_computation",
        "formula": "Shoelace",
        "terms": area_steps,
        "raw_abs_sum": abs(sum(t["term"] for t in area_steps)),
        "final_area": area,
        "unit": input_unit,
    })

    result.area = area
    result.area_unit = input_unit

    if input_unit != output_unit:
        converted, factor = convert_area(area, input_unit, output_unit)
        result.area_converted = converted
        result.converted_unit = output_unit
        result.conversion_factor = factor
        result.intermediate_steps.append({
            "step": "unit_conversion",
            "from_unit": input_unit,
            "to_unit": output_unit,
            "linear_factor": UNIT_FACTORS[(input_unit, output_unit)],
            "area_factor": factor,
            "original_area": area,
            "converted_area": converted,
        })

    return result
