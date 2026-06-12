"""
凸包面积批量验算工具
====================
- 支持分批追加数据，补交材料不会无声覆盖早先判断
- 排序不稳定时给出人工确认指引
- 结果跳变时归因到阈值/单位/正常记录
- 坏数据隔离并溯源到原始行号
- 自带一组"不太干净"的演示数据
"""

from __future__ import annotations

import math
import hashlib
import json
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple


# ============================================================
# 数据模型
# ============================================================

@dataclass
class Point:
    x: float
    y: float
    source_row: int = -1
    source_id: str = ""
    tag: str = ""

    def __repr__(self):
        sid = f" id={self.source_id}" if self.source_id else ""
        return f"Point({self.x}, {self.y}, row={self.source_row}{sid})"

    def identity_key(self):
        return (self.source_row, self.source_id)


@dataclass
class BadDataRecord:
    point: Point
    reason: str


@dataclass
class BatchRecord:
    batch_id: str
    points: List[Point]
    submitted_at: str = ""
    note: str = ""


@dataclass
class VerificationResult:
    group_key: str
    area: float
    expected_area: Optional[float]
    tolerance: float
    hull_points: List[Point]
    is_pass: bool
    bad_data: List[BadDataRecord]
    sort_unstable: bool
    sort_unstable_detail: str
    normal_record_impact: str
    jump_info: Optional[Dict]


# ============================================================
# 凸包 & 面积
# ============================================================

def cross(o: Point, a: Point, b: Point) -> float:
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)


def _andrew_hull(points: List[Point], sort_key) -> List[Point]:
    if len(points) <= 1:
        return list(points)
    pts = sorted(points, key=sort_key)
    lower: List[Point] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper: List[Point] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def convex_hull(points: List[Point]) -> List[Point]:
    return _andrew_hull(points, sort_key=lambda p: (p.x, p.y))


def convex_hull_y_flipped(points: List[Point]) -> List[Point]:
    return _andrew_hull(points, sort_key=lambda p: (p.x, -p.y))


def polygon_area(vertices: List[Point]) -> float:
    n = len(vertices)
    if n < 3:
        return 0.0
    s = 0.0
    for i in range(n):
        j = (i + 1) % n
        s += vertices[i].x * vertices[j].y
        s -= vertices[j].x * vertices[i].y
    return abs(s) / 2.0


# ============================================================
# 坏数据检测（迭代式：先移除最严重的离群点，再重新计算均值/标准差）
# ============================================================

def _z_score_outliers(points: List[Point], threshold: float = 4.0) -> List[BadDataRecord]:
    records: List[BadDataRecord] = []
    clean = list(points)
    changed = True
    while changed:
        changed = False
        if len(clean) < 3:
            break
        xs = [p.x for p in clean]
        ys = [p.y for p in clean]
        mean_x = sum(xs) / len(xs)
        mean_y = sum(ys) / len(ys)
        std_x = (sum((v - mean_x) ** 2 for v in xs) / len(xs)) ** 0.5 or 1.0
        std_y = (sum((v - mean_y) ** 2 for v in ys) / len(ys)) ** 0.5 or 1.0
        worst: Optional[Point] = None
        worst_score = 0.0
        worst_reason = ""
        for p in clean:
            if math.isnan(p.x) or math.isnan(p.y) or math.isinf(p.x) or math.isinf(p.y):
                records.append(BadDataRecord(p, "坐标含 NaN/Inf"))
                clean.remove(p)
                changed = True
                break
            z_x = abs(p.x - mean_x) / std_x
            z_y = abs(p.y - mean_y) / std_y
            score = max(z_x, z_y)
            if score > threshold and score > worst_score:
                worst = p
                worst_score = score
                worst_reason = f"离群点(z_x={z_x:.1f}, z_y={z_y:.1f})"
        else:
            if worst is not None:
                records.append(BadDataRecord(worst, worst_reason))
                clean.remove(worst)
                changed = True
    return records


