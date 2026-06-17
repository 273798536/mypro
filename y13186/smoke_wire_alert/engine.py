from __future__ import annotations

import ast
import math
import re
from typing import Dict, Any, Optional, Tuple, List

from .models import (
    WindTunnelSmokeAlert,
    ProcessingStatus,
    BlockReason,
)


FIELD_ALIASES = {
    "smoke_density": [
        "烟线浓度", "烟浓度", "烟雾浓度", "smoke_density", "smoke_concentration",
        "wind_tunnel_smoke_density", "风洞烟线浓度", "风洞烟浓度", "烟线密度",
    ],
    "smoke_density_unit": [
        "烟浓度单位", "烟线浓度单位", "smoke_density_unit", "density_unit",
    ],
    "wind_speed": [
        "风速", "wind_speed", "风速值", "风洞风速", "tunnel_wind_speed",
    ],
    "wind_speed_unit": [
        "风速单位", "wind_speed_unit", "speed_unit",
    ],
    "wind_direction": [
        "风向", "风向角", "wind_direction", "风向度数", "方向角",
    ],
    "threshold_high": [
        "高阈值", "阈值上限", "上限阈值", "threshold_high", "upper_threshold",
        "预警高阈值", "报警高阈值",
    ],
    "threshold_low": [
        "低阈值", "阈值下限", "下限阈值", "threshold_low", "lower_threshold",
        "预警低阈值", "报警低阈值",
    ],
    "threshold_unit": [
        "阈值单位", "threshold_unit",
    ],
    "formula": [
        "计算公式", "公式", "formula", "计算式", "预警公式",
    ],
}

UNIT_CONVERSIONS = {
    "density": {
        "mg/m3": 1.0,
        "mg/m^3": 1.0,
        "mg每立方米": 1.0,
        "μg/m3": 0.001,
        "μg/m^3": 0.001,
        "ug/m3": 0.001,
        "g/m3": 1000.0,
        "g/m^3": 1000.0,
    },
    "speed": {
        "m/s": 1.0,
        "m每秒": 1.0,
        "km/h": 1 / 3.6,
        "km每小时": 1 / 3.6,
        "kmph": 1 / 3.6,
        "m/min": 1 / 60.0,
    },
}

CANONICAL_UNITS = {
    "density": "mg/m^3",
    "speed": "m/s",
}


