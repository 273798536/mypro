"""CLI 入口：按 CLI 交付给研发团队，输入输出目录可指定。

子命令:
  verify        对 input/ 下的 JSON 做脱敏核验，结果落 output/ + 状态库
  rollback      按批次号回滚（日常入口：回滚记录）
  rollback-log  查看回滚记录
  trace         从结论 / 慢查询 ID 追溯完整链路
  report        导出 JSON / Markdown 报告
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

from . import __version__
from .engine import VerifyEngine
from .models import ProcessStatus
from .report import (
    export_json,
    export_markdown,
    export_trace_markdown,
)
from .storage import Store


DB_NAME = ".mask_verify_state.db"


def _store(output_dir: Path) -> Store:
    return Store(output_dir / DB_NAME)


def _glob_inputs(input_dir: Path) -> list[Path]:
    if not input_dir.exists():
        print(f"[ERROR] 输入目录不存在: {input_dir}", file=sys.stderr)
        sys.exit(2)
    files = sorted([p for p in input_dir.glob("*.json") if p.is_file()])
    if not files:
        print(f"[WARN] 输入目录下没有 .json 文件: {input_dir}", file=sys.stderr)
    return files


# ---------- subcommand: verify ----------

def cmd_verify(args: argparse.Namespace) -> int:
    input_dir = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    files = _glob_inputs(input_dir)

    engine = VerifyEngine(_store(output_dir), output_dir)
    stats = engine.run(files)

    summary = {
        "batch_id": stats.batch_id,
        "processed_files": stats.processed_files,
        "skipped_idempotent": stats.skipped_idempotent,
        "conclusions_added": stats.conclusions_added,
        "conclusions_superseded": stats.conclusions_superseded,
        "pass": stats.pass_count,
        "fail": stats.fail_count,
    }
    (output_dir / "verify_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


# ---------- subcommand: rollback / rollback-log ----------

def cmd_rollback(args: argparse.Namespace) -> int:
    output_dir = Path(args.output).resolve()
    store = _store(output_dir)
    if not args.batch_id:
        print("[ERROR] --batch-id 必填", file=sys.stderr)
        return 2
    point = store.rollback_batch(args.batch_id, args.reason or "manual rollback")
    print(json.dumps(point.to_dict(), ensure_ascii=False, indent=2))
    return 0


def cmd_rollback_log(args: argparse.Namespace) -> int:
    output_dir = Path(args.output).resolve()
    points = _store(output_dir).list_rollback_points()
    print(json.dumps([p.to_dict() for p in points], ensure_ascii=False, indent=2))
    return 0


# ---------- subcommand: trace ----------

def cmd_trace(args: argparse.Namespace) -> int:
    output_dir = Path(args.output).resolve()
    store = _store(output_dir)
    if args.trace_kind == "conclusion":
        chain = store.trace_from_conclusion(args.id)
        if not chain:
            print(f"[ERROR] 找不到结论: {args.id}", file=sys.stderr)
            return 1
        payload = chain.to_dict()
        if args.export_md:
            path = export_trace_markdown(chain, output_dir / "traces")
            print(f"[OK] 已导出 Markdown: {path}")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    else:  # slow-query
        chains = store.trace_from_slow_query(args.id)
        if not chains:
            print(f"[WARN] 没有结论关联慢查询: {args.id}")
            return 0
        for c in chains:
            if args.export_md:
                export_trace_markdown(c, output_dir / "traces")
        out = {
            "slow_log_id": args.id,
            "linked_conclusions": len(chains),
            "chains": [c.to_dict() for c in chains],
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0


# ---------- subcommand: report ----------

def cmd_report(args: argparse.Namespace) -> int:
    output_dir = Path(args.output).resolve()
    store = _store(output_dir)
    fmt = (args.format or "all").lower()
    out_paths: list[Path] = []
    if fmt in ("json", "all"):
        out_paths.append(export_json(store, output_dir, args.batch_id, args.work_order_id))
    if fmt in ("md", "markdown", "all"):
        out_paths.append(export_markdown(store, output_dir, args.batch_id, args.work_order_id))
    for p in out_paths:
        print(f"[OK] {p}")
    return 0


# ---------- parser ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="mask-verify",
        description="审计日志脱敏核验 CLI（幂等 / 可追溯 / 回滚）",
    )
    p.add_argument("--version", action="version", version=f"mask-verify {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    pv = sub.add_parser("verify", help="运行核验：读 input/ 下 JSON，写 output/")
    pv.add_argument("-i", "--input", required=True, help="输入目录（含 *.json 工单核验材料）")
    pv.add_argument("-o", "--output", required=True, help="输出目录（状态库也放这里）")
    pv.set_defaults(func=cmd_verify)

    pr = sub.add_parser("rollback", help="按批次回滚：日常入口放在回滚记录")
    pr.add_argument("-o", "--output", required=True, help="输出目录（状态库所在目录）")
    pr.add_argument("-b", "--batch-id", required=True, help="要回滚的批次号")
    pr.add_argument("-r", "--reason", help="回滚原因")
    pr.set_defaults(func=cmd_rollback)

    prl = sub.add_parser("rollback-log", help="查看回滚记录")
    prl.add_argument("-o", "--output", required=True, help="输出目录")
    prl.set_defaults(func=cmd_rollback_log)

    pt = sub.add_parser("trace", help="追溯：从结论 or 慢查询 ID 倒查完整链路")
    pt.add_argument("-o", "--output", required=True, help="输出目录")
    pt.add_argument("trace_kind", choices=["conclusion", "slow-query"],
                    help="conclusion=从结论倒查；slow-query=从慢查询反查结论")
    pt.add_argument("id", help="结论 ID 或慢查询 slow_log_id")
    pt.add_argument("--export-md", action="store_true", help="额外导出 Markdown 追溯文件")
    pt.set_defaults(func=cmd_trace)

    pre = sub.add_parser("report", help="导出核验报告（月底/课前复盘）")
    pre.add_argument("-o", "--output", required=True, help="输出目录")
    pre.add_argument("-f", "--format", default="all",
                     choices=["json", "md", "markdown", "all"], help="导出格式")
    pre.add_argument("-b", "--batch-id", help="按批次过滤")
    pre.add_argument("-w", "--work-order-id", help="按工单过滤")
    pre.set_defaults(func=cmd_report)

    return p


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
