#!/usr/bin/env python3
"""
权限体系测试脚本
验证四个角色（录入、复核、主管、只读）的字段权限和操作权限
"""

import sys
import json
from datetime import datetime

try:
    from fastapi.testclient import TestClient
except ImportError:
    print("请先安装依赖: pip install fastapi uvicorn")
    sys.exit(1)

from app.main import app

client = TestClient(app)


def print_step(step_num, title):
    print(f"\n{'='*70}")
    print(f"步骤 {step_num}: {title}")
    print(f"{'='*70}")


def get_token(username, password):
    response = client.post(
        "/auth/token",
        data={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"登录失败: {response.text}")
        return None


def test_role_field_permissions():
    print_step(1, "测试角色字段权限 - 团长退款表")
    
    admin_token = get_token("admin", "admin123")
    readonly_token = get_token("readonly", "readonly123")
    entry_token = get_token("entry", "entry123")
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_readonly = {"Authorization": f"Bearer {readonly_token}"}
    headers_entry = {"Authorization": f"Bearer {entry_token}"}
    
    refund_data = {
        "refund_no": "PERM-TEST-001",
        "order_no": "PERM-ORD-001",
        "leader_id": "L999",
        "leader_name": "测试团长",
        "city": "北京",
        "refund_amount": 100.0,
        "compensation_amount": 100.0,
        "issue_type": "shortage",
        "remark": "测试备注信息",
        "submitted_at": datetime.now().isoformat(),
        "is_verified": False
    }
    
    response = client.post(
        "/sources/leader-refunds",
        headers=headers_admin,
        json=refund_data
    )
    assert response.status_code == 200, f"创建测试数据失败: {response.text}"
    record_id = response.json()["id"]
    
    response = client.post(
        f"/sources/leader-refunds/{record_id}/verify",
        headers=headers_admin,
        json={"record_id": record_id, "verified": True}
    )
    assert response.status_code == 200, f"审核失败: {response.text}"
    
    print("\n✓ 准备测试数据完成")
    
    print("\n--- 主管角色 (SUPERVISOR) ---")
    response = client.get(f"/sources/leader-refunds/{record_id}", headers=headers_admin)
    admin_data = response.json()
    admin_fields = set(admin_data.keys())
    print(f"可见字段数: {len(admin_fields)}")
    print(f"字段列表: {sorted(admin_fields)}")
    assert "leader_id" in admin_fields, "主管应能看到 leader_id"
    assert "verified_by" in admin_fields, "主管应能看到 verified_by"
    assert "verified_at" in admin_fields, "主管应能看到 verified_at"
    print("✓ 主管可见所有敏感字段")
    
    print("\n--- 只读角色 (READ_ONLY) ---")
    response = client.get(f"/sources/leader-refunds/{record_id}", headers=headers_readonly)
    readonly_data = response.json()
    readonly_fields = set(readonly_data.keys())
    print(f"可见字段数: {len(readonly_fields)}")
    print(f"字段列表: {sorted(readonly_fields)}")
    assert "leader_id" not in readonly_fields, "只读角色不应看到 leader_id"
    assert "verified_by" not in readonly_fields, "只读角色不应看到 verified_by"
    assert "verified_at" not in readonly_fields, "只读角色不应看到 verified_at"
    assert "remark" not in readonly_fields, "只读角色不应看到 remark"
    print("✓ 只读角色敏感字段已被过滤")
    
    print("\n--- 录入角色 (DATA_ENTRY) ---")
    response = client.get(f"/sources/leader-refunds/{record_id}", headers=headers_entry)
    entry_data = response.json()
    entry_fields = set(entry_data.keys())
    print(f"可见字段数: {len(entry_fields)}")
    print(f"字段列表: {sorted(entry_fields)}")
    assert "leader_id" in entry_fields, "录入角色应能看到 leader_id"
    assert "verified_by" not in entry_fields, "录入角色不应看到 verified_by"
    assert "verified_at" not in entry_fields, "录入角色不应看到 verified_at"
    print("✓ 录入角色字段权限正确")
    
    return admin_token, readonly_token, entry_token


def test_queue_permissions(admin_token, readonly_token, entry_token):
    print_step(2, "测试补偿队列字段权限")
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_readonly = {"Authorization": f"Bearer {readonly_token}"}
    headers_entry = {"Authorization": f"Bearer {entry_token}"}
    
    response = client.get("/queue/", headers=headers_admin)
    queues = response.json()
    assert len(queues) > 0, "队列不应为空"
    queue_id = queues[0]["id"]
    
    print("\n--- 主管角色 - 队列详情 ---")
    response = client.get(f"/queue/{queue_id}", headers=headers_admin)
    admin_data = response.json()
    admin_fields = set(admin_data.keys())
    print(f"可见字段数: {len(admin_fields)}")
    assert "source_id" in admin_fields, "主管应能看到 source_id"
    assert "source_table" in admin_fields, "主管应能看到 source_table"
    assert "actual_compensation" in admin_fields, "主管应能看到 actual_compensation"
    print("✓ 主管可见所有队列字段")
    
    print("\n--- 只读角色 - 队列详情 ---")
    response = client.get(f"/queue/{queue_id}", headers=headers_readonly)
    readonly_data = response.json()
    readonly_fields = set(readonly_data.keys())
    print(f"可见字段数: {len(readonly_fields)}")
    assert "source_id" not in readonly_fields, "只读角色不应看到 source_id"
    assert "source_table" not in readonly_fields, "只读角色不应看到 source_table"
    assert "actual_compensation" not in readonly_fields, "只读角色不应看到 actual_compensation"
    print("✓ 只读角色队列敏感字段已被过滤")
    
    print("\n--- 录入角色 - 队列表详情 ---")
    response = client.get(f"/queue/{queue_id}", headers=headers_entry)
    entry_data = response.json()
    entry_fields = set(entry_data.keys())
    print(f"可见字段数: {len(entry_fields)}")
    assert "source_id" not in entry_fields, "录入角色不应看到 source_id"
    assert "source_table" not in entry_fields, "录入角色不应看到 source_table"
    print("✓ 录入角色队列字段权限正确")


def test_queue_sensitive_apis(admin_token, readonly_token, entry_token):
    print_step(3, "测试队列敏感接口权限 (source/logs/diff)")
    
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_readonly = {"Authorization": f"Bearer {readonly_token}"}
    headers_entry = {"Authorization": f"Bearer {entry_token}"}
    
    response = client.get("/queue/", headers=headers_admin)
    queues = response.json()
    queue_id = queues[0]["id"]
    
    print("\n--- 测试 /queue/{id}/source 接口 ---")
    response = client.get(f"/queue/{queue_id}/source", headers=headers_admin)
    admin_source = response.json()
    print(f"主管: record = {admin_source.get('record') is not None}")
    assert admin_source.get("record") is not None, "主管应能看到源数据详情"
    
    response = client.get(f"/queue/{queue_id}/source", headers=headers_readonly)
    readonly_source = response.json()
    print(f"只读: record = {readonly_source.get('record')}, message = {readonly_source.get('message')}")
    assert readonly_source.get("record") is None, "只读角色不应看到源数据详情"
    
    response = client.get(f"/queue/{queue_id}/source", headers=headers_entry)
    entry_source = response.json()
    print(f"录入: record = {entry_source.get('record')}, message = {entry_source.get('message')}")
    assert entry_source.get("record") is None, "录入角色不应看到源数据详情"
    print("✓ /source 接口权限正确")
    
    print("\n--- 测试 /queue/{id}/logs 接口 ---")
    response = client.get(f"/queue/{queue_id}/logs", headers=headers_admin)
    admin_logs = response.json()
    print(f"主管: logs count = {len(admin_logs)}")
    
    response = client.get(f"/queue/{queue_id}/logs", headers=headers_readonly)
    readonly_logs = response.json()
    print(f"只读: logs count = {len(readonly_logs)}")
    assert len(readonly_logs) == 0, "只读角色不应看到日志"
    
    response = client.get(f"/queue/{queue_id}/logs", headers=headers_entry)
    entry_logs = response.json()
    print(f"录入: logs count = {len(entry_logs)}")
    assert len(entry_logs) == 0, "录入角色不应看到日志"
    print("✓ /logs 接口权限正确")
    
    print("\n--- 测试 /queue/{id}/diff 接口 ---")
    response = client.get(f"/queue/{queue_id}/diff", headers=headers_admin)
    admin_diff = response.json()
    print(f"主管: diff_history count = {len(admin_diff.get('diff_history', []))}")
    
    response = client.get(f"/queue/{queue_id}/diff", headers=headers_readonly)
    readonly_diff = response.json()
    print(f"只读: diff_history count = {len(readonly_diff.get('diff_history', []))}")
    assert len(readonly_diff.get('diff_history', [])) == 0, "只读角色不应看到差异详情"
    
    response = client.get(f"/queue/{queue_id}/diff", headers=headers_entry)
    entry_diff = response.json()
    print(f"录入: diff_history count = {len(entry_diff.get('diff_history', []))}")
    assert len(entry_diff.get('diff_history', [])) == 0, "录入角色不应看到差异详情"
    print("✓ /diff 接口权限正确")


def test_city_isolation():
    print_step(4, "测试城市隔离权限")
    
    reviewer_bj_token = get_token("reviewer", "reviewer123")
    reviewer_sh_token = get_token("reviewer_sh", "reviewer123")
    
    headers_bj = {"Authorization": f"Bearer {reviewer_bj_token}"}
    headers_sh = {"Authorization": f"Bearer {reviewer_sh_token}"}
    headers_admin = {"Authorization": f"Bearer {get_token('admin', 'admin123')}"}
    
    sh_refund = {
        "refund_no": "PERM-TEST-SH-001",
        "order_no": "PERM-ORD-SH-001",
        "leader_id": "L888",
        "leader_name": "上海团长",
        "city": "上海",
        "refund_amount": 200.0,
        "compensation_amount": 200.0,
        "issue_type": "damaged",
        "remark": "上海地区测试",
        "submitted_at": datetime.now().isoformat(),
        "is_verified": True
    }
    response = client.post(
        "/sources/leader-refunds",
        headers=headers_admin,
        json=sh_refund
    )
    assert response.status_code == 200, f"创建上海测试数据失败: {response.text}"
    sh_record_id = response.json()["id"]
    
    print("\n--- 北京复核员访问上海记录 ---")
    response = client.get(f"/sources/leader-refunds/{sh_record_id}", headers=headers_bj)
    print(f"状态码: {response.status_code}")
    assert response.status_code == 403, "北京复核员不应能访问上海记录"
    print("✓ 北京复核员无法访问上海记录")
    
    print("\n--- 上海复核员访问上海记录 ---")
    response = client.get(f"/sources/leader-refunds/{sh_record_id}", headers=headers_sh)
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, "上海复核员应能访问上海记录"
    print("✓ 上海复核员可以访问上海记录")
    
    print("\n--- 北京复核员列表 - 只看到北京 ---")
    response = client.get("/sources/leader-refunds", headers=headers_bj)
    bj_records = response.json()
    cities = set(r.get("city") for r in bj_records)
    print(f"可见城市: {cities}")
    assert "上海" not in cities, "北京复核员列表不应看到上海记录"
    print("✓ 列表已按城市过滤")


def test_action_permissions():
    print_step(5, "测试操作权限")
    
    readonly_token = get_token("readonly", "readonly123")
    headers_readonly = {"Authorization": f"Bearer {readonly_token}"}
    
    refund_data = {
        "refund_no": "PERM-TEST-ACTION-001",
        "order_no": "PERM-ORD-ACTION-001",
        "leader_id": "L777",
        "leader_name": "测试团长",
        "city": "北京",
        "refund_amount": 50.0,
        "compensation_amount": 50.0,
        "issue_type": "other",
        "remark": "操作权限测试",
        "submitted_at": datetime.now().isoformat(),
        "is_verified": False
    }
    
    print("\n--- 只读角色尝试创建记录 ---")
    response = client.post(
        "/sources/leader-refunds",
        headers=headers_readonly,
        json=refund_data
    )
    print(f"状态码: {response.status_code}")
    assert response.status_code == 403, "只读角色不应能创建记录"
    print("✓ 只读角色无法创建记录")
    
    print("\n--- 只读角色尝试审核 ---")
    admin_token = get_token("admin", "admin123")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.post(
        "/sources/leader-refunds",
        headers=headers_admin,
        json=refund_data
    )
    record_id = response.json()["id"]
    
    response = client.post(
        f"/sources/leader-refunds/{record_id}/verify",
        headers=headers_readonly,
        json={"record_id": record_id, "verified": True}
    )
    print(f"状态码: {response.status_code}")
    assert response.status_code == 403, "只读角色不应能审核"
    print("✓ 只读角色无法审核")
    
    print("\n--- 只读角色尝试人工接管 ---")
    response = client.post(
        "/queue/manual-takeover",
        headers=headers_readonly,
        json={"queue_id": 1, "reason": "测试"}
    )
    print(f"状态码: {response.status_code}")
    assert response.status_code == 403, "只读角色不应能人工接管"
    print("✓ 只读角色无法人工接管")


def main():
    print("\n" + "="*70)
    print("  社区团购售后重试补偿队列 - 权限体系测试")
    print("="*70)
    
    try:
        admin_token, readonly_token, entry_token = test_role_field_permissions()
        test_queue_permissions(admin_token, readonly_token, entry_token)
        test_queue_sensitive_apis(admin_token, readonly_token, entry_token)
        test_city_isolation()
        test_action_permissions()
        
        print("\n" + "="*70)
        print("  ✓ 所有权限测试通过！")
        print("  - 字段过滤：按角色隐藏敏感字段")
        print("  - 城市隔离：非主管只能看本城市数据")
        print("  - 操作权限：按角色限制可执行动作")
        print("  - 敏感接口：日志/差异/源数据需权限")
        print("="*70 + "\n")
        return True
        
    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n✗ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
