import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import warnings

from .data_loader import LoadedDataset
from .unit_validation import UnitReport, UnitCategory


class IntegrationMethod(Enum):
    TRAPEZOIDAL = "trapezoidal"
    SIMPSONS = "simpsons"
    LEFT_RIEMANN = "left_riemann"
    RIGHT_RIEMANN = "right_riemann"


METHOD_NAMES = {
    IntegrationMethod.TRAPEZOIDAL: "梯形法",
    IntegrationMethod.SIMPSONS: "辛普森法",
    IntegrationMethod.LEFT_RIEMANN: "左矩形法",
    IntegrationMethod.RIGHT_RIEMANN: "右矩形法",
}

METHOD_DESCRIPTIONS = {
    IntegrationMethod.TRAPEZOIDAL: "用相邻两点的平均值乘以时间间隔，适用于大多数情况，精度中等",
    IntegrationMethod.SIMPSONS: "用二次曲线拟合三个点，精度更高，但要求等间隔采样且数据点为奇数",
    IntegrationMethod.LEFT_RIEMANN: "用区间左端点的值乘以时间间隔，计算最简单，可能低估",
    IntegrationMethod.RIGHT_RIEMANN: "用区间右端点的值乘以时间间隔，计算最简单，可能高估",
}


@dataclass
class IntegrationStepDetail:
    time_start: pd.Timestamp
    time_end: pd.Timestamp
    time_interval_hours: float
    power_start: float
    power_end: float
    method: IntegrationMethod
    energy_contribution: float
    formula: str
    calculation: str


@dataclass
class ColumnIntegrationResult:
    column: str
    original_unit: str
    final_unit: str
    total_energy: float
    method: IntegrationMethod
    steps: List[IntegrationStepDetail] = field(default_factory=list)
    group_results: Dict[str, float] = field(default_factory=dict)
    group_details: Dict[str, List[IntegrationStepDetail]] = field(default_factory=dict)
    calculation_notes: List[str] = field(default_factory=list)


@dataclass
class IntegrationReport:
    results: Dict[str, ColumnIntegrationResult] = field(default_factory=dict)
    total_energy_all_columns: float = 0.0
    time_span: Optional[Tuple[pd.Timestamp, pd.Timestamp]] = None
    total_duration_hours: float = 0.0
    method_used: IntegrationMethod = IntegrationMethod.TRAPEZOIDAL
    group_by: Optional[str] = None


def trapezoidal_step(P_start: float, P_end: float, dt_hours: float) -> Tuple[float, str, str]:
    energy = (P_start + P_end) / 2 * dt_hours
    formula = "E = (P₁ + P₂) / 2 × Δt"
    calculation = f"({P_start:.4f} + {P_end:.4f}) / 2 × {dt_hours:.6f} = {energy:.6f}"
    return energy, formula, calculation


def simpsons_step(P_prev: float, P_curr: float, P_next: float, dt_hours: float) -> Tuple[float, str, str]:
    energy = (P_prev + 4 * P_curr + P_next) / 6 * (2 * dt_hours)
    formula = "E = (P₁ + 4P₂ + P₃) / 6 × 2Δt"
    calculation = f"({P_prev:.4f} + 4×{P_curr:.4f} + {P_next:.4f}) / 6 × {2*dt_hours:.6f} = {energy:.6f}"
    return energy, formula, calculation


def left_riemann_step(P_start: float, dt_hours: float) -> Tuple[float, str, str]:
    energy = P_start * dt_hours
    formula = "E = P₁ × Δt"
    calculation = f"{P_start:.4f} × {dt_hours:.6f} = {energy:.6f}"
    return energy, formula, calculation


def right_riemann_step(P_end: float, dt_hours: float) -> Tuple[float, str, str]:
    energy = P_end * dt_hours
    formula = "E = P₂ × Δt"
    calculation = f"{P_end:.4f} × {dt_hours:.6f} = {energy:.6f}"
    return energy, formula, calculation