def _duplicate_coord_outliers(points: List[Point], bad_ids: set) -> List[BadDataRecord]:
    records: List[BadDataRecord] = []
    coord_map: Dict[Tuple[int, int], List[Point]] = {}
    for p in points:
        if p.identity_key() in bad_ids:
            continue
        key = (round(p.x, 8), round(p.y, 8))
        coord_map.setdefault(key, []).append(p)
    for key, pts in coord_map.items():
        if len(pts) > 1:
            pts_sorted = sorted(pts, key=lambda p: p.source_row)
            for p in pts_sorted[1:]:
                records.append(BadDataRecord(
                    p,
                    f"重复坐标({key[0]}, {key[1]})，与row={pts_sorted[0].source_row}重复，"
                    f"疑似重复录入"
                ))
    return records


def detect_bad_points(points: List[Point]) -> List[BadDataRecord]:
    records: List[BadDataRecord] = []
    for p in points:
        if math.isnan(p.x) or math.isnan(p.y) or math.isinf(p.x) or math.isinf(p.y):
            records.append(BadDataRecord(p, "坐标含 NaN/Inf"))

    non_nan = [p for p in points if not (math.isnan(p.x) or math.isnan(p.y) or math.isinf(p.x) or math.isinf(p.y))]
    z_records = _z_score_outliers(non_nan)
    records.extend(z_records)

    bad_ids = set(r.point.identity_key() for r in records)
    dup_records = _duplicate_coord_outliers(points, bad_ids)
    records.extend(dup_records)

    return records


# ============================================================
# 排序稳定性检测
# ============================================================

def check_sort_stability(points: List[Point]) -> Tuple[bool, str]:
    if len(points) < 3:
        return False, ""

    hull_normal = convex_hull(points)
    hull_flipped = convex_hull_y_flipped(points)
    area_normal = polygon_area(hull_normal)
    area_flipped = polygon_area(hull_flipped)

    normal_ids = set(p.identity_key() for p in hull_normal)
    flipped_ids = set(p.identity_key() for p in hull_flipped)

    same_x_groups: Dict[float, List[Point]] = {}
    for p in points:
        key = round(p.x, 8)
        same_x_groups.setdefault(key, []).append(p)
    ambiguous_groups = {k: v for k, v in same_x_groups.items() if len(v) > 1}

    has_same_x = len(ambiguous_groups) > 0
    has_hull_diff = normal_ids != flipped_ids
    has_area_diff = abs(area_normal - area_flipped) > 1e-9

    if not has_same_x and not has_hull_diff and not has_area_diff:
        return False, ""

    parts = ["检测到排序不稳定："]

    if has_area_diff:
        parts.append(
            f"  同x坐标下y排序不同导致面积不一致"
            f"(y升序={area_normal:.6f}, y降序={area_flipped:.6f}, "
            f"差异={abs(area_normal - area_flipped):.6f})"
        )
    if has_hull_diff and not has_area_diff:
        only_normal = normal_ids - flipped_ids
        only_flipped = flipped_ids - normal_ids
        parts.append(f"  面积一致({area_normal:.6f})，但凸包顶点集合不同：")
        for key in only_normal:
            pt = next(p for p in hull_normal if p.identity_key() == key)
            parts.append(f"    y升序独有: ({pt.x}, {pt.y}) row={pt.source_row} id={pt.source_id}")
        for key in only_flipped:
            pt = next(p for p in hull_flipped if p.identity_key() == key)
            parts.append(f"    y降序独有: ({pt.x}, {pt.y}) row={pt.source_row} id={pt.source_id}")

    if ambiguous_groups:
        parts.append(f"  同x坐标点共{len(ambiguous_groups)}组：")
        for k, pts in ambiguous_groups.items():
            rows = ", ".join(f"y={p.y}(row={p.source_row})" for p in pts)
            parts.append(f"    x={k}: {rows}")

    parts.append("  → 需人工确认：检查同x坐标点是否为重复录入或测量误差，决定保留哪个")
    return True, "\n".join(parts)


# ============================================================
# 正常记录影响分析
# ============================================================

