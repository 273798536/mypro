import math
import numpy as np
from typing import List, Tuple, Dict, Optional, Any


def box_counting_dimension(points: np.ndarray, box_sizes: Optional[List[float]] = None) -> Dict[str, Any]:
    if points is None or len(points) == 0:
        return {"dimension": None, "log_box_sizes": [], "log_counts": [], "error": "空数据集"}

    if not isinstance(points, np.ndarray):
        points = np.array(points)

    if points.ndim == 1:
        points = points.reshape(-1, 1)

    n_dims = points.shape[1]

    mins = points.min(axis=0)
    maxs = points.max(axis=0)
    ranges = maxs - mins
    ranges[ranges == 0] = 1.0

    normalized = (points - mins) / ranges

    if box_sizes is None:
        max_exp = int(math.log2(min(normalized.shape[0], 1000)))
        box_sizes = [1.0 / (2 ** i) for i in range(1, max(max_exp, 3))]
        if len(box_sizes) < 3:
            box_sizes = [0.5, 0.25, 0.125, 0.0625, 0.03125]

    log_box_sizes = []
    log_counts = []

    for size in box_sizes:
        if size <= 0:
            continue
        n_boxes_per_dim = int(math.ceil(1.0 / size))
        if n_boxes_per_dim == 0:
            continue

        grid_indices = np.floor(normalized / size).astype(int)
        grid_indices = np.clip(grid_indices, 0, n_boxes_per_dim - 1)

        if n_dims == 1:
            unique_boxes = len(set(grid_indices.flatten()))
        elif n_dims == 2:
            unique_boxes = len(set(zip(grid_indices[:, 0], grid_indices[:, 1])))
        elif n_dims == 3:
            unique_boxes = len(set(zip(grid_indices[:, 0], grid_indices[:, 1], grid_indices[:, 2])))
        else:
            unique_boxes = len(set(tuple(row) for row in grid_indices))

        if unique_boxes > 0:
            log_box_sizes.append(math.log(1.0 / size))
            log_counts.append(math.log(unique_boxes))

    if len(log_box_sizes) < 2:
        return {"dimension": None, "log_box_sizes": log_box_sizes, "log_counts": log_counts, "error": "有效数据点不足"}

    x = np.array(log_box_sizes)
    y = np.array(log_counts)

    slope, intercept = np.polyfit(x, y, 1)
    dimension = float(slope)

    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "dimension": round(dimension, 4),
        "log_box_sizes": log_box_sizes,
        "log_counts": log_counts,
        "r_squared": round(r_squared, 4),
        "intercept": round(intercept, 4),
        "n_points": len(points),
        "n_dims": n_dims,
        "box_sizes_used": box_sizes[:len(log_box_sizes)]
    }


def correlation_dimension(points: np.ndarray, scales: Optional[List[float]] = None) -> Dict[str, Any]:
    if points is None or len(points) < 2:
        return {"dimension": None, "error": "数据点不足（至少需要2个）"}

    if not isinstance(points, np.ndarray):
        points = np.array(points)

    if points.ndim == 1:
        points = points.reshape(-1, 1)

    n = len(points)

    distances = []
    for i in range(n):
        for j in range(i + 1, n):
            d = np.linalg.norm(points[i] - points[j])
            if d > 0:
                distances.append(d)

    if not distances:
        return {"dimension": None, "error": "所有点重合，无法计算"}

    distances = np.array(distances)
    d_min, d_max = distances.min(), distances.max()

    if scales is None:
        n_scales = 20
        scales = np.logspace(math.log10(d_min * 1.1), math.log10(d_max * 0.9), n_scales)

    log_scales = []
    log_correlations = []

    for s in scales:
        if s <= d_min or s >= d_max:
            continue
        count = np.sum(distances < s)
        if count > 0:
            correlation = 2.0 * count / (n * (n - 1))
            if correlation > 0 and correlation < 1:
                log_scales.append(math.log(s))
                log_correlations.append(math.log(correlation))

    if len(log_scales) < 2:
        return {"dimension": None, "error": "有效尺度不足"}

    x = np.array(log_scales)
    y = np.array(log_correlations)
    slope, intercept = np.polyfit(x, y, 1)

    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "dimension": round(float(slope), 4),
        "r_squared": round(r_squared, 4),
        "log_scales": log_scales,
        "log_correlations": log_correlations
    }


def information_dimension(points: np.ndarray, box_sizes: Optional[List[float]] = None) -> Dict[str, Any]:
    if points is None or len(points) == 0:
        return {"dimension": None, "error": "空数据集"}

    if not isinstance(points, np.ndarray):
        points = np.array(points)

    if points.ndim == 1:
        points = points.reshape(-1, 1)

    n_dims = points.shape[1]
    n_points = len(points)

    mins = points.min(axis=0)
    maxs = points.max(axis=0)
    ranges = maxs - mins
    ranges[ranges == 0] = 1.0
    normalized = (points - mins) / ranges

    if box_sizes is None:
        box_sizes = [0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625]

    log_eps = []
    log_entropy = []

    for size in box_sizes:
        if size <= 0:
            continue
        n_boxes_per_dim = int(math.ceil(1.0 / size))
        if n_boxes_per_dim == 0:
            continue

        grid_indices = np.floor(normalized / size).astype(int)
        grid_indices = np.clip(grid_indices, 0, n_boxes_per_dim - 1)

        box_counts = {}
        for idx in grid_indices:
            key = tuple(idx)
            box_counts[key] = box_counts.get(key, 0) + 1

        entropy = 0.0
        for count in box_counts.values():
            p = count / n_points
            if p > 0:
                entropy -= p * math.log(p)

        if entropy > 0:
            log_eps.append(math.log(1.0 / size))
            log_entropy.append(math.log(entropy))

    if len(log_eps) < 2:
        return {"dimension": None, "error": "有效数据不足"}

    x = np.array(log_eps)
    y = np.array(log_entropy)
    slope, _ = np.polyfit(x, y, 1)

    return {"dimension": round(float(slope), 4), "log_eps": log_eps, "log_entropy": log_entropy}


