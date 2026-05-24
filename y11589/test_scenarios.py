#!/usr/bin/env python3
import os
import sys
import json
import requests
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_1_duplicate_submit():
    print_section("测试1: 重复提交检测")
    contract_data = {
        "contract_no": "HT-TEST-001",
        "contract_name": "重复提交测试合同",
        "party_a": "测试甲方",
        "party_b": "测试乙方",
        "total_amount": 100000,
        "created_by": "测试员",
        "created_by_role": "合同管理员"
    }
    
    print("第一次提交...")
    r1 = requests.post(f"{BASE_URL}/contracts", json=contract_data)
    print(f"第一次提交: 状态码={r1.status_code}, {r1.json().get('contract_no', r1.json())}")
    
    print("第二次提交（同一合同号）...")
    r2 = requests.post(f"{BASE_URL}/contracts", json=contract_data)
    print(f"第二次提交: 状态码={r2.status_code}, 消息={r2.json().get('detail')}")
    
    return r1.status_code == 201 and r2.status_code == 400


def test_2_withdraw_resubmit():
    print_section("测试2: 撤回后再提交流程")
    
    r = requests.get(f"{BASE_URL}/contracts")
    draft_contracts = [c for c in r.json() if c['status'] == '草稿']
    
    if not draft_contracts:
        print("没有草稿状态的合同，跳过测试")
        return False
    
    contract_id = draft_contracts[0]['id']
    contract_no = draft_contracts[0]['contract_no']
    print(f"测试合同: {contract_no} (ID={contract_id})")
    
    print("步骤1: 提交合同 (草稿 -> 已提交)")
    r1 = requests.post(f"{BASE_URL}/contracts/{contract_id}/status", json={
        "target_status": "已提交",
        "operator": "测试员",
        "operator_role": "合同管理员",
        "reason": "首次提交"
    })
    print(f"提交结果: 状态码={r1.status_code}, 新状态={r1.json().get('status') if r1.status_code == 200 else r1.json()}")
    
    print("步骤2: 撤回提交 (已提交 -> 草稿)")
    r2 = requests.post(f"{BASE_URL}/contracts/{contract_id}/status", json={
        "target_status": "草稿",
        "operator": "测试员",
        "operator_role": "合同管理员",
        "reason": "发现错误，撤回修改"
    })
    print(f"撤回结果: 状态码={r2.status_code}, 新状态={r2.json().get('status') if r2.status_code == 200 else r2.json()}")
    
    print("步骤3: 重新提交 (草稿 -> 已提交)")
    r3 = requests.post(f"{BASE_URL}/contracts/{contract_id}/status", json={
        "target_status": "已提交",
        "operator": "测试员",
        "operator_role": "合同管理员",
        "reason": "修改后重新提交"
    })
    print(f"重新提交结果: 状态码={r3.status_code}, 新状态={r3.json().get('status') if r3.status_code == 200 else r3.json()}")
    
    return r1.status_code == 200 and r2.status_code == 200 and r3.status_code == 200


def test_3_partial_import_failure():
    print_section("测试3: 部分失败导入")
    
    test_data = {
        "payment_nodes": [
            {"node_name": "正常节点1", "node_no": "N001", "planned_amount": 10000},
            {"node_name": "正常节点2", "node_no": "N002", "planned_amount": 20000},
            {"missing_field": "这是坏数据，缺少node_name"},
            {"node_name": "正常节点3", "node_no": "N003", "planned_amount": 30000}
        ]
    }
    
    with open("/tmp/test_partial.json", "w", encoding="utf-8") as f:
        json.dump(test_data, f)
    
    with open("/tmp/test_partial.json", "rb") as f:
        files = {"file": ("test_partial.json", f, "application/json")}
        data = {
            "file_type": "付款记录",
            "upload_by": "测试员",
            "contract_no": "HT-TEST-001",
            "contract_name": "部分导入测试合同"
        }
        r = requests.post(f"{BASE_URL}/import", files=files, data=data)
    
    result = r.json()
    print(f"导入结果: 状态码={r.status_code}")
    print(f"  状态={result.get('status')}")
    print(f"  解析数={result.get('parsed_count')}, 成功={result.get('success_count')}, 失败={result.get('failed_count')}")
    print(f"  错误信息={result.get('errors')}")
    
    return result.get('status') == '部分成功' and result.get('failed_count', 0) > 0


