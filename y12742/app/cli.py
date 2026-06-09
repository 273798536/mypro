import argparse
import sys
import json
import os
from datetime import datetime

from . import db
from .calculator import run_calculation, list_drafts, list_warnings, get_params, get_teams
from .importer import import_teams_csv, import_params_csv
from .reviewer import (
    update_review, batch_approve_all, batch_approve_warnings,
    get_review_summary
)
from .analyzer import error_analysis, trace_draft, explain_error
from .exporter import export_report


def _resolve_batch(identifier: str) -> int:
    if identifier.isdigit():
        b = db.get_batch(int(identifier))
        if b:
            return b["id"]
    b = db.get_batch_by_tag(identifier)
    if b:
        return b["id"]
    raise ValueError(f"找不到批次: {identifier} (可用ID或tag)")


def _print_json(obj) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))


def cmd_init(args) -> None:
    db.init_db()
    print("数据库已初始化")


def cmd_create(args) -> None:
    tag = args.tag or f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    batch_id = db.create_batch(tag, source_file=args.source, remark=args.remark or "")
    print(f"已创建批次: id={batch_id}, tag={tag}")


def cmd_list(args) -> None:
    batches = db.list_batches()
    if not batches:
        print("(无批次)")
        return
    for b in batches:
        summary = get_review_summary(b["id"]) if not args.brief else {}
        status_str = "" if args.brief else f" 复核: {summary}"
        print(f"[{b['id']}] tag={b['batch_tag']} created={b['created_at']} "
              f"source={b.get('source_file') or '-'}{status_str}")


def cmd_import(args) -> None:
    batch_id = _resolve_batch(args.batch)
    if args.teams:
        result = import_teams_csv(batch_id, args.teams)
        print(f"已导入队伍数据: {result['count']} 条")
    if args.params:
        result = import_params_csv(batch_id, args.params)
        print(f"已导入参数: {list(result.keys())}")
        _print_json(result)


def cmd_calc(args) -> None:
    batch_id = _resolve_batch(args.batch)
    drafts = run_calculation(batch_id)
    print(f"计算完成, 共 {len(drafts)} 条草稿")
    warnings = [d for d in drafts if d.get("is_warning")]
    if warnings:
        print(f"[警告] {len(warnings)} 条误差过大:")
        for w in warnings:
            print(f"  draft_id={w['id']} {w['team_name']} 误差={w['error_magnitude']:.4f} "
                  f"排名变化={w['rank_delta']}")


def cmd_show(args) -> None:
    batch_id = _resolve_batch(args.batch)
    if args.warnings:
        drafts = list_warnings(batch_id)
        print(f"警告记录 {len(drafts)} 条:")
    else:
        drafts = list_drafts(batch_id)
        print(f"草稿 {len(drafts)} 条:")
    for d in drafts:
        flag = "[!]" if d.get("is_warning") else "   "
        status = d.get("review_status") or "pending"
        print(f"{flag} draft_id={d['id']:>3} {d['team_name']:<20} "
              f"原分={d['raw_score']} 原排名={d['raw_rank']} → "
              f"调分={d['adjusted_score']:.3f} 调排名={d['adjusted_rank']} "
              f"delta={d['rank_delta']:+d} 稳定性={d['stability_index']:.4f} "
              f"误差={d['error_magnitude']:.4f} 复核={status}")


def cmd_review(args) -> None:
    batch_id = _resolve_batch(args.batch)
    if args.all:
        if args.status == "approved":
            r = batch_approve_all(batch_id, reviewer=args.reviewer)
        elif args.status == "reviewing":
            r = batch_approve_warnings(batch_id, reviewer=args.reviewer, opinion=args.opinion or "")
        else:
            print("--all 仅支持 approved 或 reviewing")
            sys.exit(2)
        print(f"批量处理 {len(r)} 条")
        _print_json(r)
        return
    if args.draft is None:
        summary = get_review_summary(batch_id)
        print("复核状态概览:")
        _print_json(summary)
        return
    r = update_review(args.draft, args.status, reviewer=args.reviewer, opinion=args.opinion or "")
    _print_json(r)


def cmd_trace(args) -> None:
    info = trace_draft(args.draft_id)
    print(f"=== 追溯 draft_id={args.draft_id} ===")
    d = info["draft"]
    print(f"队伍: {d['team_name']}  原始分={d['raw_score']}  原始排名={d['raw_rank']}")
    print(f"调整分={d['adjusted_score']:.4f}  调整排名={d['adjusted_rank']}  "
          f"delta={d['rank_delta']:+d}")
    print(f"稳定性指数={d['stability_index']:.6f}  误差幅度={d['error_magnitude']:.6f}  "
          f"警告={'是' if d['is_warning'] else '否'}")
    if d.get("warning_reason"):
        print(f"警告原因: {d['warning_reason']}")
    print(f"复核: {d.get('review_status')}  复核人={d.get('reviewer') or '-'}")
    if d.get("review_opinion"):
        print(f"复核意见: {d['review_opinion']}")
    print("")
    print("-- 计算草稿 (calc_note) --")
    print(d.get("calc_note") or "(无)")
    print("")
    print("-- 批次参数 --")
    _print_json(info["params"])
    print("")
    print("-- 处理痕迹 --")
    for r in info["runs"]:
        print(f"  [{r['created_at']}] {r['phase']}  {r.get('operator') or '-'}  {r.get('detail') or ''}")


