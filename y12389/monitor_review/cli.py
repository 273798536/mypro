from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from .analyzer import align_timestamps, attribute_faults, suggest_corrections
from .checker import run_all_checks
from .importer import import_channel_list, import_console_snapshot, import_musician_feedbacks
from .models import ReviewReport, TraceRecord
from .reporter import build_correspondences, export_report_json, export_report_text


def _build_demo_data(output_dir: str) -> dict[str, str]:
    import json

    odir = Path(output_dir)
    odir.mkdir(parents=True, exist_ok=True)

    channel_data = {
        "event_name": "2026夏季音乐节-主舞台",
        "timestamp": "2026-06-01T20:00:00",
        "channels": [
            {"ch_number": 1, "name": "Kick", "source_type": "mic", "bus_assignment": "Mix1", "phantom_power": False, "gain_db": -12.0},
            {"ch_number": 2, "name": "Snare", "source_type": "mic", "bus_assignment": "Mix1", "phantom_power": False, "gain_db": -8.0},
            {"ch_number": 3, "name": "HiHat", "source_type": "mic", "bus_assignment": "Mix2", "phantom_power": False, "gain_db": -10.0},
            {"ch_number": 4, "name": "Bass DI", "source_type": "di", "bus_assignment": "Mix2", "phantom_power": False, "gain_db": -6.0},
            {"ch_number": 5, "name": "Guitar", "source_type": "mic", "bus_assignment": "Mix3", "phantom_power": False, "gain_db": -5.0},
            {"ch_number": 6, "name": "Keys L", "source_type": "line", "bus_assignment": "Mix3", "phantom_power": False, "gain_db": 0.0},
            {"ch_number": 7, "name": "Keys R", "source_type": "line", "bus_assignment": "Mix3", "phantom_power": False, "gain_db": 0.0},
            {"ch_number": 8, "name": "Vocal Main", "source_type": "mic", "bus_assignment": "Mix4", "phantom_power": True, "gain_db": -3.0},
            {"ch_number": 9, "name": "Vocal BGV1", "source_type": "mic", "bus_assignment": "Mix4", "phantom_power": True, "gain_db": -4.0},
            {"ch_number": 10, "name": "Vocal BGV2", "source_type": "mic", "bus_assignment": "Mix4", "phantom_power": True, "gain_db": -4.0},
        ],
    }
    ch_path = odir / "channels.json"
    ch_path.write_text(json.dumps(channel_data, ensure_ascii=False, indent=2), encoding="utf-8")

    snapshot_data = {
        "snapshot_name": "Scene-A-Opening",
        "timestamp": "2026-06-01T20:05:00",
        "scene_label": "开场",
        "monitor_settings": [
            {"musician": "鼓手", "bus": "Mix1", "channels": [1, 2, 8], "level_db": -6.0, "eq_high_hz": 12000, "eq_mid_hz": 2500, "eq_low_hz": 80},
            {"musician": "贝斯手", "bus": "Mix2", "channels": [1, 4, 5], "level_db": -4.0, "eq_high_hz": 8000, "eq_mid_hz": 800, "eq_low_hz": 60},
            {"musician": "吉他手", "bus": "Mix5", "channels": [1, 2, 5, 8, 12], "level_db": -5.0, "eq_high_hz": 10000, "eq_mid_hz": 2000, "eq_low_hz": 100},
            {"musician": "键盘手", "bus": "Mix3", "channels": [6, 7, 8], "level_db": -3.0, "eq_high_hz": 12000, "eq_mid_hz": 3000, "eq_low_hz": 80},
            {"musician": "主唱", "bus": "Mix4", "channels": [8, 9, 10], "level_db": -2.0, "eq_high_hz": 10000, "eq_mid_hz": 2500, "eq_low_hz": 100},
        ],
    }
    snap_path = odir / "snapshot.json"
    snap_path.write_text(json.dumps(snapshot_data, ensure_ascii=False, indent=2), encoding="utf-8")

    feedback_data = {
        "feedbacks": [
            {"musician": "吉他手", "timestamp": "2026-06-01T20:10:00", "issue": "听不到鼓声", "channel_ref": 1, "bus_ref": "Mix5", "severity": "high"},
            {"musician": "吉他手", "timestamp": "2026-06-01T20:10:00", "issue": "听不到鼓声", "channel_ref": 1, "bus_ref": "Mix5", "severity": "high"},
            {"musician": "主唱", "timestamp": "2026-06-01T20:12:00", "issue": "返听有啸叫", "channel_ref": 8, "bus_ref": "Mix4", "severity": "high"},
            {"musician": "贝斯手", "timestamp": "2026-06-01T20:15:00", "issue": "吉他声音太大", "channel_ref": 5, "bus_ref": "Mix2", "severity": "medium"},
        ],
    }
    fb_path = odir / "feedbacks.json"
    fb_path.write_text(json.dumps(feedback_data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "channels": str(ch_path),
        "snapshot": str(snap_path),
        "feedbacks": str(fb_path),
    }


def run_review(
    channel_path: str,
    snapshot_path: str,
    feedback_path: str,
    output_dir: str = ".",
) -> ReviewReport:
    channel_list = import_channel_list(channel_path)
    snapshot = import_console_snapshot(snapshot_path)
    feedbacks = import_musician_feedbacks(feedback_path)

    problems = run_all_checks(channel_list, snapshot, feedbacks)

    attributions = attribute_faults(problems, channel_list, snapshot, feedbacks)
    time_alignments = align_timestamps(channel_list, snapshot, feedbacks)
    corrections = suggest_corrections(problems, attributions, channel_list, snapshot)

    trace = TraceRecord(
        source="现场返听故障复盘",
        imported_at=datetime.now().isoformat(),
    )

    report = ReviewReport(
        event_name=channel_list.event_name or "未命名演出",
        problems=problems,
        attributions=attributions,
        time_alignments=time_alignments,
        corrections=corrections,
        trace=trace,
        channel_list_trace_id=channel_list.trace.record_id,
        snapshot_trace_id=snapshot.trace.record_id,
    )

    correspondences = build_correspondences(channel_list, snapshot, report)
    report.correspondences = correspondences

    odir = Path(output_dir)
    odir.mkdir(parents=True, exist_ok=True)

    text_path = export_report_text(report, str(odir / "review_report.txt"))
    json_path = export_report_json(report, str(odir / "review_report.json"))

    print(f"[复盘完成] 文本报告: {text_path}")
    print(f"[复盘完成] JSON报告: {json_path}")
    print(f"[复盘完成] 发现问题 {len(problems)} 项")
    print(f"  通道错配: {sum(1 for p in problems if p.problem_type.value == '通道错配')} 项")
    print(f"  快照缺失: {sum(1 for p in problems if p.problem_type.value == '快照缺失')} 项")
    print(f"  反馈重复: {sum(1 for p in problems if p.problem_type.value == '反馈重复')} 项")

    return report


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="monitor-review",
        description="现场返听故障复盘工具",
    )
    sub = parser.add_subparsers(dest="command")

    run_parser = sub.add_parser("run", help="运行完整复盘流程")
    run_parser.add_argument("--channels", required=True, help="通道列表文件路径 (JSON/CSV)")
    run_parser.add_argument("--snapshot", required=True, help="调音台快照文件路径 (JSON/CSV)")
    run_parser.add_argument("--feedbacks", required=True, help="乐手反馈文件路径 (JSON/CSV)")
    run_parser.add_argument("--output", default="./output", help="输出目录 (默认: ./output)")

    demo_parser = sub.add_parser("demo", help="使用演示数据运行复盘")
    demo_parser.add_argument("--output", default="./demo_output", help="输出目录 (默认: ./demo_output)")

    args = parser.parse_args(argv)

    if args.command == "run":
        run_review(args.channels, args.snapshot, args.feedbacks, args.output)
    elif args.command == "demo":
        demo_dir = str(Path(args.output) / "demo_data")
        paths = _build_demo_data(demo_dir)
        run_review(paths["channels"], paths["snapshot"], paths["feedbacks"], args.output)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