def analyze_normal_record_impact(
    clean_points: List[Point],
    bad_records: List[BadDataRecord],
    area: float,
    expected_area: Optional[float],
    tolerance: float,
) -> str:
    if not clean_points or len(clean_points) < 3:
        return ""
    if expected_area is None or expected_area <= 0:
        return ""

    base_pass = abs(area - expected_area) / expected_area <= tolerance

    hull_pts = convex_hull(clean_points)
    hull_ids = set(p.identity_key() for p in hull_pts)
    non_hull = [p for p in clean_points if p.identity_key() not in hull_ids]

    impact_parts: List[str] = []

    for p in non_hull:
        remaining = [q for q in clean_points if q.identity_key() != p.identity_key()]
        if len(remaining) < 3:
            continue
        hull_re = convex_hull(remaining)
        area_re = polygon_area(hull_re)
        delta = area - area_re
        pass_re = abs(area_re - expected_area) / expected_area <= tolerance

        tag_info = f"[{p.tag}]" if p.tag else ""
        row_info = f"row={p.source_row}"
        id_info = f"id={p.source_id}" if p.source_id else ""
        label = " ".join(filter(None, [tag_info, row_info, id_info]))

        if base_pass != pass_re:
            impact_parts.append(
                f"  {label}: 该点在凸包内部，移除后面积={area_re:.6f}。"
                f"虽然面积变化仅{delta:+.6f}，但结论从{'通过' if base_pass else '未通过'}"
                f"变为{'通过' if pass_re else '未通过'}。"
                f"原因：该点影响了坏数据检测的均值/标准差，间接改变了哪些点被排除。"
            )
        elif abs(delta) > 1e-9:
            impact_parts.append(
                f"  {label}: 移除后面积={area_re:.6f}(变化={delta:+.6f})，"
                f"结论不变({'通过' if pass_re else '未通过'})，对最终判断无影响"
            )
        else:
            impact_parts.append(
                f"  {label}: 移除后面积不变({area_re:.6f})，对结论无影响"
            )

    for p in hull_pts:
        remaining = [q for q in clean_points if q.identity_key() != p.identity_key()]
        if len(remaining) < 3:
            continue
        hull_re = convex_hull(remaining)
        area_re = polygon_area(hull_re)
        pass_re = abs(area_re - expected_area) / expected_area <= tolerance
        delta = area - area_re

        if base_pass != pass_re:
            tag_info = f"[{p.tag}]" if p.tag else ""
            row_info = f"row={p.source_row}"
            id_info = f"id={p.source_id}" if p.source_id else ""
            label = " ".join(filter(None, [tag_info, row_info, id_info]))
            impact_parts.append(
                f"  {label}: 该点在凸包上，移除后面积={area_re:.6f}(变化={delta:+.6f})。"
                f"结论从{'通过' if base_pass else '未通过'}变为{'通过' if pass_re else '未通过'}。"
                f"→ 该正常记录直接决定了验算结论！需确认该点数据无误。"
            )

    if not impact_parts:
        return ""

    header = "逐条分析每条正常记录对结论的影响："
    return header + "\n" + "\n".join(impact_parts)


# ============================================================
# 跳变归因
# ============================================================

