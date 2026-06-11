#!/usr/bin/env python3
import argparse
import json
import sys
import os
from pathlib import Path
from typing import Optional

from .models import ReconciliationStatus
from .engine import ReconciliationEngine
from .storage import Storage, CsvExporter


def cmd_run(args) -> int:
    engine = ReconciliationEngine()
    errors = []

    csv_files = args.input
    source_tag = args.source_tag or ""

    for csv_file in csv_files:
        if not os.path.exists(csv_file):
            errors.append(f"文件不存在: {csv_file}")
            continue
        count, file_errors = engine.load_csv(csv_file, source_tag)
        errors.extend(file_errors)

    if args.load_state:
        existing = Storage.load_records(args.load_state)
        existing_ids = {r.record_id for r in existing}
        for r in engine.records:
            if r.record_id not in existing_ids:
                existing.append(r)
        engine.records = existing

    summary = engine.run_reconciliation()

    if args.output_dir:
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        Storage.save_records(engine.records, str(output_dir / "reconciliation_state.json"))

        status_counts = CsvExporter.export_by_status(engine.records, str(output_dir))
        CsvExporter.export_details(engine.records, str(output_dir / "全部明细.csv"))
        CsvExporter.export_history(engine.records, str(output_dir / "变更历史.csv"))

        summary["status_files"] = {k: str(output_dir / f"{k}_明细.csv") for k in status_counts}
        summary["history_file"] = str(output_dir / "变更历史.csv")
        summary["all_details_file"] = str(output_dir / "全部明细.csv")
        summary["state_file"] = str(output_dir / "reconciliation_state.json")

    summary["errors"] = errors

    if args.summary_json:
        with open(args.summary_json, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
    else:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    return 0 if not errors else 1


def cmd_manual(args) -> int:
    if not args.state_file or not os.path.exists(args.state_file):
        print(json.dumps({"success": False, "error": f"状态文件不存在: {args.state_file}"}, ensure_ascii=False))
        return 1

    records = Storage.load_records(args.state_file)
    engine = ReconciliationEngine()
    engine.records = records

    try:
        new_status = ReconciliationStatus(args.status)
    except ValueError:
        valid = [s.value for s in ReconciliationStatus]
        print(json.dumps({"success": False, "error": f"无效状态，有效值: {valid}"}, ensure_ascii=False))
        return 1

    extra = {}
    if args.tax_amount is not None:
        extra["tax_amount"] = float(args.tax_amount)
    if args.exchange_rate is not None:
        extra["exchange_rate"] = float(args.exchange_rate)
    if args.late_document is not None:
        extra["late_document"] = str(args.late_document).lower() in ("true", "1", "yes")

    success = engine.manual_confirm(
        record_id=args.record_id,
        operator=args.operator or "unknown",
        new_status=new_status,
        remark=args.remark or "",
        **extra,
    )

    if success:
        Storage.save_records(engine.records, args.state_file)
        if args.output_dir:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
            CsvExporter.export_by_status(engine.records, str(output_dir))
            CsvExporter.export_details(engine.records, str(output_dir / "全部明细.csv"))
            CsvExporter.export_history(engine.records, str(output_dir / "变更历史.csv"))

    print(json.dumps({
        "success": success,
        "record_id": args.record_id,
        "new_status": new_status.value if success else None,
    }, ensure_ascii=False))

    return 0 if success else 1


def cmd_export(args) -> int:
    if not args.state_file or not os.path.exists(args.state_file):
        print(json.dumps({"success": False, "error": f"状态文件不存在: {args.state_file}"}, ensure_ascii=False))
        return 1

    records = Storage.load_records(args.state_file)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    status_filter = None
    if args.status:
        try:
            status_filter = ReconciliationStatus(args.status)
        except ValueError:
            valid = [s.value for s in ReconciliationStatus]
            print(json.dumps({"success": False, "error": f"无效状态，有效值: {valid}"}, ensure_ascii=False))
            return 1

    result = {}
    if status_filter:
        count = CsvExporter.export_details(records, str(output_dir / f"{status_filter.value}_明细.csv"), status_filter)
        result["exported"] = count
        result["file"] = str(output_dir / f"{status_filter.value}_明细.csv")
    else:
        status_counts = CsvExporter.export_by_status(records, str(output_dir))
        CsvExporter.export_details(records, str(output_dir / "全部明细.csv"))
        CsvExporter.export_history(records, str(output_dir / "变更历史.csv"))
        result["status_counts"] = status_counts
        result["all_details_file"] = str(output_dir / "全部明细.csv")
        result["history_file"] = str(output_dir / "变更历史.csv")

    print(json.dumps({"success": True, **result}, ensure_ascii=False))
    return 0


def cmd_history(args) -> int:
    if not args.state_file or not os.path.exists(args.state_file):
        print(json.dumps({"success": False, "error": f"状态文件不存在: {args.state_file}"}, ensure_ascii=False))
        return 1

    records = Storage.load_records(args.state_file)
    engine = ReconciliationEngine()
    engine.records = records

    if args.record_id:
        history = engine.get_record_history(args.record_id)
        if history is None:
            print(json.dumps({"success": False, "error": f"未找到记录: {args.record_id}"}, ensure_ascii=False))
            return 1
        result = {
            "success": True,
            "record_id": args.record_id,
            "history": [
                {
                    "timestamp": h.timestamp,
                    "change_type": h.change_type.value,
                    "old_status": h.old_status.value if h.old_status else None,
                    "new_status": h.new_status.value,
                    "operator": h.operator,
                    "remark": h.remark,
                    "old_values": h.old_values,
                    "new_values": h.new_values,
                }
                for h in history
            ]
        }
    else:
        all_history = []
        for r in records:
            for h in r.history:
                all_history.append({
                    "record_id": r.record_id,
                    "timestamp": h.timestamp,
                    "change_type": h.change_type.value,
                    "old_status": h.old_status.value if h.old_status else None,
                    "new_status": h.new_status.value,
                    "operator": h.operator,
                    "remark": h.remark,
                })
        result = {"success": True, "history": all_history}

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def cmd_summary(args) -> int:
    if not args.state_file or not os.path.exists(args.state_file):
        print(json.dumps({"success": False, "error": f"状态文件不存在: {args.state_file}"}, ensure_ascii=False))
        return 1

    records = Storage.load_records(args.state_file)
    engine = ReconciliationEngine()
    engine.records = records
    summary = engine.run_reconciliation()
    summary["success"] = True

    if args.verbose:
        detail = {}
        for status in ReconciliationStatus:
            status_records = engine.get_records_by_status(status)
            detail[status.value] = [
                {
                    "record_id": r.record_id,
                    "bond_code": r.bond_code,
                    "bond_name": r.bond_name,
                    "source_row": r.source_row,
                    "failed_reason": r.failed_reason,
                    "impact_scope": r.impact_scope,
                }
                for r in status_records
            ]
        summary["details"] = detail

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="green_bond_recon",
        description="绿色债券募集款口径对账系统",
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    run_parser = subparsers.add_parser("run", help="运行对账")
    run_parser.add_argument("-i", "--input", nargs="+", required=True, help="输入CSV文件路径")
    run_parser.add_argument("-o", "--output-dir", help="输出目录")
    run_parser.add_argument("-s", "--source-tag", help="数据来源标记")
    run_parser.add_argument("--load-state", help="加载已有状态文件（增量处理）")
    run_parser.add_argument("--summary-json", help="汇总信息输出JSON文件路径")

    manual_parser = subparsers.add_parser("manual", help="人工确认/改判")
    manual_parser.add_argument("--state-file", required=True, help="状态文件路径")
    manual_parser.add_argument("--record-id", required=True, help="记录ID")
    manual_parser.add_argument("--status", required=True, help="目标状态：已确认/待补件/退回/未匹配")
    manual_parser.add_argument("--operator", help="操作人")
    manual_parser.add_argument("--remark", help="备注说明")
    manual_parser.add_argument("--tax-amount", type=float, help="更新税费金额")
    manual_parser.add_argument("--exchange-rate", type=float, help="更新汇率")
    manual_parser.add_argument("--late-document", help="是否凭证晚到 (true/false)")
    manual_parser.add_argument("-o", "--output-dir", help="重新导出目录")

    export_parser = subparsers.add_parser("export", help="导出CSV")
    export_parser.add_argument("--state-file", required=True, help="状态文件路径")
    export_parser.add_argument("-o", "--output-dir", required=True, help="输出目录")
    export_parser.add_argument("--status", help="按状态导出：已确认/待补件/退回/未匹配")

    history_parser = subparsers.add_parser("history", help="查看变更历史")
    history_parser.add_argument("--state-file", required=True, help="状态文件路径")
    history_parser.add_argument("--record-id", help="指定记录ID（不指定则查看全部）")

    summary_parser = subparsers.add_parser("summary", help="查看汇总信息")
    summary_parser.add_argument("--state-file", required=True, help="状态文件路径")
    summary_parser.add_argument("-v", "--verbose", action="store_true", help="显示详细记录")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    try:
        if args.command == "run":
            return cmd_run(args)
        elif args.command == "manual":
            return cmd_manual(args)
        elif args.command == "export":
            return cmd_export(args)
        elif args.command == "history":
            return cmd_history(args)
        elif args.command == "summary":
            return cmd_summary(args)
        else:
            parser.print_help()
            return 1
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