def test_4_manual_judgment():
    print_section("测试4: 人工改判")
    
    r = requests.get(f"{BASE_URL}/contracts")
    contracts = r.json()
    if not contracts:
        print("没有合同，跳过测试")
        return False
    
    contract_id = contracts[0]['id']
    
    judgment_data = {
        "contract_id": contract_id,
        "target_type": "payment_node",
        "target_id": 1,
        "judgment_type": "付款时间调整",
        "judgment_reason": "根据补充协议BC-2024-002-001，付款时间延后25天",
        "judgment_result": {
            "new_date": "2024-07-15",
            "old_date": "2024-06-20",
            "delay_days": 25
        },
        "judged_by": "法务主管",
        "judged_by_role": "法务人员",
        "original_evidence": {
            "source": "补充协议扫描件",
            "page": "第3页第2条",
            "signatory": "双方授权代表"
        },
        "remarks": "此变更需要同步到付款提醒系统"
    }
    
    r = requests.post(f"{BASE_URL}/manual-judgments", json=judgment_data)
    print(f"人工改判结果: 状态码={r.status_code}")
    if r.status_code == 201:
        result = r.json()
        print(f"  改判ID={result['id']}")
        print(f"  改判类型={result['judgment_type']}")
        print(f"  操作人={result['judged_by']} ({result['judged_by_role']})")
    
    return r.status_code == 201


def test_5_freeze_before_export():
    print_section("测试5: 导出前冻结")
    
    r = requests.get(f"{BASE_URL}/contracts")
    contracts = [c for c in r.json() if not c.get('is_frozen') and c.get('status') == '二次确认']
    
    if not contracts:
        print("查找可冻结的合同 (已确认状态)...")
        contracts = [c for c in r.json() if not c.get('is_frozen') and c.get('status') == '已提交']
    
    if not contracts:
        print("没有可冻结的合同，跳过测试")
        return False
    
    contract_id = contracts[0]['id']
    contract_no = contracts[0]['contract_no']
    print(f"冻结合同: {contract_no} (ID={contract_id})")
    
    print("步骤1: 冻结合同")
    r1 = requests.post(f"{BASE_URL}/contracts/{contract_id}/freeze", json={
        "frozen_by": "审计员",
        "frozen_by_role": "审计人员",
        "reason": "导出审计前冻结"
    })
    print(f"冻结结果: 状态码={r1.status_code}, is_frozen={r1.json().get('is_frozen') if r1.status_code == 200 else r1.json()}")
    
    print("步骤2: 尝试修改已冻结合同（应该失败）")
    r2 = requests.put(f"{BASE_URL}/contracts/{contract_id}", json={
        "contract_name": "尝试修改冻结合同",
        "updated_by": "测试员",
        "updated_by_role": "合同管理员"
    })
    print(f"修改冻结合同结果: 状态码={r2.status_code}, 消息={r2.json().get('detail')}")
    
    print("步骤3: 执行导出")
    r3 = requests.post(f"{BASE_URL}/export", json={
        "export_type": "contracts",
        "contract_ids": [contract_id],
        "mask_sensitive": True,
        "export_by": "审计员",
        "export_by_role": "审计人员",
        "remark": "审计导出"
    })
    print(f"导出结果: 状态码={r3.status_code}")
    if r3.status_code == 200:
        result = r3.json()
        print(f"  文件名={result['file_name']}")
        print(f"  记录数={result['record_count']}")
        print(f"  脱敏导出={True}")
    
    return r1.status_code == 200 and r2.status_code == 400 and r3.status_code == 200