def attribute_jump(
    prev_area: float,
    curr_area: float,
    tolerance: float,
    prev_points: List[Point],
    curr_points: List[Point],
    prev_bad: List[BadDataRecord],
    curr_bad: List[BadDataRecord],
) -> Optional[Dict]:
    if prev_area is None or prev_area == 0:
        return None
    ratio = abs(curr_area - prev_area) / abs(prev_area)
    if ratio <= tolerance:
        return None

    info: Dict = {
        "prev_area": prev_area,
        "curr_area": curr_area,
        "change_ratio": ratio,
        "causes": [],
    }

    if tolerance < 0.01 and ratio > 0.5:
        info["causes"].append(
            f"阈值过严(tolerance={tolerance:.4f})，面积变化{ratio:.2%}即触发跳变"
        )

    prev_xs = [p.x for p in prev_points]
    curr_xs = [p.x for p in curr_points]
    prev_ys = [p.y for p in prev_points]
    curr_ys = [p.y for p in curr_points]
    prev_range_x = max(prev_xs) - min(prev_xs) if prev_xs else 0
    curr_range_x = max(curr_xs) - min(curr_xs) if curr_xs else 0
    prev_range_y = max(prev_ys) - min(prev_ys) if prev_ys else 0
    curr_range_y = max(curr_ys) - min(curr_ys) if curr_ys else 0
    if prev_range_x > 0 and abs(curr_range_x - prev_range_x) / prev_range_x > 0.3:
        info["causes"].append("x坐标范围显著变化，可能存在单位不一致(如度 vs 弧度)")
    if prev_range_y > 0 and abs(curr_range_y - prev_range_y) / prev_range_y > 0.3:
        info["causes"].append("y坐标范围显著变化，可能存在单位不一致(如cm vs m)")

    prev_ids = set(p.identity_key() for p in prev_points)
    curr_ids = set(p.identity_key() for p in curr_points)
    new_ids = curr_ids - prev_ids
    for nid in new_ids:
        p = next(q for q in curr_points if q.identity_key() == nid)
        tag_info = f"[{p.tag}]" if p.tag else ""
        info["causes"].append(
            f"新增点{tag_info} row={p.source_row} ({p.x}, {p.y}) 可能导致凸包扩张或收缩"
        )

    prev_bad_ids = set(b.point.identity_key() for b in prev_bad)
    curr_bad_ids = set(b.point.identity_key() for b in curr_bad)
    newly_excluded = prev_bad_ids - curr_bad_ids
    newly_included = curr_bad_ids - prev_bad_ids
    if newly_excluded:
        for nid in newly_excluded:
            info["causes"].append(
                f"此前被排除的点 {nid} 本次未被排除，坏数据判定发生变化"
            )
    if newly_included:
        for nid in newly_included:
            info["causes"].append(
                f"新增排除的坏数据 {nid}，该点不再参与凸包计算"
            )

    if not info["causes"]:
        info["causes"].append(f"原因待查：面积变化比例={ratio:.2%}，超出容忍度")

    return info


# ============================================================
# 批量验算器
# ============================================================

