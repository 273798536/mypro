#!/usr/bin/env python3
"""
应收账款逾期滚动系统 - 完整流程测试脚本
演示从数据导入到生成报告的完整流程
"""
import sys
import os
import requests
import time

BASE_URL = "http://localhost:8000"
SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")

def print_step(step_no, title):
    print(f"\n{'='*60}")
    print(f"步骤 {step_no}: {title}")
    print(f"{'='*60}")

def check_health():
    print_step(0, "检查服务状态")
    try:
        r = requests.get(f"{BASE_URL}/api/health")
        print(f"✓ 服务运行正常: {r.json()['message']}")
        return True
    except:
        print("✗ 服务未启动，请先运行: uvicorn main:app --reload")
        return False

def import_file(endpoint, filename, strategy="overwrite"):
    filepath = os.path.join(SAMPLES_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  跳过: {filename} 不存在")
        return None

    with open(filepath, 'rb') as f:
        files = {'file': (filename, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        data = {'strategy': strategy, 'imported_by': 'test_script'}
        r = requests.post(f"{BASE_URL}/api/import/{endpoint}", files=files, data=data)

    if r.status_code == 200:
        result = r.json()
        print(f"✓ {filename}: 共{result['total_records']}条, 创建{result['created']}条, 更新{result['updated']}条, 跳过{result['skipped']}条")
        print(f"  批次号: {result['batch_no']}")
        return result
    else:
        print(f"✗ {filename}: 导入失败 - {r.text}")
        return None

def import_all_data():
    print_step(1, "导入基础数据")

    import_file("customers", "customers.xlsx")
    import_file("contracts", "contracts.xlsx")
    import_file("invoices", "invoices.xlsx")
    import_file("receipts", "receipts.xlsx")
    import_file("collection", "collection.xlsx")
    import_file("credit", "credit.xlsx")

def auto_match_receipts():
    print_step(2, "自动匹配回款")
    r = requests.post(f"{BASE_URL}/api/receipts/auto-match")
    if r.status_code == 200:
        result = r.json()
        print(f"✓ 自动匹配完成: 匹配{result['matched_count']}笔, 金额{result['total_matched_amount']:.2f}")
    else:
        print(f"✗ 自动匹配失败: {r.text}")

def update_aging():
    print_step(3, "更新发票账龄")
    r = requests.post(f"{BASE_URL}/api/invoices/update-aging")
    if r.status_code == 200:
        result = r.json()
        print(f"✓ 账龄更新完成: 共更新{result['updated']}张发票")
    else:
        print(f"✗ 更新失败: {r.text}")

def check_promises():
    print_step(4, "检查承诺付款日期")
    r = requests.post(f"{BASE_URL}/api/alerts/check-promises")
    if r.status_code == 200:
        result = r.json()
        print(f"✓ 检查完成: 新增预警{result['alerts_created']}条")
    else:
        print(f"✗ 检查失败: {r.text}")

def update_credit_usage():
    print_step(5, "更新信用额度使用情况")
    r = requests.post(f"{BASE_URL}/api/credit/update-usage")
    if r.status_code == 200:
        result = r.json()
        print(f"✓ 信用额度更新完成: 共更新{result['updated']}个客户")
    else:
        print(f"✗ 更新失败: {r.text}")

def get_alerts():
    print_step(6, "查看风险预警")
    r = requests.get(f"{BASE_URL}/api/alerts/summary")
    if r.status_code == 200:
        summary = r.json()
        print(f"未解决预警总数: {summary['total_unresolved']}")
        for atype, counts in summary['by_type'].items():
            print(f"  {atype}: 总计{counts['total']}, 未解决{counts['unresolved']}")

    r = requests.get(f"{BASE_URL}/api/alerts/", params={"resolved": "false", "limit": 10})
    if r.status_code == 200:
        alerts = r.json()
        print(f"\n最新预警列表 (前10条):")
        for alert in alerts:
            print(f"  [{alert['alert_type']}] {alert['message']}")

def generate_report():
    print_step(7, "生成逾期滚动报告")
    r = requests.get(f"{BASE_URL}/api/reports/rolling")
    if r.status_code == 200:
        report = r.json()
        print(f"报告日期: {report['report_date']}")
        print(f"客户总数: {report['total_customers']}")
        print(f"发票总金额: {report['total_invoice_amount']:,.2f}")
        print(f"已回款金额: {report['total_paid_amount']:,.2f}")
        print(f"剩余金额: {report['total_remaining']:,.2f}")
        print(f"未逾期金额: {report['current_amount']:,.2f}")
        print(f"逾期总金额: {report['total_overdue']:,.2f}")

        print(f"\n账龄分桶汇总:")
        for bucket in report['aging_summary']:
            print(f"  {bucket['bucket']}: {bucket['amount']:,.2f} ({bucket['invoice_count']}张, {bucket['percentage']:.1f}%)")

        print(f"\n客户明细 (前5个有逾期的客户):")
        overdue_customers = [c for c in report['customer_details'] if c['overdue_amount'] > 0]
        for cust in sorted(overdue_customers, key=lambda x: x['overdue_amount'], reverse=True)[:5]:
            print(f"  {cust['customer_code']} {cust['customer_name']}:")
            print(f"    逾期金额: {cust['overdue_amount']:,.2f}, 总剩余: {cust['total_remaining']:,.2f}")
            if cust['is_credit_frozen']:
                print(f"    ⚠ 信用额度已冻结")
            if cust['alerts']:
                print(f"    ⚠ 有{len(cust['alerts'])}条预警")

        return report
    else:
        print(f"✗ 生成报告失败: {r.text}")
        return None

def export_report():
    print_step(8, "导出报告")
    r = requests.get(f"{BASE_URL}/api/reports/rolling/export")
    if r.status_code == 200:
        filename = "ar_rolling_report_export.csv"
        with open(filename, 'w', encoding='utf-8-sig') as f:
            f.write(r.text)
        print(f"✓ 报告已导出: {filename}")
    else:
        print(f"✗ 导出失败: {r.text}")

def show_collection_history():
    print_step(9, "查看催收历史")
    r = requests.get(f"{BASE_URL}/api/customers/")
    if r.status_code == 200:
        customers = r.json()
        for cust in customers[:3]:
            r2 = requests.get(f"{BASE_URL}/api/collection/customer/{cust['id']}")
            if r2.status_code == 200:
                history = r2.json()
                if history:
                    print(f"\n{cust['customer_name']} 的催收历史:")
                    for h in history:
                        print(f"  {h['contact_date']} - {h['collector']} via {h['contact_method']}")
                        if h['promise_date']:
                            print(f"    承诺付款: {h['promise_date']}, 金额: {h['promise_amount']}")
                        print(f"    备注: {h['notes']}")

def test_repeat_import():
    print_step(10, "测试重复导入 - 不同策略对比")
    print("\n策略1: ignore (忽略已存在)")
    import_file("customers", "customers.xlsx", strategy="ignore")

    print("\n策略2: overwrite (覆盖)")
    import_file("customers", "customers.xlsx", strategy="overwrite")

    print("\n策略3: append (追加/忽略同编码)")
    import_file("customers", "customers.xlsx", strategy="append")

def main():
    print("="*60)
    print("  应收账款逾期滚动系统 - 完整流程测试")
    print("="*60)

    if not check_health():
        sys.exit(1)

    try:
        import_all_data()
        auto_match_receipts()
        update_aging()
        check_promises()
        update_credit_usage()
        get_alerts()
        generate_report()
        export_report()
        show_collection_history()
        test_repeat_import()

        print(f"\n{'='*60}")
        print("✓ 所有测试步骤完成！")
        print(f"{'='*60}")
        print(f"\n你可以通过以下地址访问API文档:")
        print(f"  Swagger UI: {BASE_URL}/docs")
        print(f"  ReDoc: {BASE_URL}/redoc")

    except requests.exceptions.ConnectionError:
        print("\n✗ 连接被拒绝，请确保服务已启动")
        print("  运行: uvicorn main:app --reload")

if __name__ == "__main__":
    main()
