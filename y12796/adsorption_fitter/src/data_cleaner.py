import re
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Any, Optional


@dataclass
class TraceLog:
    level: str
    category: str
    row_id: Any
    field: str
    before: Any
    after: Any
    reason: str
    consequence: str = ""


@dataclass
class CleanedDataset:
    df: pd.DataFrame
    traces: List[TraceLog]
    batch_issues: Dict[str, Any]
    removed_rows: List[int]

    def summary(self):
        errors = [t for t in self.traces if t.level == "ERROR"]
        warns = [t for t in self.traces if t.level == "WARN"]
        infos = [t for t in self.traces if t.level == "INFO"]
        return {
            "总行数": len(self.df),
            "删除行数": len(self.removed_rows),
            "错误": len(errors),
            "警告": len(warns),
            "提示": len(infos),
        }


def _parse_value_unit(cell: str) -> Tuple[float, Optional[str]]:
    if pd.isna(cell):
        return np.nan, None
    s = str(cell).strip()
    if not s:
        return np.nan, None
    m = re.match(r"^\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([^\d]*)\s*$", s)
    if not m:
        try:
            return float(s), None
        except ValueError:
            return np.nan, None
    val = float(m.group(1))
    unit = m.group(2).strip() if m.group(2) else None
    return val, unit


def _normalize_concentration(val: float, unit: Optional[str]) -> Tuple[float, Optional[str]]:
    if unit is None or unit == "":
        return val, "mg/L (未标注，按mg/L计)"
    u = unit.lower().replace(" ", "")
    if u in ("mg/l", "mg·l⁻¹", "mg·L⁻¹".lower()):
        return val, "mg/L"
    if u in ("ppm",):
        return val, "ppm ≈ mg/L（水溶液近似）"
    if u in ("μg/ml", "ug/ml", "μg·mL⁻¹".lower()):
        return val, "μg/mL ≡ mg/L"
    if u in ("ppb",):
        return val / 1000.0, "ppb → mg/L（÷1000）"
    return val, f"{unit}（未识别，原值保留）"


def _normalize_temperature(val: float, unit: Optional[str]) -> Tuple[float, Optional[str]]:
    if unit is None or unit == "":
        return val, "K (未标注，按K计)"
    u = unit.strip().replace(" ", "")
    if u in ("K", "°K", "Kelvins"):
        return val, "K"
    if u in ("℃", "°C", "C", "摄氏度"):
        return val + 273.15, f"℃({val:.2f}) → K"
    return val, f"{unit}（未识别，原值保留）"


def _normalize_time(val: float, unit: Optional[str]) -> Tuple[float, Optional[str]]:
    if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
        return np.nan, None
    if unit is None or unit == "":
        return float(val), "h (未标注，按h计)"
    u = unit.strip().lower().replace(" ", "")
    if u in ("h", "hr", "hrs", "hour", "hours"):
        return float(val), "h"
    if u in ("min", "mins", "minute", "minutes"):
        return float(val) / 60.0, f"min({val}) → h（÷60）"
    if u in ("s", "sec", "secs", "second", "seconds"):
        return float(val) / 3600.0, f"s({val}) → h（÷3600）"
    return float(val), f"{unit}（未识别，原值保留）"


def _parse_mass(val_unit_str):
    val, unit = _parse_value_unit(str(val_unit_str))
    if pd.isna(val):
        return np.nan, None
    if unit is None:
        return val, "mg (未标注，按mg计)"
    u = unit.strip().lower().replace(" ", "")
    if u in ("mg",):
        return val, "mg"
    if u in ("g",):
        return val * 1000.0, f"g({val}) → mg（×1000）"
    return val, f"{unit}（未识别，原值保留）"