class ProcessingEngine:

    def __init__(self):
        self.field_aliases: Dict[str, List[str]] = FIELD_ALIASES

    def normalize_fields(self, alert: WindTunnelSmokeAlert) -> WindTunnelSmokeAlert:
        raw = alert.raw_fields

        for std_field, aliases in self.field_aliases.items():
            for alias in aliases:
                if alias in raw and raw[alias] is not None and raw[alias] != "":
                    current = getattr(alert, std_field)
                    if current is None or current == "":
                        val = raw[alias]
                        if isinstance(val, str):
                            try:
                                if std_field in [
                                    "smoke_density", "wind_speed", "wind_direction",
                                    "threshold_high", "threshold_low",
                                ]:
                                    val = float(val)
                            except (ValueError, TypeError):
                                pass
                        setattr(alert, std_field, val)
        return alert

    def validate_units(self, alert: WindTunnelSmokeAlert) -> Tuple[bool, Optional[str]]:
        if alert.smoke_density is not None:
            unit = (alert.smoke_density_unit or "").strip()
            if unit and unit not in UNIT_CONVERSIONS["density"]:
                return False, (
                    f"烟浓度单位 '{unit}' 不识别。"
                    f"支持: {', '.join(UNIT_CONVERSIONS['density'].keys())}"
                )
            if unit:
                factor = UNIT_CONVERSIONS["density"][unit]
                alert.smoke_density = alert.smoke_density * factor
                alert.smoke_density_unit = CANONICAL_UNITS["density"]

        if alert.wind_speed is not None:
            unit = (alert.wind_speed_unit or "").strip()
            if unit and unit not in UNIT_CONVERSIONS["speed"]:
                return False, (
                    f"风速单位 '{unit}' 不识别。"
                    f"支持: {', '.join(UNIT_CONVERSIONS['speed'].keys())}"
                )
            if unit:
                factor = UNIT_CONVERSIONS["speed"][unit]
                alert.wind_speed = alert.wind_speed * factor
                alert.wind_speed_unit = CANONICAL_UNITS["speed"]

        if alert.threshold_high is not None or alert.threshold_low is not None:
            unit = (alert.threshold_unit or "").strip()
            if unit and unit not in UNIT_CONVERSIONS["density"]:
                return False, (
                    f"阈值单位 '{unit}' 不识别。"
                    f"支持: {', '.join(UNIT_CONVERSIONS['density'].keys())}"
                )
            if unit:
                factor = UNIT_CONVERSIONS["density"][unit]
                if alert.threshold_high is not None:
                    alert.threshold_high = alert.threshold_high * factor
                if alert.threshold_low is not None:
                    alert.threshold_low = alert.threshold_low * factor
                alert.threshold_unit = CANONICAL_UNITS["density"]

        return True, None

    def check_wind_direction_sign(self, alert: WindTunnelSmokeAlert) -> Tuple[bool, Optional[str]]:
        if alert.wind_direction is None:
            return True, None

        direction = float(alert.wind_direction)

        if not (0 <= direction <= 360):
            if direction < 0:
                alert.wind_direction_sign_correct = False
                corrected = direction + 360
                return False, (
                    f"风向 {direction}° 为负值，符号疑似写反。"
                    f"下一步处理：加360°修正为 {corrected}°，"
                    f"或联系交班人确认是否应为正角度。"
                )
            elif direction > 360:
                alert.wind_direction_sign_correct = False
                corrected = direction % 360
                return False, (
                    f"风向 {direction}° 超出0-360°范围。"
                    f"下一步处理：对360取模修正为 {corrected}°，"
                    f"或联系交班人确认原始测量。"
                )

        alert.wind_direction_sign_correct = True
        return True, None

    def _safe_eval_formula(
        self,
        formula: str,
        variables: Dict[str, float],
    ) -> Tuple[Optional[float], Optional[str]]:
        safe_dict = {
            "abs": abs, "max": max, "min": min, "sqrt": math.sqrt,
            "log": math.log, "log10": math.log10, "exp": math.exp,
            "pow": pow, "sin": math.sin, "cos": math.cos, "tan": math.tan,
            "pi": math.pi, "e": math.e,
        }
        for name, val in variables.items():
            if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
                safe_dict[name] = float(val)

        expr = formula
        expr = expr.replace("（", "(").replace("）", ")")
        expr = expr.replace("，", ",")
        expr = expr.replace("×", "*").replace("÷", "/")
        expr = re.sub(r"(\d)\s*\*\*\s*(\d)", r"\1**\2", expr)

        try:
            tree = ast.parse(expr, mode="eval")
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id not in safe_dict:
                            return None, f"公式调用了不允许的函数 '{node.func.id}'"
                elif isinstance(node, ast.Name):
                    if node.id not in safe_dict:
                        return None, f"公式引用了未知变量 '{node.id}'"
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    return None, "公式中不允许导入语句"

            result = eval(expr, {"__builtins__": {}}, safe_dict)
            if isinstance(result, (int, float)) and not math.isnan(result) and not math.isinf(result):
                return float(result), None
            return None, f"公式计算结果异常: {result}"
        except SyntaxError as e:
            return None, f"公式语法错误: {e}"
        except ZeroDivisionError:
            return None, "公式出现除零错误"
        except OverflowError:
            return None, "公式数值溢出"
        except Exception as e:
            return None, f"公式计算失败: {e}"

    def compute_formula(self, alert: WindTunnelSmokeAlert) -> Tuple[bool, Optional[str]]:
        variables = {}
        if alert.smoke_density is not None:
            variables["smoke_density"] = alert.smoke_density
            variables["D"] = alert.smoke_density
        if alert.wind_speed is not None:
            variables["wind_speed"] = alert.wind_speed
            variables["V"] = alert.wind_speed
        if alert.wind_direction is not None and alert.wind_direction_sign_correct:
            variables["wind_direction"] = alert.wind_direction
            variables["theta"] = alert.wind_direction
            variables["cos_theta"] = math.cos(math.radians(alert.wind_direction))
            variables["sin_theta"] = math.sin(math.radians(alert.wind_direction))

        if not alert.formula:
            if alert.smoke_density is not None:
                alert.formula = "smoke_density"
                alert.formula_result = alert.smoke_density
                return True, None
            return False, "未提供计算公式，且烟浓度缺失，无法默认计算"

        result, err = self._safe_eval_formula(alert.formula, variables)
        if err:
            return False, err
        alert.formula_result = result
        return True, None

    def check_thresholds(self, alert: WindTunnelSmokeAlert) -> Tuple[bool, Optional[str]]:
        if alert.formula_result is None:
            return False, "尚未完成公式计算，无法阈值判断"

        has_high = alert.threshold_high is not None
        has_low = alert.threshold_low is not None

        if not has_high and not has_low:
            return False, (
                "高阈值和低阈值均缺失。"
                "下一步处理：检查设备铭牌 'threshold_high' / 'threshold_low' "
                "字段，或从历史配置中补录。"
            )

        val = alert.formula_result
        is_alert = False
        reasons = []

        if has_high and val > alert.threshold_high:
            is_alert = True
            reasons.append(f"计算值 {val} 超过高阈值 {alert.threshold_high}")

        if has_low and val < alert.threshold_low:
            is_alert = True
            reasons.append(f"计算值 {val} 低于低阈值 {alert.threshold_low}")

        if is_alert:
            alert.status = ProcessingStatus.ALERT
            alert.final_judgment = "触发预警：" + "；".join(reasons)
        else:
            alert.status = ProcessingStatus.NORMAL
            alert.final_judgment = "正常：计算值在阈值范围内"

        return True, None

    def process(self, alert: WindTunnelSmokeAlert) -> WindTunnelSmokeAlert:
        original_status = alert.status
        was_manual = original_status == ProcessingStatus.MANUAL_OVERRIDDEN

        alert.status = ProcessingStatus.PROCESSING
        alert.next_step = None
        alert.block_detail = None
        if alert.block_reason != BlockReason.LATE_ATTACHMENT:
            alert.block_reason = None

        self.normalize_fields(alert)

        unit_ok, unit_err = self.validate_units(alert)
        if not unit_ok:
            if not was_manual:
                alert.status = ProcessingStatus.BLOCKED
                alert.block_reason = BlockReason.UNIT_MISMATCH
                alert.block_detail = unit_err
                alert.next_step = self._next_step_for_block(alert.block_reason, unit_err)
            else:
                alert.next_step = unit_err + "（记录已被人工覆盖，请先确认是否需要解除覆盖）"
            return alert

        dir_ok, dir_err = self.check_wind_direction_sign(alert)
        if not dir_ok:
            alert.next_step = dir_err

        formula_ok, formula_err = self.compute_formula(alert)
        if not formula_ok:
            if not was_manual:
                alert.status = ProcessingStatus.BLOCKED
                alert.block_reason = BlockReason.FORMULA_ERROR
                alert.block_detail = formula_err
                alert.next_step = self._next_step_for_block(alert.block_reason, formula_err)
            else:
                if not alert.next_step:
                    alert.next_step = formula_err + "（记录已被人工覆盖）"
            return alert

        th_ok, th_err = self.check_thresholds(alert)
        if not th_ok:
            if not was_manual:
                if alert.status == ProcessingStatus.PROCESSING:
                    alert.status = ProcessingStatus.BLOCKED
                alert.block_reason = BlockReason.THRESHOLD_MISSING
                alert.block_detail = th_err
                alert.next_step = self._next_step_for_block(alert.block_reason, th_err)
            else:
                if not alert.next_step:
                    alert.next_step = th_err + "（记录已被人工覆盖）"
            return alert

        if was_manual:
            alert.status = ProcessingStatus.MANUAL_OVERRIDDEN

        return alert

    def _next_step_for_block(self, reason: BlockReason, detail: Optional[str]) -> str:
        if reason == BlockReason.FORMULA_ERROR:
            return (
                f"处理步骤：1) 检查公式 '{detail}' 的语法和变量引用；"
                f"2) 确认所需输入字段(烟浓度/风速/风向)齐全；"
                f"3) 修改后使用重跑命令重新处理。"
            )
        elif reason == BlockReason.UNIT_MISMATCH:
            return (
                f"处理步骤：1) 将铭牌中的单位转换为标准单位"
                f"(烟浓度: mg/m^3, 风速: m/s)；"
                f"2) 或在 raw_fields 中补充 *_unit 字段使用支持的单位名称；"
                f"3) 重跑处理。"
            )
        elif reason == BlockReason.THRESHOLD_MISSING:
            return (
                f"处理步骤：1) 从设备铭牌或配置文件中补录 threshold_high "
                f"和/或 threshold_low；2) 确认阈值单位与计算结果单位一致；"
                f"3) 重跑处理。"
            )
        elif reason == BlockReason.LATE_ATTACHMENT:
            return (
                f"处理步骤：1) 检查晚到附件的到达时间与本条记录的时间窗口；"
                f"2) 使用重跑命令(携带附件)重新处理以合并晚到数据；"
                f"3) 核对跳变归因是否正确。"
            )
        return detail or "查看 block_detail 后修正并重跑。"

