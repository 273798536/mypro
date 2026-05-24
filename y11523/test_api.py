import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"


def test_batch_submit():
    print("=" * 60)
    print("测试1: 批量提交数据")
    print("=" * 60)

    payload = {
        "batch_no": f"TEST{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "test_script",
        "operator": "test_user",
        "duplicate_strategy": "append",
        "appointments": [
            {
                "appointment_no": "APT000001",
                "user_name": "张三",
                "user_phone": "13800138001",
                "address": "北京市朝阳区测试路1号",
                "appliance_type": "空调",
                "appliance_model": "KFR-35GW",
                "service_type": "新安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
                "scheduled_time": (datetime.now() - timedelta(days=5)).isoformat(),
                "actual_time": (datetime.now() - timedelta(days=5, hours=2)).isoformat(),
            },
            {
                "appointment_no": "APT000002",
                "is_rescheduled": True,
                "original_appointment_no": "APT000001",
                "user_name": "张三",
                "user_phone": "13800138001",
                "address": "北京市朝阳区测试路1号",
                "appliance_type": "空调",
                "service_type": "新安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
                "scheduled_time": (datetime.now() - timedelta(days=3)).isoformat(),
            },
            {
                "appointment_no": "APT000003",
                "is_second_visit": True,
                "parent_appointment_no": "APT000001",
                "user_name": "张三",
                "user_phone": "13800138001",
                "address": "北京市朝阳区测试路1号",
                "appliance_type": "空调",
                "service_type": "维修",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
                "scheduled_time": (datetime.now() - timedelta(days=1)).isoformat(),
            },
        ],
        "locations": [
            {
                "appointment_no": "APT000001",
                "technician_id": "T001",
                "latitude": 39.9042,
                "longitude": 116.4074,
                "location_time": (datetime.now() - timedelta(days=5)).isoformat(),
                "location_type": "arrival",
            }
        ],
        "reviews": [
            {
                "appointment_no": "APT000001",
                "review_no": "REV000001",
                "rating": 2,
                "is_negative": True,
                "negative_reason": "安装不规范",
                "negative_reason_detail": "安装位置不对，影响使用",
                "review_time": (datetime.now() - timedelta(days=4)).isoformat(),
            }
        ],
        "photos": [
            {
                "appointment_no": "APT000001",
                "photo_no": "PHO000001",
                "photo_type": "安装现场",
                "description": "发现安装异常",
                "is_abnormal": True,
                "upload_time": (datetime.now() - timedelta(days=5)).isoformat(),
            }
        ],
    }

    response = requests.post(f"{BASE_URL}/batch/submit", json=payload)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_complaint_create():
    print("\n" + "=" * 60)
    print("测试2: 创建投诉单（自动合并链路）")
    print("=" * 60)

    payload = {
        "complaint_no": f"CMP{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "appointment_no": "APT000001",
        "complaint_type": "service_quality",
        "complaint_reason": "用户投诉安装质量问题",
    }

    response = requests.post(
        f"{BASE_URL}/complaint/create",
        params={"operator": "test_user"},
        json=payload,
    )
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_verify_evidence():
    print("\n" + "=" * 60)
    print("测试3: 验证差评证据链")
    print("=" * 60)

    response = requests.get(
        f"{BASE_URL}/complaint/review/REV000001/verify-evidence"
    )
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_reconcile():
    print("\n" + "=" * 60)
    print("测试4: 数据对账")
    print("=" * 60)

    payload = {
        "start_time": (datetime.now() - timedelta(days=30)).isoformat(),
        "end_time": datetime.now().isoformat(),
        "operator": "test_user",
    }

    response = requests.post(f"{BASE_URL}/reconcile", json=payload)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"预约单总数: {result['total_appointments']}")
    print(f"评价总数: {result['total_reviews']}")
    print(f"照片总数: {result['total_photos']}")
    print(f"投诉单总数: {result['total_complaints']}")
    print(f"已合并投诉: {result['merged_complaints']}")
    print(f"未合并投诉: {result['unmerged_complaints']}")
    print(f"差评有证据: {result['negative_reviews_with_evidence']}")
    print(f"差评无证据: {result['negative_reviews_without_evidence']}")
    if result.get("issues"):
        print(f"\n发现问题 ({len(result['issues'])} 项):")
        for issue in result["issues"]:
            print(f"  - {issue['type']}: {issue['description']}")
    return result


