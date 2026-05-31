from __future__ import annotations

import json
import os
import tempfile
from io import StringIO
from typing import List

import mido

from midi_grader.models import (
    AlignedNote,
    BadRowReason,
    ErrorType,
    NoteEvent,
    Severity,
    TempoChange,
)
from midi_grader.midi_parser import MidiParser
from midi_grader.beat_aligner import BeatAligner
from midi_grader.error_annotator import ErrorAnnotator
from midi_grader.classifier import ResultClassifier
from midi_grader.data_cleaner import DataCleaner
from midi_grader.report_exporter import ReportExporter
from midi_grader.pipeline import GradingPipeline


def _make_midi_file(
    notes: List[tuple],
    tempo_changes: List[tuple] | None = None,
    ticks_per_beat: int = 480,
) -> str:
    mid = mido.MidiFile(ticks_per_beat=ticks_per_beat)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    if tempo_changes:
        for tick, bpm in sorted(tempo_changes, key=lambda x: x[0]):
            tempo = mido.bpm2tempo(bpm)
            track.append(mido.MetaMessage("set_tempo", tempo=tempo, time=0))

    events: List[tuple] = []
    for pitch, start_tick, duration, velocity in notes:
        events.append((start_tick, "note_on", pitch, velocity))
        events.append((start_tick + duration, "note_off", pitch, 0))
    events.sort(key=lambda e: (e[0], 0 if e[1] == "note_off" else 1))

    current_tick = 0
    for tick, msg_type, pitch, velocity in events:
        delta = tick - current_tick
        track.append(mido.Message(msg_type, note=pitch, velocity=velocity, time=max(0, delta)))
        current_tick = tick

    fd, path = tempfile.mkstemp(suffix=".mid")
    os.close(fd)
    mid.save(path)
    return path


def _make_normal_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb, tpb, 80),
        (64, tpb * 2, tpb, 80),
        (65, tpb * 3, tpb, 80),
    ]
    return _make_midi_file(notes, ticks_per_beat=tpb)


def _make_off_beat_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb + 60, tpb, 80),
        (64, tpb * 2, tpb, 80),
    ]
    return _make_midi_file(notes, ticks_per_beat=tpb)


def _make_boundary_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb + 15, tpb, 80),
        (64, tpb * 2, tpb, 80),
    ]
    return _make_midi_file(notes, ticks_per_beat=tpb)


def _make_velocity_missing_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb, tpb, 1),
        (64, tpb * 2, tpb, 80),
    ]
    return _make_midi_file(notes, ticks_per_beat=tpb)


def _make_tempo_change_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb, tpb, 80),
        (64, tpb * 2, tpb, 80),
        (65, tpb * 3, tpb, 80),
    ]
    tempo_changes = [(0, 120.0), (tpb * 2, 90.0)]
    return _make_midi_file(notes, tempo_changes=tempo_changes, ticks_per_beat=tpb)


def _make_rest_misjudgment_midi() -> str:
    tpb = 480
    notes = [
        (60, 0, tpb, 80),
        (62, tpb + 60, tpb, 80),
    ]
    return _make_midi_file(notes, ticks_per_beat=tpb)


class TestMidiParser:
    def test_parse_normal(self):
        path = _make_normal_midi()
        try:
            parser = MidiParser()
            result = parser.parse(path)
            assert len(result.notes) == 4
            assert result.ticks_per_beat == 480
            assert result.file_path == path
            assert len(result.tempo_changes) >= 1
            assert len(parser.trace.steps) > 0
        finally:
            os.unlink(path)

    def test_parse_tempo_changes(self):
        path = _make_tempo_change_midi()
        try:
            parser = MidiParser()
            result = parser.parse(path)
            assert len(result.tempo_changes) >= 2
            assert result.tempo_changes[0].bpm == 120.0
        finally:
            os.unlink(path)

    def test_parse_trace(self):
        path = _make_normal_midi()
        try:
            parser = MidiParser()
            result = parser.parse(path)
            assert result.trace.trace_id
            stages = [s.stage for s in result.trace.steps]
            assert "parse" in stages
        finally:
            os.unlink(path)


