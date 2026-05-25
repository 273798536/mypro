#!/usr/bin/env python3
import json
import requests
import sys
import os

BASE_URL = "http://localhost:5002/api"
BATCH_ID = "COUNT_CONFLICT_TEST_001"

def clear_database():
    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'training_sign.db')
    if os.path.exists(db_path):
        os.remove(db_path)
    print("数据库已清理")

def test_health():
    print("\n" + "="*70)
    print("测试 1: 健康检查")
    print("="*70)
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, "健康检查失败"
    print("✓ 健康检查通过")

def test_idempotent_update_no_count_conflict():
    print("\n" + "="*70)
    print("测试 2: 同一 sign_id 幂等更新不生成 COUNT_CONFLICT")
    print("="*70)
    
    print("\n步骤 1: 提交报名表")
    resp = requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CC_001",
        "employee_name": "测试员工A",
        "department": "测试部",
        "training_course": "数量冲突测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    print(f"  报名表提交: {resp.status_code}")
    
    print("\n步骤 2: 第一次提交签到")
    sign_data_1 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CC_001",
        "employee_id": "EMP_CC_001",
        "employee_name": "测试员工A",
        "training_course": "数量冲突测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "qr_code": "QR_CC_001_V1",
        "location": "会议室A",
        "device_info": "iPhone 14"
    }
    resp1 = requests.post(f"{BASE_URL}/sign", json=sign_data_1)
    result1 = resp1.json()
    print(f"  第一次提交 status={resp1.status_code}")
    print(f"  消息: {result1.get('message')}")
    print(f"  检测到的异常: {result1.get('anomalies')}")
    
    assert resp1.status_code == 201, f"第一次提交应该返回201，实际{resp1.status_code}"
    
    anomalies_1 = result1.get('anomalies', [])
    count_conflicts_1 = [a for a in anomalies_1 if a.get('dirty_type') == 'COUNT_CONFLICT']
    print(f"\n  第一次提交 COUNT_CONFLICT 脏记录: {len(count_conflicts_1)} 条 (预期: 0)")
    assert len(count_conflicts_1) == 0, "第一次提交不应该有 COUNT_CONFLICT"
    
    print("\n步骤 3: 第二次提交同一 sign_id（更新 location）")
    sign_data_2 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CC_001",
        "employee_id": "EMP_CC_001",
        "employee_name": "测试员工A",
        "training_course": "数量冲突测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "qr_code": "QR_CC_001_V2",
        "location": "会议室B",
        "device_info": "华为Mate 60"
    }
    resp2 = requests.post(f"{BASE_URL}/sign", json=sign_data_2)
    result2 = resp2.json()
    print(f"  第二次提交 status={resp2.status_code}")
    print(f"  消息: {result2.get('message')}")
    print(f"  updated={result2.get('updated')}")
    print(f"  检测到的异常: {result2.get('anomalies')}")
    
    assert resp2.status_code == 200, f"第二次提交应该返回200，实际{resp2.status_code}"
    assert result2.get('updated') == True, "应该标记为更新"
    
    anomalies_2 = result2.get('anomalies', [])
    count_conflicts_2 = [a for a in anomalies_2 if a.get('dirty_type') == 'COUNT_CONFLICT']
    print(f"\n  第二次提交 COUNT_CONFLICT 脏记录: {len(count_conflicts_2)} 条 (预期: 0)")
    
    if len(count_conflicts_2) > 0:
        print(f"  ✗ 错误: 幂等更新时生成了 COUNT_CONFLICT 脏记录")
        for a in count_conflicts_2:
            print(f"    - {a.get('error_message')}")
        sys.exit(1)
    else:
        print("  ✓ 幂等更新时没有生成 COUNT_CONFLICT 脏记录")
    
    print("\n步骤 4: 第三次提交同一 sign_id（更新 sign_time）")
    sign_data_3 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CC_001",
        "employee_id": "EMP_CC_001",
        "employee_name": "测试员工A",
        "training_course": "数量冲突测试培训",
        "sign_time": "2024-03-15 09:10:00",
        "qr_code": "QR_CC_001_V3",
        "location": "会议室C",
        "device_info": "小米14"
    }
    resp3 = requests.post(f"{BASE_URL}/sign", json=sign_data_3)
    result3 = resp3.json()
    print(f"\n  第三次提交 status={resp3.status_code}")
    print(f"  消息: {result3.get('message')}")
    print(f"  updated={result3.get('updated')}")
    print(f"  检测到的异常: {result3.get('anomalies')}")
    
    assert resp3.status_code == 200, f"第三次提交应该返回200，实际{resp3.status_code}"
    
    anomalies_3 = result3.get('anomalies', [])
    count_conflicts_3 = [a for a in anomalies_3 if a.get('dirty_type') == 'COUNT_CONFLICT']
    print(f"\n  第三次提交 COUNT_CONFLICT 脏记录: {len(count_conflicts_3)} 条 (预期: 0)")
    
    if len(count_conflicts_3) > 0:
        print(f"  ✗ 错误: 第三次幂等更新时生成了 COUNT_CONFLICT 脏记录")
        sys.exit(1)
    else:
        print("  ✓ 第三次幂等更新时也没有生成 COUNT_CONFLICT 脏记录")
    
    print("\n步骤 5: 查询脏记录接口验证")
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    print(f"  脏记录总数: {dirty_data.get('count')}")
    
    count_conflict_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'COUNT_CONFLICT' 
        and d['raw_data'].get('sign_id') == 'SIGN_CC_001'
    ]
    print(f"  SIGN_CC_001 相关 COUNT_CONFLICT 脏记录: {len(count_conflict_records)} 条 (预期: 0)")
    
    if len(count_conflict_records) > 0:
        print(f"  ✗ 错误: 脏记录表中有 {len(count_conflict_records)} 条误判的 COUNT_CONFLICT")
        for d in count_conflict_records:
            print(f"    - {d['error_message']}")
        sys.exit(1)
    else:
        print("  ✓ 脏记录表中没有误判的 COUNT_CONFLICT")
    
    print("\n✓ 同一 sign_id 幂等更新不生成 COUNT_CONFLICT 测试通过")

