#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("=== 完整导入链路验证 ===")

# 测试1: 合同文本导入
print("\n--- 测试1: 合同文本(sample_contract.txt) ---")
with open("samples/sample_contract.txt", "rb") as f:
    files = {"file": ("sample_contract.txt", f, "text/plain")}
    data = {
        "file_type": "合同PDF",
        "upload_by": "测试员",
        "contract_no": "HT-SAMPLE-001",
        "contract_name": "XX系统开发服务合同"
    }
    r = requests.post(f"{BASE_URL}/import", files=files, data=data)

print(f"状态码: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"成功: {result.get('success')}")
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"成功数: {result.get('success_count')}")
    print(f"失败数: {result.get('failed_count')}")
    if result.get('errors'):
        print(f"错误: {result['errors'][:2]}")
    contract_id = None
    if result.get('success_count', 0) >= 3:
        print("✅ 合同文本解析成功")

# 测试2: 验收邮件导入
print("\n--- 测试2: 验收邮件(sample_acceptance.eml) ---")
with open("samples/sample_acceptance.eml", "rb") as f:
    files = {"file": ("sample_acceptance.eml", f, "message/rfc822")}
    data = {
        "file_type": "验收邮件",
        "upload_by": "测试员",
        "contract_no": "HT-SAMPLE-001"
    }
    r = requests.post(f"{BASE_URL}/import", files=files, data=data)

print(f"状态码: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"成功: {result.get('success')}")
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"成功数: {result.get('success_count')}")
    if result.get('success_count', 0) >= 1:
        print("✅ 验收邮件解析成功")

# 测试3: 付款节点JSON导入
print("\n--- 测试3: 付款节点(sample_payment_nodes.json) ---")
with open("samples/sample_payment_nodes.json", "rb") as f:
    files = {"file": ("sample_payment_nodes.json", f, "application/json")}
    data = {
        "file_type": "付款记录",
        "upload_by": "测试员",
        "contract_no": "HT-SAMPLE-001"
    }
    r = requests.post(f"{BASE_URL}/import", files=files, data=data)

print(f"状态码: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"成功: {result.get('success')}")
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"成功数: {result.get('success_count')}")
    print(f"失败数: {result.get('failed_count')}")
    print(f"死信数: {result.get('dead_letter_count')}")
    if result.get('success_count', 0) >= 2 and result.get('failed_count', 0) >= 1:
        print("✅ 付款节点解析成功（含坏数据进死信）")

# 测试4: 查询合同验证证据链
print("\n--- 测试4: 证据链验证 ---")
r = requests.get(f"{BASE_URL}/contracts", params={"operator": "测试员", "operator_role": "审计人员"})
if r.status_code == 200:
    contracts = r.json()
    for c in contracts:
        if c["contract_no"] == "HT-SAMPLE-001":
            contract_id = c["id"]
            print(f"合同ID: {contract_id}, 名称: {c['contract_name']}")
            print(f"甲方: {c.get('party_a')}, 乙方: {c.get('party_b')}")
            print(f"总金额: {c.get('total_amount')}")

            # 查询付款节点
            r2 = requests.get(f"{BASE_URL}/contracts/{contract_id}/payment-nodes",
                            params={"operator": "测试员", "operator_role": "审计人员"})
            if r2.status_code == 200:
                nodes = r2.json()
                print(f"\n付款节点 ({len(nodes)}个):")
                for node in nodes:
                    print(f"  - {node['node_name']}: {node['planned_amount']}元")
                    print(f"    计划日期: {node.get('planned_date')}")
                    print(f"    原始行号: {node.get('original_line_no')}")
                    print(f"    原始值: {json.dumps(node.get('original_value', {}), ensure_ascii=False)[:80]}")
            break

# 测试5: 只读审计验证
print("\n--- 测试5: 只读审计验证 ---")
requests.get(f"{BASE_URL}/contracts", params={"operator": "审计员", "operator_role": "审计人员"})
requests.get(f"{BASE_URL}/dead-letters", params={"operator": "审计员", "operator_role": "审计人员"})

r = requests.get(f"{BASE_URL}/audit-logs", params={"operator": "审计员", "operator_role": "审计人员"})
if r.status_code == 200:
    logs = r.json()
    readonly_logs = [l for l in logs if l.get('is_readonly_access')]
    print(f"审计日志总数: {len(logs)}")
    print(f"只读审计日志数: {len(readonly_logs)}")
    if len(readonly_logs) > 0:
        print("✅ 只读审计已落地")
        print("最近只读日志:")
        for log in readonly_logs[:3]:
            print(f"  - {log['operate_time']}: {log['action']} by {log['operator']}")

# 测试6: 死信队列验证
print("\n--- 测试6: 死信队列验证 ---")
r = requests.get(f"{BASE_URL}/dead-letters", params={"operator": "测试员", "operator_role": "审计人员"})
if r.status_code == 200:
    dls = r.json()
    print(f"死信数量: {len(dls)}")
    for dl in dls[:2]:
        print(f"  [{dl['status']}] {dl['source_type']}: {dl['error_message'][:50]}...")
    if len(dls) > 0:
        print("✅ 死信队列正常工作")

print("\n=== 验证完成 ===")
