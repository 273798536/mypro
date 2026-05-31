import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

from config import config

@dataclass
class QualityResult:
    valid_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    current_missing_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    duplicate_section_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    wrong_slope_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    quality_report: Dict = field(default_factory=dict)
    
    def __post_init__(self):
        if self.current_missing_data.empty:
            self.current_missing_data = pd.DataFrame(columns=[
                "开始时间", "结束时间", "缺失点数", "缺失时长(秒)", "平均速度", "区间", "列车号"
            ])
        if self.duplicate_section_data.empty:
            self.duplicate_section_data = pd.DataFrame(columns=[
                "区间", "列车号", "出现次数", "时间范围", "坡度版本", "处理建议"
            ])
        if self.wrong_slope_data.empty:
            self.wrong_slope_data = pd.DataFrame(columns=[
                "区间", "当前坡度版本", "期望坡度版本", "出现次数", "行号范围"
            ])

def detect_current_missing(
    df: pd.DataFrame,
    current_col: str = "电流",
    time_col: str = "时间",
    threshold: Optional[float] = None,
    max_gap: Optional[int] = None
) -> Tuple[pd.DataFrame, pd.DataFrame, List[Dict]]:
    threshold = threshold or config.current_threshold
    max_gap = max_gap or config.current_missing_max_gap
    
    if df.empty:
        return df, pd.DataFrame(), []
    
    df_sorted = df.sort_values(time_col).reset_index(drop=True)
    
    current_missing_mask = (
        df_sorted[current_col].isna() | 
        (df_sorted[current_col].abs() < threshold)
    )
    
    missing_groups = []
    current_group = None
    
    for idx, (is_missing, row) in enumerate(zip(current_missing_mask, df_sorted.itertuples())):
        if is_missing:
            if current_group is None:
                current_group = {
                    "start_idx": idx,
                    "end_idx": idx,
                    "start_time": getattr(row, time_col),
                    "end_time": getattr(row, time_col),
                    "count": 1,
                    "speeds": [getattr(row, "速度", 0)],
                    "section": getattr(row, "区间", ""),
                    "train_no": getattr(row, "列车号", "")
                }
            else:
                current_group["end_idx"] = idx
                current_group["end_time"] = getattr(row, time_col)
                current_group["count"] += 1
                current_group["speeds"].append(getattr(row, "速度", 0))
        else:
            if current_group is not None and current_group["count"] >= max_gap:
                missing_groups.append(current_group)
            current_group = None
    
    if current_group is not None and current_group["count"] >= max_gap:
        missing_groups.append(current_group)
    
    missing_records = []
    missing_indices = []
    
    for group in missing_groups:
        time_diff = (group["end_time"] - group["start_time"]).total_seconds()
        avg_speed = np.mean(group["speeds"])
        
        missing_records.append({
            "开始时间": group["start_time"],
            "结束时间": group["end_time"],
            "缺失点数": group["count"],
            "缺失时长(秒)": time_diff,
            "平均速度": avg_speed,
            "区间": group["section"],
            "列车号": group["train_no"]
        })
        
        missing_indices.extend(range(group["start_idx"], group["end_idx"] + 1))
    
    missing_df = pd.DataFrame(missing_records)
    valid_df = df_sorted.drop(index=missing_indices).reset_index(drop=True)
    missing_detail_df = df_sorted.loc[missing_indices].reset_index(drop=True) if missing_indices else pd.DataFrame()
    
    return valid_df, missing_df, missing_groups

