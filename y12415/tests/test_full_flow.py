import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

from cash_shortage.data import DataLoader, FilterEngine, FilterContext
from cash_shortage.checks import Auditor
from cash_shortage.report import ReportExporter, ReportContext


def test_full_flow():
    loader = DataLoader(keep_raw=True)
    dataset = loader.load("sample_data/cashier_data.csv")

    assert len(dataset.raw_df) == 15
    assert len(dataset.canonical_df) == 15
    print("✅ 数据加载正常")

    filter_ctx = FilterContext()
    filter_ctx.set("date_range", (date(2026, 5, 1), date(2026, 5, 3)))
    filter_engine = FilterEngine()
    filtered = filter_engine.apply(dataset.canonical_df, filter_ctx)
    assert len(filtered) == 15
    print("✅ 日期筛选正常")

    auditor = Auditor()
    result = auditor.run(filtered)

    refund_issues = [f for f in result.findings if f.check_key == "refund_no_sign"][0]
    assert refund_issues.finding_count >= 2, f"退款漏签应>=2，实际{refund_issues.finding_count}"

    petty_issues = [f for f in result.findings if f.check_key == "petty_cash_shift_mismatch"][0]
    assert petty_issues.finding_count >= 1, f"备用金错班应>=1，实际{petty_issues.finding_count}"

    dup_issues = [f for f in result.findings if f.check_key == "duplicate_trans"][0]
    assert dup_issues.finding_count >= 3, f"流水重复应>=3，实际{dup_issues.finding_count}"

    print(f"✅ 稽核逻辑正常: 退款漏签 {refund_issues.finding_count}, 备用金错班 {petty_issues.finding_count}, 流水重复 {dup_issues.finding_count}")

    report_ctx = ReportContext(
        report_date=date.today(),
        filter_description="2026-05-01 ~ 2026-05-03",
        output_dir="output",
    )
    exporter = ReportExporter(report_ctx)
    out_path = exporter.export(result, filtered, dataset, filename="test_report.xlsx")

    assert Path(out_path).exists()
    assert Path(out_path).stat().st_size > 10000
    print(f"✅ 报告导出正常: {out_path}")

    print("\n🎉 全部测试通过")


if __name__ == "__main__":
    test_full_flow()
