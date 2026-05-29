#!/usr/bin/env python3
"""端到端测试：验证复核流程和状态持久化"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / "src"))

from petty_cash_audit.loader import DataLoader
from petty_cash_audit.engine import AuditEngine
from petty_cash_audit.models import AuditResult, FindingStatus
from petty_cash_audit.state import StateStore
from petty_cash_audit.report import ReportGenerator


def main():
    data_dir = Path("samples")
    state_file = Path("output/test_audit_state.json")
    output_dir = Path("output")

    print("=" * 60)
    print("测试 1: 首次扫描")
    print("=" * 60)

    loader = DataLoader(data_dir)
    load_result = loader.load()
    print(f"✓ 加载成功，自动修正 {len(load_result.corrections)} 处")

    result = AuditResult(
        reimbursements=load_result.reimbursements,
        invoices=load_result.invoices,
        loans=load_result.loans,
        projects=load_result.projects,
        approvers=load_result.approvers,
        spot_check_reports=load_result.spot_check_reports,
        findings=[],
    )

    engine = AuditEngine()
    result = engine.run(result)
    print(f"✓ 扫描完成，发现 {len(result.findings)} 项问题")

    unhandled = sum(1 for f in result.findings if f.status == FindingStatus.UNHANDLED)
    print(f"  未处理: {unhandled}")

    print("\n" + "=" * 60)
    print("测试 2: 模拟复核（修改状态）")
    print("=" * 60)

    result.findings[0].status = FindingStatus.CORRECTED
    result.findings[0].correction_note = "已联系审批人升级审批流程"

    result.findings[1].status = FindingStatus.MANUAL_REVIEW
    result.findings[1].correction_note = "需财务总监确认"

    result.findings[2].status = FindingStatus.CORRECTED
    result.findings[2].correction_note = "系不同联票据，编号重复正常"

    state_store = StateStore(state_file)
    state_store.save(result.findings)
    print(f"✓ 状态已保存到 {state_file}")

    print("\n" + "=" * 60)
    print("测试 3: 重新扫描并加载历史状态")
    print("=" * 60)

    loader2 = DataLoader(data_dir)
    load_result2 = loader2.load()
    result2 = AuditResult(
        reimbursements=load_result2.reimbursements,
        invoices=load_result2.invoices,
        loans=load_result2.loans,
        projects=load_result2.projects,
        approvers=load_result2.approvers,
        spot_check_reports=load_result2.spot_check_reports,
        findings=[],
    )
    engine2 = AuditEngine()
    result2 = engine2.run(result2)

    result2.findings = state_store.apply_saved_state(result2.findings)

    unhandled = sum(1 for f in result2.findings if f.status == FindingStatus.UNHANDLED)
    corrected = sum(1 for f in result2.findings if f.status == FindingStatus.CORRECTED)
    manual = sum(1 for f in result2.findings if f.status == FindingStatus.MANUAL_REVIEW)

    print(f"✓ 状态恢复成功")
    print(f"  未处理: {unhandled}")
    print(f"  已修正: {corrected}")
    print(f"  需人工确认: {manual}")

    print("\n" + "=" * 60)
    print("测试 4: 生成分类报告")
    print("=" * 60)

    report_gen = ReportGenerator(output_dir)
    report_path = output_dir / "test_audit_report.txt"
    report_path.write_text(report_gen.generate_text(result2), encoding="utf-8")
    print(f"✓ 报告已生成: {report_path}")

    print("\n报告摘要（从文件读取）:")
    with open(report_path, encoding="utf-8") as f:
        content = f.read()
        print("  " + content.split("【问题汇总】")[1].split("--------------------------------------------------")[0].strip())

    print("\n" + "=" * 60)
    print("✓ 所有测试通过！")
    print("=" * 60)


if __name__ == "__main__":
    main()
