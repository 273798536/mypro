import argparse
import sys
from pathlib import Path

from .importer import import_file
from .validator import validate_all
from .calculator import calculate_all
from .reporter import generate_report, export_json, export_text, print_summary
from . import __version__


def run(input_path: str, output_dir: str = ".", version: str = "", format: str = "both") -> dict:
    observations = import_file(input_path, version=version)
    if not observations:
        print("错误: 未导入任何观测记录", file=sys.stderr)
        sys.exit(1)

    print(f"已导入 {len(observations)} 条观测记录 (来源: {observations[0].source.name})")

    validations = validate_all(observations)
    error_count = sum(len(v.errors()) for v in validations)
    warning_count = sum(len(v.warnings()) for v in validations)
    print(f"验证完成: {error_count} 个错误, {warning_count} 个警告")

    calculations = calculate_all(observations, validations)
    completed = sum(1 for c in calculations if not c.skip_reason)
    print(f"计算完成: {completed}/{len(calculations)} 条有效结果")

    report = generate_report(observations, validations, calculations, source=observations[0].source)

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    exported_files = {}
    if format in ("json", "both"):
        json_path = export_json(report, str(out / "solar_shadow_report.json"))
        exported_files["json"] = json_path
        print(f"JSON报告: {json_path}")
    if format in ("text", "both"):
        text_path = export_text(report, str(out / "solar_shadow_report.txt"))
        exported_files["text"] = text_path
        print(f"文本报告: {text_path}")

    print_summary(report)

    return {
        "report": report.to_dict(),
        "exported_files": exported_files,
    }


def main():
    parser = argparse.ArgumentParser(
        description="太阳高度角影长计算工具 - 从样例导入到报告导出"
    )
    parser.add_argument("input", help="输入文件路径 (.csv 或 .json)")
    parser.add_argument("-o", "--output-dir", default=".", help="报告输出目录 (默认: 当前目录)")
    parser.add_argument("-v", "--version-tag", default="", help="数据版本标记")
    parser.add_argument(
        "-f", "--format",
        choices=["json", "text", "both"],
        default="both",
        help="报告格式 (默认: both)",
    )
    parser.add_argument("--tool-version", action="version", version=f"%(prog)s {__version__}")

    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"错误: 文件不存在 - {args.input}", file=sys.stderr)
        sys.exit(1)

    result = run(args.input, args.output_dir, args.version_tag, args.format)

    has_errors = result["report"]["validation"]["total_errors"] > 0

    sys.exit(1 if has_errors else 0)


if __name__ == "__main__":
    main()
