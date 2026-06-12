import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from src.calculator import MatrixResult


class AnomalySeverity(str, Enum):
    CRITICAL = "严重"
    WARNING = "警告"
    INFO = "提示"


class AnomalyType(str, Enum):
    EMPTY_MATRIX = "空矩阵/空集合"
    SINGULAR_MATRIX = "奇异矩阵(除零边界)"
    NEAR_SINGULAR = "接近奇异(高条件数)"
    DIRTY_DATA = "脏数据(非数值)"
    MISSING_DATA = "数据缺失"
    HISTORY_MISMATCH = "历史答案不符"


@dataclass
class AnomalyRecord:
    anomaly_id: str
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    matrix_id: str
    source_row: int
    description: str
    raw_value: str = ""
    affected_columns: List[str] = field(default_factory=list)
    impact_scope: str = ""
    calculation_context: Dict = field(default_factory=dict)


def detect_empty_collections(df: pd.DataFrame, matrix_prefix: str = "a") -> List[AnomalyRecord]:
    anomalies = []
    matrix_cols = [c for c in df.columns if str(c).startswith(matrix_prefix)]

    for idx, row in df.iterrows():
        row_id = str(row.get("id", f"row_{idx}"))
        source_row = int(idx) + 2

        values = [row[c] for c in matrix_cols if c in row.index]
        all_empty = all(pd.isna(v) or str(v).strip() == "" for v in values)

        if all_empty and len(matrix_cols) > 0:
            anomalies.append(AnomalyRecord(
                anomaly_id=f"empty_{idx}",
                anomaly_type=AnomalyType.EMPTY_MATRIX,
                severity=AnomalySeverity.CRITICAL,
                matrix_id=row_id,
                source_row=source_row,
                description="整行矩阵数据为空，被当作正常输入处理",
                raw_value="",
                affected_columns=matrix_cols,
                impact_scope="该行条件数无法计算，可能导致统计遗漏",
                calculation_context={"empty_cells": len(values)}
            ))

    return anomalies


def detect_singular_boundary(results: List[MatrixResult], near_threshold: float = 1e10) -> List[AnomalyRecord]:
    anomalies = []

    for r in results:
        if r.is_singular and r.singular_values is not None and len(r.singular_values) > 0:
            s_min = r.singular_values[-1]
            s_max = r.singular_values[0]
            anomalies.append(AnomalyRecord(
                anomaly_id=f"singular_{r.row_index}",
                anomaly_type=AnomalyType.SINGULAR_MATRIX,
                severity=AnomalySeverity.CRITICAL,
                matrix_id=r.matrix_id,
                source_row=r.source_row,
                description=f"矩阵奇异，最小奇异值={s_min:.2e}，最大奇异值={s_max:.2e}，除零边界",
                raw_value=f"cond=inf, s_min={s_min:.2e}",
                affected_columns=["条件数计算"],
                impact_scope="条件数为无穷大，逆矩阵不存在，影响所有依赖逆矩阵的计算",
                calculation_context={
                    "s_min": float(s_min),
                    "s_max": float(s_max),
                    "svals_count": len(r.singular_values)
                }
            ))
        elif not r.is_singular and r.condition_number_2 is not None and r.condition_number_2 >= near_threshold:
            anomalies.append(AnomalyRecord(
                anomaly_id=f"nearsingular_{r.row_index}",
                anomaly_type=AnomalyType.NEAR_SINGULAR,
                severity=AnomalySeverity.WARNING,
                matrix_id=r.matrix_id,
                source_row=r.source_row,
                description=f"条件数过高({r.condition_number_2:.2e})，接近奇异，数值稳定性差",
                raw_value=f"cond={r.condition_number_2:.2e}",
                affected_columns=["条件数", "数值稳定性"],
                impact_scope="计算结果可能有较大误差，建议检查矩阵构造",
                calculation_context={
                    "condition_number": r.condition_number_2,
                    "threshold": near_threshold
                }
            ))

    return anomalies