class ConvexHullBatchVerifier:

    def __init__(self, tolerance: float = 0.05):
        self.tolerance = tolerance
        self.batches: List[BatchRecord] = []
        self.results: List[VerificationResult] = []
        self.group_history: Dict[str, List[VerificationResult]] = {}

    def add_batch(self, batch: BatchRecord) -> None:
        batch_hash = hashlib.md5(
            json.dumps([(p.x, p.y, p.source_row, p.source_id) for p in batch.points]).encode()
        ).hexdigest()[:8]
        existing_ids = {b.batch_id for b in self.batches}
        if batch.batch_id in existing_ids:
            batch.batch_id = f"{batch.batch_id}_dup_{batch_hash}"
        self.batches.append(batch)

    def verify_group(self, group_key: str, expected_area: Optional[float] = None) -> VerificationResult:
        all_points: List[Point] = []
        for b in self.batches:
            all_points.extend(b.points)

        bad_records = detect_bad_points(all_points)
        bad_ids = set(b.point.identity_key() for b in bad_records)
        clean_points = [p for p in all_points if p.identity_key() not in bad_ids]

        sort_unstable, sort_detail = check_sort_stability(clean_points)

        if len(clean_points) < 3:
            area = 0.0
            hull_pts = list(clean_points)
        else:
            hull_pts = convex_hull(clean_points)
            area = polygon_area(hull_pts)

        normal_impact = analyze_normal_record_impact(
            clean_points, bad_records, area, expected_area, self.tolerance
        )

        is_pass = True
        if expected_area is not None and expected_area > 0:
            is_pass = abs(area - expected_area) / expected_area <= self.tolerance

        prev_results = self.group_history.get(group_key, [])
        jump_info = None
        if prev_results:
            prev = prev_results[-1]
            prev_bad_ids = set(b.point.identity_key() for b in prev.bad_data)
            prev_clean_ids = set(p.identity_key() for p in prev.hull_points)
            non_hull_prev = [
                p for p in all_points
                if p.identity_key() not in prev_bad_ids
                and p.identity_key() not in prev_clean_ids
            ]
            prev_clean_pts = list(prev.hull_points) + non_hull_prev
            jump_info = attribute_jump(
                prev.area, area, self.tolerance,
                prev_clean_pts, clean_points,
                prev.bad_data, bad_records,
            )

        result = VerificationResult(
            group_key=group_key,
            area=area,
            expected_area=expected_area,
            tolerance=self.tolerance,
            hull_points=hull_pts,
            is_pass=is_pass,
            bad_data=bad_records,
            sort_unstable=sort_unstable,
            sort_unstable_detail=sort_detail,
            normal_record_impact=normal_impact,
            jump_info=jump_info,
        )

        self.results.append(result)
        self.group_history.setdefault(group_key, []).append(result)
        return result

    def generate_report(self, result: VerificationResult) -> str:
        lines: List[str] = []
        sep = "=" * 64
        lines.append(sep)
        lines.append(f"凸包面积验算报告 | 分组: {result.group_key}")
        lines.append(sep)

        lines.append(f"\n▶ 计算面积: {result.area:.6f}")
        if result.expected_area is not None:
            lines.append(f"  期望面积: {result.expected_area:.6f}")
            lines.append(f"  容忍度:   {result.tolerance:.2%}")
            diff = abs(result.area - result.expected_area) / result.expected_area * 100 if result.expected_area else 0
            status = "✓ 通过" if result.is_pass else f"✗ 未通过(偏差{diff:.2f}%)"
            lines.append(f"  验算结果: {status}")

        lines.append(f"\n▶ 凸包顶点({len(result.hull_points)}个):")
        for i, p in enumerate(result.hull_points):
            tag = f" [{p.tag}]" if p.tag else ""
            sid = f" id={p.source_id}" if p.source_id else ""
            lines.append(f"  {i+1}. ({p.x}, {p.y}) row={p.source_row}{tag}{sid}")

        if result.bad_data:
            lines.append(f"\n▶ 已排除坏数据({len(result.bad_data)}条):")
            for br in result.bad_data:
                p = br.point
                tag = f" [{p.tag}]" if p.tag else ""
                sid = f" id={p.source_id}" if p.source_id else ""
                lines.append(f"  ✗ ({p.x}, {p.y}) row={p.source_row}{tag}{sid}")
                lines.append(f"     原因: {br.reason}")

        if result.sort_unstable:
            lines.append(f"\n▶ ⚠ 排序不稳定:")
            for line in result.sort_unstable_detail.split("\n"):
                lines.append(f"  {line}")
        else:
            lines.append(f"\n▶ 排序稳定性: 正常")

        if result.normal_record_impact:
            lines.append(f"\n▶ 正常记录影响分析:")
            for line in result.normal_record_impact.split("\n"):
                lines.append(f"  {line}")
        else:
            lines.append(f"\n▶ 正常记录影响: 无(所有正常记录对结论无影响)")

        if result.jump_info:
            lines.append(f"\n▶ ⚠ 面积跳变:")
            lines.append(f"  前次面积: {result.jump_info['prev_area']:.6f}")
            lines.append(f"  本次面积: {result.jump_info['curr_area']:.6f}")
            lines.append(f"  变化比例: {result.jump_info['change_ratio']:.2%}")
            lines.append(f"  归因:")
            for cause in result.jump_info["causes"]:
                lines.append(f"    - {cause}")
        else:
            lines.append(f"\n▶ 面积稳定性: 无跳变")

        history = self.group_history.get(result.group_key, [])
        if len(history) > 1:
            lines.append(f"\n▶ 历史记录(共{len(history)}次，补交不覆盖):")
            for i, h in enumerate(history):
                note = " ← 当前" if h is result else ""
                pass_mark = "✓" if h.is_pass else "✗"
                bad_cnt = len(h.bad_data)
                lines.append(
                    f"  {i+1}. 面积={h.area:.6f} {pass_mark} "
                    f"坏数据={bad_cnt}条 "
                    f"排序={'⚠不稳定' if h.sort_unstable else '稳定'}{note}"
                )

        lines.append(sep)
        return "\n".join(lines)


# ============================================================
# 演示数据（故意不太干净）
# ============================================================

