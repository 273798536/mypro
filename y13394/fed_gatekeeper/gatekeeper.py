#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""联邦客户端上线守门 - 稳定接口版

参数名一旦定下就不能改，项目经理的日常脚本靠它们调用。
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# 把 src 加入 path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from checker import GatekeeperChecker
from storage import GatekeeperStorage
from diff import GatekeeperDiff
from exporter import GatekeeperExporter


def build_parser():
    """构造 CLI 参数解析器。参数名永久固定！"""
    parser = argparse.ArgumentParser(
        prog="gatekeeper",
        description="联邦客户端上线守门 - 检查灰度配置、记录结论、供日常脚本调用",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ---------- run: 跑一次守门 ----------
    p_run = subparsers.add_parser("run", help="执行一次上线守门检查")
    p_run.add_argument(
        "--model-version", required=True,
        help="模型版本号，例如 v2.3.1 （会被用作记录文件名的一部分）",
    )
    p_run.add_argument(
        "--gray-config", required=True, type=Path,
        help="灰度配置文件路径（JSON 格式）",
    )
    p_run.add_argument(
        "--rollback-id", default=None,
        help="本次对应的撤回记录 ID，会和最终结论绑定",
    )
    p_run.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data （历史记录/人工确认/材料包都在下面）",
    )
    p_run.add_argument(
        "--extra-materials", type=Path, nargs="*", default=[],
        help="附带的材料文件路径（可多个），会一起打包进材料包",
    )

    # ---------- approve: 人工确认 ----------
    p_app = subparsers.add_parser("approve", help="对某条守门记录做人工确认")
    p_app.add_argument(
        "--record-id", required=True,
        help="要确认的守门记录 ID（即 run 输出的 RECORD_ID）",
    )
    p_app.add_argument(
        "--decision", required=True, choices=["pass", "reject", "hold"],
        help="人工判断：pass=放行 / reject=驳回 / hold=暂缓",
    )
    p_app.add_argument(
        "--comment", required=True,
        help="人工判断理由（会进入历史，复盘时用）",
    )
    p_app.add_argument(
        "--approver", default="老周",
        help="确认人姓名，默认 老周",
    )
    p_app.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data",
    )

    # ---------- diff: 对比两次守门 ----------
    p_diff = subparsers.add_parser("diff", help="对比两条守门记录的差异")
    p_diff.add_argument("--record-id-1", required=True, help="第一条记录 ID")
    p_diff.add_argument("--record-id-2", required=True, help="第二条记录 ID")
    p_diff.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data",
    )

    # ---------- list: 列历史 ----------
    p_list = subparsers.add_parser("list", help="列出所有守门记录")
    p_list.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data",
    )
    p_list.add_argument(
        "--with-approvals", action="store_true",
        help="同时显示人工确认信息",
    )

    # ---------- queue: 看异常队列 ----------
    p_q = subparsers.add_parser("queue", help="查看异常/待处理队列")
    p_q.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data",
    )

    # ---------- pack: 打包材料 ----------
    p_pack = subparsers.add_parser("pack", help="把指定记录打包成材料包")
    p_pack.add_argument("--record-id", required=True, help="记录 ID")
    p_pack.add_argument(
        "--output-dir", type=Path, default=Path("./data"),
        help="输出根目录，默认 ./data",
    )

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "run":
        cmd_run(args)
    elif args.command == "approve":
        cmd_approve(args)
    elif args.command == "diff":
        cmd_diff(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "queue":
        cmd_queue(args)
    elif args.command == "pack":
        cmd_pack(args)


def cmd_run(args):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    record_id = f"{ts}_{args.model_version}"

    storage = GatekeeperStorage(args.output_dir)
    checker = GatekeeperChecker()

    # 1. 读灰度配置（带着原始行号信息，失败时能追到原文）
    try:
        gray_cfg = storage.load_gray_config(args.gray_config)
    except FileNotFoundError:
        _fail(f"[FATAL] 灰度配置文件不存在: {args.gray_config}", fix="检查 --gray-config 路径对不对")
        return
    except json.JSONDecodeError as e:
        _fail(
            f"[FATAL] 灰度配置 JSON 解析失败: 第{e.lineno}行第{e.colno}列 -> {e.msg}",
            fix=f"打开 {args.gray_config} 修语法错误，再重跑",
        )
        return

    # 2. 跑所有检查
    check_result = checker.run_all_checks(
        gray_config=gray_cfg,
        model_version=args.model_version,
        rollback_id=args.rollback_id,
        gray_config_path=str(args.gray_config),
    )

    # 3. 组装记录
    record = {
        "record_id": record_id,
        "timestamp": ts,
        "model_version": args.model_version,
        "rollback_id": args.rollback_id,
        "gray_config_path": str(args.gray_config),
        "gray_config_snapshot": gray_cfg,
        "checks": check_result["checks"],
        "final_conclusion": check_result["conclusion"],
        "final_reason": check_result["reason"],
        "failure_messages": check_result["failure_messages"],
        "extra_material_paths": [str(p) for p in args.extra_materials],
    }

    # 4. 写记录（按 record_id 命名，永不覆盖）
    storage.write_record(record_id, record)

    # 5. 输出给人看 + 给脚本 grep
    _print_run_summary(record)

    # 关键：结论非 pass 时退出码非 0，日常脚本靠这个判定失败
    if check_result["conclusion"] != "pass":
        sys.exit(2)


def cmd_approve(args):
    storage = GatekeeperStorage(args.output_dir)

    # 1. 确认原记录存在
    record = storage.read_record(args.record_id)
    if record is None:
        _fail(
            f"[FATAL] 找不到记录 ID: {args.record_id}",
            fix="先用 `gatekeeper list` 看有哪些记录",
        )
        return

    # 2. 写人工确认（独立文件，不会被重跑覆盖掉原判断）
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    approval = {
        "approval_id": f"apv_{ts}_{args.record_id}",
        "record_id": args.record_id,
        "timestamp": ts,
        "approver": args.approver,
        "decision": args.decision,
        "comment": args.comment,
        "model_version_at_approval": record["model_version"],
    }
    storage.write_approval(args.record_id, approval)

    # 3. 同时在异常队列里打个标记
    storage.update_queue_on_approval(args.record_id, approval)

    print("=" * 60)
    print(f"[OK] 人工确认已写入")
    print(f"  RECORD_ID   : {args.record_id}")
    print(f"  APPROVAL_ID : {approval['approval_id']}")
    print(f"  确认人      : {approval['approver']}")
    print(f"  判断        : {approval['decision']}")
    print(f"  理由        : {approval['comment']}")
    print(f"  当时模型版  : {approval['model_version_at_approval']}")
    print("=" * 60)


def cmd_diff(args):
    storage = GatekeeperStorage(args.output_dir)
    differ = GatekeeperDiff()

    r1 = storage.read_record(args.record_id_1)
    r2 = storage.read_record(args.record_id_2)
    if r1 is None or r2 is None:
        missing = args.record_id_1 if r1 is None else args.record_id_2
        _fail(
            f"[FATAL] 找不到记录 ID: {missing}",
            fix="先用 `gatekeeper list` 确认两条记录都存在",
        )
        return

    a1 = storage.read_approvals(args.record_id_1)
    a2 = storage.read_approvals(args.record_id_2)

    diff_result = differ.compare(r1, r2, a1, a2)
    differ.print_human(diff_result)


def cmd_list(args):
    storage = GatekeeperStorage(args.output_dir)
    records = storage.list_records()
    if not records:
        print("[INFO] 还没有任何守门记录，先跑 `gatekeeper run` 吧")
        return

    print(f"{'RECORD_ID':<32} {'模型版本':<12} {'结论':<8} {'撤回ID':<16} 人工确认")
    print("-" * 90)
    for r in records:
        rid = r["record_id"]
        apv = ""
        if args.with_approvals:
            aps = storage.read_approvals(rid)
            if aps:
                apv = f"{aps[-1]['decision']}({aps[-1]['approver']})"
            else:
                apv = "未确认"
        print(
            f"{rid:<32} {r['model_version']:<12} {r['final_conclusion']:<8} "
            f"{str(r.get('rollback_id') or '-'):<16} {apv}"
        )


def cmd_queue(args):
    """异常/待处理队列。老周看完 README 第二步就看这个。"""
    storage = GatekeeperStorage(args.output_dir)
    queue = storage.get_queue()

    print("=" * 60)
    print("  异常 / 待处理队列 (gatekeeper queue)")
    print("=" * 60)
    if not queue:
        print("[OK] 队列空，啥都不用处理 🎉")
        return

    for i, item in enumerate(queue, 1):
        print(f"\n--- 第 {i} 条 ---")
        for k, v in item.items():
            print(f"  {k:<14}: {v}")

    print(f"\n共 {len(queue)} 条待处理。处理方式：gatekeeper approve --record-id <ID> ...")


def cmd_pack(args):
    storage = GatekeeperStorage(args.output_dir)
    exporter = GatekeeperExporter(storage)
    record = storage.read_record(args.record_id)
    if record is None:
        _fail(f"[FATAL] 找不到记录 ID: {args.record_id}", fix="`gatekeeper list` 查一下")
        return

    pack_path = exporter.pack_materials(record)
    print(f"[OK] 材料包已生成: {pack_path}")
    print("     里面包含：记录快照 / 灰度配置副本 / 失败详情 / 人工确认历史 / 额外材料")


# ---------------------------------------------------------------- utils
def _fail(msg: str, fix: str = ""):
    """统一失败输出格式，项目经理的脚本能稳定 grep。"""
    print(msg, file=sys.stderr)
    if fix:
        print(f"[HINT] {fix}", file=sys.stderr)
    sys.exit(1)


def _print_run_summary(record: dict):
    """run 子命令的稳定输出格式。"""
    c = record["final_conclusion"]
    status_tag = {"pass": "[PASS]", "warn": "[WARN]", "fail": "[FAIL]"}.get(c, "[?]")

    print()
    print("=" * 60)
    print(f"  联邦客户端上线守门 结果 {status_tag}")
    print("=" * 60)
    print(f"RECORD_ID        = {record['record_id']}")
    print(f"模型版本         = {record['model_version']}")
    print(f"撤回记录 ID      = {record.get('rollback_id') or '(未关联)'}")
    print(f"灰度配置         = {record['gray_config_path']}")
    print(f"最终结论         = {c}")
    print(f"结论理由         = {record['final_reason']}")
    print(f"检查项总数       = {len(record['checks'])}")
    print(
        f"通过/警告/失败  = "
        f"{sum(1 for x in record['checks'] if x['status']=='pass')} / "
        f"{sum(1 for x in record['checks'] if x['status']=='warn')} / "
        f"{sum(1 for x in record['checks'] if x['status']=='fail')}"
    )
    print()
    if record["failure_messages"]:
        print("[失败明细 - 项目经理脚本可 grep: 只看FAIL用'\\[FAIL\\]', 全看用'\\[(FAIL|WARN)\\]']")
        for fm in record["failure_messages"]:
            print(f"  {fm}")
        print()
    print(
        f"[下一步] ①人工确认: gatekeeper approve --record-id {record['record_id']} "
        f"--decision <pass|reject|hold> --comment '理由'"
    )
    print(f"       ②打包材料: gatekeeper pack --record-id {record['record_id']}")
    print(f"       ③看异常队: gatekeeper queue")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