def cmd_analyze(args) -> None:
    batch_id = _resolve_batch(args.batch)
    if args.text:
        print(explain_error(batch_id))
    else:
        ana = error_analysis(batch_id)
        if args.verbose:
            _print_json(ana)
        else:
            summary = {k: v for k, v in ana.items() if k not in ("warnings", "runs", "params")}
            _print_json(summary)


def cmd_export(args) -> None:
    batch_id = _resolve_batch(args.batch)
    out_dir = args.output_dir or None
    paths = export_report(batch_id, output_dir=out_dir)
    print("导出完成:")
    for k, v in paths.items():
        if k in ("batch_tag", "timestamp"):
            continue
        print(f"  {k}: {v}")


def cmd_runs(args) -> None:
    batch_id = _resolve_batch(args.batch)
    runs = db.list_runs(batch_id)
    print(f"批次 {batch_id} 处理痕迹:")
    for r in runs:
        print(f"  [{r['created_at']}] {r['phase']:<18} operator={r.get('operator') or '-':<10} "
              f"detail={r.get('detail') or ''}")


def cmd_params(args) -> None:
    batch_id = _resolve_batch(args.batch)
    params = get_params(batch_id)
    print("参数表:")
    _print_json(params)
    print("")
    teams = get_teams(batch_id)
    print(f"已导入队伍: {len(teams)} 条")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rank-stability",
        description="赛事积分排名稳定性计算工具（建模社助教用）"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="初始化数据库").set_defaults(func=cmd_init)

    p = sub.add_parser("create", help="创建新批次")
    p.add_argument("--tag", help="批次标签，默认自动生成")
    p.add_argument("--source", help="来源文件名")
    p.add_argument("--remark", help="备注")
    p.set_defaults(func=cmd_create)

    p = sub.add_parser("list", help="列出所有批次")
    p.add_argument("--brief", action="store_true", help="简洁模式")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("import", help="导入队伍或参数 CSV")
    p.add_argument("batch", help="批次ID或标签")
    p.add_argument("--teams", help="队伍CSV路径")
    p.add_argument("--params", help="参数CSV路径")
    p.set_defaults(func=cmd_import)

    p = sub.add_parser("calc", help="运行计算，生成草稿")
    p.add_argument("batch", help="批次ID或标签")
    p.set_defaults(func=cmd_calc)

    p = sub.add_parser("show", help="查看计算草稿")
    p.add_argument("batch", help="批次ID或标签")
    p.add_argument("--warnings", action="store_true", help="仅查看警告记录")
    p.set_defaults(func=cmd_show)

    p = sub.add_parser("review", help="复核草稿（单条或批量）")
    p.add_argument("batch", help="批次ID或标签")
    p.add_argument("--draft", type=int, help="草稿ID（单条）")
    p.add_argument("--status", choices=["pending", "reviewing", "approved", "rejected"],
                   default="approved", help="目标状态")
    p.add_argument("--reviewer", default="TA", help="复核人")
    p.add_argument("--opinion", help="复核意见")
    p.add_argument("--all", action="store_true", help="批量处理: approved=全部通过, reviewing=所有警告进入复核")
    p.set_defaults(func=cmd_review)

    p = sub.add_parser("trace", help="追溯一条草稿到来源和处理记录")
    p.add_argument("draft_id", type=int, help="草稿ID")
    p.set_defaults(func=cmd_trace)

    p = sub.add_parser("analyze", help="误差分析与解释")
    p.add_argument("batch", help="批次ID或标签")
    p.add_argument("--text", action="store_true", help="文本格式输出")
    p.add_argument("--verbose", action="store_true", help="包含警告明细和运行记录")
    p.set_defaults(func=cmd_analyze)

    p = sub.add_parser("export", help="导出报告")
    p.add_argument("batch", help="批次ID或标签")
    p.add_argument("--output-dir", help="输出目录（默认 output/）")
    p.set_defaults(func=cmd_export)

    p = sub.add_parser("runs", help="查看处理痕迹")
    p.add_argument("batch", help="批次ID或标签")
    p.set_defaults(func=cmd_runs)

    p = sub.add_parser("params", help="查看参数和导入状态")
    p.add_argument("batch", help="批次ID或标签")
    p.set_defaults(func=cmd_params)

    return parser


def main(argv=None) -> None:
    db.init_db()
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
