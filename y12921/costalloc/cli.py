from __future__ import annotations

import argparse
import sys
from decimal import Decimal
from pathlib import Path

from .models import USD_TO_CNY_DEFAULT
from .report import export as export_report
from .state import DATA_DIR, STATE_FILE, State


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="costalloc",
        description="训练任务成本分摊：把训练任务的 GPU 成本按团队/项目分摊，"
                    "处理安全规则晚到、版本回滚保留、补录与人工确认，并导出给非技术人员看的报告。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "典型用法：\n"
            "  python main.py seed                      # 载入样例数据（只需一次，幂等）\n"
            "  python main.py allocate                  # 跑一次分摊，生成版本快照\n"
            "  python main.py supplement --task-id T-1001 --value 12h --unit CNY --remark '补录一轮'\n"
            "  python main.py confirm --task-id T-1007 --reviewer erin\n"
            "  python main.py export --format both      # 导出 CSV + 文字报告\n"
            "  python main.py history --rollback 2      # 回滚版本（记录保留可查）\n"
        ),
    )
    p.add_argument("--state", default=str(STATE_FILE),
                   help="状态文件路径（默认 %(default)s），存放任务/规则/反馈/版本快照")
    sub = p.add_subparsers(dest="command", required=True, metavar="<命令>")

    # seed
    sp = sub.add_parser("seed", help="载入样例数据到状态文件（幂等：已有数据则跳过，除非 --force）")
    sp.add_argument("--force", action="store_true", help="强制重新从 CSV 载入，覆盖现有状态")
    sp.add_argument("--tasks", default=str(DATA_DIR / "sample_tasks.csv"), help="任务 CSV 路径")
    sp.add_argument("--rules", default=str(DATA_DIR / "allocation_rules.csv"), help="规则 CSV 路径")
    sp.add_argument("--feedback", default=str(DATA_DIR / "feedback.csv"), help="反馈 CSV 路径")

    # allocate
    sp = sub.add_parser("allocate", help="跑一次成本分摊，生成带版本号的快照（重复运行结果一致，不会重复计数）")
    sp.add_argument("--note", default="", help="本次分摊备注（例如：晚到安全规则已补全）")
    sp.add_argument("--usd-rate", type=float, default=float(USD_TO_CNY_DEFAULT),
                    help="美元折人民币汇率（默认 %(default)s）")

    # export
    sp = sub.add_parser("export", help="把某次分摊结果导出成报告（CSV 给表格、TXT 给人看）")
    sp.add_argument("--version", default="latest",
                    help="导出哪个版本：latest（默认）或版本号整数")
    sp.add_argument("--out", default="out", help="输出目录（默认 %(default)s）")
    sp.add_argument("--format", choices=["csv", "txt", "both"], default="both",
                    help="导出格式：csv / txt / both（默认 %(default)s）")
    sp.add_argument("--usd-rate", type=float, default=float(USD_TO_CNY_DEFAULT),
                    help="美元折人民币汇率（默认 %(default)s），仅影响文字报告里的折合金额展示")

    # supplement
    sp = sub.add_parser("supplement", help="补录：补一条额外运行或权威实际金额（按 任务+值+备注 去重，重复执行不重复计数）")
    sp.add_argument("--task-id", required=True, help="要补录的任务 ID")
    sp.add_argument("--value", required=True, help="补录值：时长（如 12h）或金额（如 560.0 / 1,234.5 美元）")
    sp.add_argument("--unit", default="", help="币种（CNY/USD），金额类补录需填写")
    sp.add_argument("--reviewer", default="cli", help="操作人（默认 %(default)s）")
    sp.add_argument("--remark", default="", help="补录备注（人话说明）")

    # confirm
    sp = sub.add_parser("confirm", help="人工确认某任务成本（按 任务+审核人 去重，重复执行不重复计数）")
    sp.add_argument("--task-id", required=True, help="要确认的任务 ID")
    sp.add_argument("--reviewer", default="cli", help="审核人（默认 %(default)s）")
    sp.add_argument("--status", choices=["ok", "rejected"], default="ok",
                    help="确认结果：ok（默认）/ rejected")
    sp.add_argument("--value", default="", help="可选：核对用的时长或金额（用于交叉比对）")
    sp.add_argument("--unit", default="", help="可选：核对用币种")
    sp.add_argument("--note", default="", help="确认备注")

    # history
    sp = sub.add_parser("history", help="查看分摊版本历史；用 --rollback 回滚某版本（记录保留可查，不删除）")
    sp.add_argument("--rollback", type=int, default=None,
                   help="回滚到指定版本之前：把该版本标记为已回滚，最近一个未回滚版本成为当前")

    # show
    sp = sub.add_parser("show", help="在终端打印某次分摊的简要结果")
    sp.add_argument("--version", default="latest", help="latest（默认）或版本号整数")

    return p


def _dec_usd(args) -> Decimal:
    return Decimal(str(args.usd_rate))


