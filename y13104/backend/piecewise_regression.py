from typing import List, Dict, Tuple, Any, Optional
import numpy as np
from scipy import stats
from sqlalchemy.orm import Session

from models import ParameterSheet, ParameterRow, RegressionResult, AnomalyPoint, ReviewStatus


def _fit_segment(x: np.ndarray, y: np.ndarray, w: Optional[np.ndarray] = None):
    if len(x) < 2:
        return None, None, None
    if w is None:
        w = np.ones_like(x, dtype=float)
    sw = w.sum()
    if sw <= 0:
        return None, None, None
    wx = (w * x).sum() / sw
    wy = (w * y).sum() / sw
    cov = (w * (x - wx) * (y - wy)).sum()
    var = (w * (x - wx) ** 2).sum()
    if var <= 1e-12:
        slope = 0.0
    else:
        slope = cov / var
    intercept = wy - slope * wx
    y_pred = intercept + slope * x
    ss_res = (w * (y - y_pred) ** 2).sum()
    ss_tot = (w * (y - wy) ** 2).sum()
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0
    return slope, intercept, r2


class BadMaterialError(Exception):
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message)
        self.details = details or {}


def piecewise_linear_fit(
    x: np.ndarray,
    y: np.ndarray,
    weights: Optional[np.ndarray] = None,
    num_segments: int = 2,
    user_breakpoints: Optional[List[float]] = None,
) -> Dict[str, Any]:
    n = len(x)
    if n == 0:
        raise BadMaterialError(
            "有效样本为 0：没有同时具备 X 值和 Y 值的行",
            {"total_points": 0, "num_segments": num_segments},
        )
    if n < 2:
        raise BadMaterialError(
            f"有效样本不足：只有 {n} 行同时有 X 和 Y 值，分段回归至少需要 2 个有效样本",
            {"total_points": n, "min_required": 2, "num_segments": num_segments},
        )
    min_per_segment = 2
    if n < num_segments * min_per_segment:
        raise BadMaterialError(
            f"有效样本不足：只有 {n} 个有效点，要分 {num_segments} 段至少需要 {num_segments * min_per_segment} 个点",
            {"total_points": n, "min_required": num_segments * min_per_segment, "num_segments": num_segments},
        )

    order = np.argsort(x)
    xs = x[order]
    ys = y[order]
    ws = weights[order] if weights is not None else np.ones(n, dtype=float)

    if user_breakpoints:
        breakpoints = sorted(user_breakpoints)
    else:
        qs = np.linspace(0, 100, num_segments + 1)[1:-1]
        breakpoints = [float(np.percentile(xs, q)) for q in qs]

    segments = []
    all_pred = np.zeros(n)
    left = float(xs.min()) - 1e-6
    total_w = float(ws.sum())
    ss_res = 0.0
    ss_tot = 0.0
    wy_total = float((ws * ys).sum() / total_w) if total_w > 0 else 0.0

    bp_expanded = [-np.inf] + breakpoints + [np.inf]
    for i in range(num_segments):
        lo, hi = bp_expanded[i], bp_expanded[i + 1]
        mask = (xs > lo) & (xs <= hi) if i < num_segments - 1 else (xs > lo) & (xs <= hi)
        if mask.sum() == 0 and i == num_segments - 1:
            mask = xs > lo
        if mask.sum() < 2:
            if len(ys) == 0:
                slope, intercept, r2_seg = 0.0, 0.0, 0.0
            else:
                slope, intercept, r2_seg = 0.0, float(ys.mean()), 0.0
            x_min_seg = float(xs.min()) if len(xs) else None
            x_max_seg = float(xs.max()) if len(xs) else None
        else:
            slope, intercept, r2_seg = _fit_segment(xs[mask], ys[mask], ws[mask])
            if slope is None:
                slope, intercept, r2_seg = 0.0, float(ys[mask].mean()), 0.0
            x_min_seg = float(xs[mask].min())
            x_max_seg = float(xs[mask].max())
        seg_pred = intercept + slope * xs[mask]
        all_pred[mask] = seg_pred
        if mask.sum():
            ss_res += float((ws[mask] * (ys[mask] - seg_pred) ** 2).sum())
            ss_tot += float((ws[mask] * (ys[mask] - wy_total) ** 2).sum())
        segments.append({
            "segment": i,
            "x_min": x_min_seg,
            "x_max": x_max_seg,
            "slope": float(slope),
            "intercept": float(intercept),
            "r2": float(r2_seg or 0.0),
            "n_points": int(mask.sum()),
            "x_lo": float(lo) if np.isfinite(lo) else None,
            "x_hi": float(hi) if np.isfinite(hi) else None,
        })

    overall_r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0

    residuals = ys - all_pred
    return {
        "breakpoints": breakpoints,
        "segments": segments,
        "r_squared": float(overall_r2),
        "predicted": all_pred,
        "residuals": residuals,
        "order": order,
    }


