#!/usr/bin/env python3
import json
import requests
import sys
import os

BASE_URL = "http://localhost:5002/api"
BATCH_ID = "MISSING_FIELD_TEST_001"

def test_health():
    print("\n" + "="*70)
    print("测试 1: 健康检查")
    print("="*70)
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, "健康检查失败"
    print("✓ 健康检查通过")

def test_registration_missing_field():
    print("\n" + "="*70)
    print("测试 2: 报名表缺少必填字段（MISSING_FIELD）")
    print("="*70)
    
    print("\n步骤 1: 提交缺少 employee_name 的报名数据")
    resp = requests.post(f"{BASE_URL}/registration", json={
        "batch_id": BATCH_ID,
        "employee_id": "EMP_MF_001",
        "training_course": "缺字段测试培训",
        "training_date": "2024-03-15",
        "amount": 100.0,
        "status": "registered"
    })
    result = resp.json()
    print(f"  响应 status={resp.status_code}")
    print(f"  消息: {result.get('message')}")
    print(f"  状态: {result.get('status')}")
    print(f"  错误: {result.get('errors')}")
    
    if resp.status_code == 202:
        print(f"  ✓ 缺少字段的报名数据已入库（待修复状态）")
    elif resp.status_code == 400:
        print(f"  ⚠ 缺少 employee_id 或 training_course，无法入库")
        return
    else:
        print(f"  ✗ 预期返回 202 或 400，实际返回 {resp.status_code}")
        sys.exit(1)
    
    print("\n步骤 2: 查看脏记录")
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    print(f"  脏记录总数: {dirty_data.get('count')}")
    
    mf_records = [d for d in dirty_data['records'] if d['dirty_type'] == 'MISSING_FIELD']
    print(f"  MISSING_FIELD 脏记录: {len(mf_records)} 条")
    
    if len(mf_records) > 0:
        dirty_id = mf_records[0]['id']
        print(f"  脏记录 ID: {dirty_id}")
        print(f"  错误信息: {mf_records[0]['error_message']}")
        print(f"  原始数据: {mf_records[0]['raw_data']}")
        
        print("\n步骤 3: 修复脏记录（补齐 employee_name）")
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "employee_name": "张三"
            }
        })
        fix_result = fix_resp.json()
        print(f"\n  修复结果 status={fix_resp.status_code}:")
        print(f"    message: {fix_result.get('message')}")
        print(f"    fixed_data_applied: {fix_result.get('fixed_data_applied')}")
        print(f"    fact_record_updated: {fix_result.get('fact_record_updated')}")
        print(f"    updated_fields: {fix_result.get('updated_fields')}")
        if fix_result.get('fact_record'):
            print(f"    fact_record: {fix_result['fact_record']}")
        
        assert fix_resp.status_code == 200, f"修复应该返回200，实际{fix_resp.status_code}"
        assert fix_result.get('fixed_data_applied') == True, "应该应用了修复数据"
        assert fix_result.get('fact_record_updated') == True, "应该更新了事实记录"
        
        print("\n步骤 4: 验证对账结果")
        recon_resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
        recon_data = recon_resp.json()
        print(f"\n  对账结果:")
        print(f"    报名人数: {recon_data.get('total_registrations')} (预期: 1)")
        print(f"    签到人数: {recon_data.get('signed_count')}")
        print(f"    脏记录数: {recon_data.get('dirty_count')}")
        
        if recon_data.get('total_registrations') == 1:
            print(f"  ✓ 报名人数正确，修复后数据已生效")
        else:
            print(f"  ✗ 报名人数不正确: {recon_data.get('total_registrations')}")
            sys.exit(1)
        
        print("\n步骤 5: 验证对账详情")
        recon_get_resp = requests.get(f"{BASE_URL}/reconcile/{BATCH_ID}")
        recon_get_data = recon_get_resp.json()
        
        details = recon_get_data.get('details', [])
        emp_detail = None
        for d in details:
            if d.get('employee_id') == 'EMP_MF_001':
                emp_detail = d
                break
        
        if emp_detail:
            print(f"\n  对账详情:")
            print(f"    employee_id: {emp_detail.get('employee_id')}")
            print(f"    employee_name: {emp_detail.get('employee_name')} (预期: 张三)")
            
            if emp_detail.get('employee_name') == '张三':
                print(f"  ✓ 员工姓名已正确更新为 '张三'")
            else:
                print(f"  ✗ 员工姓名不正确: {emp_detail.get('employee_name')}")
                sys.exit(1)
        
        print("\n✓ 报名表 MISSING_FIELD 修复闭环测试通过")

