from __future__ import annotations

import argparse
import json
import sys
from typing import List, Optional

from midi_grader.pipeline import GradingPipeline
from midi_grader.report_exporter import ReportExporter


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="MIDI错拍批改器")
    parser.add_argument("midi_path", help="MIDI文件路径")
    parser.add_argument("--supplementary", "-s", help="辅助数据文件路径（力度曲线、批改备注等）", default=None)
    parser.add_argument("--output", "-o", help="输出报告路径（默认输出到stdout）", default=None)
    parser.add_argument("--format", "-f", choices=["text", "json", "csv"], default="text", help="输出格式")
    parser.add_argument("--category", "-c", choices=["all", "normal", "boundary", "bad", "tempo_change"], default="all", help="仅导出指定类别（csv格式时有效）")
    parser.add_argument("--off-beat-threshold", type=float, default=0.1, help="错拍判定阈值（拍）")
    parser.add_argument("--boundary-threshold", type=float, default=0.05, help="边界判定阈值（拍）")
    parser.add_argument("--velocity-missing-threshold", type=int, default=1, help="力度缺失阈值")
    parser.add_argument("--rest-misjudgment-gap", type=float, default=0.25, help="休止误判间隔阈值（拍）")
    parser.add_argument("--tempo-buffer", type=float, default=2.0, help="速度变化区缓冲（拍）")

    args = parser.parse_args(argv)

    supplementary_data: Optional[str] = None
    supplementary_source: Optional[str] = None
    if args.supplementary:
        with open(args.supplementary, "r", encoding="utf-8") as f:
            supplementary_data = f.read()
        supplementary_source = args.supplementary

    pipeline = GradingPipeline(
        off_beat_threshold=args.off_beat_threshold,
        boundary_threshold=args.boundary_threshold,
        velocity_missing_threshold=args.velocity_missing_threshold,
        rest_misjudgment_gap_beats=args.rest_misjudgment_gap,
        tempo_change_buffer_beats=args.tempo_buffer,
    )

    result = pipeline.run(args.midi_path, supplementary_data=supplementary_data, supplementary_source=supplementary_source)

    exporter = ReportExporter()

    if args.output:
        if args.format == "json":
            exporter.export_json_to_file(result, args.output)
        elif args.format == "csv":
            exporter.export_csv_to_file(result, args.output, category=args.category)
        else:
            exporter.export_text_to_file(result, args.output)
        print(f"报告已写入: {args.output}", file=sys.stderr)
    else:
        if args.format == "json":
            exporter.export_json(result, sys.stdout)
        elif args.format == "csv":
            exporter.export_csv(result, sys.stdout, category=args.category)
        else:
            exporter.export_text(result, sys.stdout)


if __name__ == "__main__":
    main()
