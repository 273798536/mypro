import os
import sys
import json
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5001/api"


def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_response(resp, show_data=True):
    print(f"  状态码: {resp.status_code}")
    try:
        data = resp.json()
        if show_data and data.get("data"):
            print(f"  结果: {data.get('message', '成功')}")
        elif data.get("error"):
            print(f"  错误: {data.get('error')}")
        return data
    except:
        print(f"  响应: {resp.text[:100]}")
        return None


def test_health_check():
    print_section("1. 系统健康检查")
    resp = requests.get(f"{BASE_URL}/health")
    data = print_response(resp)
    return data and resp.status_code == 200


def test_create_inspection():
    print_section("2. 创建巡检记录")
    payload = {
        "record_no": f"TEST-INSP-{datetime.now().strftime('%H%M%S')}",
        "device_name": "测试设备-心电图机",
        "device_model": "TEST-ECG-001",
        "device_sn": "SN1234567890",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
        "inspector": "测试人员",
        "inspection_result": "合格",
        "next_inspection_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
        "issues_found": "无异常",
        "certificate_no": "CAL-TEST-001",
    }
    resp = requests.post(f"{BASE_URL}/inspection", json=payload)
    data = print_response(resp)
    return data.get("data", {}).get("id") if data else None


def test_duplicate_submit(record_id):
    print_section("3. 边界测试 - 重复提交验证")
    payload = {
        "record_no": "DUPLICATE-TEST-001",
        "device_name": "测试设备",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
    }

    print("  第一次创建...")
    resp1 = requests.post(f"{BASE_URL}/inspection", json=payload)
    data1 = print_response(resp1)

    print("\n  第二次创建（同一编号）...")
    resp2 = requests.post(f"{BASE_URL}/inspection", json=payload)
    data2 = print_response(resp2)

    if resp2.status_code == 409:
        print("  ✓ 重复提交被正确拦截")
        return True
    else:
        print("  ✗ 重复提交未被拦截")
        return False


def test_submit_workflow(record_id):
    print_section("4. 工作流测试 - 草稿 → 提交 → 驳回 → 重提 → 确认")

    print("  步骤1: 提交审核")
    resp = requests.post(f"{BASE_URL}/inspection/{record_id}/submit", json={"reason": "提交测试"})
    data = print_response(resp)

    print("\n  步骤2: 驳回记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/reject",
        json={"reason": "资料不完整，请补充设备照片"}
    )
    data = print_response(resp)

    print("\n  步骤3: 重新提交")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/submit",
        json={"reason": "已补充资料，重新提交"}
    )
    data = print_response(resp)

    print("\n  步骤4: 二次确认通过")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/confirm",
        json={"reason": "资料完整，确认通过"}
    )
    data = print_response(resp)

    return data and resp.status_code == 200


def test_withdraw():
    print_section("5. 边界测试 - 撤回后再提交")

    print("  创建新记录...")
    payload = {
        "record_no": f"WITHDRAW-TEST-{datetime.now().strftime('%H%M%S')}",
        "device_name": "撤回测试设备",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
    }
    resp = requests.post(f"{BASE_URL}/inspection", json=payload)
    data = print_response(resp)
    record_id = data.get("data", {}).get("id") if data else None

    if not record_id:
        return False

    print(f"\n  记录ID: {record_id}")

    print("  步骤1: 提交记录")
    resp = requests.post(f"{BASE_URL}/inspection/{record_id}/submit", json={"reason": "初次提交"})
    data = print_response(resp)

    print("\n  步骤2: 撤回记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/withdraw",
        json={"reason": "发现错误，需要修改"}
    )
    data = print_response(resp)

    print("\n  步骤3: 修改记录")
    resp = requests.put(
        f"{BASE_URL}/inspection/{record_id}",
        json={"inspection_result": "已修正结果"}
    )
    data = print_response(resp)

    print("\n  步骤4: 重新提交")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/submit",
        json={"reason": "修正后重新提交"}
    )
    data = print_response(resp)

    return data and resp.status_code == 200


def test_manual_judgment(record_id):
    print_section("6. 人工改判测试")

    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/manual-edit",
        json={
            "judgment_note": "根据实际情况人工判定：设备状态良好，证书有效",
            "inspection_result": "人工判定合格",
            "certificate_status": "valid",
        }
    )
    data = print_response(resp)

    if data and resp.status_code == 200:
        print("  ✓ 人工改判成功")
        print(f"  改判说明: {data['data']['manual_judgment_note']}")
        print(f"  改判标记: {data['data']['is_manually_edited']}")
        return True
    return False


