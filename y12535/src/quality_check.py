import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum

from .data_loader import LoadedDataset


class IssueType(Enum):
    MISSING_SAMPLE = "缺采样"
    TIME_OUT_OF_ORDER = "时间乱序"
    NEGATIVE_READING = "负值读数"
    NULL_READING = "空值读数"


class Severity(Enum):
    INFO = "提示"
    WARNING = "警告"
    ERROR = "错误"


@dataclass
class QualityIssue:
    issue_type: IssueType
    severity: Severity
    description: str
    row_indices: List[int] = field(default_factory=list)
    time_points: List[pd.Timestamp] = field(default_factory=list)
    affected_columns: List[str] = field(default_factory=list)
    count: int = 0
    details: Dict = field(default_factory=dict)


@dataclass
class QualityReport:
    issues: List[QualityIssue] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)
    data_quality_score: float = 100.0

    def has_issue_type(self, issue_type: IssueType) -> bool:
        return any(iss.issue_type == issue_type for iss in self.issues)

    def get_issues_by_type(self, issue_type: IssueType) -> List[QualityIssue]:
        return [iss for iss in self.issues if iss.issue_type == issue_type]


def infer_sampling_interval(df: pd.DataFrame, time_col: str) -> Optional[pd.Timedelta]:
    if len(df) < 2:
        return None
    sorted_times = df[time_col].sort_values()
    intervals = sorted_times.diff().dropna()
    if intervals.empty:
        return None
    interval_counts = intervals.value_counts()
    if not interval_counts.empty:
        return interval_counts.index[0]
    return intervals.median()


def check_time_order(df: pd.DataFrame, time_col: str) -> Optional[QualityIssue]:
    sorted_times = df[time_col].sort_values()
    out_of_order_mask = df[time_col].diff() < pd.Timedelta(0)
    out_of_order_indices = df.index[out_of_order_mask].tolist()

    if not out_of_order_indices:
        return None

    out_of_order_times = df.loc[out_of_order_indices, time_col].tolist()
    severity = Severity.ERROR if len(out_of_order_indices) > len(df) * 0.05 else Severity.WARNING

    return QualityIssue(
        issue_type=IssueType.TIME_OUT_OF_ORDER,
        severity=severity,
        description=f"检测到 {len(out_of_order_indices)} 处时间乱序，时间未按递增顺序排列",
        row_indices=out_of_order_indices,
        time_points=out_of_order_times,
        count=len(out_of_order_indices),
        details={
            "affected_rows_pct": round(len(out_of_order_indices) / len(df) * 100, 2),
            "first_occurrence": str(out_of_order_times[0]) if out_of_order_times else None,
        },
    )


def check_missing_samples(df: pd.DataFrame,
                          time_col: str,
                          expected_interval: Optional[pd.Timedelta] = None) -> Optional[QualityIssue]:
    if len(df) < 2:
        return None

    interval = expected_interval or infer_sampling_interval(df, time_col)
    if interval is None:
        return None

    sorted_times = df[time_col].sort_values().reset_index(drop=True)
    actual_intervals = sorted_times.diff().dropna()

    missing_mask = actual_intervals > interval * 1.5
    missing_positions = actual_intervals.index[missing_mask].tolist()

    if not missing_positions:
        return None

    missing_details = []
    total_missing_points = 0
    for pos in missing_positions:
        gap_start = sorted_times.iloc[pos - 1]
        gap_end = sorted_times.iloc[pos]
        gap_duration = gap_end - gap_start
        expected_points = int(gap_duration / interval) - 1
        total_missing_points += max(0, expected_points)
        missing_details.append({
            "gap_start": str(gap_start),
            "gap_end": str(gap_end),
            "gap_duration": str(gap_duration),
            "expected_missing_points": max(0, expected_points),
        })

    severity = Severity.ERROR if total_missing_points > len(df) * 0.1 else Severity.WARNING

    return QualityIssue(
        issue_type=IssueType.MISSING_SAMPLE,
        severity=severity,
        description=f"检测到 {len(missing_positions)} 处采样间隔异常，预计缺失约 {total_missing_points} 个采样点（预期间隔 {interval}）",
        row_indices=[],
        time_points=[],
        affected_columns=[time_col],
        count=total_missing_points,
        details={
            "expected_interval": str(interval),
            "total_missing_points": total_missing_points,
            "missing_gaps": missing_details,
            "affected_rows_pct": round(total_missing_points / (len(df) + total_missing_points) * 100, 2),
        },
    )


