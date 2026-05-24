#!/usr/bin/env python3
import json
import requests
import sys

BASE_URL = "http://localhost:5001/api"
BATCH_ID = "BATCH_2024_Q1_TRAINING_001"

employees = [
    {"id": "EMP001", "name": "张三", "dept": "技术部"},
    {"id": "EMP002", "name": "李四", "dept": "市场部"},
    {"id": "EMP003", "name": "王五", "dept": "人事部"},
    {"id": "EMP004", "name": "赵六", "dept": "财务部"},
    {"id": "EMP005", "name": "钱七", "dept": "技术部"},
    {"id": "EMP006", "name": "孙八", "dept": "市场部"},
    {"id": "EMP007", "name": "周九", "dept": "运营部"},
    {"id": "EMP008", "name": "吴十", "dept": "技术部"},
]

def main():
    print("=" * 50)
    print("  企业培训签到验收回放链路 - 测试脚本")
    print("=" * 50)

    print("\n步骤 1: 健康检查")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/health")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))

    print("\n步骤 2: 导入报名表数据")
    print("-" * 50)
    for emp in employees:
        data = {
            "batch_id": BATCH_ID,
            "employee_id": emp["id"],
            "employee_name": emp["name"],
            "department": emp["dept"],
            "training_course": "2024年Q1企业合规培训",
            "training_date": "2024-03-15",
            "registration_time": "2024-03-10 10:00:00",
            "amount": 100.0,
            "status": "registered"
        }
        resp = requests.post(f"{BASE_URL}/registration", json=data)
        result = resp.json()
        print(f"  {emp['id']} - {result.get('message', result.get('error'))}")

    print("\n步骤 3: 导入签到记录")
    print("-" * 50)
    sign_data = [
        ("SIGN_0001", "EMP001", "张三", "2024-03-15 09:05:00", False, False),
        ("SIGN_0002", "EMP002", "李四", "2024-03-15 09:10:00", False, False),
        ("SIGN_0003", "EMP003", "王五", "2024-03-15 09:15:00", False, False),
        ("SIGN_0004", "EMP004", "赵六", "2024-03-15 09:20:00", False, False),
        ("SIGN_0005", "EMP005", "钱七", "2024-03-15 09:25:00", False, False),
        ("SIGN_0006", "EMP006", "孙八", "2024-03-15 09:30:00", False, False),
        ("SIGN_0007", "EMP004", "赵六", "2024-03-15 09:25:00", True, False),
        ("SIGN_0008", "EMP007", "周九", "2024-03-16 14:30:00", False, True),
    ]
    for sign_id, emp_id, emp_name, sign_time, is_proxy, is_makeup in sign_data:
        data = {
            "batch_id": BATCH_ID,
            "sign_id": sign_id,
            "employee_id": emp_id,
            "employee_name": emp_name,
            "training_course": "2024年Q1企业合规培训",
            "sign_time": sign_time,
            "qr_code": f"QR_{sign_id}",
            "location": "3楼会议室A",
            "is_proxy": is_proxy,
            "is_makeup": is_makeup
        }
        resp = requests.post(f"{BASE_URL}/sign", json=data)
        result = resp.json()
        proxy_marker = " [代签]" if is_proxy else ""
        makeup_marker = " [补签]" if is_makeup else ""
        print(f"  {sign_id} - {emp_name} - {sign_time}{proxy_marker}{makeup_marker}")

    print("\n步骤 4: 导入课后作业")
    print("-" * 50)
    hw_data = [
        ("HW_0001", "EMP001", "张三", "2024-03-16 10:00:00", 92.5),
        ("HW_0002", "EMP002", "李四", "2024-03-16 11:00:00", 88.0),
        ("HW_0003", "EMP003", "王五", "2024-03-16 12:00:00", 95.0),
        ("HW_0004", "EMP004", "赵六", "2024-03-16 13:00:00", 78.5),
        ("HW_0005", "EMP005", "钱七", "2024-03-16 14:00:00", 85.0),
    ]
    for hw_id, emp_id, emp_name, submit_time, score in hw_data:
        data = {
            "batch_id": BATCH_ID,
            "homework_id": hw_id,
            "employee_id": emp_id,
            "employee_name": emp_name,
            "training_course": "2024年Q1企业合规培训",
            "submit_time": submit_time,
            "score": score,
            "status": "submitted"
        }
        resp = requests.post(f"{BASE_URL}/homework", json=data)
        result = resp.json()
        print(f"  {hw_id} - {emp_name} - {score}分")

    print("\n步骤 5: 导入退款流水")
    print("-" * 50)
    data = {
        "batch_id": BATCH_ID,
        "refund_id": "REFUND_001",
        "employee_id": "EMP007",
        "employee_name": "周九",
        "training_course": "2024年Q1企业合规培训",
        "refund_amount": 100.0,
        "refund_time": "2024-03-17 10:00:00",
        "refund_reason": "员工离职"
    }
    resp = requests.post(f"{BASE_URL}/refund", json=data)
    result = resp.json()
    print(f"  REFUND_001 - 周九 - 100.0元")

    print("\n步骤 6: 测试幂等性 - 重复提交相同数据")
    print("-" * 50)
    data = {
        "batch_id": BATCH_ID,
        "employee_id": "EMP001",
        "employee_name": "张三",
        "department": "技术部",
        "training_course": "2024年Q1企业合规培训",
        "training_date": "2024-03-15",
        "registration_time": "2024-03-10 10:00:00",
        "amount": 100.0,
        "status": "registered"
    }
    resp = requests.post(f"{BASE_URL}/registration", json=data)
    result = resp.json()
    print(f"  重复提交: {result.get('message', result.get('error'))}")

    print("\n步骤 7: 执行对账")
    print("-" * 50)
    resp = requests.post(f"{BASE_URL}/reconcile/{BATCH_ID}")
    result = resp.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n步骤 8: 查看异常分析")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/anomalies/{BATCH_ID}")
    result = resp.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n步骤 9: 查看对账结果汇总")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/reconcile/{BATCH_ID}")
    d = resp.json()
    print("=== 对账汇总 ===")
    print(f"报名人数: {d['total_registrations']}")
    print(f"签到人数: {d['signed_count']}")
    print(f"未签到人数: {d['unsigned_count']}")
    print(f"代签次数: {d['proxy_sign_count']}")
    print(f"补签次数: {d['makeup_sign_count']}")
    print(f"作业提交: {d['homework_completed']}")
    print(f"退款人数: {d['refund_count']}")
    print(f"退款金额: {d['refund_amount']}")
    print(f"脏记录数: {d['dirty_count']}")

    print("\n步骤 10: 导出Excel报告")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/export/{BATCH_ID}")
    result = resp.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n步骤 11: 查看脏记录列表")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/dirty/{BATCH_ID}")
    result = resp.json()
    print(f"脏记录总数: {result['count']}")
    for record in result['records'][:3]:
        print(f"  {record['dirty_type']}: {record['error_message'][:50]}...")

    print("\n步骤 12: 查看历史记录")
    print("-" * 50)
    resp = requests.get(f"{BASE_URL}/history")
    result = resp.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n" + "=" * 50)
    print("  测试完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
