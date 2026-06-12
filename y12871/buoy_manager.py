"""
浮标数据管理模块
================

容错策略:
  1. 单浮标部分字段缺失 -> 降级计算 (换用要求更少的方法)
  2. 单浮标完全失效 -> 寻找下一个最近的有效浮标
  3. 全部浮标都无某类数据 -> 标记缺口, 继续计算能算的
  4. 计算完成后统一列出缺失项, 供调度员补录
"""

import copy
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from models import BuoyData, Position, CalcFailure, CalculationMethod
from drift_calculator import haversine_distance


class BuoyDataManager:
    """浮标数据管理器, 支持容错查询和缺口统计"""

    def __init__(self, buoys: List[BuoyData]):
        self.buoys = buoys
        self._gap_report: Dict[str, List[str]] = {}
        self._valid_buoys = [b for b in buoys if b.is_valid]

    def get_nearest_valid(self, pos: Position, min_completeness: float = 0.0) -> Optional[BuoyData]:
        """
        获取最近的有效浮标

        参数:
            pos: 参考位置
            min_completeness: 最低完整度要求 (0.0~1.0)

        返回:
            最近的浮标, 没有则返回None
        """
        candidates = [
            b for b in self._valid_buoys
            if b.completeness_score() >= min_completeness
        ]
        if not candidates:
            return None

        return min(candidates, key=lambda b: haversine_distance(pos, b.position))

    def get_nearest_with_fields(self, pos: Position, required_fields: List[str]) -> Optional[BuoyData]:
        """
        找最近的、具有指定字段的浮标

        required_fields 可选值:
          - "wind" (风速+风向)
          - "current" (流速+流向)
          - "wave" (波高)
        """
        for buoy in sorted(self._valid_buoys, key=lambda b: haversine_distance(pos, b.position)):
            has_all = True
            for field in required_fields:
                if field == "wind":
                    if buoy.wind_speed is None or buoy.wind_direction is None:
                        has_all = False
                        break
                elif field == "current":
                    if buoy.current_speed is None or buoy.current_direction is None:
                        has_all = False
                        break
                elif field == "wave":
                    if buoy.wave_height is None:
                        has_all = False
                        break
            if has_all:
                return buoy
        return None

    def get_best_for_method(self, pos: Position, method: CalculationMethod) -> Tuple[Optional[BuoyData], List[str]]:
        """
        为某计算方法找最合适的浮标, 同时返回缺失的字段

        返回: (浮标或None, 缺失字段列表)
        """
        if method == CalculationMethod.LEEWAY:
            buoy = self.get_nearest_with_fields(pos, ["wind"])
            if buoy:
                return buoy, []
            nearest = self.get_nearest_valid(pos)
            missing = []
            if nearest:
                if nearest.wind_speed is None:
                    missing.append("wind_speed")
                if nearest.wind_direction is None:
                    missing.append("wind_direction")
            return nearest, missing

        elif method == CalculationMethod.OCEAN_CURRENT:
            buoy = self.get_nearest_with_fields(pos, ["current", "wind"])
            if buoy:
                return buoy, []
            nearest = self.get_nearest_valid(pos)
            missing = []
            if nearest:
                if nearest.current_speed is None:
                    missing.append("current_speed")
                if nearest.current_direction is None:
                    missing.append("current_direction")
                if nearest.wind_speed is None:
                    missing.append("wind_speed")
                if nearest.wind_direction is None:
                    missing.append("wind_direction")
            return nearest, missing

        elif method == CalculationMethod.COMPREHENSIVE:
            buoy = self.get_nearest_with_fields(pos, ["current", "wind", "wave"])
            if buoy:
                return buoy, []
            buoy2 = self.get_nearest_with_fields(pos, ["current", "wind"])
            if buoy2:
                return buoy2, ["wave_height"]
            nearest = self.get_nearest_valid(pos)
            missing = []
            if nearest:
                if nearest.current_speed is None:
                    missing.append("current_speed")
                if nearest.current_direction is None:
                    missing.append("current_direction")
                if nearest.wind_speed is None:
                    missing.append("wind_speed")
                if nearest.wind_direction is None:
                    missing.append("wind_direction")
                if nearest.wave_height is None:
                    missing.append("wave_height")
            return nearest, missing

        return None, ["unknown_method"]

    def record_gap(self, buoy_id: str, missing_fields: List[str]):
        """记录数据缺口"""
        if buoy_id not in self._gap_report:
            self._gap_report[buoy_id] = []
        for f in missing_fields:
            if f not in self._gap_report[buoy_id]:
                self._gap_report[buoy_id].append(f)

    def get_gap_report(self) -> Dict[str, List[str]]:
        """获取所有数据缺口"""
        return copy.deepcopy(self._gap_report)

    def get_gap_summary(self) -> str:
        """生成人类可读的缺口摘要"""
        if not self._gap_report:
            return "所有浮标数据完整, 无缺口。"

        lines = ["【浮标数据缺口汇总】"]
        for buoy_id, fields in self._gap_report.items():
            field_names = ", ".join(_field_name_cn(f) for f in fields)
            lines.append(f"  - 浮标 {buoy_id}: 缺失 {field_names}")

        lines.append(f"\n共 {len(self._gap_report)} 个浮标存在数据缺口, 请调度员尽快补录。")
        return "\n".join(lines)

    def get_valid_count(self) -> int:
        return len(self._valid_buoys)

    def get_buoy_by_id(self, buoy_id: str) -> Optional[BuoyData]:
        for b in self.buoys:
            if b.buoy_id == buoy_id:
                return b
        return None

    def update_buoy_data(self, buoy_id: str, **kwargs) -> bool:
        """
        补录浮标数据

        支持的参数: wind_speed, wind_direction, current_speed,
                   current_direction, wave_height, is_valid, invalid_reason
        """
        buoy = self.get_buoy_by_id(buoy_id)
        if buoy is None:
            return False

        for key, value in kwargs.items():
            if hasattr(buoy, key):
                setattr(buoy, key, value)

        if buoy_id in self._gap_report:
            remaining = []
            for f in self._gap_report[buoy_id]:
                field_map = {
                    "wind_speed": "wind_speed",
                    "wind_direction": "wind_direction",
                    "current_speed": "current_speed",
                    "current_direction": "current_direction",
                    "wave_height": "wave_height",
                }
                attr = field_map.get(f, f)
                if getattr(buoy, attr, None) is None:
                    remaining.append(f)
            if remaining:
                self._gap_report[buoy_id] = remaining
            else:
                del self._gap_report[buoy_id]

        self._valid_buoys = [b for b in self.buoys if b.is_valid]
        return True


def _field_name_cn(field: str) -> str:
    mapping = {
        "wind_speed": "风速",
        "wind_direction": "风向",
        "current_speed": "流速",
        "current_direction": "流向",
        "wave_height": "波高",
        "all_buoys": "全部浮标",
    }
    return mapping.get(field, field)
