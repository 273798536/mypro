#!/usr/bin/env python3
import requests
import json
import os

BASE_URL = "http://localhost:8000"


def get_token(username, password):
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    print(f"登录失败: {response.text}")
    return None


def test_batch_import(token):
    print("\n=== 测试批次导入 ===")
    
    sample_file = os.path.join(os.path.dirname(__file__), "examples", "sample_data.json")
    with open(sample_file, "r", encoding="utf-8") as f:
        batch_data = json.load(f)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/batches/import",
        json=batch_data,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"批次号: {result['batch_number']}")
        print(f"总数: {result['total_items']}")
        print(f"新建: {result['created_count']}")
        print(f"更新: {result['updated_count']}")
        print(f"忽略: {result['ignored_count']}")
        print(f"失败: {result['failed_count']}")
        return result
    else:
        print(f"错误: {response.text}")
        return None


def test_list_reimbursements(token):
    print("\n=== 测试获取报销单列表 ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/reimbursements?page=1&page_size=10",
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"总数: {result['total']}")
        print(f"当前页: {result['page']}")
        print(f"每页数量: {result['page_size']}")
        for item in result['items'][:3]:
            print(f"  - {item['reimbursement_no']}: {item['purpose']} ({item['status']}, ¥{item['total_amount']})")
    return response.json() if response.status_code == 200 else None


def test_status_change(token, reimb_id):
    print(f"\n=== 测试状态流转 (报销单ID: {reimb_id}) ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    status_flow = [
        ("submitted", "提交审核", "员工提交报销单"),
        ("rejected", "驳回修改", "发票信息不完整"),
        ("submitted", "重新提交", "已补充发票信息"),
        ("second_confirm", "二次确认", "需要财务经理复核"),
        ("approved", "审批通过", "复核通过，同意报销")
    ]
    
    for status, reason, change_reason in status_flow:
        response = requests.post(
            f"{BASE_URL}/reimbursements/{reimb_id}/status",
            json={
                "status": status,
                "reason": reason,
                "change_reason": change_reason
            },
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✓ {status}: {change_reason}")
        else:
            print(f"  ✗ {status} 失败: {response.text}")


def test_audit_logs(token, reimb_id):
    print(f"\n=== 测试审计日志 (报销单ID: {reimb_id}) ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/reimbursements/{reimb_id}/audit-logs",
        headers=headers
    )
    
    if response.status_code == 200:
        logs = response.json()
        print(f"共 {len(logs)} 条审计记录:")
        for log in logs:
            print(f"  [{log['created_at']}] {log['actor_name']} - {log['action']}")
            if log.get('change_reason'):
                print(f"      原因: {log['change_reason']}")
    else:
        print(f"获取失败: {response.text}")


def test_finance_dashboard(token):
    print("\n=== 测试财务看板 ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/finance/dashboard", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print("\n角色视图统计:")
        for rv in data['role_views']:
            print(f"  {rv['role']}:")
            print(f"    报销单数: {rv['total_reimbursements']}")
            print(f"    总金额: ¥{rv['total_amount']:.2f}")
            print(f"    待审核: {rv['pending_review_count']}")
        
        print(f"\n待二次确认: {data['pending_second_confirm']}")
        print(f"重复发票: {data['duplicate_invoices']}")
        print(f"重复付款: {data['duplicate_payments']}")
        
        if data['top_change_reasons']:
            print("\n主要变更原因:")
            for reason in data['top_change_reasons']:
                print(f"  {reason['reason']}: {reason['count']}次, 涉及¥{reason['total_amount']:.2f}")
    else:
        print(f"获取失败: {response.text}")


def test_duplicate_detection(token):
    print("\n=== 测试重复检测 ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    duplicate_reimb = {
        "purpose": "上海客户拜访-年度合同谈判",
        "total_amount": 5680.50,
        "travel_destination": "上海",
        "traveler_names": ["张三", "李四"],
        "idempotency_key": "SH-20241201-SALES-001",
        "invoices": [
            {
                "invoice_number": "12345678",
                "invoice_code": "3100123456",
                "total_amount": 1698.11,
                "tax_amount": 101.89,
                "amount_with_tax": 1800.00,
                "category": "住宿"
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/reimbursements",
        json=duplicate_reimb,
        headers=headers
    )
    
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"返回的报销单号: {data['reimbursement_no']}")
        print("(由于幂等键相同，应该返回已存在的记录，而非新建)")


def main():
    print("财务报销稽核系统 API 测试")
    print("=" * 50)
    
    print("\n使用财务账号登录...")
    token = get_token("finance", "finance123")
    if not token:
        print("登录失败，请先启动服务: uvicorn app.main:app --reload")
        return
    
    print("登录成功!")
    
    batch_result = test_batch_import(token)
    
    list_result = test_list_reimbursements(token)
    
    if list_result and list_result['items']:
        first_id = list_result['items'][0]['id']
        test_status_change(token, first_id)
        test_audit_logs(token, first_id)
    
    test_finance_dashboard(token)
    test_duplicate_detection(token)
    
    print("\n" + "=" * 50)
    print("测试完成!")
    print(f"\n查看完整API文档: {BASE_URL}/docs")


if __name__ == "__main__":
    main()