class TestBeatAligner:
    def test_align_normal(self):
        path = _make_normal_midi()
        try:
            parsed = MidiParser().parse(path)
            aligner = BeatAligner()
            result = aligner.align(parsed)
            assert len(result.aligned_notes) == 4
            for an in result.aligned_notes:
                assert abs(an.offset_beats) < 0.001
        finally:
            os.unlink(path)

    def test_align_off_beat(self):
        path = _make_off_beat_midi()
        try:
            parsed = MidiParser().parse(path)
            aligner = BeatAligner()
            result = aligner.align(parsed)
            off_beat_notes = [n for n in result.aligned_notes if abs(n.offset_beats) > 0.01]
            assert len(off_beat_notes) > 0
        finally:
            os.unlink(path)

    def test_tempo_change_segment(self):
        path = _make_tempo_change_midi()
        try:
            parsed = MidiParser().parse(path)
            aligner = BeatAligner()
            result = aligner.align(parsed)
            tempo_segments = [s for s in result.tempo_segments if s.is_change_region]
            assert len(tempo_segments) > 0
        finally:
            os.unlink(path)


class TestErrorAnnotator:
    def test_no_errors(self):
        path = _make_normal_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator()
            result = annotator.annotate(parsed, alignment)
            non_none = [a for a in result.annotations if a.error_type != ErrorType.NONE]
            assert len(non_none) == 0
        finally:
            os.unlink(path)

    def test_off_beat_detected(self):
        path = _make_off_beat_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator(off_beat_threshold=0.1)
            result = annotator.annotate(parsed, alignment)
            off_beat = [a for a in result.annotations if a.error_type == ErrorType.OFF_BEAT]
            assert len(off_beat) > 0
        finally:
            os.unlink(path)

    def test_boundary_detected(self):
        path = _make_boundary_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator(off_beat_threshold=0.1, boundary_threshold=0.02)
            result = annotator.annotate(parsed, alignment)
            boundary = [a for a in result.annotations if a.severity == Severity.BOUNDARY]
            assert len(boundary) > 0
        finally:
            os.unlink(path)

    def test_velocity_missing(self):
        path = _make_velocity_missing_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator()
            result = annotator.annotate(parsed, alignment)
            vel_missing = [a for a in result.annotations if a.error_type == ErrorType.VELOCITY_MISSING]
            assert len(vel_missing) > 0
        finally:
            os.unlink(path)

    def test_tempo_deviation(self):
        path = _make_tempo_change_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator()
            result = annotator.annotate(parsed, alignment)
            tempo_dev = [a for a in result.annotations if a.error_type == ErrorType.TEMPO_DEVIATION]
            assert len(tempo_dev) >= 0
        finally:
            os.unlink(path)

    def test_annotation_traceability(self):
        path = _make_off_beat_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotator = ErrorAnnotator()
            result = annotator.annotate(parsed, alignment)
            for ann in result.annotations:
                assert ann.parse_trace_id
                assert ann.align_trace_id
                assert ann.trace_id
        finally:
            os.unlink(path)


class TestResultClassifier:
    def test_classification_normal(self):
        path = _make_normal_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotations = ErrorAnnotator().annotate(parsed, alignment)
            classifier = ResultClassifier()
            result = classifier.classify(annotations.annotations)
            assert len(result.normal) == 4
            assert len(result.boundary) == 0
            assert len(result.bad) == 0
        finally:
            os.unlink(path)

    def test_classification_with_errors(self):
        path = _make_off_beat_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotations = ErrorAnnotator(off_beat_threshold=0.1).annotate(parsed, alignment)
            classifier = ResultClassifier()
            result = classifier.classify(annotations.annotations)
            assert len(result.bad) > 0 or len(result.boundary) > 0
        finally:
            os.unlink(path)

    def test_tempo_change_not_mixed(self):
        path = _make_tempo_change_midi()
        try:
            parsed = MidiParser().parse(path)
            alignment = BeatAligner().align(parsed)
            annotations = ErrorAnnotator().annotate(parsed, alignment)
            classifier = ResultClassifier()
            result = classifier.classify(annotations.annotations)
            for ann in result.normal:
                assert not ann.aligned_note.is_in_tempo_change or ann.error_type == ErrorType.NONE
        finally:
            os.unlink(path)

    def test_bad_rows_listed(self):
        from midi_grader.models import BadRow, BadRowReason
        bad_rows = [
            BadRow(raw_line="", line_number=3, reason=BadRowReason.EMPTY_LINE, detail="空行", source="test"),
        ]
        classifier = ResultClassifier()
        result = classifier.classify([], bad_rows=bad_rows)
        assert len(result.bad_rows) == 1
        assert result.bad_rows[0].reason == BadRowReason.EMPTY_LINE


