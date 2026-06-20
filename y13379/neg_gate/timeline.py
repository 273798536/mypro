from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import TimelineEvent, TimelineEventType


class TimelineManager:
    def __init__(self):
        self._events: List[TimelineEvent] = []
        self._by_record: Dict[str, List[TimelineEvent]] = defaultdict(list)
        self._by_type: Dict[TimelineEventType, List[TimelineEvent]] = defaultdict(list)

    def add_event(
        self,
        event_type: TimelineEventType,
        record_id: str,
        description: str,
        raw_log_ref: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> TimelineEvent:
        event = TimelineEvent(
            event_id=uuid.uuid4().hex[:12],
            event_type=event_type,
            timestamp=timestamp or datetime.now(),
            record_id=record_id,
            description=description,
            raw_log_ref=raw_log_ref,
            details=details or {},
        )
        self._events.append(event)
        self._by_record[record_id].append(event)
        self._by_type[event_type].append(event)
        return event

    def get_events_for_record(self, record_id: str) -> List[TimelineEvent]:
        return sorted(
            self._by_record.get(record_id, []),
            key=lambda e: e.timestamp,
        )

    def get_events_by_type(
        self, event_type: TimelineEventType
    ) -> List[TimelineEvent]:
        return sorted(
            self._by_type.get(event_type, []),
            key=lambda e: e.timestamp,
        )

    def get_all_events(self) -> List[TimelineEvent]:
        return sorted(self._events, key=lambda e: e.timestamp)

    def get_sample_history(self, sample_id: str) -> List[TimelineEvent]:
        results = []
        for event in self._events:
            if event.event_type == TimelineEventType.SAMPLE_CHANGE:
                if event.details.get("sample_id") == sample_id:
                    results.append(event)
            elif sample_id in str(event.raw_log_ref) or sample_id in str(event.description):
                results.append(event)
        return sorted(results, key=lambda e: e.timestamp)

    def get_version_history(self, version: str) -> List[TimelineEvent]:
        results = []
        for event in self._events:
            if event.event_type == TimelineEventType.VERSION_CHANGE:
                if event.details.get("version") == version:
                    results.append(event)
            elif version in str(event.raw_log_ref) or version in str(event.description):
                results.append(event)
        return sorted(results, key=lambda e: e.timestamp)

    def get_manual_override_history(self) -> List[TimelineEvent]:
        return self.get_events_by_type(TimelineEventType.MANUAL_OVERRIDE)

    def get_grayscale_history(self) -> List[TimelineEvent]:
        return self.get_events_by_type(TimelineEventType.GRAYSCALE_UPDATE)

    def summarize(self) -> Dict[str, Any]:
        type_counts: Dict[str, int] = defaultdict(int)
        for event in self._events:
            type_counts[event.event_type.value] += 1
        return {
            "total_events": len(self._events),
            "events_by_type": dict(type_counts),
            "records_tracked": len(self._by_record),
            "earliest": (
                self._events[0].timestamp.isoformat()
                if self._events
                else None
            ),
            "latest": (
                self._events[-1].timestamp.isoformat()
                if self._events
                else None
            ),
        }
