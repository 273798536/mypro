import sys
import os
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, get_db
from app.models import User, UserRole
from main import app

DB_FILE = "/tmp/test_hotel_audit.db"
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

Base.metadata.create_all(bind=engine)

db = TestingSessionLocal()
db.add_all([
    User(id=1, username="admin", role=UserRole.SUPERVISOR),
    User(id=2, username="reviewer1", role=UserRole.REVIEWER),
    User(id=3, username="data_entry1", role=UserRole.DATA_ENTRY),
    User(id=4, username="viewer1", role=UserRole.READ_ONLY),
])
db.commit()
db.close()

client = TestClient(app)

HEADERS_ENTRY = {"X-User-Id": "3"}
HEADERS_REVIEWER = {"X-User-Id": "2"}
HEADERS_ADMIN = {"X-User-Id": "1"}


def run_tests():
    print("=" * 70)
    print("酒店前台夜审异常回执状态机 - 完整核心流程测试")
    print("=" * 70)
    
    batch_id = None
    
    try:
        print("\n1. 测试根路径...")
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["version"] == "1.0.0"
        print("   ✓ 根路径测试通过")
        
        print("\n2. 测试创建批次 (录入员)...")
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        batch_no = f"TEST-{today.strftime('%Y%m%d')}-001"
        response = client.post(
            "/batches",
            headers=HEADERS_ENTRY,
            json={"batch_no": batch_no, "audit_date": today.isoformat()}
        )
        assert response.status_code == 200, f"创建批次失败: {response.text}"
        data = response.json()
        assert data["batch_no"] == batch_no
        assert data["status"] == "draft"
        batch_id = data["id"]
        print(f"   ✓ 创建批次成功，批次ID: {batch_id}")
        
        print("\n3. 测试批量添加记录 (含datetime字段)...")
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
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
        
        response = client.post(
            f"/records/batch/{batch_id}/bulk",
            headers=HEADERS_ENTRY,
            json=data
        )
        assert response.status_code == 200, f"批量添加记录失败: {response.text}"
        result = response.json()
        assert result["checkins_added"] == 2
        assert result["deposits_added"] == 1
        assert result["room_changes_added"] == 1
        print(f"   ✓ 批量添加记录成功 (含datetime序列化): {result}")
        
        print("\n4. 测试提交批次 (录入员)...")
        response = client.post(
            f"/batches/{batch_id}/submit",
            headers=HEADERS_ENTRY,
            json={"reason": "录入完成"}
        )
        assert response.status_code == 200, f"提交批次失败: {response.text}"
        data = response.json()
        assert data["status"] == "submitted"
        print(f"   ✓ 提交批次成功，新状态: {data['status']}")
        
        print("\n5. 测试脏记录检测...")
        response = client.get(
            f"/records/batch/{batch_id}/dirty-records",
            headers=HEADERS_REVIEWER
        )
        assert response.status_code == 200, f"查看脏记录失败: {response.text}"
        dirty = response.json()
        assert len(dirty) > 0
        print(f"   ✓ 发现 {len(dirty)} 条异常记录")
        for d in dirty:
            print(f"     - {d['dirty_type']}: {d['description']}")
        
        print("\n6. 测试开始复核 (复核员)...")
        response = client.post(
            f"/batches/{batch_id}/start-review",
            headers=HEADERS_REVIEWER,
            json={"reason": "开始复核"}
        )
        assert response.status_code == 200, f"开始复核失败: {response.text}"
        data = response.json()
        assert data["status"] == "under_review"
        print(f"   ✓ 开始复核成功，新状态: {data['status']}")
        
        print("\n7. 测试添加主管批注 (复核员)...")
        response = client.post(
            f"/records/batch/{batch_id}/comments",
            headers=HEADERS_REVIEWER,
            json={"comment": "发现半夜换房和金额差异，已核实", "comment_type": "复核意见"}
        )
        assert response.status_code == 200, f"添加批注失败: {response.text}"
        print("   ✓ 添加批注成功")
        
        print("\n8. 测试审批通过 (复核员)...")
        response = client.post(
            f"/batches/{batch_id}/approve",
            headers=HEADERS_REVIEWER,
            json={"reason": "复核通过"}
        )
        assert response.status_code == 200, f"审批通过失败: {response.text}"
        data = response.json()
        assert data["status"] == "approved"
        print(f"   ✓ 审批通过成功，新状态: {data['status']}")
        
        print("\n9. 测试冻结结算 (主管)...")
        response = client.post(
            f"/batches/{batch_id}/freeze",
            headers=HEADERS_ADMIN,
            json={"reason": "财务夜审，冻结结算"}
        )
        assert response.status_code == 200, f"冻结结算失败: {response.text}"
        data = response.json()
        assert data["status"] == "frozen"
        print(f"   ✓ 冻结结算成功，新状态: {data['status']}")
        
        print("\n10. 测试查看财务汇总 (主管)...")
        response = client.get(
            f"/audit/batch/{batch_id}/financial-summary",
            headers=HEADERS_ADMIN
        )
        assert response.status_code == 200, f"查看财务汇总失败: {response.text}"
        summary = response.json()
        assert "total_room_fee" in summary
        assert "total_deposit" in summary
        assert "total_invoice" in summary
        print(f"   ✓ 财务汇总: 房费={summary['total_room_fee']}, 押金={summary['total_deposit']}, 发票={summary['total_invoice']}, 差异={summary['discrepancy_amount']}")
        print(f"     异常统计: {summary['dirty_record_summary']}")
        
        print("\n11. 测试查看状态流转 (主管)...")
        response = client.get(
            f"/batches/{batch_id}/transitions",
            headers=HEADERS_ADMIN
        )
        assert response.status_code == 200, f"查看状态流转失败: {response.text}"
        transitions = response.json()
        assert len(transitions) >= 4
        print(f"   ✓ 共 {len(transitions)} 次状态变更")
        for t in transitions:
            print(f"     - {t['from_status']} → {t['to_status']} ({len(t['changes'])} 处变化)")
        
        print("\n12. 测试查看异常解释 (主管)...")
        response = client.get(
            f"/audit/batch/{batch_id}/anomalies",
            headers=HEADERS_ADMIN
        )
        assert response.status_code == 200, f"查看异常解释失败: {response.text}"
        anomalies = response.json()
        print(f"   ✓ 未解决问题: {anomalies['unresolved_issues_count']}")
        for exp in anomalies.get('explanations', []):
            print(f"     - {exp['title']}: {exp['description']}")
        
        print("\n13. 测试导出Excel (主管)...")
        response = client.get(
            f"/audit/batch/{batch_id}/export",
            headers=HEADERS_ADMIN
        )
        assert response.status_code == 200, f"导出Excel失败: {response.text}"
        assert len(response.content) > 0
        print(f"   ✓ 导出Excel成功，文件大小: {len(response.content)} bytes")
        
        print("\n14. 测试权限控制...")
        response = client.post(
            f"/batches/{batch_id}/approve",
            headers=HEADERS_ENTRY,
            json={"reason": "越权测试"}
        )
        assert response.status_code == 403, f"权限控制失效，应返回403，实际返回{response.status_code}"
        print("   ✓ 权限控制正常，录入员无法审批")
        
        response = client.post(
            f"/batches/{batch_id}/freeze",
            headers=HEADERS_REVIEWER,
            json={"reason": "越权测试"}
        )
        assert response.status_code == 403, f"权限控制失效，应返回403，实际返回{response.status_code}"
        print("   ✓ 权限控制正常，复核员无法冻结")
        
        print("\n15. 测试幂等性 - 重复提交相同记录号...")
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        
        data = {
            "checkins": [
                {
                    "record_no": f"CI{batch_id}001",
                    "guest_name": "张三重复",
                    "room_no": "1001",
                    "checkin_time": yesterday.replace(hour=14, minute=0).isoformat(),
                    "room_rate": 388.0,
                    "source": "重复测试"
                }
            ],
            "deposits": [],
            "room_changes": []
        }
        
        response = client.post(
            f"/records/batch/{batch_id}/bulk",
            headers=HEADERS_ENTRY,
            json=data
        )
        assert response.status_code == 200, f"重复提交测试失败: {response.text}"
        result = response.json()
        assert result["checkins_added"] == 0, f"幂等性失效，重复添加了记录: {result}"
        print(f"   ✓ 幂等性测试通过，重复记录未被添加: {result}")
        
        print("\n" + "=" * 70)
        print("✅ 所有 15 个测试全部通过！核心链路验证完成")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