def create_demo_data() -> List[BatchRecord]:
    batches: List[BatchRecord] = []

    batches.append(BatchRecord(
        batch_id="学生A-第1次提交",
        note="基础5点，4点构成矩形(面积12)，1点在内部",
        points=[
            Point(0, 0, source_row=1, source_id="A1", tag="正常"),
            Point(4, 0, source_row=2, source_id="A2", tag="正常"),
            Point(4, 3, source_row=3, source_id="A3", tag="正常"),
            Point(0, 3, source_row=4, source_id="A4", tag="正常"),
            Point(2, 1, source_row=5, source_id="A5", tag="正常"),
        ],
    ))

    batches.append(BatchRecord(
        batch_id="学生A-第2次补交",
        note=(
            "补交数据含："
            "同x=4的3个不同y值点(触发排序不稳定)；"
            "1条正常记录(-1,0.1)让凸包左扩、面积超阈值；"
            "2条坏数据(离群点+重复坐标)"
        ),
        points=[
            Point(4, 0, source_row=6, source_id="A6", tag="正常-与A2同坐标"),
            Point(4, 1.2, source_row=7, source_id="A7", tag="正常-同x歧义"),
            Point(4, 2.5, source_row=8, source_id="A8", tag="正常-同x歧义"),
            Point(-1, 0.1, source_row=9, source_id="A9", tag="正常-关键边界点"),
            Point(999, 999, source_row=10, source_id="A10", tag="坏数据-录入错误"),
            Point(4, 0, source_row=11, source_id="A11", tag="坏数据-重复坐标"),
        ],
    ))

    batches.append(BatchRecord(
        batch_id="学生B-完整提交",
        note="三角形面积5000，但期望面积0.5(单位不一致: 平方厘米 vs 平方米)",
        points=[
            Point(0, 0, source_row=12, source_id="B1", tag="正常"),
            Point(100, 0, source_row=13, source_id="B2", tag="正常"),
            Point(0, 100, source_row=14, source_id="B3", tag="正常"),
        ],
    ))

    return batches


# ============================================================
# 主流程
# ============================================================

def main():
    print("╔══════════════════════════════════════════╗")
    print("║  凸包面积批量验算工具 - 演示运行        ║")
    print("╚══════════════════════════════════════════╝\n")

    demo_batches = create_demo_data()
    verifier = ConvexHullBatchVerifier(tolerance=0.05)

    print("━━ 第1批：学生A第1次提交 ━━\n")
    verifier.add_batch(demo_batches[0])
    result1 = verifier.verify_group("学生A", expected_area=12.0)
    print(verifier.generate_report(result1))

    print("\n━━ 第2批：学生A第2次补交（追加，不覆盖） ━━\n")
    verifier.add_batch(demo_batches[1])
    result2 = verifier.verify_group("学生A", expected_area=12.0)
    print(verifier.generate_report(result2))

    print("\n━━ 学生B：期望面积与单位不匹配场景 ━━\n")
    verifier.add_batch(demo_batches[2])
    result3 = verifier.verify_group("学生B", expected_area=0.5)
    print(verifier.generate_report(result3))

    print("\n\n" + "█" * 64)
    print("汇总")
    print("█" * 64)
    for r in verifier.results:
        pass_mark = "✓" if r.is_pass else "✗"
        bad = f" 坏数据×{len(r.bad_data)}" if r.bad_data else ""
        sort = " ⚠排序不稳定" if r.sort_unstable else ""
        jump = " ⚠跳变" if r.jump_info else ""
        normal = " 有正常记录影响" if r.normal_record_impact else ""
        print(f"  {r.group_key} | 面积={r.area:.6f} {pass_mark}{bad}{sort}{jump}{normal}")

    print("\n交接说明：")
    print("  1. 数据模型：Point(x, y, source_row, source_id, tag)")
    print("  2. 核心入口：ConvexHullBatchVerifier.add_batch() → verify_group()")
    print("  3. 坏数据检测：detect_bad_points()，迭代z-score + 重复坐标检测")
    print("  4. 排序稳定性：check_sort_stability()，同x坐标反转y排序对比")
    print("  5. 正常记录影响：analyze_normal_record_impact()，逐条说明对结论的影响")
    print("  6. 跳变归因：attribute_jump()，区分阈值/单位/新增点/坏数据变化")
    print("  7. 分批追加不覆盖：group_history 保留全部历史")


if __name__ == "__main__":
    main()