def test_sign_missing_field():
    print("\n" + "="*70)
    print("测试 3: 签到记录缺少必填字段（MISSING_FIELD）")
    print("="*70)
    
    print("\n步骤 1: 提交缺少 sign_time 的签到数据")
    resp = requests.post(f"{BASE_URL}/sign", json={
        "batch_id": BATCH_ID,
        "sign_id": "SIGN_MF_001",
        "employee_id": "EMP_MF_002",
        "employee_name": "李四",
        "training_course": "缺字段测试培训",
        "location": "会议室A"
    })
    result = resp.json()
    print(f"  响应 status={resp.status_code}")
    print(f"  消息: {result.get('message')}")
    print(f"  状态: {result.get('status')}")
    
    if resp.status_code == 202:
        print(f"  ✓ 缺少字段的签到数据已入库（待修复状态）")
    elif resp.status_code == 400:
        print(f"  ⚠ 缺少 sign_id，无法入库")
        return
    else:
        print(f"  ✗ 预期返回 202 或 400，实际返回 {resp.status_code}")
        sys.exit(1)
    
    print("\n步骤 2: 查看脏记录")
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    
    mf_records = [
        d for d in dirty_data['records'] 
        if d['dirty_type'] == 'MISSING_FIELD' 
        and d['raw_data'].get('sign_id') == 'SIGN_MF_001'
    ]
    print(f"  SIGN_MF_001 相关 MISSING_FIELD 脏记录: {len(mf_records)} 条")
    
    if len(mf_records) > 0:
        dirty_id = mf_records[0]['id']
        print(f"  脏记录 ID: {dirty_id}")
        print(f"  错误信息: {mf_records[0]['error_message']}")
        
        print("\n步骤 3: 修复脏记录（补齐 sign_time）")
        fix_resp = requests.post(f"{BASE_URL}/dirty/{dirty_id}/fix", json={
            "fixed_by": "HRBP_QC",
            "fixed_data": {
                "sign_time": "2024-03-15 09:05:00"
            }
        })
        fix_result = fix_resp.json()
        print(f"\n  修复结果 status={fix_resp.status_code}:")
        print(f"    message: {fix_result.get('message')}")
        print(f"    fixed_data_applied: {fix_result.get('fixed_data_applied')}")
        print(f"    fact_record_updated: {fix_result.get('fact_record_updated')}")
        
        assert fix_resp.status_code == 200, f"修复应该返回200，实际{fix_resp.status_code}"
        assert fix_result.get('fact_record_updated') == True, "应该更新了事实记录"
        
        print("\n步骤 4: 验证对账结果")
        recon_resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
        recon_data = recon_resp.json()
        print(f"\n  对账结果:")
        print(f"    报名人数: {recon_data.get('total_registrations')}")
        print(f"    签到人数: {recon_data.get('signed_count')} (预期: 1)")
        
        if recon_data.get('signed_count') >= 1:
            print(f"  ✓ 签到人数已包含修复后的数据")
        else:
            print(f"  ✗ 签到人数不正确")
            sys.exit(1)
        
        print("\n✓ 签到记录 MISSING_FIELD 修复闭环测试通过")

def test_consistency_after_fix():
    print("\n" + "="*70)
    print("测试 4: 修复后数据一致性验证")
    print("="*70)
    
    print("\n步骤 1: 执行对账")
    recon_resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    recon_data = recon_resp.json()
    
    print(f"  对账结果:")
    print(f"    报名人数: {recon_data.get('total_registrations')}")
    print(f"    签到人数: {recon_data.get('signed_count')}")
    print(f"    脏记录数: {recon_data.get('dirty_count')}")
    print(f"    未修复脏记录: {recon_data.get('unfixed_dirty_count')}")
    
    print("\n步骤 2: 查看脏记录接口")
    dirty_resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    dirty_data = dirty_resp.json()
    fixed_count = sum(1 for d in dirty_data['records'] if d['is_fixed'])
    unfixed_count = sum(1 for d in dirty_data['records'] if not d['is_fixed'])
    print(f"  脏记录接口: 已修复 {fixed_count}, 未修复 {unfixed_count}")
    
    print("\n步骤 3: 验证一致性")
    recon_unfixed = recon_data.get('unfixed_dirty_count')
    
    if recon_unfixed == unfixed_count:
        print(f"  ✓ 对账未修复脏记录数({recon_unfixed}) 与脏记录接口({unfixed_count}) 一致")
    else:
        print(f"  ✗ 不一致: 对账={recon_unfixed}, 接口={unfixed_count}")
        sys.exit(1)
    
    print("\n步骤 4: 导出Excel")
    export_resp = requests.get(f"{BASE_URL}/export/{BATCH_ID}")
    export_result = export_resp.json()
    print(f"  导出文件: {export_result.get('filename')}")
    
    print("\n步骤 5: 查看历史记录")
    history_resp = requests.get(f"{BASE_URL}/history")
    history_data = history_resp.json()
    print(f"  历史记录数: {history_data.get('count')}")
    
    print("\n✓ 修复后数据一致性验证通过")

def main():
    print("="*70)
    print("  MISSING_FIELD 修复闭环专项测试")
    print("="*70)
    print(f"测试批次: {BATCH_ID}")
    print(f"服务地址: {BASE_URL}")
    
    try:
        test_health()
        test_registration_missing_field()
        test_sign_missing_field()
        test_consistency_after_fix()
        
        print("\n" + "="*70)
        print("  所有 MISSING_FIELD 修复闭环测试通过！")
        print("="*70)
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
