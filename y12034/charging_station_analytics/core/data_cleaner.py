"""
数据清洗模块
负责数据类型转换、缺失值填充、异常值检测、数据验证
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field

from ..config.settings import get_config
from .data_reader import RawData


@dataclass
class CleanedData:
    """清洗后的数据容器"""
    df: pd.DataFrame
    validation_errors: List[Dict[str, Any]] = field(default_factory=list)
    type_conversion_errors: List[Dict[str, Any]] = field(default_factory=list)
    filled_missing: Dict[str, int] = field(default_factory=dict)
    data_quality_score: float = 0.0


class DataCleaner:
    """数据清洗器"""

    def __init__(self):
        self.config = get_config()
        self.validation_rules = self.config.columns.get("validation", {})

    def _convert_datetime(self, value: Any) -> Optional[datetime]:
        """安全的日期时间转换"""
        if pd.isna(value) or value == "":
            return None

        if isinstance(value, datetime):
            return value

        if isinstance(value, pd.Timestamp):
            return value.to_pydatetime()

        value_str = str(value).strip()

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%m/%d/%Y %H:%M",
            "%d/%m/%Y %H:%M",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(value_str, fmt)
            except ValueError:
                continue

        try:
            return pd.to_datetime(value_str).to_pydatetime()
        except:
            return None

    def _convert_numeric(self, value: Any) -> Optional[float]:
        """安全的数值转换"""
        if pd.isna(value) or value == "" or value is None:
            return None

        if isinstance(value, (int, float)):
            return float(value)

        value_str = str(value).strip()
        value_str = value_str.replace(",", "").replace("￥", "").replace("¥", "")

        try:
            return float(value_str)
        except ValueError:
            return None

    def _convert_string(self, value: Any) -> Optional[str]:
        """安全的字符串转换"""
        if pd.isna(value) or value is None:
            return None
        return str(value).strip()

    def _get_column_def(self, column_name: str) -> Optional[Dict]:
        """获取列定义"""
        for col_def in self.config.required_columns + self.config.optional_columns:
            if col_def["name"] == column_name:
                return col_def
        return None

    def _fill_missing_value(self, column_name: str) -> Any:
        """获取列的默认填充值"""
        col_def = self._get_column_def(column_name)
        if col_def and "default_value" in col_def:
            return col_def["default_value"]
        return None

    def clean(self, raw_data: RawData) -> CleanedData:
        """执行数据清洗"""
        df = raw_data.df.copy()
        validation_errors = []
        type_conversion_errors = []
        filled_missing = {}

        type_converters = {
            "datetime": self._convert_datetime,
            "numeric": self._convert_numeric,
            "string": self._convert_string,
        }

        all_columns = self.config.required_columns + self.config.optional_columns
        for col_def in all_columns:
            col_name = col_def["name"]
            if col_name not in df.columns:
                continue

            data_type = col_def.get("data_type", "string")
            converter = type_converters.get(data_type, self._convert_string)

            converted_values = []
            for idx, value in enumerate(df[col_name]):
                original_row = df.iloc[idx].get("_original_row_number", idx + 1)
                converted = converter(value)

                if converted is None and not pd.isna(value) and value != "":
                    type_conversion_errors.append({
                        "row_number": original_row,
                        "column": col_name,
                        "original_value": value,
                        "reason": f"{col_name}格式不正确，期望{data_type}"
                    })

                converted_values.append(converted)

            df[col_name] = converted_values

            if df[col_name].isna().any():
                fill_value = self._fill_missing_value(col_name)
                if fill_value is not None:
                    na_count = df[col_name].isna().sum()
                    df[col_name] = df[col_name].fillna(fill_value)
                    filled_missing[col_name] = na_count
                else:
                    for idx, is_na in enumerate(df[col_name].isna()):
                        if is_na:
                            original_row = df.iloc[idx].get("_original_row_number", idx + 1)
                            validation_errors.append({
                                "row_number": original_row,
                                "column": col_name,
                                "reason": f"{col_name}缺失且无默认值"
                            })

        validation_errors.extend(self._validate_business_rules(df))

        total_records = len(df) if len(df) > 0 else 1
        total_errors = len(validation_errors) + len(type_conversion_errors)
        data_quality_score = max(0.0, 100.0 - (total_errors / total_records) * 100)

        return CleanedData(
            df=df,
            validation_errors=validation_errors,
            type_conversion_errors=type_conversion_errors,
            filled_missing=filled_missing,
            data_quality_score=round(data_quality_score, 2)
        )

    def _validate_business_rules(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """验证业务规则"""
        errors = []

        if df.empty:
            return errors

        min_energy = self.validation_rules.get("min_energy", 0.1)
        max_energy = self.validation_rules.get("max_energy", 500.0)
        min_duration = self.validation_rules.get("min_duration", 1)
        max_duration = self.validation_rules.get("max_duration", 1440)
        min_amount = self.validation_rules.get("min_amount", 0.0)

        for idx, row in df.iterrows():
            original_row = row.get("_original_row_number", idx + 1)

            energy = row.get("energy")
            if energy is not None:
                if energy < min_energy or energy > max_energy:
                    errors.append({
                        "row_number": original_row,
                        "column": "energy",
                        "value": energy,
                        "reason": f"充电量{energy}超出合理范围[{min_energy}, {max_energy}]"
                    })

            duration = row.get("duration")
            if duration is not None:
                if duration < min_duration or duration > max_duration:
                    errors.append({
                        "row_number": original_row,
                        "column": "duration",
                        "value": duration,
                        "reason": f"充电时长{duration}超出合理范围[{min_duration}, {max_duration}]分钟"
                    })

            total_amount = row.get("total_amount")
            if total_amount is not None and total_amount < min_amount:
                errors.append({
                    "row_number": original_row,
                    "column": "total_amount",
                    "value": total_amount,
                    "reason": f"总金额{total_amount}小于最小值{min_amount}"
                })

            start_time = row.get("start_time")
            end_time = row.get("end_time")
            if start_time and end_time and end_time <= start_time:
                errors.append({
                    "row_number": original_row,
                    "column": "end_time",
                    "value": end_time,
                    "reason": f"结束时间{end_time}不晚于开始时间{start_time}"
                })

            if start_time and end_time and duration:
                calc_duration = (end_time - start_time).total_seconds() / 60
                if abs(calc_duration - duration) > 5:
                    errors.append({
                        "row_number": original_row,
                        "column": "duration",
                        "value": duration,
                        "reason": f"充电时长{duration}与实际时间段{calc_duration:.1f}分钟差异过大"
                    })

        return errors
