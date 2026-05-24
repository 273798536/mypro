import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

USER_IDS = {
    "admin": 1,
    "reviewer": 2,
    "data_entry": 3,
    "viewer": 4
}


def headers(user_id):
    return {"X-User-Id": str(user_id), "Content-Type": "application/json"}


def create_batch(batch_no, audit_date):
    data = {
        "batch_no": batch_no,
        "audit_date": audit_date.isoformat()
    }
    response = requests.post(
        f"{BASE_URL}/batches",
        headers=headers(USER_IDS["data_entry"]),
        json=data
    )
    print(f"创建批次: {response.status_code}")
    return response.json()


def add_sample_records(batch_id):
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    midnight = today.replace(hour=2, minute=30)
    
    checkins = [
        {
            "record_no": f"CI{batch_id}001",
            "guest_name": "张三",
            "id_card": "110101199001011234",
            "room_no": "1001",
            "room_type": "标准间",
            "checkin_time": yesterday.replace(hour=14, minute=0).isoformat(),
            "checkout_time": today.replace(hour=12, minute=0).isoformat(),
            "planned_checkout": today.replace(hour=12, minute=0).isoformat(),
            "room_rate": 388.0,
            "actual_room_fee": 388.0,
            "invoice_amount": 388.0,
            "is_extended": False,
            "source": "PMS系统"
        },
        {
            "record_no": f"CI{batch_id}002",
            "guest_name": "李四",
            "id_card": "310101198505055678",
            "room_no": "1002",
            "room_type": "大床房",
            "checkin_time": yesterday.replace(hour=16, minute=30).isoformat(),
            "checkout_time": (today + timedelta(days=1)).replace(hour=14, minute=0).isoformat(),
            "planned_checkout": today.replace(hour=12, minute=0).isoformat(),
            "room_rate": 488.0,
            "actual_room_fee": 976.0,
            "invoice_amount": 976.0,
            "is_extended": True,
            "original_checkout": today.replace(hour=12, minute=0).isoformat(),
            "source": "PMS系统"
        },
        {
            "record_no": f"CI{batch_id}003",
            "guest_name": "王五",
            "id_card": "",
            "room_no": "1003",
            "room_type": "豪华间",
            "checkin_time": yesterday.replace(hour=20, minute=0).isoformat(),
            "checkout_time": today.replace(hour=11, minute=30).isoformat(),
            "room_rate": 688.0,
            "actual_room_fee": 688.0,
            "invoice_amount": 700.0,
            "is_extended": False,
            "source": "前台录入"
        }
    ]
    
    deposits = [
        {
            "record_no": f"DP{batch_id}001",
            "checkin_record_no": f"CI{batch_id}001",
            "guest_name": "张三",
            "room_no": "1001",
            "deposit_amount": 500.0,
            "deposit_method": "微信",
            "deposit_time": yesterday.replace(hour=14, minute=5).isoformat(),
            "refund_amount": 112.0,
            "refund_time": today.replace(hour=12, minute=10).isoformat(),
            "balance": 0.0,
            "source": "PMS系统"
        },
        {
            "record_no": f"DP{batch_id}002",
            "checkin_record_no": f"CI{batch_id}002",
            "guest_name": "李四",
            "room_no": "1002",
            "deposit_amount": 100.0,
            "deposit_method": "现金",
            "deposit_time": yesterday.replace(hour=16, minute=35).isoformat(),
            "balance": 100.0,
            "source": "PMS系统"
        },
        {
            "record_no": f"DP{batch_id}003",
            "checkin_record_no": f"CI{batch_id}003",
            "guest_name": "王五五",
            "room_no": "1003",
            "deposit_amount": 800.0,
            "deposit_method": "支付宝",
            "deposit_time": yesterday.replace(hour=20, minute=10).isoformat(),
            "balance": 800.0,
            "source": "前台录入"
        }
    ]
    
    room_changes = [
        {
            "record_no": f"RC{batch_id}001",
            "checkin_record_no": f"CI{batch_id}002",
            "guest_name": "李四",
            "old_room_no": "1005",
            "new_room_no": "1002",
            "old_room_type": "标准间",
            "new_room_type": "大床房",
            "change_time": midnight.isoformat(),
            "old_room_rate": 388.0,
            "new_room_rate": 488.0,
            "rate_difference": 50.0,
            "reason": "客人要求升级房型",
            "operator": "李前台",
            "source": "PMS系统"
        }
    ]
    
    data = {
        "checkins": checkins,
        "deposits": deposits,
        "room_changes": room_changes
    }
    
    response = requests.post(
        f"{BASE_URL}/records/batch/{batch_id}/bulk",
        headers=headers(USER_IDS["data_entry"]),
        json=data
    )
    print(f"批量添加记录: {response.status_code}")
    print(f"  结果: {response.json()}")
    return response.json()