def generate_cantor_set(n_levels: int = 6) -> np.ndarray:
    points = [0.0, 1.0]
    for level in range(n_levels):
        new_points = []
        for p in points:
            seg_len = 1.0 / (3 ** (level + 1))
            new_points.append(p)
            new_points.append(p + 2 * seg_len)
        points = sorted(set(new_points))
    return np.array(points).reshape(-1, 1)


def generate_koch_curve(n_levels: int = 4) -> np.ndarray:
    points = np.array([[0.0, 0.0], [1.0, 0.0]])
    for _ in range(n_levels):
        new_points = []
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i + 1]
            dx, dy = p2 - p1
            a = p1
            b = p1 + (dx / 3, dy / 3)
            angle = -math.pi / 3
            rot_dx = (dx / 3) * math.cos(angle) - (dy / 3) * math.sin(angle)
            rot_dy = (dx / 3) * math.sin(angle) + (dy / 3) * math.cos(angle)
            c = b + (rot_dx, rot_dy)
            d = p1 + (2 * dx / 3, 2 * dy / 3)
            new_points.extend([a, b, c, d])
        new_points.append(points[-1])
        points = np.array(new_points)
    return points


def generate_sierpinski_triangle(n_levels: int = 7) -> np.ndarray:
    vertices = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, math.sqrt(3) / 2]])
    points = [vertices[0].copy()]
    for _ in range(2 ** n_levels):
        v = vertices[np.random.randint(0, 3)]
        points.append((points[-1] + v) / 2.0)
    return np.array(points)


def generate_random_points(n: int = 500, dim: int = 2) -> np.ndarray:
    return np.random.rand(n, dim)


def generate_uniform_line(n: int = 500) -> np.ndarray:
    t = np.linspace(0, 1, n)
    return np.column_stack([t, t * 0.5])


def generate_boundary_unstable_sorting(n: int = 300) -> np.ndarray:
    t = np.random.rand(n)
    x = t + np.random.normal(0, 0.001, n)
    y = np.zeros(n)
    for i in range(1, n):
        if x[i] < x[i - 1]:
            y[i] = y[i - 1] + 0.02 * (x[i - 1] - x[i])
    return np.column_stack([x, y])


def generate_duplicate_points_fractal(base_points: np.ndarray, dup_factor: int = 5) -> np.ndarray:
    duplicated = np.repeat(base_points, dup_factor, axis=0)
    noise = np.random.normal(0, 1e-8, duplicated.shape)
    return duplicated + noise


def generate_sparse_boundary(n: int = 50, dense_center: int = 500) -> np.ndarray:
    center = np.random.rand(dense_center, 2) * 0.3 + np.array([0.35, 0.35])
    border_x = np.random.rand(n // 4)
    border_y1 = np.zeros(n // 4)
    border_y2 = np.ones(n // 4)
    border_x2 = np.zeros(n // 4)
    border_x3 = np.ones(n // 4)
    border_y_rest = np.random.rand(n // 2)

    border = np.vstack([
        np.column_stack([border_x, border_y1]),
        np.column_stack([border_x, border_y2]),
        np.column_stack([border_x2, border_y_rest[:n // 4]]),
        np.column_stack([border_x3, border_y_rest[n // 4:]])
    ])
    return np.vstack([center, border])


def compute_all_dimensions(points: np.ndarray, methods: Optional[List[str]] = None) -> Dict[str, Any]:
    if methods is None:
        methods = ["box_counting", "correlation", "information"]

    results = {}
    if "box_counting" in methods:
        results["box_counting"] = box_counting_dimension(points)
    if "correlation" in methods and len(points) >= 2:
        results["correlation"] = correlation_dimension(points)
    if "information" in methods:
        results["information"] = information_dimension(points)
    return results


def compare_before_after(before_points: np.ndarray, after_points: np.ndarray,
                         method: str = "box_counting") -> Dict[str, Any]:
    if method == "box_counting":
        before = box_counting_dimension(before_points)
        after = box_counting_dimension(after_points)
    elif method == "correlation":
        before = correlation_dimension(before_points)
        after = correlation_dimension(after_points)
    else:
        before = information_dimension(before_points)
        after = information_dimension(after_points)

    before_dim = before.get("dimension")
    after_dim = after.get("dimension")
    changed = (before_dim is not None and after_dim is not None and abs(before_dim - after_dim) > 0.05)

    return {
        "before": before,
        "after": after,
        "changed": changed,
        "difference": round(after_dim - before_dim, 4) if (before_dim and after_dim) else None,
        "explanation": f"处理前维数: {before_dim}, 处理后维数: {after_dim}, "
                       + ("结果发生显著变化" if changed else "结果无显著变化")
    }
