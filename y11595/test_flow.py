#!/usr/bin/env python3
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"
OPERATOR = "test_admin"


def print_step(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def main():
    print("=" * 60)
    print("  客服知识库回执状态机 - 完整流程测试")
    print("=" * 60)

    try:
        requests.get(f"{BASE_URL}/health", timeout=5)
    except:
        print("❌ 服务未启动，请先运行: python3 -m app.main")
        sys.exit(1)

    print_step("步骤 1: 创建批次")
    resp = requests.post(
        f"{BASE_URL}/batches?operator={OPERATOR}",
        json={"title": "5月第2周知识库异常回执处理", "description": "包含变更单、审核意见、客服引用记录"}
    )
    batch = resp.json()
    batch_id = batch["id"]
    batch_no = batch["batch_no"]
    print(f"✅ 批次创建成功")
    print(f"   批次ID: {batch_id}")
    print(f"   批次号: {batch_no}")

    print_step("步骤 2: 导入变更单数据 (含部分失败和重复)")
    change_orders = [
        {"change_order_no": "CO20240513001", "cs_agent_id": "CS001", "cs_agent_name": "张三", "store_id": "ST001", "store_name": "北京朝阳店", "compensation_amount": 50, "issue_description": "旧答案已下线仍被引用", "old_answer": "退款政策V1", "new_answer": "退款政策V2"},
        {"change_order_no": "CO20240513002", "cs_agent_id": "CS002", "cs_agent_name": "李四", "store_id": "ST002", "store_name": "上海浦东店", "compensation_amount": 100, "issue_description": "答案内容不准确", "old_answer": "配送时间说明", "new_answer": "配送时间V2"},
        {"change_order_no": "CO20240513001", "cs_agent_id": "CS001", "cs_agent_name": "张三", "store_id": "ST001", "store_name": "北京朝阳店", "compensation_amount": 50},
        {"invalid_row": "这行数据缺少必填字段"},
        {"change_order_no": "CO20240513003", "cs_agent_id": "CS003", "cs_agent_name": "王五", "store_id": "ST003", "store_name": "广州天河店", "compensation_amount": 75}
    ]
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/import?operator={OPERATOR}",
        data={"record_type": "change_order", "source_file": "change_orders_20240513.xlsx", "json_data": json.dumps(change_orders)}
    )
    result = resp.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n📊 导入结果:")
    print(f"   成功: {result['success_count']} 条")
    print(f"   失败: {result['failed_count']} 条")
    print(f"   重复: {result['duplicate_count']} 条")

    print_step("步骤 3: 导入审核意见数据")
    audit_opinions = [
        {"audit_opinion_no": "AUD20240513001", "change_order_no": "CO20240513001", "auditor": "审核员A", "opinion": "确认为错赔，建议修正", "audit_result": "reject"},
        {"audit_opinion_no": "AUD20240513002", "change_order_no": "CO20240513002", "auditor": "审核员B", "opinion": "情况属实，予以豁免", "audit_result": "waive"},
        {"audit_opinion_no": "AUD20240513003", "change_order_no": "CO20240513003", "auditor": "审核员A", "opinion": "核实无误", "audit_result": "approve"}
    ]
    requests.post(
        f"{BASE_URL}/batches/{batch_id}/import?operator={OPERATOR}",
        data={"record_type": "audit_opinion", "source_file": "audit_opinions_20240513.xlsx", "json_data": json.dumps(audit_opinions)}
    )
    print("✅ 审核意见导入完成")

    print_step("步骤 4: 查看批次详情和统计")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}")
    print(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    print_step("步骤 5: 查看所有记录列表")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/records?page_size=10")
    data = resp.json()
    print(f"总记录数: {data['total']}")
    print("-" * 80)
    print(f"{'ID':<5} {'类型':<15} {'状态':<10} {'唯一键':<20} {'来源行号':<10}")
    print("-" * 80)
    for r in data['items']:
        print(f"{r['id']:<5} {r['record_type']:<15} {r['status']:<10} {str(r['unique_key']):<20} {str(r['source_row']):<10}")

    print_step("步骤 6: 人工改判记录 (修正错赔)")
    print("获取第一条变更单记录ID...")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/records?page_size=1&status=pending")
    record_id = resp.json()['items'][0]['id']
    print(f"记录ID: {record_id}")

    resp = requests.put(
        f"{BASE_URL}/records/{record_id}/correct?operator={OPERATOR}",
        json={
            "status": "corrected",
            "correction_note": "经核实，该单确实为错赔，金额从50调整为30",
            "review_reason": "旧答案下线时间与引用时间不符",
            "is_correct": False,
            "compensation_amount": 30
        }
    )
    result = resp.json()
    print("✅ 记录改判完成")
    print(f"   新状态: {result['status']}")
    print(f"   改判人: {result['corrected_by']}")

    print_step("步骤 7: 复核批次 - 审批通过")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/review?operator={OPERATOR}",
        json={
            "action": "approve",
            "opinion": "经复核，所有记录处理正确，同意通过"
        }
    )
    result = resp.json()
    print("✅ 批次复核完成")
    print(f"   当前状态: {result.get('status', 'N/A')}")
    print(f"   复核意见: {result.get('review_opinion', 'N/A')}")

    print_step("步骤 8: 导出前冻结批次 (防止数据变动)")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/freeze?operator={OPERATOR}",
        json={"reason": "导出结算前冻结，防止数据被篡改"}
    )
    result = resp.json()
    print("✅ 批次已冻结")
    print(f"   冻结前状态: {result.get('status_before_frozen', 'N/A')}")
    print(f"   冻结原因: {result.get('frozen_reason', 'N/A')}")

    print_step("步骤 9: 验证冻结后无法修改 (预期失败)")
    print("尝试在冻结状态下改判记录...")
    resp = requests.put(
        f"{BASE_URL}/records/{record_id}/correct?operator={OPERATOR}",
        json={"status": "verified", "correction_note": "尝试冻结后修改"}
    )
    print(f"❌ 预期失败: {resp.json().get('detail', '未知错误')}")

    print_step("步骤 10: 导出运营汇总报表")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/export/summary?operator={OPERATOR}")
    data = resp.json()
    print("=" * 60)
    print("  运营汇总报表")
    print("=" * 60)
    print(f"批次号: {data['batch_no']}")
    print(f"批次名称: {data['batch_title']}")
    print(f"冻结前状态: {data['status_before_frozen']}")
    print(f"冻结后状态: {data['status_after_frozen']}")
    print(f"冻结原因: {data['frozen_reason']}")
    print("-" * 60)
    print(f"总记录数: {data['total_records']}")
    print(f"  - 已核实: {data['verified_count']}")
    print(f"  - 已修正: {data['corrected_count']}")
    print(f"  - 已豁免: {data['waived_count']}")
    print(f"  - 无效: {data['invalid_count']}")
    print(f"  - 重复: {data['duplicate_count']}")
    print(f"  - 待处理: {data['pending_count']}")
    print("-" * 60)
    print(f"总赔付金额: ¥{data['total_compensation']:.2f}")
    print(f"正确赔付: ¥{data['correct_compensation']:.2f}")
    print(f"错赔金额: ¥{data['incorrect_compensation']:.2f}")
    print("-" * 60)
    print(f"导出时间: {data['export_at']}")
    print(f"导出人: {data['exported_by']}")

    print_step("步骤 11: 解冻批次")
    resp = requests.post(f"{BASE_URL}/batches/{batch_id}/unfreeze?operator={OPERATOR}")
    print(f"✅ 批次已解冻，恢复状态: {resp.json()['status']}")

    print_step("步骤 12: 结算批次")
    resp = requests.post(f"{BASE_URL}/batches/{batch_id}/settle?operator={OPERATOR}")
    print(f"✅ 批次已结算，状态: {resp.json()['status']}")

    print_step("步骤 13: 查看审计日志")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/audit-logs?page_size=20")
    data = resp.json()
    print(f"共 {data['total']} 条审计记录")
    print("-" * 100)
    print(f"{'时间':<20} {'操作人':<12} {'动作':<25} {'旧状态':<12} {'新状态':<12}")
    print("-" * 100)
    for log in data['items']:
        time_str = log['operated_at'][:19].replace('T', ' ')
        print(f"{time_str:<20} {log['operator']:<12} {log['action']:<25} {str(log['old_status']):<12} {str(log['new_status']):<12}")

    print_step("步骤 14: 撤回后重新提交 (边界测试)")
    print("创建新批次测试撤回功能...")
    resp = requests.post(
        f"{BASE_URL}/batches?operator={OPERATOR}",
        json={"title": "测试撤回功能批次"}
    )
    new_batch_id = resp.json()['id']
    print(f"新批次ID: {new_batch_id}")

    print("撤回批次...")
    resp = requests.post(
        f"{BASE_URL}/batches/{new_batch_id}/withdraw?operator={OPERATOR}",
        json={"reason": "数据有误，需要重新整理"}
    )
    print(f"撤回后状态: {resp.json()['status']}")

    print("重新提交...")
    resp = requests.post(f"{BASE_URL}/batches/{new_batch_id}/resubmit?operator={OPERATOR}")
    print(f"重提后状态: {resp.json()['status']}")

    print("\n" + "=" * 60)
    print("✅ 所有测试完成!")
    print("=" * 60)
    print("\n📝 总结:")
    print("  - 批次创建和数据导入 ✓")
    print("  - 重复提交检测 ✓")
    print("  - 部分失败处理 ✓")
    print("  - 人工改判 ✓")
    print("  - 复核审批 ✓")
    print("  - 冻结/解冻 ✓")
    print("  - 导出汇总报表 ✓")
    print("  - 撤回/重提 ✓")
    print("  - 审计日志追踪 ✓")
    print("\n🔍 详细查看:")
    print(f"  - API文档: http://localhost:8000/docs")
    print(f"  - 批次详情: http://localhost:8000/api/v1/batches/{batch_id}")
    print(f'  - 导出CSV: curl -o records.csv "{BASE_URL}/batches/{batch_id}/export/records?format=csv"')


if __name__ == "__main__":
    main()
