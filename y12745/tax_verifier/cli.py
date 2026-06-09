#!/usr/bin/env python3
import argparse
import csv
import os
import sys
from typing import List

from .models import TaxRecord, ReviewAction, ResultStatus
from .csv_loader import CsvLoader
from .batch_review import BatchReviewer
from .interpreter import ResultInterpreter
from .audit_trail import AuditTrail


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="tax-ladder-check",
        description="税率阶梯函数核验工具 —— 批量复核 + 约束校验 + 结果追溯 + 人工修正留痕",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 1. 运行样例数据（评分记录+题目清单+空集合同批处理）
  tax-ladder-check verify --samples

  # 2. 核验单份CSV文件
  tax-ladder-check verify --input samples/scoring_records.csv

  # 3. 多份CSV合并复核
  tax-ladder-check verify --input a.csv --input b.csv --output report.csv

  # 4. 人工修正：把R005从「待工程师复核」改为「确认通过」，写清前后
  tax-ladder-check review --input report.csv --record R005 --action confirm_pass --operator zhangsan --comment "已核对原始扫描件"

  # 5. 查某条记录的变更历史
  tax-ladder-check history --audit audit_log.json --record R005

  # 6. 输出学生视图（一眼分清可用/暂缓/需重采/待复核）
  tax-ladder-check verify --samples --view student
