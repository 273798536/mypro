#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from reverberation_attribution.pipeline import run_pipeline
from reverberation_attribution.report import generate_html_report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="声学混响误差归因处理链",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run.py data/experiment_records.json
  python run.py data/experiment_records.json -a data/late_attachment.json
  python run.py data/experiment_records.json -a data/late_attachment.json -o data/oral_notes.json
  python run.py data/experiment_records.json -a data/late_attachment.json -o data/oral_notes.json --html output/report.html
        """,
    )
    parser.add_argument(
        "experiment",
        help="实验记录 JSON 文件路径",
    )
    parser.add_argument(
        "-a", "--attachment",
        help="晚到附件 JSON 文件路径",
        default=None,
    )
    parser.add_argument(
        "-o", "--oral",
        help="口头说明 JSON 文件路径",
        default=None,
    )
    parser.add_argument(
        "--html",
        help="HTML 报告输出路径（默认: output/report.html）",
        default="output/report.html",
    )
    parser.add_argument(
        "--json",
        help="JSON 结果输出路径（默认不输出）",
        default=None,
    )

    args = parser.parse_args()

    if not Path(args.experiment).exists():
        print(f"错误: 实验记录文件不存在: {args.experiment}", file=sys.stderr)
        sys.exit(1)

    result = run_pipeline(
        experiment_path=args.experiment,
        late_attachment_path=args.attachment,
        oral_notes_path=args.oral,
    )

    report_path = generate_html_report(result, args.html)
    print(f"\nHTML 报告已生成: {report_path}")

    if args.json:
        json_path = Path(args.json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        print(f"JSON 结果已生成: {args.json}")

    print(f"\n处理完成: {len(result.rooms)} 房间, {len(result.attributed_errors)} 归因, "
          f"{len(result.conflicts)} 冲突, {len(result.sampling_gaps)} 缺口, "
          f"{len(result.bad_data_refs)} 坏数据")


if __name__ == "__main__":
    main()
