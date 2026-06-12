import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from src.calculator import MatrixResult
from src.anomaly import AnomalyRecord, AnomalyType, AnomalySeverity


@dataclass
class HistoryAnswer:
    matrix_id: str
    condition_number: Optional[float]
    source: str = ""
    version: str = ""
    raw_data: Dict = field(default_factory=dict)
    notes: str = ""


@dataclass
class ComparisonResult:
    matrix_id: str
    calculated_value: Optional[float]
    history_value: Optional[float]
    difference: Optional[float]
    relative_error: Optional[float]
    is_match: bool
    match_status: str
    source_row: int
    calculation_trace: Dict = field(default_factory=dict)


def load_history_answers(
    file_path_or_df,
    id_col: str = "id",
    cond_col: str = "condition_number",
    source_col: str = None,
    version_col: str = None,
    notes_col: str = None
) -> List[HistoryAnswer]:
    if isinstance(file_path_or_df, str):
        if file_path_or_df.endswith(".csv"):
            df = pd.read_csv(file_path_or_df)
        elif file_path_or_df.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path_or_df)
        else:
            raise ValueError(f"不支持的文件格式: {file_path_or_df}")
    else:
        df = file_path_or_df

    answers = []
    for idx, row in df.iterrows():
        matrix_id = str(row.get(id_col, f"hist_{idx}"))
        cond_val = row.get(cond_col)
        if pd.isna(cond_val):
            cond_num = None
        else:
            try:
                cond_num = float(cond_val)
            except (ValueError, TypeError):
                cond_num = None

        source_val = str(row.get(source_col, "")) if source_col else ""
        version_val = str(row.get(version_col, "")) if version_col else ""
        notes_val = str(row.get(notes_col, "")) if notes_col else ""

        answers.append(HistoryAnswer(
            matrix_id=matrix_id,
            condition_number=cond_num,
            source=source_val,
            version=version_val,
            raw_data=row.to_dict(),
            notes=notes_val
        ))

    return answers


