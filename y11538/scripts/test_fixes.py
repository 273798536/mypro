#!/usr/bin/env python3
import json
import requests
import sys

BASE_URL = "http://localhost:5001/api"
BATCH_ID = "QC_BATCH_001"

def test_health():
    print("\n" + "="*60)
    print("测试 1: 健康检查")
    print("="*60)
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, "健康检查失败"
    print("✓ 健康检查通过")

def test_idempotency_same_sign_id():
    print("\n" + "="*60)
    print("测试 2: 同一 sign_id 不同 location 幂等更新")
    print("="*60)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_TEST01",
        "employee_name": "测试员工1",
        "department": "测试部",
        "training_course": "QC测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    sign_data_1 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_001",
        "employee_id": "EMP_TEST01",
        "employee_name": "测试员工1",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "location": "会议室A"
    }
    
    resp1 = requests.post(f"{BASE_URL}/sign", json=sign_data_1)
    print(f"第一次提交: {resp1.json()}")
    assert resp1.status_code == 201, f"第一次提交失败: {resp1.json()}"
    
    sign_data_2 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_001",
        "employee_id": "EMP_TEST01",
        "employee_name": "测试员工1",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "location": "会议室B"
    }
    
    resp2 = requests.post(f"{BASE_URL}/sign", json=sign_data_2)
    result2 = resp2.json()
    print(f"第二次提交(不同location): {result2}")
    assert resp2.status_code == 200, f"第二次提交应该返回200更新，实际返回{resp2.status_code}: {result2}"
    assert result2.get('updated') == True, "应该返回更新标识"
    print("✓ 同一 sign_id 不同 location 幂等更新通过")

def test_cross_date_detection():
    print("\n" + "="*60)
    print("测试 3: 跨日签到检测")
    print("="*60)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_TEST02",
        "employee_name": "测试员工2",
        "department": "测试部",
        "training_course": "QC测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_002",
        "employee_id": "EMP_TEST02",
        "employee_name": "测试员工2",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-16 09:05:00"
    })
    result = resp.json()
    print(f"跨日签到提交: {result}")
    
    anomalies = result.get('anomalies', [])
    print(f"检测到的异常: {anomalies}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    print(f"脏记录数: {dirty_data['count']}")
    
    cross_date_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'CROSS_DATE']
    print(f"跨日脏记录: {len(cross_date_records)}")
    for r in cross_date_records:
        print(f"  - {r['error_message'][:80]}")
    
    if len(cross_date_records) > 0:
        print("✓ 跨日签到检测通过")
    else:
        print("✗ 跨日签到检测失败：未检测到跨日脏记录")