def check_negative_readings(df: pd.DataFrame,
                            reading_columns: List[str]) -> Optional[QualityIssue]:
    affected_cols = []
    all_negative_indices = []
    all_negative_times = []
    col_details = {}

    for col in reading_columns:
        neg_mask = df[col] < 0
        neg_indices = df.index[neg_mask].tolist()
        if neg_indices:
            affected_cols.append(col)
            all_negative_indices.extend(neg_indices)
            neg_times = df.loc[neg_indices, df.columns[0]].tolist()
            all_negative_times.extend(neg_times)
            col_details[col] = {
                "count": len(neg_indices),
                "min_value": round(df.loc[neg_indices, col].min(), 4),
                "mean_value": round(df.loc[neg_indices, col].mean(), 4),
            }

    if not affected_cols:
        return None

    total_count = len(all_negative_indices)
    severity = Severity.ERROR if total_count > len(df) * 0.05 else Severity.WARNING

    return QualityIssue(
        issue_type=IssueType.NEGATIVE_READING,
        severity=severity,
        description=f"检测到 {total_count} 个负值读数，涉及 {len(affected_cols)} 个读数通道: {', '.join(affected_cols)}",
        row_indices=sorted(set(all_negative_indices)),
        time_points=sorted(set(all_negative_times)),
        affected_columns=affected_cols,
        count=total_count,
        details={
            "per_column": col_details,
            "affected_rows_pct": round(total_count / len(df) * 100, 2),
        },
    )


def check_null_readings(df: pd.DataFrame,
                        reading_columns: List[str]) -> Optional[QualityIssue]:
    affected_cols = []
    all_null_indices = []
    col_details = {}

    for col in reading_columns:
        null_mask = df[col].isnull()
        null_indices = df.index[null_mask].tolist()
        if null_indices:
            affected_cols.append(col)
            all_null_indices.extend(null_indices)
            col_details[col] = {"count": len(null_indices)}

    if not affected_cols:
        return None

    total_count = len(set(all_null_indices))
    severity = Severity.WARNING if total_count > len(df) * 0.01 else Severity.INFO

    return QualityIssue(
        issue_type=IssueType.NULL_READING,
        severity=severity,
        description=f"检测到 {total_count} 个空值读数，涉及 {len(affected_cols)} 个读数通道: {', '.join(affected_cols)}",
        row_indices=sorted(set(all_null_indices)),
        time_points=[],
        affected_columns=affected_cols,
        count=total_count,
        details={
            "per_column": col_details,
            "affected_rows_pct": round(total_count / len(df) * 100, 2),
        },
    )


def run_quality_checks(dataset: LoadedDataset,
                       expected_interval: Optional[pd.Timedelta] = None) -> QualityReport:
    df = dataset.raw_df.copy()
    issues = []

    checks = [
        check_time_order(df, dataset.time_column),
        check_missing_samples(df, dataset.time_column, expected_interval),
        check_negative_readings(df, dataset.reading_columns),
        check_null_readings(df, dataset.reading_columns),
    ]

    for issue in checks:
        if issue is not None:
            issues.append(issue)

    total_data_points = len(df) * len(dataset.reading_columns)
    bad_points = sum(iss.count for iss in issues)
    quality_score = max(0.0, 100.0 - (bad_points / total_data_points * 100.0)) if total_data_points > 0 else 0.0

    summary = {
        "total_records": len(df),
        "total_issues": len(issues),
        "issues_by_type": {},
        "issues_by_severity": {},
    }

    for issue in issues:
        itype = issue.issue_type.value
        isev = issue.severity.value
        summary["issues_by_type"][itype] = summary["issues_by_type"].get(itype, 0) + issue.count
        summary["issues_by_severity"][isev] = summary["issues_by_severity"].get(isev, 0) + 1

    return QualityReport(
        issues=issues,
        summary=summary,
        data_quality_score=round(quality_score, 2),
    )
