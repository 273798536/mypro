"""
数据处理模块
所有处理操作都记录到 audit_log，保证可追溯。
地图、图表、报告共用同一份处理后的数据，确保三者对得上。
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Tuple, Optional

import numpy as np
import pandas as pd

from .audit_log import AuditLog

SALINITY_UNIT_CONVERSIONS = {
    "psu": 1.0,
    "ppt": 1.0,
    "‰": 1.0,
    "us/cm": 0.00055,
    "ms/cm": 0.55,
}


class DataProcessor:
    """数据处理器

    所有处理动作都写入 audit_log，保证地图联动、历史回看、报告生成
    都基于同一份处理记录，不会各算各的。
    """

    def __init__(self, audit_log: AuditLog):
        self.audit = audit_log
        self.processed_species: Optional[pd.DataFrame] = None
        self.processed_tide: Optional[pd.DataFrame] = None
        self.processed_salinity: Optional[pd.DataFrame] = None

    def process_all(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        salinity_df: pd.DataFrame,
        species_file: str = "species.csv",
        tide_file: str = "tide.csv",
        salinity_file: str = "salinity.csv",
        target_timezone: str = "UTC+8"
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """处理所有数据，返回处理后的 (species, tide, salinity)"""

        self.processed_salinity = self._process_salinity(salinity_df, salinity_file)
        self.processed_tide = self._process_tide(tide_df, tide_file, target_timezone)
        self.processed_species = self._process_species(
            species_df, species_file, self.processed_tide
        )

        self.audit.save_snapshot("species_processed", self.processed_species.copy())
        self.audit.save_snapshot("tide_processed", self.processed_tide.copy())
        self.audit.save_snapshot("salinity_processed", self.processed_salinity.copy())

        return self.processed_species, self.processed_tide, self.processed_salinity

    def _process_salinity(
        self, df: pd.DataFrame, source_file: str
    ) -> pd.DataFrame:
        """统一盐度单位到 psu，每一行转换都留痕"""
        df = df.copy()

        value_col = "salinity" if "salinity" in df.columns else "value"
        unit_col = "unit" if "unit" in df.columns else None

        if value_col not in df.columns:
            return df

        df["salinity_psu"] = np.nan
        df["original_salinity"] = df[value_col].astype(str)
        df["original_unit"] = ""

        for idx, row in df.iterrows():
            raw_val = str(row[value_col])
            raw_unit = str(row.get(unit_col, "")) if unit_col else ""

            numeric_val, detected_unit = self._parse_salinity_value(raw_val, raw_unit)

            if numeric_val is not None and detected_unit is not None:
                factor = SALINITY_UNIT_CONVERSIONS.get(detected_unit, 1.0)
                psu_val = round(numeric_val * factor, 3)

                df.at[idx, "salinity_psu"] = psu_val
                df.at[idx, "original_unit"] = detected_unit

                if detected_unit != "psu":
                    self.audit.add_record(
                        source_type="salinity",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="convert_salinity_unit",
                        before_value=f"{numeric_val} {detected_unit}",
                        after_value=f"{psu_val} psu",
                        reason=f"统一盐度单位为 psu，换算系数 {factor}",
                        handler="processor",
                        notes=(
                            f"依据：海事处要求盐度统一使用 psu。"
                            f"{detected_unit} 转 psu 系数为 {factor}。"
                        )
                    )
                else:
                    self.audit.add_record(
                        source_type="salinity",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="confirm_salinity_unit",
                        before_value=f"{numeric_val} {detected_unit}",
                        after_value=f"{psu_val} psu",
                        reason="原单位已是 psu，无需转换",
                        handler="processor",
                    )
            else:
                df.at[idx, "salinity_psu"] = pd.to_numeric(row[value_col], errors="coerce")

        return df

    def _process_tide(
        self, df: pd.DataFrame, source_file: str, target_timezone: str
    ) -> pd.DataFrame:
        """处理潮汐表时区，统一到目标时区，每条都留痕"""
        df = df.copy()

        time_col = None
        for col in ["datetime", "time", "date_time", "观测时间"]:
            if col in df.columns:
                time_col = col
                break

        if time_col is None:
            return df

        df["datetime_utc8"] = pd.NaT
        df["original_datetime"] = df[time_col].astype(str)
        df["original_timezone"] = ""
        df["tide_height_adj"] = df["height"].copy() if "height" in df.columns else np.nan

        tz_col = None
        for col in ["timezone", "tz", "时区"]:
            if col in df.columns:
                tz_col = col
                break

        for idx, row in df.iterrows():
            raw_time = str(row[time_col])
            raw_tz = str(row.get(tz_col, "")) if tz_col else ""

            parsed_dt, detected_tz = self._parse_datetime_with_tz(raw_time, raw_tz)

            if parsed_dt is None:
                continue

            df.at[idx, "original_timezone"] = detected_tz or target_timezone

            utc8_dt = self._convert_to_utc8(parsed_dt, detected_tz)
            df.at[idx, "datetime_utc8"] = utc8_dt

            if detected_tz and detected_tz not in ("UTC+8", "Asia/Shanghai", "Beijing", "CST"):
                self.audit.add_record(
                    source_type="tide",
                    source_row_index=int(idx),
                    source_file=source_file,
                    action="convert_tide_timezone",
                    before_value=f"{raw_time} ({detected_tz})",
                    after_value=f"{utc8_dt.strftime('%Y-%m-%d %H:%M')} (UTC+8)",
                    reason=(
                        f"潮汐表原始时区为 {detected_tz}，"
                        f"统一转换为 UTC+8 以匹配物种观测时间"
                    ),
                    handler="processor",
                    notes=(
                        f"处理意见：中国沿岸潮汐观测应使用北京时间（UTC+8）。"
                        f"若原始数据为其他时区，需换算后再使用。"
                    )
                )
            else:
                self.audit.add_record(
                    source_type="tide",
                    source_row_index=int(idx),
                    source_file=source_file,
                    action="confirm_tide_timezone",
                    before_value=f"{raw_time}",
                    after_value=f"{utc8_dt.strftime('%Y-%m-%d %H:%M')} (UTC+8)",
                    reason="原时区已是 UTC+8，无需转换",
                    handler="processor",
                )

        return df

    def _process_species(
        self,
        species_df: pd.DataFrame,
        source_file: str,
        tide_df: pd.DataFrame
    ) -> pd.DataFrame:
        """处理物种分布数据，关联潮位，每条关联都留痕"""
        df = species_df.copy()

        df["tide_height_at_survey"] = np.nan
        df["tide_phase"] = ""
        df["linked_tide_row"] = -1
        df["survey_datetime_utc8"] = pd.NaT

        if "survey_time" not in df.columns:
            return df

        tide_has_data = (
            tide_df is not None
            and "datetime_utc8" in tide_df.columns
            and "height" in tide_df.columns
        )

        for idx, row in df.iterrows():
            survey_time_str = str(row.get("survey_time", ""))
            if not survey_time_str or survey_time_str == "nan":
                continue

            survey_dt, _ = self._parse_datetime_with_tz(survey_time_str, "")
            if survey_dt is None:
                continue

            survey_utc8 = self._convert_to_utc8(survey_dt, "UTC+8")
            df.at[idx, "survey_datetime_utc8"] = survey_utc8

            if tide_has_data:
                tide_height, tide_row_idx = self._interpolate_tide(tide_df, survey_utc8)

                if tide_height is not None:
                    df.at[idx, "tide_height_at_survey"] = round(tide_height, 2)
                    df.at[idx, "linked_tide_row"] = int(tide_row_idx) if tide_row_idx >= 0 else -1

                    phase = self._determine_tide_phase(tide_df, survey_utc8, tide_row_idx)
                    df.at[idx, "tide_phase"] = phase

                    self.audit.add_record(
                        source_type="species",
                        source_row_index=int(idx),
                        source_file=source_file,
                        action="link_tide_data",
                        before_value="无潮位关联",
                        after_value=f"潮高 {tide_height:.2f}cm，{phase}",
                        reason=(
                            f"根据观测时间 {survey_utc8.strftime('%Y-%m-%d %H:%M')} "
                            f"内插对应潮位，用于判断潮间带分布"
                        ),
                        handler="processor",
                        notes=(
                            f"关联潮汐表第 {tide_row_idx if tide_row_idx >= 0 else 'N/A'} 行。"
                            f"潮相：{phase}。"
                        )
                    )

        return df

    def _parse_salinity_value(
        self, value_str: str, unit_str: str
    ) -> Tuple[Optional[float], Optional[str]]:
        """解析盐度值和单位"""
        unit_str = unit_str.strip().lower()

        if unit_str in SALINITY_UNIT_CONVERSIONS:
            try:
                num = float(re.sub(r"[^\d.-]", "", value_str))
                return num, unit_str
            except ValueError:
                pass

        patterns = [
            (r"([\d.]+)\s*(psu)", "psu"),
            (r"([\d.]+)\s*(ppt)", "ppt"),
            (r"([\d.]+)\s*‰", "‰"),
            (r"([\d.]+)\s*(us/cm|μs/cm)", "us/cm"),
            (r"([\d.]+)\s*(ms/cm)", "ms/cm"),
        ]

        for pattern, unit in patterns:
            match = re.search(pattern, value_str, re.IGNORECASE)
            if match:
                try:
                    num = float(match.group(1))
                    return num, unit
                except ValueError:
                    pass

        try:
            num = float(value_str)
            if unit_str:
                return num, unit_str
            return num, "psu"
        except ValueError:
            return None, None

    def _parse_datetime_with_tz(
        self, time_str: str, tz_str: str
    ) -> Tuple[Optional[datetime], Optional[str]]:
        """解析带时区的时间字符串"""
        detected_tz = None
        time_clean = time_str.strip()

        tz_match = re.search(r"(UTC|GMT)([+-]\d+)", time_clean, re.IGNORECASE)
        if tz_match:
            detected_tz = f"UTC{tz_match.group(2)}"
            time_clean = time_clean[:tz_match.start()].strip()

        for fmt in [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y-%m-%d",
        ]:
            try:
                dt = datetime.strptime(time_clean, fmt)
                if tz_str.strip() and not detected_tz:
                    detected_tz = tz_str.strip()
                return dt, detected_tz
            except ValueError:
                continue

        return None, detected_tz

    def _convert_to_utc8(self, dt: datetime, from_tz: Optional[str]) -> datetime:
        """将时间转换为 UTC+8"""
        if from_tz is None or from_tz in ("UTC+8", "Asia/Shanghai", "Beijing", "CST"):
            return dt

        offset_hours = 0
        match = re.match(r"UTC([+-])(\d+)", from_tz)
        if match:
            sign = 1 if match.group(1) == "+" else -1
            offset_hours = sign * int(match.group(2))
        elif from_tz == "UTC":
            offset_hours = 0
        elif from_tz == "GMT":
            offset_hours = 0

        delta = timedelta(hours=8 - offset_hours)
        return dt + delta

    def _interpolate_tide(
        self, tide_df: pd.DataFrame, target_dt: datetime
    ) -> Tuple[Optional[float], int]:
        """内插目标时间的潮位"""
        tide_sorted = tide_df.dropna(subset=["datetime_utc8"]).sort_values("datetime_utc8")

        if len(tide_sorted) < 2:
            return None, -1

        target_ts = pd.Timestamp(target_dt)

        before = tide_sorted[tide_sorted["datetime_utc8"] <= target_ts]
        after = tide_sorted[tide_sorted["datetime_utc8"] >= target_ts]

        if before.empty and not after.empty:
            return float(after.iloc[0]["height"]), 0
        if after.empty and not before.empty:
            return float(before.iloc[-1]["height"]), len(before) - 1

        if not before.empty and not after.empty:
            b_row = before.iloc[-1]
            a_row = after.iloc[0]

            b_time = pd.Timestamp(b_row["datetime_utc8"])
            a_time = pd.Timestamp(a_row["datetime_utc8"])

            if b_time == a_time:
                return float(b_row["height"]), before.index[-1]

            ratio = (target_ts - b_time) / (a_time - b_time)
            height = float(b_row["height"]) + ratio * (float(a_row["height"]) - float(b_row["height"]))
            return height, before.index[-1]

        return None, -1

    def _determine_tide_phase(
        self, tide_df: pd.DataFrame, target_dt: datetime, nearest_idx: int
    ) -> str:
        """判断潮相（涨潮/落潮/高平/低平）"""
        if nearest_idx < 0:
            return "未知"

        tide_sorted = tide_df.dropna(subset=["datetime_utc8"]).sort_values("datetime_utc8")

        if nearest_idx >= len(tide_sorted) - 1:
            return "未知"

        current_h = float(tide_sorted.iloc[nearest_idx]["height"])
        next_h = float(tide_sorted.iloc[nearest_idx + 1]["height"])

        diff = next_h - current_h

        if abs(diff) < 5:
            if diff >= 0:
                return "高平潮"
            else:
                return "低平潮"
        elif diff > 0:
            return "涨潮"
        else:
            return "落潮"

    def get_processing_summary(self) -> dict:
        """获取处理摘要"""
        return {
            "salinity_rows": len(self.processed_salinity) if self.processed_salinity is not None else 0,
            "tide_rows": len(self.processed_tide) if self.processed_tide is not None else 0,
            "species_rows": len(self.processed_species) if self.processed_species is not None else 0,
            "audit_records": len(self.audit.records),
            "audit_issues": len(self.audit.issues),
        }