def compute_time_intervals(df: pd.DataFrame, time_col: str) -> np.ndarray:
    times = df[time_col].values
    intervals = np.diff(times).astype('timedelta64[ns]').astype(float) / 36e11
    return intervals


def integrate_column(df: pd.DataFrame,
                     time_col: str,
                     value_col: str,
                     method: IntegrationMethod,
                     group_by: Optional[str] = None) -> ColumnIntegrationResult:
    df_sorted = df.sort_values(time_col).copy()
    times = df_sorted[time_col].values
    values = df_sorted[value_col].values
    intervals = compute_time_intervals(df_sorted, time_col)

    result = ColumnIntegrationResult(
        column=value_col,
        original_unit='kW',
        final_unit='kWh',
        total_energy=0.0,
        method=method,
    )

    if len(times) < 2:
        result.calculation_notes.append("数据点不足2个，无法进行积分")
        return result

    result.time_span_start = times[0]
    result.time_span_end = times[-1]

    if group_by:
        df_sorted['_group'] = df_sorted[time_col].dt.to_period(group_by)
        groups = df_sorted['_group'].unique()
    else:
        df_sorted['_group'] = 'total'
        groups = ['total']

    for group in groups:
        group_mask = df_sorted['_group'] == group
        group_df = df_sorted[group_mask].copy()

        if len(group_df) < 2:
            result.group_results[str(group)] = 0.0
            continue

        g_times = group_df[time_col].values
        g_values = group_df[value_col].values
        g_intervals = compute_time_intervals(group_df, time_col)

        group_energy = 0.0
        group_steps = []

        if method == IntegrationMethod.TRAPEZOIDAL:
            for i in range(len(g_times) - 1):
                dt = g_intervals[i]
                if np.isnan(dt) or dt <= 0:
                    continue
                energy, formula, calc = trapezoidal_step(g_values[i], g_values[i+1], dt)
                if not np.isnan(energy):
                    group_energy += energy
                    group_steps.append(IntegrationStepDetail(
                        time_start=g_times[i],
                        time_end=g_times[i+1],
                        time_interval_hours=dt,
                        power_start=g_values[i],
                        power_end=g_values[i+1],
                        method=method,
                        energy_contribution=energy,
                        formula=formula,
                        calculation=calc,
                    ))

        elif method == IntegrationMethod.LEFT_RIEMANN:
            for i in range(len(g_times) - 1):
                dt = g_intervals[i]
                if np.isnan(dt) or dt <= 0:
                    continue
                energy, formula, calc = left_riemann_step(g_values[i], dt)
                if not np.isnan(energy):
                    group_energy += energy
                    group_steps.append(IntegrationStepDetail(
                        time_start=g_times[i],
                        time_end=g_times[i+1],
                        time_interval_hours=dt,
                        power_start=g_values[i],
                        power_end=g_values[i+1],
                        method=method,
                        energy_contribution=energy,
                        formula=formula,
                        calculation=calc,
                    ))

        elif method == IntegrationMethod.RIGHT_RIEMANN:
            for i in range(len(g_times) - 1):
                dt = g_intervals[i]
                if np.isnan(dt) or dt <= 0:
                    continue
                energy, formula, calc = right_riemann_step(g_values[i+1], dt)
                if not np.isnan(energy):
                    group_energy += energy
                    group_steps.append(IntegrationStepDetail(
                        time_start=g_times[i],
                        time_end=g_times[i+1],
                        time_interval_hours=dt,
                        power_start=g_values[i],
                        power_end=g_values[i+1],
                        method=method,
                        energy_contribution=energy,
                        formula=formula,
                        calculation=calc,
                    ))

        elif method == IntegrationMethod.SIMPSONS:
            if len(g_times) % 2 == 0:
                result.calculation_notes.append(
                    f"分组 {group}: 数据点数为偶数({len(g_times)})，辛普森法要求奇数个点，"
                    f"最后一个区间改用梯形法"
                )
                n_points = len(g_times) - 1
            else:
                n_points = len(g_times)

            if len(np.unique(g_intervals[:n_points-1])) > 1:
                warnings.warn("辛普森法要求等间隔采样，检测到采样间隔不一致")
                result.calculation_notes.append(
                    f"分组 {group}: 检测到采样间隔不一致，辛普森法精度可能受影响"
                )

            for i in range(0, n_points - 1, 2):
                dt = g_intervals[i]
                if np.isnan(dt) or dt <= 0:
                    continue
                energy, formula, calc = simpsons_step(
                    g_values[i], g_values[i+1], g_values[i+2], dt
                )
                if not np.isnan(energy):
                    group_energy += energy
                    group_steps.append(IntegrationStepDetail(
                        time_start=g_times[i],
                        time_end=g_times[i+2],
                        time_interval_hours=2 * dt,
                        power_start=g_values[i],
                        power_end=g_values[i+2],
                        method=method,
                        energy_contribution=energy,
                        formula=formula,
                        calculation=calc,
                    ))

            if len(g_times) % 2 == 0 and len(g_times) >= 2:
                i = len(g_times) - 2
                dt = g_intervals[i]
                if not np.isnan(dt) and dt > 0:
                    energy, formula, calc = trapezoidal_step(g_values[i], g_values[i+1], dt)
                    if not np.isnan(energy):
                        group_energy += energy
                        group_steps.append(IntegrationStepDetail(
                            time_start=g_times[i],
                            time_end=g_times[i+1],
                            time_interval_hours=dt,
                            power_start=g_values[i],
                            power_end=g_values[i+1],
                            method=IntegrationMethod.TRAPEZOIDAL,
                            energy_contribution=energy,
                            formula=f"[梯形法补全] {formula}",
                            calculation=calc,
                        ))

        result.group_results[str(group)] = round(group_energy, 4)
        result.group_details[str(group)] = group_steps
        result.steps.extend(group_steps)
        result.total_energy += group_energy

    result.total_energy = round(result.total_energy, 4)
    return result


