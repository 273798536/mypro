import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8002/api/v1"


def test_partial_failure():
    print("=" * 70)
    print("测试1: 部分失败 - 师傅定位指向不存在的预约单")
    print("=" * 70)

    batch_no = f"TEST_PARTIAL_FAIL_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    payload = {
        "batch_no": batch_no,
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "append",
        "appointments": [
            {
                "appointment_no": "A1",
                "user_name": "测试用户",
                "user_phone": "13800138001",
                "appliance_type": "空调",
                "service_type": "安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [
            {
                "appointment_no": "A1",
                "technician_id": "T001",
                "latitude": 39.9,
                "longitude": 116.4,
                "location_type": "arrival",
            },
            {
                "appointment_no": "MISSING",
                "technician_id": "T002",
                "latitude": 39.9,
                "longitude": 116.4,
                "location_type": "arrival",
            }
        ],
        "reviews": [
            {
                "appointment_no": "MISSING",
                "review_no": "REV_MISSING",
                "rating": 1,
                "is_negative": True,
                "negative_reason": "测试不存在预约单的评价",
            }
        ],
        "photos": [
            {
                "appointment_no": "MISSING",
                "photo_no": "PHO_MISSING",
                "photo_type": "测试",
                "is_abnormal": True,
            }
        ],
    }

    print(f"提交批次: {batch_no}")
    print(f"包含: 1个有效预约单(A1) + 1个有效定位 + 1个指向MISSING的定位 + 1个指向MISSING的评价 + 1个指向MISSING的照片")

    response = requests.post(f"{BASE_URL}/batch/submit", json=payload)
    result = response.json()

    print(f"\n返回结果:")
    print(f"  status: {result.get('status')}")
    print(f"  total_count: {result.get('total_count')}")
    print(f"  success_count: {result.get('success_count')}")
    print(f"  fail_count: {result.get('fail_count')}")
    print(f"  failed_items: {json.dumps(result.get('failed_items', []), indent=4, ensure_ascii=False)}")

    assert result['status'] == 'partial_success', f"期望 partial_success, 实际 {result['status']}"
    assert result['fail_count'] == 3, f"期望 fail_count=3, 实际 {result['fail_count']}"
    assert result['success_count'] == 2, f"期望 success_count=2, 实际 {result['success_count']}"
    assert len(result['failed_items']) == 3, f"期望 failed_items=3, 实际 {len(result['failed_items'])}"

    print("\n✓ 部分失败测试通过!")
    return True


