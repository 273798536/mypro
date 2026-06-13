#!/usr/bin/env python3
"""冷却塔水滴误差归因 - 核心分析引擎"""

import json
import uuid
import math
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path

from .models import (
    Nameplate, Measurement, Alarm, Note, AnomalyItem,
    AttributionResult, PersistentState, ErrorCategory, Status
)


DATA_DIR = Path(__file__).parent.parent / "data"
STATE_DIR = Path(__file__).parent.parent / "state"
STATE_FILE = STATE_DIR / "persistent_state.json"


DEFAULT_PARAMS = {
    "error_threshold_pct": 2.0,
    "drift_threshold_pct": 1.5,
    "env_temp_correction": 0.08,
    "env_humidity_correction": 0.03,
    "boundary_low_correction": 0.94,
    "boundary_high_correction": 0.95,
    "sampling_gap_minutes": 45
}


FORMULA = (
    "修正后流量 Q_corr = Q_raw × K_boundary × K_env × K_drift\n"
    "误差率 ε = (Q_corr - Q_ref) / Q_ref × 100%\n"
    "其中:\n"
    "  K_boundary: 边界修正系数 (低端取 boundary_low_correction, 高端取 boundary_high_correction)\n"
    "  K_env = 1 + env_temp_correction × (T - 25)/10 + env_humidity_correction × (RH - 60)/100\n"
    "  K_drift: 漂移修正系数, 根据近7天均值动态估算"
)

FORMULA_UNITS = {
    "Q_raw": "m3/h (原始读数)",
    "Q_ref": "m3/h (参考值)",
    "Q_corr": "m3/h (修正后)",
    "T": "°C (水温)",
    "RH": "% (相对湿度)",
    "ε": "% (相对误差)"
}


def load_nameplate(path: Optional[Path] = None) -> Nameplate:
    p = path or DATA_DIR / "nameplate.json"
    with open(p, "r", encoding="utf-8") as f:
        return Nameplate.from_json(json.load(f))


def load_measurements(path: Optional[Path] = None) -> List[Measurement]:
    p = path or DATA_DIR / "measurements.json"
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Measurement.from_json(m) for m in data]


def load_alarms(path: Optional[Path] = None) -> List[Alarm]:
    p = path or DATA_DIR / "alarms.json"
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Alarm.from_json(a) for a in data]


def load_notes(path: Optional[Path] = None) -> List[Note]:
    p = path or DATA_DIR / "notes.json"
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Note.from_json(n) for n in data]


def load_boundary_samples(path: Optional[Path] = None) -> Dict[str, Any]:
    p = path or DATA_DIR / "boundary_samples.json"
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_env_correction(temp_c: Optional[float], humidity_pct: Optional[float], params: Dict[str, float]) -> float:
    t = temp_c if temp_c is not None else 25.0
    h = humidity_pct if humidity_pct is not None else 60.0
    k = 1.0 + params["env_temp_correction"] * (t - 25) / 10 + params["env_humidity_correction"] * (h - 60) / 100
    return round(k, 4)


def compute_boundary_correction(raw_value: float, range_min: float, range_max: float, params: Dict[str, float]) -> Tuple[float, str]:
    pct = (raw_value - range_min) / (range_max - range_min) * 100
    if pct < 5:
        return params["boundary_low_correction"], f"低端边界({round(pct,1)}%量程)"
    elif pct > 90:
        return params["boundary_high_correction"], f"高端边界({round(pct,1)}%量程)"
    return 1.0, "正常量程"


def estimate_drift_correction(valid_rows: List[Dict[str, Any]], params: Dict[str, float]) -> float:
    if len(valid_rows) < 3:
        return 1.0
    errors = [r["_rough_error"] for r in valid_rows if r.get("_rough_error") is not None]
    if not errors:
        return 1.0
    mean_err = sum(errors) / len(errors)
    if abs(mean_err) >= params["drift_threshold_pct"]:
        return round(1.0 - mean_err / 100.0, 4)
    return 1.0