def compare_with_history(
    results: List[MatrixResult],
    history_answers: List[HistoryAnswer],
    tolerance: float = 1e-6
) -> Tuple[List[ComparisonResult], List[AnomalyRecord]]:
    hist_map = {a.matrix_id: a for a in history_answers}
    comparisons = []
    anomalies = []

    for r in results:
        hist = hist_map.get(r.matrix_id)
        calc_val = r.condition_number_2
        hist_val = hist.condition_number if hist else None

        if hist is None:
            comparisons.append(ComparisonResult(
                matrix_id=r.matrix_id,
                calculated_value=calc_val,
                history_value=None,
                difference=None,
                relative_error=None,
                is_match=False,
                match_status="无历史答案",
                source_row=r.source_row,
                calculation_trace={
                    "calculation_method": "2-范数条件数(SVD)",
                    "has_history": False,
                    "source_row": r.source_row
                }
            ))
            continue

        if calc_val is None and hist_val is None:
            is_match = True
            status = "均为奇异"
            diff = None
            rel_err = None
        elif calc_val is None or hist_val is None:
            is_match = False
            status = "结果不一致（一方奇异）"
            diff = None
            rel_err = None

            anomalies.append(AnomalyRecord(
                anomaly_id=f"histmismatch_{r.matrix_id}",
                anomaly_type=AnomalyType.HISTORY_MISMATCH,
                severity=AnomalySeverity.WARNING,
                matrix_id=r.matrix_id,
                source_row=r.source_row,
                description=f"与历史答案不符：本次{'奇异(cond=inf)' if calc_val is None else f'cond={calc_val:.4e}'}，历史{'奇异(cond=inf)' if hist_val is None else f'cond={hist_val:.4e}'}",
                raw_value=f"本次={calc_val}, 历史={hist_val}",
                affected_columns=["条件数"],
                impact_scope="历史复核时需重点关注，建议人工核对",
                calculation_context={
                    "calculated": calc_val,
                    "history": hist_val,
                    "history_source": hist.source,
                    "history_version": hist.version
                }
            ))
        else:
            diff = abs(calc_val - hist_val)
            if hist_val == 0:
                rel_err = float('inf') if diff > 0 else 0.0
            else:
                rel_err = diff / abs(hist_val)

            is_match = rel_err <= tolerance
            status = "一致" if is_match else "不一致"

            if not is_match:
                anomalies.append(AnomalyRecord(
                    anomaly_id=f"histmismatch_{r.matrix_id}",
                    anomaly_type=AnomalyType.HISTORY_MISMATCH,
                    severity=AnomalySeverity.WARNING,
                    matrix_id=r.matrix_id,
                    source_row=r.source_row,
                    description=f"与历史答案偏差超过阈值({tolerance:.1e})，相对误差={rel_err:.2e}",
                    raw_value=f"本次={calc_val:.6e}, 历史={hist_val:.6e}, 差值={diff:.2e}",
                    affected_columns=["条件数"],
                    impact_scope="数值存在差异，需确认是计算口径不同还是历史答案有误",
                    calculation_context={
                        "calculated": calc_val,
                        "history": hist_val,
                        "difference": diff,
                        "relative_error": rel_err,
                        "tolerance": tolerance,
                        "history_source": hist.source,
                        "history_version": hist.version
                    }
                ))

        calc_trace = {
            "calculation_method": "2-范数条件数(SVD)",
            "has_history": True,
            "history_source": hist.source if hist else "",
            "history_version": hist.version if hist else "",
            "source_row": r.source_row,
            "max_singular_value": float(r.singular_values[0]) if r.singular_values is not None and len(r.singular_values) > 0 else None,
            "min_singular_value": float(r.singular_values[-1]) if r.singular_values is not None and len(r.singular_values) > 0 else None,
        }

        comparisons.append(ComparisonResult(
            matrix_id=r.matrix_id,
            calculated_value=calc_val,
            history_value=hist_val,
            difference=diff,
            relative_error=rel_err,
            is_match=is_match,
            match_status=status,
            source_row=r.source_row,
            calculation_trace=calc_trace
        ))

    hist_ids = set(a.matrix_id for a in history_answers)
    result_ids = set(r.matrix_id for r in results)
    missing_from_calc = hist_ids - result_ids

    for mid in missing_from_calc:
        hist = hist_map[mid]
        comparisons.append(ComparisonResult(
            matrix_id=mid,
            calculated_value=None,
            history_value=hist.condition_number,
            difference=None,
            relative_error=None,
            is_match=False,
            match_status="历史有但本次无",
            source_row=-1,
            calculation_trace={
                "calculation_method": "无对应本次数据",
                "has_history": True,
                "history_source": hist.source,
                "history_version": hist.version,
            }
        ))

    return comparisons, anomalies


def comparisons_to_dataframe(comparisons: List[ComparisonResult]) -> pd.DataFrame:
    rows = []
    for c in comparisons:
        rows.append({
            "矩阵ID": c.matrix_id,
            "来源行": c.source_row if c.source_row > 0 else "N/A",
            "本次计算值": c.calculated_value,
            "历史答案值": c.history_value,
            "绝对差值": c.difference,
            "相对误差": c.relative_error,
            "匹配状态": c.match_status,
            "历史来源": c.calculation_trace.get("history_source", ""),
        })
    return pd.DataFrame(rows)


def build_calculation_trace(result: MatrixResult, input_df: pd.DataFrame) -> Dict:
    trace = {
        "matrix_id": result.matrix_id,
        "source_row": result.source_row,
        "input_data": result.raw_data,
        "matrix_shape": list(result.matrix.shape) if result.matrix.size > 0 else [0, 0],
        "condition_number_2": result.condition_number_2,
        "is_singular": result.is_singular,
        "calculation_method": "2-范数条件数 = σ_max / σ_min（通过SVD计算奇异值）",
        "formula": "cond₂(A) = σ_max(A) / σ_min(A)",
        "singular_values": result.singular_values.tolist() if result.singular_values is not None else None,
        "error": result.error_message,
    }
    return trace


def find_by_id(results: List[MatrixResult], matrix_id: str) -> Optional[MatrixResult]:
    for r in results:
        if r.matrix_id == matrix_id:
            return r
    return None
