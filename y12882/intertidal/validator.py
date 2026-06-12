"""
数据校验模块
核心校验点：
1. 盐度单位混用检测（psu、‰、ppt 等）
2. 潮位时区错误校验
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Tuple, Optional, List

import pandas as pd

from .audit_log import AuditLog

SALINITY_UNIT_CONVERSIONS = {
    "psu": 1.0,
    "ppt": 1.0,
    "‰": 1.0,
    "us/cm": 0.00055,
    "ms/cm": 0.55,
}

STANDARD_TIDE_TIMEZONES = ["UTC", "UTC+8", "Asia/Shanghai", "Beijing", "CST"]


@dataclass
class ValidationResult:
    """校验结果"""
    passed: bool
    error_count: int
    warning_count: int
    issues: list

    def summary(self) -> str:
        return (
            f"校验结果：{'通过' if self.passed else '未通过'}，"
            f"错误 {self.error_count} 个，警告 {self.warning_count} 个"
        )


class DataValidator:
    """数据校验器"""

    def __init__(self, audit_log: AuditLog):
        self.audit = audit_log

    def validate_all(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        salinity_df: pd.DataFrame,
        species_file: str = "species.csv",
        tide_file: str = "tide.csv",
        salinity_file: str = "salinity.csv"
    ) -> ValidationResult:
        """一次性校验所有数据"""
        self.audit.save_snapshot("species_raw", species_df.copy())
        self.audit.save_snapshot("tide_raw", tide_df.copy())
        self.audit.save_snapshot("salinity_raw", salinity_df.copy())

        self.validate_salinity_units(salinity_df, salinity_file)
        self.validate_tide_timezone(tide_df, tide_file)
        self.validate_species_required_fields(species_df, species_file)
        self.validate_species_tide_link(species_df, tide_df, species_file)

        error_count = sum(
            1 for i in self.audit.issues if i.severity == "error"
        )
        warning_count = sum(
            1 for i in self.audit.issues if i.severity == "warning"
        )

        return ValidationResult(
            passed=error_count == 0,
            error_count=error_count,
            warning_count=warning_count,
            issues=[i.to_dict() for i in self.audit.issues]
        )

    def validate_salinity_units(
        self, df: pd.DataFrame, source_file: str = "salinity.csv"
    ):
        """校验盐度单位是否混用，并记录处理意见"""
        if "salinity" not in df.columns and "value" not in df.columns:
            self.audit.add_issue(
                issue_type="salinity_missing_column",
                severity="error",
                source_type="salinity",
                source_row_index=-1,
                field_name="salinity/value",
                current_value=None,
                expected_value="salinity 或 value 列",
                description="盐度数据缺少盐度数值列",
            )
            return

        value_col = "salinity" if "salinity" in df.columns else "value"
        unit_col = "unit" if "unit" in df.columns else None

        detected_units = set()

        for idx, row in df.iterrows():
            val = row.get(value_col, "")
            unit = row.get(unit_col, "") if unit_col else ""

            found_unit = self._detect_salinity_unit(str(val), str(unit))
            if found_unit:
                detected_units.add(found_unit)

            if unit_col and str(unit).strip() and found_unit:
                if unit.strip().lower() != found_unit.lower():
                    issue_id = self.audit.add_issue(
                        issue_type="salinity_unit_mismatch",
                        severity="warning",
                        source_type="salinity",
                        source_row_index=int(idx),
                        field_name="unit",
                        current_value=str(unit),
                        expected_value=found_unit,
                        description=f"盐度值中包含单位 '{found_unit}'，但 unit 列写的是 '{unit}'",
                    )
                    self.audit.add_record(
                        source_type="salinity",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="flag_unit_mismatch",
                        before_value=str(unit),
                        after_value=found_unit,
                        reason="盐度数值与单位列不一致，需复核",
                        handler="validator",
                        notes=f"关联问题: {issue_id}"
                    )

        unique_units = len(detected_units)
        if unique_units > 1:
            for idx, row in df.iterrows():
                val = row.get(value_col, "")
                found_unit = self._detect_salinity_unit(str(val), "")
                if found_unit and found_unit != "psu":
                    issue_id = self.audit.add_issue(
                        issue_type="salinity_unit_mixed",
                        severity="error",
                        source_type="salinity",
                        source_row_index=int(idx),
                        field_name=value_col,
                        current_value=str(val),
                        expected_value="统一使用 psu",
                        description=(
                            f"盐度单位混用：检测到 {detected_units}，"
                            f"海事处要求统一使用 psu。当前单位 '{found_unit}'，"
                            f"需按换算系数 {SALINITY_UNIT_CONVERSIONS.get(found_unit, '?')} 转换"
                        ),
                    )
                    self.audit.add_record(
                        source_type="salinity",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="flag_unit_mixed",
                        before_value=str(val),
                        after_value="待转换为 psu",
                        reason="盐度单位混用，不符合海事处要求",
                        handler="validator",
                        notes=f"关联问题: {issue_id}"
                    )

    def validate_tide_timezone(
        self, df: pd.DataFrame, source_file: str = "tide.csv"
    ):
        """校验潮汐表时区是否正确"""
        time_col = None
        for col in ["datetime", "time", "date_time", "观测时间"]:
            if col in df.columns:
                time_col = col
                break

        if time_col is None:
            self.audit.add_issue(
                issue_type="tide_missing_time_column",
                severity="error",
                source_type="tide",
                source_row_index=-1,
                field_name="datetime",
                current_value=None,
                expected_value="datetime / time 列",
                description="潮汐表缺少时间列",
            )
            return

        tz_col = None
        for col in ["timezone", "tz", "时区"]:
            if col in df.columns:
                tz_col = col
                break

        if tz_col:
            for idx, row in df.iterrows():
                tz_val = str(row.get(tz_col, "")).strip()
                if tz_val and tz_val not in STANDARD_TIDE_TIMEZONES:
                    issue_id = self.audit.add_issue(
                        issue_type="tide_timezone_error",
                        severity="error",
                        source_type="tide",
                        source_row_index=int(idx),
                        field_name=tz_col,
                        current_value=tz_val,
                        expected_value="UTC+8 或 Asia/Shanghai",
                        description=(
                            f"潮位时区 '{tz_val}' 不标准。"
                            f"中国沿岸潮汐表应使用 UTC+8（北京时间）。"
                            f"若实际是其他时区，会导致潮高与物种观测时间对不上。"
                        ),
                    )
                    self.audit.add_record(
                        source_type="tide",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="flag_timezone_error",
                        before_value=tz_val,
                        after_value="待修正为 UTC+8",
                        reason="潮位时区不标准，影响物种分布判断",
                        handler="validator",
                        notes=f"关联问题: {issue_id}"
                    )

        for idx, row in df.iterrows():
            time_val = str(row.get(time_col, ""))
            detected_tz = self._detect_timezone_in_string(time_val)
            if detected_tz and detected_tz not in STANDARD_TIDE_TIMEZONES:
                issue_id = self.audit.add_issue(
                    issue_type="tide_timezone_error",
                    severity="error",
                    source_type="tide",
                    source_row_index=int(idx),
                    field_name=time_col,
                    current_value=time_val,
                    expected_value="带 UTC+8 或北京时间",
                    description=(
                        f"时间字符串里检测到时区 '{detected_tz}'，"
                        f"不是标准的中国沿岸时区。请确认潮汐表是否用了当地时间或 UTC。"
                    ),
                )
                self.audit.add_record(
                    source_type="tide",
                    source_row_index=int(idx),
                    source_file=source_file,
                    action="flag_timezone_in_string",
                    before_value=time_val,
                    after_value="待修正时区",
                    reason="时间字符串含有时区信息且不标准",
                    handler="validator",
                    notes=f"关联问题: {issue_id}"
                )

    def validate_species_required_fields(
        self, df: pd.DataFrame, source_file: str = "species.csv"
    ):
        """校验物种分布数据必填字段"""
        required = ["species", "latitude", "longitude", "survey_time"]
        for col in required:
            if col not in df.columns:
                self.audit.add_issue(
                    issue_type="species_missing_column",
                    severity="error",
                    source_type="species",
                    source_row_index=-1,
                    field_name=col,
                    current_value=None,
                    expected_value=col,
                    description=f"物种分布数据缺少必填列 '{col}'",
                )

    def validate_species_tide_link(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        species_file: str = "species.csv",
    ):
        """校验物种观测时间是否能对应到潮汐记录"""
        if "survey_time" not in species_df.columns:
            return

        time_col = None
        for col in ["datetime", "time", "date_time"]:
            if col in tide_df.columns:
                time_col = col
                break

        if time_col is None:
            return

        for idx, row in species_df.iterrows():
            survey_time = str(row.get("survey_time", ""))
            if not survey_time or survey_time == "nan":
                self.audit.add_issue(
                    issue_type="species_missing_survey_time",
                    severity="warning",
                    source_type="species",
                    source_row_index=int(idx),
                    field_name="survey_time",
                    current_value=survey_time,
                    expected_value="有效观测时间",
                    description="物种记录缺少观测时间，无法关联潮位",
                )

    def _detect_salinity_unit(self, value_str: str, unit_str: str) -> Optional[str]:
        """从盐度值或单位字符串中检测单位"""
        val_lower = value_str.lower()
        unit_lower = unit_str.lower().strip()

        if unit_lower in SALINITY_UNIT_CONVERSIONS:
            return unit_lower

        patterns = [
            (r"\bpsu\b", "psu"),
            (r"\bppt\b", "ppt"),
            (r"‰", "‰"),
            (r"us/cm|μs/cm", "us/cm"),
            (r"ms/cm", "ms/cm"),
        ]

        for pattern, unit in patterns:
            if re.search(pattern, val_lower, re.IGNORECASE):
                return unit

        if unit_lower and unit_lower in SALINITY_UNIT_CONVERSIONS:
            return unit_lower

        return None

    def _detect_timezone_in_string(self, time_str: str) -> Optional[str]:
        """从时间字符串中检测时区"""
        patterns = [
            (r"UTC([+-]\d+)", r"UTC\1"),
            (r"GMT([+-]\d+)", r"UTC\1"),
            (r"Asia/Shanghai", "Asia/Shanghai"),
            (r"Beijing", "Beijing"),
            (r"CST", "CST"),
            (r"PST", "PST"),
            (r"EST", "EST"),
        ]

        for pattern, tz_name in patterns:
            match = re.search(pattern, time_str)
            if match:
                if callable(tz_name):
                    return tz_name(match)
                elif "UTC" in tz_name and match.groups():
                    return f"UTC{match.group(1)}"
                return tz_name

        return None
