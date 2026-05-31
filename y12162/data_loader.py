import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass, field

from config import config

@dataclass
class LoadedData:
    valid_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    bad_rows: pd.DataFrame = field(default_factory=pd.DataFrame)
    metadata: Dict = field(default_factory=dict)
    
    def __post_init__(self):
        if self.bad_rows.empty and not self.valid_data.empty:
            self.bad_rows = pd.DataFrame(columns=[
                "原始行号", "行内容", "问题类别", "问题描述", "处理方式"
            ])

def detect_file_encoding(file_path: Path) -> str:
    encodings = ["utf-8", "gbk", "gb2312", "utf-16", "latin1"]
    for enc in encodings:
        try:
            with open(file_path, "r", encoding=enc) as f:
                f.read(10000)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8"

def is_empty_row(row: pd.Series) -> bool:
    return row.isna().all() or (row.astype(str).str.strip() == "").all()

def is_remark_only_row(row: pd.Series, remark_col: str = "备注") -> bool:
    if remark_col not in row.index:
        return False
    remark_val = str(row[remark_col]).strip()
    if not remark_val or remark_val == "nan":
        return False
    other_cols = [c for c in row.index if c != remark_col]
    for col in other_cols:
        val = str(row[col]).strip()
        if val and val != "nan":
            return False
    return True

def has_missing_required_cols(row: pd.Series, required_cols: List[str]) -> Tuple[bool, List[str]]:
    missing = []
    for col in required_cols:
        if col not in row.index:
            missing.append(col)
        else:
            val = str(row[col]).strip()
            if not val or val == "nan":
                missing.append(col)
    return len(missing) > 0, missing

def load_csv_with_bad_rows(
    file_path: Path, 
    encoding: Optional[str] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if encoding is None:
        encoding = detect_file_encoding(file_path)
    
    bad_rows = []
    valid_chunks = []
    
    with open(file_path, "r", encoding=encoding) as f:
        lines = f.readlines()
    
    if not lines:
        return pd.DataFrame(), pd.DataFrame(columns=["原始行号", "行内容", "问题类别", "问题描述", "处理方式"])
    
    header_line = lines[0].strip()
    columns = [c.strip() for c in header_line.split(",")]
    
    for line_num, line in enumerate(lines[1:], start=2):
        line_stripped = line.strip()
        
        if not line_stripped:
            bad_rows.append({
                "原始行号": line_num,
                "行内容": "",
                "问题类别": "空行",
                "问题描述": "整行内容为空",
                "处理方式": "跳过"
            })
            continue
        
        values = [v.strip() for v in line_stripped.split(",")]
        
        if len(values) < len(columns):
            values.extend([""] * (len(columns) - len(values)))
        elif len(values) > len(columns):
            values = values[:len(columns)]
        
        row_dict = dict(zip(columns, values))
        row_series = pd.Series(row_dict)
        
        if is_empty_row(row_series):
            bad_rows.append({
                "原始行号": line_num,
                "行内容": line_stripped,
                "问题类别": "空行",
                "问题描述": "所有字段为空",
                "处理方式": "跳过"
            })
            continue
        
        if is_remark_only_row(row_series):
            bad_rows.append({
                "原始行号": line_num,
                "行内容": line_stripped,
                "问题类别": "仅备注",
                "问题描述": "只有备注字段有内容",
                "处理方式": "单独记录"
            })
            continue
        
        has_missing, missing_cols = has_missing_required_cols(row_series, config.required_columns)
        if has_missing:
            bad_rows.append({
                "原始行号": line_num,
                "行内容": line_stripped,
                "问题类别": "缺列",
                "问题描述": f"缺少必填列: {', '.join(missing_cols)}",
                "处理方式": "标记待复核"
            })
            continue
        
        valid_chunks.append(row_dict)
    
    valid_df = pd.DataFrame(valid_chunks)
    bad_rows_df = pd.DataFrame(bad_rows, columns=["原始行号", "行内容", "问题类别", "问题描述", "处理方式"])
    
    return valid_df, bad_rows_df

def load_excel_with_bad_rows(
    file_path: Path,
    sheet_name: str = 0
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)
    
    bad_rows = []
    valid_indices = []
    
    for idx, row in df.iterrows():
        line_num = idx + 2
        
        if is_empty_row(row):
            bad_rows.append({
                "原始行号": line_num,
                "行内容": "",
                "问题类别": "空行",
                "问题描述": "整行内容为空",
                "处理方式": "跳过"
            })
            continue
        
        if is_remark_only_row(row):
            bad_rows.append({
                "原始行号": line_num,
                "行内容": str(row.to_dict()),
                "问题类别": "仅备注",
                "问题描述": "只有备注字段有内容",
                "处理方式": "单独记录"
            })
            continue
        
        has_missing, missing_cols = has_missing_required_cols(row, config.required_columns)
        if has_missing:
            bad_rows.append({
                "原始行号": line_num,
                "行内容": str(row.to_dict()),
                "问题类别": "缺列",
                "问题描述": f"缺少必填列: {', '.join(missing_cols)}",
                "处理方式": "标记待复核"
            })
            continue
        
        valid_indices.append(idx)
    
    valid_df = df.loc[valid_indices].reset_index(drop=True)
    bad_rows_df = pd.DataFrame(bad_rows, columns=["原始行号", "行内容", "问题类别", "问题描述", "处理方式"])
    
    return valid_df, bad_rows_df

def convert_numeric_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict]]:
    conversion_errors = []
    
    numeric_cols = ["速度", "电流", "电压", "坡度", "载客量"]
    
    for col in numeric_cols:
        if col in df.columns:
            original_vals = df[col].copy()
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
            nan_indices = df[df[col].isna() & original_vals.notna()].index
            for idx in nan_indices:
                conversion_errors.append({
                    "行号": idx + 2,
                    "列名": col,
                    "原始值": original_vals.iloc[idx],
                    "问题描述": f"无法转换为数值: {original_vals.iloc[idx]}"
                })
    
    return df, conversion_errors

