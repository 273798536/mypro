import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional, Union
from dataclasses import dataclass, field


@dataclass
class MatrixResult:
    row_index: int
    matrix_id: str
    matrix: np.ndarray
    condition_number_2: Optional[float]
    is_singular: bool
    singular_values: Optional[np.ndarray]
    error_message: Optional[str] = None
    source_row: int = 0
    raw_data: Dict = field(default_factory=dict)


def compute_2_condition_number(matrix: np.ndarray) -> Tuple[float, bool, Optional[np.ndarray], Optional[str]]:
    if matrix is None or matrix.size == 0:
        return float('inf'), True, None, "空矩阵"

    if not np.isfinite(matrix).all():
        return float('inf'), True, None, "矩阵含非数值元素(NaN/Inf)"

    try:
        svals = np.linalg.svd(matrix, compute_uv=False)
    except Exception as e:
        return float('inf'), True, None, f"SVD计算失败: {str(e)}"

    svals = np.sort(svals)[::-1]

    if len(svals) == 0:
        return float('inf'), True, svals, "无奇异值"

    s_min = svals[-1]
    s_max = svals[0]

    if s_min == 0:
        return float('inf'), True, svals, "最小奇异值为零，矩阵奇异"

    if not np.isfinite(s_max) or not np.isfinite(s_min):
        return float('inf'), True, svals, "奇异值含非数值"

    cond = s_max / s_min

    if not np.isfinite(cond):
        return float('inf'), True, svals, "条件数溢出"

    return float(cond), False, svals, None


def extract_matrix_from_row(
    row: pd.Series,
    matrix_prefix: str = "a",
    nrows_col: str = None,
    ncols_col: str = None
) -> Tuple[Optional[np.ndarray], Dict]:
    raw_data = row.to_dict()

    if nrows_col and ncols_col and nrows_col in row and ncols_col in row:
        try:
            nrows = int(row[nrows_col])
            ncols = int(row[ncols_col])
        except (ValueError, TypeError):
            return None, raw_data
    else:
        matrix_cols = [c for c in row.index if str(c).startswith(matrix_prefix)]
        if not matrix_cols:
            return None, raw_data
        n_total = len(matrix_cols)
        nrows = int(np.sqrt(n_total))
        ncols = n_total // nrows
        if nrows * ncols != n_total:
            ncols = n_total

    elements = []
    valid_count = 0
    col_names = sorted([c for c in row.index if str(c).startswith(matrix_prefix)])

    for col_name in col_names:
        val = row[col_name]
        if pd.isna(val):
            elements.append(np.nan)
        else:
            try:
                elements.append(float(val))
                valid_count += 1
            except (ValueError, TypeError):
                elements.append(np.nan)

    if valid_count == 0:
        return None, raw_data

    total_needed = nrows * ncols
    while len(elements) < total_needed:
        elements.append(np.nan)
    elements = elements[:total_needed]

    matrix = np.array(elements).reshape(nrows, ncols)
    return matrix, raw_data


def batch_compute_condition_numbers(
    df: pd.DataFrame,
    matrix_prefix: str = "a",
    id_col: str = "id",
    nrows_col: str = None,
    ncols_col: str = None
) -> List[MatrixResult]:
    results = []

    for idx, row in df.iterrows():
        matrix_id = str(row[id_col]) if id_col in row.index else f"row_{idx}"
        matrix, raw_data = extract_matrix_from_row(row, matrix_prefix, nrows_col, ncols_col)

        if matrix is None:
            results.append(MatrixResult(
                row_index=int(idx),
                matrix_id=matrix_id,
                matrix=np.array([]),
                condition_number_2=None,
                is_singular=True,
                singular_values=None,
                error_message="无法提取矩阵",
                source_row=int(idx) + 2,
                raw_data=raw_data
            ))
            continue

        cond, singular, svals, err = compute_2_condition_number(matrix)

        results.append(MatrixResult(
            row_index=int(idx),
            matrix_id=matrix_id,
            matrix=matrix,
            condition_number_2=cond if not singular else None,
            is_singular=singular,
            singular_values=svals,
            error_message=err,
            source_row=int(idx) + 2,
            raw_data=raw_data
        ))

    return results


def results_to_dataframe(results: List[MatrixResult]) -> pd.DataFrame:
    rows = []
    for r in results:
        rows.append({
            "行号": r.source_row,
            "矩阵ID": r.matrix_id,
            "条件数(2-范数)": r.condition_number_2,
            "是否奇异": "是" if r.is_singular else "否",
            "奇异值个数": len(r.singular_values) if r.singular_values is not None else 0,
            "最大奇异值": float(r.singular_values[0]) if r.singular_values is not None and len(r.singular_values) > 0 else None,
            "最小奇异值": float(r.singular_values[-1]) if r.singular_values is not None and len(r.singular_values) > 0 else None,
            "错误/异常": r.error_message if r.error_message else "",
        })
    return pd.DataFrame(rows)
