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
        if not os.path.exists(args.input):
            print(f"[启动失败] 输入文件不存在: {args.input}")
            return 11
        try:
            with open(args.input, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[启动失败] 输入文件不是有效的 JSON: {e}")
            return 12
        except Exception as e:
            print(f"[启动失败] 读取输入文件出错: {e}")
            return 13
        if not isinstance(raw_list, list):
            print(f"[启动失败] 输入文件顶层必须是数组，实际是: {type(raw_list).__name__}")
            return 14
        try:
            alerts = [WindTunnelSmokeAlert.from_dict(d) for d in raw_list]
        except Exception as e:
            print(f"[启动失败] 输入数据格式不符合模型要求: {e}")
            return 15
    else:
        alerts = build_sample_records()

    if not alerts:
        print("[启动失败] 没有待处理的记录")
        return 16

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
            print(f"  * [演示] 已为 {alert.id} 插入阿岑的临时阈值修改历史")
        processor.process_alert(alert)
        jump_detector.detect(alert, previous, alert.history)

    try:
        store.save_batch(alerts)
    except Exception as e:
        print(f"[启动失败] 保存记录出错: {e}")
        return 17

    reporter = MarkdownReporter()
    report_path = store.new_report_path()
    try:
        reporter.write(alerts, report_path)
    except Exception as e:
        print(f"[启动失败] 生成报告出错: {e}")
        return 18

    print(f"[启动完成] 处理记录数: {len(alerts)}")
    blocked = sum(1 for a in alerts if a.status == ProcessingStatus.BLOCKED)
    alert_cnt = sum(1 for a in alerts if a.status == ProcessingStatus.ALERT)
    normal_cnt = sum(1 for a in alerts if a.status == ProcessingStatus.NORMAL)
    manual_cnt = sum(1 for a in alerts if a.status == ProcessingStatus.MANUAL_OVERRIDDEN)
    print(f"  - 触发预警: {alert_cnt}")
    print(f"  - 正常: {normal_cnt}")
    print(f"  - 人工覆盖: {manual_cnt}")
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

    all_ids = {a.id for a in alerts}

    if args.set_threshold_high is not None or args.set_threshold_low is not None:
        if not args.ids and not args.attach_late:
            print(
                "[重跑失败] 使用 --set-threshold-high/--set-threshold-low "
                "必须同时指定 --ids（明确哪些记录需要人工改判），"
                "否则会污染未涉及记录的交接班历史。"
            )
            print("  正确示例: python3 main.py rerun --ids rec002 --set-threshold-high 80")
            return 2

    target_ids = None
    if args.ids:
        target_ids = set(args.ids.split(","))
        invalid = target_ids - all_ids
        if invalid:
            print(f"[重跑失败] 指定的 id 不存在: {sorted(invalid)}")
            print(f"  可用 id: {sorted(all_ids)}")
            return 3
    elif args.attach_late:
        target_ids = {args.attach_late}

    if args.attach_late:
        if args.attach_late not in all_ids:
            print(f"[重跑失败] --attach-late 指定的 id '{args.attach_late}' 不存在")
            print(f"  可用 id: {sorted(all_ids)}")
            return 4
        if target_ids and args.attach_late not in target_ids:
            print(
                f"[重跑失败] --attach-late='{args.attach_late}' 不在 "
                f"--ids={sorted(target_ids)} 范围内，请检查参数"
            )
            return 5

    if args.set_threshold_high is None and args.set_threshold_low is None \
            and args.attach_late is None and not args.ids:
        print(
            "[提示] 本次重跑未指定任何修改参数（--set-threshold-* / --attach-late），"
            "将对所有记录执行纯重计算。如需人工介入请明确指定 --ids。"
        )

    processor = AlertProcessor()
    auditor = ChangeAuditor(default_operator="系统")
    jump_detector = JumpDetector()

    previous_map = {}
    for i, a in enumerate(alerts):
        previous_map[a.id] = alerts[i - 1] if i > 0 else None

    reran_ids = []
    for alert in alerts:
        is_target = (target_ids is None) or (alert.id in target_ids)
        if not is_target:
            continue

        reran_ids.append(alert.id)
        snap = alert.to_dict()
        prev_result = snap.get("formula_result")

        if alert.id == args.attach_late:
            att = build_late_attachment_for_rec002()
            processor.attach_late_data(alert, att)
            print(f"  * 已为 {alert.id} 合并晚到附件: {att.name}")

        if args.set_threshold_high is not None or args.set_threshold_low is not None:
            if args.set_threshold_high is not None:
                new_val = float(args.set_threshold_high)
                auditor.record_manual_override(
                    alert,
                    "threshold_high",
                    new_val,
                    operator=args.operator or "阿岑",
                    reason=args.reason or "重跑时人工调整阈值",
                    is_temporary=True,
                )
                print(
                    f"  * 已为 {alert.id} 人工设置 threshold_high: "
                    f"{snap.get('threshold_high')} -> {new_val} "
                    f"(操作人: {args.operator or '阿岑'})"
                )
            if args.set_threshold_low is not None:
                new_val = float(args.set_threshold_low)
                auditor.record_manual_override(
                    alert,
                    "threshold_low",
                    new_val,
                    operator=args.operator or "阿岑",
                    reason=args.reason or "重跑时人工调整阈值",
                    is_temporary=True,
                )
                print(
                    f"  * 已为 {alert.id} 人工设置 threshold_low: "
                    f"{snap.get('threshold_low')} -> {new_val} "
                    f"(操作人: {args.operator or '阿岑'})"
                )

        alert.previous_result = prev_result
        processor.reprocess(alert, snap)
        jump_detector.detect(alert, previous_map.get(alert.id), alert.history)

    non_target_alerts = [a for a in alerts if a.id not in reran_ids]
    for a in non_target_alerts:
        old_history_len = len(a.history)
        old_status = a.status
        if a.status == ProcessingStatus.MANUAL_OVERRIDDEN:
            manual_changes = [
                h for h in a.history
                if h.field_name == "status"
                and h.new_value == ProcessingStatus.MANUAL_OVERRIDDEN.value
            ]
            if manual_changes:
                print(
                    f"  [保留] {a.id} 已存在人工覆盖状态，将保持原样，不参与本次重跑的阈值/附件修改"
                )

    store.save_batch(alerts)

    reporter = MarkdownReporter()
    suffix = "_重跑"
    report_path = store.new_report_path(suffix=suffix)
    reporter.write(alerts, report_path)

    print(f"[重跑完成] 重新处理记录数: {len(reran_ids)}（共 {len(alerts)} 条）")
    if reran_ids:
        print(f"  - 涉及记录: {sorted(reran_ids)}")
    else:
        print(f"  - 涉及记录: 全部")
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
            size = os.path.getsize(p) if os.path.exists(p) else 0
            print(f"  {idx}. {p} ({size} 字节)")
        return 0

    if args.path:
        path = args.path
        if not os.path.exists(path):
            print(f"[查看报告失败] 指定路径不存在: {path}")
            return 21
    else:
        path = store.latest_report_path()
        if not path:
            print("[查看报告失败] 暂无报告，请先运行 start 或 rerun")
            return 22

    if not os.path.exists(path):
        print(f"[查看报告失败] 报告文件不存在: {path}")
        return 23

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"[查看报告失败] 读取报告出错: {e}")
        return 24

    if args.cat:
        sys.stdout.write(content)
        if not content.endswith("\n"):
            sys.stdout.write("\n")
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
            sys.stdout.write(content)
            if not content.endswith("\n"):
                sys.stdout.write("\n")
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
