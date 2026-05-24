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
    if "auto_relinked" in result:
        print(f"自动关联: {json.dumps(result['auto_relinked'], ensure_ascii=False)}")
    print(f"详情: {json.dumps(result['details'], ensure_ascii=False, indent=2)}")
    return result["batch_id"]


def test_access_booking_id_after_import():
    print("\n=== 测试1.5: 验证导入后门禁booking_id不为空 ===")
    response = requests.get(f"{BASE_URL}/api/bookings")
    bookings = response.json()

    all_access_linked = True
    for booking in bookings:
        detail = requests.get(f"{BASE_URL}/api/bookings/{booking['id']}").json()
        access_count = len(detail['access_records'])
        if access_count > 0:
            for access in detail['access_records']:
                if access['booking_id'] is None:
                    all_access_linked = False
                    print(f"  ! 门禁 {access['source_id']} booking_id 为空")
        print(f"  {booking['room_name']} - {booking['meeting_topic']}: 关联门禁 {access_count} 条")

    status = "✓" if all_access_linked else "!"
    print(f"  {status} 所有门禁记录均有 booking_id")


def test_detail_reconciliation_consistency():
    print("\n=== 测试1.8: 验证详情与对账状态一致 ===")
    response = requests.get(f"{BASE_URL}/api/bookings")
    bookings = response.json()

    all_consistent = True
    for booking in bookings:
        detail = requests.get(f"{BASE_URL}/api/bookings/{booking['id']}").json()
        detail_status = detail['booking']['status']

        recon = requests.get(f"{BASE_URL}/api/reconciliation").json()
        recon_item = next((r for r in recon if r['booking_id'] == booking['id']), None)

        if recon_item:
            recon_status = recon_item['booking_status']
            match = detail_status == recon_status
            if not match:
                all_consistent = False
            status_icon = "✓" if match else "!"
            print(f"  {status_icon} {booking['meeting_topic']}: 详情={detail_status}, 对账={recon_status}")

    final_icon = "✓" if all_consistent else "!"
    print(f"  {final_icon} 详情与对账状态完全一致: {'是' if all_consistent else '否'}")


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


def test_overwrite_status_consistency():
    print("\n=== 测试3.5: 验证overwrite后状态一致性 ===")
    response = requests.get(f"{BASE_URL}/api/bookings")
    bookings = response.json()

    cancelled_booking = next((b for b in bookings if "预算" in b['meeting_topic']), None)
    if cancelled_booking:
        print(f"  目标预约: {cancelled_booking['meeting_topic']}")
        print(f"  列表状态: {cancelled_booking['status']}")

        detail = requests.get(f"{BASE_URL}/api/bookings/{cancelled_booking['id']}").json()
        print(f"  详情状态: {detail['booking']['status']}")

        recon = requests.get(f"{BASE_URL}/api/reconciliation").json()
        recon_item = next((r for r in recon if r['booking_id'] == cancelled_booking['id']), None)
        if recon_item:
            print(f"  对账状态: {recon_item['booking_status']}")

            is_consistent = (
                cancelled_booking['status'] == detail['booking']['status'] == recon_item['booking_status'] == 'cancelled'
            )
            icon = "✓" if is_consistent else "!"
            print(f"  {icon} 列表/详情/对账状态均为 cancelled: {'是' if is_consistent else '否'}")
    else:
        print("  未找到预算会议预约")


def test_detail_recon_bill_consistency():
    print("\n=== 测试3.8: 验证详情与对账账单数一致 ===")
    response = requests.get(f"{BASE_URL}/api/bookings")
    bookings = response.json()

    all_consistent = True
    for booking in bookings:
        detail = requests.get(f"{BASE_URL}/api/bookings/{booking['id']}").json()
        detail_bill_count = len(detail['supplier_bills'])

        recon = requests.get(f"{BASE_URL}/api/reconciliation").json()
        recon_item = next((r for r in recon if r['booking_id'] == booking['id']), None)

        if recon_item:
            recon_bill_count = recon_item.get('linked_bill_count', 0)
            recon_has_bill = recon_item['has_supplier_bill']

            consistent = (detail_bill_count > 0) == recon_has_bill
            if not consistent:
                all_consistent = False

            icon = "✓" if consistent else "!"
            print(f"  {icon} {booking['meeting_topic'][:15]}: 详情账单={detail_bill_count}, 对账账单={recon_bill_count}, 对账has_bill={recon_has_bill}")

    final_icon = "✓" if all_consistent else "!"
    print(f"  {final_icon} 详情与对账账单标记完全一致: {'是' if all_consistent else '否'}")


def test_quantity_conflict_detection():
    print("\n=== 测试3.9: 验证数量冲突检测 ===")
    with open("sample_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    if data.get('supplier_bills'):
        data['supplier_bills'][0]['quantity'] = 999
        data['duplicate_handling'] = "skip"

        response = requests.post(f"{BASE_URL}/api/import", json=data)
        result = response.json()

        dirty_count = result.get('dirty_count', 0)
        bill_dirty = result.get('details', {}).get('bills', {}).get('dirty', 0)

        print(f"  脏记录总数: {dirty_count}")
        print(f"  账单类脏记录: {bill_dirty}")

        if bill_dirty > 0:
            print("  ✓ 检测到数量冲突并生成脏记录")
        else:
            print("  ! 未检测到数量冲突")


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


def test_relink_all():
    print("\n=== 测试5.5: 重新关联所有记录 ===")
    response = requests.post(f"{BASE_URL}/api/relink-all")
    result = response.json()
    print(f"重新关联结果: {result['message']}")
    print(f"  处理预约数: {result['stats']['total_bookings']}")
    print(f"  关联门禁: {result['stats']['relinked_access']} 条")
    print(f"  关联取消: {result['stats']['relinked_cancel']} 条")
    print(f"  关联账单: {result['stats']['relinked_bill']} 条")


def test_reconciliation():
    print("\n=== 测试6: 对账结果 ===")
    response = requests.get(f"{BASE_URL}/api/reconciliation")
    results = response.json()
    print(f"对账记录数: {len(results)}")

    for r in results:
        status = "✓" if not r["is_exception"] else "!"
        link_info = f" [关联门禁:{r.get('linked_access_count',0)}, 账单:{r.get('linked_bill_count',0)}]"
        print(f"  {status} {r['room_name']} - {r['meeting_topic']}{link_info}")
        if r["is_exception"]:
            print(f"    异常: {r['exception_description']}")
            print(f"    总费用: {r['total_cost']}元")

    exceptions = [r for r in results if r["is_exception"]]
    print(f"\n异常记录数: {len(exceptions)} (预期: 1)")


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
    test_access_booking_id_after_import()
    test_detail_reconciliation_consistency()
    test_import_duplicate()
    test_import_overwrite()
    test_overwrite_status_consistency()
    test_detail_recon_bill_consistency()
    test_quantity_conflict_detection()
    test_get_bookings()
    test_get_booking_detail()
    test_relink_all()
    test_reconciliation()
    test_export()
    test_process_records()
    test_import_history()
    test_audit_logs()

    print("\n" + "=" * 50)
    print("所有测试完成!")
    print(f"\nAPI文档: {BASE_URL}/docs")
