#!/usr/bin/env python3
"""
演示脚本：从创建到导出的完整流程
"""
import sys
import os
import time
import requests

BASE_URL = "http://localhost:8000/api"


def demo_flow():
    print("=" * 60)
    print("小厂质检返工权限追责台账 - 完整流程演示")
    print("=" * 60)

    print("\n1. 登录系统 (操作员)")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "operator", "password": "oppass123"}
    )
    if resp.status_code != 200:
        print(f"登录失败: {resp.text}")
        print("请先运行: python cli.py init-demo")
        return 1
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✓ 登录成功，获取Token")

    print("\n2. 查询抽检记录")
    resp = requests.get(f"{BASE_URL}/inspection/", headers=headers)
    records = resp.json()
    print(f"✓ 找到 {len(records)} 条抽检记录")
    for r in records[:3]:
        print(f"  - {r['batch_no']} 状态: {r['status']} 良率: {r['yield_rate']}%")

    if not records:
        print("没有记录，创建一条新记录")
        return 1
    
    record_id = records[0]["id"]

    print(f"\n3. 提交抽检记录 (ID: {record_id})")
    resp = requests.post(
        f"{BASE_URL}/status/inspection/{record_id}",
        json={"new_status": "submitted", "reason": "操作员提交审核"},
        headers=headers,
    )
    if resp.status_code != 200:
        print(f"提交失败: {resp.text}")
    else:
        result = resp.json()
        print(f"✓ 状态变更为: {result['new_status']} (版本: {result['version']})")

    print("\n4. 换质检员登录")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "qcuser", "password": "qcpass123"}
    )
    qc_token = resp.json()["access_token"]
    qc_headers = {"Authorization": f"Bearer {qc_token}"}
    print(f"✓ 质检员登录成功")

    print(f"\n5. 质检员审核 - 驳回")
    resp = requests.post(
        f"{BASE_URL}/status/inspection/{record_id}",
        json={"new_status": "rejected", "reason": "良率数据有疑问，请复核"},
        headers=qc_headers,
    )
    if resp.status_code != 200:
        print(f"驳回失败: {resp.text}")
    else:
        result = resp.json()
        print(f"✓ 状态变更为: {result['new_status']} (版本: {result['version']})")

    print("\n6. 操作员修改后重新提交")
    resp = requests.put(
        f"{BASE_URL}/inspection/{record_id}",
        json={
            "defect_count": 3,
            "yield_rate": 97.0,
            "is_manual_adjustment": True,
            "adjustment_reason": "重新核对后修正不良数量",
        },
        headers=headers,
    )
    if resp.status_code != 200:
        print(f"修改失败: {resp.text}")
    else:
        print(f"✓ 记录修改成功，版本号增加")
    
    resp = requests.post(
        f"{BASE_URL}/status/inspection/{record_id}",
        json={"new_status": "submitted", "reason": "修正后重新提交"},
        headers=headers,
    )
    if resp.status_code != 200:
        print(f"重新提交失败: {resp.text}")
    else:
        result = resp.json()
        print(f"✓ 重新提交成功，状态: {result['new_status']}")

    print("\n7. 生产经理登录并二次确认")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": "manager", "password": "managerpass"}
    )
    pm_token = resp.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}
    print(f"✓ 生产经理登录成功")

    resp = requests.post(
        f"{BASE_URL}/status/inspection/{record_id}",
        json={"new_status": "reconfirmed", "reason": "生产经理二次确认通过"},
        headers=pm_headers,
    )
    if resp.status_code != 200:
        print(f"确认失败: {resp.text}")
    else:
        result = resp.json()
        print(f"✓ 二次确认成功，状态: {result['new_status']}")

    print("\n8. 查看变更历史")
    resp = requests.get(f"{BASE_URL}/audit/changes?entity_type=inspection&entity_id={record_id}", headers=pm_headers)
    changes = resp.json()
    print(f"✓ 共 {len(changes)} 次变更记录")
    for c in changes:
        manual = " [人工改判]" if c.get("is_manual") else ""
        print(f"  - v{c['version']} {c['field_name']}: {c['old_value']} -> {c['new_value']}{manual}")

    print("\n9. 导出前冻结")
    resp = requests.post(f"{BASE_URL}/export/freeze/inspection", headers=pm_headers)
    freeze_result = resp.json()
    print(f"✓ 冻结 {freeze_result.get('frozen_count', 0)} 条记录")

    print("\n10. 导出数据")
    resp = requests.post(
        f"{BASE_URL}/export/",
        json={
            "export_type": "inspection",
            "include_change_history": True,
            "mask_sensitive_fields": True,
            "format": "json",
        },
        headers=pm_headers,
    )
    export_result = resp.json()
    print(f"✓ 导出成功: {export_result['export_no']}")
    print(f"  记录数: {export_result['record_count']}")
    print(f"  脱敏: {'是' if export_result['is_sensitive_masked'] else '否'}")
    print(f"  下载地址: {export_result['download_url']}")

    print("\n" + "=" * 60)
    print("演示流程完成！")
    print("=" * 60)
    print("\n可访问: http://localhost:8000/docs 查看完整API文档")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(demo_flow())
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器")
        print("请先启动服务: python main.py")
        sys.exit(1)
