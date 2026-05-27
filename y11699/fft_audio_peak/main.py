"""FFT音频峰值分析工具 - CLI入口

用法:
    python main.py analyze <audio_file> [选项]
    python main.py list
    python main.py remove <audio_file>
    python main.py clean

示例:
    python main.py analyze recording.wav --window hann --nfft 2048
    python main.py analyze recording.wav --import-mode overwrite
    python main.py analyze recording.wav --sample-rate 48000 --no-chart
"""

import argparse
import os
import sys

from audio_reader import load_audio
from config import (
    DEFAULT_NFFT,
    DEFAULT_WINDOW,
    RESULTS_DIR,
    SUPPORTED_WINDOWS,
)
from fft_analyzer import analyze as fft_analyze, format_anomalies
from report_generator import (
    check_duplicate,
    generate_report,
    print_summary,
    record_analysis,
    remove_record,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="fft-audio-peak",
        description="FFT音频峰值分析工具 - 分析录音主频与噪声",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s analyze recording.wav
  %(prog)s analyze recording.wav --window blackman --nfft 4096
  %(prog)s analyze recording.wav --import-mode overwrite --no-chart
  %(prog)s list
  %(prog)s remove recording.wav
  %(prog)s clean
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    analyze_parser = subparsers.add_parser(
        "analyze", help="分析音频文件", aliases=["a"]
    )
    analyze_parser.add_argument(
        "audio_file", help="音频文件路径 (WAV/FLAC/OGG)"
    )
    analyze_parser.add_argument(
        "--window",
        "-w",
        default=DEFAULT_WINDOW,
        choices=SUPPORTED_WINDOWS,
        help=f"窗口函数 (默认: {DEFAULT_WINDOW})",
    )
    analyze_parser.add_argument(
        "--nfft",
        "-n",
        type=int,
        default=DEFAULT_NFFT,
        help=f"FFT点数 (默认: {DEFAULT_NFFT})",
    )
    analyze_parser.add_argument(
        "--sample-rate",
        "-sr",
        type=int,
        default=None,
        help="采样率提示（文件头缺失时使用）",
    )
    analyze_parser.add_argument(
        "--min-peak-height",
        type=float,
        default=None,
        help="峰值最小幅度 (dBFS, 默认自动计算)",
    )
    analyze_parser.add_argument(
        "--min-peak-distance",
        type=float,
        default=50.0,
        help="峰值间最小频率间隔 (Hz, 默认: 50)",
    )
    analyze_parser.add_argument(
        "--silence-threshold",
        type=float,
        default=-60.0,
        help="静音判定阈值 (dBFS, 默认: -60)",
    )
    analyze_parser.add_argument(
        "--import-mode",
        "-m",
        choices=["ignore", "overwrite", "append"],
        default="ignore",
        help="重复导入策略: ignore=跳过, overwrite=覆盖, append=保留历史",
    )
    analyze_parser.add_argument(
        "--output-dir",
        "-o",
        default=None,
        help=f"输出目录 (默认: {RESULTS_DIR})",
    )
    analyze_parser.add_argument(
        "--no-chart",
        action="store_true",
        help="不生成图表",
    )
    analyze_parser.add_argument(
        "--include-silent",
        action="store_true",
        help="将静音段纳入分析（默认排除）",
    )
    analyze_parser.add_argument(
        "--json-only",
        action="store_true",
        help="仅输出JSON报告路径，不打印摘要",
    )

    list_parser = subparsers.add_parser(
        "list", help="列出已分析的文件", aliases=["ls", "l"]
    )

    remove_parser = subparsers.add_parser(
        "remove", help="移除已分析的记录", aliases=["rm", "r"]
    )
    remove_parser.add_argument("audio_file", help="音频文件路径")

    clean_parser = subparsers.add_parser(
        "clean", help="清除所有分析记录和缓存"
    )

    return parser


def _cmd_analyze(args: argparse.Namespace) -> int:
    audio_path = os.path.abspath(args.audio_file)

    if not os.path.exists(audio_path):
        print(f"错误: 文件不存在 - {audio_path}", file=sys.stderr)
        return 1

    existing = check_duplicate(audio_path)
    if existing and args.import_mode == "ignore":
        print(
            f"[跳过] 文件已分析: {audio_path}\n"
            f"  上次分析: {existing.get('timestamp', '未知')}\n"
            f"  主频: {existing.get('dominant_freq', 'N/A')} Hz\n"
            f"  报告: {existing.get('report_path', 'N/A')}\n"
            f"  使用 --import-mode overwrite 覆盖重新分析"
        )
        return 0

    print(f"[加载] {audio_path}")

    audio = load_audio(
        audio_path,
        sample_rate_hint=args.sample_rate,
        silence_threshold_db=args.silence_threshold,
    )

    for w in audio.warnings:
        print(f"  ⚠ {w}")

    min_peak_height = args.min_peak_height
    if min_peak_height is None:
        import numpy as np

        peak_height = max(
            -60.0, 20 * np.log10(max(0.01, np.max(np.abs(audio.samples)))) - 30
        )
    else:
        peak_height = min_peak_height

    result = fft_analyze(
        audio.samples,
        audio.sample_rate,
        window_type=args.window,
        nfft=args.nfft,
        min_peak_height_db=peak_height,
        min_peak_distance_hz=args.min_peak_distance,
        exclude_silent=not args.include_silent,
        silent_segments=audio.silent_segments,
    )

    if result.anomalies:
        print()
        for a in result.anomalies:
            print(f"  ⚠ {a}")
        if result.corrections:
            for c in result.corrections:
                print(f"  ✓ {c}")

    output_dir = args.output_dir or RESULTS_DIR

    if args.no_chart:
        import json
        import time

        from report_generator import _result_to_dict, _to_python

        os.makedirs(output_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        json_path = os.path.join(output_dir, f"{base_name}_report.json")
        report_data = _result_to_dict(audio, result, timestamp)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2, default=_to_python)

        summary = {
            "timestamp": timestamp,
            "dominant_freq": round(result.dominant_freq, 2),
            "peaks_count": len(result.peaks),
            "report_path": json_path,
            "has_anomalies": len(result.anomalies) > 0,
        }
        record_analysis(audio_path, summary)
        print(f"\n[完成] 报告: {json_path}")
    else:
        generate_report(audio, result, output_dir, args.import_mode)

    if not args.json_only:
        print_summary(audio, result)

    return 0


def _cmd_list(args: argparse.Namespace) -> int:
    from report_generator import _load_state

    state = _load_state()
    if not state.analyzed_files:
        print("暂无已分析的文件记录。")
        return 0

    print(f"已分析文件 ({len(state.analyzed_files)} 个):")
    print("-" * 70)
    for path, info in state.analyzed_files.items():
        ts = info.get("timestamp", "未知")
        freq = info.get("dominant_freq", "N/A")
        peaks = info.get("peaks_count", "N/A")
        anomaly = "⚠" if info.get("has_anomalies") else " "
        print(f"  {anomaly} {ts}  {freq} Hz  {peaks} peaks  {path}")

    return 0


def _cmd_remove(args: argparse.Namespace) -> int:
    audio_path = os.path.abspath(args.audio_file)
    existing = check_duplicate(audio_path)
    if not existing:
        print(f"未找到记录: {audio_path}")
        return 1
    remove_record(audio_path)
    print(f"已移除记录: {audio_path}")
    return 0


def _cmd_clean(args: argparse.Namespace) -> int:
    from config import STATE_FILE
    from report_generator import _load_state, _save_state, AnalysisState

    state = _load_state()
    count = len(state.analyzed_files)
    if count == 0:
        print("没有需要清除的记录。")
    else:
        _save_state(AnalysisState())
        print(f"已清除 {count} 条分析记录。")

    import shutil

    if os.path.exists(RESULTS_DIR):
        shutil.rmtree(RESULTS_DIR)
        print(f"已清除输出目录: {RESULTS_DIR}")
    else:
        print("输出目录不存在，无需清除。")

    return 0


def main():
    parser = _build_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return 0

    handlers = {
        "analyze": _cmd_analyze,
        "a": _cmd_analyze,
        "list": _cmd_list,
        "ls": _cmd_list,
        "l": _cmd_list,
        "remove": _cmd_remove,
        "rm": _cmd_remove,
        "r": _cmd_remove,
        "clean": _cmd_clean,
    }

    handler = handlers.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