def test_6_role_view_and_analysis():
    print_section("测试6: 角色视图与变更分析")
    
    print("业务负责人视图:")
    r1 = requests.get(f"{BASE_URL}/role-view/业务负责人")
    if r1.status_code == 200:
        data = r1.json()
        print(f"  待处理数={data['pending_count']}")
        print(f"  合同总数={data['total_count']}")
        print(f"  争议数={data['disputed_count']}")
        print(f"  最近变更数={len(data['recent_changes'])}")
    
    print("\n法务人员视图:")
    r2 = requests.get(f"{BASE_URL}/role-view/法务人员")
    if r2.status_code == 200:
        data = r2.json()
        print(f"  待处理数={data['pending_count']}")
    
    r = requests.get(f"{BASE_URL}/contracts")
    contracts = r.json()
    if contracts:
        contract_id = contracts[0]['id']
        print(f"\n合同 {contracts[0]['contract_no']} 变更分析:")
        r3 = requests.get(f"{BASE_URL}/contracts/{contract_id}/change-analysis")
        if r3.status_code == 200:
            data = r3.json()
            print(f"  总变更数={data['total_changes']}")
            print(f"  人工改判数={data['manual_revisions']}")
            print(f"  变更类型分布={data['change_types']}")
            print(f"  敏感字段变更数={len(data['sensitive_field_changes'])}")
            print(f"  版本数={len(data['version_history'])}")
    
    return r1.status_code == 200 and r2.status_code == 200


def test_7_audit_trail():
    print_section("测试7: 审计日志与证据链")
    
    r = requests.get(f"{BASE_URL}/audit-logs", params={"limit": 10})
    if r.status_code == 200:
        logs = r.json()
        print(f"最近 {len(logs)} 条审计日志:")
        for log in logs[:5]:
            print(f"  [{log['operate_time']}] {log['operator']}({log['operator_role']}) - {log['action']}")
    
    r = requests.get(f"{BASE_URL}/contracts")
    contracts = r.json()
    if contracts:
        contract_id = contracts[0]['id']
        print(f"\n合同 {contracts[0]['contract_no']} 的变更记录:")
        r2 = requests.get(f"{BASE_URL}/contracts/{contract_id}/changes")
        if r2.status_code == 200:
            changes = r2.json()
            print(f"共 {len(changes)} 条变更记录")
            for change in changes[:3]:
                print(f"  [{change['changed_at']}] {change['change_type']} - {change['change_reason']}")
                print(f"    变更人: {change['changed_by']}({change['changed_by_role']})")
                if change.get('field_name'):
                    print(f"    字段: {change['field_name']}")
    
    print("\n人工改判记录查询:")
    r3 = requests.get(f"{BASE_URL}/manual-revisions")
    if r3.status_code == 200:
        revisions = r3.json()
        print(f"共 {len(revisions)} 条人工改判记录")
    
    return r.status_code == 200


def run_all_tests():
    results = {}
    
    try:
        results['重复提交检测'] = test_1_duplicate_submit()
    except Exception as e:
        print(f"测试1异常: {e}")
        results['重复提交检测'] = False
    
    try:
        results['撤回后再提交'] = test_2_withdraw_resubmit()
    except Exception as e:
        print(f"测试2异常: {e}")
        results['撤回后再提交'] = False
    
    try:
        results['部分失败导入'] = test_3_partial_import_failure()
    except Exception as e:
        print(f"测试3异常: {e}")
        results['部分失败导入'] = False
    
    try:
        results['人工改判'] = test_4_manual_judgment()
    except Exception as e:
        print(f"测试4异常: {e}")
        results['人工改判'] = False
    
    try:
        results['导出前冻结'] = test_5_freeze_before_export()
    except Exception as e:
        print(f"测试5异常: {e}")
        results['导出前冻结'] = False
    
    try:
        results['角色视图与变更分析'] = test_6_role_view_and_analysis()
    except Exception as e:
        print(f"测试6异常: {e}")
        results['角色视图与变更分析'] = False
    
    try:
        results['审计日志与证据链'] = test_7_audit_trail()
    except Exception as e:
        print(f"测试7异常: {e}")
        results['审计日志与证据链'] = False
    
    print_section("测试结果汇总")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    print(f"\n总计: {passed}/{total} 测试通过")


if __name__ == "__main__":
    print("法务合同履约权限追责台账API - 边界情况测试")
    print("请确保服务已启动: uvicorn app.main:app --reload")
    
    try:
        requests.get("http://localhost:8000/health")
    except:
        print("\n错误: 无法连接到服务，请先启动服务！")
        sys.exit(1)
    
    run_all_tests()