def detect_dirty_data(df: pd.DataFrame, matrix_prefix: str = "a") -> List[AnomalyRecord]:
    anomalies = []
    matrix_cols = [c for c in df.columns if str(c).startswith(matrix_prefix)]

    for idx, row in df.iterrows():
        row_id = str(row.get("id", f"row_{idx}"))
        source_row = int(idx) + 2
        dirty_cells = []
        dirty_values = []

        for col in matrix_cols:
            if col not in row.index:
                continue
            val = row[col]
            if pd.isna(val):
                continue
            try:
                float(val)
            except (ValueError, TypeError):
                dirty_cells.append(col)
                dirty_values.append(f"{col}={val}")

        if dirty_cells:
            anomalies.append(AnomalyRecord(
                anomaly_id=f"dirty_{idx}",
                anomaly_type=AnomalyType.DIRTY_DATA,
                severity=AnomalySeverity.WARNING,
                matrix_id=row_id,
                source_row=source_row,
                description=f"发现 {len(dirty_cells)} 个非数值单元格，保留原始数据不自动修复",
                raw_value="; ".join(dirty_values),
                affected_columns=dirty_cells,
                impact_scope=f"对应位置按缺失值处理，矩阵维度保持不变，共影响 {len(dirty_cells)} 个元素",
                calculation_context={"dirty_count": len(dirty_cells)}
            ))

    return anomalies


def detect_missing_data(df: pd.DataFrame, matrix_prefix: str = "a") -> List[AnomalyRecord]:
    anomalies = []
    matrix_cols = [c for c in df.columns if str(c).startswith(matrix_prefix)]

    for idx, row in df.iterrows():
        row_id = str(row.get("id", f"row_{idx}"))
        source_row = int(idx) + 2
        missing_cols = []

        for col in matrix_cols:
            if col not in row.index or pd.isna(row[col]) or str(row[col]).strip() == "":
                missing_cols.append(col)

        if missing_cols and len(missing_cols) < len(matrix_cols):
            anomalies.append(AnomalyRecord(
                anomaly_id=f"missing_{idx}",
                anomaly_type=AnomalyType.MISSING_DATA,
                severity=AnomalySeverity.INFO,
                matrix_id=row_id,
                source_row=source_row,
                description=f"存在 {len(missing_cols)} 个缺失值，保留原始数据不填充",
                raw_value=f"缺失列: {', '.join(missing_cols[:5])}{'...' if len(missing_cols) > 5 else ''}",
                affected_columns=missing_cols,
                impact_scope=f"缺失位置按NaN处理，可能影响SVD计算，共 {len(missing_cols)} 个缺失",
                calculation_context={"missing_count": len(missing_cols)}
            ))

    return anomalies


def run_all_anomaly_detection(
    df: pd.DataFrame,
    results: List[MatrixResult],
    matrix_prefix: str = "a",
    near_singular_threshold: float = 1e10
) -> List[AnomalyRecord]:
    all_anomalies = []

    all_anomalies.extend(detect_empty_collections(df, matrix_prefix))
    all_anomalies.extend(detect_dirty_data(df, matrix_prefix))
    all_anomalies.extend(detect_missing_data(df, matrix_prefix))
    all_anomalies.extend(detect_singular_boundary(results, near_singular_threshold))

    all_anomalies.sort(key=lambda x: (
        0 if x.severity == AnomalySeverity.CRITICAL else 1 if x.severity == AnomalySeverity.WARNING else 2,
        x.source_row
    ))

    return all_anomalies


def anomalies_to_dataframe(anomalies: List[AnomalyRecord]) -> pd.DataFrame:
    rows = []
    for a in anomalies:
        rows.append({
            "严重程度": a.severity.value,
            "异常类型": a.anomaly_type.value,
            "矩阵ID": a.matrix_id,
            "来源行": a.source_row,
            "描述": a.description,
            "原始值": a.raw_value,
            "影响范围": a.impact_scope,
            "涉及列数": len(a.affected_columns),
        })
    return pd.DataFrame(rows)


def anomaly_summary(anomalies: List[AnomalyRecord]) -> Dict:
    summary = {
        "total": len(anomalies),
        "critical": sum(1 for a in anomalies if a.severity == AnomalySeverity.CRITICAL),
        "warning": sum(1 for a in anomalies if a.severity == AnomalySeverity.WARNING),
        "info": sum(1 for a in anomalies if a.severity == AnomalySeverity.INFO),
        "by_type": {},
    }
    for a in anomalies:
        t = a.anomaly_type.value
        summary["by_type"][t] = summary["by_type"].get(t, 0) + 1
    return summary
