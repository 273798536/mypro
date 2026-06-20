from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .models import SourceInfo, TrainingLogEntry

_CANONICAL_FIELDS: Dict[str, List[str]] = {
    "sample_id": [
        "sample_id",
        "sampleid",
        "sample_name",
        "sid",
        "id",
        "样本id",
        "样本ID",
    ],
    "version": [
        "version",
        "ver",
        "model_version",
        "model_ver",
        "版本",
        "模型版本",
    ],
    "neg_sample_ratio": [
        "neg_sample_ratio",
        "neg_ratio",
        "negative_ratio",
        "neg_sample_rate",
        "ns_ratio",
        "负采样比例",
        "负采样率",
        "负样本比例",
    ],
    "threshold": [
        "threshold",
        "thresh",
        "cut_off",
        "cutoff",
        "阈值",
        "判定阈值",
    ],
    "grayscale_ratio": [
        "grayscale_ratio",
        "gray_ratio",
        "canary_ratio",
        "gray_scale",
        "灰度比例",
        "灰度率",
        "灰度",
    ],
    "metric_value": [
        "metric_value",
        "metric",
        "score",
        "val",
        "指标值",
        "分数",
    ],
    "metric_name": [
        "metric_name",
        "metric_type",
        "指标名",
        "指标名称",
    ],
    "label": [
        "label",
        "true_label",
        "ground_truth",
        "标签",
        "真实标签",
    ],
    "prediction": [
        "prediction",
        "pred",
        "pred_score",
        "预测值",
        "预测分数",
    ],
    "timestamp": [
        "timestamp",
        "ts",
        "time",
        "datetime",
        "date",
        "时间",
        "时间戳",
    ],
}

_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for canonical, aliases in _CANONICAL_FIELDS.items():
    for alias in aliases:
        key = alias.lower().strip()
        _ALIAS_TO_CANONICAL[key] = canonical


class FieldNormalizationError(Exception):
    pass


class FieldNormalizer:
    def __init__(self, extra_aliases: Optional[Dict[str, List[str]]] = None):
        self._alias_map = dict(_ALIAS_TO_CANONICAL)
        self._unknown_counter = 0
        if extra_aliases:
            for canonical, aliases in extra_aliases.items():
                for alias in aliases:
                    self._alias_map[alias.lower().strip()] = canonical

    def normalize_field(self, raw_name: str) -> str:
        key = raw_name.lower().strip()
        if key in self._alias_map:
            return self._alias_map[key]
        return f"_unknown_{self._unknown_counter}"
    
    def normalize_row(
        self,
        row: Dict[str, Any],
        source_file: Optional[str] = None,
        source_line: Optional[int] = None,
        original_line: Optional[str] = None,
    ) -> TrainingLogEntry:
        normalized: Dict[str, Any] = {}
        source_info: Dict[str, SourceInfo] = {}
        raw_fields: Dict[str, Any] = dict(row)

        unknown_idx = 0
        for raw_key, value in row.items():
            canonical = self.normalize_field(raw_key)
            if canonical.startswith("_unknown_"):
                canonical = f"_unknown_{unknown_idx}"
                unknown_idx += 1
            si = SourceInfo(
                original_field_name=raw_key,
                normalized_field_name=canonical,
                raw_value=value,
                source_file=source_file,
                source_line=source_line,
            )
            source_info[canonical] = si
            if canonical in normalized:
                pass
            normalized[canonical] = value

        ts = normalized.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except (ValueError, TypeError):
                ts = datetime.now()
        elif not isinstance(ts, datetime):
            ts = datetime.now()

        entry_id = (
            normalized.get("sample_id")
            or normalized.get("version")
            or f"entry_{id(row):x}"
        )
        if isinstance(entry_id, (int, float)):
            entry_id = str(int(entry_id))

        entry = TrainingLogEntry(
            entry_id=str(entry_id),
            timestamp=ts,
            sample_id=normalized.get("sample_id"),
            version=normalized.get("version"),
            neg_sample_ratio=self._to_float(normalized.get("neg_sample_ratio")),
            threshold=self._to_float(normalized.get("threshold")),
            grayscale_ratio=self._to_float(normalized.get("grayscale_ratio")),
            metric_value=self._to_float(normalized.get("metric_value")),
            metric_name=normalized.get("metric_name"),
            label=self._to_int(normalized.get("label")),
            prediction=self._to_float(normalized.get("prediction")),
            raw_fields=raw_fields,
            source_info=source_info,
            processing_status="normalized",
            original_line=original_line,
        )
        return entry

    def normalize_rows(
        self,
        rows: List[Dict[str, Any]],
        source_file: Optional[str] = None,
    ) -> List[TrainingLogEntry]:
        entries = []
        for idx, row in enumerate(rows, start=1):
            entry = self.normalize_row(
                row,
                source_file=source_file,
                source_line=idx,
                original_line=str(idx),
            )
            entries.append(entry)
        return entries

    def get_source_info_for_field(
        self, entry: TrainingLogEntry, canonical_name: str
    ) -> Optional[SourceInfo]:
        return entry.source_info.get(canonical_name)

    def get_original_field_name(
        self, entry: TrainingLogEntry, canonical_name: str
    ) -> Optional[str]:
        si = entry.source_info.get(canonical_name)
        if si:
            return si.original_field_name
        return None

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_int(value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
