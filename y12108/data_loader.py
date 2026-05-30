import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import warnings
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass
class DataValidationIssue:
    type: str
    severity: str
    message: str
    details: dict = field(default_factory=dict)


@dataclass
class TimeSeriesData:
    raw_data: pd.DataFrame
    processed_data: pd.DataFrame
    metadata: Dict
    issues: List[DataValidationIssue] = field(default_factory=list)
    sampling_gaps: pd.DataFrame = field(default_factory=pd.DataFrame)


class TimeSeriesLoader:
    def __init__(self, expected_freq: str = 'H', timezone: str = 'Asia/Shanghai'):
        self.expected_freq = expected_freq
        self.timezone = timezone
        self.freq_mapping = {
            'H': timedelta(hours=1),
            'D': timedelta(days=1),
            '30min': timedelta(minutes=30),
            '15min': timedelta(minutes=15),
            '5min': timedelta(minutes=5),
            'T': timedelta(minutes=1)
        }

    def load_csv(self, file_path: str, timestamp_col: str = 'timestamp',
                 value_col: str = 'value', metric_name: Optional[str] = None) -> TimeSeriesData:
        df = pd.read_csv(file_path)
        return self._process_data(df, timestamp_col, value_col, metric_name or file_path)

    def load_dataframe(self, df: pd.DataFrame, timestamp_col: str = 'timestamp',
                       value_col: str = 'value', metric_name: str = 'metric') -> TimeSeriesData:
        return self._process_data(df.copy(), timestamp_col, value_col, metric_name)

    def _process_data(self, df: pd.DataFrame, timestamp_col: str,
                      value_col: str, metric_name: str) -> TimeSeriesData:
        issues = []
        raw_data = df.copy()

        if timestamp_col not in df.columns:
            raise ValueError(f"时间戳列 '{timestamp_col}' 不存在于数据中")
        if value_col not in df.columns:
            raise ValueError(f"数值列 '{value_col}' 不存在于数据中")

        df[timestamp_col] = pd.to_datetime(df[timestamp_col])

        if df[timestamp_col].dt.tz is None:
            df[timestamp_col] = df[timestamp_col].dt.tz_localize(self.timezone)
            issues.append(DataValidationIssue(
                type='timezone_missing',
                severity='warning',
                message=f'原始数据无时区信息，已自动设置为 {self.timezone}',
                details={'action': 'auto_set', 'timezone': self.timezone}
            ))
        else:
            original_tz = str(df[timestamp_col].dt.tz)
            if original_tz != self.timezone:
                df[timestamp_col] = df[timestamp_col].dt.tz_convert(self.timezone)
                issues.append(DataValidationIssue(
                    type='timezone_converted',
                    severity='info',
                    message=f'时区已从 {original_tz} 转换为 {self.timezone}',
                    details={'from': original_tz, 'to': self.timezone}
                ))

        df = df.sort_values(timestamp_col).reset_index(drop=True)

        duplicate_mask = df.duplicated(subset=[timestamp_col], keep=False)
        if duplicate_mask.any():
            dup_count = duplicate_mask.sum()
            issues.append(DataValidationIssue(
                type='duplicate_timestamps',
                severity='high',
                message=f'发现 {dup_count} 条重复时间戳记录',
                details={'duplicate_rows': df[duplicate_mask].to_dict('records')}
            ))
            df = df.drop_duplicates(subset=[timestamp_col], keep='first')

        df = df.rename(columns={timestamp_col: 'timestamp', value_col: 'value'})
        df = df[['timestamp', 'value']]

        sampling_gaps = self._check_sampling_continuity(df)

        if not sampling_gaps.empty:
            issues.append(DataValidationIssue(
                type='sampling_gaps',
                severity='high',
                message=f'发现 {len(sampling_gaps)} 处采样中断，总计缺失 {sampling_gaps["missing_points"].sum()} 个数据点',
                details={'total_missing': int(sampling_gaps["missing_points"].sum())}
            ))

        if df['value'].isnull().any():
            null_count = df['value'].isnull().sum()
            issues.append(DataValidationIssue(
                type='null_values',
                severity='medium',
                message=f'发现 {null_count} 条空值记录',
                details={'null_count': int(null_count)}
            ))

        metadata = {
            'metric_name': metric_name,
            'time_range': (df['timestamp'].min(), df['timestamp'].max()),
            'total_points': len(df),
            'expected_frequency': self.expected_freq,
            'timezone': self.timezone
        }

        return TimeSeriesData(
            raw_data=raw_data,
            processed_data=df,
            metadata=metadata,
            issues=issues,
            sampling_gaps=sampling_gaps
        )

    def _check_sampling_continuity(self, df: pd.DataFrame) -> pd.DataFrame:
        if len(df) < 2:
            return pd.DataFrame()

        expected_delta = self.freq_mapping.get(self.expected_freq)
        if expected_delta is None:
            return pd.DataFrame()

        df = df.sort_values('timestamp').reset_index(drop=True)
        time_diff = df['timestamp'].diff().dropna()
        expected_diff = pd.Timedelta(expected_delta)

        gap_mask = time_diff > expected_diff * 1.5

        if not gap_mask.any():
            return pd.DataFrame()

        gap_indices = gap_mask[gap_mask].index

        gaps = []
        for idx in gap_indices:
            gap_start = df.loc[idx - 1, 'timestamp']
            gap_end = df.loc[idx, 'timestamp']
            actual_gap = gap_end - gap_start
            missing_points = int(actual_gap / expected_diff) - 1

            gaps.append({
                'gap_start': gap_start,
                'gap_end': gap_end,
                'duration': actual_gap,
                'missing_points': missing_points,
                'before_value': df.loc[idx - 1, 'value'],
                'after_value': df.loc[idx, 'value']
            })

        return pd.DataFrame(gaps)
