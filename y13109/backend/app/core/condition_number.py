import numpy as np
from typing import Optional, Tuple


def is_empty_matrix(values: list) -> bool:
    if not values:
        return True
    if all(len(row) == 0 for row in values):
        return True
    if all(all(v is None or v == 0 for v in row) for row in values):
        return len(values) == 0 or len(values[0]) == 0
    return False


def is_singular(matrix: np.ndarray, tol: float = 1e-10) -> bool:
    if matrix.shape[0] != matrix.shape[1]:
        return False
    det = np.linalg.det(matrix)
    return abs(det) < tol


def compute_condition_number(values: list, norm: Optional[str] = None) -> Tuple[Optional[float], bool, bool]:
    if is_empty_matrix(values):
        return None, True, False

    try:
        matrix = np.array(values, dtype=float)
    except (ValueError, TypeError):
        return None, False, True

    if matrix.size == 0:
        return None, True, False

    if matrix.shape[0] != matrix.shape[1]:
        matrix = matrix.T @ matrix

    if is_singular(matrix):
        return None, False, True

    try:
        if norm:
            cond = np.linalg.cond(matrix, p=norm if isinstance(norm, (int, float, str)) else None)
        else:
            cond = np.linalg.cond(matrix)
        if np.isinf(cond) or np.isnan(cond):
            return None, False, True
        return float(cond), False, False
    except np.linalg.LinAlgError:
        return None, False, True


def check_out_of_bound(condition: float, threshold: float) -> Tuple[bool, float]:
    if threshold is None:
        return False, 0.0
    if condition > threshold:
        ratio = (condition - threshold) / threshold
        return True, ratio
    return False, 0.0
