import pandas as pd
import numpy as np
import re
from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple, Dict, Optional
from .config import DecomposeConfig


class DataStatus(str, Enum):
    AVAILABLE = "可用"
    PENDING = "暂缓"
    NEED_RECOLLECT = "需重新采集"


@dataclass
class DataIssue:
    row_index: int
    issue_type: str
    description: str
    status: DataStatus


@dataclass
class LoadedData:
    df: pd.DataFrame
    original_df: pd.DataFrame
    clean_df: pd.DataFrame
    status_series: pd.Series
    issues: List[DataIssue]
    summary: Dict[str, int]


NOTE_PATTERNS = [
    r"备注[：:].*",
    r"注[：:].*",
    r"#.*",
    r"（.*?）",
    r"\(.*?\)",
    r"\[.*?\]",
]

NEGATIVE_INDICATORS = ["缺", "无", "漏", "未报", "异常", "待补", "待核"]


class DataLoader:
    def __init__(self, config: DecomposeConfig):
        self.config = config

    def load(self, file_path: str) -> LoadedData:
        original_df = self._read_file(file_path)
        issues: List[DataIssue] = []

        work_df = original_df.copy()
        status_series = pd.Series(
            [DataStatus.AVAILABLE] * len(work_df),
            index=work_df.index
        )

        self._check_required_columns(work_df, issues)

        work_df, issues, status_series = self._parse_date_column(
            work_df, issues, status_series
        )

        work_df, issues, status_series = self._clean_value_column(
            work_df, issues, status_series
        )

        work_df, issues, status_series = self._handle_duplicates(
            work_df, issues, status_series
        )

        work_df, issues, status_series = self._handle_nulls(
            work_df, issues, status_series
        )

        work_df, issues, status_series = self._detect_outliers(
            work_df, issues, status_series
        )

        clean_df = work_df[status_series == DataStatus.AVAILABLE].copy()
        clean_df = clean_df[[self.config.date_col, self.config.value_col]]
        clean_df = clean_df.sort_values(self.config.date_col).reset_index(drop=True)

        summary = {
            "总行数": len(original_df),
            "可用行数": int((status_series == DataStatus.AVAILABLE).sum()),
            "暂缓行数": int((status_series == DataStatus.PENDING).sum()),
            "需重采行数": int((status_series == DataStatus.NEED_RECOLLECT).sum()),
            "问题总数": len(issues),
        }

        return LoadedData(
            df=work_df,
            original_df=original_df,
            clean_df=clean_df,
            status_series=status_series,
            issues=issues,
            summary=summary,
        )

    def _read_file(self, file_path: str) -> pd.DataFrame:
        if file_path.endswith(".csv"):
            encodings = ["utf-8", "utf-8-sig", "gbk", "gb18030"]
            for enc in encodings:
                try:
                    return pd.read_csv(file_path, encoding=enc)
                except (UnicodeDecodeError, UnicodeError):
                    continue
            return pd.read_csv(file_path)
        elif file_path.endswith((".xlsx", ".xls")):
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")

    def _check_required_columns(self, df: pd.DataFrame, issues: List[DataIssue]):
        for col in [self.config.date_col, self.config.value_col]:
            if col not in df.columns:
                raise ValueError(
                    f"缺少必需列: '{col}'。现有列: {list(df.columns)}"
                )

    def _parse_date_column(
        self, df: pd.DataFrame, issues: List[DataIssue], status: pd.Series
    ) -> Tuple[pd.DataFrame, List[DataIssue], pd.Series]:
        date_col = self.config.date_col
        parsed = pd.to_datetime(df[date_col], errors="coerce")

        for i in df.index:
            if pd.isna(parsed.iloc[i]):
                raw = df.iloc[i][date_col]
                issues.append(DataIssue(
                    row_index=int(i),
                    issue_type="日期格式错误",
                    description=f"原始值 '{raw}' 无法解析为日期",
                    status=DataStatus.NEED_RECOLLECT,
                ))
                status.iloc[i] = DataStatus.NEED_RECOLLECT

        df[date_col] = parsed
        return df, issues, status

    def _clean_value_column(
        self, df: pd.DataFrame, issues: List[DataIssue], status: pd.Series
    ) -> Tuple[pd.DataFrame, List[DataIssue], pd.Series]:
        value_col = self.config.value_col
        cleaned_values = []

        for i in df.index:
            raw = str(df.iloc[i][value_col]) if pd.notna(df.iloc[i][value_col]) else ""
            has_note = False
            note_text = ""

            for pattern in NOTE_PATTERNS:
                matches = re.findall(pattern, raw)
                if matches:
                    has_note = True
                    note_text = " ".join(matches)
                    raw = re.sub(pattern, "", raw)

            raw = raw.strip()

            has_negative = any(ind in note_text or ind in raw for ind in NEGATIVE_INDICATORS)

            if raw == "" or raw.lower() in ("nan", "none", "null"):
                cleaned_values.append(np.nan)
                continue

            try:
                num = float(raw.replace(",", "").replace("，", ""))
                cleaned_values.append(num)

                if has_note:
                    issues.append(DataIssue(
                        row_index=int(i),
                        issue_type="含备注",
                        description=f"数值已提取，备注内容: {note_text}",
                        status=DataStatus.PENDING,
                    ))
                    if status.iloc[i] == DataStatus.AVAILABLE:
                        status.iloc[i] = DataStatus.PENDING
            except ValueError:
                cleaned_values.append(np.nan)
                issues.append(DataIssue(
                    row_index=int(i),
                    issue_type="数值解析失败",
                    description=f"原始值 '{raw}' 无法解析为数字",
                    status=DataStatus.NEED_RECOLLECT,
                ))
                status.iloc[i] = DataStatus.NEED_RECOLLECT

            if has_negative:
                issues.append(DataIssue(
                    row_index=int(i),
                    issue_type="异常标识",
                    description=f"内容含异常/缺失标识词，需复核",
                    status=DataStatus.PENDING,
                ))
                if status.iloc[i] not in (DataStatus.NEED_RECOLLECT,):
                    status.iloc[i] = DataStatus.PENDING

        df[value_col] = cleaned_values
        return df, issues, status

    def _handle_duplicates(
        self, df: pd.DataFrame, issues: List[DataIssue], status: pd.Series
    ) -> Tuple[pd.DataFrame, List[DataIssue], pd.Series]:
        date_col = self.config.date_col
        dup_mask = df.duplicated(subset=[date_col], keep=False)
        dup_groups = df[dup_mask].groupby(date_col)

        for date_val, group in dup_groups:
            indices = list(group.index)
            first_idx = indices[0]
            for idx in indices[1:]:
                issues.append(DataIssue(
                    row_index=int(idx),
                    issue_type="日期重复",
                    description=f"日期 {date_val} 出现重复，保留首行",
                    status=DataStatus.PENDING,
                ))
                status.iloc[idx] = DataStatus.PENDING

        return df, issues, status

    def _handle_nulls(
        self, df: pd.DataFrame, issues: List[DataIssue], status: pd.Series
    ) -> Tuple[pd.DataFrame, List[DataIssue], pd.Series]:
        value_col = self.config.value_col

        for i in df.index:
            if pd.isna(df.iloc[i][value_col]):
                if status.iloc[i] == DataStatus.AVAILABLE:
                    issues.append(DataIssue(
                        row_index=int(i),
                        issue_type="数值缺失",
                        description="值列为空",
                        status=DataStatus.NEED_RECOLLECT,
                    ))
                    status.iloc[i] = DataStatus.NEED_RECOLLECT

        return df, issues, status

    def _detect_outliers(
        self, df: pd.DataFrame, issues: List[DataIssue], status: pd.Series
    ) -> Tuple[pd.DataFrame, List[DataIssue], pd.Series]:
        value_col = self.config.value_col
        available_mask = status == DataStatus.AVAILABLE
        values = df.loc[available_mask, value_col]

        if len(values) < 10:
            return df, issues, status

        q1 = values.quantile(0.25)
        q3 = values.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 3 * iqr
        upper = q3 + 3 * iqr

        for i in df.index:
            if available_mask.iloc[i]:
                val = df.iloc[i][value_col]
                if pd.notna(val) and (val < lower or val > upper):
                    issues.append(DataIssue(
                        row_index=int(i),
                        issue_type="极端值",
                        description=f"值 {val} 超出正常范围 [{lower:.2f}, {upper:.2f}]",
                        status=DataStatus.PENDING,
                    ))
                    status.iloc[i] = DataStatus.PENDING

        return df, issues, status