def submit_batch(batch_id):
    response = requests.post(
        f"{BASE_URL}/batches/{batch_id}/submit",
        headers=headers(USER_IDS["data_entry"]),
        json={"reason": "数据录入完成，提交复核"}
    )
    print(f"提交批次: {response.status_code}")
    return response.json()


def start_review(batch_id):
    response = requests.post(
        f"{BASE_URL}/batches/{batch_id}/start-review",
        headers=headers(USER_IDS["reviewer"]),
        json={"reason": "开始复核"}
    )
    print(f"开始复核: {response.status_code}")
    return response.json()


def add_comment(batch_id, comment_text):
    data = {
        "comment": comment_text,
        "comment_type": "复核意见"
    }
    response = requests.post(
        f"{BASE_URL}/records/batch/{batch_id}/comments",
        headers=headers(USER_IDS["reviewer"]),
        json=data
    )
    print(f"添加批注: {response.status_code}")
    return response.json()


def approve_batch(batch_id):
    response = requests.post(
        f"{BASE_URL}/batches/{batch_id}/approve",
        headers=headers(USER_IDS["reviewer"]),
        json={"reason": "复核通过"}
    )
    print(f"审批通过: {response.status_code}")
    return response.json()


def freeze_batch(batch_id):
    response = requests.post(
        f"{BASE_URL}/batches/{batch_id}/freeze",
        headers=headers(USER_IDS["admin"]),
        json={"reason": "财务夜审，冻结结算"}
    )
    print(f"冻结批次: {response.status_code}")
    return response.json()


def get_financial_summary(batch_id):
    response = requests.get(
        f"{BASE_URL}/audit/batch/{batch_id}/financial-summary",
        headers=headers(USER_IDS["admin"])
    )
    print(f"财务汇总: {response.status_code}")
    return response.json()


def get_anomalies(batch_id):
    response = requests.get(
        f"{BASE_URL}/audit/batch/{batch_id}/anomalies",
        headers=headers(USER_IDS["admin"])
    )
    print(f"异常解释: {response.status_code}")
    return response.json()


def get_dirty_records(batch_id):
    response = requests.get(
        f"{BASE_URL}/records/batch/{batch_id}/dirty-records",
        headers=headers(USER_IDS["reviewer"])
    )
    print(f"脏记录: {response.status_code}")
    return response.json()


def get_transitions(batch_id):
    response = requests.get(
        f"{BASE_URL}/batches/{batch_id}/transitions",
        headers=headers(USER_IDS["admin"])
    )
    print(f"状态流转: {response.status_code}")
    return response.json()


def main():
    print("=" * 60)
    print("酒店前台夜审异常回执状态机 - 样例数据导入")
    print("=" * 60)
    
    today_str = datetime.now().strftime("%Y%m%d")
    batch_no = f"AUDIT-{today_str}-001"
    audit_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    print(f"\n1. 创建审计批次: {batch_no}")
    batch = create_batch(batch_no, audit_date)
    batch_id = batch["id"]
    print(f"   批次ID: {batch_id}")
    
    print(f"\n2. 添加样例记录（入住单、押金流水、换房记录）")
    add_sample_records(batch_id)
    
    print(f"\n3. 提交批次复核")
    submit_batch(batch_id)
    
    print(f"\n4. 检测异常记录")
    dirty = get_dirty_records(batch_id)
    print(f"   发现 {len(dirty)} 条异常记录")
    for d in dirty[:3]:
        print(f"   - {d['dirty_type']}: {d['description']}")
    
    print(f"\n5. 开始复核")
    start_review(batch_id)
    
    print(f"\n6. 添加复核批注")
    add_comment(batch_id, "发现半夜换房记录和延住记录，需重点关注房费计算是否正确")
    
    print(f"\n7. 审批通过")
    approve_batch(batch_id)
    
    print(f"\n8. 财务冻结结算")
    freeze_batch(batch_id)
    
    print(f"\n9. 查看财务汇总")
    summary = get_financial_summary(batch_id)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    
    print(f"\n10. 查看异常解释")
    anomalies = get_anomalies(batch_id)
    print(json.dumps(anomalies, ensure_ascii=False, indent=2))
    
    print(f"\n11. 查看状态流转记录")
    transitions = get_transitions(batch_id)
    print(f"   共 {len(transitions)} 次状态变更")
    for t in transitions:
        print(f"   - {t['from_status']} → {t['to_status']}: {len(t['changes'])} 处变化")
    
    print("\n" + "=" * 60)
    print(f"样例数据导入完成！批次ID: {batch_id}")
    print(f"可访问 http://localhost:8000/docs 查看API文档")
    print("=" * 60)


if __name__ == "__main__":
    main()