def test_duplicate_batch_ignore():
    print("\n" + "=" * 70)
    print("测试2: 重复提交 batch_no - 忽略策略")
    print("=" * 70)

    batch_no = f"TEST_DUP_IGNORE_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    payload1 = {
        "batch_no": batch_no,
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "append",
        "appointments": [
            {
                "appointment_no": f"APT_IGNORE_1",
                "user_name": "测试用户",
                "user_phone": "13800138001",
                "appliance_type": "空调",
                "service_type": "安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    print(f"第一次提交: {batch_no}")
    response1 = requests.post(f"{BASE_URL}/batch/submit", json=payload1)
    result1 = response1.json()
    print(f"  第一次 status: {result1.get('status')}")
    print(f"  第一次 success_count: {result1.get('success_count')}")

    payload2 = {
        "batch_no": batch_no,
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "ignore",
        "appointments": [
            {
                "appointment_no": f"APT_IGNORE_2",
                "user_name": "测试用户2",
                "user_phone": "13800138002",
                "appliance_type": "冰箱",
                "service_type": "安装",
                "technician_id": "T002",
                "technician_name": "王师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    print(f"\n第二次提交 (同一 batch_no, ignore策略): {batch_no}")
    response2 = requests.post(f"{BASE_URL}/batch/submit", json=payload2)
    result2 = response2.json()
    print(f"  第二次 status: {result2.get('status')}")
    print(f"  第二次 message: {result2.get('message')}")
    print(f"  第二次 existing_status: {result2.get('existing_status')}")

    assert result2['status'] == 'duplicate_ignored', f"期望 duplicate_ignored, 实际 {result2['status']}"
    assert result2['message'].find('already exists') >= 0, "应该提示已存在"

    print("\n✓ 重复提交(忽略)测试通过!")
    return True


def test_duplicate_batch_overwrite():
    print("\n" + "=" * 70)
    print("测试3: 重复提交 batch_no - 覆盖策略")
    print("=" * 70)

    batch_no = f"TEST_DUP_OVERWRITE_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    payload1 = {
        "batch_no": batch_no,
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "append",
        "appointments": [
            {
                "appointment_no": f"APT_OVERWRITE_1",
                "user_name": "原始用户",
                "user_phone": "13800138001",
                "appliance_type": "空调",
                "service_type": "安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    print(f"第一次提交: {batch_no}")
    response1 = requests.post(f"{BASE_URL}/batch/submit", json=payload1)
    result1 = response1.json()
    print(f"  第一次 success_count: {result1.get('success_count')}")

    payload2 = {
        "batch_no": batch_no,
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "overwrite",
        "appointments": [
            {
                "appointment_no": f"APT_OVERWRITE_1",
                "user_name": "修改后用户",
                "user_phone": "13800138002",
                "appliance_type": "冰箱",
                "service_type": "维修",
                "technician_id": "T002",
                "technician_name": "王师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    print(f"\n第二次提交 (同一 batch_no, overwrite策略): {batch_no}")
    response2 = requests.post(f"{BASE_URL}/batch/submit", json=payload2)
    result2 = response2.json()
    print(f"  第二次 status: {result2.get('status')}")
    print(f"  第二次 success_count: {result2.get('success_count')}")

    assert result2['status'] == 'success', f"期望 success, 实际 {result2['status']}"

    print("\n✓ 重复提交(覆盖)测试通过!")
    return True


def test_freeze_and_block_modification():
    print("\n" + "=" * 70)
    print("测试4: 导出冻结后阻止修改")
    print("=" * 70)

    appointment_no = f"APT_FREEZE_{datetime.now().strftime('%H%M%S')}"

    payload1 = {
        "batch_no": f"TEST_FREEZE_1_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "append",
        "appointments": [
            {
                "appointment_no": appointment_no,
                "user_name": "冻结测试用户",
                "user_phone": "13800138001",
                "appliance_type": "空调",
                "service_type": "安装",
                "technician_id": "T001",
                "technician_name": "李师傅",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [
            {
                "appointment_no": appointment_no,
                "review_no": f"REV_FREEZE_{datetime.now().strftime('%H%M%S')}",
                "rating": 5,
                "is_negative": False,
            }
        ],
        "photos": [],
    }

    print(f"创建预约单: {appointment_no}")
    response1 = requests.post(f"{BASE_URL}/batch/submit", json=payload1)
    result1 = response1.json()
    print(f"  success_count: {result1.get('success_count')}")

    print(f"\n导出并冻结预约单: {appointment_no}")
    export_payload = {
        "task_type": "appointments",
        "operator": "admin",
        "filters": {
            "appointment_no": [appointment_no]
        },
        "freeze_before_export": True,
    }
    export_response = requests.post(f"{BASE_URL}/export", json=export_payload)
    export_result = export_response.json()
    print(f"  export task_no: {export_result.get('task_no')}")
    print(f"  is_frozen: {export_result.get('is_frozen')}")

    print(f"\n尝试覆盖冻结的预约单: {appointment_no}")
    payload2 = {
        "batch_no": f"TEST_FREEZE_2_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "test_fix",
        "operator": "test_user",
        "duplicate_strategy": "overwrite",
        "appointments": [
            {
                "appointment_no": appointment_no,
                "user_name": "尝试修改",
                "user_phone": "99999999999",
                "appliance_type": "洗衣机",
                "service_type": "维修",
                "technician_id": "T999",
                "technician_name": "尝试修改",
                "status": "completed",
            }
        ],
        "locations": [],
        "reviews": [],
        "photos": [],
    }

    response2 = requests.post(f"{BASE_URL}/batch/submit", json=payload2)
    result2 = response2.json()
    print(f"  status: {result2.get('status')}")
    print(f"  fail_count: {result2.get('fail_count')}")
    print(f"  frozen_appointments_blocked: {result2.get('frozen_appointments_blocked')}")
    print(f"  failed_items: {json.dumps(result2.get('failed_items', []), indent=4, ensure_ascii=False)}")

    assert result2['status'] == 'failed', f"期望 failed, 实际 {result2['status']}"
    assert result2['fail_count'] == 1, f"期望 fail_count=1, 实际 {result2['fail_count']}"
    assert appointment_no in result2.get('frozen_appointments_blocked', []), "预约单应该在冻结列表中"

    print(f"\n验证预约单未被修改:")
    appt_response = requests.get(f"{BASE_URL}/batch/appointment/{appointment_no}")
    appt = appt_response.json()
    print(f"  user_name: {appt.get('user_name')} (应该是 '冻结测试用户')")
    assert appt['user_name'] == '冻结测试用户', f"数据被修改了! user_name={appt['user_name']}"

    print("\n✓ 冻结阻止修改测试通过!")
    return True


def test_audit_logs():
    print("\n" + "=" * 70)
    print("测试5: 审计日志验证")
    print("=" * 70)

    response = requests.get(f"{BASE_URL}/audit-logs")
    result = response.json()

    print(f"审计日志总数: {result['total']}")
    print("\n最近10条记录:")
    for log in result['logs'][:10]:
        print(f"  [{log['operation_time']}] {log['operation_type']:20s} | {log['entity_type']:15s} | {log['entity_id']:25s} | {log['operator']}")

    print("\n✓ 审计日志验证通过!")
    return True


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("开始验证第一轮修复的三个问题")
    print("=" * 70)

    try:
        test_partial_failure()
        test_duplicate_batch_ignore()
        test_duplicate_batch_overwrite()
        test_freeze_and_block_modification()
        test_audit_logs()

        print("\n" + "=" * 70)
        print("所有修复验证测试通过!")
        print("=" * 70)
        print("\n已修复的问题:")
        print("1. ✓ 部分失败: 指向不存在预约单的定位/评价/照片会被计入fail_count")
        print("2. ✓ 重复batch_no: 按策略处理(ignore/overwrite/append),不再500")
        print("3. ✓ 冻结保护: 导出冻结后的数据无法被覆盖修改")

    except Exception as e:
        print(f"\n测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