def test_different_sign_id_count_conflict():
    print("\n" + "="*70)
    print("测试 3: 不同 sign_id 同一员工仍能检测到 COUNT_CONFLICT")
    print("="*70)
    
    print("\n步骤 1: 提交报名表")
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CC_002",
        "employee_name": "测试员工B",
        "department": "测试部",
        "training_course": "数量冲突测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    print("\n步骤 2: 第一次提交签到 (SIGN_CC_002)")
    resp1 = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CC_002",
        "employee_id": "EMP_CC_002",
        "employee_name": "测试员工B",
        "training_course": "数量冲突测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "location": "会议室A"
    })
    result1 = resp1.json()
    print(f"  第一次提交 anomalies: {result1.get('anomalies')}")
    
    count_conflicts_1 = [a for a in result1.get('anomalies', []) if a.get('dirty_type') == 'COUNT_CONFLICT']
    print(f"  第一次提交 COUNT_CONFLICT: {len(count_conflicts_1)} (预期: 0)")
    assert len(count_conflicts_1) == 0
    
    print("\n步骤 3: 第二次提交不同 sign_id (SIGN_CC_003) 同一员工")
    resp2 = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CC_003",
        "employee_id": "EMP_CC_002",
        "employee_name": "测试员工B",
        "training_course": "数量冲突测试培训",
        "sign_time": "2024-03-15 10:05:00",
        "location": "会议室B"
    })
    result2 = resp2.json()
    print(f"  第二次提交 status={resp2.status_code}")
    print(f"  消息: {result2.get('message')}")
    print(f"  检测到的异常: {result2.get('anomalies')}")
    
    count_conflicts_2 = [a for a in result2.get('anomalies', []) if a.get('dirty_type') == 'COUNT_CONFLICT']
    print(f"\n  第二次提交 COUNT_CONFLICT: {len(count_conflicts_2)} (预期: 1)")
    
    if len(count_conflicts_2) > 0:
        print(f"  ✓ 正确检测到不同 sign_id 的数量冲突: {count_conflicts_2[0].get('error_message')}")
    else:
        print(f"  ✗ 错误: 不同 sign_id 同一员工应该检测到 COUNT_CONFLICT")
        sys.exit(1)
    
    print("\n步骤 4: 验证脏记录接口")
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    count_conflict_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'COUNT_CONFLICT' 
        and d['raw_data'].get('sign_id') == 'SIGN_CC_003'
    ]
    print(f"  SIGN_CC_003 相关 COUNT_CONFLICT 脏记录: {len(count_conflict_records)} 条 (预期: 1)")
    
    if len(count_conflict_records) > 0:
        print(f"  ✓ 不同 sign_id 的 COUNT_CONFLICT 正确写入脏记录表")
    else:
        print(f"  ✗ 错误: 不同 sign_id 的 COUNT_CONFLICT 未写入脏记录表")
        sys.exit(1)
    
    print("\n✓ 不同 sign_id 同一员工仍能检测到 COUNT_CONFLICT 测试通过")

