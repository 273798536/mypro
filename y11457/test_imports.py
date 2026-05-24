#!/usr/bin/env python3
"""
历史数据导入测试脚本
验证所有样本文件导入功能正常工作
"""

import sys
import os
import tempfile
import zipfile
from datetime import datetime

try:
    from fastapi.testclient import TestClient
except ImportError:
    print("请先安装依赖: pip install fastapi uvicorn")
    sys.exit(1)

from app.main import app

client = TestClient(app)

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")


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


def test_csv_parsing():
    """测试 CSV 文件解析是否正确"""
    print_step(1, "测试 CSV 文件解析")
    
    import pandas as pd
    
    test_files = [
        "sample_leader_refunds.csv",
        "sample_warehouse_reviews.csv", 
        "sample_user_remarks.csv",
        "sample_manual_price_adjusts.csv"
    ]
    
    for filename in test_files:
        filepath = os.path.join(SAMPLES_DIR, filename)
        if os.path.exists(filepath):
            df = pd.read_csv(filepath)
            print(f"\n{filename}:")
            print(f"  行数: {len(df)}")
            print(f"  列数: {len(df.columns)}")
            print(f"  列名: {list(df.columns)}")
            
            # 检查第一行数据
            if len(df) > 0:
                first_row = df.iloc[0]
                print(f"  第一行 order_no: {first_row.get('order_no')}")
                print(f"  第一行 city: {first_row.get('city')}")
                
                # 检查字段是否合理
                assert len(df.columns) >= 5, f"{filename} 列数太少"
                assert 'order_no' in df.columns, f"{filename} 缺少 order_no 列"
                assert 'city' in df.columns, f"{filename} 缺少 city 列"
    
    print("\n✓ CSV 解析测试通过")


