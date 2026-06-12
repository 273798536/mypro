from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib
import json
import math


@dataclass
class CalcFormula:
    key: str
    name: str
    formula: str
    unit: str
    scope: str
    failure_modes: List[str]
    description: str


FORMULA_REGISTRY: Dict[str, CalcFormula] = {
    "ukc_standard": CalcFormula(
        key="ukc_standard",
        name="富余水深标准公式",
        formula="UKC = 实测水深(D) - 船舶吃水(T) - 安全余量(M)",
        unit="米(m)",
        scope="适用于港口内航道、锚地及泊位水域的日常拖轮作业潮窗计算。"
              "建议安全余量M≥0.5m（视港口规范、海况及底质可适当调整）。"
              "输入水深必须为正；潮汐表与水质监测时间差建议≤30分钟。",
        failure_modes=[
            "负水深样点：实测水深≤0的样点必须剔除，不可混入结果",
            "潮汐/水质数据缺失：港口当日无潮高或水深数据",
            "匹配度不足：潮高趋势与水深趋势相关系数<0.6",
            "超吃水：最大实测水深 < 船舶吃水 + 安全余量",
            "时间窗不足：连续满足UKC≥0的时长<60分钟",
        ],
        description="海事安全通用富余水深公式，UKC≥0为理论可通航阈值。"
    ),
    "depth_with_tide": CalcFormula(
        key="depth_with_tide",
        name="潮高修正水深公式",
        formula="有效水深 = 基准水深(D0) + 实时潮高(H) - 吃水(T) - 余量(M)",
        unit="米(m)",
        scope="当仅有潮汐表、缺少实时水质测深时，采用海图基准水深+潮高推算。"
              "注意：推算值需标记为pending，需人工复核后才能确认为available。",
        failure_modes=[
            "缺少海图基准水深D0",
            "当日潮汐表缺失",
            "推算水深与历史实测偏差>20%",
        ],
        description="基于潮汐表+海图深度的推算公式，结果仅供参考。"
    ),
}


NEGATIVE_DEPTH_THRESHOLD = 0.0
MATCH_SCORE_THRESHOLD = 60.0
MIN_WINDOW_MINUTES = 30


@dataclass
class TideSample:
    time: datetime
    height: float
    source_id: int


@dataclass
class WaterSample:
    time: datetime
    depth: float
    water_level: Optional[float] = None
    source_id: int = 0
    temp: Optional[float] = None
    salinity: Optional[float] = None


@dataclass
class CalcDiagnostics:
    negative_samples: List[Tuple[datetime, float]] = field(default_factory=list)
    out_of_order: List[Tuple[datetime, float]] = field(default_factory=list)
    interpolation_gaps_min: List[float] = field(default_factory=list)
    tide_water_pairs_count: int = 0
    matched_tide_ids: List[int] = field(default_factory=list)
    matched_water_ids: List[int] = field(default_factory=list)


@dataclass
class CalcResult:
    success: bool
    window_start: Optional[datetime] = None
    window_end: Optional[datetime] = None
    window_duration_min: float = 0.0
    min_depth: Optional[float] = None
    max_depth: Optional[float] = None
    avg_depth: Optional[float] = None
    under_keel_clearance: Optional[float] = None
    negative_depth_count: int = 0
    tide_water_match_score: float = 0.0
    tide_height_at_start: Optional[float] = None
    tide_height_at_end: Optional[float] = None
    formula_used: str = ""
    formula_note: str = ""
    failure_reason: Optional[str] = None
    pending_reason: Optional[str] = None
    recollect_reason: Optional[str] = None
    data_status: str = "pending"
    available_flag: bool = False
    diagnostics: CalcDiagnostics = field(default_factory=CalcDiagnostics)


def generate_result_no(port_code: str, work_date: datetime, vessel_name: str,
                       mmsi: str = "") -> str:
    raw = f"{port_code}|{work_date.strftime('%Y-%m-%d')}|{vessel_name}|{mmsi}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _interpolate_linear(samples: List[Tuple[datetime, float]], target: datetime) -> Optional[float]:
    if not samples:
        return None
    if len(samples) == 1:
        return samples[0][1]
    samples = sorted(samples, key=lambda x: x[0])
    before = None
    after = None
    for t, v in samples:
        if t <= target:
            before = (t, v)
        if t >= target and after is None:
            after = (t, v)
            break
    if before is None:
        return after[1]
    if after is None:
        return before[1]
    if before[0] == after[0]:
        return before[1]
    ratio = (target - before[0]).total_seconds() / (after[0] - before[0]).total_seconds()
    return before[1] + ratio * (after[1] - before[1])


def _pearson_corr(x: List[float], y: List[float]) -> float:
    n = len(x)
    if n < 3:
        return 0.0
    mx = sum(x) / n
    my = sum(y) / n
    num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
    dx = math.sqrt(sum((xi - mx) ** 2 for xi in x))
    dy = math.sqrt(sum((yi - my) ** 2 for yi in y))
    if dx == 0 or dy == 0:
        return 0.0
    return num / (dx * dy)