def cmd_seed(state: State, args) -> int:
    print(state.seed(force=args.force, tasks_csv=Path(args.tasks),
                     rules_csv=Path(args.rules), feedback_csv=Path(args.feedback)))
    return 0


def cmd_allocate(state: State, args) -> int:
    if not state.data["tasks"]:
        print("状态为空，先执行：python main.py seed")
        return 1
    run = state.run_allocate(note=args.note, usd_rate=_dec_usd(args))
    res = run.result
    print(f"分摊完成：版本 v{run.version}")
    for cur, total in res.get("currency_totals", {}).items():
        print(f"  {cur} 合计：{total}")
    print(f"  判定发生变化：{len(res.get('before_after_summary', []))} 条")
    print(f"  需人工处理：{len(res.get('needs_attention', []))} 项")
    print(f"  导出请执行：python main.py export --version {run.version} --format both")
    return 0


def cmd_export(state: State, args) -> int:
    ver = None if args.version == "latest" else int(args.version)
    run = state.get_run(ver)
    if run is None:
        print(f"找不到版本：{args.version}")
        return 1
    preserved = state.rolled_back_runs()
    paths = export_report(run, args.out, fmt=args.format,
                          preserved_runs=preserved, usd_rate=_dec_usd(args))
    for p in paths:
        print(f"已导出：{p}")
    return 0


def cmd_supplement(state: State, args) -> int:
    rec, created = state.add_supplement(
        task_id=args.task_id, value=args.value, unit=args.unit,
        reviewer=args.reviewer, remark=args.remark)
    if created:
        print(f"已补录：{rec.fb_id}（任务 {rec.task_id}，值 {rec.value_raw}）。")
        if not rec.ok:
            print(f"  注意：{rec.problem}")
    else:
        print(f"已存在相同补录，未重复计数：{rec.fb_id}（任务 {rec.task_id}）。")
    return 0


def cmd_confirm(state: State, args) -> int:
    rec, created = state.add_confirm(
        task_id=args.task_id, reviewer=args.reviewer, status=args.status,
        value=args.value, unit=args.unit, note=args.note)
    if created:
        print(f"已确认：{rec.fb_id}（任务 {rec.task_id}，审核人 {rec.reviewer}，{args.status}）。")
        if not rec.ok:
            print(f"  注意：{rec.problem}")
    else:
        print(f"已存在相同确认，未重复计数：{rec.fb_id}（任务 {rec.task_id}）。")
    return 0


def cmd_history(state: State, args) -> int:
    if args.rollback is not None:
        rb = state.rollback(args.rollback)
        print(f"已回滚版本 v{rb.version}（记录保留可查，未删除）。当前版本：v{state.data['latest_version']}。")
        return 0
    runs = state.list_runs()
    if not runs:
        print("暂无分摊版本。先执行：python main.py allocate")
        return 0
    print(f"当前版本：v{state.data['latest_version']}")
    print(f"{'版本':<8}{'时间':<22}{'状态':<12}{'记录数':<8}备注")
    for r in runs:
        status = "已回滚" if r.rolled_back else ("当前" if r.version == state.data["latest_version"] else "历史")
        n = len(r.result.get("allocations", []))
        print(f"v{r.version:<7}{r.ts:<22}{status:<12}{n:<8}{r.note}")
    return 0


def cmd_show(state: State, args) -> int:
    ver = None if args.version == "latest" else int(args.version)
    run = state.get_run(ver)
    if run is None:
        print(f"找不到版本：{args.version}")
        return 1
    res = run.result
    print(f"版本 v{run.version}（{run.ts}）{'[已回滚]' if run.rolled_back else ''}")
    for a in res.get("allocations", []):
        flag = ""
        if a.get("judgment_changed"):
            flag = f"  判定变化：{a.get('judgment_before')} → {a.get('judgment_after')}"
        if a.get("rolled_back_preserved"):
            flag += "  [已回滚保留]"
        print(f"  {a.get('task_id'):<8}{a.get('name'):<16}{_fmt(a.get('resolved_cost')):>10} "
              f"{a.get('currency'):<4}{a.get('judgment_after'):<10}{flag}")
    if res.get("needs_attention"):
        print("需人工处理：")
        for n in res["needs_attention"]:
            print(f"  · {n}")
    return 0


def _fmt(v, places=2):
    if v is None or v == "":
        return "—"
    from decimal import Decimal as _D
    try:
        return format((_D(str(v))).quantize(_D(10) ** -places), "f")
    except Exception:
        return str(v)


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    state = State(path=Path(args.state))
    handlers = {
        "seed": cmd_seed, "allocate": cmd_allocate, "export": cmd_export,
        "supplement": cmd_supplement, "confirm": cmd_confirm,
        "history": cmd_history, "show": cmd_show,
    }
    return handlers[args.command](state, args)


if __name__ == "__main__":
    sys.exit(main())
