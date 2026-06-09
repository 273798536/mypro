"""马尔可夫链课堂模拟 —— 命令行入口

子命令：
  run       使用内置样例跑一遍，生成报告
  list      列出上一批处理的所有记录（含状态、ID）
  show      展示某条记录的详细情况（参数、结果、异常、处理意见）
  review    复核某条记录：可覆盖参数后重跑，复核意见会写入记录
  gaps      查看缺口清单（失败样例 + 处理意见）
  trace     顺着异常回溯：输入记录ID，查看参数快照与处理意见
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Optional

from tabulate import tabulate

from markov_simulation import (
    BatchProcessor,
    MarkovChain,
    ReportGenerator,
    MarkovError,
)
from sample_data import build_batch_cases


STATE_FILE = "output/batch_state.json"
import hashlib


def _stable_id(label: str, idx: int) -> str:
    """基于标签和索引生成稳定 ID，跨命令一致"""
    raw = f"{label}-{idx}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]


def _build_stable_batch() -> BatchProcessor:
    """构建稳定批次（记录 ID 固定）：跨命令一致"""
    batch = BatchProcessor(batch_label="课堂演示样例集")
    for i, case in enumerate(build_batch_cases()):
        rec = batch.add_case(
            label=case["label"],
            states=case["states"],
            transition_matrix=case["transition_matrix"],
            initial_dist=case.get("initial_dist"),
        )
        rec.record_id = _stable_id(case["label"], i)
    batch.run_all()
    return batch
# ------------------------------------------------------------------
# 子命令：run
# ------------------------------------------------------------------
def cmd_run(args) -> int:
    print("=" * 60)
    print("  马尔可夫链课堂模拟 —— 批量计算")
    print("=" * 60)

    batch = _build_stable_batch()
    for rec in batch.records:
        print(f"  [录入] {rec.label}  (id={rec.record_id})")

    print(f"\n开始批量计算（共 {len(batch.records)} 条）……\n")
    batch.run_all(steps=args.steps)

    ok = len(batch.successful())
    bad = len(batch.failed())
    print(f"完成：成功/告警 {ok} 条，失败 {bad} 条。")

    # 终端概览
    print("\n── 批量概览 ──")
    rows = []
    for r in batch.records:
        rows.append([
            r.record_id, r.label, r.status,
            (r.error or {}).get("message", "") or (
                "收敛告警" if r.status == "warning" else ""
            ),
        ])
    print(tabulate(
        rows,
        headers=["记录ID", "标签", "状态", "错误/告警"],
        tablefmt="github",
    ))

    if bad > 0:
        print("\n── 缺口清单（失败样例及处理意见） ──")
        gaps = batch.gaps_summary()
        print(tabulate(gaps, headers="keys", tablefmt="github", showindex=False))

    # 生成报告
    print("\n正在生成报告和图表……")
    reporter = ReportGenerator(out_dir="output")
    report_path = reporter.generate(batch)
    print(f"报告已生成：{os.path.abspath(report_path)}")

    _save_batch(batch)

    # 复核入口提示
    ids = [r.record_id for r in batch.records]
    print(f"\n【复核入口】可使用以下命令进一步操作：")
    print(f"  python main.py list              查看记录列表")
    print(f"  python main.py show {ids[0]}      查看某条详情")
    print(f"  python main.py trace {ids[-1]}   顺着异常回溯（失败记录）")
    print(f"  python main.py review {ids[0]}   复核/修正后重跑某条")
    print(f"  python main.py gaps              查看缺口清单")
    return 0


# ------------------------------------------------------------------
# 子命令：list / show / gaps
# ------------------------------------------------------------------
def _require_batch_or_run() -> BatchProcessor:
    """确保有已处理批次可用，否则自动跑一次（记录 ID 稳定）"""
    return _build_stable_batch()


def cmd_list(args) -> int:
    batch = _require_batch_or_run()
    rows = [[r.record_id, r.label, r.status] for r in batch.records]
    print(tabulate(rows, headers=["记录ID", "标签", "状态"], tablefmt="github"))
    return 0


def cmd_show(args) -> int:
    batch = _require_batch_or_run()
    rec = batch.find_record(args.record_id)
    if rec is None:
        print(f"❌ 未找到记录ID：{args.record_id}")
        return 1

    print(f"==== {rec.label}  ({rec.record_id}) ====")
    print(f"状态：{rec.status}")
    print(f"创建：{rec.created_at}，更新：{rec.updated_at}")

    if rec.model is not None:
        snap = rec.model.param_snapshot()
        print(f"\n── 参数表 ──")
        print(f"  状态：{snap['states']}")
        print(f"  初始分布：{snap['initial_dist']}")

    if rec.status in ("success", "warning"):
        print("\n── 稳态分布（前5） ──")
        ss = rec.steady_state_df()
        if ss is not None:
            print(tabulate(ss.head(), headers="keys", tablefmt="github", showindex=False))

    if rec.error:
        print("\n── 错误信息 ──")
        print(json.dumps(rec.error, ensure_ascii=False, indent=2))

    if rec.review_notes:
        print("\n── 复核意见 ──")
        for n in rec.review_notes:
            print(f"  - {n}")

    print(f"\n复核入口：python main.py review {rec.record_id}")
    return 0


def cmd_gaps(args) -> int:
    batch = _require_batch_or_run()
    gaps = batch.gaps_summary()
    if len(gaps) == 0:
        print("✅ 没有失败样例，无需补数。")
        return 0
    print(tabulate(gaps, headers="keys", tablefmt="github", showindex=False))
    return 0


# ------------------------------------------------------------------
# 子命令：trace（异常回溯）
# ------------------------------------------------------------------
def cmd_trace(args) -> int:
    """顺着一条异常往回查：展示参数表、错误、处理意见、审计轨迹"""
    batch = _require_batch_or_run()
    rec = batch.find_record(args.record_id)
    if rec is None:
        print(f"❌ 未找到记录ID：{args.record_id}")
        return 1

    print(f"\n🔍 异常回溯：{rec.label}  ({rec.record_id})")
    print(f"   当前状态：{rec.status}")

    print("\n── ① 参数快照 ──")
    print(json.dumps(rec.param_snapshot, ensure_ascii=False, indent=2))

    if rec.error:
        print("\n── ② 错误信息 ──")
        print(f"   类型：{rec.error['error_type']}")
        print(f"   说明：{rec.error['message']}")

    print("\n── ③ 处理意见 ──")
    if rec.error and rec.error.get("suggestion"):
        print(f"   {rec.error['suggestion']}")
    for note in rec.review_notes:
        print(f"   {note}")

    if rec.error and rec.error.get("context"):
        print("\n── ④ 上下文参数 ──")
        for k, v in rec.error["context"].items():
            print(f"   {k}: {v}")

    if rec.model is not None and rec.model.audit_trails:
        print("\n── ⑤ 运算审计轨迹 ──")
        for t in rec.model.audit_trails:
            print(f"   - {t.operation}(params={t.params}) "
                  f"@ {t.started_at} -> {t.finished_at}"
                  + (f"  告警: {t.warning}" if t.warning else "")
                  + (f"  处理意见: {t.suggestion}" if t.suggestion else ""))

    print(f"\n修正后可执行：python main.py review {rec.record_id}")
    return 0


# ------------------------------------------------------------------
# 子命令：review（复核入口）
# ------------------------------------------------------------------
def cmd_review(args) -> int:
    batch = _require_batch_or_run()
    rec = batch.find_record(args.record_id)
    if rec is None:
        print(f"❌ 未找到记录ID：{args.record_id}")
        return 1

    print(f"\n📝 复核模式：{rec.label}  ({rec.record_id})")
    print(f"   当前状态：{rec.status}")

    overrides = {}
    if args.states is not None:
        overrides["states"] = args.states.split(",")
    if args.set_row is not None:
        # 格式： 行号,val1,val2,...
        parts = args.set_row.split(",")
        row_idx = int(parts[0])
        vals = [float(x) for x in parts[1:]]
        raw = list(rec.raw_input.get("transition_matrix", []))
        while len(raw) <= row_idx:
            raw.append([])
        raw[row_idx] = vals
        overrides["transition_matrix"] = raw
    if args.set_initial is not None:
        # 格式： state1=val1,state2=val2
        d = {}
        for pair in args.set_initial.split(","):
            k, v = pair.split("=")
            d[k.strip()] = float(v)
        overrides["initial_dist"] = d
    if args.note:
        rec.add_review_note(args.note)

    if overrides:
        print(f"   本次覆盖参数：{list(overrides.keys())}")
    else:
        print("   （未覆盖参数，仅重跑）")

    ok = batch.rerun(args.record_id, **overrides)
    if not ok:
        print("❌ 重跑失败")
        return 1

    print(f"\n   重跑后状态：{rec.status}")
    if rec.status == "success":
        print("   ✅ 复核通过！")
    elif rec.status == "warning":
        print("   ⚠️ 有告警，详见稳态 info。")
    else:
        print(f"   ❌ 仍失败：{(rec.error or {}).get('message')}")
        print(f"      处理意见：{(rec.error or {}).get('suggestion')}")

    # 同步更新报告
    reporter = ReportGenerator(out_dir="output")
    report_path = reporter.generate(batch)
    print(f"\n   报告已同步更新：{os.path.abspath(report_path)}")
    return 0


# ------------------------------------------------------------------
# main
# ------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="main.py",
        description="马尔可夫链课堂模拟 —— 批量分析、复核、异常回溯",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_run = sub.add_parser("run", help="批量计算内置样例并生成报告")
    p_run.add_argument("--steps", type=int, default=15, help="分布演化步数")
    p_run.set_defaults(func=cmd_run)

    p_list = sub.add_parser("list", help="列出记录")
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="展示某条记录详情")
    p_show.add_argument("record_id", help="记录ID（8位十六进制）")
    p_show.set_defaults(func=cmd_show)

    p_gaps = sub.add_parser("gaps", help="查看缺口清单（失败样例及处理意见）")
    p_gaps.set_defaults(func=cmd_gaps)

    p_trace = sub.add_parser("trace", help="顺着异常回溯：参数表 + 处理意见")
    p_trace.add_argument("record_id", help="记录ID")
    p_trace.set_defaults(func=cmd_trace)

    p_review = sub.add_parser("review", help="复核某条记录，可覆盖参数后重跑")
    p_review.add_argument("record_id", help="记录ID")
    p_review.add_argument("--states", help="覆盖状态列表，逗号分隔")
    p_review.add_argument(
        "--set-row",
        help="覆盖某行转移概率：行号,val1,val2,...（行号从0开始）",
    )
    p_review.add_argument(
        "--set-initial",
        help="覆盖初始分布：state1=p1,state2=p2",
    )
    p_review.add_argument("--note", help="附加复核意见")
    p_review.set_defaults(func=cmd_review)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.func(args)
    except MarkovError as e:
        print(f"\n💥 {e}")
        return 2
    except KeyboardInterrupt:
        print("\n已中断。")
        return 130


if __name__ == "__main__":
    sys.exit(main())
