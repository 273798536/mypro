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


def piecewise_linear_fit(
    x: np.ndarray,
    y: np.ndarray,
    weights: Optional[np.ndarray] = None,
    num_segments: int = 2,
    user_breakpoints: Optional[List[float]] = None,
) -> Dict[str, Any]:
    n = len(x)
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
    left = xs.min() - 1e-6
    total_w = ws.sum()
    ss_res = 0.0
    ss_tot = 0.0
    wy_total = (ws * ys).sum() / total_w if total_w > 0 else 0.0

    bp_expanded = [-np.inf] + breakpoints + [np.inf]
    for i in range(num_segments):
        lo, hi = bp_expanded[i], bp_expanded[i + 1]
        mask = (xs > lo) & (xs <= hi) if i < num_segments - 1 else (xs > lo) & (xs <= hi)
        if mask.sum() == 0 and i == num_segments - 1:
            mask = xs > lo
        if mask.sum() < 2:
            slope, intercept, r2_seg = 0.0, float(ys.mean() if len(ys) else 0.0), 0.0
        else:
            slope, intercept, r2_seg = _fit_segment(xs[mask], ys[mask], ws[mask])
            if slope is None:
                slope, intercept, r2_seg = 0.0, float(ys[mask].mean() if mask.sum() else 0.0), 0.0
        seg_pred = intercept + slope * xs[mask]
        all_pred[mask] = seg_pred
        if mask.sum():
            ss_res += (ws[mask] * (ys[mask] - seg_pred) ** 2).sum()
            ss_tot += (ws[mask] * (ys[mask] - wy_total) ** 2).sum()
        segments.append({
            "segment": i,
            "x_min": float(xs[mask].min()) if mask.sum() else None,
            "x_max": float(xs[mask].max()) if mask.sum() else None,
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
    rows = db.query(ParameterRow).filter(
        ParameterRow.sheet_id == sheet_id,
        ParameterRow.x_value.isnot(None),
        ParameterRow.y_value.isnot(None),
    ).all()

    n = len(rows)
    x = np.array([r.x_value for r in rows], dtype=float)
    y = np.array([r.y_value for r in rows], dtype=float)
    w = np.array([r.weight if r.weight is not None else 1.0 for r in rows], dtype=float)
    user_bps = sorted({float(r.breakpoint) for r in rows if r.breakpoint is not None})

    fit = piecewise_linear_fit(x, y, w, num_segments=num_segments, user_breakpoints=user_bps or None)
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
