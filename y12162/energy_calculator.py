import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from config import config

@dataclass
class EnergyResult:
    raw_energy_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    section_energy: pd.DataFrame = field(default_factory=pd.DataFrame)
    train_energy: pd.DataFrame = field(default_factory=pd.DataFrame)
    loss_estimation: pd.DataFrame = field(default_factory=pd.DataFrame)
    summary: Dict = field(default_factory=dict)

def calculate_power(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    
    if "功率" not in df.columns:
        if "电压" in df.columns and "电流" in df.columns:
            df["功率"] = df["电压"] * df["电流"] / 1000
        else:
            df["功率"] = np.nan
    
    return df

def calculate_energy(df: pd.DataFrame, time_col: str = "时间") -> pd.DataFrame:
    if df.empty or "功率" not in df.columns:
        return df
    
    df = df.copy()
    df = df.sort_values(time_col).reset_index(drop=True)
    
    time_diff = df[time_col].diff().dt.total_seconds().fillna(0)
    
    df["能量(kWh)"] = df["功率"] * time_diff / 3600
    
    df["累计能量(kWh)"] = df["能量(kWh)"].cumsum()
    
    df["制动能量(kWh)"] = np.where(df["功率"] < 0, df["能量(kWh)"].abs(), 0)
    df["累计制动能量(kWh)"] = df["制动能量(kWh)"].cumsum()
    
    df["牵引能量(kWh)"] = np.where(df["功率"] > 0, df["能量(kWh)"], 0)
    df["累计牵引能量(kWh)"] = df["牵引能量(kWh)"].cumsum()
    
    return df

def detect_braking_phases(df: pd.DataFrame, time_col: str = "时间") -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    df = df.sort_values(time_col).reset_index(drop=True)
    
    df["加速度"] = df["速度"].diff() / df[time_col].diff().dt.total_seconds()
    
    df["制动阶段"] = (df["加速度"] < -0.1) & (df["速度"] > config.speed_threshold)
    
    phase_id = 0
    phase_ids = []
    in_phase = False
    
    for is_braking in df["制动阶段"]:
        if is_braking:
            if not in_phase:
                phase_id += 1
                in_phase = True
            phase_ids.append(phase_id)
        else:
            in_phase = False
            phase_ids.append(0)
    
    df["制动阶段ID"] = phase_ids
    
    return df

def aggregate_section_energy(
    df: pd.DataFrame,
    section_col: str = "区间",
    train_col: str = "列车号",
    time_col: str = "时间"
) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    
    group_cols = [train_col, section_col]
    if "坡度版本" in df.columns:
        group_cols.append("坡度版本")
    if "运行方向" in df.columns:
        group_cols.append("运行方向")
    
    agg_dict = {
        "能量(kWh)": ["sum", "mean", "max"],
        "制动能量(kWh)": ["sum", "mean", "max"],
        "牵引能量(kWh)": ["sum", "mean", "max"],
        "速度": ["mean", "max", "min"],
        "功率": ["mean", "max", "min"],
        time_col: ["min", "max", "count"]
    }
    
    grouped = df.groupby(group_cols).agg(agg_dict).reset_index()
    
    grouped.columns = [
        "列车号", "区间", 
        *([c for c in group_cols if c not in [train_col, section_col]]),
        "总能量(kWh)", "平均能量(kWh)", "峰值能量(kWh)",
        "总制动能量(kWh)", "平均制动能量(kWh)", "峰值制动能量(kWh)",
        "总牵引能量(kWh)", "平均牵引能量(kWh)", "峰值牵引能量(kWh)",
        "平均速度(km/h)", "最高速度(km/h)", "最低速度(km/h)",
        "平均功率(kW)", "最大功率(kW)", "最小功率(kW)",
        "开始时间", "结束时间", "数据点数"
    ]
    
    grouped["运行时长(分钟)"] = (grouped["结束时间"] - grouped["开始时间"]).dt.total_seconds() / 60
    grouped["能量回收率(%)"] = (grouped["总制动能量(kWh)"] / grouped["总牵引能量(kWh)"].replace(0, np.nan)) * 100
    grouped["能量回收率(%)"] = grouped["能量回收率(%)"].fillna(0).round(2)
    
    return grouped

def aggregate_train_energy(
    df: pd.DataFrame,
    train_col: str = "列车号",
    time_col: str = "时间"
) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    
    agg_dict = {
        "能量(kWh)": "sum",
        "制动能量(kWh)": "sum",
        "牵引能量(kWh)": "sum",
        "速度": "mean",
        time_col: ["min", "max", "count"]
    }
    
    grouped = df.groupby(train_col).agg(agg_dict).reset_index()
    
    grouped.columns = [
        "列车号",
        "总能量(kWh)",
        "总制动能量(kWh)",
        "总牵引能量(kWh)",
        "平均速度(km/h)",
        "最早时间",
        "最晚时间",
        "数据点数"
    ]
    
    grouped["运行时长(分钟)"] = (grouped["最晚时间"] - grouped["最早时间"]).dt.total_seconds() / 60
    grouped["能量回收率(%)"] = (grouped["总制动能量(kWh)"] / grouped["总牵引能量(kWh)"].replace(0, np.nan)) * 100
    grouped["能量回收率(%)"] = grouped["能量回收率(%)"].fillna(0).round(2)
    
    return grouped

def estimate_losses(
    df: pd.DataFrame,
    section_col: str = "区间",
    train_col: str = "列车号"
) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    
    group_cols = [train_col, section_col]
    
    results = []
    
    for (train, section), group in df.groupby(group_cols):
        total_braking = group["制动能量(kWh)"].sum()
        total_traction = group["牵引能量(kWh)"].sum()
        
        line_loss_rate = 0.08
        auxiliary_loss_rate = 0.05
        mechanical_loss_rate = 0.12
        
        regenerated_energy = total_braking * (1 - line_loss_rate - auxiliary_loss_rate)
        available_energy = regenerated_energy * (1 - mechanical_loss_rate)
        
        results.append({
            "列车号": train,
            "区间": section,
            "理论制动能量(kWh)": total_braking,
            "线路损耗(kWh)": total_braking * line_loss_rate,
            "辅助损耗(kWh)": total_braking * auxiliary_loss_rate,
            "机械损耗(kWh)": regenerated_energy * mechanical_loss_rate,
            "总损耗(kWh)": total_braking * line_loss_rate + total_braking * auxiliary_loss_rate + regenerated_energy * mechanical_loss_rate,
            "实际可回收能量(kWh)": available_energy,
            "回收效率(%)": (available_energy / total_traction * 100) if total_traction > 0 else 0
        })
    
    loss_df = pd.DataFrame(results)
    loss_df["回收效率(%)"] = loss_df["回收效率(%)"].round(2)
    
    return loss_df

def calculate_regenerative_braking_energy(df: pd.DataFrame) -> EnergyResult:
    if df.empty:
        return EnergyResult()
    
    df = df.copy()
    
    df = calculate_power(df)
    df = calculate_energy(df)
    df = detect_braking_phases(df)
    
    section_energy = aggregate_section_energy(df)
    train_energy = aggregate_train_energy(df)
    loss_estimation = estimate_losses(df)
    
    summary = {
        "总数据点": len(df),
        "总列车数": df["列车号"].nunique(),
        "总区间数": df["区间"].nunique(),
        "总制动能量(kWh)": df["制动能量(kWh)"].sum().round(2),
        "总牵引能量(kWh)": df["牵引能量(kWh)"].sum().round(2),
        "平均能量回收率(%)": (df["制动能量(kWh)"].sum() / df["牵引能量(kWh)"].sum() * 100 
                            if df["牵引能量(kWh)"].sum() > 0 else 0).round(2),
        "制动阶段数": df[df["制动阶段ID"] > 0]["制动阶段ID"].nunique()
    }
    
    return EnergyResult(
        raw_energy_data=df,
        section_energy=section_energy,
        train_energy=train_energy,
        loss_estimation=loss_estimation,
        summary=summary
    )

def get_energy_by_train(energy_result: EnergyResult, train_no: str) -> Dict:
    train_data = energy_result.raw_energy_data[
        energy_result.raw_energy_data["列车号"] == train_no
    ]
    
    train_summary = energy_result.train_energy[
        energy_result.train_energy["列车号"] == train_no
    ]
    
    section_data = energy_result.section_energy[
        energy_result.section_energy["列车号"] == train_no
    ]
    
    loss_data = energy_result.loss_estimation[
        energy_result.loss_estimation["列车号"] == train_no
    ]
    
    return {
        "train_data": train_data,
        "train_summary": train_summary.to_dict("records")[0] if not train_summary.empty else {},
        "section_data": section_data,
        "loss_data": loss_data
    }

def get_energy_by_section(energy_result: EnergyResult, section: str) -> Dict:
    section_raw = energy_result.raw_energy_data[
        energy_result.raw_energy_data["区间"] == section
    ]
    
    section_summary = energy_result.section_energy[
        energy_result.section_energy["区间"] == section
    ]
    
    loss_data = energy_result.loss_estimation[
        energy_result.loss_estimation["区间"] == section
    ]
    
    return {
        "raw_data": section_raw,
        "section_summary": section_summary,
        "loss_data": loss_data
    }
