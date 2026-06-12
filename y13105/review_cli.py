import argparse
import json
import sys
from pathlib import Path

from matrix_condition_review import ReviewEngine, MarkdownExporter


def load_records(input_path: Path) -> list:
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "records" in data:
        return data["records"]
    if isinstance(data, list):
        return data
    raise ValueError("输入 JSON 必须是数组，或包含 records 字段的对象")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="matrix-condition-review",
        description="矩阵条件数错题复盘工具",
    )
    parser.add_argument(
        "-i", "--input",
        required=True,
        type=Path,
        help="错题记录 JSON 文件路径",
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Markdown 报告输出路径（可选，不指定则打印到终端）",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="同时输出 JSON 摘要到 stdout（复核人接口对齐用）",
    )
    args = parser.parse_args()

    if not args.input.exists():
        print(f"错误：输入文件不存在：{args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        raw_records = load_records(args.input)
    except Exception as exc:
        print(f"错误：读取输入失败：{exc}", file=sys.stderr)
        sys.exit(1)

    engine = ReviewEngine()
    result = engine.review(raw_records)

    exporter = MarkdownExporter()
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            exporter.export(result, f)
        print(f"Markdown 报告已生成：{args.output}")
    else:
        exporter.export(result, sys.stdout)

    if args.json:
        print("\n===== JSON 摘要（与接口返回一致）=====")
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
