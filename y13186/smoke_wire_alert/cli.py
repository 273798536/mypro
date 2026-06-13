from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from typing import List, Optional

from .models import (
    WindTunnelSmokeAlert,
    AlertAttachment,
    ManualNote,
    HistoryChange,
    ProcessingStatus,
)
from .engine import ProcessingEngine
from .processor import AlertProcessor
from .jump_detector import JumpDetector
from .auditor import ChangeAuditor
from .reporter import MarkdownReporter
from .store import AlertStore
from .sample_data import (
    build_sample_records,
    build_late_attachment_for_rec002,
)


def _ensure_store(data_dir: str) -> AlertStore:
    return AlertStore(data_dir)


def cmd_start(args):
    store = _ensure_store(args.data_dir)

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            raw_list = json.load(f)
        alerts = [WindTunnelSmokeAlert.from_dict(d) for d in raw_list]
    else:
        alerts = build_sample_records()

    processor = AlertProcessor()
    auditor = ChangeAuditor(default_operator="系统")
    jump_detector = JumpDetector()

    for i, alert in enumerate(alerts):
        previous = alerts[i - 1] if i > 0 else None
        if args.include_manual and alert.id == "rec002":
            auditor.record_manual_override(
                alert,
                "threshold_high",
                65.0,
                operator="阿岑",
                reason="现场确认短时烟雾是因为实验启动阶段，临时上调阈值",
                is_temporary=True,
            )
        processor.process_alert(alert)
        jump_detector.detect(alert, previous, alert.history)

    store.save_batch(alerts)

    reporter = MarkdownReporter()
    report_path = store.new_report_path()
    reporter.write(alerts, report_path)

    print(f"[启动完成] 处理记录数: {len(alerts)}")
    blocked = sum(1 for a in alerts if a.status == ProcessingStatus.BLOCKED)
    alert_cnt = sum(1 for a in alerts if a.status == ProcessingStatus.ALERT)
    print(f"  - 触发预警: {alert_cnt}")
    print(f"  - 阻塞(未算出): {blocked}")
    print(f"  - 报告路径: {report_path}")
    for a in alerts:
        if a.status == ProcessingStatus.BLOCKED:
            reason = a.block_reason.value if a.block_reason else "-"
            print(f"    * [{a.id}] 阻塞原因: {reason} —— {a.block_detail}")
    return 0


def cmd_rerun(args):
    store = _ensure_store(args.data_dir)
    alerts = store.load_all()
    if not alerts:
        print("[重跑失败] 数据目录中没有记录，请先运行 start")
        return 1

    processor = AlertProcessor()
    auditor = ChangeAuditor(default_operator="系统")
    jump_detector = JumpDetector()

    target_ids = None
    if args.ids:
        target_ids = set(args.ids.split(","))

    previous_map = {}
    for i, a in enumerate(alerts):
        previous_map[a.id] = alerts[i - 1] if i > 0 else None

    for alert in alerts:
        if target_ids and alert.id not in target_ids:
            continue

        snap = alert.to_dict()
        prev_result = snap.get("formula_result")

        if alert.id == args.attach_late:
            att = build_late_attachment_for_rec002()
            processor.attach_late_data(alert, att)
            print(f"  * 已为 {alert.id} 合并晚到附件: {att.name}")

        if args.set_threshold_high is not None or args.set_threshold_low is not None:
            if args.set_threshold_high is not None:
                auditor.record_manual_override(
                    alert,
                    "threshold_high",
                    float(args.set_threshold_high),
                    operator=args.operator or "阿岑",
                    reason=args.reason or "重跑时人工调整阈值",
                    is_temporary=True,
                )
            if args.set_threshold_low is not None:
                auditor.record_manual_override(
                    alert,
                    "threshold_low",
                    float(args.set_threshold_low),
                    operator=args.operator or "阿岑",
                    reason=args.reason or "重跑时人工调整阈值",
                    is_temporary=True,
                )

        alert.previous_result = prev_result
        processor.reprocess(alert, snap)
        jump_detector.detect(alert, previous_map.get(alert.id), alert.history)

    store.save_batch(alerts)

    reporter = MarkdownReporter()
    suffix = "_重跑"
    report_path = store.new_report_path(suffix=suffix)
    reporter.write(alerts, report_path)

    reran = len(alerts) if not target_ids else len([a for a in alerts if a.id in target_ids])
    print(f"[重跑完成] 重新处理记录数: {reran}")
    jumps = sum(1 for a in alerts if a.jump_detected)
    print(f"  - 检测到跳变: {jumps}")
    print(f"  - 报告路径: {report_path}")
    for a in alerts:
        if a.jump_detected:
            cause = a.jump_cause.value if a.jump_cause else "-"
            print(f"    * [{a.id}] 跳变原因: {cause} —— {a.jump_detail}")
    return 0


