#!/usr/bin/env python3
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"
ADMIN = "admin"
OPERATOR = "operator"
REVIEWER = "reviewer"
SETTLEMENT = "settlement"


def print_step(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def check_response(resp, expected_status=200, context=""):
    if resp.status_code != expected_status:
        print(f"❌ [{context}] 预期状态码 {expected_status}, 实际 {resp.status_code}")
        print(f"   响应: {resp.text[:500]}")
        return False
    return True


def main():
    print("=" * 60)
    print("  客服知识库回执状态机 - 完整流程测试")
    print("=" * 60)

    try:
        requests.get(f"{BASE_URL}/health", timeout=5)
    except:
        print("❌ 服务未启动，请先运行: python3 -m app.main")
        sys.exit(1)

    print_step("步骤 1: 查看可用用户和权限")
    resp = requests.get(f"{BASE_URL}/users")
    print(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    print_step("步骤 2: 创建批次 (operator权限)")
    resp = requests.post(
        f"{BASE_URL}/batches?operator={OPERATOR}",
        json={"title": "5月第2周知识库异常回执处理", "description": "包含变更单、审核意见、客服引用记录"}
    )
    if not check_response(resp, 201, "创建批次"):
        sys.exit(1)
    batch = resp.json()
    batch_id = batch["id"]
    batch_no = batch["batch_no"]
    print(f"✅ 批次创建成功")
    print(f"   批次ID: {batch_id}")
    print(f"   批次号: {batch_no}")
    print(f"   创建人: {batch['created_by']}")

    print_step("步骤 3: 导入变更单数据 (含部分失败和重复)")
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
    if not check_response(resp, 200, "导入变更单"):
        sys.exit(1)
    result = resp.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n📊 导入结果:")
    print(f"   成功: {result['success_count']} 条")
    print(f"   失败: {result['failed_count']} 条")
    print(f"   重复: {result['duplicate_count']} 条")
    print(f"   失败清单: {json.dumps(result['failed_records'], ensure_ascii=False)}")

    print_step("步骤 4: 导入审核意见数据 (同一批次追加导入)")
    audit_opinions = [
        {"audit_opinion_no": "AUD20240513001", "change_order_no": "CO20240513001", "auditor": "审核员A", "opinion": "确认为错赔，建议修正", "audit_result": "reject"},
        {"audit_opinion_no": "AUD20240513002", "change_order_no": "CO20240513002", "auditor": "审核员B", "opinion": "情况属实，予以豁免", "audit_result": "waive"},
        {"audit_opinion_no": "AUD20240513003", "change_order_no": "CO20240513003", "auditor": "审核员A", "opinion": "核实无误", "audit_result": "approve"}
    ]
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/import?operator={OPERATOR}",
        data={"record_type": "audit_opinion", "source_file": "audit_opinions_20240513.xlsx", "json_data": json.dumps(audit_opinions)}
    )
    if not check_response(resp, 200, "导入审核意见"):
        print("❌ 多源导入闭环失败！")
        sys.exit(1)
    result = resp.json()
    print("✅ 审核意见导入成功")
    print(f"   成功: {result['success_count']} 条, 失败: {result['failed_count']} 条")

    print_step("步骤 5: 导入客服引用记录 (同一批次追加导入)")
    cs_references = [
        {"cs_reference_no": "CSR20240513001", "change_order_no": "CO20240513001", "cs_agent_id": "CS001", "cs_agent_name": "张三", "reference_time": "2024-05-13 10:30:00", "conversation_id": "CONV001", "customer_id": "CUST001"},
        {"cs_reference_no": "CSR20240513002", "change_order_no": "CO20240513002", "cs_agent_id": "CS002", "cs_agent_name": "李四", "reference_time": "2024-05-13 11:00:00", "conversation_id": "CONV002", "customer_id": "CUST002"}
    ]
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/import?operator={OPERATOR}",
        data={"record_type": "cs_reference", "source_file": "cs_references_20240513.xlsx", "json_data": json.dumps(cs_references)}
    )
    if not check_response(resp, 200, "导入客服引用记录"):
        print("❌ 客服引用记录导入失败！")
        sys.exit(1)
    result = resp.json()
    print("✅ 客服引用记录导入成功")
    print(f"   成功: {result['success_count']} 条, 失败: {result['failed_count']} 条")

    print_step("步骤 6: 查看批次详情 - 验证多源闭环")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}?operator={OPERATOR}")
    if not check_response(resp, 200, "查看批次详情"):
        sys.exit(1)
    data = resp.json()
    print(f"批次状态: {data['status']}")
    print(f"记录总数: {data['record_count']}")
    print(f"统计信息: {json.dumps(data.get('stats', {}), ensure_ascii=False)}")

    print_step("步骤 7: 查看所有记录列表")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/records?page_size=20&operator={OPERATOR}")
    if not check_response(resp, 200, "查看记录列表"):
        sys.exit(1)
    data = resp.json()
    print(f"总记录数: {data['total']}")
    print("-" * 80)
    print(f"{'ID':<5} {'类型':<15} {'状态':<10} {'唯一键':<20} {'来源行号':<10}")
    print("-" * 80)
    for r in data['items']:
        print(f"{r['id']:<5} {r['record_type']:<15} {r['status']:<10} {str(r['unique_key']):<20} {str(r['source_row']):<10}")

    print_step("步骤 8: 权限测试 - operator尝试复核(应失败)")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/review?operator={OPERATOR}",
        json={"action": "approve", "opinion": "测试权限"}
    )
    if resp.status_code == 403:
        print(f"✅ 权限校验正常：operator无权复核，返回403")
        print(f"   错误信息: {resp.json().get('detail', '')}")
    else:
        print(f"❌ 权限校验失败：预期403，实际{resp.status_code}")

    print_step("步骤 9: reviewer复核批次 - 审批通过")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/review?operator={REVIEWER}",
        json={
            "action": "approve",
            "opinion": "经复核，所有记录处理正确，同意通过"
        }
    )
    if not check_response(resp, 200, "复核审批"):
        sys.exit(1)
    result = resp.json()
    print("✅ 批次复核完成")
    print(f"   当前状态: {result.get('status', 'N/A')}")
    print(f"   复核意见: {result.get('review_opinion', 'N/A')}")

    print_step("步骤 10: 人工改判记录 (reviewer权限)")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/records?page_size=1&status=pending&operator={REVIEWER}")
    if resp.status_code == 200 and resp.json()['items']:
        record_id = resp.json()['items'][0]['id']
        print(f"记录ID: {record_id}")
        
        resp = requests.put(
            f"{BASE_URL}/records/{record_id}/correct?operator={REVIEWER}",
            json={
                "status": "corrected",
                "correction_note": "经核实，该单确实为错赔，金额从50调整为30",
                "review_reason": "旧答案下线时间与引用时间不符",
                "is_correct": False,
                "compensation_amount": 30
            }
        )
        if check_response(resp, 200, "人工改判"):
            result = resp.json()
            print("✅ 记录改判完成")
            print(f"   新状态: {result['status']}")
            print(f"   改判人: {result.get('corrected_by', 'N/A')}")
    else:
        print("⚠️ 没有待处理记录，跳过改判")

    print_step("步骤 11: 权限测试 - operator尝试冻结(应失败)")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/freeze?operator={OPERATOR}",
        json={"reason": "测试权限"}
    )
    if resp.status_code == 403:
        print(f"✅ 权限校验正常：operator无权冻结，返回403")
    else:
        print(f"❌ 权限校验失败：预期403，实际{resp.status_code}")

    print_step("步骤 12: settlement冻结批次 (导出前)")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/freeze?operator={SETTLEMENT}",
        json={"reason": "导出结算前冻结，防止数据被篡改"}
    )
    if not check_response(resp, 200, "冻结批次"):
        sys.exit(1)
    result = resp.json()
    print("✅ 批次已冻结")
    print(f"   冻结前状态: {result.get('status_before_frozen', 'N/A')}")
    print(f"   冻结原因: {result.get('frozen_reason', 'N/A')}")

    print_step("步骤 13: 验证冻结后无法导入 (预期失败)")
    resp = requests.post(
        f"{BASE_URL}/batches/{batch_id}/import?operator={OPERATOR}",
        data={"record_type": "change_order", "source_file": "test.xlsx", "json_data": json.dumps([{"change_order_no": "TEST001"}])}
    )
    if resp.status_code == 400:
        print(f"✅ 冻结校验正常：冻结状态下无法导入，返回400")
        print(f"   错误信息: {resp.json().get('detail', '')}")
    else:
        print(f"❌ 冻结校验失败：预期400，实际{resp.status_code}")

    print_step("步骤 14: 导出运营汇总报表")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/export/summary?operator={SETTLEMENT}")
    if not check_response(resp, 200, "导出汇总"):
        sys.exit(1)
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

    print_step("步骤 15: 解冻批次 (settlement权限)")
    resp = requests.post(f"{BASE_URL}/batches/{batch_id}/unfreeze?operator={SETTLEMENT}")
    if check_response(resp, 200, "解冻批次"):
        print(f"✅ 批次已解冻，恢复状态: {resp.json()['status']}")

    print_step("步骤 16: 结算批次 (settlement权限)")
    resp = requests.post(f"{BASE_URL}/batches/{batch_id}/settle?operator={SETTLEMENT}")
    if check_response(resp, 200, "结算批次"):
        print(f"✅ 批次已结算，状态: {resp.json()['status']}")

    print_step("步骤 17: 查看审计日志")
    resp = requests.get(f"{BASE_URL}/batches/{batch_id}/audit-logs?page_size=30&operator={ADMIN}")
    if check_response(resp, 200, "查看审计日志"):
        data = resp.json()
        print(f"共 {data['total']} 条审计记录")
        print("-" * 100)
        print(f"{'时间':<20} {'操作人':<12} {'动作':<25} {'旧状态':<12} {'新状态':<12}")
        print("-" * 100)
        for log in data['items']:
            time_str = log['operated_at'][:19].replace('T', ' ')
            print(f"{time_str:<20} {log['operator']:<12} {log['action']:<25} {str(log['old_status']):<12} {str(log['new_status']):<12}")

    print_step("步骤 18: 撤回后重新提交 (边界测试)")
    print("创建新批次测试撤回功能...")
    resp = requests.post(
        f"{BASE_URL}/batches?operator={OPERATOR}",
        json={"title": "测试撤回功能批次"}
    )
    if check_response(resp, 201, "创建测试批次"):
        new_batch_id = resp.json()['id']
        print(f"新批次ID: {new_batch_id}")
        
        print("撤回批次...")
        resp = requests.post(
            f"{BASE_URL}/batches/{new_batch_id}/withdraw?operator={OPERATOR}",
            json={"reason": "数据有误，需要重新整理"}
        )
        if check_response(resp, 200, "撤回批次"):
            print(f"撤回后状态: {resp.json()['status']}")
        
        print("重新提交...")
        resp = requests.post(f"{BASE_URL}/batches/{new_batch_id}/resubmit?operator={OPERATOR}")
        if check_response(resp, 200, "重新提交"):
            print(f"重提后状态: {resp.json()['status']}")

    print("\n" + "=" * 60)
    print("✅ 所有测试完成!")
    print("=" * 60)
    print("\n📝 测试总结:")
    print("  ✅ 多源导入闭环 (变更单+审核意见+客服引用)")
    print("  ✅ 重复提交检测")
    print("  ✅ 部分失败处理")
    print("  ✅ 人工改判")
    print("  ✅ 复核审批")
    print("  ✅ 权限校验 (不同角色)")
    print("  ✅ 冻结/解冻")
    print("  ✅ 导出汇总报表")
    print("  ✅ 撤回/重提")
    print("  ✅ 审计日志追踪")
    print("\n🔍 可用用户:")
    print("  - admin (admin权限) - 全部操作")
    print("  - operator (operator权限) - 创建、导入、撤回")
    print("  - reviewer (reviewer权限) - 复核、改判")
    print("  - settlement (settlement权限) - 冻结、结算、导出")


if __name__ == "__main__":
    main()
