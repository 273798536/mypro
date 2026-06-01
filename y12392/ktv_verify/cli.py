import argparse
import sys
import os

from ktv_verify.importer import import_all
from ktv_verify.engine import verify
from ktv_verify.aggregator import aggregate
from ktv_verify.exporter import export_all, generate_summary_text


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ktv-verify",
        description="KTV版权点播核验工具 —— 导入点播记录/曲库版本/退款记录，核验后归集导出报表",
    )
    parser.add_argument(
        "-i", "--input-dir",
        required=True,
        help="输入目录，包含点播记录(playback_records.csv)、曲库版本(song_versions.csv)、退款记录(refund_records.csv)",
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="./output",
        help="输出目录，默认 ./output",
    )
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    input_dir = os.path.abspath(args.input_dir)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.isdir(input_dir):
        print(f"错误: 输入目录不存在 → {input_dir}", file=sys.stderr)
        return 1

    print(f"输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")
    print()

    print("── 导入数据 ──")
    import_result = import_all(input_dir)
    print(f"  点播记录: {import_result.playback_count} 条  ({import_result.playback_file})")
    print(f"  曲库版本: {import_result.version_count} 条  ({import_result.version_file})")
    print(f"  退款记录: {import_result.refund_count} 条  ({import_result.refund_file})")

    if import_result.playback_count == 0:
        print("\n错误: 未找到点播记录，无法继续核验", file=sys.stderr)
        return 1
    print()

    print("── 核验 ──")
    verify_result = verify(
        import_result.playback_records,
        import_result.song_versions,
        import_result.refund_records,
    )
    print(f"  总点播: {verify_result.total_playback}")
    print(f"  有效:   {verify_result.valid_playback}")
    print(f"  版本异常: {verify_result.version_mismatch_count}")
    print(f"  重复点播: {verify_result.duplicate_count}")
    print(f"  退款冲销: {verify_result.refund_offset_count}")
    print()

    print("── 归集 ──")
    agg = aggregate(verify_result)
    print(f"  版权方数: {len(agg.by_owner)}")
    print(f"  包厢数:   {len(agg.by_room)}")
    print(f"  日期数:   {len(agg.by_date)}")
    print()

    print("── 导出 ──")
    exported = export_all(output_dir, verify_result, agg)
    for f in exported:
        print(f"  {f}")
    print()

    summary = generate_summary_text(verify_result, agg)
    print(summary)

    return 0


if __name__ == "__main__":
    sys.exit(main())