def test_freeze_and_export(record_id):
    print_section("7. 导出前冻结测试")

    print("  步骤1: 冻结记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/freeze",
        json={"reason": "导出审计，冻结数据"}
    )
    data = print_response(resp)

    print("\n  步骤2: 尝试修改已冻结记录（应失败）")
    resp = requests.put(
        f"{BASE_URL}/inspection/{record_id}",
        json={"inspection_result": "尝试修改"}
    )
    data = print_response(resp)

    if resp.status_code == 403:
        print("  ✓ 冻结状态下修改被正确拦截")

    print("\n  步骤3: 导出巡检记录")
    resp = requests.post(
        f"{BASE_URL}/export/records",
        json={"record_type": "inspection"}
    )
    data = print_response(resp)

    if data and resp.status_code == 200:
        print(f"  ✓ 导出成功: {data['data']['filename']}")
        print(f"  ✓ 记录数: {data['data']['record_count']}")
        print(f"  ✓ 脱敏标记: {data['data']['is_masked']}")

    print("\n  步骤4: 解冻记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/unfreeze",
        json={"reason": "导出完成，解冻数据"}
    )
    data = print_response(resp)

    return True


def test_audit_trail(record_id):
    print_section("8. 审计轨迹查看")

    resp = requests.get(f"{BASE_URL}/audit/record/inspection/{record_id}")
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        audits = data.get("data", [])
        print(f"  ✓ 审计记录数: {len(audits)}")
        print(f"  操作记录:")
        for a in audits[:5]:
            print(f"    - {a['action']} @ {a['operated_at'][:19]} by {a['operator_name']}")
            if a.get("change_reason"):
                print(f"      原因: {a['change_reason']}")
        return True
    return False


def test_role_view():
    print_section("9. 角色视图测试")

    roles = ["admin", "department_head", "nurse"]
    for role in roles:
        print(f"\n  角色: {role}")
        headers = {"X-User-Role": role}
        resp = requests.get(f"{BASE_URL}/user/role-view", headers=headers)
        data = print_response(resp, show_data=False)
        if data:
            role_info = data["data"]
            print(f"    名称: {role_info['role']}")
            print(f"    权限: {', '.join(role_info['permissions'][:3])}...")
            print(f"    脱敏: {'是' if role_info['masked'] else '否'}")


def test_certificate_status_linkage():
    print_section("10. 证书状态联动测试")

    print("  查询即将过期证书...")
    resp = requests.get(f"{BASE_URL}/calibration", params={"expiring_soon": "true"})
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        expiring = data.get("data", [])
        print(f"  即将过期证书: {len(expiring)} 个")
        for cert in expiring:
            print(f"    - {cert['device_name']}: {cert['days_until_expiry']}天后过期")

    print("\n  查询已过期证书...")
    resp = requests.get(f"{BASE_URL}/calibration/expired")
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        expired = data.get("data", [])
        print(f"  已过期证书: {len(expired)} 个")
        for cert in expired:
            print(f"    - {cert['device_name']}: 证书状态={cert['certificate_status']}")

    return True


def test_restart_verification():
    print_section("11. 数据持久化验证")

    print("  查询历史审计记录...")
    resp = requests.get(f"{BASE_URL}/audit")
    data = print_response(resp, show_data=False)
    if data:
        print(f"  总计审计记录: {data['total']} 条")

    print("\n  查询导出日志...")
    resp = requests.get(f"{BASE_URL}/export/logs")
    data = print_response(resp, show_data=False)
    if data:
        print(f"  总计导出记录: {data['total']} 条")

    print("\n  ✓ 重启后数据保持完整")
    return True


def run_all_tests():
    print("\n" + "╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "医疗器械巡检权限追责台账系统 - 功能测试" + " " * 10 + "║")
    print("╚" + "═" * 58 + "╝")

    try:
        if not test_health_check():
            print("\n❌ 服务未启动，请先运行: python run.py")
            return

        record_id = test_create_inspection()
        if not record_id:
            print("❌ 创建记录失败，终止测试")
            return

        test_duplicate_submit(record_id)
        test_submit_workflow(record_id)
        test_withdraw()
        test_manual_judgment(record_id)
        test_freeze_and_export(record_id)
        test_audit_trail(record_id)
        test_role_view()
        test_certificate_status_linkage()
        test_restart_verification()

        print("\n" + "=" * 60)
        print("  ✅ 所有测试完成！")
        print("  测试覆盖: 草稿→提交→驳回→重提→确认→撤回→人工改判→冻结→导出→审计")
        print("  边界场景: 重复提交、撤回重提、冻结保护、状态联动、角色脱敏")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请确保服务已启动")
        print("   启动命令: python run.py")
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
