import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from .isotherm_models import fit_both, FitResult
from .data_cleaner import CleanedDataset, TraceLog


@dataclass
class BatchFit:
    batch_id: str
    subset: pd.DataFrame
    baseline_lang: FitResult
    baseline_fre: FitResult
    baseline_better: str
    alt_scenarios: Dict[str, Dict] = field(default_factory=dict)
    changed_conclusion: bool = False
    change_reason: str = ""


@dataclass
class FullAnalysis:
    batches: Dict[str, BatchFit]
    concentration_trace: pd.DataFrame
    time_leak_impact: List[Dict]
    overall_conclusion: str = ""


def _build_concentration_trace(raw_df: pd.DataFrame, cleaned: CleanedDataset) -> pd.DataFrame:
    rows = []
    removed_set = set(cleaned.removed_rows)

    clean_by_seq = {}
    for _, crow in cleaned.df.iterrows():
        seq = int(crow["序号"])
        clean_by_seq[seq] = crow

    for idx in range(len(raw_df)):
        if idx in removed_set:
            continue
        r = raw_df.iloc[idx]
        seq = int(r.get("序号", idx + 1))
        c = clean_by_seq.get(seq)
        rows.append({
            "序号": f"#{seq}",
            "批次": r.get("材料批次", ""),
            "初始浓度_原始": r.get("初始浓度", ""),
            "平衡浓度_原始": r.get("平衡浓度", ""),
            "温度_原始": r.get("温度", ""),
            "反应时间_原始": r.get("反应时间", ""),
            "C0(mg/L)": c["C0_mg_L"] if c is not None else np.nan,
            "Ce(mg/L)": c["Ce_mg_L"] if c is not None else np.nan,
            "T(K)": c["温度_K"] if c is not None else np.nan,
            "t(h)": c["反应时间_h"] if c is not None else np.nan,
            "qe(mg/g)": c["qe_mg_g"] if c is not None else np.nan,
        })
    return pd.DataFrame(rows)


def run_sensitivity(
    batch_id: str,
    subset: pd.DataFrame,
    baseline_lang: FitResult,
    baseline_fre: FitResult,
    baseline_better: str,
    traces: List[TraceLog],
) -> Tuple[Dict[str, Dict], bool, str]:
    scenarios = {}
    changed = False
    reasons = []

    # 找到这个批次里时间漏记的行
    time_leak_rows = []
    for t in traces:
        if t.category == "时间漏记" and t.row_id in [f"#{int(x)}" for x in subset["序号"].tolist()]:
            time_leak_rows.append(t.row_id)

    if not time_leak_rows:
        return scenarios, False, ""

    subset_ids = set([f"#{int(x)}" for x in subset["序号"].tolist()])
    leak_subset_ids = [rid for rid in time_leak_rows if rid in subset_ids]
    if not leak_subset_ids:
        return scenarios, False, ""

    # 场景A：假设漏记的是12h（只有平衡吸附量的80%）
    frac_80 = 0.80
    mask = subset["序号"].isin([int(x[1:]) for x in leak_subset_ids])
    Ce_A = subset["Ce_mg_L"].values.copy()
    qe_A = subset["qe_mg_g"].values.copy()
    qe_A[mask.values] *= frac_80
    # Ce需要反向修正：假设(C0-Ce)*V/m 变小，说明吸附量变小 -> Ce变大
    # Ce_A[mask] = C0 - (qe * m / V)
    m_g = (subset["投量_mg"].values / 1000.0)
    V_L = 0.05
    Ce_A[mask.values] = subset["C0_mg_L"].values[mask.values] - (qe_A[mask.values] * m_g[mask.values] / V_L)

    lang_A, fre_A, better_A = fit_both(Ce_A, qe_A)
    scenarios["假设漏记实际12h（qe×0.8）"] = {
        "Langmuir": {k: round(v, 4) for k, v in lang_A.params.items()},
        "Freundlich": {k: round(v, 4) for k, v in fre_A.params.items()},
        "R²_Langmuir": round(lang_A.r_squared, 5),
        "R²_Freundlich": round(fre_A.r_squared, 5),
        "更优模型": better_A,
    }

    # 如果更优模型变了或Qmax偏差>10%，标记结论改变
    if better_A != baseline_better:
        changed = True
        reasons.append(f"最优模型由{baseline_better}变为{better_A}")

    if baseline_lang.success and lang_A.success:
        qmax_base = baseline_lang.params.get("Qmax (mg/g)", 0)
        qmax_A = lang_A.params.get("Qmax (mg/g)", 0)
        diff_pct = abs(qmax_A - qmax_base) / max(qmax_base, 1e-6) * 100
        if diff_pct > 10:
            changed = True
            reasons.append(f"Langmuir Qmax变化{diff_pct:.1f}%（{qmax_base:.2f}→{qmax_A:.2f}）")

    # 场景B：假设漏记时间的那几条实际是未平衡的早期点，应该剔除
    Ce_B = subset.loc[~mask, "Ce_mg_L"].values
    qe_B = subset.loc[~mask, "qe_mg_g"].values
    if len(Ce_B) >= 3:
        lang_B, fre_B, better_B = fit_both(Ce_B, qe_B)
        scenarios["剔除漏记行（认为未平衡）"] = {
            "Langmuir": {k: round(v, 4) for k, v in lang_B.params.items()},
            "Freundlich": {k: round(v, 4) for k, v in fre_B.params.items()},
            "R²_Langmuir": round(lang_B.r_squared, 5),
            "R²_Freundlich": round(fre_B.r_squared, 5),
            "更优模型": better_B,
            "剩余点数": int(len(Ce_B)),
        }
        if better_B != baseline_better:
            changed = True
            reasons.append(f"剔除漏记后最优模型变为{better_B}")
        if baseline_lang.success and lang_B.success:
            qmax_base = baseline_lang.params.get("Qmax (mg/g)", 0)
            qmax_B = lang_B.params.get("Qmax (mg/g)", 0)
            diff_pct = abs(qmax_B - qmax_base) / max(qmax_base, 1e-6) * 100
            if diff_pct > 10:
                changed = True
                reasons.append(f"剔除后Qmax变化{diff_pct:.1f}%")

    # 场景C：ppm vs mg/L的敏感性（对补录单位不同的批次）
    # 如果该批次数据里存在ppm标注的单位，假设严格换算（ppm ≠ mg/L，比如密度校正）
    has_ppm = any("ppm" in str(x).lower() for x in subset.get("平衡浓度", []))
    if has_ppm:
        # 假设四环素溶液密度≈1.005 g/mL（稀溶液近似），1ppm = 1.005 mg/L
        density_factor = 1.005
        mask_ppm = subset["平衡浓度"].astype(str).str.lower().str.contains("ppm", na=False)
        Ce_C = subset["Ce_mg_L"].values.copy()
        Ce_C[mask_ppm.values] *= density_factor
        qe_C = (subset["C0_mg_L"].values - Ce_C) * V_L / m_g
        lang_C, fre_C, better_C = fit_both(Ce_C, qe_C)
        scenarios["ppm严格密度校正(×1.005)"] = {
            "Langmuir": {k: round(v, 4) for k, v in lang_C.params.items()},
            "Freundlich": {k: round(v, 4) for k, v in fre_C.params.items()},
            "R²_Langmuir": round(lang_C.r_squared, 5),
            "R²_Freundlich": round(fre_C.r_squared, 5),
            "更优模型": better_C,
        }

    return scenarios, changed, "；".join(reasons)


