#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

from royalty_dispute import (
    RoyaltySplitter,
    export_issues,
    export_split_results,
    load_all_data,
)


def print_banner():
    print("=" * 60)
    print("  唱片版税争议处理工具")
    print("=" * 60)
    print()


def print_summary(records, all_results, all_issues):
    print("【处理概览】")
    print(f"  处理记录数: {len(records)}")
    print(f"  拆分项数: {len(all_results)}")
    print(f"  问题数: {len(all_issues)}")
    if all_issues:
        errors = [i for i in all_issues if i.severity == "ERROR"]
        warnings = [i for i in all_issues if i.severity == "WARNING"]
        print(f"    - 错误: {len(errors)}")
        print(f"    - 警告: {len(warnings)}")
    print()


def print_issues(all_issues):
    if not all_issues:
        return

    print("【问题清单】")
    for idx, issue in enumerate(all_issues, 1):
        severity_tag = "✗ 错误" if issue.severity == "ERROR" else "⚠ 警告"
        print(f"{idx}. [{severity_tag}] {issue.issue_type}")
        print(f"   曲目: {issue.track_name}")
        print(f"   说明: {issue.message}")
        print(f"   来源:")
        for ref in issue.source_refs:
            print(f"     - {ref}")
        print()


def print_split_results(all_results):
    print("【拆分结果】")
    for idx, r in enumerate(all_results, 1):
        print(f"{idx}. {r.rights_holder_name} ({r.royalty_type})")
        print(f"   原始收入: {r.original_amount:.2f}")
        print(f"   扣除费用: {r.deduction_amount:.2f}")
        print(f"   净收入: {r.net_amount:.2f}")
        print(f"   合同比例: {r.contract_percentage}%")
        print(f"   最终金额: {r.final_amount:.2f}")
        print(f"   合同快照:")
        print(f"     合同ID: {r.contract_snapshot.get('contract_id')}")
        print(f"     生效日期: {r.contract_snapshot.get('effective_date')}")
        print(f"     到期日期: {r.contract_snapshot.get('expiry_date')}")
        print(f"     来源文件: {r.contract_snapshot.get('source_file')}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="唱片版税争议处理工具 - 导入、检查、修正提示和导出"
    )
    parser.add_argument(
        "--rights-holders",
        default="sample_data/rights_holders.csv",
        help="权利人数据文件路径",
    )
    parser.add_argument(
        "--contracts",
        default="sample_data/contracts.csv",
        help="合同数据文件路径",
    )
    parser.add_argument(
        "--deductions",
        default="sample_data/deductions.csv",
        help="渠道扣费数据文件路径",
    )
    parser.add_argument(
        "--records",
        default="sample_data/royalty_records.csv",
        help="版税报告数据文件路径",
    )
    parser.add_argument(
        "--export-splits",
        default="output/split_results.csv",
        help="拆分结果导出路径",
    )
    parser.add_argument(
        "--export-issues",
        default="output/issues.csv",
        help="问题清单导出路径",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="静默模式，只输出文件路径",
    )

    args = parser.parse_args()

    if not args.quiet:
        print_banner()

    try:
        rights_holders, records = load_all_data(
            args.rights_holders,
            args.contracts,
            args.deductions,
            args.records,
        )
    except Exception as e:
        print(f"✗ 数据导入失败: {e}", file=sys.stderr)
        sys.exit(1)

    splitter = RoyaltySplitter(rights_holders)

    all_results = []
    all_issues = []

    for record in records:
        results, _ = splitter.split_record(record)
        issues = splitter.validate_record(record)
        all_results.extend(results)
        all_issues.extend(issues)

    if not args.quiet:
        print_summary(records, all_results, all_issues)
        print_issues(all_issues)
        print_split_results(all_results)

    output_dir = Path(args.export_splits).parent
    output_dir.mkdir(exist_ok=True)

    export_split_results(all_results, args.export_splits)
    export_issues(all_issues, args.export_issues)

    if args.quiet:
        print(args.export_splits)
        print(args.export_issues)
    else:
        print("【导出完成】")
        print(f"  拆分结果: {args.export_splits}")
        print(f"  问题清单: {args.export_issues}")
        print()


if __name__ == "__main__":
    main()
