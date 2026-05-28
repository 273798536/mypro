#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from surrender_value.models import Policy, PaymentRecord, SurrenderApplication
from surrender_value.engine import SurrenderEngine
from surrender_value.statement import StatementGenerator
from surrender_value.diff import ResultDiffer


SAMPLES_DIR = Path(__file__).parent / "samples"
RESULTS_DIR = Path(__file__).parent / "results"


def load_json(filepath: str):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_policy(filepath: str) -> Policy:
    data = load_json(filepath)
    return Policy.from_dict(data)


def load_payments(filepath: str) -> list[PaymentRecord]:
    data = load_json(filepath)
    return [PaymentRecord.from_dict(item) for item in data]


def load_surrender_app(filepath: str) -> SurrenderApplication:
    data = load_json(filepath)
    return SurrenderApplication.from_dict(data)


def cmd_calculate(args):
    policy = load_policy(args.policy)
    payments = load_payments(args.payments)

    surrender_app = None
    if args.surrender:
        surrender_app = load_surrender_app(args.surrender)

    ref_date = date.today()
    if args.date:
        ref_date = date.fromisoformat(args.date)

    engine = SurrenderEngine(policy, payments, surrender_app, ref_date)
    result = engine.calculate()

    generator = StatementGenerator()
    statement = generator.generate(result)
    print(statement)

    RESULTS_DIR.mkdir(exist_ok=True)
    result_path = RESULTS_DIR / f"{policy.policy_number}_{ref_date.isoformat()}.json"
    result.save(str(result_path))
    print(f"\n结果已保存: {result_path}")


def cmd_diff(args):
    from surrender_value.models import SurrenderResult as SR

    old = SR.load(args.old)
    new = SR.load(args.new)

    differ = ResultDiffer()
    diff_items = differ.diff(old, new)

    if diff_items:
        print(differ.format_diff(diff_items))
    else:
        print("无变更：两次计算结果完全一致")


def cmd_sample(args):
    scenario = args.scenario

    if scenario == "normal":
        policy_path = SAMPLES_DIR / "policy_normal.json"
        payments_path = SAMPLES_DIR / "payments_normal.json"
    elif scenario == "grace_error":
        policy_path = SAMPLES_DIR / "policy_grace_error.json"
        payments_path = SAMPLES_DIR / "payments_grace_error.json"
    elif scenario == "no_loan":
        policy_path = SAMPLES_DIR / "policy_no_loan.json"
        payments_path = SAMPLES_DIR / "payments_normal.json"
    else:
        print(f"未知场景: {scenario}")
        print("可用场景: normal, grace_error, no_loan")
        return

    policy = load_policy(str(policy_path))
    payments = load_payments(str(payments_path))

    surrender_app = None
    surrender_path = SAMPLES_DIR / "surrender_app.json"
    if surrender_path.exists():
        surrender_app = load_surrender_app(str(surrender_path))

    ref_date = date.fromisoformat("2025-05-28")

    engine = SurrenderEngine(policy, payments, surrender_app, ref_date)
    result = engine.calculate()

    generator = StatementGenerator()
    statement = generator.generate(result)
    print(statement)

    RESULTS_DIR.mkdir(exist_ok=True)
    result_path = RESULTS_DIR / f"{scenario}_{result.policy_number}_{ref_date.isoformat()}.json"
    result.save(str(result_path))
    print(f"\n结果已保存: {result_path}")


def cmd_rediff(args):
    results_dir = Path(args.results_dir)
    json_files = sorted(results_dir.glob("*.json"))

    if len(json_files) < 2:
        print(f"需要至少2个结果文件，当前仅找到 {len(json_files)} 个")
        return

    old_path = json_files[-2]
    new_path = json_files[-1]

    print(f"对比: {old_path.name}  vs  {new_path.name}\n")

    from surrender_value.models import SurrenderResult as SR

    old = SR.load(str(old_path))
    new = SR.load(str(new_path))

    differ = ResultDiffer()
    diff_items = differ.diff(old, new)

    if diff_items:
        print(differ.format_diff(diff_items))
    else:
        print("无变更：两次计算结果完全一致")


def main():
    parser = argparse.ArgumentParser(
        prog="保险退保现金价值",
        description="保险退保现金价值试算命令行工具",
    )
    sub = parser.add_subparsers(dest="command")

    calc_p = sub.add_parser("calculate", help="计算退保现金价值")
    calc_p.add_argument("--policy", required=True, help="保单数据JSON路径")
    calc_p.add_argument("--payments", required=True, help="缴费记录JSON路径")
    calc_p.add_argument("--surrender", default=None, help="退保申请JSON路径")
    calc_p.add_argument("--date", default=None, help="计算基准日期 YYYY-MM-DD")

    diff_p = sub.add_parser("diff", help="对比两次计算结果")
    diff_p.add_argument("--old", required=True, help="旧结果JSON路径")
    diff_p.add_argument("--new", required=True, help="新结果JSON路径")

    sample_p = sub.add_parser("sample", help="运行预设场景")
    sample_p.add_argument(
        "scenario",
        nargs="?",
        default="normal",
        help="场景名: normal(正常), grace_error(宽限期误判), no_loan(贷款未扣)",
    )

    rediff_p = sub.add_parser("rediff", help="对比最近两次结果")
    rediff_p.add_argument(
        "--results-dir",
        default=str(RESULTS_DIR),
        help="结果目录路径",
    )

    args = parser.parse_args()

    if args.command == "calculate":
        cmd_calculate(args)
    elif args.command == "diff":
        cmd_diff(args)
    elif args.command == "sample":
        cmd_sample(args)
    elif args.command == "rediff":
        cmd_rediff(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
