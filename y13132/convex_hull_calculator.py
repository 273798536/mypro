"""
凸包面积参数试算 - 核心计算模块
负责凸包面积计算，支持权重参数调整
"""

import numpy as np
from scipy.spatial import ConvexHull
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional


@dataclass
class PointData:
    """单个样本点数据"""
    id: str
    x: float
    y: float
    weight: float = 1.0
    is_duplicate: bool = False
    is_dirty: bool = False
    dirty_reason: str = ""
    original_x: Optional[float] = None
    original_y: Optional[float] = None
    note: str = ""
    source: str = ""


@dataclass
class ConvexHullResult:
    """凸包计算结果"""
    area: float
    hull_points: List[Tuple[float, float]]
    hull_indices: List[int]
    all_points: List[PointData]
    used_points: List[PointData]
    excluded_points: List[PointData]
    weights: Dict[str, float]
    exclude_duplicates: bool = True
    exclude_dirty: bool = True
    calculation_trace: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "area": self.area,
            "hull_points": self.hull_points,
            "hull_indices": self.hull_indices,
            "weights": self.weights,
            "exclude_duplicates": self.exclude_duplicates,
            "exclude_dirty": self.exclude_dirty,
            "used_count": len(self.used_points),
            "excluded_count": len(self.excluded_points),
        }