def compute_match_score(tide_series: List[float], depth_series: List[float]) -> float:
    if not tide_series or not depth_series or len(tide_series) != len(depth_series):
        return 0.0
    corr = _pearson_corr(tide_series, depth_series)
    return max(0.0, min(100.0, (corr * 0.5 + 0.5) * 100.0))


def _find_longest_window(valid_points: List[Tuple[datetime, float, bool]],
                         min_minutes: float) -> Optional[Tuple[int, int]]:
    n = len(valid_points)
    best_start, best_end = -1, -1
    best_len = 0
    i = 0
    while i < n:
        if not valid_points[i][2]:
            i += 1
            continue
        j = i
        while j < n and valid_points[j][2]:
            j += 1
        seg_start, seg_end = i, j - 1
        seg_duration = (valid_points[seg_end][0] - valid_points[seg_start][0]).total_seconds() / 60.0
        if seg_duration >= min_minutes and (seg_end - seg_start + 1) > best_len:
            best_start, best_end = seg_start, seg_end
            best_len = seg_end - seg_start + 1
        i = j
    if best_start < 0:
        return None
    return (best_start, best_end)


def calculate_tide_window(
    tide_samples: List[TideSample],
    water_samples: List[WaterSample],
    draft: float,
    required_depth: float = 8.0,
    under_keel_margin: float = 0.5,
    work_date: Optional[datetime] = None,
    time_window_hours: float = 24.0,
    formula_key: str = "ukc_standard",
) -> CalcResult:
    diagnostics = CalcDiagnostics()
    formula = FORMULA_REGISTRY.get(formula_key, FORMULA_REGISTRY["ukc_standard"])
    result = CalcResult(
        success=False,
        formula_used=formula.formula,
        formula_note=f"【适用范围】{formula.scope}\n【失败模式】" + "；".join(formula.failure_modes),
        diagnostics=diagnostics,
    )

    water_positive: List[WaterSample] = []
    for w in water_samples:
        if w.depth is None:
            continue
        if w.depth <= NEGATIVE_DEPTH_THRESHOLD:
            diagnostics.negative_samples.append((w.time, w.depth))
        else:
            water_positive.append(w)
    result.negative_depth_count = len(diagnostics.negative_samples)

    if len(water_positive) < 2:
        result.failure_reason = (
            f"有效水深样点不足（{len(water_positive)}个，其中负深度{result.negative_depth_count}个已剔除）。"
            f"请核查水质记录采集是否完整，若大量负深度需检查监测设备零点或数据录入错误。"
        )
        result.recollect_reason = (
            f"需重新采集：当日有效水深样点<2。负深度样点{result.negative_depth_count}个"
            f"（深度≤{NEGATIVE_DEPTH_THRESHOLD}m，已自动剔除，不可混入结果）。"
        )
        result.data_status = "recollect"
        return result

    if not tide_samples:
        result.pending_reason = "缺少当日潮汐表数据，当前结果基于水质实测水深推算，需人工复核。"
        result.data_status = "pending"
        tide_samples_for_match = []
    else:
        tide_samples_for_match = tide_samples

    _base = work_date or water_positive[0].time
    window_start_limit = _base.replace(hour=0, minute=0, second=0, microsecond=0)
    if window_start_limit.tzinfo is not None:
        window_start_limit = window_start_limit.replace(tzinfo=None)
    window_end_limit = window_start_limit + timedelta(hours=time_window_hours)

    water_in_range = [w for w in water_positive if window_start_limit <= w.time <= window_end_limit]
    if not water_in_range:
        result.failure_reason = "指定时间窗内无有效水深数据。"
        result.data_status = "recollect"
        return result

    tide_pairs = [(t.time, t.height) for t in tide_samples_for_match]

    paired_depths: List[float] = []
    paired_tides: List[float] = []
    interpolated_samples: List[Tuple[datetime, float, float]] = []

    for w in water_in_range:
        tide_h = _interpolate_linear(tide_pairs, w.time) if tide_pairs else None
        if tide_h is not None:
            paired_tides.append(tide_h)
            paired_depths.append(w.depth)
            diagnostics.tide_water_pairs_count += 1
            diagnostics.matched_tide_ids.extend(
                [t.source_id for t in tide_samples_for_match if abs((t.time - w.time).total_seconds()) < 1800]
            )
        diagnostics.matched_water_ids.append(w.source_id)
        effective_depth = w.depth
        interpolated_samples.append((w.time, effective_depth, tide_h or 0.0))

    if paired_depths:
        result.tide_water_match_score = compute_match_score(paired_tides, paired_depths)
    else:
        result.tide_water_match_score = 0.0

    threshold_depth = draft + under_keel_margin
    valid_points: List[Tuple[datetime, float, bool]] = []
    for t, d, h in interpolated_samples:
        ukc = d - draft - under_keel_margin
        ok = d >= threshold_depth
        valid_points.append((t, d, ok))
        result.under_keel_clearance = (
            ukc if result.under_keel_clearance is None else min(result.under_keel_clearance, ukc)
        )

    depths = [d for _, d, _ in valid_points]
    if depths:
        result.min_depth = min(depths)
        result.max_depth = max(depths)
        result.avg_depth = sum(depths) / len(depths)

    window_idx = _find_longest_window(valid_points, MIN_WINDOW_MINUTES)
    if window_idx is None:
        reasons = []
        if result.max_depth is not None and result.max_depth < threshold_depth:
            reasons.append(
                f"最大实测水深({result.max_depth:.2f}m) < 阈值({threshold_depth:.2f}m = 吃水{draft}m + 余量{under_keel_margin}m)"
            )
        else:
            reasons.append(f"连续满足UKC≥0的时长不足{MIN_WINDOW_MINUTES}分钟")
        if result.tide_water_match_score < MATCH_SCORE_THRESHOLD and paired_depths:
            reasons.append(
                f"潮汐-水深匹配度{result.tide_water_match_score:.0f}%，低于阈值{MATCH_SCORE_THRESHOLD}%"
            )
        result.failure_reason = "；".join(reasons)
        if result.negative_depth_count > 0:
            result.failure_reason += (
                f"（已自动剔除{result.negative_depth_count}个负深度样点，不可混入可用结果）"
            )
        if result.tide_water_match_score < MATCH_SCORE_THRESHOLD:
            result.pending_reason = "匹配度不足，建议核对潮汐表与水质记录的时间戳是否对齐。"
            result.data_status = "pending"
        else:
            result.recollect_reason = "潮窗条件不满足，如需再次确认建议补测作业时段水深。"
            result.data_status = "recollect"
        return result

    s_idx, e_idx = window_idx
    result.window_start = valid_points[s_idx][0]
    result.window_end = valid_points[e_idx][0]
    result.window_duration_min = (
        result.window_end - result.window_start
    ).total_seconds() / 60.0

    _, _, tide_start = interpolated_samples[s_idx]
    _, _, tide_end = interpolated_samples[e_idx]
    result.tide_height_at_start = tide_start if paired_depths else None
    result.tide_height_at_end = tide_end if paired_depths else None

    if result.tide_water_match_score >= MATCH_SCORE_THRESHOLD and result.negative_depth_count == 0:
        result.data_status = "available"
        result.available_flag = True
        result.success = True
    elif result.tide_water_match_score < MATCH_SCORE_THRESHOLD and paired_depths:
        result.data_status = "pending"
        result.pending_reason = (
            f"潮汐-水深匹配度{result.tide_water_match_score:.0f}% < 阈值{MATCH_SCORE_THRESHOLD}%，"
            f"怀疑潮汐表与水质记录时间戳错位，需海事安全员人工复核。"
        )
    elif result.negative_depth_count > 0:
        result.data_status = "pending"
        result.pending_reason = (
            f"检测到{result.negative_depth_count}个负深度样点已剔除，"
            f"需人工确认负深度是否来自设备故障或录入错误。"
        )
    else:
        result.data_status = "available"
        result.available_flag = True
        result.success = True

    return result


