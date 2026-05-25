import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8080"
HEADERS_ENTRY = {"X-User-Id": "3", "Content-Type": "application/json"}
HEADERS_REVIEWER = {"X-User-Id": "2", "Content-Type": "application/json"}
HEADERS_ADMIN = {"X-User-Id": "1", "Content-Type": "application/json"}

print("=" * 60)
print("核心流程测试")
print("=" * 60)

# 1. 创建批次
print("\n1. 创建批次 (录入员)")
today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
batch_no = f"TEST-{today.strftime('%Y%m%d')}-001"
resp = requests.post(
    f"{BASE_URL}/batches",
    headers=HEADERS_ENTRY,
    json={"batch_no": batch_no, "audit_date": today.isoformat()}
)
print(f"   状态码: {resp.status_code}")
assert resp.status_code == 200, f"创建批次失败: {resp.text}"
batch_id = resp.json()["id"]
print(f"   批次ID: {batch_id}, 状态: {resp.json()['status']}")

# 2. 添加记录
print("\n2. 批量添加记录")
yesterday = today - timedelta(days=1)
midnight = today.replace(hour=2, minute=30)
data = {
    "checkins": [
        {
            "record_no": f"CI{batch_id}001",
            "guest_name": "张三",
            "id_card": "110101199001011234",
            "room_no": "1001",
            "room_type": "标准间",
            "checkin_time": yesterday.replace(hour=14, minute=0).isoformat(),
            "checkout_time": today.replace(hour=12, minute=0).isoformat(),
            "room_rate": 388.0,
            "actual_room_fee": 388.0,
            "invoice_amount": 388.0,
            "source": "PMS"
        },
        {
            "record_no": f"CI{batch_id}002",
            "guest_name": "李四",
            "id_card": "",
            "room_no": "1002",
            "room_type": "大床房",
            "checkin_time": yesterday.replace(hour=20, minute=0).isoformat(),
            "checkout_time": today.replace(hour=11, minute=30).isoformat(),
            "room_rate": 488.0,
            "actual_room_fee": 488.0,
            "invoice_amount": 500.0,
            "source": "前台"
        }
    ],
    "deposits": [
        {
            "record_no": f"DP{batch_id}001",
            "checkin_record_no": f"CI{batch_id}001",
            "guest_name": "张三",
            "room_no": "1001",
            "deposit_amount": 500.0,
            "deposit_method": "微信",
            "deposit_time": yesterday.replace(hour=14, minute=5).isoformat(),
            "refund_amount": 112.0,
            "source": "PMS"
        }
    ],
    "room_changes": [
        {
            "record_no": f"RC{batch_id}001",
            "checkin_record_no": f"CI{batch_id}002",
            "guest_name": "李四",
            "old_room_no": "1005",
            "new_room_no": "1002",
            "change_time": midnight.isoformat(),
            "old_room_rate": 388.0,
            "new_room_rate": 488.0,
            "rate_difference": 100.0,
            "reason": "升级房型",
            "source": "PMS"
        }
    ]
}
resp = requests.post(f"{BASE_URL}/records/batch/{batch_id}/bulk", headers=HEADERS_ENTRY, json=data)
print(f"   状态码: {resp.status_code}")
assert resp.status_code == 200, f"添加记录失败: {resp.text}"
print(f"   结果: {resp.json()}")

# 3. 提交复核
print("\n3. 提交复核 (录入员)")
resp = requests.post(
    f"{BASE_URL}/batches/{batch_id}/submit",
    headers=HEADERS_ENTRY,
    json={"reason": "录入完成"}
)
print(f"   状态码: {resp.status_code}")
assert resp.status_code == 200, f"提交失败: {resp.text}"
print(f"   新状态: {resp.json()['status']}")

# 4. 查看脏记录
print("\n4. 查看脏记录 (复核员)")
resp = requests.get(f"{BASE_URL}/records/batch/{batch_id}/dirty-records", headers=HEADERS_REVIEWER)
print(f"   状态码: {resp.status_code}")
dirty = resp.json()
print(f"   发现 {len(dirty)} 条异常记录")
for d in dirty:
    print(f"   - {d['dirty_type']}: {d['description']}")

