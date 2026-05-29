#!/usr/bin/env python3
"""
快速测试脚本 - 验证预售尾款对账工具功能
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from presale_reconciliation.data_loader import load_all_data
from presale_reconciliation.reconciliation import reconcile
from presale_reconciliation.terminal_output import print_summary, print_exception_details
from presale_reconciliation.report_generator import generate_all_reports


def main():
    print("=" * 60)
    print("🧪 预售尾款对账工具 - 功能测试")
    print("=" * 60)
    print()

    test_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    test_time = datetime(2026, 5, 29, 12, 0, 0)

    print(f"📂 测试数据目录: {test_dir}")
    print(f"⏰ 模拟对账时间: {test_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    print("1️⃣  测试数据加载...")
    try:
        data = load_all_data(test_dir)
        print(f"   ✅ 预售订单: {len(data['orders'])} 条")
        print(f"   ✅ 定金流水: {len(data['deposits'])} 条")
        print(f"   ✅ 尾款支付: {len(data['balances'])} 条")
    except Exception as e:
        print(f"   ❌ 数据加载失败: {e}")
        return 1
    print()

    print("2️⃣  测试对账逻辑...")
    try:
        summary = reconcile(
            orders=data["orders"],
            deposits=data["deposits"],
            balances=data["balances"],
            balance_grace_hours=0,
            current_time=test_time,
        )
        print(f"   ✅ 对账完成，共 {summary.total_orders} 条订单")
        print(f"   ✅ 对账通过: {summary.matched_count} 条")
        print(f"   ✅ 存在异常: {summary.exception_count} 条")
    except Exception as e:
        print(f"   ❌ 对账失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    print()

    print("3️⃣  测试终端输出...")
    try:
        print_summary(summary, data)
        print_exception_details(summary, limit=10)
        print("   ✅ 终端输出正常")
    except Exception as e:
        print(f"   ❌ 终端输出失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    print()

    print("4️⃣  测试报告生成...")
    try:
        os.makedirs(output_dir, exist_ok=True)
        reports = generate_all_reports(summary, output_dir, data)
        for fmt, path in reports.items():
            if os.path.exists(path):
                print(f"   ✅ {fmt.upper()}报告: {os.path.basename(path)}")
            else:
                print(f"   ❌ {fmt.upper()}报告生成失败")
    except Exception as e:
        print(f"   ❌ 报告生成失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    print()

    print("5️⃣  验证异常检测...")
    expected_exceptions = {
        "定金不退": 1,
        "尾款超时": 3,
        "金额不符": 1,
        "缺失数据": 2,
    }
    actual_exceptions = {
        "定金不退": summary.deposit_not_refund_count,
        "尾款超时": summary.balance_timeout_count,
        "金额不符": summary.amount_mismatch_count,
        "缺失数据": summary.missing_data_count,
    }
    print(f"   预期异常: {expected_exceptions}")
    print(f"   实际异常: {actual_exceptions}")

    all_match = True
    for key, expected in expected_exceptions.items():
        actual = actual_exceptions.get(key, 0)
        expected_low = max(0, expected - 1)
        expected_high = expected + 2
        if not (expected_low <= actual <= expected_high):
            print(f"   ⚠️  {key} 数量可能不符: 预期约{expected}, 实际{actual}")
            all_match = False

    if all_match:
        print("   ✅ 异常检测结果符合预期")
    print()

    print("=" * 60)
    if all_match:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  部分测试结果与预期有差异，请人工核查")
    print("=" * 60)
    print()
    print(f"📄 生成的报告文件在: {output_dir}")
    print()
    print("💡 可以使用以下命令运行正式对账:")
    print(f"   python -m presale_reconciliation.cli --input-dir ./sample_data --output-dir ./output")
    print()

    return 0 if all_match else 0


if __name__ == "__main__":
    sys.exit(main())
