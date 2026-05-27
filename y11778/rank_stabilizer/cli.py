import argparse
import json
import os
import sys
from typing import Union

from .engine import RankingEngine
from .exporter import Exporter
from .models import (
    AppealNote,
    AppealStatus,
    AthleteScore,
    Event,
    TieRule,
    TieStrategy,
    WarningSeverity,
    Withdrawal,
    WithdrawalScorePolicy,
)
from .seed import SeedGenerator


def _load_json_file(path: str) -> Union[dict, list]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_events(data: list[dict]) -> list[Event]:
    return [
        Event(
            event_id=d["event_id"],
            name=d["name"],
            weight=d.get("weight", 1.0),
            max_score=d.get("max_score"),
            is_team=d.get("is_team", False),
            source=d.get("source", "file"),
        )
        for d in data
    ]


def _parse_scores(data: list[dict]) -> list[AthleteScore]:
    return [
        AthleteScore(
            athlete_id=d["athlete_id"],
            athlete_name=d["athlete_name"],
            event_id=d["event_id"],
            score=d.get("score"),
            is_withdrawal=d.get("is_withdrawal", False),
            withdrawal_reason=d.get("withdrawal_reason"),
            source=d.get("source", "file"),
        )
        for d in data
    ]


def _resolve_strategy(val):
    if isinstance(val, TieStrategy):
        return val
    if isinstance(val, str):
        for s in TieStrategy:
            if val == s.value or val == s.name:
                return s
    raise ValueError(f"无法解析同分策略: {val}")


def _resolve_appeal_status(val):
    if isinstance(val, AppealStatus):
        return val
    if isinstance(val, str):
        for s in AppealStatus:
            if val == s.value or val == s.name:
                return s
    raise ValueError(f"无法解析申诉状态: {val}")


def _resolve_withdrawal_policy(val):
    if isinstance(val, WithdrawalScorePolicy):
        return val
    if isinstance(val, str):
        for s in WithdrawalScorePolicy:
            if val == s.value or val == s.name:
                return s
    raise ValueError(f"无法解析弃权策略: {val}")


def _parse_tie_rules(data: list[dict]) -> list[TieRule]:
    return [
        TieRule(
            rule_id=d["rule_id"],
            event_id=d.get("event_id"),
            strategy=_resolve_strategy(d["strategy"]),
            priority=d.get("priority", 0),
            description=d.get("description", ""),
            source=d.get("source", "file"),
            is_active=d.get("is_active", True),
        )
        for d in data
    ]


def _parse_withdrawals(data: list[dict]) -> list[Withdrawal]:
    return [
        Withdrawal(
            athlete_id=d["athlete_id"],
            event_id=d["event_id"],
            reason=d.get("reason", ""),
            score_policy=_resolve_withdrawal_policy(d.get("score_policy", "zero")),
            source=d.get("source", "file"),
        )
        for d in data
    ]


def _parse_appeals(data: list[dict]) -> list[AppealNote]:
    return [
        AppealNote(
            appeal_id=d["appeal_id"],
            athlete_id=d["athlete_id"],
            event_id=d.get("event_id"),
            description=d["description"],
            status=_resolve_appeal_status(d.get("status", "pending")),
            source=d.get("source", "file"),
        )
        for d in data
    ]


def _is_dataclass_instance(obj):
    return hasattr(obj, "__dataclass_fields__")


def _serialize_value(val):
    if hasattr(val, "value"):
        return val.value
    return val


def _serialize_items(items):
    result = []
    for item in items:
        if _is_dataclass_instance(item):
            result.append({k: _serialize_value(v) for k, v in vars(item).items()})
        elif isinstance(item, dict):
            result.append(item)
        else:
            result.append(item)
    return result


def _ensure_dicts(items):
    result = []
    for item in items:
        if _is_dataclass_instance(item):
            result.append(vars(item))
        else:
            result.append(item)
    return result


def _build_engine_from_dataset(dataset: dict) -> RankingEngine:
    engine = RankingEngine()
    engine.load_events(_parse_events(_ensure_dicts(dataset.get("events", []))))
    engine.load_scores(_parse_scores(_ensure_dicts(dataset.get("scores", []))))
    engine.load_tie_rules(_parse_tie_rules(_ensure_dicts(dataset.get("tie_rules", []))))
    engine.load_withdrawals(_parse_withdrawals(_ensure_dicts(dataset.get("withdrawals", []))))
    engine.load_appeals(_parse_appeals(_ensure_dicts(dataset.get("appeals", []))))
    return engine


