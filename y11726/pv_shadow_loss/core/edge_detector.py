from __future__ import annotations

from datetime import datetime, timedelta, date, time
from typing import List, Dict, Tuple, Optional
from ..models.schemas import (
    ComponentPosition,
    ShadowPeriod,
    StringTopology,
    HistoricalGeneration,
    WeatherData,
    ShadowLossRequest,
    EdgeWarning,
    ShadowType,
)


class EdgeDetector:
    """
    边缘检测器，负责检测三类高风险场景：
    1. 组串映射错误 - 组件与组串拓扑不一致
    2. 跨日阴影 - 阴影时段跨越自然日边界
    3. 天气影响混入 - 天气因素混入阴影损失计算

    所有检测结果以 EdgeWarning 形式返回，不会悄悄影响计算结果。
    """

    def __init__(self, request: ShadowLossRequest):
        self.request = request
        self.warnings: List[EdgeWarning] = []

    def detect_all(self) -> List[EdgeWarning]:
        self._detect_string_mapping_errors()
        self._detect_cross_day_shadows()
        self._detect_weather_mixing()
        self._detect_other_edges()
        return self.warnings

    def _add_warning(self, warning_type: str, message: str,
                     affected_fields: List[str] = None,
                     confidence: float = 1.0,
                     recommendation: str = "",
                     is_blocking: bool = False):
        self.warnings.append(EdgeWarning(
            warning_type=warning_type,
            message=message,
            affected_fields=affected_fields or [],
            confidence=confidence,
            recommendation=recommendation,
            is_blocking=is_blocking,
        ))

    def _detect_string_mapping_errors(self):
        """
        检测组串映射错误：
        - 组件声明的 string_id 与组串拓扑中的 component_ids 不一致
        - 同一个组件出现在多个组串中
        - 组串拓扑中的组件与实际组件列表不一致
        """
        comp_to_string_declared: Dict[str, str] = {}
        comp_to_string_from_topo: Dict[str, str] = {}
        string_to_comps: Dict[str, List[str]] = {}

        for comp in self.request.components:
            comp_to_string_declared[comp.component_id] = comp.string_id

        for topo in self.request.string_topology:
            string_to_comps[topo.string_id] = topo.component_ids
            for cid in topo.component_ids:
                if cid in comp_to_string_from_topo:
                    prev = comp_to_string_from_topo[cid]
                    self._add_warning(
                        "STRING_MAPPING_CONFLICT",
                        f"组件 {cid} 同时出现在组串 {prev} 和 {topo.string_id} 中，拓扑映射冲突",
                        affected_fields=[
                            f"string_topology[{prev}].component_ids",
                            f"string_topology[{topo.string_id}].component_ids",
                        ],
                        confidence=0.99,
                        recommendation=f"请核实组件 {cid} 的正确组串归属，仅保留一个组串引用",
                        is_blocking=True,
                    )
                comp_to_string_from_topo[cid] = topo.string_id

        for cid, declared_string in comp_to_string_declared.items():
            topo_string = comp_to_string_from_topo.get(cid)
            if topo_string and declared_string != topo_string:
                self._add_warning(
                    "STRING_MAPPING_MISMATCH",
                    f"组件 {cid} 声明属于组串 {declared_string}，但组串拓扑 {topo_string} 也引用了它",
                    affected_fields=[
                        f"components[{cid}].string_id",
                        f"string_topology[{topo_string}].component_ids",
                    ],
                    confidence=0.95,
                    recommendation=f"以组串拓扑为准，已标记该映射不一致，需人工确认",
                    is_blocking=False,
                )

        for topo in self.request.string_topology:
            if len(topo.component_ids) < 2:
                self._add_warning(
                    "STRING_COMPONENT_COUNT_LOW",
                    f"组串 {topo.string_id} 仅包含 {len(topo.component_ids)} 个组件，可能存在组件缺失",
                    affected_fields=[f"string_topology[{topo.string_id}].component_ids"],
                    confidence=0.7,
                    recommendation="检查组串是否完整，补充缺失的组件记录",
                    is_blocking=False,
                )

    def _detect_cross_day_shadows(self):
        """
        检测跨日阴影：
        - 阴影开始和结束时间不在同一天
        - 阴影时段跨越午夜
        - 阴影时段覆盖了夜间（无光照时段）
        """
        for sp in self.request.shadow_periods:
            start = sp.start_time
            end = sp.end_time

            if start.date() != end.date():
                self._add_warning(
                    "CROSS_DAY_SHADOW",
                    f"阴影 {sp.shadow_id} 跨日：{start.date()} → {end.date()}，时长 {(end - start).total_seconds() / 3600:.1f}h",
                    affected_fields=[
                        f"shadow_periods[{sp.shadow_id}].start_time",
                        f"shadow_periods[{sp.shadow_id}].end_time",
                    ],
                    confidence=0.99,
                    recommendation="跨日阴影需特别处理：可能是持续性遮挡（如建筑物）或数据录入错误，已标记不纳入常规计算",
                    is_blocking=False,
                )

            midnight = datetime.combine(start.date(), time(0, 0))
            if start.hour < 5 or end.hour > 20:
                self._add_warning(
                    "SHADOW_OUTSIDE_SUNLIGHT",
                    f"阴影 {sp.shadow_id} 时段 {start.strftime('%H:%M')}-{end.strftime('%H:%M')} 覆盖夜间，可能是数据错误",
                    affected_fields=[
                        f"shadow_periods[{sp.shadow_id}].start_time",
                        f"shadow_periods[{sp.shadow_id}].end_time",
                    ],
                    confidence=0.85,
                    recommendation="请核实阴影时段是否正确，夜间不应有发电损失",
                    is_blocking=False,
                )

            duration_hours = (end - start).total_seconds() / 3600
            if duration_hours > 12:
                self._add_warning(
                    "SHADOW_DURATION_TOO_LONG",
                    f"阴影 {sp.shadow_id} 持续 {duration_hours:.1f}h，超过正常范围，需人工核实",
                    affected_fields=[
                        f"shadow_periods[{sp.shadow_id}].start_time",
                        f"shadow_periods[{sp.shadow_id}].end_time",
                    ],
                    confidence=0.8,
                    recommendation="阴影持续超过12小时不太可能是自然阴影，请检查数据源",
                    is_blocking=False,
                )

    def _detect_weather_mixing(self):
        """
        检测天气影响混入阴影损失：
        - 多云天气下的阴影归因不可靠
        - 辐照突变日的阴影损失可能被高估/低估
        - 极端天气（高温/低温）影响组件效率
        """
        for wd in self.request.weather_data:
            if wd.cloud_cover > 0.6:
                self._add_warning(
                    "WEATHER_CLOUD_MIXING",
                    f"{wd.date} 云量 {wd.cloud_cover:.0%} 较高，阴影归因不可靠，可能混入云层遮挡",
                    affected_fields=[f"weather_data[{wd.date}].cloud_cover"],
                    confidence=0.75,
                    recommendation="高云量日建议排除或单独标注，不纳入阴影损失主结果",
                    is_blocking=False,
                )

            if wd.temperature > 40:
                self._add_warning(
                    "WEATHER_TEMP_EFFECT",
                    f"{wd.date} 温度 {wd.temperature}°C，高温影响组件转换效率，可能混入阴影损失估算",
                    affected_fields=[f"weather_data[{wd.date}].temperature"],
                    confidence=0.7,
                    recommendation="高温日建议使用温度修正系数，已自动标记",
                    is_blocking=False,
                )

            if wd.precipitation > 5:
                self._add_warning(
                    "WEATHER_RAIN_EFFECT",
                    f"{wd.date} 降水 {wd.precipitation}mm，雨天组件表面可能有水膜，影响阴影识别",
                    affected_fields=[f"weather_data[{wd.date}].precipitation"],
                    confidence=0.6,
                    recommendation="雨天建议排除阴影分析或标注为低置信度",
                    is_blocking=False,
                )

    def _detect_other_edges(self):
        """
        检测其他边缘情况：
        - 组串内组件功率不一致
        - 阴影强度为0但标记为有阴影
        - 历史数据缺失超过30%
        """
        string_groups: Dict[str, List[ComponentPosition]] = {}
        for comp in self.request.components:
            string_groups.setdefault(comp.string_id, []).append(comp)

        for string_id, comps in string_groups.items():
            if len(comps) >= 2:
                rated_powers = {c.rated_power for c in comps}
                if len(rated_powers) > 1:
                    self._add_warning(
                        "STRING_POWER_MISMATCH",
                        f"组串 {string_id} 内组件额定功率不一致: {rated_powers}",
                        affected_fields=[f"string_topology[{string_id}].component_ids"],
                        confidence=0.9,
                        recommendation="组串内组件功率不一致会导致电流不匹配，建议统一或单独分析",
                        is_blocking=False,
                    )

        for sp in self.request.shadow_periods:
            if sp.intensity == 0:
                self._add_warning(
                    "SHADOW_ZERO_INTENSITY",
                    f"阴影 {sp.shadow_id} 强度为0，标记为有阴影但实际无影响",
                    affected_fields=[f"shadow_periods[{sp.shadow_id}].intensity"],
                    confidence=0.95,
                    recommendation="该阴影记录实际不影响发电，已自动跳过",
                    is_blocking=False,
                )

        total_components = len(self.request.components)
        components_with_history = set(hg.component_id for hg in self.request.historical_generations)
        if total_components > 0:
            coverage = len(components_with_history & set(c.component_id for c in self.request.components))
            coverage_pct = coverage / total_components
            if coverage_pct < 0.5:
                self._add_warning(
                    "HISTORICAL_DATA_LOW_COVERAGE",
                    f"历史发电数据仅覆盖 {coverage_pct:.0%} 的组件，低于50%阈值",
                    affected_fields=["historical_generations"],
                    confidence=0.9,
                    recommendation="历史数据不足会降低阴影归因精度，建议补充数据或使用模型估算",
                    is_blocking=False,
                )

    def is_safe_to_compute(self) -> bool:
        return not any(w.is_blocking for w in self.warnings)

    def get_blocking_warnings(self) -> List[EdgeWarning]:
        return [w for w in self.warnings if w.is_blocking]