def test_reconcile_cleanliness():
    print("\n" + "="*70)
    print("测试 4: 对账统计不被幂等更新污染")
    print("="*70)
    
    print("\n步骤 1: 执行对账")
    recon_resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    recon_data = recon_resp.json()
    
    print(f"  报名人数: {recon_data.get('total_registrations')}")
    print(f"  签到人数: {recon_data.get('signed_count')}")
    print(f"  脏记录数: {recon_data.get('dirty_count')}")
    print(f"  未修复脏记录: {recon_data.get('unfixed_dirty_count')}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    total_dirty = dirty_data.get('count')
    unfixed_dirty = sum(1 for d in dirty_data['records'] if not d['is_fixed'])
    
    print(f"\n  脏记录接口统计: 总数={total_dirty}, 未修复={unfixed_dirty}")
    
    print(f"\n  对账 dirty_count 与脏记录接口一致性:")
    print(f"    对账: {recon_data.get('dirty_count')}, 接口: {total_dirty}")
    if recon_data.get('dirty_count') == total_dirty:
        print(f"    ✓ 一致")
    else:
        print(f"    ✗ 不一致")
        sys.exit(1)
    
    print(f"\n  对账 unfixed_dirty_count 与脏记录接口一致性:")
    print(f"    对账: {recon_data.get('unfixed_dirty_count')}, 接口: {unfixed_dirty}")
    if recon_data.get('unfixed_dirty_count') == unfixed_dirty:
        print(f"    ✓ 一致")
    else:
        print(f"    ✗ 不一致")
        sys.exit(1)
    
    print(f"\n  验证 SIGN_CC_001 相关脏记录:")
    cc_001_dirty = [
        d for d in dirty_data['records'] 
        if d['raw_data'].get('sign_id') == 'SIGN_CC_001'
        and d['dirty_type'] == 'COUNT_CONFLICT'
    ]
    print(f"    SIGN_CC_001 相关 COUNT_CONFLICT: {len(cc_001_dirty)} 条 (预期: 0)")
    if len(cc_001_dirty) == 0:
        print(f"    ✓ 正确，没有误判的脏记录")
    else:
        print(f"    ✗ 有误判的脏记录污染了统计")
        sys.exit(1)
    
    print("\n✓ 对账统计不被幂等更新污染测试通过")

def main():
    print("="*70)
    print("  COUNT_CONFLICT 检测逻辑修复专项测试")
    print("="*70)
    print(f"测试批次: {BATCH_ID}")
    print(f"服务地址: {BASE_URL}")
    
    try:
        test_health()
        test_idempotent_update_no_count_conflict()
        test_different_sign_id_count_conflict()
        test_reconcile_cleanliness()
        
        print("\n" + "="*70)
        print("  所有 COUNT_CONFLICT 修复测试通过！")
        print("="*70)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
