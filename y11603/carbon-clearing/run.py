import json
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db.session import SessionLocal, init_db
from app.services.import_service import (
    import_enterprises, import_readings, import_credits,
    import_invoices, import_receipts, import_clearing,
)
from app.services.reconciliation_service import run_reconciliation, get_reconciliation_summary
from app.services.report_service import generate_audit_report, export_report_json, export_report_excel
from app.services.balance_service import get_enterprise_balance
from app.schemas.schemas import (
    EnterpriseIn, EnergyReadingIn, CreditTransactionIn,
    InvoiceIn, ReceiptIn, ClearingTableIn,
)


def load_sample(path: str = "sample_data.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def reset_database():
    from app.db.session import engine
    from app.models.models import Base
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("  ✓ 数据库已重置")


def run_full_flow(period: str = "2025-04", operator: str = "admin", reset: bool = False):
    sample_path = Path(__file__).resolve().parent / "sample_data.json"
    if not sample_path.exists():
        print(f"样例数据文件不存在: {sample_path}")
        return

    data = load_sample(str(sample_path))

    if reset:
        reset_database()

    init_db()
    db = SessionLocal()

    print("=" * 60)
    print("  碳积分清算对账 —— 全流程演示")
    print("=" * 60)

    print("\n[1/6] 导入企业账号...")
    enterprises = [EnterpriseIn(**e) for e in data["enterprises"]]
    batch = import_enterprises(db, enterprises, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 家企业, 批次号: {batch.batch_no}")

    print("\n[2/6] 导入用能读数...")
    readings = [EnergyReadingIn(**r) for r in data["readings"]]
    batch = import_readings(db, readings, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 条读数, 批次号: {batch.batch_no}")

    print("\n[3/6] 导入碳积分流水、发票、交易回执、清算表...")
    credits = [CreditTransactionIn(**c) for c in data["credits"]]
    batch = import_credits(db, credits, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 条流水, 批次号: {batch.batch_no}")

    invoices = [InvoiceIn(**inv) for inv in data["invoices"]]
    batch = import_invoices(db, invoices, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 张发票, 批次号: {batch.batch_no}")

    receipts = [ReceiptIn(**rcp) for rcp in data["receipts"]]
    batch = import_receipts(db, receipts, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 张回执, 批次号: {batch.batch_no}")

    clearing = [ClearingTableIn(**ct) for ct in data["clearing"]]
    batch = import_clearing(db, clearing, operator=operator)
    print(f"  ✓ 导入 {batch.record_count} 条清算表, 批次号: {batch.batch_no}")

    print(f"\n[4/6] 执行对账 (周期={period}) ...")
    rec = run_reconciliation(db, period, operator=operator, auto_apply_red_flush=True)
    print(f"  ✓ 对账完成, ID={rec.id}, 状态={rec.status}")
    print(f"  ✓ 企业数={rec.total_enterprises}, 异常数={rec.anomalies_found}")

    print(f"\n[5/6] 对账摘要:")
    summary = get_reconciliation_summary(db, rec.id)
    for k, v in summary.items():
        if k != "reconciliation_id":
            print(f"  {k}: {v}")

    print(f"\n[6/6] 生成审计报告...")
    report = generate_audit_report(db, rec.id)
    json_path = export_report_json(db, rec.id)
    excel_path = export_report_excel(db, rec.id)
    print(f"  ✓ 审计报告已生成")
    print(f"  ✓ JSON导出: {Path(json_path).name if json_path else 'N/A'}")
    print(f"  ✓ Excel导出: {Path(excel_path).name if excel_path else 'N/A'}")

    print("\n" + "=" * 60)
    print("  异常清单:")
    print("-" * 60)
    for a in report.get("anomalies", []):
        print(f"  [{a['severity'].upper():8s}] {a['type']}: {a['description'][:80]}")
        print(f"             状态: {a['status']}")

    print("\n" + "=" * 60)
    print("  对账明细:")
    print("-" * 60)
    for item in report.get("items", []):
        flag = "⚠️" if item["has_anomaly"] else "✓"
        print(f"  {flag} {item['enterprise_code']} {item['enterprise_name']}")
        print(f"     期初={item['opening_balance']}, 收入={item['period_in']}, "
              f"支出={item['period_out']}, 红冲调整={item['red_flush_adjustment']}")
        print(f"     计算期末={item['calculated_closing']}, 申报期末={item['reported_closing']}, "
              f"差额={item['balance_diff']}")
        print(f"     跨月读数={item['cross_month_readings']}, 重复流水={item['duplicate_credits']}, "
              f"红冲未处理={item['red_flush_unapplied']}, 回执未核验={item['receipts_unverified']}")

    print("\n" + "=" * 60)
    print("  全流程完成 ✓")
    print("=" * 60)

    db.close()
    return rec.id


if __name__ == "__main__":
    args = sys.argv[1:]
    reset = "--reset" in args
    period = "2025-04"
    for a in args:
        if a.startswith("20") and "-" in a:
            period = a
    rec_id = run_full_flow(period=period, reset=reset)
    if rec_id:
        print(f"\n提示: 启动API服务后可查看 http://localhost:8000/api/reports/audit/{rec_id}")