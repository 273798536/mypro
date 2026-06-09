import os
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

import pandas as pd
from dateutil import parser as date_parser

from .models import MonitorRecord, ReagentRecord


MONITOR_COLUMN_ALIASES = {
    "record_id": ["记录编号", "记录号", "编号", "record_id", "id", "ID", "序号"],
    "sample_id": ["样品编号", "样品号", "样本编号", "sample_id", "sample_no"],
    "sample_name": ["样品名称", "样品名", "样本名称", "sample_name", "名称"],
    "monitor_date": ["监测日期", "检测日期", "日期", "monitor_date", "date", "检测时间", "监测时间"],
    "blank_control_value": ["空白对照值", "空白值", "空白对照", "blank_control", "blank", "空白吸光度"],
    "blank_control_unit": ["空白单位", "空白对照单位", "空白值单位", "blank_unit"],
    "sample_value": ["样品值", "检测值", "测定值", "sample_value", "value", "结果", "吸光度", "氨氮值"],
    "sample_unit": ["样品单位", "单位", "sample_unit", "unit", "结果单位"],
    "standard_curve_id": ["标准曲线编号", "曲线编号", "标曲编号", "standard_curve_id", "curve_id"],
    "operator": ["操作人员", "检测人", "操作员", "operator", "检测人员"],
    "reviewer": ["审核人", "审核人员", "reviewer", "复核人"],
    "remarks": ["备注", "remarks", "说明", "补录备注", "notes"],
    "reagent_ids": ["试剂编号", "试剂ID", "reagent_ids", "reagent_id", "试剂"],
}

REAGENT_COLUMN_ALIASES = {
    "reagent_id": ["试剂编号", "试剂号", "试剂ID", "reagent_id", "id", "ID"],
    "name": ["试剂名称", "名称", "name", "reagent_name"],
    "batch_no": ["批号", "批次号", "batch_no", "batch", "批次"],
    "manufacturer": ["生产厂家", "厂家", "manufacturer", "生产商"],
    "open_date": ["开瓶日期", "启用日期", "开封日期", "open_date", "opening_date"],
    "expiry_date": ["有效期至", "失效日期", "到期日期", "expiry_date", "expire_date", "有效期"],
    "volume_used": ["使用量", "用量", "volume_used", "volume", "消耗"],
    "volume_unit": ["使用量单位", "用量单位", "单位", "volume_unit", "unit"],
    "operator": ["使用人", "操作人员", "领用人", "operator"],
    "remarks": ["备注", "remarks", "说明", "notes"],
}


def _clean_str(value):
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    s = str(value).strip()
    empty_markers = ["", "nan", "none", "null", "无", "/", "-", "--", "\u2014"]
    if s.lower() in empty_markers:
        return None
    return s