class ConvexHullCalculator:
    """凸包面积计算器"""

    def __init__(self):
        self.calculation_trace: List[str] = []

    def _log(self, message: str):
        """记录计算过程"""
        self.calculation_trace.append(message)

    def apply_weights(self, points: List[PointData], weights: Dict[str, float]) -> List[PointData]:
        """
        应用权重参数到坐标点
        权重用于缩放对应维度的坐标值
        """
        self._log(f"应用权重参数: {weights}")

        weighted_points = []
        for pt in points:
            new_pt = PointData(
                id=pt.id,
                x=pt.x * weights.get("x", 1.0),
                y=pt.y * weights.get("y", 1.0),
                weight=pt.weight,
                is_duplicate=pt.is_duplicate,
                is_dirty=pt.is_dirty,
                dirty_reason=pt.dirty_reason,
                original_x=pt.original_x if pt.original_x is not None else pt.x,
                original_y=pt.original_y if pt.original_y is not None else pt.y,
                note=pt.note,
                source=pt.source,
            )
            weighted_points.append(new_pt)

        self._log(f"权重应用完成，共处理 {len(weighted_points)} 个点")
        return weighted_points

    def compute_convex_hull(
        self,
        points: List[PointData],
        weights: Optional[Dict[str, float]] = None,
        exclude_duplicates: bool = True,
        exclude_dirty: bool = True,
    ) -> ConvexHullResult:
        """
        计算凸包面积

        Args:
            points: 样本点列表
            weights: 权重字典，键为维度名（x, y），值为权重系数
            exclude_duplicates: 是否排除重复样本
            exclude_dirty: 是否排除脏数据

        Returns:
            ConvexHullResult 计算结果
        """
        self.calculation_trace = []
        self._log("=== 凸包面积计算开始 ===")
        self._log(f"输入点总数: {len(points)}")

        if weights is None:
            weights = {"x": 1.0, "y": 1.0}

        # 筛选有效点
        used_points = []
        excluded_points = []

        for pt in points:
            excluded = False
            reasons = []

            # 先检查 NaN（缺失值），这类数据自动排除
            if np.isnan(pt.x) or np.isnan(pt.y):
                excluded = True
                reasons.append("坐标缺失")

            if not excluded:
                if exclude_duplicates and pt.is_duplicate:
                    excluded = True
                    reasons.append("重复样本")

                if exclude_dirty and pt.is_dirty:
                    excluded = True
                    reasons.append(f"脏数据({pt.dirty_reason})")

            if excluded:
                pt_excluded = PointData(**pt.__dict__)
                pt_excluded.note = "; ".join(reasons)
                excluded_points.append(pt_excluded)
            else:
                used_points.append(pt)

        self._log(f"有效参与计算点数: {len(used_points)}")
        self._log(f"排除点数: {len(excluded_points)}")
        if excluded_points:
            for ep in excluded_points:
                self._log(f"  - 排除 {ep.id}: {ep.note}")

        if len(used_points) < 3:
            self._log("错误: 有效点数不足3个，无法计算凸包")
            return ConvexHullResult(
                area=0.0,
                hull_points=[],
                hull_indices=[],
                all_points=points,
                used_points=used_points,
                excluded_points=excluded_points,
                weights=weights,
                exclude_duplicates=exclude_duplicates,
                exclude_dirty=exclude_dirty,
                calculation_trace=self.calculation_trace.copy(),
            )

        # 应用权重
        weighted_points = self.apply_weights(used_points, weights)

        # 提取坐标
        coords = np.array([[p.x, p.y] for p in weighted_points])

        # 计算凸包
        try:
            hull = ConvexHull(coords)
            area = hull.volume
            hull_indices = hull.vertices.tolist()
            hull_points = [(coords[i, 0], coords[i, 1]) for i in hull_indices]

            self._log(f"凸包计算成功，面积: {area:.4f}")
            self._log(f"凸包周长: {hull.area:.4f}")
            self._log(f"凸包顶点数: {len(hull_points)}")
            self._log("凸包顶点索引: " + ", ".join(str(i) for i in hull_indices))

        except Exception as e:
            self._log(f"凸包计算失败: {str(e)}")
            return ConvexHullResult(
                area=0.0,
                hull_points=[],
                hull_indices=[],
                all_points=points,
                used_points=used_points,
                excluded_points=excluded_points,
                weights=weights,
                exclude_duplicates=exclude_duplicates,
                exclude_dirty=exclude_dirty,
                calculation_trace=self.calculation_trace.copy(),
            )

        self._log("=== 凸包面积计算结束 ===")

        return ConvexHullResult(
            area=area,
            hull_points=hull_points,
            hull_indices=hull_indices,
            all_points=points,
            used_points=weighted_points,
            excluded_points=excluded_points,
            weights=weights,
            exclude_duplicates=exclude_duplicates,
            exclude_dirty=exclude_dirty,
            calculation_trace=self.calculation_trace.copy(),
        )

    def batch_try_calculate(
        self,
        points: List[PointData],
        weight_ranges: Dict[str, Tuple[float, float, float]],
        exclude_duplicates: bool = True,
        exclude_dirty: bool = True,
    ) -> List[Tuple[Dict[str, float], float]]:
        """
        批量参数试算
        weight_ranges: 各维度权重范围 (start, end, step)
        """
        self._log("=== 批量参数试算开始 ===")

        results = []
        x_start, x_end, x_step = weight_ranges.get("x", (1.0, 1.0, 1.0))
        y_start, y_end, y_step = weight_ranges.get("y", (1.0, 1.0, 1.0))

        x_weights = np.arange(x_start, x_end + x_step / 2, x_step)
        y_weights = np.arange(y_start, y_end + y_step / 2, y_step)

        self._log(f"X权重范围: {x_start} ~ {x_end}, 步长: {x_step}, 共 {len(x_weights)} 个值")
        self._log(f"Y权重范围: {y_start} ~ {y_end}, 步长: {y_step}, 共 {len(y_weights)} 个值")
        self._log(f"总试算组合数: {len(x_weights) * len(y_weights)}")

        for xw in x_weights:
            for yw in y_weights:
                weights = {"x": round(float(xw), 4), "y": round(float(yw), 4)}
                result = self.compute_convex_hull(
                    points, weights, exclude_duplicates, exclude_dirty
                )
                results.append((weights, result.area))

        self._log("=== 批量参数试算结束 ===")
        return results
