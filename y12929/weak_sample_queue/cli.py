import argparse
import json
import sys
from pathlib import Path

from .sample_processor import SampleStore, SampleProcessor, WeakSample
from .rule_engine import RuleEngine, SafetyRule
from .queue_manager import WeakSampleQueue
from .report import ReportExporter
from .seed import seed_samples
from .config import SAMPLE_STATUS


def _pretty(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def cmd_init(args) -> int:
    store = SampleStore()
    existed = bool(store.list_all())
    seed_samples(store)
    engine = RuleEngine()
    if existed:
        print("ℹ️  检测到已有样本数据，样例初始化已跳过（不会覆盖现有样本）。")
        print(f"   - 当前样本数: {len(store.list_all())}")
    else:
        print("✅ 初始化完成，样例数据与默认安全规则已就绪。")
        print(f"   - 样例样本数: {len(store.list_all())}")
    print(f"   - 默认规则数: {len(engine.list_rules())}")
    return 0


def cmd_process(args) -> int:
    store = SampleStore()
    engine = RuleEngine()
    queue = WeakSampleQueue(store)
    processor = SampleProcessor(store, engine)

    if args.sample_id:
        sample = store.get(args.sample_id)
        if not sample:
            print(f"❌ 找不到样本 {args.sample_id}")
            return 1
        if sample.status != SAMPLE_STATUS["PENDING"]:
            print(
                f"⚠️  样本 {args.sample_id} 当前状态为 {sample.status}，"
                f"非 pending 状态不会重新处理。如需重跑请先将状态重置为 pending。"
            )
            return 0
        result = processor.process_sample(sample)
        bucket = queue.enqueue(result)
        label_map = {
            "pending": "已入待处理队列",
            "review": "已转人工审核队列",
            "cleared": "已处理完毕（passed/rejected/confirmed）",
        }
        print(f"✅ 处理完成：{result.sample_id} → {result.status} ({label_map.get(bucket, bucket)})")
        print(_pretty(result.to_dict()))
        return 0

    samples = store.list_by_status(SAMPLE_STATUS["PENDING"])
    if not samples:
        print("ℹ️  没有待处理（pending）样本，跳过。")
        return 0

    summary = {"pending": 0, "review": 0, "cleared": 0}
    for s in samples:
        result = processor.process_sample(s)
        bucket = queue.enqueue(result)
        summary[bucket] += 1

    print(f"✅ 已处理 {len(samples)} 条待处理样本：")
    print(f"   - 转人工审核（needs_review）: {summary['review']}")
    print(f"   - 直接出队（passed/rejected）: {summary['cleared']}")
    print(f"   - 仍留待处理: {summary['pending']}")
    return 0


def cmd_list(args) -> int:
    store = SampleStore()
    if args.status:
        samples = store.list_by_status(args.status)
    else:
        samples = store.list_all()

    if args.format == "json":
        print(_pretty([s.to_dict() for s in samples]))
    else:
        if not samples:
            print("（空）")
            return 0
        print(f"{'ID':<20} {'状态':<14} {'来源':<20} {'评分':>6}  备注")
        print("-" * 90)
        for s in samples:
            note = s.human_note[:30] + ("..." if len(s.human_note) > 30 else "")
            print(
                f"{s.sample_id:<20} {s.status:<14} {s.source:<20} "
                f"{s.grayscale_score:>6.3f}  {note}"
            )
    return 0


def cmd_queue(args) -> int:
    store = SampleStore()
    queue = WeakSampleQueue(store)
    if args.action == "stats":
        stats = queue.stats()
        print(_pretty(stats))
    elif args.action == "pending":
        samples = queue.list_pending(limit=args.limit)
        if not samples:
            print("（待处理队列为空）")
            return 0
        for s in samples:
            print(f"  - {s.sample_id}  {s.status}  {s.source}")
    elif args.action == "review":
        samples = queue.list_review(limit=args.limit)
        if not samples:
            print("（人工审核队列为空）")
            return 0
        for s in samples:
            truncated = " ⚠️截断" if s.truncation_info.get("is_truncated") else ""
            print(f"  - {s.sample_id}  {s.status}{truncated}  {s.source}")
    return 0


def cmd_review(args) -> int:
    store = SampleStore()
    engine = RuleEngine()
    queue = WeakSampleQueue(store)
    processor = SampleProcessor(store, engine)

    if args.action == "confirm":
        result = processor.confirm_sample(args.sample_id, args.note or "")
        if result:
            queue.remove_from_review(args.sample_id)
            print(f"✅ 已确认 {args.sample_id}")
        else:
            print(f"❌ 找不到样本 {args.sample_id}")
            return 1
    elif args.action == "reject":
        result = processor.reject_sample(args.sample_id, args.note or "")
        if result:
            queue.remove_from_review(args.sample_id)
            print(f"❌ 已拒绝 {args.sample_id}")
        else:
            print(f"❌ 找不到样本 {args.sample_id}")
            return 1
    elif args.action == "show":
        sample = store.get(args.sample_id)
        if not sample:
            print(f"❌ 找不到样本 {args.sample_id}")
            return 1
        print("=" * 60)
        print(f"样本ID: {sample.sample_id}")
        print(f"状态  : {sample.status}")
        print(f"来源  : {sample.source}")
        print(f"灰度分: {sample.grayscale_score}")
        print(f"原文长: {len(sample.text)}")
        if sample.truncation_info.get("is_truncated"):
            ti = sample.truncation_info
            print(f"截断拦截: 是  原文{ti['original_length']}字/上限{ti['max_allowed']}字/溢出{ti['overflow_chars']}字")
        if sample.human_note:
            print(f"\n💬 人工备注（原句保留）:")
            print(f"   {sample.human_note}")
        if sample.rule_hits:
            print(f"\n🔍 命中规则:")
            for h in sample.rule_hits:
                print(f"   - [{h['rule_id']}] {h['rule_name']}  权重{h['weight']:+.2f}  {h['detail']}")
        print(f"\n📝 原文:")
        print(sample.text)
        if sample.review_history:
            print(f"\n📜 审核轨迹:")
            for h in sample.review_history:
                print(f"   - {h['timestamp']}  {h['action']}  {h.get('reason', '')}")
                if h.get("reviewer_note"):
                    print(f"     备注: {h['reviewer_note']}")
    return 0


def cmd_rules(args) -> int:
    engine = RuleEngine()
    if args.action == "list":
        rules = engine.list_rules()
        if not rules:
            print("（暂无安全规则）")
            return 0
        print(f"{'ID':<10} {'名称':<18} {'类型':<10} {'权重':>7}  描述")
        print("-" * 70)
        for r in rules:
            print(
                f"{r.rule_id:<10} {r.name:<18} {r.rule_type:<10} "
                f"{r.weight:>+7.2f}  {r.description[:30]}"
            )
    elif args.action == "add":
        rule = SafetyRule(
            rule_id="",
            name=args.name,
            description=args.description or "",
            rule_type=args.type,
            pattern=args.pattern or "",
            weight=args.weight,
            block_truncation=bool(args.block_truncation),
            active=True,
        )
        result = engine.add_rule(rule)
        print(f"✅ 已新增规则 {result.rule_id}")

        if args.replay:
            store = SampleStore()
            all_samples = store.list_all()
            results = engine.replay_evaluation(all_samples)
            print(f"🎬 评测回放已触发，覆盖 {len(results)} 条历史样本。")
            changed = [r for r in results if abs(r["score_delta"]) > 1e-6]
            if changed:
                print(f"   其中 {len(changed)} 条评分发生变化：")
                for r in changed[:10]:
                    print(
                        f"   - {r['sample_id']}: {r['before_score']:.3f} → "
                        f"{r['after_score']:.3f} (Δ {r['score_delta']:+.3f})"
                    )
    elif args.action == "replay":
        store = SampleStore()
        all_samples = store.list_all()
        results = engine.replay_evaluation(all_samples)
        print(f"🎬 已对 {len(results)} 条样本执行回放评测。")
        for r in results:
            if abs(r["score_delta"]) > 1e-6:
                print(
                    f"   - {r['sample_id']}: {r['before_score']:.3f} → "
                    f"{r['after_score']:.3f} (Δ {r['score_delta']:+.3f})"
                )
    elif args.action == "log":
        logs = engine.list_replay_logs(limit=args.limit)
        if not logs:
            print("（暂无回放日志，请先执行 rules replay 或 rules add --replay）")
            return 0
        for log in logs:
            print(f"🕒 {log['timestamp']}  规则版本包含 {len(log['rules_snapshot'])} 条规则")
            print(f"   覆盖样本 {len(log['results'])} 条")
    return 0


def cmd_export(args) -> int:
    store = SampleStore()
    exporter = ReportExporter()

    if args.status:
        samples = store.list_by_status(args.status)
    else:
        samples = store.list_all()

    if not samples:
        print("⚠️  没有符合条件的样本，未生成报告。")
        return 0

    fmt = args.format
    if fmt == "json":
        path = exporter.export_json(samples)
    elif fmt == "csv":
        path = exporter.export_csv(samples)
    else:
        path = exporter.export_business_markdown(samples)

    print(f"📄 报告已导出（{len(samples)} 条样本）: {path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="weakq",
        description="弱项样本补采队列 —— 面向 MLOps 的样本审核流水线",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
常用流程：
  1. weakq init              # 加载样例数据（首次使用）
  2. weakq process           # 批量跑灰度评分与安全拦截
  3. weakq list --status needs_review
  4. weakq review show SMPL-XXXX
  5. weakq review confirm SMPL-XXXX --note "人工看过没问题"
  6. weakq export --format business
        """,
    )
    sub = p.add_subparsers(dest="command", required=True)

    pi = sub.add_parser("init", help="初始化样例数据与默认安全规则")
    pi.set_defaults(func=cmd_init)

    pp = sub.add_parser("process", help="对样本执行灰度评分与规则匹配")
    pp.add_argument("--sample-id", help="仅处理指定样本 ID（缺省则处理所有 pending）")
    pp.set_defaults(func=cmd_process)

    pl = sub.add_parser("list", help="列出样本")
    pl.add_argument("--status", choices=list(SAMPLE_STATUS.values()), help="按状态筛选")
    pl.add_argument("--format", choices=["table", "json"], default="table")
    pl.set_defaults(func=cmd_list)

    pq = sub.add_parser("queue", help="队列视图")
    pq.add_argument("action", choices=["stats", "pending", "review"])
    pq.add_argument("--limit", type=int, default=50)
    pq.set_defaults(func=cmd_queue)

    pr = sub.add_parser("review", help="人工审核样本")
    pr.add_argument("action", choices=["show", "confirm", "reject"])
    pr.add_argument("sample_id", help="目标样本 ID")
    pr.add_argument("--note", help="人工审核备注（原样保留，不会被自动改写）")
    pr.set_defaults(func=cmd_review)

    pru = sub.add_parser("rules", help="安全规则管理与评测回放")
    pru_sub = pru.add_subparsers(dest="action", required=True)

    plist = pru_sub.add_parser("list", help="列出所有规则")
    plist.set_defaults(func=cmd_rules)

    padd = pru_sub.add_parser("add", help="新增一条安全规则")
    padd.add_argument("--name", required=True, help="规则名称")
    padd.add_argument("--type", required=True, choices=["length", "keyword", "source"], help="规则类型")
    padd.add_argument("--pattern", required=True, help="规则匹配模式（长度阈值/逗号分隔关键词/白名单来源）")
    padd.add_argument("--weight", type=float, required=True, help="权重，正数加分，负数减分")
    padd.add_argument("--description", help="规则描述")
    padd.add_argument("--block-truncation", action="store_true", help="命中后拦截长文本截断转人工")
    padd.add_argument("--replay", action="store_true", help="新增规则后立即回放全部历史样本")
    padd.set_defaults(func=cmd_rules)

    preplay = pru_sub.add_parser("replay", help="用当前规则回放所有历史样本")
    preplay.set_defaults(func=cmd_rules)

    plog = pru_sub.add_parser("log", help="查看回放日志")
    plog.add_argument("--limit", type=int, default=5)
    plog.set_defaults(func=cmd_rules)

    pe = sub.add_parser("export", help="导出报告")
    pe.add_argument("--format", choices=["json", "csv", "business"], default="business",
                    help="business=面向业务方的可读 Markdown 报告")
    pe.add_argument("--status", choices=list(SAMPLE_STATUS.values()), help="只导出某状态样本")
    pe.set_defaults(func=cmd_export)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
