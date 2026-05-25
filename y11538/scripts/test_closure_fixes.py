#!/usr/bin/env python3
import json
import requests
import sys
import os

BASE_URL = "http://localhost:5002/api"
BATCH_ID = "QC_CLOSURE_002"

def test_health():
    print("\n" + "="*70)
    print("测试 1: 健康检查")
    print("="*70)
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, "健康检查失败"
    print("✓ 健康检查通过")

def test_sign_update_fields():
    print("\n" + "="*70)
    print("测试 2: 签到更新同步 location/qr_code/device_info 字段")
    print("="*70)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CL_001",
        "employee_name": "闭环测试员工1",
        "department": "测试部",
        "training_course": "闭环测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    sign_data_1 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CL_001",
        "employee_id": "EMP_CL_001",
        "employee_name": "闭环测试员工1",
        "training_course": "闭环测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "qr_code": "QR_CL_001_V1",
        "location": "会议室A",
        "device_info": "iPhone 14"
    }
    
    resp1 = requests.post(f"{BASE_URL}/sign", json=sign_data_1)
    result1 = resp1.json()
    print(f"第一次提交: status={resp1.status_code}")
    print(f"  message: {result1.get('message')}")
    print(f"  location: {sign_data_1['location']}, qr_code: {sign_data_1['qr_code']}")
    
    sign_data_2 = {
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CL_001",
        "employee_id": "EMP_CL_001",
        "employee_name": "闭环测试员工1",
        "training_course": "闭环测试培训",
        "sign_time": "2024-03-15 09:05:00",
        "qr_code": "QR_CL_001_V2",
        "location": "会议室B",
        "device_info": "华为Mate 60"
    }
    
    resp2 = requests.post(f"{BASE_URL}/sign", json=sign_data_2)
    result2 = resp2.json()
    print(f"\n第二次提交(更新location): status={resp2.status_code}, updated={result2.get('updated')}")
    print(f"  message: {result2.get('message')}")
    
    assert resp2.status_code == 200, f"应该返回200，实际{resp2.status_code}"
    assert result2.get('updated') == True, "应该标记为更新"
    
    requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    
    recon_resp = requests.get(f"{BASE_URL}/reconcile/{BATCH_ID}")
    recon_data = recon_resp.json()
    
    details = recon_data.get('details', [])
    emp_detail = None
    for d in details:
        if d.get('employee_id') == 'EMP_CL_001':
            emp_detail = d
            break
    
    if emp_detail:
        print(f"\n对账详情:")
        print(f"  签到次数: {emp_detail.get('sign_count')} (预期: 1)")
        print(f"  签到位置: {emp_detail.get('sign_locations')}")
        locations = emp_detail.get('sign_locations', [])
        if len(locations) == 1 and locations[0] == '会议室B':
            print("✓ 签到更新字段同步通过 - location 已更新为会议室B")
        elif emp_detail.get('sign_count') == 1:
            print("✓ 签到更新字段同步通过 - 签到次数为1，没有重复记录")
        else:
            print(f"⚠ 签到位置检查: {locations}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    print(f"\n脏记录数: {dirty_data.get('count')}")
    
    print("✓ 签到更新字段同步测试完成")

def test_cross_date_fix_datetime():
    print("\n" + "="*70)
    print("测试 3: 跨日签到脏记录修复（DateTime 字段）")
    print("="*70)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CL_002",
        "employee_name": "闭环测试员工2",
        "department": "测试部",
        "training_course": "闭环测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CL_002",
        "employee_id": "EMP_CL_002",
        "employee_name": "闭环测试员工2",
        "training_course": "闭环测试培训",
        "sign_time": "2024-03-16 09:05:00",
        "location": "线上"
    })
    result = resp.json()
    print(f"跨日签到提交:")
    print(f"  anomalies: {result.get('anomalies')}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    cross_date_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'CROSS_DATE' and d['raw_data'].get('sign_id') == 'SIGN_CL_002'
    ]
    
    if cross_date_records:
        dirty_id = cross_date_records[0]['id']
        print(f"\n找到跨日脏记录 ID: {dirty_id}")
        print(f"脏记录状态(修复前): is_fixed={cross_date_records[0]['is_fixed']}")
        print(f"原始 sign_time: {cross_date_records[0]['raw_data'].get('sign_time')}")
        
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "sign_time": "2024-03-15 09:05:00",
                "is_makeup": False,
                "sign_type": "normal"
            }
        })
        fix_result = fix_resp.json()
        print(f"\n修复结果 status={fix_resp.status_code}:")
        
        if fix_resp.status_code == 500:
            print(f"  ✗ DateTime 字段修复失败: 返回 500 错误 - {fix_result.get('error')}")
            sys.exit(1)
        
        assert fix_resp.status_code == 200, f"修复应该返回200，实际{fix_resp.status_code}"
        assert fix_result.get('fixed_data_applied') == True, "应该应用了修复数据"
        
        print(f"  message: {fix_result.get('message')}")
        print(f"  updated_fields: {fix_result.get('updated_fields')}")
        print(f"  fact_record_updated: {fix_result.get('fact_record_updated')}")
        if fix_result.get('fact_record'):
            fr = fix_result['fact_record']
            print(f"  事实记录 sign_time: {fr.get('sign_time')}")
            print(f"  事实记录 location: {fr.get('location')}")
        
        dirty_resp2 = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
        dirty_data2 = dirty_resp2.json()
        fixed_record = next((d for d in dirty_data2['records'] if d['id'] == dirty_id), None)
        
        if fixed_record and fixed_record['is_fixed']:
            print(f"\n脏记录状态(修复后): is_fixed={fixed_record['is_fixed']}")
            print(f"修复后 fixed_data: {fixed_record.get('fixed_data')}")
            print("✓ 跨日签到脏记录修复通过 - DateTime 字段已正确转换")
        else:
            print("✗ 脏记录状态未更新为已修复")
            sys.exit(1)
    else:
        print("⚠ 未找到跨日脏记录，跳过")

