"""灰度城市转化差异 CLI。

用法示例：
  python -m graycity review                      # 打开即处理标注记录与版本回滚丢记录，跑灰度对比与异常分类
  python -m graycity replay --supplement FILE   # 模型日志补录后重算评测回放
  python -m graycity diff                         # 灰度城市转化差异表
  python -m graycity exceptions                   # 异常分类(补材料/改口径)与下一步
  python -m graycity rollback                     # 版本回滚丢记录恢复
  python -m graycity annotate                     # 人工标注记录(原话)
  python -m graycity truncation                   # 长文本截断为什么被拦
  python -m graycity report --out report.md       # 导出报告(评审会只看报告也能看懂)

样例数据内置在 graycity/samples/，无需手工整理。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

from graycity import annotate as ann_mod
from graycity import diff as diff_mod
from graycity import exceptions as ex_mod
from graycity import replay as replay_mod
from graycity import report as report_mod
from graycity import rollback as rb_mod
from graycity import truncation as tr_mod
from graycity.store import DataStore, SAMPLES_DIR

BUNDLED_SUPPLEMENT = SAMPLES_DIR / "model_logs_supplement.jsonl"


def _supplement_path(args) -> Optional[Path]:
    raw = getattr(args, "supplement", None)
    if not raw:
        return None
    # "bundled" 直接指向内置补录样例，使用者无需手工找路径
    if raw == "bundled":
        return BUNDLED_SUPPLEMENT
    return Path(raw)


def _is_backfilled(store: DataStore, supplement: Optional[Path]) -> bool:
    # 是否显式带了补录文件
    if supplement and supplement.exists():
        return True
    return False


# ---------------- commands ----------------


def cmd_review(args) -> int:
    store = DataStore()
    supp = _supplement_path(args)
    # 打开即处理：标注记录 + 版本回滚丢记录
    recoveries = rb_mod.recover(store)
    notes = ann_mod.list_notes(store)

    results = replay_mod.run(store, supp)
    diffs = diff_mod.compute(store, results)
    exc_items = ex_mod.classify(store, results)

    print("=== 灰度城市转化差异 复核（打开即处理）===")
    print(f"生效提示词：{store.active_prompt().version}  样本数：{len(store.samples)}")
    print()
    print("【版本回滚丢记录】")
    print(rb_mod.summarize(recoveries))
    for o in recoveries:
        print(f"  - {o.loss.sample_id} {o.loss.lost_field}: [{o.status}] {o.action}")
    print()
    print("【标注记录（原话保留）】")
    if not notes:
        print("  无")
    for v in notes:
        print(f'  - {v.sample.id}({v.sample.city}): "{v.annotation.note}"')
    print()
    print("【灰度城市转化差异】")
    _print_diff_table(diffs)
    print("汇总：", diff_mod.summarize(diffs))
    print()
    print("【异常分类与下一步】")
    counts = ex_mod.group_counts(exc_items)
    print(
        f"  补材料 {counts.get('补材料', 0)} | 改口径 {counts.get('改口径', 0)} | "
        f"待补录 {counts.get('待补录日志', 0)} | 长文本截断 {counts.get('长文本截断', 0)}"
    )
    for it in exc_items:
        print(f"  - {it.sample_id}({it.city}) [{it.category}] {it.detail} → {it.next_step}")

    if getattr(args, "report", None):
        backfilled = _is_backfilled(store, supp)
        md = report_mod.export(store, results, diffs, exc_items, recoveries, backfilled)
        Path(args.report).write_text(md, encoding="utf-8")
        print(f"\n报告已导出：{args.report}")
    return 0


def cmd_replay(args) -> int:
    store = DataStore()
    supp = _supplement_path(args)
    results = replay_mod.run(store, supp)
    pending = replay_mod.pending_backfill(results)
    print(f"评测回放：共 {len(results)} 条，模型日志{'已补录' if supp else '未补录(含待补录)'}")
    if supp:
        backfilled_ids = [r.sample_id for r in results if _backfilled(store, supp, r.sample_id)]
        if backfilled_ids:
            print(f"本次补录覆盖样本：{', '.join(backfilled_ids)}")
    print(f"待补录日志样本 {len(pending)} 条：")
    for r in pending:
        print(f"  - {r.sample_id}({r.city}): {r.reason}")
    print("提示：模型日志补录后，灰度对比会自动用最新结果重算（见 diff 命令）。")
    return 0


def _backfilled(store, supp, sample_id) -> bool:
    logs = store.load_model_logs(supp)
    return any(l.sample_id == sample_id and l.backfilled for l in logs)


def cmd_diff(args) -> int:
    store = DataStore()
    supp = _supplement_path(args)
    results = replay_mod.run(store, supp)
    diffs = diff_mod.compute(store, results)
    _print_diff_table(diffs)
    print("汇总：", diff_mod.summarize(diffs))
    return 0


def cmd_exceptions(args) -> int:
    store = DataStore()
    supp = _supplement_path(args)
    results = replay_mod.run(store, supp)
    exc_items = ex_mod.classify(store, results)
    counts = ex_mod.group_counts(exc_items)
    print(
        f"补材料 {counts.get('补材料', 0)} | 改口径 {counts.get('改口径', 0)} | "
        f"待补录 {counts.get('待补录日志', 0)} | 长文本截断 {counts.get('长文本截断', 0)}"
    )
    for it in exc_items:
        print(f"  - {it.sample_id}({it.city}) [{it.category}] {it.detail}")
        print(f"      下一步：{it.next_step}")
    return 0


def cmd_rollback(args) -> int:
    store = DataStore()
    recoveries = rb_mod.recover(store)
    print(rb_mod.summarize(recoveries))
    for o in recoveries:
        print(f"  - {o.loss.sample_id} {o.loss.lost_field} ({o.loss.from_version}→{o.loss.to_version})")
        print(f"      状态：{o.status}")
        print(f"      动作：{o.action}")
        print(f"      下一步：{o.next_step}")
    return 0


def cmd_annotate(args) -> int:
    store = DataStore()
    if getattr(args, "sample", None):
        text = ann_mod.show(store, args.sample)
        print(text or f"未找到 {args.sample} 的标注记录")
        return 0
    notes = ann_mod.list_notes(store)
    print(f"标注记录 {len(notes)} 条（原话保留，未改写）：")
    for v in notes:
        print(f"  - {v.sample.id}({v.sample.city}, {v.sample.group}, {v.sample.prompt_version})")
        print(f'      原话："{v.annotation.note}"')
        print(f"      作者：{v.annotation.author}  时间：{v.annotation.ts}")
    return 0


def cmd_truncation(args) -> int:
    store = DataStore()
    if getattr(args, "sample", None):
        print(tr_mod.explain(store, args.sample) or f"未找到 {args.sample}")
        return 0
    samples = tr_mod.detect(store)
    print(f"长文本截断样本 {len(samples)} 条：")
    for s in samples:
        print()
        print(tr_mod.explain(store, s.id))
    return 0


def cmd_report(args) -> int:
    store = DataStore()
    supp = _supplement_path(args)
    results = replay_mod.run(store, supp)
    diffs = diff_mod.compute(store, results)
    exc_items = ex_mod.classify(store, results)
    recoveries = rb_mod.recover(store)
    backfilled = _is_backfilled(store, supp)
    md = report_mod.export(store, results, diffs, exc_items, recoveries, backfilled)
    if getattr(args, "out", None):
        Path(args.out).write_text(md, encoding="utf-8")
        print(f"报告已导出：{args.out}")
    else:
        print(md)
    return 0


# ---------------- table helpers ----------------


def _print_diff_table(diffs) -> None:
    print("城市 | treat转化率 | control转化率 | Δ(pp) | 拦截 | 待补录")
    print("---|---|---|---|---|---")
    for c in diffs:
        tr = (
            f"{c.treatment_rate*100:.0f}%({c.treatment_conv}/{c.treatment_total})"
            if c.treatment_total
            else "-"
        )
        cr = (
            f"{c.control_rate*100:.0f}%({c.control_conv}/{c.control_total})"
            if c.control_total
            else "-"
        )
        print(f"{c.city} | {tr} | {cr} | {c.delta_pp:+.2f} | {c.blocked} | {c.pending_backfill}")


# ---------------- arg parsing ----------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="graycity",
        description="灰度城市转化差异 日常复核工具（样例数据内置，打开即用）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("review", help="打开即处理标注记录+版本回滚丢记录，跑灰度对比与异常分类")
    sp.add_argument("--supplement", help="模型日志补录文件(jsonl)，补录后灰度对比随之更新")
    sp.add_argument("--report", help="同时把复核报告导出到该路径")
    sp.set_defaults(func=cmd_review)

    sp = sub.add_parser("replay", help="评测回放(可更新)，模型日志补录后重算")
    sp.add_argument("--supplement", help="模型日志补录文件(jsonl)")
    sp.set_defaults(func=cmd_replay)

    sp = sub.add_parser("diff", help="灰度城市转化差异表")
    sp.add_argument("--supplement", help="模型日志补录文件(jsonl)")
    sp.set_defaults(func=cmd_diff)

    sp = sub.add_parser("exceptions", help="异常分类(补材料/改口径)与下一步")
    sp.add_argument("--supplement", help="模型日志补录文件(jsonl)")
    sp.set_defaults(func=cmd_exceptions)

    sp = sub.add_parser("rollback", help="版本回滚丢记录恢复")
    sp.set_defaults(func=cmd_rollback)

    sp = sub.add_parser("annotate", help="人工标注记录(原话保留)")
    sp.add_argument("--sample", help="只看指定样本的标注记录")
    sp.set_defaults(func=cmd_annotate)

    sp = sub.add_parser("truncation", help="长文本截断为什么被拦")
    sp.add_argument("--sample", help="只看指定样本的截断解释")
    sp.set_defaults(func=cmd_truncation)

    sp = sub.add_parser("report", help="导出报告(评审会只看报告也能看懂)")
    sp.add_argument("--supplement", help="模型日志补录文件(jsonl)")
    sp.add_argument("--out", help="输出到文件，不填则打印到终端")
    sp.set_defaults(func=cmd_report)

    return p


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
