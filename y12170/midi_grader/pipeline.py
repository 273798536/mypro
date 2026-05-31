from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from midi_grader.models import (
    BadRow,
    CleanedData,
    PipelineResult,
    TraceRecord,
)
from midi_grader.midi_parser import MidiParser
from midi_grader.beat_aligner import BeatAligner
from midi_grader.error_annotator import ErrorAnnotator
from midi_grader.classifier import ResultClassifier
from midi_grader.data_cleaner import DataCleaner


class GradingPipeline:
    def __init__(
        self,
        off_beat_threshold: float = 0.1,
        boundary_threshold: float = 0.05,
        velocity_missing_threshold: int = 1,
        rest_misjudgment_gap_beats: float = 0.25,
        tempo_change_buffer_beats: float = 2.0,
    ) -> None:
        self._parser = MidiParser()
        self._aligner = BeatAligner(tempo_change_buffer_beats=tempo_change_buffer_beats)
        self._annotator = ErrorAnnotator(
            off_beat_threshold=off_beat_threshold,
            boundary_threshold=boundary_threshold,
            velocity_missing_threshold=velocity_missing_threshold,
            rest_misjudgment_gap_beats=rest_misjudgment_gap_beats,
        )
        self._classifier = ResultClassifier()
        self._cleaner = DataCleaner()
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def run(self, midi_path: str, supplementary_data: Optional[str] = None, supplementary_source: Optional[str] = None) -> PipelineResult:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step("pipeline", f"启动MIDI错拍批改管道", self._now(), midi_path=midi_path)

        parsed = self._parser.parse(midi_path)
        self._trace.add_step("pipeline", f"MIDI解析完成: {len(parsed.notes)}个音符", self._now())

        alignment = self._aligner.align(parsed)
        self._trace.add_step("pipeline", f"节拍对齐完成: {len(alignment.aligned_notes)}个对齐音符", self._now())

        annotations = self._annotator.annotate(parsed, alignment)
        self._trace.add_step("pipeline", f"错因标注完成: {len(annotations.annotations)}条标注", self._now())

        cleaned_data: Optional[CleanedData] = None
        bad_rows: List[BadRow] = []

        if supplementary_data is not None:
            cleaned_data = self._cleaner.clean_text(
                supplementary_data,
                source=supplementary_source or "supplementary",
            )
            bad_rows = cleaned_data.bad_rows
            self._trace.add_step(
                "pipeline",
                f"辅助数据清洗完成: 有效行={len(cleaned_data.valid_rows)}, 坏行={len(bad_rows)}",
                self._now(),
            )

        classification = self._classifier.classify(annotations.annotations, bad_rows=bad_rows)
        self._trace.add_step("pipeline", "分类完成", self._now(), summary=classification.summary)

        result = PipelineResult(
            parsed=parsed,
            alignment=alignment,
            annotations=annotations,
            classification=classification,
            cleaned_data=cleaned_data,
            trace=self._trace,
        )

        self._trace.add_step("pipeline", "管道执行完成", self._now())
        return result

    @property
    def trace(self) -> TraceRecord:
        return self._trace
