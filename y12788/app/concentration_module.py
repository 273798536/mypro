from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
import numpy as np
from sqlalchemy.orm import Session

from .database import ExperimentRecord, BatchReport, CuringTimeResult
from .import_engine import ActionableError


@dataclass
class CalibrationPoint:
    record_no: str
    batch_no: str
    nominal_concentration: float
    peak_area: float
    peak_signal: float
    full_cure_time: float
    actual_concentration: Optional[float] = None
    weight: float = 1.0


@dataclass
class ConcentrationRegression:
    method: str
    equation: str
    r_squared: float
    slope: float
    intercept: float
    x_label: str
    y_label: str
    points: List[Dict[str, Any]]
    plot_x: List[float]
    plot_y: List[float]
    residuals: List[float]
    outliers: List[str]


def _linear_regression(x: np.ndarray, y: np.ndarray) -> Tuple[float, float, float]:
    if len(x) < 3:
        raise ActionableError(
            message=f"有效数据点不足({len(x)}个),至少需要3个才能建立回归",
            suggestion="请选择更多批次的实验记录,或确认这些记录已完成固化判定。",
            detail={"have_points": len(x), "required_min": 3}
        )
    A = np.vstack([x, np.ones(len(x))]).T
    slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1 - (ss_res / (ss_tot + 1e-10))
    return float(slope), float(intercept), float(r2)


def collect_calibration_points(db: Session, batch_nos: Optional[List[str]] = None,
                               date_from: str = "", date_to: str = "") -> List[CalibrationPoint]:
    q = db.query(ExperimentRecord, BatchReport, CuringTimeResult).join(
        BatchReport, ExperimentRecord.batch_no == BatchReport.batch_no
    ).outerjoin(
        CuringTimeResult, ExperimentRecord.record_no == CuringTimeResult.record_no
    )
    if batch_nos:
        q = q.filter(ExperimentRecord.batch_no.in_(batch_nos))
    if date_from:
        q = q.filter(ExperimentRecord.experiment_date >= date_from)
    if date_to:
        q = q.filter(ExperimentRecord.experiment_date <= date_to)

    rows = q.all()
    points: List[CalibrationPoint] = []
    for exp, br, result in rows:
        if not result or result.peak_area is None:
            continue
        points.append(CalibrationPoint(
            record_no=exp.record_no,
            batch_no=exp.batch_no,
            nominal_concentration=br.nominal_concentration or 0.0,
            peak_area=result.peak_area or 0.0,
            peak_signal=result.peak_signal or 0.0,
            full_cure_time=result.full_cure_time or 0.0,
            actual_concentration=exp.actual_concentration,
        ))
    return points


def build_concentration_regression(db: Session, *, x_axis: str = "peak_area",
                                   y_axis: str = "nominal_concentration",
                                   batch_nos: Optional[List[str]] = None,
                                   date_from: str = "", date_to: str = "",
                                   exclude_record_nos: Optional[List[str]] = None) -> ConcentrationRegression:
    """
    月底/课前使用:建立浓度-峰面积校准曲线,用于解释实验记录中的浓度异常。
    返回的 points 与 plot_x/plot_y 可直接用于界面绘图与导出,保证一致性。
    """
    label_map = {
        "peak_area": ("峰面积 (a.u.·s)", "峰面积"),
        "peak_signal": ("特征峰强度 (a.u.)", "特征峰强度"),
        "full_cure_time": ("完全固化时间 (s)", "完全固化时间"),
    }
    y_label_map = {
        "nominal_concentration": "标称浓度 (%)",
        "actual_concentration": "实测浓度 (%)",
    }
    x_label, x_name = label_map.get(x_axis, label_map["peak_area"])
    y_label = y_label_map.get(y_axis, y_label_map["nominal_concentration"])

    raw_points = collect_calibration_points(db, batch_nos, date_from, date_to)
    if exclude_record_nos:
        raw_points = [p for p in raw_points if p.record_no not in set(exclude_record_nos)]

    if not raw_points:
        raise ActionableError(
            message="未找到符合筛选条件的有效数据点",
            suggestion="请确认所选批次/时间段内已经完成了谱图判读,并生成了固化时间结论。",
            detail={"filters": {"batch_nos": batch_nos, "from": date_from, "to": date_to}}
        )

    xs, ys, valid_points, outliers = [], [], [], []
    for p in raw_points:
        xv = getattr(p, x_axis, None)
        yv = getattr(p, y_axis, None)
        if xv is None or yv is None or xv <= 0 or yv <= 0:
            outliers.append(p.record_no)
            continue
        xs.append(xv)
        ys.append(yv)
        valid_points.append(p)

    x = np.array(xs, dtype=np.float64)
    y = np.array(ys, dtype=np.float64)

    if len(x) < 3:
        raise ActionableError(
            message=f"有效数据点仅 {len(x)} 个(排除异常/缺值后),不足以建立可靠回归",
            suggestion=f"被排除的记录号: {', '.join(outliers) or '无'}。请补充更多已完成判读的实验记录。",
            detail={"valid_count": len(x), "excluded": outliers}
        )

    slope, intercept, r2 = _linear_regression(x, y)
    y_pred = slope * x + intercept
    residuals = (y - y_pred).tolist()

    x_fit = np.linspace(float(np.min(x)), float(np.max(x)), 100)
    y_fit = slope * x_fit + intercept

    points_json = []
    for i, p in enumerate(valid_points):
        d = asdict(p)
        d["_predicted_y"] = float(y_pred[i])
        d["_residual"] = float(residuals[i])
        d["_x_value"] = float(x[i])
        d["_y_value"] = float(y[i])
        points_json.append(d)

    equation = f"{y_label.split(' ')[0]} = {slope:.6f} × {x_name} + {intercept:.4f}"

    return ConcentrationRegression(
        method="最小二乘线性回归",
        equation=equation,
        r_squared=round(r2, 6),
        slope=round(slope, 8),
        intercept=round(intercept, 6),
        x_label=x_label,
        y_label=y_label,
        points=points_json,
        plot_x=x_fit.tolist(),
        plot_y=y_fit.tolist(),
        residuals=[round(r, 6) for r in residuals],
        outliers=outliers,
    )


def predict_concentration(regression: ConcentrationRegression, x_value: float) -> Dict[str, Any]:
    if regression.r_squared < 0.9:
        caution = (f"当前回归 R²={regression.r_squared:.4f} < 0.9,拟合度较差,"
                   f"预测结果仅供参考,建议补充更多校准点。")
    else:
        caution = ""
    predicted = regression.slope * x_value + regression.intercept
    return {
        "input_x": x_value,
        "predicted_concentration": round(predicted, 4),
        "equation_used": regression.equation,
        "r_squared": regression.r_squared,
        "caution": caution,
    }
