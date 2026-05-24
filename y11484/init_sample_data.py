import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"


def init_sample_data():
    print("开始初始化样例数据...")
    
    headers = {
        "X-User-Id": "admin_001",
        "X-User-Role": "quality_manager"
    }

    batch_no = f"BATCH{datetime.now().strftime('%Y%m%d001')}"
    
    print(f"\n1. 创建留样标签: {batch_no}")
    sample_label_data = {
        "batch_no": batch_no,
        "product_name": "红烧肉",
        "production_time": (datetime.now() - timedelta(hours=2)).isoformat(),
        "sample_time": (datetime.now() - timedelta(hours=1)).isoformat(),
        "sampler": "张三",
        "storage_location": "冷藏柜A区-01"
    }
    response = requests.post(f"{BASE_URL}/sample-labels/", json=sample_label_data, headers=headers)
    if response.status_code == 200:
        sample_label = response.json()
        sample_label_id = sample_label["id"]
        print(f"   留样标签创建成功, ID: {sample_label_id}")
    else:
        print(f"   创建失败: {response.text}")
        return

    print(f"\n2. 创建温度记录 (批次ID: {sample_label_id})")
    for i in range(3):
        temp_data = {
            "sample_label_id": sample_label_id,
            "record_time": (datetime.now() - timedelta(hours=i)).isoformat(),
            "temperature": 2.5 + i * 0.3,
            "recorder": "李四"
        }
        response = requests.post(f"{BASE_URL}/temperature-records/", json=temp_data, headers=headers)
        if response.status_code == 200:
            print(f"   温度记录{i+1}创建成功")
        else:
            print(f"   温度记录{i+1}创建失败: {response.text}")

    print(f"\n3. 创建扫码记录 - 门店A (批次ID: {sample_label_id})")
    scan_data1 = {
        "sample_label_id": sample_label_id,
        "store_id": "STORE001",
        "store_name": "朝阳路店",
        "scan_time": (datetime.now() - timedelta(minutes=30)).isoformat(),
        "scanner": "王五",
        "quantity": 50
    }
    response = requests.post(f"{BASE_URL}/scan-records/", json=scan_data1, headers=headers)
    if response.status_code == 200:
        print("   门店A扫码记录创建成功")
    else:
        print(f"   创建失败: {response.text}")

    print(f"\n4. 创建扫码记录 - 门店B (批次ID: {sample_label_id})")
    scan_data2 = {
        "sample_label_id": sample_label_id,
        "store_id": "STORE002",
        "store_name": "中关村店",
        "scan_time": (datetime.now() - timedelta(minutes=25)).isoformat(),
        "scanner": "赵六",
        "quantity": 30
    }
    response = requests.post(f"{BASE_URL}/scan-records/", json=scan_data2, headers=headers)
    if response.status_code == 200:
        print("   门店B扫码记录创建成功")
    else:
        print(f"   创建失败: {response.text}")

    print(f"\n5. 创建门店投诉 (批次ID: {sample_label_id})")
    complaint_data = {
        "sample_label_id": sample_label_id,
        "store_id": "STORE001",
        "store_name": "朝阳路店",
        "complaint_type": "口感问题",
        "complaint_desc": "顾客反映肉质偏硬",
        "complaint_time": datetime.now().isoformat(),
        "handler": "孙七"
    }
    response = requests.post(f"{BASE_URL}/complaints/", json=complaint_data, headers=headers)
    if response.status_code == 200:
        print("   投诉记录创建成功")
    else:
        print(f"   创建失败: {response.text}")

    print(f"\n6. 提交留样标签审核")
    status_data = {
        "new_status": "submitted",
        "change_reason": "信息完整,提交审核",
        "operator": "admin_001",
        "operator_role": "quality_manager",
        "ip_address": "192.168.1.100"
    }
    response = requests.post(f"{BASE_URL}/sample-labels/{sample_label_id}/status", json=status_data)
    if response.status_code == 200:
        print("   提交成功")
    else:
        print(f"   提交失败: {response.text}")

    print(f"\n7. 确认留样标签 (二次确认)")
    status_data2 = {
        "new_status": "confirmed",
        "change_reason": "审核通过,信息无误",
        "operator": "manager_001",
        "operator_role": "quality_manager",
        "ip_address": "192.168.1.101"
    }
    response = requests.post(f"{BASE_URL}/sample-labels/{sample_label_id}/status", json=status_data2)
    if response.status_code == 200:
        print("   确认成功")
    else:
        print(f"   确认失败: {response.text}")

    print(f"\n8. 制造一条坏数据 (用于测试失败记录)")
    bad_temp_data = {
        "sample_label_id": sample_label_id,
        "record_time": datetime.now().isoformat(),
        "temperature": 999,
        "recorder": "李四"
    }
    response = requests.post(f"{BASE_URL}/temperature-records/", json=bad_temp_data, headers=headers)
    if response.status_code == 400:
        print(f"   坏数据已被拦截, 错误: {response.json()['detail']}")
    else:
        print("   异常: 坏数据应该被拦截但未被拦截")

    print(f"\n9. 重复提交 (测试幂等性)")
    response = requests.post(f"{BASE_URL}/sample-labels/{sample_label_id}/status", json=status_data2)
    if response.status_code == 200:
        result = response.json()
        print(f"   幂等操作结果: old_status={result['old_status']}, new_status={result['new_status']}")
    else:
        print(f"   请求失败: {response.text}")

    print(f"\n=== 样例数据初始化完成 ===")
    print(f"测试批次号: {batch_no}")
    print(f"可以访问: {BASE_URL}/trace/batch/{batch_no} 查看追溯结果")
    print(f"可以访问: {BASE_URL}/failed-records/ 查看失败记录")
    print(f"可以访问: {BASE_URL}/audit-logs/ 查看审计日志")


if __name__ == "__main__":
    init_sample_data()
