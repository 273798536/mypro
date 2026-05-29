#!/usr/bin/env python3
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from settlement.importer import DataImporter
from settlement.parser import ContractParser
from settlement.engine import SettlementEngine
from settlement.amendment import AmendmentTracker
from settlement.exporter import SettlementExporter


def load_samples(sample_dir: str):
    importer = DataImporter()
    data = importer.load_samples(sample_dir)
    return importer, data


def cmd_daily(args):
    sample_dir = args.sample_dir
    importer, data = load_samples(sample_dir)

    print("=== 导入结果 ===")
    print(f"合同: {len(data['contracts'])} 份")
    print(f"场次: {len(data['shows'])} 场")
    print(f"赞助: {len(data['sponsorships'])} 笔")
    if data["warnings"]:
        print(f"警告: {len(data['warnings'])} 条")
        for w in data["warnings"][:5]:
            print(f"  - {w}")

    parser = ContractParser(
        data["contracts"], data["shows"], data["sponsorships"]
    )

    print("\n=== 合同解析（日常操作） ===")
    for c in data["contracts"]:
        summary = parser.summary(c.contract_id)
        print(f"\n合同 {c.contract_id}: {c.artist_name} - {c.tour_name}")
        print(f"  保底: {summary['guarantee']['guarantee_amount']:.2f}")
        print(f"  分成比例: 艺人 {summary['split_terms']['artist_split_ratio']:.2%}")
        print(f"  场次: {len(summary['shows'])} 场")

    print("\n=== 分成试算（日常操作） ===")
    engine = SettlementEngine(
        data["contracts"], data["shows"], data["sponsorships"]
    )
    for c in data["contracts"]:
        settlements = engine.settle_contract(c.contract_id)
        total_artist = sum(s.final_artist_payment for s in settlements)
        total_promoter = sum(s.promoter_share for s in settlements)
        print(f"\n合同 {c.contract_id}:")
        print(f"  场次结算: {len(settlements)} 场")
        print(f"  艺人总付款: {total_artist:.2f}")
        print(f"  主办方净得: {total_promoter:.2f}")
        for s in settlements:
            status = "[保底]" if s.is_guarantee_triggered else "[分成]"
            print(f"    {s.city} {s.show_date}: 艺人 {s.final_artist_payment:.2f} {status}")


def cmd_review(args):
    sample_dir = args.sample_dir
    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    importer, data = load_samples(sample_dir)

    engine = SettlementEngine(
        data["contracts"], data["shows"], data["sponsorships"]
    )
    settlements = engine.settle_all()

    tracker = AmendmentTracker()
    for i, s in enumerate(settlements):
        if s.is_guarantee_triggered and s.final_artist_payment > 0:
            pass

    exporter = SettlementExporter(settlements, tracker.get_logs())

    exporter.export_json(os.path.join(output_dir, "settlement_report.json"))
    exporter.export_csv(os.path.join(output_dir, "settlement_summary.csv"))
    exporter.export_exception_report(os.path.join(output_dir, "exception_report.json"))
    exporter.export_amendment_log(os.path.join(output_dir, "amendment_log.json"))

    summary = exporter.summary()
    print("=== 月底复盘导出 ===")
    print(f"输出目录: {output_dir}")
    print(f"结算场次: {summary['total_shows']}")
    print(f"保底触发: {summary['guarantee_triggered']} 场")
    print(f"异常场次: {summary['exception_count']} 场")
    print(f"修正记录: {summary['amended_settlements']} 场")
    print(f"艺人总付款: {summary['total_artist_payment']:.2f}")

    print("\n=== 异常解释（月底复盘） ===")
    exceptions = engine.explain_exceptions(settlements)
    for e in exceptions:
        print(f"\n场次 {e['city']} {e['show_date']}:")
        if e["is_guarantee_triggered"]:
            print(f"  [保底触发] 艺人付款: {e['final_artist_payment']:.2f}")
        for note in e["exceptions"]:
            print(f"  - {note}")

    print("\n=== 退票跨场明细 ===")
    for c in data["contracts"]:
        if c.refund_cross_show:
            transfers = engine.get_refund_transfers(c.contract_id)
            for t in transfers:
                print(f"  {t.from_show_id} -> {t.to_show_id}: {t.amount:.2f}  | {t.reason}")
    if not any(c.refund_cross_show for c in data["contracts"]):
        print("  (无跨场退票配置)")


def main():
    parser = argparse.ArgumentParser(description="演出分成保底结算系统")
    subparsers = parser.add_subparsers(dest="command", required=True)

    daily = subparsers.add_parser("daily", help="日常操作模式 - 合同解析+分成试算")
    daily.add_argument(
        "--sample-dir",
        default=os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "settlement", "samples"
        ),
    )
    daily.set_defaults(func=cmd_daily)

    review = subparsers.add_parser("review", help="月底复盘模式 - 异常解释+结算导出")
    review.add_argument(
        "--sample-dir",
        default=os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "settlement", "samples"
        ),
    )
    review.add_argument(
        "--output-dir",
        default=os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "output"
        ),
    )
    review.set_defaults(func=cmd_review)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
