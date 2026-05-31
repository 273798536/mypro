from __future__ import annotations

import json
import csv
from datetime import datetime
from io import StringIO
from typing import List, Optional, TextIO

from midi_grader.models import (
    BadRow,
    ClassificationResult,
    ErrorAnnotation,
    ErrorType,
    PipelineResult,
    Severity,
)


class ReportExporter:
    def export_json(self, result: PipelineResult, output: TextIO) -> None:
        data = result.to_dict()
        json.dump(data, output, ensure_ascii=False, indent=2)

    def export_json_to_file(self, result: PipelineResult, file_path: str) -> None:
        with open(file_path, "w", encoding="utf-8") as f:
            self.export_json(result, f)

    def export_text(self, result: PipelineResult, output: TextIO) -> None:
        cls = result.classification
        now = datetime.now().isoformat()

        output.write("=" * 60 + "\n")
        output.write("MIDI错拍批改报告\n")
        output.write(f"生成时间: {now}\n")
        output.write(f"MIDI文件: {result.parsed.file_path}\n")
        output.write(f"流水线追踪ID: {result.trace.trace_id}\n")
        output.write("=" * 60 + "\n\n")

        output.write("一、概要统计\n")
        output.write("-" * 40 + "\n")
        for k, v in cls.summary.items():
            output.write(f"  {k}: {v}\n")
        output.write("\n")

        output.write("二、正常样本\n")
        output.write("-" * 40 + "\n")
        self._write_annotations(cls.normal, output)
        output.write("\n")

        output.write("三、边界样本\n")
        output.write("-" * 40 + "\n")
        self._write_annotations(cls.boundary, output)
        output.write("\n")

        output.write("四、坏样本\n")
        output.write("-" * 40 + "\n")
        self._write_annotations(cls.bad, output)
        output.write("\n")

        output.write("五、速度变化区音符（未混入正常结果）\n")
        output.write("-" * 40 + "\n")
        self._write_annotations(cls.tempo_change_notes, output)
        output.write("\n")

        output.write("六、坏行列表\n")
        output.write("-" * 40 + "\n")
        self._write_bad_rows(cls.bad_rows, output)
        output.write("\n")

        output.write("七、可追溯性索引\n")
        output.write("-" * 40 + "\n")
        self._write_trace_index(result, output)
        output.write("\n")

        output.write("八、管道各阶段追踪\n")
        output.write("-" * 40 + "\n")
        self._write_pipeline_traces(result, output)

    def export_text_to_file(self, result: PipelineResult, file_path: str) -> None:
        with open(file_path, "w", encoding="utf-8") as f:
            self.export_text(result, f)

    def export_csv(self, result: PipelineResult, output: TextIO, category: str = "all") -> None:
        cls = result.classification
        annotations = self._get_annotations_by_category(cls, category)

        writer = csv.writer(output)
        writer.writerow([
            "trace_id", "parse_trace_id", "align_trace_id",
            "pitch", "velocity", "start_tick", "duration_tick",
            "expected_beat", "actual_beat", "offset_beats",
            "error_type", "severity", "detail",
            "tempo_segment_idx", "is_in_tempo_change",
        ])

        for ann in annotations:
            note = ann.aligned_note.note
            writer.writerow([
                ann.trace_id,
                ann.parse_trace_id,
                ann.align_trace_id,
                note.pitch,
                note.velocity,
                note.start_tick,
                note.duration_tick,
                ann.aligned_note.expected_beat,
                ann.aligned_note.actual_beat,
                ann.aligned_note.offset_beats,
                ann.error_type.value,
                ann.severity.value,
                ann.detail,
                ann.aligned_note.tempo_segment_idx,
                ann.aligned_note.is_in_tempo_change,
            ])

    def export_csv_to_file(self, result: PipelineResult, file_path: str, category: str = "all") -> None:
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            self.export_csv(result, f, category)

    def _get_annotations_by_category(self, cls: ClassificationResult, category: str) -> List[ErrorAnnotation]:
        if category == "normal":
            return cls.normal
        elif category == "boundary":
            return cls.boundary
        elif category == "bad":
            return cls.bad
        elif category == "tempo_change":
            return cls.tempo_change_notes
        else:
            return cls.normal + cls.boundary + cls.bad + cls.tempo_change_notes

    def _write_annotations(self, annotations: List[ErrorAnnotation], output: TextIO) -> None:
        if not annotations:
            output.write("  （无）\n")
            return
        for ann in annotations:
            note = ann.aligned_note.note
            output.write(
                f"  [{ann.trace_id}] 音高={note.pitch} 力度={note.velocity} "
                f"起拍={ann.aligned_note.actual_beat:.4f} 预期={ann.aligned_note.expected_beat:.4f} "
                f"偏移={ann.aligned_note.offset_beats:+.4f} "
                f"类型={ann.error_type.value} 级别={ann.severity.value} "
                f"详情={ann.detail}\n"
            )

    def _write_bad_rows(self, bad_rows: List[BadRow], output: TextIO) -> None:
        if not bad_rows:
            output.write("  （无）\n")
            return
        for br in bad_rows:
            output.write(
                f"  行{br.line_number} [{br.trace_id}] 原因={br.reason.value} "
                f"来源={br.source} 详情={br.detail} 内容=\"{br.raw_line}\"\n"
            )

    def _write_trace_index(self, result: PipelineResult, output: TextIO) -> None:
        cls = result.classification
        all_annotations = cls.normal + cls.boundary + cls.bad + cls.tempo_change_notes
        for ann in all_annotations:
            trace_info = result.trace_for(ann)
            output.write(
                f"  标注[{trace_info['annotation_trace_id']}] → "
                f"解析[{trace_info['parse_trace_id']}] "
                f"对齐[{trace_info['align_trace_id']}] "
                f"音符[{trace_info['note_trace_id']}] "
                f"速度段={trace_info['tempo_segment']} "
                f"管道[{trace_info['pipeline_trace_id']}]\n"
            )

    def _write_pipeline_traces(self, result: PipelineResult, output: TextIO) -> None:
        traces = [
            ("解析阶段", result.parsed.trace),
            ("对齐阶段", result.alignment.trace),
            ("标注阶段", result.annotations.trace),
            ("分类阶段", result.classification.trace),
        ]
        if result.cleaned_data is not None:
            traces.append(("清洗阶段", result.cleaned_data.trace))

        for stage_name, trace in traces:
            output.write(f"\n  [{stage_name}] 追踪ID: {trace.trace_id}\n")
            for step in trace.steps:
                output.write(f"    {step.timestamp} | {step.stage} | {step.description}\n")
                if step.details:
                    for k, v in step.details.items():
                        output.write(f"      {k}: {v}\n")