def run_integration(dataset: LoadedDataset,
                    unit_report: UnitReport,
                    method: IntegrationMethod = IntegrationMethod.TRAPEZOIDAL,
                    group_by: Optional[str] = None) -> IntegrationReport:
    df = dataset.processed_df.copy()
    time_col = dataset.time_column

    report = IntegrationReport(
        method_used=method,
        group_by=group_by,
    )

    if len(df) >= 2:
        df_sorted = df.sort_values(time_col)
        report.time_span = (df_sorted[time_col].iloc[0], df_sorted[time_col].iloc[-1])
        duration = report.time_span[1] - report.time_span[0]
        report.total_duration_hours = duration.total_seconds() / 3600

    for col in dataset.reading_columns:
        unit_result = unit_report.results.get(col)
        if unit_result and unit_result.category == UnitCategory.POWER:
            col_result = integrate_column(df, time_col, col, method, group_by)
            col_result.original_unit = unit_result.original_unit
            col_result.final_unit = unit_report.target_energy_unit
            report.results[col] = col_result
            report.total_energy_all_columns += col_result.total_energy
        elif unit_result and unit_result.category == UnitCategory.ENERGY:
            energy_result = ColumnIntegrationResult(
                column=col,
                original_unit=unit_result.original_unit,
                final_unit=unit_result.standardized_unit,
                total_energy=round(df[col].sum(), 4),
                method=method,
                calculation_notes=[
                    "此列为能量读数，直接累加（假设为增量数据）",
                    f"累加公式: 总能量 = Σ 每个读数",
                    f"计算: Σ {col} = {round(df[col].sum(), 4)} {unit_result.standardized_unit}"
                ],
            )
            if group_by:
                df_grouped = df.groupby(df[time_col].dt.to_period(group_by))[col].sum()
                energy_result.group_results = {str(k): round(v, 4) for k, v in df_grouped.items()}
            report.results[col] = energy_result
            report.total_energy_all_columns += energy_result.total_energy

    report.total_energy_all_columns = round(report.total_energy_all_columns, 4)
    return report
