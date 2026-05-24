import json
from app.models.models import DataSourceType

SAMPLE_CHECK_IN_RECORDS = [
    {
        "check_in_no": "CI20240520001",
        "room_no": "1001",
        "guest_name": "张三",
        "check_in_date": "2024-05-20",
        "check_out_date": "2024-05-22",
        "amount": 580.0,
        "deposit_amount": 600.0,
        "invoice_amount": 580.0,
        "payment_method": "微信",
        "operator": "前台小王"
    },
    {
        "check_in_no": "CI20240520002",
        "room_no": "1205",
        "guest_name": "李四",
        "check_in_date": "2024-05-20",
        "check_out_date": "2024-05-23",
        "amount": 1280.0,
        "deposit_amount": 1500.0,
        "invoice_amount": 1280.0,
        "payment_method": "支付宝",
        "operator": "前台小李"
    },
    {
        "check_in_no": "CI20240520003",
        "room_no": "808",
        "guest_name": "王五",
        "check_in_date": "2024-05-19",
        "check_out_date": "2024-05-21",
        "amount": 398.0,
        "deposit_amount": 500.0,
        "invoice_amount": 398.0,
        "payment_method": "现金",
        "operator": "前台小王"
    }
]

SAMPLE_DEPOSIT_RECORDS = [
    {
        "check_in_no": "CI20240520001",
        "room_no": "1001",
        "guest_name": "张三",
        "deposit_amount": 200.0,
        "deposit_type": "补充押金",
        "payment_method": "微信",
        "transaction_time": "2024-05-20 23:30:00",
        "operator": "夜班前台小张"
    },
    {
        "check_in_no": "CI20240520002",
        "room_no": "1205",
        "guest_name": "李四",
        "deposit_amount": -500.0,
        "deposit_type": "押金退款",
        "payment_method": "原路退回",
        "transaction_time": "2024-05-21 02:15:00",
        "operator": "夜班前台小张"
    }
]

SAMPLE_ROOM_CHANGE_RECORDS = [
    {
        "check_in_no": "CI20240520001",
        "old_room_no": "1001",
        "new_room_no": "1502",
        "guest_name": "张三",
        "room_price_diff": 120.0,
        "change_time": "2024-05-21 01:45:00",
        "operator": "夜班前台小张",
        "change_reason": "空调故障"
    }
]

SAMPLE_INVENTORY_DIFF_RECORDS = [
    {
        "check_in_no": "CI20240520003",
        "room_no": "808",
        "guest_name": "王五",
        "diff_amount": 50.0,
        "diff_type": "商品消费",
        "diff_reason": "迷你吧消费：矿泉水x2, 泡面x1",
        "audit_time": "2024-05-21 03:00:00",
        "operator": "夜班审计员"
    },
    {
        "check_in_no": "CI20240520001",
        "room_no": "1502",
        "guest_name": "张三",
        "diff_amount": -30.0,
        "diff_type": "坏果扣款",
        "diff_reason": "水果盘有坏果，客人投诉减免",
        "audit_time": "2024-05-21 03:30:00",
        "operator": "夜班审计员"
    }
]

SAMPLE_REFUND_RECORDS = [
    {
        "check_in_no": "CI20240520002",
        "room_no": "1205",
        "guest_name": "李四",
        "refund_amount": 100.0,
        "refund_type": "服务投诉",
        "refund_reason": "半夜噪音影响休息，给予补偿",
        "refund_time": "2024-05-21 04:00:00",
        "operator": "大堂经理"
    }
]


def get_sample_data(source_type: DataSourceType):
    if source_type == DataSourceType.CHECK_IN:
        return SAMPLE_CHECK_IN_RECORDS
    elif source_type == DataSourceType.DEPOSIT:
        return SAMPLE_DEPOSIT_RECORDS
    elif source_type == DataSourceType.ROOM_CHANGE:
        return SAMPLE_ROOM_CHANGE_RECORDS
    elif source_type == DataSourceType.INVENTORY_DIFF:
        return SAMPLE_INVENTORY_DIFF_RECORDS
    elif source_type == DataSourceType.REFUND:
        return SAMPLE_REFUND_RECORDS
    return []


if __name__ == "__main__":
    print("样例数据已准备好，可以通过API导入")
    print("\n可用的数据类型:")
    for t in DataSourceType:
        print(f"  - {t.value}: {len(get_sample_data(t))} 条记录")
