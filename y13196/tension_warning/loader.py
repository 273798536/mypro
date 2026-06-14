from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json
import csv
import os

from .config import (
    FieldMapping,
    ProcessStatus,
    DEFAULT_FIELD_MAPPINGS,
    FAILURE_REASONS,
    ThresholdConfig,
    DEFAULT_THRESHOLD,
)


@dataclass
class StandardRecord:
    seq: int
    timestamp: Optional[float]
    tension: Optional[float]
    direction_raw: Optional[str]
    sensor_id: Optional[str]
    stage: Optional[str]
    source_row: Dict[str, Any]
    source_fields: Dict[str, str]
    is_gap: bool = False
    tension_valid: bool = True
    invalid_reason: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "seq": self.seq,
            "timestamp": self.timestamp,
            "tension": self.tension,
            "direction_raw": self.direction_raw,
            "sensor_id": self.sensor_id,
            "stage": self.stage,
            "is_gap": self.is_gap,
            "tension_valid": self.tension_valid,
            "invalid_reason": self.invalid_reason,
            "source_fields": self.source_fields,
        }


@dataclass
class FieldMatchTrace:
    standard_name: str
    matched_source_name: Optional[str]
    candidate_checked: List[str]
    mapping_version: str = "default_v1"

    def to_dict(self) -> Dict:
        return {
            "standard_name": self.standard_name,
            "matched_source_name": self.matched_source_name,
            "candidate_checked": self.candidate_checked,
            "mapping_version": self.mapping_version,
        }


@dataclass
class LoadResult:
    success: bool
    status: ProcessStatus
    records: List[StandardRecord] = field(default_factory=list)
    field_traces: Dict[str, FieldMatchTrace] = field(default_factory=dict)
    source_file: Optional[str] = None
    source_format: Optional[str] = None
    total_source_rows: int = 0
    loaded_count: int = 0
    gap_count: int = 0
    invalid_tension_count: int = 0
    failure_reason: Optional[Dict[str, Any]] = None
    load_time: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "status": self.status.value,
            "source_file": self.source_file,
            "source_format": self.source_format,
            "total_source_rows": self.total_source_rows,
            "loaded_count": self.loaded_count,
            "gap_count": self.gap_count,
            "invalid_tension_count": self.invalid_tension_count,
            "gap_ratio": (self.gap_count / self.total_source_rows) if self.total_source_rows > 0 else 0.0,
            "field_traces": {k: v.to_dict() for k, v in self.field_traces.items()},
            "records_preview": [r.to_dict() for r in self.records[:5]],
            "failure_reason": self.failure_reason,
            "load_time": self.load_time,
        }


