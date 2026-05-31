#!/usr/bin/env python3
from datetime import date
from pathlib import Path
import argparse
import sys

from cash_shortage.config import SETTINGS
from cash_shortage.data import DataLoader, FilterEngine, FilterContext
from cash_shortage.checks import Auditor
from cash_shortage.report import ReportExporter, ReportContext


def build_filter_description(filters: dict) -> str:
    parts = []
    for key, value in filters.items():
        if value is None or value == []:
            continue
        if key == "date_range":
            parts.append(f"交易日期 {value[0]} ~ {value[1]}")
        elif isinstance(value, list) and len(value) <= 3:
            parts.append(f"{key}={','.join(value)}")
        elif isinstance(value, list):
            parts.append(f"{key}={len(value)}项")
        else:
            parts.append(f"{key}={value}")
    return "；".join(parts)


def main():
    parser = argparse.ArgumentParser(description="门店现金短款调查稽核")
    parser.add_argument("--input", "-i", required=True, help="收银流水文件路径(.csv/.xlsx)")
    parser.add_argument("--output-dir", "-o", default="output", help="报告输出目录")
    parser.add_argument("--date-start", help="起始日期 YYYY-MM-DD")
    parser.add_argument("--date-end", help="结束日期 YYYY-MM-DD")
    parser.add_argument("--store", action="append", default=[], help="门店编号(可多次指定)")
    parser.add_argument("--shift", action="append", default=[], help="班次(早班/中班/晚班)")
    parser.add_argument("--cashier", action="append", default=[], help="收银员")
    parser.add_argument("--trans-type", action="append", default=[], help="交易类型")
    parser.add_argument("--payment", action="append", default=[], help="支付方式")
    parser.add_argument("--prepared-by", default="连锁门店稽核", help="报告编制人")
    parser.add_argument("--no-keep-raw", action="store_true", help="不保留原始流水(默认保留)")

    args = parser.parse_args()

    loader = DataLoader(keep_raw=not args.no_keep_raw)
    dataset = loader.load(args.input)

    filter_ctx = FilterContext()
    if args.date_start and args.date_end:
        start = date.fromisoformat(args.date_start)
        end = date.fromisoformat(args.date_end)
        filter_ctx.set("date_range", (start, end))
    if args.store:
        filter_ctx.set("store_codes", args.store)
    if args.shift:
        filter_ctx.set("shifts", args.shift)
    if args.cashier:
        filter_ctx.set("cashiers", args.cashier)
    if args.trans_type:
        filter_ctx.set("trans_types", args.trans_type)
    if args.payment:
        filter_ctx.set("payment_methods", args.payment)

    filter_engine = FilterEngine()
    filtered_df = filter_engine.apply(dataset.canonical_df, filter_ctx)

    auditor = Auditor()
    audit_result = auditor.run(filtered_df)

    report_ctx = ReportContext(
        report_date=date.today(),
        filter_description=build_filter_description(filter_ctx.filters),
        prepared_by=args.prepared_by,
        output_dir=args.output_dir,
    )
    exporter = ReportExporter(report_ctx)
    out_path = exporter.export(
        audit_result=audit_result,
        filtered_df=filtered_df,
        raw_dataset=dataset,
    )

    print(f"✅ 稽核完成")
    print(f"📊 筛选后记录数: {len(filtered_df)}")
    print(f"⚠️  发现风险: {audit_result.total_issues()} 笔, 涉及 {round(audit_result.total_amount(), 2)} 元")
    for f in audit_result.findings:
        if f.finding_count > 0:
            print(f"   - {f.check_label}: {f.finding_count} 笔 / {round(f.total_affected_amount, 2)} 元")
    print(f"📄 报告已生成: {out_path}")


if __name__ == "__main__":
    main()
