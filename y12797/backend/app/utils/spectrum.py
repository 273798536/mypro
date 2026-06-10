"""谱峰重叠检测工具。"""
from typing import List, Dict, Any


def generate_spectrum_points(retention_time: float, peak_height: float, spread: float = 0.15,
                             points: int = 100) -> List[Dict[str, float]]:
    """生成模拟 HPLC 谱图数据点（高斯分布），用于前端展示。"""
    import math
    data = []
    start = retention_time - spread * 3
    end = retention_time + spread * 3
    step = (end - start) / max(1, points - 1)
    for i in range(points):
        t = start + i * step
        h = peak_height * math.exp(-((t - retention_time) ** 2) / (2 * spread ** 2))
        data.append({"retention_time": round(t, 3), "intensity": round(h, 2)})
    return data


def detect_peak_overlaps(peaks) -> List[Dict[str, Any]]:
    """
    检测峰重叠情况。
    peaks: 具有 retention_time, peak_name, peak_area, peak_height 属性的对象列表
    判断规则：
      - 保留时间差 < 0.1 min：严重重叠(severe)
      - 保留时间差 < 0.3 min：中度重叠(moderate)
      - 保留时间差 < 0.5 min：轻度重叠(mild)
    """
    overlaps = []
    sorted_peaks = sorted(
        [(i, p) for i, p in enumerate(peaks) if p.retention_time is not None],
        key=lambda x: x[1].retention_time,
    )

    for idx in range(len(sorted_peaks)):
        for jdx in range(idx + 1, len(sorted_peaks)):
            i_obj, p = sorted_peaks[idx]
            j_obj, q = sorted_peaks[jdx]
            delta = abs(q.retention_time - p.retention_time)
            if delta >= 0.5:
                break

            if delta < 0.1:
                severity = "severe"
                severity_cn = "严重"
            elif delta < 0.3:
                severity = "moderate"
                severity_cn = "中度"
            else:
                severity = "mild"
                severity_cn = "轻度"

            smaller_area = min(p.peak_area or 0, q.peak_area or 0)
            larger_area = max(p.peak_area or 1, q.peak_area or 1)
            area_ratio = smaller_area / larger_area if larger_area > 0 else 0

            note = (
                f"峰「{p.peak_name or p.id}」(RT={p.retention_time:.2f}min) 与 "
                f"峰「{q.peak_name or q.id}」(RT={q.retention_time:.2f}min) 保留时间差 "
                f"{delta:.2f}min，判定为{severity_cn}重叠，"
                f"较小峰面积占比较大峰的 {area_ratio * 100:.1f}%，"
                f"可能影响底物浓度定量，建议调整色谱条件或采用峰去卷积算法。"
            )

            overlaps.append({
                "peak_a": p.peak_name or f"峰{i_obj + 1}",
                "peak_a_id": getattr(p, "id", None),
                "peak_a_rt": p.retention_time,
                "peak_b": q.peak_name or f"峰{jdx + 1}",
                "peak_b_id": getattr(q, "id", None),
                "peak_b_rt": q.retention_time,
                "delta_rt": round(delta, 4),
                "severity": severity,
                "severity_cn": severity_cn,
                "area_ratio": round(area_ratio, 4),
                "note": note,
            })

    return overlaps