def run_full_analysis(
    cleaned: CleanedDataset,
    raw_df: pd.DataFrame,
) -> FullAnalysis:
    df = cleaned.df
    batches: Dict[str, BatchFit] = {}

    for bid in df["材料批次"].unique():
        sub = df[df["材料批次"] == bid].copy()
        Ce = sub["Ce_mg_L"].values
        qe = sub["qe_mg_g"].values

        lang, fre, better = fit_both(Ce, qe)
        alts, changed, reason = run_sensitivity(bid, sub, lang, fre, better, cleaned.traces)

        batches[bid] = BatchFit(
            batch_id=bid,
            subset=sub,
            baseline_lang=lang,
            baseline_fre=fre,
            baseline_better=better,
            alt_scenarios=alts,
            changed_conclusion=changed,
            change_reason=reason,
        )

    conc_trace = _build_concentration_trace(raw_df, cleaned)

    # 汇总时间漏记的影响
    time_leak_impact = []
    for bid, bf in batches.items():
        if bf.alt_scenarios:
            for sc_name, sc in bf.alt_scenarios.items():
                time_leak_impact.append({
                    "材料批次": bid,
                    "情景": sc_name,
                    "基线最优模型": bf.baseline_better,
                    "情景最优模型": sc.get("更优模型", ""),
                    "基线Langmuir_Qmax": (
                        round(bf.baseline_lang.params["Qmax (mg/g)"], 3)
                        if bf.baseline_lang.success else None
                    ),
                    "情景Langmuir_Qmax": (
                        round(sc["Langmuir"].get("Qmax (mg/g)", None), 3)
                        if "Qmax (mg/g)" in sc.get("Langmuir", {}) else None
                    ),
                    "是否改变结论": sc.get("更优模型", "") != bf.baseline_better,
                })

    overall = "本次分析包含{}批材料，其中{}批存在漏记/单位混用等边界情况，" \
              "已完成基线拟合与敏感性对比。".format(
                  len(batches),
                  sum(1 for b in batches.values() if b.changed_conclusion or b.alt_scenarios)
              )

    return FullAnalysis(
        batches=batches,
        concentration_trace=conc_trace,
        time_leak_impact=time_leak_impact,
        overall_conclusion=overall,
    )
