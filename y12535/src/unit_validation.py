import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class UnitCategory(Enum):
    POWER = "power"
    ENERGY = "energy"
    TIME = "time"
    UNKNOWN = "unknown"


POWER_UNITS = {
    'W': {'factor': 0.001, 'name': '瓦'},
    'kW': {'factor': 1.0, 'name': '千瓦'},
    'MW': {'factor': 1000.0, 'name': '兆瓦'},
    'GW': {'factor': 1000000.0, 'name': '吉瓦'},
    '瓦': {'factor': 0.001, 'name': '瓦'},
    '千瓦': {'factor': 1.0, 'name': '千瓦'},
    '兆瓦': {'factor': 1000.0, 'name': '兆瓦'},
}

ENERGY_UNITS = {
    'Wh': {'factor': 0.001, 'name': '瓦时'},
    'kWh': {'factor': 1.0, 'name': '千瓦时(度)'},
    'MWh': {'factor': 1000.0, 'name': '兆瓦时'},
    'GWh': {'factor': 1000000.0, 'name': '吉瓦时'},
    '度': {'factor': 1.0, 'name': '千瓦时(度)'},
    '瓦时': {'factor': 0.001, 'name': '瓦时'},
    '千瓦时': {'factor': 1.0, 'name': '千瓦时(度)'},
}

TIME_UNITS = {
    's': {'factor': 1/3600, 'name': '秒'},
    'min': {'factor': 1/60, 'name': '分钟'},
    'h': {'factor': 1.0, 'name': '小时'},
    'hour': {'factor': 1.0, 'name': '小时'},
    'd': {'factor': 24.0, 'name': '天'},
    'day': {'factor': 24.0, 'name': '天'},
    '秒': {'factor': 1/3600, 'name': '秒'},
    '分钟': {'factor': 1/60, 'name': '分钟'},
    '小时': {'factor': 1.0, 'name': '小时'},
    '天': {'factor': 24.0, 'name': '天'},
}


@dataclass
class UnitConversionStep:
    step_description: str
    from_unit: str
    to_unit: str
    conversion_factor: float
    formula: str
    example: str


@dataclass
class UnitValidationResult:
    column: str
    original_unit: str
    standardized_unit: str
    category: UnitCategory
    is_valid: bool
    conversion_steps: List[UnitConversionStep] = field(default_factory=list)
    validation_notes: List[str] = field(default_factory=list)
    value_range: Dict = field(default_factory=dict)


@dataclass
class UnitReport:
    results: Dict[str, UnitValidationResult] = field(default_factory=dict)
    time_unit: str = 'h'
    target_energy_unit: str = 'kWh'
    summary_notes: List[str] = field(default_factory=list)
    overall_valid: bool = True

    def get_conversion_formula(self, column: str) -> str:
        if column not in self.results:
            return ''
        steps = self.results[column].conversion_steps
        return ' → '.join([s.formula for s in steps]) if steps else '无需转换'


def identify_unit_category(unit: str) -> UnitCategory:
    unit_clean = str(unit).strip()
    if unit_clean in POWER_UNITS:
        return UnitCategory.POWER
    if unit_clean in ENERGY_UNITS:
        return UnitCategory.ENERGY
    if unit_clean in TIME_UNITS:
        return UnitCategory.TIME
    return UnitCategory.UNKNOWN


def convert_to_standard(value: float, from_unit: str,
                        unit_dict: Dict, target_unit: str) -> Tuple[float, float]:
    from_info = unit_dict[from_unit]
    to_info = unit_dict[target_unit]
    factor = from_info['factor'] / to_info['factor']
    return value * factor, factor


def build_conversion_steps(column: str, original_unit: str,
                           target_unit: str, category: UnitCategory,
                           sample_value: float) -> List[UnitConversionStep]:
    steps = []
    if original_unit == target_unit:
        return steps

    if category == UnitCategory.POWER:
        unit_dict = POWER_UNITS
        intermediate_unit = 'kW'
    elif category == UnitCategory.ENERGY:
        unit_dict = ENERGY_UNITS
        intermediate_unit = 'kWh'
    else:
        return steps

    if original_unit != intermediate_unit:
        _, factor1 = convert_to_standard(1.0, original_unit, unit_dict, intermediate_unit)
        sample_converted1 = sample_value * factor1
        steps.append(UnitConversionStep(
            step_description=f"转换为标准中间单位{intermediate_unit}",
            from_unit=original_unit,
            to_unit=intermediate_unit,
            conversion_factor=factor1,
            formula=f"{column}({original_unit}) × {factor1:.6f} = {column}({intermediate_unit})",
            example=f"{sample_value:.4f} {original_unit} × {factor1:.6f} = {sample_converted1:.4f} {intermediate_unit}",
        ))

    if intermediate_unit != target_unit:
        _, factor2 = convert_to_standard(1.0, intermediate_unit, unit_dict, target_unit)
        sample_converted2 = sample_converted1 * factor2 if steps else sample_value * factor2
        steps.append(UnitConversionStep(
            step_description=f"转换为目标单位{target_unit}",
            from_unit=intermediate_unit,
            to_unit=target_unit,
            conversion_factor=factor2,
            formula=f"{column}({intermediate_unit}) × {factor2:.6f} = {column}({target_unit})",
            example=f"{(sample_converted1 if steps else sample_value):.4f} {intermediate_unit} × {factor2:.6f} = {sample_converted2:.4f} {target_unit}",
        ))

    return steps


