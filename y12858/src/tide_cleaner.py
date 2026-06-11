import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any, Optional
import re
import hashlib
import pytz

from src.models import TideRecord, DataStore


TIMEZONE_MAP = {
    "北京": "Asia/Shanghai",
    "北京时": "Asia/Shanghai",
    "北京时间": "Asia/Shanghai",
    "CST": "Asia/Shanghai",
    "UTC": "UTC",
    "GMT": "UTC",
    "东京": "Asia/Tokyo",
    "东京时": "Asia/Tokyo",
    "JST": "Asia/Tokyo",
}


def _parse_timezone(tz_str: str) -> str:
    if not tz_str or pd.isna(tz_str):
        return "Asia/Shanghai"
    tz_str = str(tz_str).strip()
    return TIMEZONE_MAP.get(tz_str, tz_str)


def _parse_datetime(val: Any) -> Tuple[Optional[datetime], List[str]]:
    issues: List[str] = []
    if val is None or (isinstance(val, float) and np.isnan(val)) or str(val).strip() == "":
        issues.append("潮时为空")
        return None, issues

    s = str(val).strip()

    tz_indicator = None
    for tz_key in TIMEZONE_MAP.keys():
        if tz_key in s:
            tz_indicator = tz_key
            s = s.replace(tz_key, "").strip()
            break

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y年%m月%d日 %H:%M",
        "%Y年%m月%d日 %H时%M分",
        "%m-%d %H:%M",
        "%m/%d %H:%M",
    ]

    dt = None
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            if "%m" not in fmt and "%Y" not in fmt:
                dt = dt.replace(year=datetime.now().year)
            break
        except ValueError:
            continue

    if dt is None:
        try:
            dt = pd.to_datetime(s).to_pydatetime()
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
        except Exception:
            issues.append(f"无法解析潮时: {val}")
            return None, issues

    if tz_indicator:
        target_tz = _parse_timezone(tz_indicator)
        if target_tz != "Asia/Shanghai":
            if target_tz == "UTC":
                dt = dt + timedelta(hours=8)
                issues.append(f"时区从UTC校正为北京时间(+8h)")
            elif target_tz == "Asia/Tokyo":
                dt = dt - timedelta(hours=1)
                issues.append(f"时区从东京时间校正为北京时间(-1h)")

    return dt, issues


def _parse_height(val: Any) -> Tuple[Optional[float], List[str]]:
    issues: List[str] = []
    if val is None or (isinstance(val, float) and np.isnan(val)) or str(val).strip() == "":
        issues.append("潮高为空")
        return None, issues

    s = str(val).strip()
    s = re.sub(r"[米mＭ]", "", s).strip()

    try:
        h = float(s)
        if h < 0 or h > 20:
            issues.append(f"潮高异常: {h}米")
        return h, issues
    except ValueError:
        issues.append(f"无法解析潮高: {val}")
        return None, issues


def _parse_tide_type(val: Any, remark: str = "") -> Tuple[str, List[str]]:
    issues: List[str] = []
    combined = f"{val} {remark}" if val else remark
    combined = combined.lower()

    if re.search(r"(高|high|满)", combined):
        return "高潮", issues
    if re.search(r"(低|low|干)", combined):
        return "低潮", issues

    if val and not pd.isna(val) and str(val).strip():
        return str(val).strip(), issues

    issues.append("潮型未标注")
    return "未知", issues


def _parse_remark_and_extract(val: Any) -> Tuple[str, Dict[str, Any]]:
    if val is None or pd.isna(val):
        return "", {}
    s = str(val).strip()
    extra: Dict[str, Any] = {}

    tz_match = re.search(r"(UTC|GMT|北京[时间]?|东京[时间]?|CST|JST)", s)
    if tz_match:
        extra["timezone_remark"] = tz_match.group(1)

    type_match = re.search(r"(高潮|低潮|满潮|干潮)", s)
    if type_match:
        extra["tide_type_remark"] = type_match.group(1)

    return s, extra