def detect_anomalies(
    residuals: np.ndarray,
    order: np.ndarray,
    z_threshold: float = 2.5,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    if len(residuals) == 0:
        return np.array([], dtype=bool), np.array([]), []
    mu = residuals.mean()
    sd = residuals.std(ddof=0) or 1.0
    z = (residuals - mu) / sd
    abs_z = np.abs(z)
    is_outlier = abs_z > z_threshold

    reasons: List[str] = []
    for i in range(len(residuals)):
        r = []
        if abs_z[i] > z_threshold:
            r.append(f"残差Z值={abs_z[i]:.2f} > 阈值{z_threshold}")
        if residuals[i] > 0:
            r.append("实际值高于拟合线")
        else:
            r.append("实际值低于拟合线")
        reasons.append("；".join(r))
    return is_outlier, z, reasons


def run_regression_for_sheet(
    db: Session,
    sheet_id: int,
    num_segments: int = 2,
    z_threshold: float = 2.5,
) -> RegressionResult:
    total_rows = db.query(ParameterRow).filter(ParameterRow.sheet_id == sheet_id).count()

    rows = db.query(ParameterRow).filter(
        ParameterRow.sheet_id == sheet_id,
        ParameterRow.x_value.isnot(None),
        ParameterRow.y_value.isnot(None),
    ).all()

    missing_x = db.query(ParameterRow).filter(
        ParameterRow.sheet_id == sheet_id,
        ParameterRow.x_value.is_(None),
    ).count()
    missing_y = db.query(ParameterRow).filter(
        ParameterRow.sheet_id == sheet_id,
        ParameterRow.y_value.is_(None),
    ).count()

    n = len(rows)
    if n == 0:
        raise BadMaterialError(
            "坏材料：没有同时具备 X 值和 Y 值的有效行，无法进行分段回归",
            {
                "total_rows": total_rows,
                "valid_rows": 0,
                "missing_x_rows": missing_x,
                "missing_y_rows": missing_y,
                "suggestion": "请在明细页筛选有问题的行，补充 X/Y 值后重新运行，或按待补材料处理",
            },
        )

    x = np.array([r.x_value for r in rows], dtype=float)
    y = np.array([r.y_value for r in rows], dtype=float)
    w = np.array([r.weight if r.weight is not None else 1.0 for r in rows], dtype=float)
    user_bps = sorted({float(r.breakpoint) for r in rows if r.breakpoint is not None})

    try:
        fit = piecewise_linear_fit(x, y, w, num_segments=num_segments, user_breakpoints=user_bps or None)
    except BadMaterialError as e:
        e.details["total_rows"] = total_rows
        e.details["missing_x_rows"] = missing_x
        e.details["missing_y_rows"] = missing_y
        if "suggestion" not in e.details:
            e.details["suggestion"] = "请在明细页筛选有问题的行，确认字段映射后重新运行"
        raise

    is_outlier, z_scores, reasons = detect_anomalies(fit["residuals"], fit["order"], z_threshold)

    coefs = {
        "segments": fit["segments"],
        "z_threshold": z_threshold,
    }

    result = RegressionResult(
        sheet_id=sheet_id,
        segment_count=num_segments,
        breakpoints=fit["breakpoints"],
        coefficients=coefs,
        r_squared=fit["r_squared"],
        total_points=n,
    )
    db.add(result)
    db.flush()

    order = fit["order"]
    for i, orig_idx in enumerate(order):
        row = rows[orig_idx]
        anom = AnomalyPoint(
            result_id=result.id,
            param_row_id=row.id,
            security_code=row.security_code,
            security_name=row.security_name,
            x_value=float(x[orig_idx]),
            y_value=float(y[orig_idx]),
            predicted_y=float(fit["predicted"][i]),
            residual=float(fit["residuals"][i]),
            z_score=float(z_scores[i]),
            is_outlier=bool(is_outlier[i]),
            anomaly_reason=reasons[i],
            review_status=ReviewStatus.PENDING_MATERIAL if is_outlier[i] else ReviewStatus.PROCESSED,
        )
        db.add(anom)

    db.commit()
    db.refresh(result)
    return result