def detect_duplicate_sections(
    df: pd.DataFrame,
    section_col: str = "区间",
    train_col: str = "列车号",
    time_col: str = "时间",
    window_seconds: Optional[int] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    window_seconds = window_seconds or config.duplicate_section_window
    
    if df.empty:
        return df, pd.DataFrame()
    
    df_sorted = df.sort_values([train_col, time_col]).reset_index(drop=True)
    
    duplicates = []
    
    for (train, section), group in df_sorted.groupby([train_col, section_col]):
        if len(group) < 2:
            continue
        
        times = group[time_col].sort_values().values
        pass_count = 0
        last_pass_end = None
        current_pass_start = times[0]
        
        for i in range(1, len(times)):
            time_diff = (times[i] - times[i-1]).astype('timedelta64[s]').astype(int)
            
            if time_diff > window_seconds:
                pass_count += 1
                if pass_count >= 2:
                    slope_version = group.iloc[0].get("坡度版本", "未知")
                    duplicates.append({
                        "区间": section,
                        "列车号": train,
                        "出现次数": pass_count,
                        "时间范围": f"{current_pass_start} - {times[i-1]}",
                        "坡度版本": slope_version,
                        "处理建议": "请工程师复核站间重复数据"
                    })
                    break
                current_pass_start = times[i]
        
        pass_count += 1
        if pass_count >= 2:
            slope_version = group.iloc[0].get("坡度版本", "未知")
            duplicates.append({
                "区间": section,
                "列车号": train,
                "出现次数": pass_count,
                "时间范围": f"{current_pass_start} - {times[-1]}",
                "坡度版本": slope_version,
                "处理建议": "请工程师复核站间重复数据"
            })
    
    duplicates_df = pd.DataFrame(duplicates)
    
    return df_sorted, duplicates_df

def detect_wrong_slope_version(
    df: pd.DataFrame,
    section_col: str = "区间",
    slope_version_col: str = "坡度版本"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if df.empty or slope_version_col not in df.columns:
        return df, pd.DataFrame()
    
    slope_issues = []
    
    for section, group in df.groupby(section_col):
        versions = group[slope_version_col].dropna().unique()
        
        if len(versions) > 1:
            version_counts = group[slope_version_col].value_counts()
            expected_version = version_counts.index[0]
            
            for version in versions[1:]:
                wrong_rows = group[group[slope_version_col] == version]
                slope_issues.append({
                    "区间": section,
                    "当前坡度版本": version,
                    "期望坡度版本": expected_version,
                    "出现次数": len(wrong_rows),
                    "行号范围": f"{wrong_rows.index.min() + 2} - {wrong_rows.index.max() + 2}"
                })
    
    slope_issues_df = pd.DataFrame(slope_issues)
    return df, slope_issues_df

def run_quality_checks(df: pd.DataFrame) -> QualityResult:
    report = {}
    
    report["initial_rows"] = len(df)
    
    valid_df, current_missing_df, _ = detect_current_missing(df)
    report["current_missing_groups"] = len(current_missing_df)
    report["rows_removed_current_missing"] = report["initial_rows"] - len(valid_df)
    
    valid_df, duplicate_df = detect_duplicate_sections(valid_df)
    report["duplicate_sections"] = len(duplicate_df)
    
    valid_df, slope_df = detect_wrong_slope_version(valid_df)
    report["wrong_slope_versions"] = len(slope_df)
    
    report["final_valid_rows"] = len(valid_df)
    report["total_issues"] = (
        report["current_missing_groups"] + 
        report["duplicate_sections"] + 
        report["wrong_slope_versions"]
    )
    
    return QualityResult(
        valid_data=valid_df,
        current_missing_data=current_missing_df,
        duplicate_section_data=duplicate_df,
        wrong_slope_data=slope_df,
        quality_report=report
    )

def filter_by_current_missing(df: pd.DataFrame, train_no: Optional[str] = None) -> pd.DataFrame:
    result = run_quality_checks(df)
    missing_df = result.current_missing_data
    
    if train_no:
        missing_df = missing_df[missing_df["列车号"] == train_no]
    
    return missing_df

def filter_by_duplicate_section(df: pd.DataFrame, section: Optional[str] = None) -> pd.DataFrame:
    result = run_quality_checks(df)
    dup_df = result.duplicate_section_data
    
    if section:
        dup_df = dup_df[dup_df["区间"] == section]
    
    return dup_df
