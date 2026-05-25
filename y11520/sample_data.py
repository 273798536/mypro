#!/usr/bin/env python3
"""样例数据生成脚本 - 更新版"""

import json
from datetime import datetime, timedelta

today = datetime.now()
yesterday = today - timedelta(days=1)


def get_sample_batch():
    return {
        "batch_no": f"BATCH-{today.strftime('%Y%m%d')}-001",
        "name": "华东区域5月24日安装回访批次（第一车）",
        "region": "华东区",
        "remark": "采购到货分两车 - 第一车"
    }


def get_sample_appointment_orders():
    return [
        {
            "order_no": "APPT-20240524-001",
            "customer_name": "张三",
            "customer_phone": "13800138001",
            "address": "上海市浦东新区xxx路xxx号",
            "product_name": "智能空调",
            "quantity": 2,
            "appointment_time": today.strftime("%Y-%m-%dT09:00:00"),
            "technician_id": "TECH001",
            "technician_name": "李师傅",
            "status": "completed",
            "is_rescheduled": False,
            "reschedule_count": 0,
            "is_second_visit": False,
            "amount": 300.0,
            "raw_data": {"source": "内部系统A"}
        },
        {
            "order_no": "APPT-20240524-002",
            "customer_name": "李四",
            "customer_phone": "13800138002",
            "address": "杭州市西湖区xxx路xxx号",
            "product_name": "智能冰箱",
            "quantity": 1,
            "appointment_time": today.strftime("%Y-%m-%dT14:00:00"),
            "technician_id": "TECH002",
            "technician_name": "王师傅",
            "status": "completed",
            "is_rescheduled": True,
            "reschedule_count": 1,
            "is_second_visit": True,
            "amount": 200.0,
            "raw_data": {"source": "内部系统A", "note": "改约和二次上门同时标记"}
        },
        {
            "order_no": "APPT-20240524-003",
            "customer_name": "",
            "customer_phone": "13800138003",
            "address": "南京市鼓楼区xxx路xxx号",
            "product_name": "洗衣机",
            "quantity": 3,
            "appointment_time": yesterday.strftime("%Y-%m-%dT10:00:00"),
            "technician_id": "TECH001",
            "technician_name": "李师傅",
            "status": "completed",
            "is_rescheduled": False,
            "reschedule_count": 0,
            "is_second_visit": False,
            "amount": 100.0,
            "raw_data": {"source": "内部系统B", "note": "跨日数据"}
        },
        {
            "order_no": "APPT-20240524-004",
            "customer_name": "赵六",
            "customer_phone": "",
            "address": "苏州市工业园区xxx路xxx号",
            "product_name": "油烟机",
            "quantity": 1,
            "appointment_time": today.strftime("%Y-%m-%dT16:00:00"),
            "technician_id": "TECH003",
            "technician_name": "张师傅",
            "status": "completed",
            "is_rescheduled": False,
            "reschedule_count": 0,
            "is_second_visit": False,
            "amount": 80.0,
            "raw_data": {"source": "内部系统A"}
        },
        {
            "order_no": "APPT-20240524-005",
            "customer_name": "钱七",
            "customer_phone": "13800138005",
            "address": "宁波市海曙区xxx路xxx号",
            "product_name": "热水器",
            "quantity": 2,
            "appointment_time": today.strftime("%Y-%m-%dT11:00:00"),
            "technician_id": "TECH004",
            "technician_name": "陈师傅",
            "status": "completed",
            "is_rescheduled": False,
            "reschedule_count": 0,
            "is_second_visit": False,
            "amount": 150.0,
            "raw_data": {"source": "内部系统A"}
        }
    ]


def get_sample_technician_locations():
    return [
        {
            "technician_id": "TECH001",
            "technician_name": "李师傅",
            "order_no": "APPT-20240524-001",
            "checkin_time": today.strftime("%Y-%m-%dT08:50:00"),
            "checkout_time": today.strftime("%Y-%m-%dT10:30:00"),
            "latitude": 31.2304,
            "longitude": 121.4737,
            "location_address": "上海市浦东新区",
            "stay_duration": 100,
            "raw_data": {"device": "GPS设备A"}
        },
        {
            "technician_id": "TECH001",
            "technician_name": "李大明",
            "order_no": "APPT-20240524-003",
            "checkin_time": yesterday.strftime("%Y-%m-%dT09:45:00"),
            "checkout_time": yesterday.strftime("%Y-%m-%dT11:00:00"),
            "latitude": 32.0603,
            "longitude": 118.7969,
            "location_address": "南京市鼓楼区",
            "stay_duration": 75,
            "raw_data": {"device": "GPS设备A", "note": "同一师傅不同姓名"}
        },
        {
            "technician_id": "TECH002",
            "technician_name": "王师傅",
            "order_no": "APPT-20240524-002",
            "checkin_time": today.strftime("%Y-%m-%dT13:55:00"),
            "checkout_time": today.strftime("%Y-%m-%dT15:20:00"),
            "latitude": 30.2741,
            "longitude": 120.1551,
            "location_address": "杭州市西湖区",
            "stay_duration": 85,
            "raw_data": {"device": "GPS设备B"}
        }
    ]


