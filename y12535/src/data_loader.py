import os
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Dict, List


@dataclass
class LoadedDataset:
    raw_df: pd.DataFrame
    processed_df: pd.DataFrame
    source_file: str
    time_column: str
    reading_columns: List[str]
    metadata: Dict = field(default_factory=dict)
    unit_info: Dict = field(default_factory=dict)


SUPPORTED_FORMATS = {
    '.csv': 'read_csv',
    '.xlsx': 'read_excel',
    '.xls': 'read_excel',
}


def detect_time_column(df: pd.DataFrame) -> Optional[str]:
    for col in df.columns:
        col_lower = str(col).lower()
        if any(k in col_lower for k in ['time', '时间', 'timestamp', 'datetime', '日期']):
            try:
                pd.to_datetime(df[col])
                return col
            except (ValueError, TypeError):
                continue
    return None


def detect_reading_columns(df: pd.DataFrame, time_col: str) -> List[str]:
    reading_cols = []
    for col in df.columns:
        if col == time_col:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            reading_cols.append(col)
    return reading_cols


def load_data(file_path: str,
              time_column: Optional[str] = None,
              reading_columns: Optional[List[str]] = None,
              unit_info: Optional[Dict] = None,
              **kwargs) -> LoadedDataset:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"不支持的文件格式: {ext}，支持格式: {list(SUPPORTED_FORMATS.keys())}")

    reader = getattr(pd, SUPPORTED_FORMATS[ext])
    raw_df = reader(file_path, **kwargs)

    if raw_df.empty:
        raise ValueError("文件为空或无有效数据")

    detected_time_col = time_column or detect_time_column(raw_df)
    if not detected_time_col:
        raise ValueError("未检测到时间列，请手动指定 time_column 参数")

    try:
        raw_df[detected_time_col] = pd.to_datetime(raw_df[detected_time_col])
    except Exception as e:
        raise ValueError(f"时间列解析失败: {e}")

    detected_reading_cols = reading_columns or detect_reading_columns(raw_df, detected_time_col)
    if not detected_reading_cols:
        raise ValueError("未检测到数值读数列，请手动指定 reading_columns 参数")

    processed_df = raw_df.copy()

    default_units = {col: 'kW' for col in detected_reading_cols}
    if unit_info:
        default_units.update(unit_info)

    metadata = {
        'total_rows': len(raw_df),
        'time_span': {
            'start': raw_df[detected_time_col].min(),
            'end': raw_df[detected_time_col].max(),
        },
        'load_timestamp': pd.Timestamp.now(),
        'file_name': os.path.basename(file_path),
    }

    return LoadedDataset(
        raw_df=raw_df,
        processed_df=processed_df,
        source_file=file_path,
        time_column=detected_time_col,
        reading_columns=detected_reading_cols,
        metadata=metadata,
        unit_info=default_units,
    )


def save_raw_curve(dataset: LoadedDataset, output_dir: str = 'data/processed') -> str:
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(dataset.source_file))[0]
    output_path = os.path.join(output_dir, f'{base_name}_raw_curve.parquet')
    dataset.raw_df.to_parquet(output_path, index=False)
    return output_path
