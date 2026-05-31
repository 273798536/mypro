import argparse
import sys
from pathlib import Path

from .allocator import run_allocation
from .report import format_terminal_summary, write_reports


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="choir-allocator",
        description="合唱声部分配器 — 根据成员音域、水平和曲目需求自动分配声部，检测音域缺失和高手扎堆问题",
    )
    parser.add_argument(
        "-i",
        "--input-dir",
        type=str,
        required=True,
        help="输入目录路径，需包含 members.json 和 songs.json，可选 leaves.json",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=str,
        required=True,
        help="输出目录路径，生成 allocation_report.txt 和 allocation_detail.json",
    )
    parser.add_argument(
        "--leaves",
        type=str,
        default=None,
        help="请假名单文件路径 (默认从输入目录读取 leaves.json)",
    )

    args = parser.parse_args(argv)

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    members_path = input_dir / "members.json"
    songs_path = input_dir / "songs.json"
    leaves_path = Path(args.leaves) if args.leaves else input_dir / "leaves.json"

    errors = []
    if not members_path.exists():
        errors.append(f"成员名单不存在: {members_path}")
    if not songs_path.exists():
        errors.append(f"曲目列表不存在: {songs_path}")

    if errors:
        for e in errors:
            print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

    result = run_allocation(members_path, songs_path, leaves_path)

    summary = format_terminal_summary(result)
    print(summary)

    report_path, detail_path = write_reports(result, output_dir)
    print(f"\n报告已生成:")
    print(f"  文本报告: {report_path}")
    print(f"  详细数据: {detail_path}")


if __name__ == "__main__":
    main()