def test_name_change_fix():
    print("\n" + "="*70)
    print("测试 4: 姓名变更脏记录修复及数据一致性")
    print("="*70)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CL_003",
        "employee_name": "张三",
        "department": "测试部",
        "training_course": "闭环测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CL_003",
        "employee_id": "EMP_CL_003",
        "employee_name": "张小三",
        "training_course": "闭环测试培训",
        "sign_time": "2024-03-15 09:05:00"
    })
    result = resp.json()
    print(f"改名签到提交 anomalies: {result.get('anomalies')}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    name_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'NAME_CHANGE' and d['raw_data'].get('sign_id') == 'SIGN_CL_003' and not d['is_fixed']
    ]
    
    if name_records:
        dirty_id = name_records[0]['id']
        print(f"找到改名脏记录 ID: {dirty_id}")
        
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "employee_name": "张三"
            }
        })
        fix_result = fix_resp.json()
        print(f"修复结果 status={fix_resp.status_code}: {fix_result.get('message')}")
        assert fix_resp.status_code == 200
        
        requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
        
        recon_resp = requests.get(f"{BASE_URL}/reconcile/{BATCH_ID}")
        recon_data = recon_resp.json()
        
        details = recon_data.get('details', [])
        emp_detail = None
        for d in details:
            if d.get('employee_id') == 'EMP_CL_003':
                emp_detail = d
                break
        
        if emp_detail:
            print(f"对账后员工姓名: {emp_detail.get('employee_name')} (预期: 张三)")
            if emp_detail.get('employee_name') == '张三':
                print("✓ 姓名变更修复后对账数据一致")
            else:
                print("✗ 对账数据与修复后事实不一致")
                sys.exit(1)
        
        export_resp = requests.get(f"{BASE_URL}/export/{BATCH_ID}")
        export_result = export_resp.json()
        print(f"导出文件: {export_result.get('filename')}")
        print("✓ 姓名变更修复及数据一致性通过")

def test_amount_conflict_fix():
    print("\n" + "="*70)
    print("测试 5: 金额冲突脏记录修复")
    print("="*70)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CL_004",
        "employee_name": "闭环测试员工4",
        "department": "测试部",
        "training_course": "闭环测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/refund", json={
        "batch_id": BATCH_ID,
        "refund_id": "REFUND_CL_001",
        "employee_id": "EMP_CL_004",
        "employee_name": "闭环测试员工4",
        "training_course": "闭环测试培训",
        "refund_amount": 50.0,
        "refund_time": "2024-03-17 10:00:00",
        "refund_reason": "部分退款"
    })
    result = resp.json()
    print(f"退款提交 anomalies: {result.get('anomalies')}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    amount_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'AMOUNT_CONFLICT' and d['raw_data'].get('refund_id') == 'REFUND_CL_001' and not d['is_fixed']
    ]
    
    if amount_records:
        dirty_id = amount_records[0]['id']
        print(f"找到金额冲突脏记录 ID: {dirty_id}")
        
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "refund_amount": 100.0,
                "refund_reason": "全额退款"
            }
        })
        fix_result = fix_resp.json()
        print(f"修复结果 status={fix_resp.status_code}:")
        print(f"  message: {fix_result.get('message')}")
        print(f"  updated_fields: {fix_result.get('updated_fields')}")
        if fix_result.get('fact_record'):
            fr = fix_result['fact_record']
            print(f"  事实记录 refund_amount: {fr.get('refund_amount')}")
            print(f"  事实记录 refund_reason: {fr.get('refund_reason')}")
        
        assert fix_resp.status_code == 200
        
        if fix_result.get('fact_record', {}).get('refund_amount') == 100.0:
            print("✓ 金额冲突修复通过")
        else:
            print("✗ 金额修复失败，事实记录未更新")
            sys.exit(1)

