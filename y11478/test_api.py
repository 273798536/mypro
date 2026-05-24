#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"


def wait_for_service(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(f"{BASE_URL}/api/health")
            if response.status_code == 200:
                print("✓ 服务已启动")
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    print("✗ 服务启动超时")
    return False


def test_import_data():
    print("\n=== 测试1: 导入样例数据 ===")
    with open("sample_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    response = requests.post(f"{BASE_URL}/api/import", json=data)
    result = response.json()
    print(f"批次ID: {result['batch_id']}")
    print(f"总记录数: {result['total_records']}")
    print(f"成功: {result['success_count']}, 重复: {result['duplicate_count']}, 错误: {result['error_count']}")
    print(f"详情: {json.dumps(result['details'], ensure_ascii=False, indent=2)}")
    return result["batch_id"]


def test_import_duplicate():
    print("\n=== 测试2: 重复导入（验证去重） ===")
    with open("sample_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    response = requests.post(f"{BASE_URL}/api/import", json=data)
    result = response.json()
    print(f"批次ID: {result['batch_id']}")
    print(f"重复记录数: {result['duplicate_count']} (应为12)")
    print(f"成功记录数: {result['success_count']} (应为0)")


def test_import_overwrite():
    print("\n=== 测试3: 覆盖模式导入 ===")
    with open("sample_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    data["duplicate_handling"] = "overwrite"

    response = requests.post(f"{BASE_URL}/api/import", json=data)
    result = response.json()
    print(f"批次ID: {result['batch_id']}")
    print(f"覆盖记录数: {result['success_count']}")


def test_get_bookings():
    print("\n=== 测试4: 查询预约列表 ===")
    response = requests.get(f"{BASE_URL}/api/bookings?limit=10")
    bookings = response.json()
    print(f"查询到 {len(bookings)} 条预约记录")
    for booking in bookings[:2]:
        print(f"  - {booking['room_name']}: {booking['meeting_topic']} ({booking['start_time'][:16]})")


def test_get_booking_detail():
    print("\n=== 测试5: 预约详情（关联记录） ===")
    response = requests.get(f"{BASE_URL}/api/bookings")
    bookings = response.json()
    if bookings:
        booking_id = bookings[0]["id"]
        response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}")
        detail = response.json()
        print(f"预约ID: {detail['booking']['id']}")
        print(f"门禁记录数: {len(detail['access_records'])}")
        print(f"取消消息数: {len(detail['cancel_messages'])}")
        print(f"供应商账单数: {len(detail['supplier_bills'])}")
        print(f"处理记录数: {len(detail['process_records'])}")


def test_reconciliation():
    print("\n=== 测试6: 对账结果 ===")
    response = requests.get(f"{BASE_URL}/api/reconciliation")
    results = response.json()
    print(f"对账记录数: {len(results)}")

    exceptions = [r for r in results if r["is_exception"]]
    print(f"异常记录数: {len(exceptions)}")
    for exc in exceptions:
        print(f"  ! {exc['room_name']} - {exc['meeting_topic']}: {exc['exception_description']}")
        print(f"    总费用: {exc['total_cost']}元")


def test_export():
    print("\n=== 测试7: 导出对账报表 ===")
    response = requests.get(f"{BASE_URL}/api/export/reconciliation?format=xlsx")
    if response.status_code == 200:
        filename = response.headers.get("content-disposition", "").split("filename=")[-1]
        print(f"✓ 导出成功: {filename}")
        print(f"  文件大小: {len(response.content)} bytes")
    else:
        print("✗ 导出失败")


def test_process_records():
    print("\n=== 测试8: 处理记录查询 ===")
    response = requests.get(f"{BASE_URL}/api/process-records?is_dirty=true")
    records = response.json()
    print(f"脏记录数: {len(records)}")
    for record in records[:3]:
        print(f"  - {record['error_type']}: {record['error_message'][:50]}...")


def test_import_history():
    print("\n=== 测试9: 导入历史 ===")
    response = requests.get(f"{BASE_URL}/api/import-history")
    history = response.json()
    print(f"导入批次: {len(history)}")
    for h in history[:3]:
        print(f"  - {h['batch_id']}: 总{h['record_count']}/成{h['success_count']}/重{h['duplicate_count']} ({h['imported_at'][:16]})")


def test_audit_logs():
    print("\n=== 测试10: 审计日志 ===")
    response = requests.get(f"{BASE_URL}/api/audit-logs")
    logs = response.json()
    print(f"审计日志数: {len(logs)}")
    for log in logs[:5]:
        print(f"  - {log['operation']} {log['table_name']}#{log['record_id']} by {log['operator']}")


if __name__ == "__main__":
    print("会议室占用验收回放链路 API 测试脚本")
    print("=" * 50)

    if not wait_for_service():
        exit(1)

    batch_id = test_import_data()
    test_import_duplicate()
    test_import_overwrite()
    test_get_bookings()
    test_get_booking_detail()
    test_reconciliation()
    test_export()
    test_process_records()
    test_import_history()
    test_audit_logs()

    print("\n" + "=" * 50)
    print("所有测试完成!")
    print(f"\nAPI文档: {BASE_URL}/docs")
