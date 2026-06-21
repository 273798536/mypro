from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any, Callable

from .models import TraceRecord, TaskStatus, PollutionStatus, RunStats


REQUIRED_FIELDS = ["sample_id"]
OPTIONAL_FIELDS = [
    "prediction_score",
    "threshold",
    "ground_truth",
    "predicted_label",
    "pollution_note",
    "is_pollution",
    "skip_reason",
]


@dataclass
class LoadResult:
    records: List[TraceRecord]
    bad_rows: List[Tuple[int, str, str]]  # (row_number, raw_line, error_msg)
    skipped_rows: List[Tuple[int, str, str]]  # (row_number, sample_id, reason)
    stats: RunStats


def _sniff_dialect(file_path: str, sample_size: int = 8192) -> csv.Dialect:
    with open(file_path, "r", encoding="utf-8", newline="") as f:
        sample = f.read(sample_size)
    try:
        return csv.Sniffer().sniff(sample, delimiters=",\t;|")
    except csv.Error:
        class DefaultDialect(csv.excel):
            delimiter = ","
        return DefaultDialect()


def load_csv(
    file_path: str,
    version_tag: Optional[str] = None,
    required_fields: Optional[List[str]] = None,
    pollution_detector: Optional[Callable[[Dict[str, Any]], Optional[PollutionStatus]]] = None,
    skip_filter: Optional[Callable[[Dict[str, Any]], Optional[str]]] = None,
) -> LoadResult:
    req = required_fields or REQUIRED_FIELDS
    dialect = _sniff_dialect(file_path)
    stats = RunStats()
    records: List[TraceRecord] = []
    bad_rows: List[Tuple[int, str, str]] = []
    skipped_rows: List[Tuple[int, str, str]] = []

    with open(file_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f, dialect)
        header: Optional[List[str]] = None
        row_number = 0

        for raw_row in reader:
            row_number += 1
            line = dialect.delimiter.join(raw_row)

            if header is None:
                header = [h.strip() for h in raw_row]
                missing = [f for f in req if f not in header]
                if missing:
                    raise ValueError(
                        f"CSV 缺少必填列: {', '.join(missing)}。"
                        f"实际列: {', '.join(header)}"
                    )
                continue

            try:
                row_dict: Dict[str, Any] = {}
                if len(raw_row) >= len(header):
                    row_dict = dict(zip(header, raw_row[: len(header)]))
                else:
                    padded = raw_row + [""] * (len(header) - len(raw_row))
                    row_dict = dict(zip(header, padded))

                sample_id_val = str(row_dict.get("sample_id", "")).strip()
                if skip_filter and sample_id_val:
                    skip_reason = skip_filter(row_dict)
                    if skip_reason:
                        rec = TraceRecord(
                            sample_id=sample_id_val,
                            raw_data=row_dict,
                            row_number=row_number,
                            status=TaskStatus.SKIPPED,
                            version_tag=version_tag,
                        )
                        rec.add_log(f"跳过: {skip_reason}")
                        if len(raw_row) != len(header):
                            rec.add_log(f"注意: 列数不匹配 (期望 {len(header)}, 实际 {len(raw_row)})")
                        records.append(rec)
                        skipped_rows.append((row_number, sample_id_val, skip_reason))
                        stats.inc(TaskStatus.SKIPPED)
                        continue

                if len(raw_row) != len(header):
                    raise ValueError(
                        f"列数不匹配: 期望 {len(header)} 列, 实际 {len(raw_row)} 列"
                    )

                for field_name in req:
                    val = row_dict.get(field_name, "")
                    if not val or not str(val).strip():
                        raise ValueError(f"必填字段 '{field_name}' 为空")

                sample_id = sample_id_val

                rec = TraceRecord(
                    sample_id=sample_id,
                    raw_data=row_dict,
                    row_number=row_number,
                    version_tag=version_tag,
                )

                if "prediction_score" in row_dict and row_dict["prediction_score"]:
                    try:
                        rec.prediction_score = float(row_dict["prediction_score"])
                    except (ValueError, TypeError):
                        rec.add_log(f"prediction_score 无法解析为浮点数: {row_dict['prediction_score']}")

                if "threshold" in row_dict and row_dict["threshold"]:
                    try:
                        rec.threshold = float(row_dict["threshold"])
                    except (ValueError, TypeError):
                        rec.add_log(f"threshold 无法解析为浮点数: {row_dict['threshold']}")

                if "ground_truth" in row_dict:
                    rec.ground_truth = row_dict["ground_truth"]
                if "predicted_label" in row_dict:
                    rec.predicted_label = row_dict["predicted_label"]

                pollution = PollutionStatus.CLEAN
                if "is_pollution" in row_dict:
                    pv = str(row_dict["is_pollution"]).lower().strip()
                    if pv in ("1", "true", "yes", "confirmed"):
                        pollution = PollutionStatus.CONFIRMED
                    elif pv in ("suspect", "suspected", "maybe"):
                        pollution = PollutionStatus.SUSPECTED
                if pollution_detector:
                    detected = pollution_detector(row_dict)
                    if detected:
                        pollution = detected
                rec.pollution = pollution

                records.append(rec)
                stats.inc(TaskStatus.PENDING)
                stats.inc_pollution(pollution)

            except Exception as e:
                bad_rec = TraceRecord(
                    sample_id=f"BAD_ROW_{row_number}",
                    raw_data={"_raw_line": line, "_error": str(e)},
                    row_number=row_number,
                    status=TaskStatus.BAD_ROW,
                    error_message=str(e),
                    version_tag=version_tag,
                )
                bad_rec.add_log(f"坏行: {e}")
                records.append(bad_rec)
                bad_rows.append((row_number, line, str(e)))
                stats.inc(TaskStatus.BAD_ROW)

    return LoadResult(
        records=records,
        bad_rows=bad_rows,
        skipped_rows=skipped_rows,
        stats=stats,
    )
