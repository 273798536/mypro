#!/usr/bin/env python3
"""
报表系统测试脚本
验证所有报表接口和导出功能正常工作
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


def prepare_test_data(admin_token):
    print_step(1, "准备测试数据 - 创建并审核团长退款记录")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    for i in range(5):
        refund_data = {
            "refund_no": f"REP-TEST-{i:03d}",
            "order_no": f"REP-ORD-{i:03d}",
            "leader_id": f"L{i:03d}",
            "leader_name": f"测试团长{i}",
            "city": "北京",
            "refund_amount": 50.0 + i * 10,
            "compensation_amount": 50.0 + i * 10,
            "issue_type": "shortage" if i % 2 == 0 else "damaged",
            "remark": f"测试备注{i}",
            "submitted_at": datetime.now().isoformat(),
            "is_verified": True
        }
        
        response = client.post(
            "/sources/leader-refunds",
            headers=headers,
            json=refund_data
        )
        if response.status_code != 200:
            print(f"创建记录 {i} 失败: {response.text}")
        else:
            print(f"✓ 创建记录 {i} 成功")
    
    print("\n✓ 测试数据准备完成")


def test_summary_report(admin_token):
    print_step(2, "测试汇总报表 /reports/summary")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/summary", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"返回城市数量: {len(data)}")
    
    if data:
        for city_data in data:
            print(f"\n城市: {city_data.get('city')}")
            print(f"  总记录数: {city_data.get('total_count')}")
            print(f"  已完成: {city_data.get('completed_count')}")
            print(f"  待处理: {city_data.get('pending_count')}")
            print(f"  失败: {city_data.get('failed_count')}")
            print(f"  死信: {city_data.get('dead_letter_count')}")
            print(f"  总金额: ¥{city_data.get('total_amount')}")
    
    print("✓ 汇总报表接口正常")


def test_retry_category_report(admin_token):
    print_step(3, "测试重试分类报表 /reports/retry-categories")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/retry-categories", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"返回分类数量: {len(data)}")
    
    for item in data:
        print(f"  {item.get('category')}: {item.get('count')}条, ¥{item.get('amount')} ({item.get('percentage')}%)")
    
    print("✓ 重试分类报表接口正常")


def test_dead_letter_report(admin_token):
    print_step(4, "测试死信报表 /reports/dead-letters")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/dead-letters", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"返回死信原因数量: {len(data)}")
    
    for item in data:
        print(f"  原因: {item.get('reason')[:30]}...")
        print(f"    数量: {item.get('count')}, 金额: ¥{item.get('amount')}, 平均重试: {item.get('avg_retry_count')}次")
        assert 'amount' in item, "缺少 amount 字段"
        assert 'count' in item, "缺少 count 字段"
        assert 'avg_retry_count' in item, "缺少 avg_retry_count 字段"
    
    print("✓ 死信报表接口正常，所有字段完整")


def test_issue_type_report(admin_token):
    print_step(5, "测试问题类型分布 /reports/issue-types")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/issue-types", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"返回问题类型数量: {len(data)}")
    
    for item in data:
        print(f"  {item.get('issue_type')}: {item.get('count')}条, ¥{item.get('amount')}")
    
    print("✓ 问题类型分布接口正常")


def test_city_overview(admin_token):
    print_step(6, "测试城市概览 /reports/city-overview")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/city-overview", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"城市: {data.get('city')}")
    print(f"总记录数: {data.get('overview', {}).get('total_count')}")
    print(f"总金额: ¥{data.get('overview', {}).get('total_amount')}")
    print(f"重点关注:")
    print(f"  可重试: {data.get('key_focus', {}).get('retryable_count')}")
    print(f"  待人工: {data.get('key_focus', {}).get('manual_count')}")
    print(f"  死信: {data.get('key_focus', {}).get('dead_letter_count')}")
    
    print("✓ 城市概览接口正常")


def test_failed_records(admin_token):
    print_step(7, "测试失败记录 /reports/failed-records")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/failed-records", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    print(f"返回失败记录数量: {len(data)}")
    
    print("✓ 失败记录接口正常")


def test_export_summary(admin_token):
    print_step(8, "测试汇总导出 /reports/export/summary")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/export/summary", headers=headers)
    print(f"状态码: {response.status_code}")
    
    assert response.status_code == 200, f"请求失败: {response.text}"
    assert response.headers.get("content-type") == "text/csv; charset=utf-8", "Content-Type 不正确"
    
    content = response.text
    lines = content.strip().split("\n")
    print(f"CSV 行数: {len(lines)}")
    print(f"表头: {lines[0]}")
    if len(lines) > 1:
        print(f"数据行示例: {lines[1]}")
    
    print("✓ 汇总导出接口正常")


def process_queue_items(admin_token):
    print_step(9, "处理队列以产生不同状态的数据")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/queue/", headers=headers)
    queues = response.json()
    
    print(f"待处理队列数量: {len(queues)}")
    
    for i, queue in enumerate(queues[:3]):
        response = client.post(
            "/queue/process",
            headers=headers,
            json={"queue_id": queue["id"], "force": False}
        )
        if response.status_code == 200:
            result = response.json()
            print(f"  处理队列 {i+1}: {result.get('new_status')}")
    
    print("✓ 队列处理完成")


def main():
    print("\n" + "="*70)
    print("  社区团购售后重试补偿队列 - 报表系统测试")
    print("="*70)
    
    try:
        admin_token = get_token("admin", "admin123")
        assert admin_token, "管理员登录失败"
        
        prepare_test_data(admin_token)
        process_queue_items(admin_token)
        test_summary_report(admin_token)
        test_retry_category_report(admin_token)
        test_dead_letter_report(admin_token)
        test_issue_type_report(admin_token)
        test_city_overview(admin_token)
        test_failed_records(admin_token)
        test_export_summary(admin_token)
        
        print("\n" + "="*70)
        print("  ✓ 所有报表测试通过！")
        print("  - /reports/summary - 汇总报表正常")
        print("  - /reports/retry-categories - 重试分类正常")
        print("  - /reports/dead-letters - 死信报表正常")
        print("  - /reports/issue-types - 问题类型正常")
        print("  - /reports/city-overview - 城市概览正常")
        print("  - /reports/failed-records - 失败记录正常")
        print("  - /reports/export/summary - 汇总导出正常")
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