def _load_dataset_from_dir(data_dir: str) -> dict:
    dataset: dict = {"events": [], "scores": [], "tie_rules": [], "withdrawals": [], "appeals": []}
    mappings = {
        "events.json": "events",
        "scores.json": "scores",
        "tie_rules.json": "tie_rules",
        "withdrawals.json": "withdrawals",
        "appeals.json": "appeals",
    }
    for filename, key in mappings.items():
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            dataset[key] = _load_json_file(path)
    return dataset


def cmd_rank(args):
    if args.seed:
        sg = SeedGenerator()
        if args.seed == "normal":
            dataset = sg.generate_normal()
        elif args.seed == "dirty":
            dataset = sg.generate_dirty()
        elif args.seed == "tie":
            dataset = sg.generate_tie_demo()
        else:
            print(f"未知数据集: {args.seed}，可选: normal / dirty / tie")
            sys.exit(1)
    elif args.data_dir:
        dataset = _load_dataset_from_dir(args.data_dir)
    elif args.data_file:
        dataset = _load_json_file(args.data_file)
    else:
        print("请指定数据来源: --seed <normal|dirty|tie> 或 --data-dir <路径> 或 --data-file <文件>")
        sys.exit(1)

    engine = _build_engine_from_dataset(dataset)
    report = engine.compute_ranking(title=args.title)

    exporter = Exporter(output_dir=args.output)
    exporter.print_report(report)

    if args.export:
        results = exporter.export_all(report, prefix=args.prefix)
        print("导出文件：")
        for fmt, path in results.items():
            print(f"  [{fmt}] {path}")

    if args.warnings_only:
        print(f"\n共 {len(report.warnings)} 条警告：")
        for w in report.warnings:
            icon = {"info": "ℹ", "warning": "⚠", "error": "✖"}.get(w.severity.value, "·")
            print(f"  {icon} [{w.category}] {w.message}")

    if args.audit_only:
        print(f"\n审计轨迹共 {len(report.audit_trail)} 条：")
        for entry in report.audit_trail[-20:]:
            print(f"  [{entry['timestamp'][:19]}] {entry['action']} → {entry['target']}")

    return report


def cmd_seed(args):
    sg = SeedGenerator()
    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    datasets = {
        "normal": sg.generate_normal,
        "dirty": sg.generate_dirty,
        "tie": sg.generate_tie_demo,
    }

    to_generate = [args.type] if args.type != "all" else list(datasets.keys())

    for dtype in to_generate:
        if dtype not in datasets:
            print(f"未知数据类型: {dtype}，可选: normal / dirty / tie / all")
            sys.exit(1)

        data = datasets[dtype]()
        sub_dir = os.path.join(output_dir, dtype)
        os.makedirs(sub_dir, exist_ok=True)

        for key in ("events", "scores", "tie_rules", "withdrawals", "appeals"):
            items = data[key]
            if items:
                path = os.path.join(sub_dir, f"{key}.json")
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(
                        _serialize_items(items),
                        f, ensure_ascii=False, indent=2,
                    )
                print(f"  生成: {path}")

    print(f"数据生成完成，目录: {output_dir}")


def cmd_appeal(args):
    if not args.data_dir:
        print("请用 --data-dir 指定数据目录")
        sys.exit(1)

    dataset = _load_dataset_from_dir(args.data_dir)
    engine = _build_engine_from_dataset(dataset)

    try:
        engine.apply_appeal(
            appeal_id=args.appeal_id,
            new_status=AppealStatus(args.status),
            resolution=args.resolution or "",
        )
        print(f"申诉 {args.appeal_id} 状态已更新为 {args.status}")

        if args.recompute:
            report = engine.compute_ranking(title="申诉后排名")
            exporter = Exporter(output_dir=args.output)
            exporter.print_report(report)
            if args.export:
                results = exporter.export_all(report, prefix="appeal_")
                print("导出文件：")
                for fmt, path in results.items():
                    print(f"  [{fmt}] {path}")
    except ValueError as e:
        print(f"错误: {e}")
        sys.exit(1)


