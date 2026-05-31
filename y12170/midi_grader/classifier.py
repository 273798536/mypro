from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from midi_grader.models import (
    BadRow,
    ClassificationResult,
    ErrorAnnotation,
    ErrorType,
    Severity,
    TraceRecord,
)


class ResultClassifier:
    def __init__(self) -> None:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def classify(
        self,
        annotations: List[ErrorAnnotation],
        bad_rows: Optional[List[BadRow]] = None,
    ) -> ClassificationResult:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step(
            "classify",
            f"开始分类，共{len(annotations)}条标注",
            self._now(),
            annotation_count=len(annotations),
        )

        normal: List[ErrorAnnotation] = []
        boundary: List[ErrorAnnotation] = []
        bad: List[ErrorAnnotation] = []
        tempo_change_notes: List[ErrorAnnotation] = []

        for ann in annotations:
            if ann.aligned_note.is_in_tempo_change and ann.error_type != ErrorType.NONE:
                tempo_change_notes.append(ann)
                continue

            if ann.error_type == ErrorType.NONE:
                normal.append(ann)
            elif ann.severity == Severity.BOUNDARY:
                boundary.append(ann)
            elif ann.severity == Severity.BAD:
                bad.append(ann)
            else:
                normal.append(ann)

        self._trace.add_step(
            "classify",
            f"分类完成: 正常={len(normal)}, 边界={len(boundary)}, 坏={len(bad)}, 速度变化={len(tempo_change_notes)}",
            self._now(),
            normal=len(normal),
            boundary=len(boundary),
            bad=len(bad),
            tempo_change=len(tempo_change_notes),
        )

        result = ClassificationResult(
            normal=normal,
            boundary=boundary,
            bad=bad,
            tempo_change_notes=tempo_change_notes,
            bad_rows=bad_rows or [],
            trace=self._trace,
        )

        return result

    @property
    def trace(self) -> TraceRecord:
        return self._trace