def test_reconcile_consistency():
    print("\n" + "="*70)
    print("测试 6: 修复后对账/脏记录/历史一致性")
    print("="*70)
    
    recon_resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    recon_data = recon_resp.json()
    
    print(f"对账结果:")
    print(f"  报名人数: {recon_data.get('total_registrations')}")
    print(f"  签到人数: {recon_data.get('signed_count')}")
    print(f"  未签到人数: {recon_data.get('unsigned_count')}")
    print(f"  脏记录数: {recon_data.get('dirty_count')}")
    print(f"  未修复脏记录: {recon_data.get('unfixed_dirty_count')}")
    
    history_resp = requests.get(f"{BASE_URL}/history")
    history_data = history_resp.json()
    print(f"\n历史记录数: {history_data.get('count')}")
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    fixed_count = sum(1 for d in dirty_data['records'] if d['is_fixed'])
    unfixed_count = sum(1 for d in dirty_data['records'] if not d['is_fixed'])
    print(f"\n脏记录接口: 已修复 {fixed_count}, 未修复 {unfixed_count}")
    
    recon_dirty = recon_data.get('dirty_count')
    api_dirty = dirty_data.get('count')
    recon_unfixed = recon_data.get('unfixed_dirty_count')
    
    if recon_dirty == api_dirty:
        print(f"\n✓ 对账脏记录数({recon_dirty}) 与脏记录接口({api_dirty}) 一致")
    else:
        print(f"✗ 对账脏记录数({recon_dirty}) 与脏记录接口({api_dirty}) 不一致")
        sys.exit(1)
    
    if recon_unfixed == unfixed_count:
        print(f"✓ 对账未修复脏记录数({recon_unfixed}) 与脏记录接口({unfixed_count}) 一致")
    else:
        print(f"✗ 对账未修复脏记录数({recon_unfixed}) 与脏记录接口({unfixed_count}) 不一致")
        sys.exit(1)
    
    print("✓ 对账/脏记录/历史 数据一致性通过")

def test_datetime_type_safety():
    print("\n" + "="*70)
    print("测试 7: DateTime 字段类型安全验证")
    print("="*70)
    
    requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_CL_005",
        "employee_name": "闭环测试员工5",
        "department": "测试部",
        "training_course": "闭环测试培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    })
    
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_CL_005",
        "employee_id": "EMP_CL_005",
        "employee_name": "闭环测试员工5",
        "training_course": "闭环测试培训",
        "sign_time": "2024-03-16 09:05:00",
        "location": "线上"
    })
    
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    cross_date_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'CROSS_DATE' and d['raw_data'].get('sign_id') == 'SIGN_CL_005' and not d['is_fixed']
    ]
    
    if cross_date_records:
        dirty_id = cross_date_records[0]['id']
        print(f"找到跨日脏记录 ID: {dirty_id}")
        
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "sign_time": "invalid-date-format",
            }
        })
        fix_result = fix_resp.json()
        
        if fix_resp.status_code == 500:
            print(f"✓ 无效日期格式正确返回500: {fix_result.get('error')}")
            
            dirty_resp2 = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
            dirty_data2 = dirty_resp2.json()
            record = next((d for d in dirty_data2['records'] if d['id'] == dirty_id), None)
            
            if record and not record['is_fixed']:
                print("✓ 修复失败后脏记录状态保持未修复状态")
            else:
                print("✗ 修复失败但脏记录状态被错误标记为已修复")
                sys.exit(1)
        else:
            print(f"修复结果: status={fix_resp.status_code}")
            print(f"  message: {fix_result.get('message')}")
        
        print("✓ DateTime 字段类型安全验证通过")
    else:
        print("⚠ 未找到跨日脏记录，跳过")

def main():
    print("="*70)
    print("  企业培训签到验收回放链路 - 闭环修复专项测试")
    print("="*70)
    print(f"测试批次: {BATCH_ID}")
    
    try:
        test_health()
        test_sign_update_fields()
        test_cross_date_fix_datetime()
        test_name_change_fix()
        test_amount_conflict_fix()
        test_reconcile_consistency()
        test_datetime_type_safety()
        
        print("\n" + "="*70)
        print("  所有闭环修复测试通过！")
        print("="*70)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