def classify_error(row: Dict[str, Any], params: Dict[str, float]) -> Tuple[ErrorCategory, str, str]:
    flag = row.get("flag", "")
    is_boundary = row.get("is_boundary", False)
    err = row.get("error_pct")
    abs_err = abs(err) if err is not None else 0

    if flag == "NO_DATA" or row.get("raw_value") is None:
        return ErrorCategory.SAMPLING, "采样缺口", "补填旁通阀人工读数或用前后相邻点线性插值。"

    if is_boundary:
        if err is not None and err > 0:
            return ErrorCategory.CALIBRATION, "边界校准偏差", "按边界样本修正系数重新校准该段，联系厂家确认线性区间。"
        else:
            return ErrorCategory.CALIBRATION, "边界校准偏差", "检查水滴计数器采样频率，低流量段考虑切换旁通读数。"

    if err is not None and abs_err >= params["error_threshold_pct"] * 2:
        return ErrorCategory.UNKNOWN, "待确认大偏差", "现场核读表头、对比参考表、检查管道是否有气泡或泄漏。"

    if err is not None and abs_err >= params["drift_threshold_pct"]:
        return ErrorCategory.DRIFT, "漂移偏差", "安排零点校准，若漂移持续增大提前送检。"

    env_contrib = row.get("env_contribution_pct", 0)
    if abs(env_contrib) >= 0.5 and err is not None and abs_err >= params["error_threshold_pct"]:
        return ErrorCategory.ENVIRONMENT, "环境干扰", "检查温湿度传感器是否正常，必要时加防护罩。"

    if err is not None and abs_err >= params["error_threshold_pct"]:
        return ErrorCategory.UNKNOWN, "待确认", "结合报警记录和人工备注进一步排查。"

    return ErrorCategory.UNKNOWN, "正常范围", "误差在允许范围内，持续观察。"


def generate_action_next(category: ErrorCategory, row: Dict[str, Any]) -> str:
    actions = {
        ErrorCategory.SAMPLING: (
            "1. 确认通讯是否恢复，查看网络日志；"
            "2. 找到对应时段旁通阀人工记录或压差读数；"
            "3. 若无人工记录，用前后1小时数据线性插值补填；"
            "4. 在系统备注中标注补填来源。"
        ),
        ErrorCategory.DRIFT: (
            "1. 执行零点校准程序(参考设备手册第4.2节)；"
            "2. 对比近30天漂移趋势，若>3%提前送检；"
            "3. 校准后运行1小时验证读数。"
        ),
        ErrorCategory.CALIBRATION: (
            "1. 取出对应边界样本(边界样本.json)；"
            "2. 按修正系数重新计算该点误差；"
            "3. 若修正后仍超限，联系厂家扩大标定区间。"
        ),
        ErrorCategory.ENVIRONMENT: (
            "1. 检查温湿度传感器是否被冷却水溅到；"
            "2. 给传感器加装防护罩或移位；"
            "3. 重新评估环境修正参数。"
        ),
        ErrorCategory.UNKNOWN: (
            "1. 现场核对表头实时读数与系统显示；"
            "2. 检查前后管道阀门开度是否正常；"
            "3. 对比同工况其他冷却塔数据；"
            "4. 无法定位则升级给仪表车间。"
        )
    }
    return actions.get(category, actions[ErrorCategory.UNKNOWN])