def cmd_report(args):
    store = _ensure_store(args.data_dir)

    if args.list:
        reports = store.list_report_paths()
        if not reports:
            print("[查看报告] 暂无报告，请先运行 start 或 rerun")
            return 0
        print("[报告列表]")
        for idx, p in enumerate(reports, 1):
            print(f"  {idx}. {p}")
        return 0

    if args.path:
        path = args.path
    else:
        path = store.latest_report_path()

    if not path or not os.path.exists(path):
        print("[查看报告失败] 未找到报告")
        return 1

    if args.cat:
        with open(path, "r", encoding="utf-8") as f:
            sys.stdout.write(f.read())
    else:
        try:
            if sys.platform == "darwin":
                os.system(f"open '{path}'")
            elif os.name == "nt":
                os.startfile(path)
            else:
                os.system(f"xdg-open '{path}' >/dev/null 2>&1")
            print(f"[查看报告] 已在默认程序中打开: {path}")
        except Exception as e:
            print(f"[查看报告] 打开失败 ({e})，内容如下:\n")
            with open(path, "r", encoding="utf-8") as f:
                sys.stdout.write(f.read())
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="wind-tunnel-smoke-alert",
        description="风洞烟线阈值预警处理系统",
    )
    parser.add_argument(
        "--data-dir",
        default=os.environ.get("SMOKE_ALERT_DATA_DIR", "data"),
        help="数据存储目录（默认: data 或 env SMOKE_ALERT_DATA_DIR）",
    )

    sub = parser.add_subparsers(dest="command", required=True)

    p_start = sub.add_parser("start", help="启动：加载记录/示例并执行首次处理")
    p_start.add_argument("--input", help="JSON 输入文件路径(可选，默认使用内置示例)")
    p_start.add_argument(
        "--include-manual",
        action="store_true",
        help="在 rec002 中模拟阿岑对阈值的临时修改（用于演示历史留痕）",
    )
    p_start.set_defaults(func=cmd_start)

    p_rerun = sub.add_parser("rerun", help="重跑：重新处理指定或全部记录")
    p_rerun.add_argument("--ids", help="只重跑指定id，逗号分隔；默认全部")
    p_rerun.add_argument(
        "--attach-late",
        help="为指定id合入晚到附件(演示跳变，例如 rec002)",
    )
    p_rerun.add_argument("--set-threshold-high", type=float, help="人工覆盖高阈值(演示跳变)")
    p_rerun.add_argument("--set-threshold-low", type=float, help="人工覆盖低阈值(演示跳变)")
    p_rerun.add_argument("--operator", default="阿岑", help="操作人(默认:阿岑)")
    p_rerun.add_argument("--reason", help="人工修改原因")
    p_rerun.set_defaults(func=cmd_rerun)

    p_rep = sub.add_parser("report", help="查看 Markdown 报告")
    p_rep.add_argument("--list", action="store_true", help="列出全部报告")
    p_rep.add_argument("--path", help="指定报告路径(默认打开最新一份)")
    p_rep.add_argument("--cat", action="store_true", help="直接在终端输出报告内容")
    p_rep.set_defaults(func=cmd_report)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args) or 0


if __name__ == "__main__":
    sys.exit(main())
