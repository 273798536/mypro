import requests
import json
import sys
import time
from datetime import datetime

API_BASE = "http://localhost:8000/api/v1"


def test_export_with_filters():
    """测试导出带筛选条件"""
    print("=" * 70)
    print("测试: 导出带筛选条件")
    print("=" * 70)

    # 先提交一批数据
    batch_data = {
        "batch_no": "EXPORT_TEST_" + datetime.now().strftime("%H%M%S"),
        "source": "test_export",
        "operator": "test_user",
        "appointments": [
            {
                "appointment_no": "APT_FILTER_001",
                "order_no": "ORD_FILTER_001",
                "user_name": "筛选测试用户1",
                "user_phone": "13800000001",
                "address": "北京市朝阳区测试路1号",
                "appliance_type": "空调",
                "appliance_model": "TEST-001",
                "service_type": "新安装",
                "scheduled_time": "2024-01-15T10:00:00",
                "actual_time": "2024-01-15T12:00:00",
                "technician_id": "T001",
                "technician_name": "测试师傅1",
                "status": "completed"
            },
            {
                "appointment_no": "APT_FILTER_002",
                "order_no": "ORD_FILTER_002",
                "user_name": "筛选测试用户2",
                "user_phone": "13800000002",
                "address": "北京市海淀区测试路2号",
                "appliance_type": "冰箱",
                "appliance_model": "TEST-002",
                "service_type": "维修",
                "scheduled_time": "2024-01-16T10:00:00",
                "actual_time": "2024-01-16T12:00:00",
                "technician_id": "T002",
                "technician_name": "测试师傅2",
                "status": "completed"
            }
        ],
        "locations": [
            {
                "appointment_no": "APT_FILTER_001",
                "technician_id": "T001",
                "latitude": 39.9,
                "longitude": 116.4,
                "location_time": "2024-01-15T11:00:00",
                "location_type": "arrival"
            },
            {
                "appointment_no": "APT_FILTER_002",
                "technician_id": "T002",
                "latitude": 39.95,
                "longitude": 116.35,
                "location_time": "2024-01-16T11:00:00",
                "location_type": "arrival"
            }
        ],
        "reviews": [
            {
                "appointment_no": "APT_FILTER_001",
                "review_no": "REV_FILTER_001",
                "rating": 5,
                "is_negative": False,
                "review_content": "服务很好",
                "reviewer_name": "用户1",
                "review_time": "2024-01-15T14:00:00"
            },
            {
                "appointment_no": "APT_FILTER_002",
                "review_no": "REV_FILTER_002",
                "rating": 2,
                "is_negative": True,
                "negative_reason": "安装不规范",
                "negative_reason_detail": "安装后发现漏水",
                "review_content": "不满意",
                "reviewer_name": "用户2",
                "review_time": "2024-01-16T14:00:00"
            }
        ],
        "photos": [
            {
                "appointment_no": "APT_FILTER_002",
                "photo_no": "PHOTO_FILTER_001",
                "photo_type": "安装现场",
                "is_abnormal": True,
                "description": "漏水照片",
                "image_url": "http://example.com/photo1.jpg",
                "upload_time": "2024-01-16T15:00:00"
            }
        ]
    }

    response = requests.post(f"{API_BASE}/batch/submit", json=batch_data)
    result = response.json()

    if result.get("status") in ["success", "partial_success"]:
        print("✓ 数据提交成功")
    else:
        print(f"✗ 数据提交失败: {result}")
        return False

    # 测试1: 按预约单号导出
    print("\n--- 测试1: 按预约单号导出 ---")
    export_data = {
        "task_type": "appointments",
        "operator": "test_user",
        "freeze_before_export": True,
        "filters": {
            "appointment_no": ["APT_FILTER_001"]
        }
    }

    response = requests.post(f"{API_BASE}/export", json=export_data)
    result = response.json()

    print(f"任务号: {result.get('task_no')}")
    print(f"状态: {result.get('status')}")
    print(f"记录数: {result.get('record_count')}")
    print(f"是否冻结: {result.get('is_frozen')}")
    print(f"筛选条件: {result.get('filters_applied')}")

    if result.get("status") == "completed" and result.get("record_count") == 1:
        print("✓ 按预约单号导出测试通过! (只导出1条预约单)")
    else:
        print(f"✗ 按预约单号导出测试失败! 期望1条，实际 {result.get('record_count')} 条")
        return False

    # 测试2: 导出完整链路带筛选
    print("\n--- 测试2: 导出完整链路带筛选 ---")
    export_data = {
        "task_type": "full_chain",
        "operator": "test_user",
        "freeze_before_export": True,
        "filters": {
            "appointment_no": ["APT_FILTER_002"]
        }
    }

    response = requests.post(f"{API_BASE}/export", json=export_data)
    result = response.json()

    print(f"任务号: {result.get('task_no')}")
    print(f"状态: {result.get('status')}")
    print(f"记录数: {result.get('record_count')}")
    print(f"是否冻结: {result.get('is_frozen')}")

    if result.get("status") == "completed":
        print("✓ 完整链路导出测试通过!")
    else:
        print(f"✗ 完整链路导出测试失败!")
        return False

    # 测试3: 验证冻结后的预约单不能修改
    print("\n--- 测试3: 验证冻结后的预约单不能修改 ---")
    batch_data_override = {
        "batch_no": "EXPORT_TEST_OVERRIDE_" + datetime.now().strftime("%H%M%S"),
        "source": "test_override",
        "operator": "test_user",
        "appointments": [
            {
                "appointment_no": "APT_FILTER_001",
                "order_no": "ORD_FILTER_001",
                "user_name": "修改后的用户",
                "user_phone": "13800000001",
                "address": "北京市朝阳区测试路1号",
                "appliance_type": "空调",
                "appliance_model": "TEST-001",
                "service_type": "新安装",
                "scheduled_time": "2024-01-15T10:00:00",
                "actual_time": "2024-01-15T12:00:00",
                "technician_id": "T001",
                "technician_name": "测试师傅1",
                "status": "completed"
            }
        ],
        "duplicate_strategy": "overwrite"
    }

    response = requests.post(f"{API_BASE}/batch/submit", json=batch_data_override)
    result = response.json()

    print(f"状态: {result.get('status')}")
    print(f"失败数: {result.get('fail_count')}")

    if result.get("status") in ["failed", "partial_success"] and result.get("fail_count", 0) > 0:
        print("✓ 冻结保护测试通过! (冻结的预约单不能修改)")
    else:
        print(f"✗ 冻结保护测试失败!")
        return False

    # 测试4: 验证原始数据未被修改
    print("\n--- 测试4: 验证原始数据未被修改 ---")
    # 通过查询批次历史来验证
    print("(跳过 - 需要查询接口验证)")

    return True