def convert_time_column(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict]]:
    time_errors = []
    
    if "时间" not in df.columns:
        return df, time_errors
    
    original_times = df["时间"].copy()
    
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%H:%M:%S", "%H:%M"]:
        try:
            df["时间"] = pd.to_datetime(df["时间"], format=fmt, errors="raise")
            return df, time_errors
        except (ValueError, TypeError):
            continue
    
    df["时间"] = pd.to_datetime(df["时间"], errors="coerce")
    nan_indices = df[df["时间"].isna() & original_times.notna()].index
    for idx in nan_indices:
        time_errors.append({
            "行号": idx + 2,
            "列名": "时间",
            "原始值": original_times.iloc[idx],
            "问题描述": f"无法解析时间格式: {original_times.iloc[idx]}"
        })
    
    return df, time_errors

def load_data(file_path: str) -> LoadedData:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    if path.suffix.lower() in [".csv", ".txt"]:
        valid_df, bad_rows_df = load_csv_with_bad_rows(path)
    elif path.suffix.lower() in [".xlsx", ".xls"]:
        valid_df, bad_rows_df = load_excel_with_bad_rows(path)
    else:
        raise ValueError(f"不支持的文件格式: {path.suffix}")
    
    if not valid_df.empty:
        valid_df, num_errors = convert_numeric_columns(valid_df)
        valid_df, time_errors = convert_time_column(valid_df)
        
        for err in num_errors + time_errors:
            bad_rows_df = pd.concat([bad_rows_df, pd.DataFrame([{
                "原始行号": err["行号"],
                "行内容": err["原始值"],
                "问题类别": "无效数据",
                "问题描述": err["问题描述"],
                "处理方式": "标记待复核"
            }])], ignore_index=True)
    
    metadata = {
        "文件名": path.name,
        "总行数": len(valid_df) + len(bad_rows_df),
        "有效行数": len(valid_df),
        "坏行数": len(bad_rows_df),
        "文件路径": str(path)
    }
    
    return LoadedData(
        valid_data=valid_df,
        bad_rows=bad_rows_df,
        metadata=metadata
    )

def get_bad_rows_by_category(bad_rows: pd.DataFrame, category: str) -> pd.DataFrame:
    return bad_rows[bad_rows["问题类别"] == category].reset_index(drop=True)

def get_bad_row_categories_summary(bad_rows: pd.DataFrame) -> pd.DataFrame:
    if bad_rows.empty:
        return pd.DataFrame(columns=["问题类别", "数量", "处理方式"])
    
    summary = bad_rows.groupby(["问题类别", "处理方式"]).size().reset_index(name="数量")
    summary = summary.sort_values("数量", ascending=False)
    return summary