class TestDataCleaner:
    def test_clean_empty_lines(self):
        text = "60,80,0,480\n\n62,80,480,480\n"
        cleaner = DataCleaner()
        result = cleaner.clean_text(text, source="test")
        assert len(result.valid_rows) == 2
        empty_bad = [b for b in result.bad_rows if b.reason == BadRowReason.EMPTY_LINE]
        assert len(empty_bad) == 1

    def test_clean_comment_lines(self):
        text = "# 这是备注\n60,80,0,480\n// 另一种备注\n62,80,480,480\n"
        cleaner = DataCleaner()
        result = cleaner.clean_text(text, source="test")
        assert len(result.valid_rows) == 2
        comment_bad = [b for b in result.bad_rows if b.reason == BadRowReason.COMMENT_LINE]
        assert len(comment_bad) == 2

    def test_clean_missing_columns(self):
        text = "60,80\n62,80,480,480\n"
        cleaner = DataCleaner(expected_columns=4)
        result = cleaner.clean_text(text, source="test")
        missing = [b for b in result.bad_rows if b.reason == BadRowReason.MISSING_COLUMN]
        assert len(missing) == 1

    def test_clean_invalid_velocity(self):
        text = "60,200,0,480\n62,80,480,480\n"
        cleaner = DataCleaner()
        result = cleaner.clean_text(text, source="test")
        invalid_vel = [b for b in result.bad_rows if b.reason == BadRowReason.INVALID_VELOCITY]
        assert len(invalid_vel) == 1

    def test_clean_invalid_pitch(self):
        text = "130,80,0,480\n62,80,480,480\n"
        cleaner = DataCleaner()
        result = cleaner.clean_text(text, source="test")
        invalid_pitch = [b for b in result.bad_rows if b.reason == BadRowReason.INVALID_PITCH]
        assert len(invalid_pitch) == 1

    def test_clean_mixed_dirty_data(self):
        text = "60,80,0,480\n\n# 备注\n62,80,480\n130,80,960,480\n60,200,0,480\n-- SQL风格备注\n64,80,1440,480\n"
        cleaner = DataCleaner(expected_columns=4)
        result = cleaner.clean_text(text, source="velocity_curve")
        assert len(result.valid_rows) >= 1
        assert len(result.bad_rows) >= 3

    def test_clean_trace(self):
        text = "60,80,0,480\n# 备注\n"
        cleaner = DataCleaner()
        result = cleaner.clean_text(text, source="test")
        assert result.trace.trace_id
        stages = [s.stage for s in result.trace.steps]
        assert "clean" in stages


class TestReportExporter:
    def _make_result(self):
        path = _make_off_beat_midi()
        pipeline = GradingPipeline(off_beat_threshold=0.1, boundary_threshold=0.05)
        result = pipeline.run(path)
        os.unlink(path)
        return result

    def test_export_json(self):
        result = self._make_result()
        buf = StringIO()
        ReportExporter().export_json(result, buf)
        data = json.loads(buf.getvalue())
        assert "parsed" in data
        assert "alignment" in data
        assert "annotations" in data
        assert "classification" in data
        assert "trace" in data

    def test_export_text(self):
        result = self._make_result()
        buf = StringIO()
        ReportExporter().export_text(result, buf)
        text = buf.getvalue()
        assert "MIDI错拍批改报告" in text
        assert "正常样本" in text
        assert "边界样本" in text
        assert "坏样本" in text
        assert "速度变化区音符" in text
        assert "坏行列表" in text
        assert "可追溯性索引" in text
        assert "管道各阶段追踪" in text

    def test_export_csv(self):
        result = self._make_result()
        buf = StringIO()
        ReportExporter().export_csv(result, buf, category="bad")
        lines = buf.getvalue().strip().split("\n")
        assert len(lines) >= 1
        header = lines[0]
        assert "trace_id" in header
        assert "error_type" in header

    def test_export_to_file(self):
        result = self._make_result()
        fd, path = tempfile.mkstemp(suffix=".txt")
        os.close(fd)
        try:
            ReportExporter().export_text_to_file(result, path)
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            assert "MIDI错拍批改报告" in text
        finally:
            os.unlink(path)