def test_export_with_time_filter():
    """测试按时间范围导出"""
    print("\n" + "=" * 70)
    print("测试: 按时间范围导出")
    print("=" * 70)

    export_data = {
        "task_type": "appointments",
        "operator": "test_user",
        "freeze_before_export": True,
        "filters": {
            "start_time": "2020-01-01T00:00:00",
            "end_time": "2030-12-31T23:59:59"
        }
    }

    response = requests.post(f"{API_BASE}/export", json=export_data)
    result = response.json()

    print(f"任务号: {result.get('task_no')}")
    print(f"状态: {result.get('status')}")
    print(f"记录数: {result.get('record_count')}")
    print(f"是否冻结: {result.get('is_frozen')}")
    print(f"筛选条件: {result.get('filters_applied')}")

    if result.get("status") == "completed" and result.get("record_count") > 0:
        print("✓ 按时间范围导出测试通过!")
        return True
    else:
        print(f"✗ 按时间范围导出测试失败!")
        return False


def test_cli_export_help():
    """测试CLI导出命令帮助"""
    print("\n" + "=" * 70)
    print("测试: CLI导出命令帮助")
    print("=" * 70)

    import subprocess
    result = subprocess.run(
        ["python3", "cli.py", "export", "--help"],
        capture_output=True,
        text=True
    )

    print("CLI export --help 输出:")
    print(result.stdout)

    if "--appointment-no" in result.stdout and "--start-time" in result.stdout:
        print("✓ CLI导出命令帮助测试通过!")
        return True
    else:
        print("✗ CLI导出命令帮助测试失败!")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("第二轮修复验证测试 - 导出冻结链路")
    print("=" * 70)

    results = []

    # 等待服务启动
    print("\n等待服务启动...")
    for i in range(10):
        try:
            response = requests.get("http://localhost:8000/health")
            if response.status_code == 200:
                print("服务已启动!")
                break
        except:
            time.sleep(1)
    else:
        print("错误: 服务未启动，请先启动服务")
        print("运行: python3 -m uvicorn main:app --port 8000")
        sys.exit(1)

    results.append(("导出带筛选条件", test_export_with_filters()))
    results.append(("按时间范围导出", test_export_with_time_filter()))
    results.append(("CLI导出命令帮助", test_cli_export_help()))

    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)

    passed = 0
    failed = 0
    for name, success in results:
        status = "✓ 通过" if success else "✗ 失败"
        print(f"{status}: {name}")
        if success:
            passed += 1
        else:
            failed += 1

    print(f"\n总计: {passed} 通过, {failed} 失败")

    if failed > 0:
        sys.exit(1)
    else:
        print("\n所有测试通过!")
        sys.exit(0)
