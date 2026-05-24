#!/usr/bin/env python3
"""主流程测试脚本"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


class APIClient:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.token = None

    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}{API_PREFIX}/auth/token",
            data={"username": username, "password": password}
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            print(f"✅ 登录成功: {username}")
        else:
            print(f"❌ 登录失败: {response.text}")
        return response

    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def get(self, path, **kwargs):
        return requests.get(f"{self.base_url}{API_PREFIX}{path}", headers=self.headers(), **kwargs)

    def post(self, path, **kwargs):
        return requests.post(f"{self.base_url}{API_PREFIX}{path}", headers=self.headers(), **kwargs)

    def put(self, path, **kwargs):
        return requests.put(f"{self.base_url}{API_PREFIX}{path}", headers=self.headers(), **kwargs)

    def patch(self, path, **kwargs):
        return requests.patch(f"{self.base_url}{API_PREFIX}{path}", headers=self.headers(), **kwargs)


def test_main_flow():
    print("\n" + "=" * 70)
    print("家电安装回访异常回执状态机 - 主流程测试")
    print("=" * 70)
    
    today = datetime.now()
    
    client = APIClient()
    
    print("\n" + "-" * 50)
    print("步骤 1: 录入用户登录")
    print("-" * 50)
    client.login("entry", "entry123")
    
    print("\n" + "-" * 50)
    print("步骤 2: 创建批次")
    print("-" * 50)
    batch_data = {
        "batch_no": f"TEST-{today.strftime('%Y%m%d%H%M%S')}",
        "name": "测试批次 - 第一车",
        "region": "华东区",
        "remark": "测试主流程"
    }
    response = client.post("/batches", json=batch_data)
    batch = response.json()
    batch_id = batch["id"]
    print(f"✅ 批次创建成功: {batch['batch_no']} (ID: {batch_id})")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 3: 上传预约单、师傅定位、用户评价数据")
    print("-" * 50)
    upload_data = {
        "appointment_orders": [
            {
                "order_no": f"TEST-ORDER-{int(time.time())}-1",
                "customer_name": "测试客户1",
                "customer_phone": "13800000001",
                "address": "测试地址1",
                "product_name": "智能空调",
                "appointment_time": today.strftime("%Y-%m-%dT09:00:00"),
                "technician_id": "TEST-TECH-001",
                "technician_name": "测试师傅A",
                "status": "completed",
                "is_rescheduled": True,
                "reschedule_count": 1,
                "is_second_visit": True,
                "amount": 150.0
            },
            {
                "order_no": f"TEST-ORDER-{int(time.time())}-2",
                "customer_name": "",
                "customer_phone": "13800000002",
                "address": "测试地址2",
                "product_name": "冰箱",
                "appointment_time": today.strftime("%Y-%m-%dT14:00:00"),
                "technician_id": "TEST-TECH-002",
                "technician_name": "测试师傅B",
                "status": "completed",
                "amount": 200.0
            }
        ],
        "technician_locations": [
            {
                "technician_id": "TEST-TECH-001",
                "technician_name": "测试师傅A",
                "order_no": f"TEST-ORDER-{int(time.time())}-1",
                "checkin_time": today.strftime("%Y-%m-%dT08:50:00"),
                "checkout_time": today.strftime("%Y-%m-%dT10:30:00"),
                "latitude": 31.2304,
                "longitude": 121.4737,
                "stay_duration": 100
            }
        ],
        "user_reviews": [
            {
                "order_no": f"TEST-ORDER-{int(time.time())}-1",
                "customer_name": "测试客户1",
                "rating": 1,
                "review_content": "服务很差",
                "review_time": today.strftime("%Y-%m-%dT11:00:00"),
                "has_quality_issue": True,
                "bad_review_found": False
            }
        ],
        "external_receipts": []
    }
    response = client.post(f"/batches/{batch_id}/upload", json=upload_data)
    result = response.json()
    print(f"✅ 数据上传成功")
    print(f"   预约单: {len(result['appointment_orders'])} 条")
    print(f"   脏记录: {len(result['dirty_records'])} 条")
    for dirty in result['dirty_records']:
        print(f"     - {dirty['dirty_type']}: {dirty['handling_opinion']}")
    
    print("\n" + "-" * 50)
    print("步骤 4: 提交复核")
    print("-" * 50)
    response = client.post(f"/batches/{batch_id}/submit", json={"manual_reason": "数据核对完成，提交复核"})
    batch = response.json()
    print(f"✅ 提交复核成功")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 5: 复核用户登录并复核通过")
    print("-" * 50)
    client.login("reviewer", "reviewer123")
    
    response = client.post(
        f"/batches/{batch_id}/review",
        json={
            "result": "approved",
            "comment": "复核通过，数据基本完整，脏记录已标注",
            "manual_reason": "区域售后确认"
        }
    )
    batch = response.json()
    print(f"✅ 复核通过")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 6: 主管登录并冻结批次（异常处理）")
    print("-" * 50)
    client.login("manager", "manager123")
    
    response = client.post(
        f"/batches/{batch_id}/freeze",
        json={
            "freeze_reason": "发现差评原因未落实，需要重新核实",
            "manual_reason": "区域主管介入"
        }
    )
    batch = response.json()
    print(f"✅ 冻结成功")
    print(f"   当前状态: {batch['status']}")
    print(f"   冻结前状态: {batch['status_before_freeze']}")
    print(f"   冻结原因: {batch['freeze_reason']}")
    
    print("\n" + "-" * 50)
    print("步骤 7: 解冻并退回修改")
    print("-" * 50)
    response = client.post(
        f"/batches/{batch_id}/unfreeze",
        json={
            "unfreeze_reason": "核实完成，退回录入修改",
            "manual_reason": "差评原因已找到"
        },
        params={"target_status": "draft"}
    )
    batch = response.json()
    print(f"✅ 解冻成功")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 8: 录入用户重新处理脏记录后再次提交")
    print("-" * 50)
    client.login("entry", "entry123")
    
    response = client.get(f"/batches/{batch_id}/dirty-records")
    dirty_records = response.json()
    print(f"   待处理脏记录: {len(dirty_records)} 条")
    
    client.login("reviewer", "reviewer123")
    for dirty in dirty_records:
        if not dirty["is_resolved"]:
            response = client.patch(
                f"/batches/dirty-records/{dirty['id']}/resolve",
                json={
                    "handling_opinion": "已核实，情况属实，按正常流程处理",
                    "corrected_value": "已确认"
                }
            )
            if response.status_code == 200:
                print(f"   ✅ 脏记录 {dirty['id']} 已处理")
    
    client.login("entry", "entry123")
    response = client.post(f"/batches/{batch_id}/submit", json={"manual_reason": "脏记录已处理，重新提交"})
    batch = response.json()
    print(f"✅ 重新提交成功")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 9: 复核通过后主管结算")
    print("-" * 50)
    client.login("reviewer", "reviewer123")
    client.post(f"/batches/{batch_id}/review", json={"result": "approved", "comment": "复核通过"})
    
    client.login("manager", "manager123")
    response = client.post(f"/batches/{batch_id}/settle", json={"manual_reason": "正常结算"})
    batch = response.json()
    print(f"✅ 结算完成")
    print(f"   当前状态: {batch['status']}")
    
    print("\n" + "-" * 50)
    print("步骤 10: 查看统计和导出")
    print("-" * 50)
    response = client.get("/export/stats")
    stats = response.json()
    print(f"✅ 统计数据:")
    print(f"   总批次: {stats['total_batches']}")
    print(f"   已冻结: {stats['frozen_count']}")
    print(f"   已结算: {stats['settled_count']}")
    print(f"   总订单: {stats['total_orders']}")
    print(f"   差评原因未找到: {stats['bad_review_not_found_count']}")
    
    print("\n" + "=" * 70)
    print("✅ 主流程测试完成!")
    print("=" * 70)


def test_idempotency():
    print("\n" + "=" * 70)
    print("幂等性测试")
    print("=" * 70)
    
    client = APIClient()
    client.login("entry", "entry123")
    
    batch_data = {
        "batch_no": f"IDEMPOTENT-{int(time.time())}",
        "name": "幂等性测试批次",
        "region": "华北区"
    }
    
    print("\n创建批次两次（测试幂等性）:")
    response1 = client.post("/batches", json=batch_data)
    print(f"第一次: {response1.status_code}")
    
    response2 = client.post("/batches", json=batch_data)
    print(f"第二次: {response2.status_code} (应该是400，批次号已存在)")
    
    if response1.status_code == 200:
        batch_id = response1.json()["id"]
        
        print(f"\n提交复核两次:")
        response3 = client.post(f"/batches/{batch_id}/submit", json={})
        print(f"第一次: {response3.status_code} -> {response3.json()['status']}")
        
        response4 = client.post(f"/batches/{batch_id}/submit", json={})
        print(f"第二次: {response4.status_code} (应该是400，状态不允许)")
    
    print("\n✅ 幂等性测试完成")


def test_role_permissions():
    print("\n" + "=" * 70)
    print("权限控制测试")
    print("=" * 70)
    
    client = APIClient()
    client.login("readonly", "readonly123")
    
    print("\n只读用户尝试创建批次:")
    response = client.post("/batches", json={"batch_no": "TEST", "name": "test"})
    print(f"状态码: {response.status_code} (应该是403 Forbidden)")
    
    print("\n只读用户查看批次列表:")
    response = client.get("/batches")
    print(f"状态码: {response.status_code} (应该是200 OK)")
    
    print("\n✅ 权限测试完成")


if __name__ == "__main__":
    print("请确保服务已启动: uvicorn app.main:app --reload")
    
    try:
        test_main_flow()
        test_idempotency()
        test_role_permissions()
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请先启动服务:")
        print("   1. pip install -r requirements.txt")
        print("   2. python init_db.py")
        print("   3. uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
