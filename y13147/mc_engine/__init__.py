"""
蒙特卡洛误差参数试算 - 核心引擎
================================
参数名与错误码保持稳定，供项目经理日常脚本调用。

稳定参数名 (param_table 列名):
    param_id              参数编号 (主键)
    case_name             案例名称
    measurement_nominal   测量名义值
    measurement_tolerance 测量公差
    repeatability_std     重复性标准差 (GRR 中的 EV)
    reproducibility_std   再现性标准差 (GRR 中的 AV)
    mc_sample_count       蒙特卡洛抽样次数
    confidence_level      置信水平 (0~1)
    spec_lower            规格下限
    spec_upper            规格上限
    material_source       材料来源 (质检单编号)
    remark                备注

稳定错误码:
    ERR_MC_001  缺少必要参数，无法启动试算
    ERR_MC_002  重复性或再现性标准差缺失，待补材料
    ERR_MC_003  蒙特卡洛抽样次数低于建议下限 (边界警告)
    ERR_MC_004  规格范围非法 (下限 >= 上限)
    ERR_MC_005  排序不稳定: 测量系统变异过大，结果顺序存在波动
    ERR_MC_006  历史数据漂移，需工程师人工改判
    ERR_MC_007  再现性偏差异常放大

处理状态 (status):
    PROCESSED         已处理 (正常通过)
    PROCESSED_WARN    已处理 (带警告，如边界/排序不稳)
    MATERIAL_PENDING  待补材料
    MANUAL_REVIEW     人工改判
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Tuple

# ---------------------------------------------------------------------------
# 稳定常量
# ---------------------------------------------------------------------------

RECOMMENDED_MIN_SAMPLES = 5000
SORT_INSTABILITY_THRESHOLD_CV = 0.15  # 变异系数 >15% 判定排序不稳
DRIFT_WARNING_FACTOR = 2.0            # 再现性/重复性 >2x 判漂移

STATUS_LABELS = {
    "PROCESSED": "已处理",
    "PROCESSED_WARN": "已处理（带警告）",
    "MATERIAL_PENDING": "待补材料",
    "MANUAL_REVIEW": "人工改判",
}

ERROR_MESSAGES = {
    "ERR_MC_001": "缺少必要参数，无法启动试算",
    "ERR_MC_002": "重复性或再现性标准差缺失，待补材料",
    "ERR_MC_003": "蒙特卡洛抽样次数低于建议下限（建议 >= 5000 次）",
    "ERR_MC_004": "规格范围非法（下限不得大于等于上限）",
    "ERR_MC_005": "排序不稳定：测量系统变异过大，多次运行排名存在波动",
    "ERR_MC_006": "历史数据漂移：再现性显著大于重复性，需工程师人工改判",
    "ERR_MC_007": "再现性偏差异常放大，测量系统可能异常",
}

REQUIRED_COLUMNS = [
    "param_id", "case_name", "measurement_nominal", "measurement_tolerance",
    "mc_sample_count", "confidence_level", "spec_lower", "spec_upper",
]


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------

@dataclass
class TraceInfo:
    """数字来源线索 —— 让非技术人员也能看清数字从哪来"""
    distribution_type: str          # 分布类型，如 "正态分布 N(μ,σ²)"
    nominal_source: str             # 名义值来源字段
    std_source: str                 # 标准差来源字段
    sample_count: int               # 本次抽样数
    random_seed: int                # 随机种子 (可复现)
    formula: str                    # 合成公式描述


@dataclass
class TrialResult:
    """单条参数的试算结果"""
    param_id: str
    case_name: str
    status: str
    error_codes: List[str] = field(default_factory=list)
    # ---- 蒙特卡洛输出 ----
    mean_estimated: Optional[float] = None
    std_estimated: Optional[float] = None
    lower_bound: Optional[float] = None          # 置信下限
    upper_bound: Optional[float] = None          # 置信上限
    cp: Optional[float] = None                   # 过程能力指数 Cp
    cpk: Optional[float] = None                  # 过程能力指数 Cpk
    out_of_spec_rate: Optional[float] = None     # 超出规格比例
    # ---- 辅助 ----
    samples: Optional[np.ndarray] = None         # 原始抽样 (用于图表)
    trace: Optional[TraceInfo] = None            # 数字来源线索
    warnings: List[str] = field(default_factory=list)

    @property
    def status_label(self) -> str:
        return STATUS_LABELS.get(self.status, self.status)

    @property
    def error_messages(self) -> List[str]:
        return [ERROR_MESSAGES.get(c, c) for c in self.error_codes]

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["status_label"] = self.status_label
        d["error_messages"] = self.error_messages
        if self.samples is not None:
            d["samples"] = self.samples.tolist()
        return d


# ---------------------------------------------------------------------------
# 核心计算
# ---------------------------------------------------------------------------

def _validate_input(row: pd.Series) -> Tuple[bool, List[str]]:
    """校验输入参数，返回 (是否可试算, 错误码列表)"""
    errors = []

    # 必要参数缺失
    for col in REQUIRED_COLUMNS:
        if col not in row or pd.isna(row[col]):
            errors.append("ERR_MC_001")
            break

    if errors:
        return False, errors

    # 规格范围
    if row["spec_lower"] >= row["spec_upper"]:
        errors.append("ERR_MC_004")
        return False, errors

    # 标准差缺失 (待补材料)
    if pd.isna(row.get("repeatability_std")) or pd.isna(row.get("reproducibility_std")):
        errors.append("ERR_MC_002")
        return False, errors

    return True, errors


def _detect_warnings(row: pd.Series) -> List[str]:
    """检测警告类问题 (不阻断计算，但影响状态)"""
    warns = []
    n = int(row["mc_sample_count"])

    if n < RECOMMENDED_MIN_SAMPLES:
        warns.append("ERR_MC_003")

    rep_std = float(row["repeatability_std"])
    repro_std = float(row["reproducibility_std"])

    if rep_std > 0 and repro_std / rep_std > DRIFT_WARNING_FACTOR:
        warns.append("ERR_MC_006")

    if repro_std > 0 and row["measurement_tolerance"] > 0:
        if repro_std / row["measurement_tolerance"] > 0.3:
            warns.append("ERR_MC_007")

    return warns


def _check_sort_instability(
    nominal: float, total_std: float, n_samples: int, seed: int
) -> bool:
    """
    排序不稳定检测：
    以该样本与一组合成样本做排名，换一个种子再做一次，
    若排名差异超过阈值则判定排序不稳。
    """
    if total_std <= 0:
        return False
    cv = total_std / nominal if nominal != 0 else total_std
    if cv < SORT_INSTABILITY_THRESHOLD_CV:
        return False

    rng1 = np.random.default_rng(seed)
    rng2 = np.random.default_rng(seed + 9999)
    neighbors = rng1.normal(nominal * 0.98, total_std, 20)
    sample1 = rng1.normal(nominal, total_std, n_samples)
    sample2 = rng2.normal(nominal, total_std, n_samples)
    rank1 = np.mean(sample1 > neighbors)
    rank2 = np.mean(sample2 > neighbors)
    return abs(rank1 - rank2) > 0.05


def run_single_trial(row: pd.Series, seed: int = 20260613) -> TrialResult:
    """对单条参数执行蒙特卡洛误差试算"""
    row = row.fillna(np.nan)
    param_id = str(row.get("param_id", "UNKNOWN"))
    case_name = str(row.get("case_name", "未命名案例"))

    ok, errors = _validate_input(row)
    if not ok:
        status = "MATERIAL_PENDING" if "ERR_MC_002" in errors else "MANUAL_REVIEW"
        return TrialResult(
            param_id=param_id, case_name=case_name,
            status=status, error_codes=errors,
        )

    warnings = _detect_warnings(row)

    nominal = float(row["measurement_nominal"])
    tolerance = float(row["measurement_tolerance"])
    rep_std = float(row["repeatability_std"])
    repro_std = float(row["reproducibility_std"])
    total_std = np.sqrt(rep_std ** 2 + repro_std ** 2)
    n = int(row["mc_sample_count"])
    conf = float(row["confidence_level"])
    spec_lo = float(row["spec_lower"])
    spec_hi = float(row["spec_upper"])

    # ---- 排序不稳定检测 ----
    if _check_sort_instability(nominal, total_std, min(n, 2000), seed):
        warnings.append("ERR_MC_005")

    # ---- 蒙特卡洛抽样 ----
    rng = np.random.default_rng(seed)
    samples = rng.normal(loc=nominal, scale=total_std, size=n)

    mean_est = float(np.mean(samples))
    std_est = float(np.std(samples, ddof=1))
    alpha = 1 - conf
    lo = float(np.quantile(samples, alpha / 2))
    hi = float(np.quantile(samples, 1 - alpha / 2))

    # 过程能力
    cp = (spec_hi - spec_lo) / (6 * std_est) if std_est > 0 else np.nan
    cpk_upper = (spec_hi - mean_est) / (3 * std_est) if std_est > 0 else np.nan
    cpk_lower = (mean_est - spec_lo) / (3 * std_est) if std_est > 0 else np.nan
    cpk = float(min(cpk_upper, cpk_lower)) if std_est > 0 else np.nan

    oos = float(np.mean((samples < spec_lo) | (samples > spec_hi)))

    # ---- 数字来源线索 ----
    trace = TraceInfo(
        distribution_type=f"正态分布 N({nominal:.6g}, {total_std:.6g}²)",
        nominal_source=f"param_table.measurement_nominal = {nominal}",
        std_source=(
            f"√(repeatability_std² + reproducibility_std²) = "
            f"√({rep_std:.6g}² + {repro_std:.6g}²) = {total_std:.6g}"
        ),
        sample_count=n,
        random_seed=seed,
        formula=(
            f"测量值 ~ 名义值 + 重复性误差 + 再现性误差  "
            f"(GRR合成标准差 = {total_std:.6g})"
        ),
    )

    # ---- 最终状态 ----
    if "ERR_MC_006" in warnings:
        status = "MANUAL_REVIEW"
    elif warnings:
        status = "PROCESSED_WARN"
    else:
        status = "PROCESSED"

    return TrialResult(
        param_id=param_id,
        case_name=case_name,
        status=status,
        error_codes=warnings + errors,
        mean_estimated=mean_est,
        std_estimated=std_est,
        lower_bound=lo,
        upper_bound=hi,
        cp=float(cp) if not np.isnan(cp) else None,
        cpk=cpk if not np.isnan(cpk) else None,
        out_of_spec_rate=oos,
        samples=samples,
        trace=trace,
    )


def run_batch(param_df: pd.DataFrame, seed: int = 20260613) -> pd.DataFrame:
    """批处理整张参数表，返回结果 DataFrame (不含样本数组，便于导出)"""
    results = [run_single_trial(row, seed=seed) for _, row in param_df.iterrows()]
    records = []
    for r in results:
        d = r.to_dict()
        d.pop("samples", None)
        d.pop("trace", None)
        if r.trace:
            d["trace_formula"] = r.trace.formula
            d["trace_distribution"] = r.trace.distribution_type
            d["trace_seed"] = r.trace.random_seed
        records.append(d)
    return pd.DataFrame(records)
