import csv
import os
import re
from datetime import datetime
from typing import List, Tuple

from .types import SensorRecord, RemarkEntry, ScreenshotRef
from .units import normalize_unit, format_steps


REMARK_META_RE = re.compile(
    r"^\[(?P<author>[^\]]+)\s+@\s+(?P<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?)\]\s*(?P<content>.*)$"
)
SHOT_META_RE = re.compile(
    r"^\[(?P<ver>v\d+)\s+@\s+(?P<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?)\]\s*"
    r"(?P<caption>[^|]+)\|\s*(?P<path>\S+)$"
)


def _parse_ts(s: str) -> datetime:
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析时间戳: {s}")


def _split_multiline(field: str, sep: str = ";;") -> List[str]:
    if not field or not field.strip():
        return []
    return [p.strip() for p in field.split(sep) if p.strip()]


def _parse_remarks(raw: str) -> List[RemarkEntry]:
    remarks = []
    for idx, chunk in enumerate(_split_multiline(raw)):
        m = REMARK_META_RE.match(chunk)
        if m:
            remarks.append(RemarkEntry(
                content=m.group("content").strip(),
                author=m.group("author").strip(),
                timestamp=_parse_ts(m.group("ts")),
            ))
        else:
            remarks.append(RemarkEntry(
                content=chunk,
                author="unknown",
                timestamp=datetime.now(),
            ))
    if remarks:
        remarks.sort(key=lambda r: r.timestamp)
        remarks[-1].is_latest = True
    return remarks


def _parse_screenshots(raw: str) -> List[ScreenshotRef]:
    shots = []
    for chunk in _split_multiline(raw):
        m = SHOT_META_RE.match(chunk)
        if m:
            shots.append(ScreenshotRef(
                path=m.group("path").strip(),
                caption=m.group("caption").strip(),
                version=m.group("ver").strip(),
                timestamp=_parse_ts(m.group("ts")),
            ))
        else:
            shots.append(ScreenshotRef(
                path=chunk,
                caption=chunk,
                version="v1",
                timestamp=datetime.now(),
            ))
    shots.sort(key=lambda s: (s.version, s.timestamp))
    return shots


def _parse_float(s: str, field_name: str) -> float:
    try:
        return float(str(s).strip())
    except (ValueError, TypeError):
        raise ValueError(f"字段 {field_name} 数值解析失败: '{s}'")


REQUIRED_COLUMNS = [
    "timestamp",
    "device_id",
    "measure_value",
    "measure_unit",
]

OPTIONAL_COLUMNS = [
    "speckle_contrast",
    "speckle_size_um",
    "remarks",
    "screenshots",
    "version",
]


def parse_sensor_log(input_dir: str) -> Tuple[List[SensorRecord], List[str]]:
    csv_files = [f for f in os.listdir(input_dir)
                 if f.lower().endswith(".csv") and not f.startswith("~")]
    if not csv_files:
        raise FileNotFoundError(f"输入目录 {input_dir} 下未找到 CSV 传感器日志")
    csv_files.sort()

    all_records: List[SensorRecord] = []
    warnings: List[str] = []
    global_row = 0

    for csv_name in csv_files:
        csv_path = os.path.join(input_dir, csv_name)
        with open(csv_path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)

            missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
            if missing:
                raise ValueError(
                    f"{csv_name} 缺少必填列: {', '.join(missing)}。"
                    f"必填列: {', '.join(REQUIRED_COLUMNS)}；可选列: {', '.join(OPTIONAL_COLUMNS)}"
                )

            for line_no, row in enumerate(reader, start=2):
                global_row += 1
                try:
                    raw_val = _parse_float(row["measure_value"], "measure_value")
                    raw_unit = row["measure_unit"].strip()
                    norm_val, norm_unit, calc_steps = normalize_unit(raw_val, raw_unit)

                    rec = SensorRecord(
                        timestamp=_parse_ts(row["timestamp"]),
                        device_id=row["device_id"].strip(),
                        raw_value=raw_val,
                        raw_unit=raw_unit,
                        normalized_value=norm_val,
                        normalized_unit=norm_unit,
                        calc_steps=calc_steps,
                        unit_conversion_note=(
                            calc_steps[-1] if any("混写" in s for s in calc_steps) else ""
                        ),
                        row_index=global_row,
                    )

                    contrast = row.get("speckle_contrast", "").strip()
                    if contrast:
                        rec.speckle_contrast = _parse_float(contrast, "speckle_contrast")

                    size_um = row.get("speckle_size_um", "").strip()
                    if size_um:
                        rec.speckle_size_um = _parse_float(size_um, "speckle_size_um")

                    rec.remarks = _parse_remarks(row.get("remarks", ""))
                    rec.screenshots = _parse_screenshots(row.get("screenshots", ""))

                    ver = row.get("version", "").strip()
                    if ver:
                        rec.version = ver

                    all_records.append(rec)
                except Exception as e:
                    warnings.append(f"[跳过] {csv_name} 第 {line_no} 行: {e}")

    return all_records, warnings
