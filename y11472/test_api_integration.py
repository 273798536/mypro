#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.auth import get_password_hash
from app import models
from app.enums import UserRole
import json

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def setup_test_data():
    db = TestingSessionLocal()

    user = models.User(
        username="test_api",
        hashed_password=get_password_hash("test123"),
        full_name="API测试用户",
        email="test_api@example.com",
        role=UserRole.PROCUREMENT_STAFF,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def test_api_flow():
    print("=" * 60)
    print("仓库退供复核重试补偿队列 - API 集成测试")
    print("=" * 60)

    setup_test_data()
    print("\n" + "-" * 60)
    print("步骤1: 用户登录获取Token")
    print("-" * 60)

    response = client.post(
        "/token",
        data={"username": "test_api", "password": "test123"}
    )
    assert response.status_code == 200, f"登录失败: {response.text}"
    token = response.json()["access_token"]
    print(f"✅ 登录成功，获取到Token")
    headers = {"Authorization": f"Bearer {token}"}

    print("\n" + "-" * 60)
    print("步骤2: 获取当前用户信息")
    print("-" * 60)

    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200, f"获取用户信息失败: {response.text}"
    user_info = response.json()
    print(f"✅ 当前用户: {user_info['full_name']} (角色: {user_info['role']})")

    print("\n" + "-" * 60)
    print("步骤3: 创建退供申请")
    print("-" * 60)

    application_data = {
        "supplier_id": "SUP_API_TEST",
        "supplier_name": "API测试供应商",
        "warehouse_id": "WH_API",
        "description": "API集成测试退供申请",
        "items": [
            {
                "sku_code": "API_SKU001",
                "sku_name": "API测试商品A",
                "batch_no": "API_BATCH001",
                "quantity": 100,
                "unit_price": 50.0,
                "amount": 5000.0
            },
            {
                "sku_code": "API_SKU002",
                "sku_name": "API测试商品B",
                "batch_no": "API_BATCH002",
                "quantity": 50,
                "unit_price": 80.0,
                "amount": 4000.0
            }
        ]
    }

    response = client.post(
        "/api/return-applications/",
        headers=headers,
        json=application_data
    )
    assert response.status_code == 200, f"创建退供申请失败: {response.text}"
    application = response.json()
    print(f"✅ 创建退供申请成功")
    print(f"   - 申请编号: {application['application_no']}")
    print(f"   - 申请ID: {application['id']}")
    print(f"   - 当前状态: {application['status']}")
    application_id = application["id"]

    print("\n" + "-" * 60)
    print("步骤4: 提交退供申请")
    print("-" * 60)

    response = client.post(
        f"/api/return-applications/{application_id}/submit",
        headers=headers
    )
    assert response.status_code == 200, f"提交退供申请失败: {response.text}"
    submitted_app = response.json()
    print(f"✅ 提交退供申请成功")
    print(f"   - 提交后状态: {submitted_app['status']}")

    print("\n" + "-" * 60)
    print("步骤5: 更新退供申请 (PUT接口)")
    print("-" * 60)

    update_data = {
        "description": "API集成测试退供申请 - 已更新",
        "warehouse_id": "WH_API_UPDATED"
    }

    response = client.put(
        f"/api/return-applications/{application_id}",
        headers=headers,
        json=update_data
    )
    assert response.status_code == 200, f"更新退供申请失败: {response.text}"
    updated_app = response.json()
    print(f"✅ 更新退供申请成功")
    print(f"   - 更新后仓库: {updated_app['warehouse_id']}")
    print(f"   - 更新后描述: {updated_app['description']}")

    print("\n" + "-" * 60)
    print("步骤6: 提交含争议的外部回执")
    print("-" * 60)

    receipt_data = {
        "application_id": application_id,
        "source": "external_receipt",
        "supplier_id": "SUP_API_TEST",
        "confirmed_items": [
            {
                "sku_code": "API_SKU001",
                "batch_no": "API_BATCH001",
                "quantity": 80
            }
        ],
        "disputed_items": [
            {
                "sku_code": "API_SKU001",
                "batch_no": "API_BATCH001",
                "quantity": 20,
                "dispute_category": "quality_mismatch",
                "dispute_reason": "API测试 - 质量问题"
            },
            {
                "sku_code": "API_SKU002",
                "batch_no": "API_BATCH002",
                "quantity": 30,
                "dispute_category": "missing_items",
                "dispute_reason": "API测试 - 缺少配件"
            }
        ],
        "total_confirmed_qty": 80,
        "total_disputed_qty": 50,
        "confirmation_date": "2026-05-25T10:00:00",
        "received_by": "API测试签收人",
        "notes": "API测试外部回执",
        "import_batch_no": "API_IMP_001",
        "retry_strategy": "append"
    }

    response = client.post(
        "/api/external-receipts/",
        headers=headers,
        json=receipt_data
    )
    assert response.status_code == 200, f"创建外部回执失败: {response.text}"
    receipt = response.json()
    print(f"✅ 创建外部回执成功")
    print(f"   - 回执编号: {receipt['receipt_no']}")
    print(f"   - 确认数量: {receipt['total_confirmed_qty']}")
    print(f"   - 争议数量: {receipt['total_disputed_qty']}")

    print("\n" + "-" * 60)
    print("步骤7: 查询补偿队列列表")
    print("-" * 60)

    response = client.get(
        "/api/compensation-queue/",
        headers=headers,
        params={"application_id": application_id}
    )
    assert response.status_code == 200, f"查询补偿队列失败: {response.text}"
    queue_list = response.json()
    print(f"✅ 查询补偿队列成功")
    print(f"   - 队列数量: {len(queue_list)}")

    if queue_list:
        queue_item = queue_list[0]
        print(f"   - 队列编号: {queue_item['queue_no']}")
        print(f"   - 队列状态: {queue_item['status']}")
        print(f"   - 争议商品数: {len(queue_item.get('disputed_items_summary', []))}")
        print(f"   - 预估补偿金额: {queue_item['total_compensation_amount']}")
        queue_id = queue_item["id"]
    else:
        print("❌ 补偿队列为空，可能自动创建失败")
        return False

    print("\n" + "-" * 60)
    print("步骤8: 获取补偿队列统计信息")
    print("-" * 60)

    response = client.get(
        "/api/compensation-queue/stats",
        headers=headers
    )
    assert response.status_code == 200, f"获取队列统计失败: {response.text}"
    stats = response.json()
    print(f"✅ 获取队列统计成功")
    print(f"   - 总队列数: {stats['total_count']}")
    print(f"   - 排队中: {stats['queued_count']}")
    print(f"   - 已成功: {stats['success_count']}")

    print("\n" + "-" * 60)
    print("步骤9: 获取可重试分类")
    print("-" * 60)

    response = client.get(
        "/api/compensation-queue/retryable-categories",
        headers=headers
    )
    assert response.status_code == 200, f"获取可重试分类失败: {response.text}"
    categories = response.json()
    print(f"✅ 获取可重试分类成功，共 {len(categories)} 个分类")
    for cat in categories:
        print(f"   - {cat['category']}: {cat['count']} 项")

    print("\n" + "-" * 60)
    print("步骤10: 处理补偿队列")
    print("-" * 60)

    response = client.post(
        f"/api/compensation-queue/{queue_id}/process",
        headers=headers
    )
    assert response.status_code == 200, f"处理补偿队列失败: {response.text}"
    processed_queue = response.json()
    print(f"✅ 处理补偿队列成功")
    print(f"   - 处理后状态: {processed_queue['status']}")
    print(f"   - 重试次数: {processed_queue['retry_count']}")
    print(f"   - 处理成功数: {len(processed_queue.get('processed_items', []))}")

    print("\n" + "-" * 60)
    print("步骤11: 人工审查补偿队列")
    print("-" * 60)

    response = client.post(
        f"/api/compensation-queue/{queue_id}/manual-review",
        headers=headers,
        params={"change_reason": "API测试 - 人工介入审查"}
    )
    assert response.status_code == 200, f"人工审查失败: {response.text}"
    reviewed_queue = response.json()
    print(f"✅ 人工审查成功")
    print(f"   - 审查后状态: {reviewed_queue['status']}")

    print("\n" + "-" * 60)
    print("步骤12: 人工改判补偿入账")
    print("-" * 60)

    resolve_data = {
        "resolved_items": [
            {
                "item_id": 1,
                "sku_code": "API_SKU001",
                "disputed_qty": 20,
                "compensation_amount": 1000.0
            }
        ],
        "compensation_amount": 1000.0,
        "change_reason": "API测试 - 人工判定补偿"
    }

    response = client.post(
        f"/api/compensation-queue/{queue_id}/manual-resolve",
        headers=headers,
        json=resolve_data
    )
    assert response.status_code == 200, f"人工改判失败: {response.text}"
    resolved_queue = response.json()
    print(f"✅ 人工改判成功")
    print(f"   - 改判后状态: {resolved_queue['status']}")
    print(f"   - 实际补偿金额: {resolved_queue['total_compensation_amount']}")

    print("\n" + "-" * 60)
    print("步骤13: 查询审计日志")
    print("-" * 60)

    response = client.get(
        f"/api/audit-logs/application/{application_id}",
        headers=headers
    )
    assert response.status_code == 200, f"查询审计日志失败: {response.text}"
    audit_logs = response.json()
    print(f"✅ 查询审计日志成功，共 {len(audit_logs)} 条记录")
    for log in audit_logs[:3]:
        print(f"   - {log['operation_type']}: {log['change_reason']}")

    print("\n" + "-" * 60)
    print("步骤14: 运行系统自动化检查")
    print("-" * 60)

    response = client.get(
        "/api/compensation-queue/system-checks/run",
        headers=headers
    )
    assert response.status_code == 200, f"系统检查失败: {response.text}"
    check_results = response.json()
    print(f"✅ 系统检查完成，共 {len(check_results)} 项检查:")
    for check in check_results:
        status_icon = "✅" if check["status"] in ["PASS", "WARNING"] else "❌"
        print(f"   {status_icon} {check['check_name']}: {check['status']} - {check['message']}")

    print("\n" + "=" * 60)
    print("✅ 所有 API 集成测试通过！")
    print("=" * 60)

    return True


if __name__ == "__main__":
    try:
        success = test_api_flow()
        if os.path.exists("./test_api.db"):
            os.remove("./test_api.db")
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        if os.path.exists("./test_api.db"):
            os.remove("./test_api.db")
        sys.exit(1)