# 5. 开始复核
print("\n5. 开始复核 (复核员)")
resp = requests.post(
    f"{BASE_URL}/batches/{batch_id}/start-review",
    headers=HEADERS_REVIEWER,
    json={"reason": "开始复核"}
)
print(f"   状态码: {resp.status_code}")
print(f"   新状态: {resp.json()['status']}")

# 6. 添加批注
print("\n6. 添加主管批注 (复核员)")
resp = requests.post(
    f"{BASE_URL}/records/batch/{batch_id}/comments",
    headers=HEADERS_REVIEWER,
    json={"comment": "发现半夜换房和金额差异，已核实", "comment_type": "复核意见"}
)
print(f"   状态码: {resp.status_code}")

# 7. 审批通过
print("\n7. 审批通过 (复核员)")
resp = requests.post(
    f"{BASE_URL}/batches/{batch_id}/approve",
    headers=HEADERS_REVIEWER,
    json={"reason": "复核通过"}
)
print(f"   状态码: {resp.status_code}")
print(f"   新状态: {resp.json()['status']}")

# 8. 冻结结算
print("\n8. 冻结结算 (主管)")
resp = requests.post(
    f"{BASE_URL}/batches/{batch_id}/freeze",
    headers=HEADERS_ADMIN,
    json={"reason": "财务夜审，冻结结算"}
)
print(f"   状态码: {resp.status_code}")
print(f"   新状态: {resp.json()['status']}")

# 9. 查看财务汇总
print("\n9. 查看财务汇总 (主管)")
resp = requests.get(f"{BASE_URL}/audit/batch/{batch_id}/financial-summary", headers=HEADERS_ADMIN)
print(f"   状态码: {resp.status_code}")
summary = resp.json()
print(f"   总房费: {summary['total_room_fee']}, 总押金: {summary['total_deposit']}, 总发票: {summary['total_invoice']}")
print(f"   差异金额: {summary['discrepancy_amount']}")
print(f"   异常记录统计: {summary['dirty_record_summary']}")

# 10. 查看状态流转
print("\n10. 查看状态流转 (主管)")
resp = requests.get(f"{BASE_URL}/batches/{batch_id}/transitions", headers=HEADERS_ADMIN)
transitions = resp.json()
print(f"   共 {len(transitions)} 次状态变更")
for t in transitions:
    print(f"   - {t['from_status']} → {t['to_status']} ({len(t['changes'])} 处变化)")

# 11. 查看异常解释
print("\n11. 查看异常解释 (主管)")
resp = requests.get(f"{BASE_URL}/audit/batch/{batch_id}/anomalies", headers=HEADERS_ADMIN)
anomalies = resp.json()
print(f"   未解决问题: {anomalies['unresolved_issues_count']}")
for exp in anomalies.get('explanations', []):
    print(f"   - {exp['title']}: {exp['description']}")

# 12. 导出Excel
print("\n12. 导出Excel (主管)")
resp = requests.get(f"{BASE_URL}/audit/batch/{batch_id}/export", headers=HEADERS_ADMIN)
print(f"   状态码: {resp.status_code}, 文件大小: {len(resp.content)} bytes")

# 13. 测试权限控制
print("\n13. 测试权限控制")
resp = requests.post(f"{BASE_URL}/batches/{batch_id}/approve", headers=HEADERS_ENTRY, json={"reason": "越权测试"})
print(f"   录入员尝试审批: {resp.status_code} (预期403)")
assert resp.status_code == 403, "权限控制失效"

# 14. 测试幂等性 - 重复提交
print("\n14. 测试幂等性 - 重复提交相同记录号")
data2 = {
    "checkins": [
        {
            "record_no": f"CI{batch_id}001",
            "guest_name": "张三重复",
            "room_no": "1001",
            "checkin_time": yesterday.replace(hour=14, minute=0).isoformat(),
            "room_rate": 388.0,
            "source": "重复提交测试"
        }
    ],
    "deposits": [],
    "room_changes": []
}
resp = requests.post(f"{BASE_URL}/records/batch/{batch_id}/bulk", headers=HEADERS_ENTRY, json=data2)
print(f"   状态码: {resp.status_code}")
result = resp.json()
print(f"   结果: {result} (checkins_added应为0)")
assert result['checkins_added'] == 0, "幂等性失效，重复添加了记录"

print("\n" + "=" * 60)
print("✅ 所有核心流程测试通过！")
print("=" * 60)