def get_sample_user_reviews():
    return [
        {
            "order_no": "APPT-20240524-001",
            "customer_name": "张三",
            "customer_phone": "13800138001",
            "rating": 5,
            "review_content": "安装师傅很专业，服务态度好！",
            "review_time": today.strftime("%Y-%m-%dT11:00:00"),
            "has_quality_issue": False,
            "bad_review_reason": "",
            "bad_review_found": True,
            "raw_data": {"channel": "微信小程序"}
        },
        {
            "order_no": "APPT-20240524-002",
            "customer_name": "李四",
            "customer_phone": "13800138002",
            "rating": 1,
            "review_content": "安装后有异响，师傅态度不好，改约了两次才来",
            "review_time": today.strftime("%Y-%m-%dT16:00:00"),
            "has_quality_issue": True,
            "bad_review_reason": "",
            "bad_review_found": False,
            "raw_data": {"channel": "天猫评价", "note": "差评原因未找到"}
        },
        {
            "order_no": "APPT-20240524-003",
            "customer_name": "王五",
            "customer_phone": "13800138003",
            "rating": 2,
            "review_content": "预约时间不准，等了很久",
            "review_time": yesterday.strftime("%Y-%m-%dT14:00:00"),
            "has_quality_issue": False,
            "bad_review_reason": "",
            "bad_review_found": False,
            "raw_data": {"channel": "京东评价"}
        }
    ]


def get_sample_external_receipts():
    return [
        {
            "receipt_no": "EXT-20240524-001",
            "order_no": "APPT-20240524-001",
            "receipt_type": "安装费",
            "quantity": 2,
            "amount": 300.0,
            "receipt_time": today.strftime("%Y-%m-%dT12:00:00"),
            "handler": "财务A",
            "status": "已结算",
            "raw_data": {"system": "财务系统X"}
        },
        {
            "receipt_no": "EXT-20240524-002",
            "order_no": "APPT-20240524-002",
            "receipt_type": "安装费",
            "quantity": 1,
            "amount": 200.0,
            "receipt_time": today.strftime("%Y-%m-%dT18:00:00"),
            "handler": "财务B",
            "status": "待确认",
            "raw_data": {"system": "财务系统Y"}
        },
        {
            "receipt_no": "EXT-20240524-003",
            "order_no": "APPT-20240524-002",
            "receipt_type": "二次上门费",
            "quantity": 3,
            "amount": 250.0,
            "receipt_time": today.strftime("%Y-%m-%dT18:00:00"),
            "handler": "财务B",
            "status": "待确认",
            "raw_data": {"system": "财务系统Y", "note": "同一订单数量不一致(1 vs 3)"}
        },
        {
            "receipt_no": "EXT-20240524-004",
            "order_no": "APPT-20240524-005",
            "receipt_type": "安装费",
            "quantity": 1,
            "amount": 150.0,
            "receipt_time": today.strftime("%Y-%m-%dT13:00:00"),
            "handler": "财务A",
            "status": "已结算",
            "raw_data": {"system": "财务系统X", "note": "预约单数量2 vs 回执数量1"}
        }
    ]


def print_sample_data():
    print("=" * 60)
    print("样例批次数据:")
    print("=" * 60)
    print(json.dumps(get_sample_batch(), indent=2, ensure_ascii=False))
    print()
    
    print("=" * 60)
    print("样例上传数据（包含预约单、定位、评价、回执）:")
    print("=" * 60)
    upload_data = {
        "appointment_orders": get_sample_appointment_orders(),
        "technician_locations": get_sample_technician_locations(),
        "user_reviews": get_sample_user_reviews(),
        "external_receipts": get_sample_external_receipts()
    }
    print(json.dumps(upload_data, indent=2, ensure_ascii=False))
    print()
    
    print("=" * 60)
    print("预期脏记录:")
    print("=" * 60)
    print("1. APPT-20240524-002: 改约和二次上门同时标记（未合并）")
    print("2. APPT-20240524-003: 客户姓名字段缺失")
    print("3. APPT-20240524-003: 预约时间跨日")
    print("4. APPT-20240524-004: 客户电话字段缺失")
    print("5. TECH001: 同一师傅出现'李师傅'和'李大明'两个姓名")
    print("6. APPT-20240524-002: 差评原因未找到")
    print("7. APPT-20240524-003: 差评原因未找到")
    print("8. APPT-20240524-002: 同一订单回执数量冲突（1 vs 3）")
    print("9. APPT-20240524-005: 预约单数量与回执数量不一致（2 vs 1）")
    print()


if __name__ == "__main__":
    print_sample_data()