""",
    )
    sub = p.add_subparsers(dest="command", required=True)

    v = sub.add_parser("verify", help="批量核验税率阶梯函数", formatter_class=argparse.RawDescriptionHelpFormatter)
    v.add_argument("--input", "-i", action="append", default=[], help="待核验CSV文件路径，可重复指定多次")
    v.add_argument("--samples", action="store_true", help="使用内置样例（评分记录+题目清单+空集合）一同复核")
    v.add_argument("--output", "-o", default=None, help="核验结果导出CSV路径(可选)")
    v.add_argument("--audit", default="audit_log.json", help="人工修正留痕文件路径(默认 audit_log.json)")
    v.add_argument("--view", choices=["summary", "detail", "student"], default="student", help="输出视图模式")
    v.add_argument("--tolerance", type=float, default=2.0, help="阶梯边界判定容差百分比(默认 2.0)")

    r = sub.add_parser("review", help="人工复核并留痕", formatter_class=argparse.RawDescriptionHelpFormatter)
    r.add_argument("--input", "-i", required=True, help="上一步导出的核验结果CSV")
    r.add_argument("--record", "-r", required=True, help="目标记录ID")
    r.add_argument(
        "--action", "-a", required=True,
        choices=["confirm_pass", "mark_pending", "request_recollect", "escalate"],
        help="复核动作: confirm_pass=确认通过, mark_pending=标记暂缓, request_recollect=要求重采集, escalate=升级复核",
    )
    r.add_argument("--operator", required=True, help="操作人姓名/工号")
    r.add_argument("--comment", "-c", default="", help="复核备注(必填说明)")
    r.add_argument("--override-tax", type=float, default=None, help="手工覆盖理论税额(可选)")
    r.add_argument("--audit", default="audit_log.json", help="留痕文件路径(默认 audit_log.json)")
    r.add_argument("--output", "-o", default=None, help="复核后新结果CSV路径(默认覆盖--input)")

    h = sub.add_parser("history", help="查看变更历史")
    h.add_argument("--audit", default="audit_log.json", help="留痕文件路径")
    h.add_argument("--record", "-r", default=None, help="只看某条记录(不填=全部)")

    return p


def _collect_records(args) -> List[TaxRecord]:
    records: List[TaxRecord] = []
    for path in args.input:
        records.extend(CsvLoader.load(path))
    if args.samples:
        here = os.path.dirname(os.path.abspath(__file__))
        sample_dir = os.path.join(os.path.dirname(here), "samples")
        for name in ("scoring_records.csv", "question_list.csv", "empty_input.csv"):
            full = os.path.join(sample_dir, name)
            if os.path.exists(full):
                try:
                    records.extend(CsvLoader.load(full))
                except Exception as e:
                    print(f"[样例] {name}: {e}", file=sys.stderr)
    return records


def cmd_verify(args) -> int:
    records = _collect_records(args)
    if not records:
        print("未提供任何输入数据(空集合)，仍按流程执行核验……")
    reviewer = BatchReviewer()
    reviewer.engine.config.boundary_tolerance_pct = args.tolerance
    report = reviewer.review_batch(records)
    audit = AuditTrail(args.audit)
    audit.attach_to_report(report)
    interp = ResultInterpreter(report)
    if args.view == "summary":
        print(interp.console_summary())
    elif args.view == "detail":
        print(interp.console_summary())
        print()
        print(interp.detail_table())
    else:
        print(interp.student_view())
    if args.output:
        with open(args.output, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            for row in interp.export_csv_rows():
                writer.writerow(row)
        print(f"\n结果已导出到: {os.path.abspath(args.output)}")
    return 0


def _load_results_csv(path: str) -> list:
    with open(path, "r", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def cmd_review(args) -> int:
    rows = _load_results_csv(args.input)
    target = None
    for r in rows:
        if r["记录ID"] == args.record:
            target = r
            break
    if target is None:
        print(f"未找到记录ID: {args.record}", file=sys.stderr)
        return 2
    action_map = {
        "confirm_pass": ReviewAction.CONFIRM_PASS,
        "mark_pending": ReviewAction.MARK_PENDING,
        "request_recollect": ReviewAction.REQUEST_RECOLLECT,
        "escalate": ReviewAction.ESCALATE,
    }
    action = action_map[args.action]
    prev_status = target["状态"]
    audit = AuditTrail(args.audit)
    from .models import TaxRecord, SourceRef, VerificationResult, BoundaryFlag, LadderStep
    fake_record = TaxRecord(
        record_id=target["记录ID"],
        income_amount=float(target.get("收入金额") or 0),
        claimed_tax=float(target.get("申报税额") or 0),
        source_ref=SourceRef(
            image_name=target.get("图片名") or None,
            sheet_name=target.get("工作表") or None,
            source_note=target.get("来源备注") or None,
        ),
    )
    step = None
    if target.get("阶梯下界") and target.get("税率"):
        try:
            upper_raw = target.get("阶梯上界", "inf")
            upper = float("inf") if upper_raw in ("", "∞", "inf") else float(upper_raw)
            rate = float(str(target["税率"]).replace("%", "")) / 100.0
            step = LadderStep(
                lower_bound=float(target["阶梯下界"]),
                upper_bound=upper,
                tax_rate=rate,
                quick_deduction=float(target.get("速算扣除") or 0),
            )
        except Exception:
            pass
    result = VerificationResult(
        record=fake_record,
        status=ResultStatus(prev_status),
        boundary_flag=BoundaryFlag(target.get("边界标记") or "正常区间"),
        expected_tax=float(target.get("理论税额") or 0),
        claimed_tax=fake_record.claimed_tax,
        tax_diff=float(target.get("差额") or 0),
        matched_step=step,
        constraint_violations=[v for v in (target.get("约束违规") or "").split(";") if v],
        explanation=target.get("说明") or "",
        is_duplicate=(target.get("是否重复") == "是"),
        duplicate_of=target.get("重复来源") or None,
    )
    entry = audit.apply_review(result, action, args.operator, args.comment, args.override_tax)
    print(audit.format_diff(entry))
    target["状态"] = result.status.value
    target["差额"] = f"{result.tax_diff:.2f}"
    target["理论税额"] = f"{result.expected_tax:.2f}"
    target["说明"] = result.explanation
    out_path = args.output or args.input
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"\n已更新结果文件: {os.path.abspath(out_path)}")
    print(f"留痕文件: {os.path.abspath(args.audit)}")
    return 0


def cmd_history(args) -> int:
    audit = AuditTrail(args.audit)
    if not audit._entries:
        print("暂无变更历史")
        return 0
    if args.record:
        entries = audit.history_for_record(args.record)
    else:
        entries = audit._entries
    for e in entries:
        print(audit.format_diff(e))
        print()
    return 0


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "verify":
        return cmd_verify(args)
    elif args.command == "review":
        return cmd_review(args)
    elif args.command == "history":
        return cmd_history(args)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