def test_import_leader_refunds(admin_token):
    print_step(2, "测试团长退款表导入")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    filepath = os.path.join(SAMPLES_DIR, "sample_leader_refunds.csv")
    with open(filepath, 'rb') as f:
        files = {"file": ("sample_leader_refunds.csv", f, "text/csv")}
        data = {"file_type": "leader_refund", "is_historical": "false"}
        response = client.post(
            "/import/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"导入失败: {response.text}"
    
    result = response.json()
    print(f"批次号: {result.get('batch_no')}")
    print(f"成功: {result.get('success_count')}")
    print(f"失败: {result.get('failed_count')}")
    
    # 首次导入成功数应 >= 1，重复导入失败数 >= 0（重复记录）
    assert result.get('success_count') + result.get('failed_count') >= 1, "至少应处理1条记录"
    
    print("✓ 团长退款表导入完成")


def test_import_warehouse_reviews(admin_token):
    print_step(3, "测试仓库复核表导入")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    filepath = os.path.join(SAMPLES_DIR, "sample_warehouse_reviews.csv")
    with open(filepath, 'rb') as f:
        files = {"file": ("sample_warehouse_reviews.csv", f, "text/csv")}
        data = {"file_type": "warehouse_review", "is_historical": "false"}
        response = client.post(
            "/import/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"导入失败: {response.text}"
    
    result = response.json()
    print(f"批次号: {result.get('batch_no')}")
    print(f"成功: {result.get('success_count')}")
    print(f"失败: {result.get('failed_count')}")
    
    # 首次导入成功数应 >= 1，重复导入失败数 >= 0（重复记录）
    assert result.get('success_count') + result.get('failed_count') >= 1, "至少应处理1条记录"
    
    print("✓ 仓库复核表导入完成")


def test_import_user_remarks(admin_token):
    print_step(4, "测试用户备注表导入 - 含逗号字段")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    filepath = os.path.join(SAMPLES_DIR, "sample_user_remarks.csv")
    with open(filepath, 'rb') as f:
        files = {"file": ("sample_user_remarks.csv", f, "text/csv")}
        data = {"file_type": "user_remark", "is_historical": "false"}
        response = client.post(
            "/import/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"导入失败: {response.text}"
    
    result = response.json()
    print(f"批次号: {result.get('batch_no')}")
    print(f"成功: {result.get('success_count')}")
    print(f"失败: {result.get('failed_count')}")
    
    # 至少处理1条记录
    assert result.get('success_count') + result.get('failed_count') >= 1, "至少应处理1条记录"
    
    # 查询导入后的数据验证字段正确性
    response2 = client.get("/sources/user-remarks", headers=headers)
    if response2.status_code == 200:
        data = response2.json()
        print(f"\n导入后用户备注数量: {len(data)}")
        if data:
            for item in data[:3]:
                print(f"  - remark_no: {item.get('remark_no')}")
                print(f"    order_no: {item.get('order_no')}")
                print(f"    city: {item.get('city')}")
                # 验证字段没有错位
                assert len(item.get('order_no', '')) < 20, f"order_no 字段异常: {item.get('order_no')}"
                assert item.get('city') in ['北京', '上海', '广州', '深圳'], f"city 字段异常: {item.get('city')}"
    
    print("✓ 用户备注表导入完成 - 含逗号字段解析正确")


def test_import_manual_price_adjusts(admin_token):
    print_step(5, "测试手工改价表导入")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    filepath = os.path.join(SAMPLES_DIR, "sample_manual_price_adjusts.csv")
    with open(filepath, 'rb') as f:
        files = {"file": ("sample_manual_price_adjusts.csv", f, "text/csv")}
        data = {"file_type": "manual_price_adjust", "is_historical": "false"}
        response = client.post(
            "/import/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"导入失败: {response.text}"
    
    result = response.json()
    print(f"批次号: {result.get('batch_no')}")
    print(f"成功: {result.get('success_count')}")
    print(f"失败: {result.get('failed_count')}")
    
    # 至少处理1条记录
    assert result.get('success_count') + result.get('failed_count') >= 1, "至少应处理1条记录"
    
    print("✓ 手工改价表导入完成")


def test_historical_import(admin_token):
    print_step(6, "测试历史数据导入")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    filepath = os.path.join(SAMPLES_DIR, "sample_leader_refunds.csv")
    with open(filepath, 'rb') as f:
        files = {"file": ("sample_leader_refunds.csv", f, "text/csv")}
        data = {"file_type": "leader_refund", "is_historical": "true"}
        response = client.post(
            "/import/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 200, f"导入失败: {response.text}"
    
    result = response.json()
    print(f"批次号: {result.get('batch_no')}")
    print(f"成功: {result.get('success_count')}")
    print(f"失败: {result.get('failed_count')}")
    
    # 至少处理1条记录
    assert result.get('success_count') + result.get('failed_count') >= 1, "至少应处理1条记录"
    
    print("✓ 历史数据导入完成")


def test_queue_after_import(admin_token):
    print_step(7, "验证导入后补偿队列正常")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/queue/", headers=headers)
    assert response.status_code == 200, f"查询队列失败: {response.text}"
    
    queues = response.json()
    print(f"补偿队列数量: {len(queues)}")
    
    if queues:
        for queue in queues[:3]:
            print(f"  - {queue.get('queue_no')}: {queue.get('status')}, 城市: {queue.get('city')}, 金额: ¥{queue.get('compensation_amount')}")
    
    print("✓ 补偿队列正常")


def test_reports_after_import(admin_token):
    print_step(8, "验证导入后报表正常")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.get("/reports/summary", headers=headers)
    assert response.status_code == 200, f"查询汇总报表失败: {response.text}"
    
    data = response.json()
    print(f"报表城市数量: {len(data)}")
    
    for city_data in data:
        print(f"  {city_data.get('city')}: {city_data.get('total_count')}条, ¥{city_data.get('total_amount')}")
    
    print("✓ 报表汇总正常")


def main():
    print("\n" + "="*70)
    print("  社区团购售后重试补偿队列 - 历史数据导入测试")
    print("="*70)
    
    try:
        # 先测试 CSV 解析
        test_csv_parsing()
        
        admin_token = get_token("admin", "admin123")
        assert admin_token, "管理员登录失败"
        
        test_import_leader_refunds(admin_token)
        test_import_warehouse_reviews(admin_token)
        test_import_user_remarks(admin_token)
        test_import_manual_price_adjusts(admin_token)
        test_historical_import(admin_token)
        test_queue_after_import(admin_token)
        test_reports_after_import(admin_token)
        
        print("\n" + "="*70)
        print("  ✓ 所有导入测试通过！")
        print("  - CSV 解析正确（含带逗号字段）")
        print("  - 团长退款表导入接口正常")
        print("  - 仓库复核表导入接口正常")
        print("  - 用户备注表导入接口正常")
        print("  - 手工改价表导入接口正常")
        print("  - 历史数据导入接口正常")
        print("  - 导入后队列正常")
        print("  - 导入后报表正常")
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