def validate_and_standardize_units(df: pd.DataFrame,
                                   reading_columns: List[str],
                                   unit_info: Dict[str, str],
                                   target_power_unit: str = 'kW',
                                   target_energy_unit: str = 'kWh',
                                   time_column: Optional[str] = None) -> UnitReport:
    report = UnitReport(
        target_energy_unit=target_energy_unit,
        time_unit='h',
    )

    for col in reading_columns:
        original_unit = unit_info.get(col, 'kW')
        category = identify_unit_category(original_unit)
        sample_value = df[col].dropna().iloc[0] if not df[col].dropna().empty else 0.0

        is_valid = category in [UnitCategory.POWER, UnitCategory.ENERGY]
        notes = []
        steps = []

        if category == UnitCategory.UNKNOWN:
            notes.append(f"单位 '{original_unit}' 未识别，默认为功率单位 kW")
            category = UnitCategory.POWER
            original_unit = 'kW'
            is_valid = False
            report.overall_valid = False

        target_unit = target_power_unit if category == UnitCategory.POWER else target_energy_unit

        if original_unit != target_unit:
            if category == UnitCategory.POWER:
                unit_dict = POWER_UNITS
            elif category == UnitCategory.ENERGY:
                unit_dict = ENERGY_UNITS
            else:
                unit_dict = {}

            if original_unit in unit_dict and target_unit in unit_dict:
                steps = build_conversion_steps(col, original_unit, target_unit, category, sample_value)
                from_info = unit_dict[original_unit]
                to_info = unit_dict[target_unit]
                total_factor = from_info['factor'] / to_info['factor']
                df[col] = df[col] * total_factor
                notes.append(f"已将单位从 {original_unit} 转换为 {target_unit}，转换系数: {total_factor:.6f}")
            else:
                notes.append(f"无法从 {original_unit} 转换为 {target_unit}")
                is_valid = False
                report.overall_valid = False

        value_range = {}
        if not df[col].dropna().empty:
            value_range = {
                'min': round(df[col].min(), 4),
                'max': round(df[col].max(), 4),
                'mean': round(df[col].mean(), 4),
            }

        if category == UnitCategory.POWER and value_range:
            if value_range['max'] > 100000:
                notes.append(f"警告: {col} 峰值 {value_range['max']} {target_unit} 异常偏高，请检查单位配置")
            if value_range['min'] < 0:
                notes.append(f"提示: {col} 存在负值 {value_range['min']} {target_unit}，已在数据质量检查中标记")

        report.results[col] = UnitValidationResult(
            column=col,
            original_unit=original_unit,
            standardized_unit=target_unit,
            category=category,
            is_valid=is_valid,
            conversion_steps=steps,
            validation_notes=notes,
            value_range=value_range,
        )

    if time_column:
        time_diffs = df[time_column].diff().dropna()
        if not time_diffs.empty:
            avg_interval_hours = time_diffs.mean().total_seconds() / 3600
            report.summary_notes.append(
                f"时间采样间隔约 {avg_interval_hours * 60:.1f} 分钟 ({avg_interval_hours:.4f} 小时)，"
                f"积分时将使用此间隔将功率转换为能量"
            )
            report.summary_notes.append(
                f"能量计算公式: 能量({target_energy_unit}) = 功率({target_power_unit}) × 时间间隔(小时)"
            )
            report.summary_notes.append(
                f"计算说明: 1 kW 的功率持续 1 小时 = 1 kWh (1度电)，即 E(kWh) = P(kW) × t(h)"
            )

    power_cols = [c for c, r in report.results.items() if r.category == UnitCategory.POWER]
    energy_cols = [c for c, r in report.results.items() if r.category == UnitCategory.ENERGY]

    if power_cols:
        report.summary_notes.append(
            f"检测到 {len(power_cols)} 个功率通道: {', '.join(power_cols)}，将通过数值积分转换为能量"
        )
    if energy_cols:
        report.summary_notes.append(
            f"检测到 {len(energy_cols)} 个能量通道: {', '.join(energy_cols)}，将直接累加（需确认是表底数据还是增量数据）"
        )

    return report