def clean_tide_data(raw_df: pd.DataFrame, source_batch: str = "") -> Tuple[List[TideRecord], pd.DataFrame]:
    records: List[TideRecord] = []
    report_rows: List[Dict[str, Any]] = []

    if raw_df.empty:
        return records, pd.DataFrame()

    col_map = _guess_columns(raw_df.columns)

    for idx, row in raw_df.iterrows():
        issues: List[str] = []

        station = str(row.get(col_map["station"], "")).strip()
        if not station:
            issues.append("站点为空")

        raw_time = row.get(col_map["time"])
        tide_time, time_issues = _parse_datetime(raw_time)
        issues.extend(time_issues)

        raw_height = row.get(col_map["height"])
        tide_height, height_issues = _parse_height(raw_height)
        issues.extend(height_issues)

        raw_type = row.get(col_map["type"])
        raw_remark, extra = _parse_remark_and_extract(row.get(col_map["remark"]))

        type_from_remark = extra.get("tide_type_remark", "")
        if type_from_remark and (not raw_type or pd.isna(raw_type)):
            raw_type = type_from_remark

        tide_type, type_issues = _parse_tide_type(raw_type, raw_remark)
        issues.extend(type_issues)

        tz_from_remark = extra.get("timezone_remark", "")
        timezone = _parse_timezone(row.get(col_map["timezone"], tz_from_remark))

        is_clean = len(issues) == 0 and tide_time is not None and tide_height is not None

        rec = TideRecord(
            station=station,
            tide_time=tide_time,
            tide_height=tide_height,
            tide_type=tide_type,
            timezone=timezone,
            remark=raw_remark,
            source_batch=source_batch,
            is_clean=is_clean,
            issues=issues,
        )
        records.append(rec)

        report_rows.append({
            "行号": idx + 1,
            "站点": station,
            "原始潮时": str(raw_time),
            "清洗后潮时": tide_time.strftime("%Y-%m-%d %H:%M") if tide_time else "",
            "原始潮高": str(raw_height),
            "清洗后潮高(米)": tide_height if tide_height is not None else "",
            "潮型": tide_type,
            "是否干净": "是" if is_clean else "否",
            "问题": "；".join(issues) if issues else "",
        })

    records = _deduplicate_tide_records(records, report_rows)

    report_df = pd.DataFrame(report_rows)
    DataStore.save("tide_records", records)
    return records, report_df


def _guess_columns(columns) -> Dict[str, str]:
    col_map = {"station": "", "time": "", "height": "", "type": "", "remark": "", "timezone": ""}
    col_lower = {str(c).lower(): c for c in columns}

    for key, patterns in {
        "station": ["station", "站点", "站名", "站"],
        "time": ["time", "时间", "潮时", "时刻"],
        "height": ["height", "高度", "潮高", "水位"],
        "type": ["type", "类型", "潮型", "性质"],
        "remark": ["remark", "note", "备注", "说明"],
        "timezone": ["timezone", "tz", "时区"],
    }.items():
        for pat in patterns:
            for col_name, orig in col_lower.items():
                if pat in col_name:
                    col_map[key] = orig
                    break
            if col_map[key]:
                break

    if not col_map["station"] and len(columns) > 0:
        col_map["station"] = columns[0]
    if not col_map["time"] and len(columns) > 1:
        col_map["time"] = columns[1]
    if not col_map["height"] and len(columns) > 2:
        col_map["height"] = columns[2]

    return col_map


def _deduplicate_tide_records(records: List[TideRecord], report_rows: List[Dict[str, Any]]) -> List[TideRecord]:
    seen: Dict[str, int] = {}
    unique: List[TideRecord] = []

    for i, rec in enumerate(records):
        if rec.tide_time and rec.station:
            key = hashlib.md5(
                f"{rec.station}|{rec.tide_time.strftime('%Y%m%d%H%M')}|{rec.tide_type}".encode()
            ).hexdigest()
            if key in seen:
                rec.issues.append(f"与第{seen[key] + 1}行重复")
                rec.is_clean = False
                if i < len(report_rows):
                    report_rows[i]["是否干净"] = "否"
                    report_rows[i]["问题"] = report_rows[i].get("问题", "") + ("；" if report_rows[i].get("问题") else "") + f"与第{seen[key] + 1}行重复"
            else:
                seen[key] = i
                unique.append(rec)
        else:
            unique.append(rec)

    return unique