def classify_result_data(
    result: CalcResult,
    operator_note: Optional[str] = None,
) -> Dict[str, Any]:
    info_lines: List[str] = []
    info_lines.append("===== 结果说明（简短版）=====")
    info_lines.append(f"【数据状态】{result.data_status}")
    if result.data_status == "available":
        info_lines.append("可用：计算条件全部满足，结果可直接用于作业参考。")
        info_lines.append(
            f"潮窗：{result.window_start.strftime('%H:%M')} - {result.window_end.strftime('%H:%M')}，"
            f"时长{result.window_duration_min:.0f}分钟；"
            f"水深min={result.min_depth:.2f}m avg={result.avg_depth:.2f}m max={result.max_depth:.2f}m。"
        )
    elif result.data_status == "pending":
        info_lines.append("暂缓：数据存在疑点，需人工复核后才能确认是否可用。")
        if result.pending_reason:
            info_lines.append(f"暂缓原因：{result.pending_reason}")
        info_lines.append("复核建议：核对潮汐表与水质记录采集时间；核查负深度样点来源。")
    elif result.data_status == "recollect":
        info_lines.append("需重新采集：原始数据不足以支撑可靠结论。")
        if result.recollect_reason:
            info_lines.append(f"重采原因：{result.recollect_reason}")
    if result.negative_depth_count > 0:
        info_lines.append(
            f"【提示】已自动剔除{result.negative_depth_count}个负深度样点（深度≤0m），"
            f"该批样点**不可**混入正常结果。"
        )
    if result.failure_reason:
        info_lines.append(f"失败原因：{result.failure_reason}")
    if operator_note:
        info_lines.append(f"人工备注：{operator_note}")
    info_lines.append(f"公式：{result.formula_used}  单位：米")
    return {
        "summary_text": "\n".join(info_lines),
        "available": result.data_status == "available",
        "pending": result.data_status == "pending",
        "recollect": result.data_status == "recollect",
        "status": result.data_status,
        "negative_depth_count": result.negative_depth_count,
        "match_score": result.tide_water_match_score,
        "formula": result.formula_used,
        "formula_scope": formula.scope if (formula := FORMULA_REGISTRY.get("ukc_standard")) else "",
    }