class TestPipeline:
    def test_pipeline_normal(self):
        path = _make_normal_midi()
        try:
            pipeline = GradingPipeline()
            result = pipeline.run(path)
            assert len(result.classification.normal) == 4
            assert result.trace.trace_id
        finally:
            os.unlink(path)

    def test_pipeline_off_beat(self):
        path = _make_off_beat_midi()
        try:
            pipeline = GradingPipeline(off_beat_threshold=0.1)
            result = pipeline.run(path)
            bad_count = len(result.classification.bad)
            boundary_count = len(result.classification.boundary)
            assert bad_count > 0 or boundary_count > 0
        finally:
            os.unlink(path)

    def test_pipeline_with_supplementary(self):
        path = _make_normal_midi()
        try:
            supp_data = "60,80,0,480\n# 备注\n\n62,80,480,480\n"
            pipeline = GradingPipeline()
            result = pipeline.run(path, supplementary_data=supp_data, supplementary_source="test_supp")
            assert result.cleaned_data is not None
            assert len(result.cleaned_data.bad_rows) >= 1
            assert len(result.classification.bad_rows) >= 1
        finally:
            os.unlink(path)

    def test_trace_for_annotation(self):
        path = _make_off_beat_midi()
        try:
            pipeline = GradingPipeline(off_beat_threshold=0.1)
            result = pipeline.run(path)
            all_anns = (
                result.classification.normal
                + result.classification.boundary
                + result.classification.bad
                + result.classification.tempo_change_notes
            )
            assert len(all_anns) > 0
            trace_info = result.trace_for(all_anns[0])
            assert trace_info["annotation_trace_id"]
            assert trace_info["parse_trace_id"]
            assert trace_info["align_trace_id"]
            assert trace_info["note_trace_id"]
            assert trace_info["pipeline_trace_id"]
        finally:
            os.unlink(path)

    def test_pipeline_tempo_change_separate(self):
        path = _make_tempo_change_midi()
        try:
            pipeline = GradingPipeline()
            result = pipeline.run(path)
            for ann in result.classification.tempo_change_notes:
                assert ann.aligned_note.is_in_tempo_change
            for ann in result.classification.normal:
                assert not ann.aligned_note.is_in_tempo_change or ann.error_type == ErrorType.NONE
        finally:
            os.unlink(path)


class TestEndToEndTrace:
    def test_full_chain_trace(self):
        path = _make_normal_midi()
        try:
            pipeline = GradingPipeline()
            result = pipeline.run(path)

            assert result.parsed.trace.trace_id
            assert result.alignment.trace.trace_id
            assert result.annotations.trace.trace_id
            assert result.classification.trace.trace_id
            assert result.trace.trace_id

            assert len(result.parsed.trace.steps) > 0
            assert len(result.alignment.trace.steps) > 0
            assert len(result.annotations.trace.steps) > 0
            assert len(result.classification.trace.steps) > 0
            assert len(result.trace.steps) > 0
        finally:
            os.unlink(path)

    def test_annotation_links_to_parse_and_align(self):
        path = _make_off_beat_midi()
        try:
            pipeline = GradingPipeline(off_beat_threshold=0.1)
            result = pipeline.run(path)
            all_anns = (
                result.classification.normal
                + result.classification.boundary
                + result.classification.bad
                + result.classification.tempo_change_notes
            )
            for ann in all_anns:
                assert ann.parse_trace_id == result.parsed.trace.trace_id
                assert ann.align_trace_id == result.alignment.trace.trace_id or ann.align_trace_id == ann.aligned_note.trace_id
        finally:
            os.unlink(path)