def test_name_change_detection():
    print("\n" + "="*60)
    print("测试 4: 员工姓名变更检测")
    print("="*60)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_TEST03",
        "employee_name": "张三",
        "department": "测试部",
        "training_course": "QC测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_003",
        "employee_id": "EMP_TEST03",
        "employee_name": "张小三",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 09:05:00"
    })
    result = resp.json()
    print(f"改名签到提交: {result}")
    
    anomalies = result.get('anomalies', [])
    print(f"检测到的异常: {anomalies}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    name_change_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'NAME_CHANGE']
    print(f"改名脏记录: {len(name_change_records)}")
    for r in name_change_records:
        print(f"  - {r['error_message'][:80]}")
    
    if len(name_change_records) > 0:
        print("✓ 员工姓名变更检测通过")
    else:
        print("✗ 员工姓名变更检测失败：未检测到改名脏记录")

def test_amount_conflict_detection():
    print("\n" + "="*60)
    print("测试 5: 金额冲突检测")
    print("="*60)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_TEST04",
        "employee_name": "测试员工4",
        "department": "测试部",
        "training_course": "QC测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/refund", json={
        "batch_id": BATCH_ID,
        "refund_id": "REFUND_QC_001",
        "employee_id": "EMP_TEST04",
        "employee_name": "测试员工4",
        "training_course": "QC测试培训",
        "refund_amount": 80.0,
        "refund_time": "2024-03-17 10:00:00",
        "refund_reason": "部分退款"
    })
    result = resp.json()
    print(f"金额冲突退款提交: {result}")
    
    anomalies = result.get('anomalies', [])
    print(f"检测到的异常: {anomalies}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    amount_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'AMOUNT_CONFLICT']
    print(f"金额冲突脏记录: {len(amount_records)}")
    for r in amount_records:
        print(f"  - {r['error_message'][:80]}")
    
    if len(amount_records) > 0:
        print("✓ 金额冲突检测通过")
    else:
        print("✗ 金额冲突检测失败：未检测到金额冲突脏记录")

def test_count_conflict_detection():
    print("\n" + "="*60)
    print("测试 6: 签到数量冲突检测")
    print("="*60)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_TEST05",
        "employee_name": "测试员工5",
        "department": "测试部",
        "training_course": "QC测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_005",
        "employee_id": "EMP_TEST05",
        "employee_name": "测试员工5",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 09:05:00"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_006",
        "employee_id": "EMP_TEST05",
        "employee_name": "测试员工5",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 10:05:00"
    })
    result = resp.json()
    print(f"重复签到提交: {result}")
    
    anomalies = result.get('anomalies', [])
    print(f"检测到的异常: {anomalies}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    count_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'COUNT_CONFLICT']
    print(f"数量冲突脏记录: {len(count_records)}")
    for r in count_records:
        print(f"  - {r['error_message'][:80]}")
    
    if len(count_records) > 0:
        print("✓ 签到数量冲突检测通过")
    else:
        print("✗ 签到数量冲突检测失败：未检测到数量冲突脏记录")

def test_dirty_fix_applies_to_fact():
    print("\n" + "="*60)
    print("测试 7: 脏记录修复回写事实数据")
    print("="*60)
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_QC_007",
        "employee_id": "EMP_TEST01",
        "employee_name": "错误姓名",
        "training_course": "QC测试培训",
        "sign_time": "2024-03-15 09:05:00"
    })
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    name_change_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'NAME_CHANGE' and not d['is_fixed']]
    
    if name_change_records:
        dirty_id = name_change_records[0]['id']
        print(f"找到待修复脏记录 ID: {dirty_id}")
        
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "employee_name": "测试员工1"
            }
        })
        fix_result = fix_resp.json()
        print(f"修复结果: {fix_result}")
        
        dirty_resp2 = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
        dirty_data2 = dirty_resp2.json()
        fixed_record = next((d for d in dirty_data2['records'] if d['id'] == dirty_id), None)
        
        if fixed_record and fixed_record['is_fixed']:
            print("✓ 脏记录修复回写事实数据通过")
        else:
            print("✗ 脏记录修复失败")
    else:
        print("⚠ 未找到待修复的改名脏记录，跳过此测试")

def test_reconciliation():
    print("\n" + "="*60)
    print("测试 8: 对账汇总")
    print("="*60)
    
    resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    result = resp.json()
    
    print(f"报名人数: {result.get('total_registrations')}")
    print(f"签到人数: {result.get('signed_count')}")
    print(f"未签到人数: {result.get('unsigned_count')}")
    print(f"脏记录数: {result.get('dirty_count')}")
    print(f"未修复脏记录: {result.get('unfixed_dirty_count')}")
    
    print("✓ 对账汇总完成")

def test_export():
    print("\n" + "="*60)
    print("测试 9: Excel 导出")
    print("="*60)
    
    resp = requests.get(f"{BASE_URL}/export/{BATCH_ID}")
    result = resp.json()
    
    print(f"导出结果: {result}")
    print("✓ Excel 导出完成")

def test_history():
    print("\n" + "="*60)
    print("测试 10: 历史记录")
    print("="*60)
    
    resp = requests.get(f"{BASE_URL}/history")
    result = resp.json()
    
    print(f"历史记录数: {result.get('count')}")
    for h in result.get('history', [])[:3]:
        print(f"  - {h['batch_id']}: 报名{h['total_registrations']}人, 签到{h['signed_count']}人, 脏记录{h['dirty_count']}条")
    
    print("✓ 历史记录查询完成")

def main():
    print("="*60)
    print("  企业培训签到验收回放链路 - 核心功能修复测试")
    print("="*60)
    
    try:
        test_health()
        test_idempotency_same_sign_id()
        test_cross_date_detection()
        test_name_change_detection()
        test_amount_conflict_detection()
        test_count_conflict_detection()
        test_dirty_fix_applies_to_fact()
        test_reconciliation()
        test_export()
        test_history()
        
        print("\n" + "="*60)
        print("  所有测试完成！")
        print("="*60)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