def clean_raw_data(
    raw_path: str,
    batch_path: Optional[str] = None,
    ledger_path: Optional[str] = None,
) -> CleanedDataset:
    df = pd.read_csv(raw_path)
    traces: List[TraceLog] = []
    removed_rows: List[int] = []
    batch_issues: Dict[str, Any] = {"重复批号": [], "漏记时间": [], "异常值": []}

    raw_df = df.copy()

    # 先查批次报告的重复
    if batch_path:
        bdf = pd.read_csv(batch_path)
        dup = bdf[bdf.duplicated(subset=["批次编号"], keep=False)]
        if not dup.empty:
            for bid in dup["批次编号"].unique():
                rows = bdf[bdf["批次编号"] == bid]
                batch_issues["重复批号"].append({
                    "批号": bid,
                    "出现次数": len(rows),
                    "详情": [
                        {
                            "行号": i + 2,
                            "合成日期": r["合成日期"],
                            "合成人": r["合成人"],
                            "实际产量": r["实际产量(g)"] if "实际产量(g)" in r else "?",
                            "备注": r.get("备注", ""),
                        }
                        for i, r in rows.iterrows()
                    ],
                })

    ce_raw_vals = []
    ce_norm_vals = []
    c0_norm_vals = []
    t_norm_vals = []
    time_norm_vals = []
    mass_norm_vals = []

    for idx, row in df.iterrows():
        row_label = f"#{row.get('序号', idx+1)}"

        c0_raw = row.get("初始浓度", "")
        ce_raw = row.get("平衡浓度", "")
        t_raw = row.get("温度", "")
        time_raw = row.get("反应时间", "")
        mass_raw = row.get("吸附剂投量", "")

        # --- 初始浓度 C0 ---
        c0_v, c0_u = _parse_value_unit(str(c0_raw))
        c0_new, c0_reason = _normalize_concentration(c0_v, c0_u)
        if pd.notna(c0_v) and c0_reason and "未标注" not in c0_reason and "未识别" not in c0_reason:
            traces.append(TraceLog("INFO", "单位换算", row_label, "初始浓度",
                                   c0_raw, f"{c0_new:.4f} mg/L 当量", c0_reason))
        c0_norm_vals.append(c0_new if pd.notna(c0_new) else np.nan)

        # --- 平衡浓度 Ce ---
        ce_v, ce_u = _parse_value_unit(str(ce_raw))
        ce_raw_vals.append((row_label, ce_raw, ce_v, ce_u))
        ce_new, ce_reason = _normalize_concentration(ce_v, ce_u)
        if pd.notna(ce_v) and ce_reason and "未标注" not in ce_reason and "未识别" not in ce_reason:
            traces.append(TraceLog("INFO", "单位换算", row_label, "平衡浓度",
                                   ce_raw, f"{ce_new:.4f} mg/L 当量", ce_reason))
        ce_norm_vals.append(ce_new if pd.notna(ce_new) else np.nan)

        # --- 温度 ---
        t_v, t_u = _parse_value_unit(str(t_raw))
        t_new, t_reason = _normalize_temperature(t_v, t_u)
        if pd.notna(t_v) and t_reason and ("℃" in t_reason or "未标注" in t_reason or "未识别" in t_reason):
            traces.append(TraceLog("INFO", "单位换算", row_label, "温度",
                                   t_raw, f"{t_new:.2f} K", t_reason))
        t_norm_vals.append(t_new if pd.notna(t_new) else np.nan)

        # --- 反应时间 ---
        if pd.isna(time_raw) or str(time_raw).strip() == "" or str(time_raw) == "nan":
            traces.append(TraceLog("WARN", "时间漏记", row_label, "反应时间",
                                   "(空)", "默认24 h",
                                   "未填写反应时间，由备注或课题组惯例补填",
                                   "吸附是动力学敏感过程，若实际未达平衡会使qe偏小、Qmax拟合偏低"))
            time_new = 24.0
            time_reason_display = "漏记，补填24h"
            batch_issues["漏记时间"].append({
                "行号": row_label,
                "材料批次": row.get("材料批次", "?"),
                "平衡浓度原始": ce_raw,
                "备注": row.get("备注", ""),
            })
        else:
            time_v, time_u = _parse_value_unit(str(time_raw))
            time_new, time_reason = _normalize_time(time_v, time_u)
            time_reason_display = time_reason
            if time_reason and "未标注" not in time_reason and "未识别" not in time_reason and "÷" in time_reason:
                traces.append(TraceLog("INFO", "单位换算", row_label, "反应时间",
                                       time_raw, f"{time_new:.4f} h", time_reason))
        time_norm_vals.append(time_new if pd.notna(time_new) else np.nan)

        # --- 吸附剂投量 ---
        m_v, m_reason = _parse_mass(mass_raw)
        if m_reason and "未标注" not in m_reason and "未识别" not in m_reason and "×" in m_reason:
            traces.append(TraceLog("INFO", "单位换算", row_label, "吸附剂投量",
                                   mass_raw, f"{m_v:.2f} mg", m_reason))
        mass_norm_vals.append(m_v if pd.notna(m_v) else np.nan)

    df["C0_mg_L"] = c0_norm_vals
    df["Ce_mg_L"] = ce_norm_vals
    df["温度_K"] = t_norm_vals
    df["反应时间_h"] = time_norm_vals
    df["投量_mg"] = mass_norm_vals

    # 计算吸附量 qe = (C0 - Ce) * V / m，默认V=50mL=0.05L
    V_L = 0.05
    df["qe_mg_g"] = (df["C0_mg_L"] - df["Ce_mg_L"]) * V_L / (df["投量_mg"] / 1000.0)

    # 异常检测：吸光度异常、修正标记、浓度异常
    to_remove = set()
    for idx, row in df.iterrows():
        row_label = f"#{row.get('序号', idx+1)}"
        note = str(row.get("备注", ""))
        abs_val = row.get("吸光度", np.nan)

        # 1) 明确标注的异常记录
        if "异常" in note and "重测见" in note:
            traces.append(TraceLog("ERROR", "异常值剔除", row_label, "吸光度",
                                   abs_val, "(删除该行)",
                                   f"备注明确标记异常：{note}",
                                   "该点Ce/qe将不参与拟合，保留原始记录供追溯"))
            to_remove.add(idx)
            batch_issues["异常值"].append({
                "行号": row_label,
                "原因": "备注标注异常，已剔除",
                "原值": f"Ce={row.get('平衡浓度')}, A={abs_val}",
            })
            continue

        # 2) 明确标注的修正记录（保留修正，标记替换关系）
        if "修正" in note:
            traces.append(TraceLog("INFO", "修正记录", row_label, "数据来源",
                                   "(替换前序异常点)", "采用该行",
                                   f"备注：{note}"))

        # 3) 吸光度物理范围检查
        try:
            a = float(abs_val)
            if a > 4.0 and "稀释" not in note:
                traces.append(TraceLog("WARN", "异常值警示", row_label, "吸光度",
                                       abs_val, "保留但警示",
                                       f"吸光度={a}超出常规量程（0~3），且未标注稀释，怀疑比色皿/操作问题",
                                       "如该点显著偏离拟合曲线，建议人工复核或剔除"))
        except (ValueError, TypeError):
            pass

        # 4) qe 合理性检查
        if pd.notna(row["qe_mg_g"]):
            if row["qe_mg_g"] < 0:
                traces.append(TraceLog("WARN", "异常值警示", row_label, "qe",
                                       f"{row['qe_mg_g']:.3f} mg/g", "保留但警示",
                                       "平衡浓度高于初始浓度，可能是空白样污染或稀释计算错误",
                                       "负吸附量在热力学上不可能，建议复核原始谱图"))
            elif row["qe_mg_g"] > 2000:
                traces.append(TraceLog("WARN", "异常值警示", row_label, "qe",
                                       f"{row['qe_mg_g']:.1f} mg/g", "保留但警示",
                                       "吸附量超过2000 mg/g，超出常规MOF吸附量范围",
                                       "如非高容量特异材料，建议核对浓度-吸光度标准曲线"))

    removed_rows = sorted(to_remove)
    df_clean = df.drop(index=removed_rows).reset_index(drop=True)

    # 批号重复关联分析：如果某批号在报告里重复，标记对应数据
    if batch_issues["重复批号"]:
        for dup in batch_issues["重复批号"]:
            bid = dup["批号"]
            matches = df_clean[df_clean["材料批次"] == bid]
            if not matches.empty:
                dup["关联数据行"] = [f"#{x}" for x in matches["序号"].tolist()]
                dup["提示"] = (
                    f"批次报告中【{bid}】出现{dup['出现次数']}次（不同投料），"
                    f"对应原始数据共{len(matches)}条。课题组需确认这{len(matches)}条"
                    f"是哪一次投料的结果，否则会把不同晶化条件的数据混在一起拟合。"
                )

    return CleanedDataset(
        df=df_clean,
        traces=traces,
        batch_issues=batch_issues,
        removed_rows=removed_rows,
    )
