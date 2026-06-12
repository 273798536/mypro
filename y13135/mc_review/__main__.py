"""命令行入口。

用法:
    python -m mc_review --input sample_input --output output
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .parser import build_review_bundle
from .report import write_report
from .summary import render_summary


def build_argparser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mc_review",
        description="马尔可夫链错题复盘工具：解析题目清单 → 终端摘要 + Markdown 报告。",
    )
    parser.add_argument(
        "-i", "--input",
        type=Path,
        required=True,
        help="输入材料目录（含 CSV 题目清单、可选 screenshots/ 和 history/）",
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        required=True,
        help="输出目录（将生成 review_report.md）",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="仅写报告，不打印终端摘要",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_argparser()
    args = parser.parse_args(argv)

    input_dir: Path = args.input
    output_dir: Path = args.output

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"错误：输入目录不存在: {input_dir}", file=sys.stderr)
        return 2

    try:
        bundle = build_review_bundle(input_dir)
    except FileNotFoundError as e:
        print(f"错误：{e}", file=sys.stderr)
        return 2
    except Exception as e:
        print(f"解析失败：{e}", file=sys.stderr)
        return 1

    report_path = write_report(bundle, output_dir)

    if not args.quiet:
        print(render_summary(bundle))
        print()
        print(f"Markdown 报告已写入: {report_path.resolve()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
