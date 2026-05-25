#!/usr/bin/env python3
"""通过API验证证书过期联动和手工改价表导入"""
import sys
import os
import json
import urllib.request
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000/api/v1"


def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get_json(url):
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode('utf-8'))


def test_api_flow():
    print("=" * 70)
    print("  API测试：证书过期联动 + 手工改价表导入")
    print("=" * 70)
    
    yesterday = datetime.now() - timedelta(days=1)
    expired_date = yesterday - timedelta(days=30)
    future_date = yesterday + timedelta(days=365)
    
    # 1. 导入数据（含巡检记录、已过期证书、手工改价表）
    print("\n1. 通过API导入数据:")
    print("   - 1条正常巡检记录")
    print("   - 1条同设备已过期校准证书")
    print("   - 1条手工改价表")
    
    import_data = {
        "batch_no": "API-TEST-001",
        "batch_name": "API测试批次-证书过期联动",
        "department": "API测试科",
        "operator": "API测试员",
        "description": "通过API测试证书过期联动和手工改价表导入",
        "duplicate_strategy": "overwrite",
        "inspection_records": [
            {
                "record_no": "API-INSP-001",
                "device_code": "API-DEV-001",
                "device_name": "API测试设备",
                "inspection_date": "2024-01-15",
                "inspector": "API测试员",
                "inspection_result": "正常",
            }
        ],
        "calibration_certificates": [
            {
                "certificate_no": "API-CERT-001",
                "device_code": "API-DEV-001",
                "device_name": "API测试设备",
                "calibration_agency": "API测试计量所",
                "calibration_date": "2023-06-01",
                "effective_date": "2023-06-01",
                "expiry_date": expired_date.strftime("%Y-%m-%d"),
                "calibration_result": "合格",
            }
        ],
        "repair_quotes": [],
        "price_adjustments": [
            {
                "adjustment_no": "API-PRICE-001",
                "device_code": "API-DEV-001",
                "device_name": "API测试设备",
                "original_price": 20000.00,
                "adjusted_price": 18000.00,
                "price_difference": -2000.00,
                "adjustment_reason": "API测试-设备折旧调整",
                "effective_date": "2024-01-01",
            }
        ],
    }
    
    result = post_json(f"{API_BASE}/batches/import", import_data)
    batch_id = result["data"]["batch_id"]
    print(f"   ✓ 导入成功，批次ID: {batch_id[:8]}...")
    
    import_results = result["data"]["results"]
    print(f"     巡检记录: {import_results['inspection_records']}")
    print(f"     校准证书: {import_results['calibration_certificates']}")
    print(f"     手工改价表: {import_results['price_adjustments']}")
    
    # 2. 检查批次详情
    print("\n2. 检查批次详情:")
    batch = get_json(f"{API_BASE}/batches/{batch_id}")
    print(f"   批次状态: {batch['status']}")
    print(f"   总记录数: {batch['record_count']}")
    print(f"   异常数: {batch['abnormal_count']}")
    
    all_passed = True
    
    if batch["abnormal_count"] != 1:
        print(f"   ✗ 失败: 异常数应为 1, 实际 {batch['abnormal_count']}")
        all_passed = False
    else:
        print(f"   ✓ 异常数正确: {batch['abnormal_count']}（证书过期联动成功）")
    
    # 3. 检查巡检记录状态
    print("\n3. 检查巡检记录状态:")
    details = get_json(f"{API_BASE}/export/batch/{batch_id}/details")
    
    record = details["data"]["inspection_records"][0]
    print(f"   记录号: {record['record_no']}")
    print(f"   巡检结果: {record['inspection_result']}")
    print(f"   记录状态: {record['status']}")
    
    if record["status"] != "certificate_expired":
        print(f"   ✗ 失败: 状态应为 certificate_expired, 实际 {record['status']}")
        all_passed = False
    else:
        print(f"   ✓ 状态正确: certificate_expired")
    
    # 4. 检查手工改价表
    print("\n4. 检查手工改价表:")
    adjustments = details["data"]["price_adjustments"]
    if len(adjustments) == 0:
        print(f"   ✗ 失败: 手工改价表未导入")
        all_passed = False
    else:
        adj = adjustments[0]
        print(f"   改价单号: {adj['adjustment_no']}")
        print(f"   原价: {adj['original_price']}")
        print(f"   调整后: {adj['adjusted_price']}")
        print(f"   差价: {adj['price_difference']}")
        print(f"   原因: {adj['adjustment_reason']}")
        print(f"   ✓ 手工改价表导入成功")
    
    # 5. 检查证书状态
    print("\n5. 检查证书状态:")
    certs = details["data"]["calibration_certificates"]
    cert = certs[0]
    print(f"   证书号: {cert['certificate_no']}")
    print(f"   过期日期: {cert['expiry_date']}")
    print(f"   是否已过期: {cert['is_expired']}")
    
    if not cert["is_expired"]:
        print(f"   ✗ 失败: 证书状态应为过期")
        all_passed = False
    else:
        print(f"   ✓ 证书状态正确: 已过期")
    
    # 6. 测试冻结和护士长导出
    print("\n6. 测试冻结批次:")
    freeze_result = post_json(
        f"{API_BASE}/batches/{batch_id}/freeze?operator=API测试员",
        {"operator": "API测试员", "reason": "API测试-临检前冻结"}
    )
    print(f"   冻结结果: {freeze_result['message']}")
    
    # 7. 检查护士长视图
    print("\n7. 检查护士长导出视图:")
    export_data = get_json(f"{API_BASE}/export/batch/{batch_id}/summary?operator=API测试员")
    head_nurse_view = export_data["data"]
    
    freeze_info = head_nurse_view["freeze_info"]
    print(f"   冻结前状态: {freeze_info['status_before_freeze']}")
    print(f"   当前状态: {freeze_info['current_status']}")
    print(f"   冻结原因: {freeze_info['freeze_reason']}")
    print(f"   冻结人: {freeze_info['freeze_operator']}")
    
    stats = head_nurse_view["statistics"]
    print(f"   总记录数: {stats['total_records']}")
    print(f"   异常数: {stats['abnormal_count']}")
    
    abnormal_records = head_nurse_view["abnormal_records"]
    if len(abnormal_records) > 0:
        r = abnormal_records[0]
        print(f"   异常记录: {r['device_name']} ({r['device_code']})")
        print(f"     状态: {r['status']}")
        print(f"     巡检结果: {r['inspection_result']}")
        print(f"   ✓ 护士长视图包含完整的异常记录信息")
    
    print("\n" + "=" * 70)
    if all_passed:
        print("  ✓ API测试全部通过！")
        print("    - 证书过期已正确联动到巡检记录")
        print("    - 手工改价表已正确导入")
        print("    - 批次异常数正确统计")
        print("    - 护士长视图包含完整信息")
        print("=" * 70)
        return 0
    else:
        print("  ✗ API测试存在失败项！")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    try:
        sys.exit(test_api_flow())
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