def test_audit_logs():
    print("\n" + "=" * 60)
    print("测试5: 查询审计日志")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}/audit-logs")
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"日志总数: {result['total']}")
    print("\n最近5条记录:")
    for log in result["logs"][:5]:
        print(f"  [{log['operation_time']}] {log['operation_type']} - {log['entity_type']}/{log['entity_id']} - {log['operator']}")
    return result


def test_export():
    print("\n" + "=" * 60)
    print("测试6: 导出数据")
    print("=" * 60)

    payload = {
        "task_type": "full_chain",
        "operator": "test_user",
        "freeze_before_export": False,
    }

    response = requests.post(f"{BASE_URL}/export", json=payload)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_duplicate_submit():
    print("\n" + "=" * 60)
    print("测试7: 重复提交（忽略策略）")
    print("=" * 60)

    payload = {
        "batch_no": f"TEST_DUP{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "test_script",
        "operator": "test_user",
        "duplicate_strategy": "ignore",
        "appointments": [
            {
                "appointment_no": "APT000001",
                "user_name": "张三-修改",
                "user_phone": "13800138001",
                "appliance_type": "空调",
                "service_type": "新安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    response = requests.post(f"{BASE_URL}/batch/submit", json=payload)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(f"忽略数量: {result['ignored_count']}")
    print(f"追加数量: {result['appended_count']}")
    return result


def test_withdraw_and_resubmit():
    print("\n" + "=" * 60)
    print("测试8: 撤回后再提交")
    print("=" * 60)

    print("第一步: 撤回预约单")
    response = requests.post(
        f"{BASE_URL}/batch/appointment/APT000003/withdraw",
        params={"operator": "test_user", "reason": "测试撤回功能"},
    )
    print(f"撤回状态码: {response.status_code}")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))

    print("\n第二步: 重新提交撤回的预约单")
    payload = {
        "batch_no": f"TEST_RESUB{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "test_script",
        "operator": "test_user",
        "duplicate_strategy": "overwrite",
        "appointments": [
            {
                "appointment_no": "APT000003",
                "user_name": "张三-修改后",
                "user_phone": "13800138001",
                "address": "北京市朝阳区测试路1号-新地址",
                "appliance_type": "空调",
                "service_type": "维修",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    response = requests.post(f"{BASE_URL}/batch/submit", json=payload)
    print(f"重新提交状态码: {response.status_code}")
    result = response.json()
    print(f"覆盖数量: {result['overwritten_count']}")
    return result


def test_manual_adjustment():
    print("\n" + "=" * 60)
    print("测试9: 人工改判差评")
    print("=" * 60)

    payload = {
        "review_no": "REV000001",
        "operator": "manager_user",
        "is_negative": False,
        "negative_reason": None,
        "adjustment_reason": "经核实，用户反馈不实，改判为非差评",
    }

    response = requests.post(f"{BASE_URL}/complaint/review/manual-adjust", json=payload)
    print(f"状态码: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


if __name__ == "__main__":
    try:
        test_batch_submit()
        test_complaint_create()
        test_verify_evidence()
        test_reconcile()
        test_audit_logs()
        test_export()
        test_duplicate_submit()
        test_withdraw_and_resubmit()
        test_manual_adjustment()

        print("\n" + "=" * 60)
        print("所有测试完成!")
        print("=" * 60)
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback

        traceback.print_exc()
