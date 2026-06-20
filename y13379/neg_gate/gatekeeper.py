from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .models import (
    GateRecord,
    GateStatus,
    GrayscaleResult,
    TimelineEvent,
    TimelineEventType,
    TrainingLogEntry,
)
from .normalizer import FieldNormalizer
from .timeline import TimelineManager


class GrayscaleValidationError(Exception):
    def __init__(self, record_id: str, reason: str):
        self.record_id = record_id
        self.reason = reason
        super().__init__(f"Grayscale validation suspended [{record_id}]: {reason}")


class BadDataError(Exception):
    def __init__(self, entry_id: str, refs: List[str], reason: str):
        self.entry_id = entry_id
        self.refs = refs
        self.reason = reason
        super().__init__(f"Bad data detected [{entry_id}]: {reason}")


class NegSamplingGatekeeper:
    DEFAULT_GRAYSCALE_MIN = 0.01
    DEFAULT_GRAYSCALE_MAX = 1.0
    DEFAULT_NEG_RATIO_MIN = 0.0
    DEFAULT_NEG_RATIO_MAX = 1.0
    DEFAULT_THRESHOLD_MIN = 0.0
    DEFAULT_THRESHOLD_MAX = 1.0

    def __init__(
        self,
        timeline_manager: TimelineManager,
        normalizer: Optional[FieldNormalizer] = None,
        grayscale_min: float = DEFAULT_GRAYSCALE_MIN,
        grayscale_max: float = DEFAULT_GRAYSCALE_MAX,
        neg_ratio_range: Optional[Tuple[float, float]] = None,
        threshold_range: Optional[Tuple[float, float]] = None,
        require_grayscale_ratio: bool = True,
    ):
        self.timeline = timeline_manager
        self.normalizer = normalizer or FieldNormalizer()
        self.grayscale_min = grayscale_min
        self.grayscale_max = grayscale_max
        self.neg_ratio_min = (neg_ratio_range or (self.DEFAULT_NEG_RATIO_MIN, self.DEFAULT_NEG_RATIO_MAX))[0]
        self.neg_ratio_max = (neg_ratio_range or (self.DEFAULT_NEG_RATIO_MIN, self.DEFAULT_NEG_RATIO_MAX))[1]
        self.threshold_min = (threshold_range or (self.DEFAULT_THRESHOLD_MIN, self.DEFAULT_THRESHOLD_MAX))[0]
        self.threshold_max = (threshold_range or (self.DEFAULT_THRESHOLD_MIN, self.DEFAULT_THRESHOLD_MAX))[1]
        self.require_grayscale_ratio = require_grayscale_ratio
        self._records: Dict[str, GateRecord] = {}
        self._record_counter = 0

    def _next_record_id(self) -> str:
        self._record_counter += 1
        return f"gate_{self._record_counter:06d}"

    def ingest_log(
        self,
        row: Dict[str, Any],
        source_file: Optional[str] = None,
        source_line: Optional[int] = None,
    ) -> GateRecord:
        entry = self.normalizer.normalize_row(
            row,
            source_file=source_file,
            source_line=source_line,
            original_line=str(source_line) if source_line else None,
        )
        self.timeline.add_event(
            event_type=TimelineEventType.FIELD_NORMALIZATION,
            record_id=entry.entry_id,
            description=f"Fields normalized from {len(entry.raw_fields)} raw fields",
            raw_log_ref=entry.get_original_reference(),
            details={
                "raw_keys": list(entry.raw_fields.keys()),
                "source_info": {
                    k: {
                        "original": v.original_field_name,
                        "normalized": v.normalized_field_name,
                    }
                    for k, v in entry.source_info.items()
                },
            },
        )
        record = self._evaluate(entry)
        self._records[record.record_id] = record
        return record

    def ingest_logs(
        self,
        rows: List[Dict[str, Any]],
        source_file: Optional[str] = None,
    ) -> List[GateRecord]:
        return [
            self.ingest_log(row, source_file=source_file, source_line=idx)
            for idx, row in enumerate(rows, start=1)
        ]

    def _evaluate(self, entry: TrainingLogEntry) -> GateRecord:
        record_id = self._next_record_id()
        record = GateRecord(record_id=record_id, log_entry=entry)
        bad_refs = self._detect_bad_data(entry)
        if bad_refs:
            record.bad_data_refs = bad_refs
            record.processing_status = "bad_data_detected"
            entry.quality_flag = "bad_data"
            self.timeline.add_event(
                event_type=TimelineEventType.DATA_QUALITY_ALERT,
                record_id=record_id,
                description=f"Bad data detected: {len(bad_refs)} issue(s)",
                raw_log_ref=entry.get_original_reference(),
                details={"bad_refs": bad_refs},
            )
        grayscale_suspended = self._validate_grayscale(entry, record)
        if not grayscale_suspended:
            self._check_sample_and_version(entry, record)
            if record.status == GateStatus.PENDING:
                record.status = GateStatus.APPROVED
                self.timeline.add_event(
                    event_type=TimelineEventType.GATE_DECISION,
                    record_id=record_id,
                    description="Gate approved",
                    raw_log_ref=entry.get_original_reference(),
                    details={"status": "approved"},
                )
        return record

    def _validate_grayscale(
        self, entry: TrainingLogEntry, record: GateRecord
    ) -> bool:
        ratio = entry.grayscale_ratio
        if ratio is None:
            if self.require_grayscale_ratio:
                reason = (
                    f"Grayscale ratio is missing for entry {entry.entry_id}. "
                    f"Suspended for person-in-charge confirmation."
                )
                record.suspend(reason)
                self.timeline.add_event(
                    event_type=TimelineEventType.GATE_DECISION,
                    record_id=record.record_id,
                    description=reason,
                    raw_log_ref=entry.get_original_reference(),
                    details={"status": "suspended", "reason": "missing_grayscale_ratio"},
                )
                return True
            return False

        if math.isnan(ratio) or math.isinf(ratio):
            reason = (
                f"Grayscale ratio is NaN/Inf ({ratio}) for entry {entry.entry_id}. "
                f"Suspended for person-in-charge confirmation."
            )
            record.suspend(reason)
            self.timeline.add_event(
                event_type=TimelineEventType.GATE_DECISION,
                record_id=record.record_id,
                description=reason,
                raw_log_ref=entry.get_original_reference(),
                details={"status": "suspended", "reason": "invalid_grayscale_ratio", "value": ratio},
            )
            return True

        if ratio < self.grayscale_min or ratio > self.grayscale_max:
            reason = (
                f"Grayscale ratio {ratio} out of valid range "
                f"[{self.grayscale_min}, {self.grayscale_max}] for entry {entry.entry_id}. "
                f"Suspended for person-in-charge confirmation rather than giving a false stable conclusion."
            )
            record.suspend(reason)
            self.timeline.add_event(
                event_type=TimelineEventType.GATE_DECISION,
                record_id=record.record_id,
                description=reason,
                raw_log_ref=entry.get_original_reference(),
                details={
                    "status": "suspended",
                    "reason": "grayscale_ratio_out_of_range",
                    "value": ratio,
                    "valid_range": [self.grayscale_min, self.grayscale_max],
                },
            )
            return True

        return False

    def _detect_bad_data(self, entry: TrainingLogEntry) -> List[str]:
        refs: List[str] = []
        neg = entry.neg_sample_ratio
        if neg is not None:
            if math.isnan(neg) or math.isinf(neg):
                refs.append(
                    f"neg_sample_ratio is NaN/Inf ({neg}) at {entry.get_original_reference()}"
                )
            elif neg < self.neg_ratio_min or neg > self.neg_ratio_max:
                refs.append(
                    f"neg_sample_ratio {neg} out of range [{self.neg_ratio_min}, {self.neg_ratio_max}] at {entry.get_original_reference()}"
                )

        thr = entry.threshold
        if thr is not None:
            if math.isnan(thr) or math.isinf(thr):
                refs.append(
                    f"threshold is NaN/Inf ({thr}) at {entry.get_original_reference()}"
                )
            elif thr < self.threshold_min or thr > self.threshold_max:
                refs.append(
                    f"threshold {thr} out of range [{self.threshold_min}, {self.threshold_max}] at {entry.get_original_reference()}"
                )

        pred = entry.prediction
        if pred is not None:
            if math.isnan(pred) or math.isinf(pred):
                refs.append(
                    f"prediction is NaN/Inf at {entry.get_original_reference()}"
                )

        return refs

    def _check_sample_and_version(
        self, entry: TrainingLogEntry, record: GateRecord
    ) -> None:
        if entry.sample_id is not None:
            self.timeline.add_event(
                event_type=TimelineEventType.SAMPLE_CHANGE,
                record_id=record.record_id,
                description=f"Sample observed: {entry.sample_id}",
                raw_log_ref=entry.get_original_reference(),
                details={"sample_id": entry.sample_id},
            )
        if entry.version is not None:
            self.timeline.add_event(
                event_type=TimelineEventType.VERSION_CHANGE,
                record_id=record.record_id,
                description=f"Version observed: {entry.version}",
                raw_log_ref=entry.get_original_reference(),
                details={"version": entry.version},
            )
        if entry.threshold is not None:
            self.timeline.add_event(
                event_type=TimelineEventType.THRESHOLD_CHANGE,
                record_id=record.record_id,
                description=f"Threshold: {entry.threshold}",
                raw_log_ref=entry.get_original_reference(),
                details={"threshold": entry.threshold},
            )

    def confirm_suspended(
        self, record_id: str, confirmed_by: str, action: str = "approve"
    ) -> GateRecord:
        record = self._records.get(record_id)
        if record is None:
            raise KeyError(f"No gate record found: {record_id}")
        if record.status != GateStatus.SUSPENDED:
            raise ValueError(
                f"Record {record_id} is not suspended (current: {record.status.value})"
            )
        if action == "approve":
            record.approve(confirmed_by)
            self.timeline.add_event(
                event_type=TimelineEventType.MANUAL_OVERRIDE,
                record_id=record_id,
                description=f"Suspended record approved by {confirmed_by}",
                raw_log_ref=record.log_entry.get_original_reference(),
                details={"action": "approve", "confirmed_by": confirmed_by},
            )
        elif action == "reject":
            record.reject()
            self.timeline.add_event(
                event_type=TimelineEventType.MANUAL_OVERRIDE,
                record_id=record_id,
                description=f"Suspended record rejected by {confirmed_by}",
                raw_log_ref=record.log_entry.get_original_reference(),
                details={"action": "reject", "confirmed_by": confirmed_by},
            )
        else:
            raise ValueError(f"Unknown action: {action}")
        return record

    def build_grayscale_result(
        self,
        record: GateRecord,
        sample_count_before: int,
        sample_count_after: int,
        threshold_before: Optional[float] = None,
        threshold_after: Optional[float] = None,
        metric_before: Optional[float] = None,
        metric_after: Optional[float] = None,
        manual_overrides: Optional[List[str]] = None,
    ) -> GrayscaleResult:
        entry = record.log_entry
        ratio = entry.grayscale_ratio if entry.grayscale_ratio is not None else 0.0
        result = GrayscaleResult(
            grayscale_ratio=ratio,
            sample_count_before=sample_count_before,
            sample_count_after=sample_count_after,
            threshold_before=threshold_before,
            threshold_after=threshold_after,
            metric_before=metric_before,
            metric_after=metric_after,
            manual_overrides=manual_overrides or [],
        )
        record.grayscale_result = result
        self.timeline.add_event(
            event_type=TimelineEventType.GRAYSCALE_UPDATE,
            record_id=record.record_id,
            description=f"Grayscale result attached: ratio={ratio}",
            raw_log_ref=entry.get_original_reference(),
            details=result.breakdown(),
        )
        return result

    def get_record(self, record_id: str) -> Optional[GateRecord]:
        return self._records.get(record_id)

    def list_records(
        self, status: Optional[GateStatus] = None
    ) -> List[GateRecord]:
        records = list(self._records.values())
        if status:
            records = [r for r in records if r.status == status]
        return sorted(records, key=lambda r: r.record_id)

    def find_original_log(self, entry_id: str) -> Optional[TrainingLogEntry]:
        for record in self._records.values():
            if record.log_entry.entry_id == entry_id:
                return record.log_entry
        return None

    def explain_processing(self, record_id: str) -> Dict[str, Any]:
        record = self._records.get(record_id)
        if record is None:
            return {"error": f"No gate record found: {record_id}"}
        entry = record.log_entry
        timeline_events = self.timeline.get_events_for_record(record_id)
        return {
            "record_id": record_id,
            "entry_id": entry.entry_id,
            "status": record.status.value,
            "suspended_reason": record.suspended_reason,
            "original_fields": entry.raw_fields,
            "source_info": {
                k: {
                    "original_field_name": v.original_field_name,
                    "raw_value": v.raw_value,
                    "source_file": v.source_file,
                    "source_line": v.source_line,
                }
                for k, v in entry.source_info.items()
            },
            "bad_data_refs": record.bad_data_refs,
            "grayscale_breakdown": record.grayscale_result.breakdown() if record.grayscale_result else None,
            "timeline": [
                {
                    "event_type": e.event_type.value,
                    "timestamp": e.timestamp.isoformat(),
                    "description": e.description,
                    "raw_log_ref": e.raw_log_ref,
                    "details": e.details,
                }
                for e in timeline_events
            ],
        }