def _clean_float(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and pd.isna(value):
            return None
        return float(value)
    s = _clean_str(value)
    if s is None:
        return None
    s = re.sub(r"[^\d.\-]", "", s)
    if s in ["", "-", "."]:
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    s = _clean_str(value)
    if s is None:
        return None
    try:
        return date_parser.parse(s, fuzzy=True)
    except (ValueError, OverflowError, TypeError):
        return None


def _find_column(df_columns, aliases):
    lower_map = {}
    for col in df_columns:
        lower_map[col.lower()] = col
    for alias in aliases:
        if alias in df_columns:
            return alias
        if alias.lower() in lower_map:
            return lower_map[alias.lower()]
    for col in df_columns:
        for alias in aliases:
            if alias in col:
                return col
    return None


def _map_row_to_fields(row, alias_map, columns):
    result = {}
    for field_name, aliases in alias_map.items():
        col = _find_column(columns, aliases)
        if col is not None:
            result[field_name] = row[col]
        else:
            result[field_name] = None
    return result


def _read_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext in [".xlsx", ".xls"]:
        return pd.read_excel(filepath, dtype=object)
    elif ext == ".csv":
        encodings = ["utf-8-sig", "utf-8", "gbk", "gb2312", "latin1"]
        for enc in encodings:
            try:
                return pd.read_csv(filepath, dtype=object, encoding=enc)
            except (UnicodeDecodeError, UnicodeError):
                continue
        raise ValueError("无法识别文件编码: " + filepath)
    else:
        raise ValueError("不支持的文件格式: " + ext)


def _discover_files(input_dir):
    monitor_files = []
    reagent_files = []
    for fname in os.listdir(input_dir):
        fpath = os.path.join(input_dir, fname)
        if not os.path.isfile(fpath):
            continue
        lower_name = fname.lower()
        if "试剂" in fname or "reagent" in lower_name:
            reagent_files.append(fpath)
        elif "监测" in fname or "检测" in fname or "monitor" in lower_name or "sample" in lower_name or "氨氮" in fname:
            monitor_files.append(fpath)
        elif lower_name.endswith((".xlsx", ".xls", ".csv")):
            try:
                df = _read_file(fpath)
                cols = list(df.columns)
                col_reag_id = _find_column(cols, REAGENT_COLUMN_ALIASES["reagent_id"])
                col_reag_name = _find_column(cols, REAGENT_COLUMN_ALIASES["name"])
                has_reagent_col = col_reag_id is not None and col_reag_name is not None
                col_mon_sample = _find_column(cols, MONITOR_COLUMN_ALIASES["sample_id"])
                col_mon_blank = _find_column(cols, MONITOR_COLUMN_ALIASES["blank_control_value"])
                has_monitor_col = col_mon_sample is not None or col_mon_blank is not None
                if has_reagent_col and not has_monitor_col:
                    reagent_files.append(fpath)
                else:
                    monitor_files.append(fpath)
            except Exception:
                pass
    return sorted(monitor_files), sorted(reagent_files)


def load_monitor_records(input_dir):
    monitor_files, _ = _discover_files(input_dir)
    records = []
    seen_ids = set()

    for fpath in monitor_files:
        try:
            df = _read_file(fpath)
        except Exception:
            continue
        columns = list(df.columns)

        for idx, row in df.iterrows():
            mapped = _map_row_to_fields(row, MONITOR_COLUMN_ALIASES, columns)

            record_id = _clean_str(mapped.get("record_id"))
            if not record_id:
                record_id = "REC_" + os.path.basename(fpath) + "_" + str(idx + 1)
            sample_id = _clean_str(mapped.get("sample_id")) or ("SAMPLE_" + str(idx + 1))
            sample_name = _clean_str(mapped.get("sample_name")) or ("样品" + str(idx + 1))

            if record_id in seen_ids:
                record_id = record_id + "_" + str(len(seen_ids) + 1)
            seen_ids.add(record_id)

            reagent_raw = mapped.get("reagent_ids")
            reagent_ids = []
            if reagent_raw is not None:
                if not (isinstance(reagent_raw, float) and pd.isna(reagent_raw)):
                    reagent_str = str(reagent_raw)
                    parts = re.split(r"[、,，;；/|&\s]+", reagent_str.strip())
                    reagent_ids = [p for p in parts if p]

            raw_row = {}
            for col in columns:
                v = row[col]
                if isinstance(v, float) and pd.isna(v):
                    raw_row[col] = None
                else:
                    raw_row[col] = v

            record = MonitorRecord(
                record_id=record_id,
                sample_id=sample_id,
                sample_name=sample_name,
                monitor_date=_parse_date(mapped.get("monitor_date")),
                blank_control_value=_clean_float(mapped.get("blank_control_value")),
                blank_control_unit=_clean_str(mapped.get("blank_control_unit")),
                sample_value=_clean_float(mapped.get("sample_value")),
                sample_unit=_clean_str(mapped.get("sample_unit")),
                standard_curve_id=_clean_str(mapped.get("standard_curve_id")),
                operator=_clean_str(mapped.get("operator")),
                reviewer=_clean_str(mapped.get("reviewer")),
                remarks=_clean_str(mapped.get("remarks")),
                reagent_ids=reagent_ids,
                raw_row=raw_row,
            )
            records.append(record)

    return records


def load_reagent_records(input_dir):
    _, reagent_files = _discover_files(input_dir)
    records = []
    seen_ids = set()

    for fpath in reagent_files:
        try:
            df = _read_file(fpath)
        except Exception:
            continue
        columns = list(df.columns)

        for idx, row in df.iterrows():
            mapped = _map_row_to_fields(row, REAGENT_COLUMN_ALIASES, columns)

            reagent_id = _clean_str(mapped.get("reagent_id"))
            if not reagent_id:
                reagent_id = "REAG_" + os.path.basename(fpath) + "_" + str(idx + 1)
            name = _clean_str(mapped.get("name")) or ("试剂" + str(idx + 1))
            batch_no = _clean_str(mapped.get("batch_no")) or ("BATCH_" + str(idx + 1))
            manufacturer = _clean_str(mapped.get("manufacturer")) or "未知厂家"

            if reagent_id in seen_ids:
                reagent_id = reagent_id + "_" + str(len(seen_ids) + 1)
            seen_ids.add(reagent_id)

            raw_row = {}
            for col in columns:
                v = row[col]
                if isinstance(v, float) and pd.isna(v):
                    raw_row[col] = None
                else:
                    raw_row[col] = v

            record = ReagentRecord(
                reagent_id=reagent_id,
                name=name,
                batch_no=batch_no,
                manufacturer=manufacturer,
                open_date=_parse_date(mapped.get("open_date")),
                expiry_date=_parse_date(mapped.get("expiry_date")),
                volume_used=_clean_float(mapped.get("volume_used")),
                volume_unit=_clean_str(mapped.get("volume_unit")),
                operator=_clean_str(mapped.get("operator")),
                remarks=_clean_str(mapped.get("remarks")),
                raw_row=raw_row,
            )
            records.append(record)

    return records


def load_all_data(input_dir):
    return load_monitor_records(input_dir), load_reagent_records(input_dir)
