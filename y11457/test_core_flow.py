#!/usr/bin/env python3
"""
测试核心业务链路：
1. 登录获取 token
2. 创建团长退款来源记录
3. 审核通过进入补偿队列
4. 查看补偿队列
5. 处理补偿
6. 查看差异历史
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
    print(f"\n{'='*60}")
    print(f"步骤 {step_num}: {title}")
    print(f"{'='*60}")


def test_login():
    print_step(1, "登录获取 Token")
    response = client.post(
        "/auth/token",
        data={"username": "admin", "password": "admin123"}
    )
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"登录失败: {response.text}"
    token = response.json()["access_token"]
    print(f"✓ 登录成功，Token 获取成功")
    return token


def test_create_leader_refund(token):
    print_step(2, "创建团长退款来源记录")
    headers = {"Authorization": f"Bearer {token}"}
    
    refund_data = {
        "refund_no": "TEST-LR-001",
        "order_no": "TEST-ORD-202401001",
        "leader_id": "L001",
        "leader_name": "张团长",
        "city": "北京",
        "refund_amount": 58.5,
        "compensation_amount": 58.5,
        "issue_type": "shortage",
        "remark": "少发1份水果",
        "submitted_at": datetime.now().isoformat(),
        "is_verified": False
    }
    
    response = client.post(
        "/sources/leader-refunds",
        headers=headers,
        json=refund_data
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)[:500]}")
    
    assert response.status_code == 200, f"创建团长退款失败: {response.text}"
    record_id = response.json()["id"]
    print(f"✓ 团长退款记录创建成功，ID: {record_id}")
    return record_id


def test_verify_leader_refund(token, record_id):
    print_step(3, "审核通过，进入补偿队列")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        f"/sources/leader-refunds/{record_id}/verify",
        headers=headers,
        json={"record_id": record_id, "verified": True}
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    assert response.status_code == 200, f"审核失败: {response.text}"
    print(f"✓ 审核通过，记录已进入补偿队列")


def test_list_queue(token):
    print_step(4, "查看补偿队列")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(
        "/queue/",
        headers=headers
    )
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"队列数量: {len(data)}")
    for item in data[:3]:
        print(f"  - {item['queue_no']}: {item['status']} - ¥{item['compensation_amount']}")
    
    assert response.status_code == 200, f"获取队列失败: {response.text}"
    assert len(data) > 0, "队列为空"
    print(f"✓ 补偿队列查询成功")
    return data[0]["id"]


def test_process_queue(token, queue_id):
    print_step(5, "处理补偿（自动重试）")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/queue/process",
        headers=headers,
        json={"queue_id": queue_id, "force": False}
    )
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    assert response.status_code == 200, f"处理队列失败: {response.text}"
    print(f"✓ 补偿处理完成")


def test_view_diff(token, queue_id):
    print_step(6, "查看差异历史")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(
        f"/queue/{queue_id}/diff",
        headers=headers
    )
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"队列号: {data['queue_no']}")
    print(f"当前状态: {data['current_status']}")
    print(f"重试次数: {data['retry_count']}")
    print(f"差异历史数量: {len(data['diff_history'])}")
    for diff in data['diff_history']:
        print(f"  - [{diff['retry_number']}] {diff['action']}: {diff['status_diff']['before']} → {diff['status_diff']['after']}")
    
    assert response.status_code == 200, f"获取差异失败: {response.text}"
    print(f"✓ 差异历史可正常查看")


def test_view_operation_logs(token):
    print_step(7, "查看操作日志")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(
        "/logs/",
        headers=headers,
        params={"limit": 5}
    )
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"日志数量: {len(data)}")
    for log in data:
        print(f"  - {log['created_at'][:19]}: {log['user_name']} - {log['action']}")
    
    assert response.status_code == 200, f"获取日志失败: {response.text}"
    print(f"✓ 操作日志可正常查看")


def test_view_report(token):
    print_step(8, "查看城市报表概览")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(
        "/reports/city-overview",
        headers=headers
    )
    print(f"状态码: {response.status_code}")
    data = response.json()
    print(f"城市: {data['city']}")
    print(f"总记录数: {data['overview']['total_count']}")
    print(f"总金额: ¥{data['overview']['total_amount']}")
    print(f"重点关注:")
    print(f"  - 可重试: {data['key_focus']['retryable_count']}")
    print(f"  - 待人工: {data['key_focus']['manual_count']}")
    print(f"  - 死信: {data['key_focus']['dead_letter_count']}")
    
    assert response.status_code == 200, f"获取报表失败: {response.text}"
    print(f"✓ 城市报表概览可正常查看")


def main():
    print("\n" + "="*60)
    print("  社区团购售后重试补偿队列 - 核心业务链路测试")
    print("="*60)
    
    try:
        token = test_login()
        record_id = test_create_leader_refund(token)
        test_verify_leader_refund(token, record_id)
        queue_id = test_list_queue(token)
        test_process_queue(token, queue_id)
        test_view_diff(token, queue_id)
        test_view_operation_logs(token)
        test_view_report(token)
        
        print("\n" + "="*60)
        print("  ✓ 所有测试通过！核心业务链路正常工作")
        print("="*60 + "\n")
        return True
        
    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
        return False
    except Exception as e:
        print(f"\n✗ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