def run_attribution(params_override: Optional[Dict[str, float]] = None,
                    device_id: Optional[str] = None,
                    start_time: Optional[str] = None,
                    end_time: Optional[str] = None) -> AttributionResult:
    params = dict(DEFAULT_PARAMS)
    if params_override:
        params.update(params_override)

    nameplate = load_nameplate()
    measurements = load_measurements()
    alarms = load_alarms()
    notes = load_notes()
    boundary_data = load_boundary_samples()

    if device_id:
        measurements = [m for m in measurements if m.device_id == device_id]
    if start_time:
        measurements = [m for m in measurements if m.timestamp >= start_time]
    if end_time:
        measurements = [m for m in measurements if m.timestamp <= end_time]

    STATE_DIR.mkdir(exist_ok=True)
    state = PersistentState.load(STATE_FILE)

    run_id = f"RUN-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    run_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    detail_rows: List[Dict[str, Any]] = []
    boundary_samples_detail: List[Dict[str, Any]] = []
    anomalies: List[AnomalyItem] = []

    for m in measurements:
        row: Dict[str, Any] = {
            "timestamp": m.timestamp,
            "device_id": m.device_id,
            "raw_value": m.raw_value,
            "reference_value": m.reference_value,
            "temperature_c": m.temperature_c,
            "humidity_pct": m.humidity_pct,
            "pressure_kpa": m.pressure_kpa,
            "is_boundary": m.is_boundary,
            "flag": m.flag,
            "operator": m.operator,
            "ref_available": m.reference_value is not None and m.raw_value is not None
        }

        if m.raw_value is None:
            row["corrected_value"] = None
            row["error_pct"] = None
            row["k_boundary"] = None
            row["k_env"] = None
            row["k_drift"] = 1.0
            row["env_contribution_pct"] = 0
            row["boundary_hint"] = "无数据"
        else:
            k_boundary, boundary_hint = compute_boundary_correction(
                m.raw_value, nameplate.sensor_range_min, nameplate.sensor_range_max, params
            )
            k_env = compute_env_correction(m.temperature_c, m.humidity_pct, params)
            row["k_boundary"] = k_boundary
            row["k_env"] = k_env
            row["boundary_hint"] = boundary_hint
            env_contrib = (k_env - 1.0) * 100
            row["env_contribution_pct"] = round(env_contrib, 2)

            if m.is_boundary:
                bs = {
                    "timestamp": m.timestamp,
                    "raw_value": m.raw_value,
                    "range_pct": round((m.raw_value - nameplate.sensor_range_min) /
                                       (nameplate.sensor_range_max - nameplate.sensor_range_min) * 100, 1),
                    "boundary_hint": boundary_hint,
                    "k_boundary": k_boundary,
                    "correction_note": ""
                }
                for s in boundary_data.get("samples", []):
                    if s["timestamp"] == m.timestamp:
                        bs["correction_note"] = s.get("correction_note", "")
                        break
                boundary_samples_detail.append(bs)

        detail_rows.append(row)

    valid_ref = [r for r in detail_rows if r.get("ref_available") and r["raw_value"] is not None]
    for r in valid_ref:
        kb = r.get("k_boundary", 1.0) or 1.0
        ke = r.get("k_env", 1.0) or 1.0
        rough_corrected = r["raw_value"] * kb * ke
        r["_rough_error"] = (rough_corrected - r["reference_value"]) / r["reference_value"] * 100
    k_drift = estimate_drift_correction(valid_ref, params)
    for r in detail_rows:
        r["k_drift"] = k_drift
        r.pop("_rough_error", None)
        if r["raw_value"] is not None:
            kb = r.get("k_boundary", 1.0) or 1.0
            ke = r.get("k_env", 1.0) or 1.0
            corrected = r["raw_value"] * kb * ke * k_drift
            r["corrected_value"] = round(corrected, 2)
            if r.get("reference_value"):
                err = (corrected - r["reference_value"]) / r["reference_value"] * 100
                r["error_pct"] = round(err, 2)
            else:
                r["error_pct"] = None

    total_samples = len(detail_rows)
    valid_samples = sum(1 for r in detail_rows if r["raw_value"] is not None)
    sampling_gap_count = sum(1 for r in detail_rows if r["raw_value"] is None or r.get("flag") == "NO_DATA")

    errors_with_ref = [r["error_pct"] for r in detail_rows if r.get("error_pct") is not None]
    mean_err = sum(errors_with_ref) / len(errors_with_ref) if errors_with_ref else 0
    max_err = max(errors_with_ref) if errors_with_ref else 0
    min_err = min(errors_with_ref) if errors_with_ref else 0
    variance = sum((e - mean_err) ** 2 for e in errors_with_ref) / len(errors_with_ref) if errors_with_ref else 0
    std_err = math.sqrt(variance)

    category_counts = {c: 0 for c in ErrorCategory}
    anomaly_idx = 0
    for r in detail_rows:
        is_anomaly = (
            r["raw_value"] is None
            or r.get("is_boundary", False)
            or (r.get("error_pct") is not None and abs(r["error_pct"]) >= params["error_threshold_pct"])
        )
        if is_anomaly:
            category, desc, _ = classify_error(r, params)
            category_counts[category] += 1
            anomaly_idx += 1
            a_id = f"ANOM-{run_id[-6:]}-{anomaly_idx:03d}"
            measured = r.get("raw_value") or 0
            expected = r.get("reference_value") or measured
            err_pct = r.get("error_pct") or 0
            action = generate_action_next(category, r)
            anomaly = AnomalyItem(
                anomaly_id=a_id,
                device_id=r["device_id"],
                timestamp=r["timestamp"],
                category=category,
                description=desc,
                measured_value=measured,
                expected_value=expected,
                error_pct=err_pct,
                status=Status.PENDING,
                assignee="老何",
                boundary_hint=r.get("boundary_hint", ""),
                action_next=action,
                history=[{"time": run_ts, "event": f"自动检出, 分类={category.value}"}]
            )
            anomalies.append(anomaly)
            r["category"] = category.value
            r["anomaly_id"] = a_id
        else:
            r["category"] = "正常"
            r["anomaly_id"] = ""

    total_anomalies = len(anomalies) or 1
    drift_pct = category_counts[ErrorCategory.DRIFT] / total_anomalies * 100
    cal_pct = category_counts[ErrorCategory.CALIBRATION] / total_anomalies * 100
    env_pct = category_counts[ErrorCategory.ENVIRONMENT] / total_anomalies * 100
    samp_pct = category_counts[ErrorCategory.SAMPLING] / total_anomalies * 100
    unk_pct = category_counts[ErrorCategory.UNKNOWN] / total_anomalies * 100

    notes_texts = []
    for n in notes:
        notes_texts.append(f"[{n.timestamp}] {n.author}: {n.content}")
    if boundary_data.get("source"):
        notes_texts.append(f"边界样本来源: {boundary_data['source']}")
    if nameplate.notes:
        notes_texts.append(f"铭牌备注: {nameplate.notes}")
    if sampling_gap_count > 0:
        notes_texts.append(
            f"采样缺口{sampling_gap_count}处, 已生成下一步处理指引, 见异常队列 action_next 字段。"
        )

    result = AttributionResult(
        run_id=run_id,
        run_timestamp=run_ts,
        device_id=nameplate.device_id,
        total_samples=total_samples,
        valid_samples=valid_samples,
        sampling_gap_count=sampling_gap_count,
        mean_error_pct=round(mean_err, 2),
        max_error_pct=round(max_err, 2),
        min_error_pct=round(min_err, 2),
        std_error_pct=round(std_err, 2),
        drift_pct=round(drift_pct, 1),
        calibration_pct=round(cal_pct, 1),
        environmental_pct=round(env_pct, 1),
        sampling_gap_pct=round(samp_pct, 1),
        unknown_pct=round(unk_pct, 1),
        formula_used=FORMULA,
        formula_units=FORMULA_UNITS,
        parameters_used=params,
        boundary_samples=boundary_samples_detail,
        detail_rows=detail_rows,
        anomalies=anomalies,
        notes=notes_texts
    )

    state.last_run_id = run_id
    state.last_run_timestamp = run_ts
    state.current_status[nameplate.device_id] = (
        f"本次检出{len(anomalies)}项异常, "
        f"均误差{round(mean_err,2)}%, "
        f"采样缺口{sampling_gap_count}处"
    )
    state.historical_notes.append({"run_id": run_id, "timestamp": run_ts, "content": "; ".join(notes_texts[:3])})
    state.anomaly_queue = [a.to_dict() for a in anomalies]
    state.parameter_history.append({"run_id": run_id, "timestamp": run_ts, "params": params})
    state.save(STATE_FILE)

    return result