def cmd_check(args):
    if args.seed:
        sg = SeedGenerator()
        if args.seed == "normal":
            dataset = sg.generate_normal()
        elif args.seed == "dirty":
            dataset = sg.generate_dirty()
        elif args.seed == "tie":
            dataset = sg.generate_tie_demo()
        else:
            print(f"未知数据集: {args.seed}")
            sys.exit(1)
    elif args.data_dir:
        dataset = _load_dataset_from_dir(args.data_dir)
    else:
        print("请指定数据来源: --seed 或 --data-dir")
        sys.exit(1)

    engine = _build_engine_from_dataset(dataset)
    from .warnings import WarningChecker
    checker = WarningChecker()
    warnings = checker.check_all(
        engine.scores, engine.events, engine.tie_rules,
        engine.withdrawals, engine.appeals,
    )

    if not warnings:
        print("✓ 数据检查通过，无警告")
    else:
        error_count = sum(1 for w in warnings if w.severity == WarningSeverity.ERROR)
        warn_count = sum(1 for w in warnings if w.severity == WarningSeverity.WARNING)
        info_count = sum(1 for w in warnings if w.severity == WarningSeverity.INFO)
        print(f"共 {len(warnings)} 条提示（✖ 错误: {error_count} / ⚠ 警告: {warn_count} / ℹ 信息: {info_count}）\n")
        for w in warnings:
            icon = {"info": "ℹ", "warning": "⚠", "error": "✖"}.get(w.severity.value, "·")
            print(f"  {icon} [{w.category}] {w.message}")
            if w.detail:
                print(f"    → {w.detail}")


def main():
    parser = argparse.ArgumentParser(
        prog="rank-stabilizer",
        description="赛事排名稳定器 — 自动排名、同分裁决、异常标记、修正追踪",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # ── rank ──
    rank_parser = subparsers.add_parser("rank", help="计算排名并输出榜单")
    rank_parser.add_argument("--seed", choices=["normal", "dirty", "tie"], help="使用内置数据集")
    rank_parser.add_argument("--data-dir", help="从目录加载数据文件")
    rank_parser.add_argument("--data-file", help="从单个 JSON 文件加载数据")
    rank_parser.add_argument("--title", default="赛事排名", help="报告标题")
    rank_parser.add_argument("--output", default="./output", help="导出目录")
    rank_parser.add_argument("--export", action="store_true", help="导出 JSON/CSV 文件")
    rank_parser.add_argument("--prefix", default="", help="导出文件名前缀")
    rank_parser.add_argument("--warnings-only", action="store_true", help="仅输出警告")
    rank_parser.add_argument("--audit-only", action="store_true", help="仅输出审计轨迹")
    rank_parser.set_defaults(func=cmd_rank)

    # ── seed ──
    seed_parser = subparsers.add_parser("seed", help="生成测试数据")
    seed_parser.add_argument("--type", choices=["normal", "dirty", "tie", "all"], default="all", help="数据类型")
    seed_parser.add_argument("--output-dir", default="./seed_data", help="输出目录")
    seed_parser.set_defaults(func=cmd_seed)

    # ── appeal ──
    appeal_parser = subparsers.add_parser("appeal", help="处理申诉")
    appeal_parser.add_argument("--appeal-id", required=True, help="申诉编号")
    appeal_parser.add_argument("--status", required=True, choices=["pending", "accepted", "rejected", "withdrawn"], help="新状态")
    appeal_parser.add_argument("--resolution", default="", help="处理说明")
    appeal_parser.add_argument("--data-dir", required=True, help="数据目录")
    appeal_parser.add_argument("--recompute", action="store_true", help="申诉处理后重新排名")
    appeal_parser.add_argument("--output", default="./output", help="导出目录")
    appeal_parser.add_argument("--export", action="store_true", help="导出结果")
    appeal_parser.set_defaults(func=cmd_appeal)

    # ── check ──
    check_parser = subparsers.add_parser("check", help="仅检查数据异常")
    check_parser.add_argument("--seed", choices=["normal", "dirty", "tie"], help="使用内置数据集")
    check_parser.add_argument("--data-dir", help="从目录加载")
    check_parser.set_defaults(func=cmd_check)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
