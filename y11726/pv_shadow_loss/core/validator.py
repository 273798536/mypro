from __future__ import annotations

import re
from datetime import datetime, timedelta, date
from typing import List, Tuple, Optional
from ..models.schemas import (
    ComponentPosition,
    ShadowPeriod,
    StringTopology,
    HistoricalGeneration,
    WeatherData,
    LossReport,
    ShadowLossRequest,
    ValidationResult,
    CorrectionTrace,
    DataSource,
)


class InputValidator:
    def __init__(self, request: ShadowLossRequest):
        self.request = request
        self.validations: List[ValidationResult] = []
        self.corrections: List[CorrectionTrace] = []

    def validate_all(self) -> Tuple[List[ValidationResult], List[CorrectionTrace]]:
        self._validate_components()
        self._validate_shadow_periods()
        self._validate_string_topology()
        self._validate_historical_generation()
        self._validate_weather_data()
        self._validate_loss_reports()
        self._validate_cross_references()
        return self.validations, self.corrections

    def _add_validation(self, passed: bool, field: str, message: str,
                        severity: str = "info", suggestion: Optional[str] = None):
        self.validations.append(ValidationResult(
            passed=passed, field=field, message=message,
            severity=severity, suggestion=suggestion
        ))

    def _add_correction(self, field: str, original: object, corrected: object,
                        reason: str, corrected_by: str = "auto"):
        self.corrections.append(CorrectionTrace(
            field=field, original_value=original,
            corrected_value=corrected, reason=reason,
            corrected_by=corrected_by
        ))

    def _validate_components(self):
        seen_ids = set()
        for comp in self.request.components:
            if comp.component_id in seen_ids:
                self._add_validation(
                    False, f"components[{comp.component_id}]",
                    f"组件ID重复: {comp.component_id}",
                    "error", "请确保每个组件ID唯一"
                )
            seen_ids.add(comp.component_id)

            if comp.tilt_angle > 60:
                self._add_correction(
                    f"components[{comp.component_id}].tilt_angle",
                    comp.tilt_angle, min(comp.tilt_angle, 60.0),
                    "倾斜角度超过60度，已自动截断", "auto"
                )
                comp.tilt_angle = min(comp.tilt_angle, 60.0)

            if comp.rated_power <= 0:
                self._add_validation(
                    False, f"components[{comp.component_id}].rated_power",
                    f"组件额定功率必须大于0: {comp.rated_power}",
                    "error", "请检查组件额定功率"
                )

            if not self._is_valid_id(comp.string_id):
                self._add_validation(
                    False, f"components[{comp.component_id}].string_id",
                    f"组串ID格式无效: {comp.string_id}",
                    "error", "组串ID应只包含字母、数字、下划线、短横线"
                )

    def _validate_shadow_periods(self):
        for sp in self.request.shadow_periods:
            comp = self._find_component(sp.component_id)
            if not comp:
                self._add_validation(
                    False, f"shadow_periods[{sp.shadow_id}].component_id",
                    f"阴影引用的组件ID不存在: {sp.component_id}",
                    "error", "请检查阴影记录中的组件ID"
                )

            if sp.end_time <= sp.start_time:
                self._add_validation(
                    False, f"shadow_periods[{sp.shadow_id}]",
                    f"阴影结束时间必须晚于开始时间",
                    "error"
                )

            duration_hours = (sp.end_time - sp.start_time).total_seconds() / 3600
            if duration_hours > 16:
                self._add_validation(
                    False, f"shadow_periods[{sp.shadow_id}]",
                    f"阴影持续时间异常({duration_hours:.1f}小时)，可能跨日或数据错误",
                    "warning", "请核实阴影时段是否跨日"
                )

            if sp.intensity < 0.05:
                self._add_validation(
                    True, f"shadow_periods[{sp.shadow_id}].intensity",
                    f"阴影强度极低({sp.intensity})，影响可忽略",
                    "info"
                )

    def _validate_string_topology(self):
        string_ids = set()
        for topo in self.request.string_topology:
            if topo.string_id in string_ids:
                self._add_validation(
                    False, f"string_topology[{topo.string_id}]",
                    f"组串ID重复: {topo.string_id}",
                    "error"
                )
            string_ids.add(topo.string_id)

            for cid in topo.component_ids:
                comp = self._find_component(cid)
                if not comp:
                    self._add_validation(
                        False, f"string_topology[{topo.string_id}]",
                        f"组串引用的组件ID不存在: {cid}",
                        "error", "请检查组串拓扑中的组件ID"
                    )
                elif comp.string_id != topo.string_id:
                    self._add_correction(
                        f"components[{cid}].string_id",
                        comp.string_id, topo.string_id,
                        f"组件{cid}的string_id与组串拓扑不一致，已自动修正",
                        "auto"
                    )
                    comp.string_id = topo.string_id

            if topo.rated_voltage <= 0:
                self._add_validation(
                    False, f"string_topology[{topo.string_id}].rated_voltage",
                    f"组串额定电压必须大于0: {topo.rated_voltage}",
                    "error"
                )

    def _validate_historical_generation(self):
        for hg in self.request.historical_generations:
            comp = self._find_component(hg.component_id)
            if not comp:
                self._add_validation(
                    False, f"historical_generation[{hg.component_id}]",
                    f"历史发电引用的组件ID不存在: {hg.component_id}",
                    "warning"
                )

            if hg.expected_energy > 0 and hg.actual_energy > hg.expected_energy * 2:
                self._add_validation(
                    False, f"historical_generation[{hg.component_id}]",
                    f"实际发电量远超预期({hg.actual_energy} vs {hg.expected_energy})",
                    "warning", "请检查数据是否异常"
                )

            if hg.actual_energy < 0:
                self._add_correction(
                    f"historical_generation[{hg.component_id}].actual_energy",
                    hg.actual_energy, 0.0,
                    "实际发电量为负，已修正为0",
                    "auto"
                )
                hg.actual_energy = 0.0

    def _validate_weather_data(self):
        for wd in self.request.weather_data:
            if wd.solar_irradiance > 1500:
                self._add_correction(
                    f"weather_data[{wd.date}].solar_irradiance",
                    wd.solar_irradiance, min(wd.solar_irradiance, 1500.0),
                    "太阳辐照超过1500W/m²阈值，已自动截断",
                    "auto"
                )
                wd.solar_irradiance = min(wd.solar_irradiance, 1500.0)

            if wd.temperature < -50 or wd.temperature > 60:
                self._add_validation(
                    False, f"weather_data[{wd.date}].temperature",
                    f"温度超出有效范围: {wd.temperature}°C",
                    "warning"
                )

            if wd.wind_speed > 40:
                self._add_correction(
                    f"weather_data[{wd.date}].wind_speed",
                    wd.wind_speed, 40.0,
                    "风速超过40m/s，已自动截断",
                    "auto"
                )
                wd.wind_speed = 40.0

    def _validate_loss_reports(self):
        for lr in self.request.loss_reports:
            comp = self._find_component(lr.component_id)
            if not comp:
                self._add_validation(
                    False, f"loss_reports[{lr.report_id}]",
                    f"损失报告引用的组件ID不存在: {lr.component_id}",
                    "warning"
                )

            if lr.reported_loss_pct > 0.5:
                self._add_validation(
                    True, f"loss_reports[{lr.report_id}]",
                    f"报告损失率较高({lr.reported_loss_pct:.1%})，需重点关注",
                    "info"
                )

    def _validate_cross_references(self):
        comp_ids = {c.component_id for c in self.request.components}
        string_ids = {t.string_id for t in self.request.string_topology}

        for comp in self.request.components:
            if comp.string_id not in string_ids:
                self._add_validation(
                    False, f"components[{comp.component_id}].string_id",
                    f"组件{comp.component_id}所属组串{comp.string_id}在拓扑中未定义",
                    "error", "请在组串拓扑中添加该组串定义"
                )

        for sp in self.request.shadow_periods:
            if sp.component_id not in comp_ids:
                self._add_validation(
                    False, f"shadow_periods[{sp.shadow_id}]",
                    f"阴影引用的组件{sp.component_id}不在组件列表中",
                    "error"
                )

    def _find_component(self, component_id: str) -> Optional[ComponentPosition]:
        for c in self.request.components:
            if c.component_id == component_id:
                return c
        return None

    @staticmethod
    def _is_valid_id(identifier: str) -> bool:
        return bool(re.match(r'^[a-zA-Z0-9_\-]+$', identifier))

    def get_data_quality_score(self) -> float:
        error_count = sum(1 for v in self.validations if v.severity == "error")
        warning_count = sum(1 for v in self.validations if v.severity == "warning")
        total = max(len(self.validations), 1)
        score = 1.0 - (error_count * 0.1 + warning_count * 0.05) / total
        return max(0.0, min(1.0, score))