class NameplateLoader:
    def __init__(
        self,
        mapping: Optional[FieldMapping] = None,
        threshold: Optional[ThresholdConfig] = None,
    ):
        self.mapping = mapping or DEFAULT_FIELD_MAPPINGS
        self.threshold = threshold or DEFAULT_THRESHOLD

    def _find_field(self, row_keys: List[str], candidates: List[str], standard_name: str) -> FieldMatchTrace:
        trace = FieldMatchTrace(
            standard_name=standard_name,
            matched_source_name=None,
            candidate_checked=[],
        )
        row_keys_lower = {k.lower(): k for k in row_keys}
        for cand in candidates:
            trace.candidate_checked.append(cand)
            if cand in row_keys:
                trace.matched_source_name = cand
                break
            if cand.lower() in row_keys_lower:
                trace.matched_source_name = row_keys_lower[cand.lower()]
                break
        return trace

    def _parse_tension(self, val: Any) -> Tuple[Optional[float], bool, Optional[str]]:
        if val is None or val == "":
            return None, False, "空值"
        try:
            f = float(val)
        except (ValueError, TypeError):
            return None, False, f"无法解析为数值: {val}"
        if f < self.threshold.valid_tension_min or f > self.threshold.valid_tension_max:
            return f, False, f"超出有效范围[{self.threshold.valid_tension_min}, {self.threshold.valid_tension_max}]"
        return f, True, None

    def _parse_timestamp(self, val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        if isinstance(val, (int, float)):
            return float(val)
        try:
            return float(val)
        except (ValueError, TypeError):
            pass
        try:
            if isinstance(val, str):
                for fmt in [
                    "%Y-%m-%d %H:%M:%S",
                    "%Y/%m/%d %H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S",
                    "%Y-%m-%d %H:%M:%S.%f",
                    "%Y%m%d%H%M%S",
                ]:
                    try:
                        return datetime.strptime(val, fmt).timestamp()
                    except ValueError:
                        continue
        except Exception:
            pass
        return None

    def _read_source(self, file_path: str) -> Tuple[List[Dict[str, Any]], str]:
        ext = os.path.splitext(file_path)[1].lower()
        rows = []
        fmt = ext.lstrip(".")
        if ext == ".json":
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                rows = data
            elif isinstance(data, dict) and "records" in data and isinstance(data["records"], list):
                rows = data["records"]
            elif isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                rows = data["data"]
            else:
                rows = [data]
        elif ext in (".csv", ".txt"):
            with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")
        return rows, fmt

    def load_file(self, file_path: str) -> LoadResult:
        try:
            source_rows, source_fmt = self._read_source(file_path)
        except Exception as e:
            reason = FAILURE_REASONS["EMPTY_DATA"].to_dict()
            reason["detail"] = f"读取文件失败: {str(e)}"
            return LoadResult(
                success=False,
                status=ProcessStatus.FAILED,
                source_file=file_path,
                failure_reason=reason,
            )
        return self.load_records(source_rows, source_file=file_path, source_format=source_fmt)

    def load_records(
        self,
        source_rows: List[Dict[str, Any]],
        source_file: Optional[str] = None,
        source_format: Optional[str] = None,
    ) -> LoadResult:
        result = LoadResult(
            success=False,
            status=ProcessStatus.PENDING,
            source_file=source_file,
            source_format=source_format,
            total_source_rows=len(source_rows),
        )

        if not source_rows:
            result.status = ProcessStatus.FAILED
            result.failure_reason = FAILURE_REASONS["EMPTY_DATA"].to_dict()
            return result

        sample_keys = list(source_rows[0].keys())

        traces = {}
        traces["tension"] = self._find_field(sample_keys, self.mapping.tension_fields, "tension")
        traces["timestamp"] = self._find_field(sample_keys, self.mapping.timestamp_fields, "timestamp")
        traces["direction"] = self._find_field(sample_keys, self.mapping.direction_fields, "direction")
        traces["sensor_id"] = self._find_field(sample_keys, self.mapping.sensor_id_fields, "sensor_id")
        traces["stage"] = self._find_field(sample_keys, self.mapping.load_stage_fields, "stage")
        traces["sequence"] = self._find_field(sample_keys, self.mapping.sequence_fields, "sequence")
        result.field_traces = traces

        if traces["tension"].matched_source_name is None:
            result.status = ProcessStatus.FAILED
            result.failure_reason = FAILURE_REASONS["NO_TENSION_FIELD"].to_dict()
            result.failure_reason["detail"] = (
                f"已尝试别名: {traces['tension'].candidate_checked}; "
                f"实际字段: {sample_keys}"
            )
            return result

        if traces["timestamp"].matched_source_name is None and traces["sequence"].matched_source_name is None:
            result.status = ProcessStatus.FAILED
            result.failure_reason = FAILURE_REASONS["NO_TIMESTAMP_FIELD"].to_dict()
            result.failure_reason["detail"] = (
                f"时间戳字段尝试: {traces['timestamp'].candidate_checked}; "
                f"序号字段尝试: {traces['sequence'].candidate_checked}"
            )
            return result

        result.status = ProcessStatus.LOADED
        standard_records: List[StandardRecord] = []
        for idx, row in enumerate(source_rows):
            src_fields = {}
            seq_val = idx + 1
            if traces["sequence"].matched_source_name:
                try:
                    seq_val = int(row[traces["sequence"].matched_source_name])
                    src_fields["sequence"] = traces["sequence"].matched_source_name
                except (ValueError, TypeError, KeyError):
                    seq_val = idx + 1

            ts = None
            if traces["timestamp"].matched_source_name:
                ts = self._parse_timestamp(row.get(traces["timestamp"].matched_source_name))
                src_fields["timestamp"] = traces["timestamp"].matched_source_name

            tension_raw = row.get(traces["tension"].matched_source_name)
            tension, tension_valid, invalid_reason = self._parse_tension(tension_raw)
            src_fields["tension"] = traces["tension"].matched_source_name

            direction_raw = None
            if traces["direction"].matched_source_name:
                direction_raw = row.get(traces["direction"].matched_source_name)
                if direction_raw is not None:
                    direction_raw = str(direction_raw).strip()
                    src_fields["direction"] = traces["direction"].matched_source_name

            sensor_id = None
            if traces["sensor_id"].matched_source_name:
                sensor_id = row.get(traces["sensor_id"].matched_source_name)
                if sensor_id is not None:
                    src_fields["sensor_id"] = traces["sensor_id"].matched_source_name

            stage = None
            if traces["stage"].matched_source_name:
                stage = row.get(traces["stage"].matched_source_name)
                if stage is not None:
                    src_fields["stage"] = traces["stage"].matched_source_name

            is_gap = tension is None

            rec = StandardRecord(
                seq=seq_val,
                timestamp=ts,
                tension=tension,
                direction_raw=direction_raw,
                sensor_id=str(sensor_id) if sensor_id is not None else None,
                stage=str(stage) if stage is not None else None,
                source_row=row,
                source_fields=src_fields,
                is_gap=is_gap,
                tension_valid=tension_valid,
                invalid_reason=invalid_reason,
            )
            standard_records.append(rec)

        result.records = sorted(standard_records, key=lambda r: (r.seq, r.timestamp or 0))
        result.status = ProcessStatus.STANDARDIZED
        result.loaded_count = len(result.records)
        result.gap_count = sum(1 for r in result.records if r.is_gap)
        result.invalid_tension_count = sum(1 for r in result.records if not r.tension_valid and not r.is_gap)

        has_invalid = result.invalid_tension_count > 0
        gap_ratio = result.gap_count / result.total_source_rows if result.total_source_rows > 0 else 0
        too_gappy = gap_ratio > self.threshold.max_gap_ratio

        if too_gappy and not has_invalid:
            result.failure_reason = FAILURE_REASONS["TOO_MANY_GAPS"].to_dict()
            result.failure_reason["detail"] = (
                f"缺失比例 {gap_ratio:.1%} 超过阈值 {self.threshold.max_gap_ratio:.1%}"
            )
        elif has_invalid:
            reason = FAILURE_REASONS["INVALID_TENSION_VALUE"].to_dict()
            reason["detail"] = (
                f"超限条数 {result.invalid_tension_count}，"
                f"示例: {next((r.invalid_reason for r in result.records if r.invalid_reason), '无')}"
            )
            if result.failure_reason is None:
                result.failure_reason = reason

        result.success = True
        return result
