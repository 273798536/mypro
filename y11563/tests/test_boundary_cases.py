#!/usr/bin/env python3
import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.records import RecordService
from app.services.idempotency import IdempotencyService
from app.services.reconciliation import ReconciliationService
from app.services.export import ExportService
from app.services.audit import AuditService


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


class TestBoundaryCases:
    """边界情况测试"""

    def test_duplicate_submission_update(self, db_session):
        """测试重复提交 - update策略"""
        service = RecordService(db_session)

        data = {
            "checkin_no": "CI-DUP-001",
            "order_no": "ORD001",
            "guest_name": "测试客人",
            "room_rate": 399,
            "total_amount": 798,
        }

        record1, is_dup1, action1 = service.create_or_update_checkin(
            data=data, duplicate_strategy="update", operator="tester"
        )

        assert not is_dup1
        assert action1 == "created"

        data["room_rate"] = 499
        data["total_amount"] = 998

        record2, is_dup2, action2 = service.create_or_update_checkin(
            data=data, duplicate_strategy="update", operator="tester"
        )

        assert is_dup2
        assert action2 == "updated"
        assert record2.room_rate == 499

    def test_duplicate_submission_ignore(self, db_session):
        """测试重复提交 - ignore策略"""
        service = RecordService(db_session)

        data = {
            "checkin_no": "CI-DUP-002",
            "order_no": "ORD002",
            "guest_name": "测试客人",
            "room_rate": 399,
        }

        record1, is_dup1, action1 = service.create_or_update_checkin(
            data=data, duplicate_strategy="ignore", operator="tester"
        )

        data["room_rate"] = 499
        record2, is_dup2, action2 = service.create_or_update_checkin(
            data=data, duplicate_strategy="ignore", operator="tester"
        )

        assert is_dup2
        assert action2 == "ignored"
        assert record2.room_rate == 399

    def test_revoke_then_resubmit(self, db_session):
        """测试撤回后再提交"""
        service = RecordService(db_session)

        data = {
            "checkin_no": "CI-REV-001",
            "order_no": "ORD003",
            "guest_name": "测试客人",
        }

        record, _, _ = service.create_or_update_checkin(
            data=data, operator="tester"
        )
        assert record.status != "revoked"

        success = service.revoke_record("checkin", "CI-REV-001", "tester", "数据错误")
        assert success

        record = service.get_checkin("CI-REV-001")
        assert record.status == "revoked"

        data["status"] = "checked_in"
        _, is_dup, action = service.create_or_update_checkin(
            data=data, operator="tester", duplicate_strategy="update"
        )
        assert is_dup
        assert action == "updated"

    def test_partial_failure_batch(self, db_session):
        """测试部分失败 - 批量处理"""
        service = RecordService(db_session)

        valid_data = {
            "deposit_no": "DEP-PART-001",
            "checkin_no": "CI001",
            "amount": 500,
        }
        invalid_data = {"invalid_field": "value"}

        batch_no = service.generate_batch_no()

        success_count = 0
        failed_count = 0

        for data in [valid_data, invalid_data]:
            try:
                service.create_or_update_deposit(
                    data=data, batch_no=batch_no, operator="tester"
                )
                success_count += 1
            except Exception:
                failed_count += 1

        assert success_count == 1
        assert failed_count == 1

    def test_manual_adjust_reconciliation(self, db_session):
        """测试人工改判"""
        from app.models.checkin import CheckinRecord

        record_service = RecordService(db_session)
        recon_service = ReconciliationService(db_session)

        checkin = CheckinRecord(
            checkin_no="CI-MAN-001",
            guest_name="测试客人",
            room_rate=399,
            total_amount=399,
            paid_amount=100,
            checkin_date=datetime.now(),
            checkout_date=datetime.now() + timedelta(days=1),
            created_by="tester",
            updated_by="tester",
        )
        db_session.add(checkin)
        db_session.commit()

        result = recon_service.reconcile_checkin(checkin, operator="tester")
        assert not result.is_matched

        adjusted = recon_service.manual_adjust(
            reconciliation_no=result.reconciliation_no,
            is_matched=True,
            adjust_reason="财务确认平账",
            adjusted_by="财务主管",
        )

        assert adjusted.is_matched
        assert adjusted.is_manually_adjusted
        assert adjusted.adjust_reason == "财务确认平账"

    def test_freeze_before_export(self, db_session):
        """测试导出前冻结"""
        export_service = ExportService(db_session)
        record_service = RecordService(db_session)

        batch_no = record_service.generate_batch_no()

        snapshot = export_service.export_to_excel(
            export_type="checkin",
            batch_no=batch_no,
            exported_by="tester",
            freeze_after=True,
        )

        assert snapshot.is_frozen
        assert snapshot.frozen_by == "tester"
        assert snapshot.frozen_at is not None

    def test_idempotency_record_history(self, db_session):
        """测试幂等记录追踪"""
        idem_service = IdempotencyService(db_session)

        key = idem_service.generate_key("checkin", "CI-IDEM-001")
        data = {"guest_name": "测试", "amount": 100}

        is_dup1, record1 = idem_service.check_and_record(
            idempotency_key=key,
            request_type="create",
            record_type="checkin",
            record_id="CI-IDEM-001",
            request_data=data,
        )
        assert not is_dup1

        is_dup2, record2 = idem_service.check_and_record(
            idempotency_key=key,
            request_type="create",
            record_type="checkin",
            record_id="CI-IDEM-001",
            request_data=data,
        )
        assert is_dup2
        assert record2.request_count == 2

    def test_audit_log_trail(self, db_session):
        """测试审计日志 - 谁在什么时候改过什么"""
        service = RecordService(db_session)
        audit_service = AuditService(db_session)

        data = {
            "checkin_no": "CI-AUD-001",
            "guest_name": "张三",
            "room_rate": 399,
        }
        service.create_or_update_checkin(data, operator="operator1")

        data["guest_name"] = "李四"
        service.create_or_update_checkin(
            data, duplicate_strategy="update", operator="operator2"
        )

        history = audit_service.get_record_history("checkin", "CI-AUD-001")

        assert len(history) >= 2
        operators = set(log.operator for log in history)
        assert "operator1" in operators
        assert "operator2" in operators

    def test_snapshot_checksum_verification(self, db_session):
        """测试导出快照校验和验证"""
        export_service = ExportService(db_session)

        snapshot = export_service.export_to_excel(
            export_type="checkin", exported_by="tester"
        )

        verification = export_service.verify_snapshot(snapshot.snapshot_no)
        assert verification["valid"]

        original_checksum = snapshot.checksum
        snapshot.snapshot_data = {"tampered": True}
        db_session.commit()

        verification2 = export_service.verify_snapshot(snapshot.snapshot_no)
        assert not verification2["valid"]

    def test_data_masking_phone(self, db_session):
        """测试数据脱敏 - 手机号"""
        from app.utils.mask import mask_phone, mask_id_card, mask_name, mask_sensitive_data

        assert mask_phone("13812345678") == "138****5678"
        assert mask_phone("") == ""
        assert mask_phone("123") == "123"

        assert mask_id_card("110101199001011234") == "110101********1234"
        assert mask_name("张三") == "张*"
        assert mask_name("张三丰") == "张*丰"

        data = {"guest_phone": "13812345678", "guest_name": "张三", "id_card": "110101199001011234"}
        masked = mask_sensitive_data(data)
        assert masked["guest_phone"] == "138****5678"
        assert masked["guest_name"] == "张*"
        assert masked["id_card"] == "110101********1234"

    def test_data_masking_in_export(self, db_session):
        """测试导出时的数据脱敏"""
        from app.models.checkin import CheckinRecord
        from datetime import datetime, timedelta

        checkin = CheckinRecord(
            checkin_no="CI-MASK-001",
            guest_name="张三丰",
            guest_phone="13812345678",
            id_card="110101199001011234",
            room_rate=399,
            total_amount=399,
            paid_amount=399,
            checkin_date=datetime.now(),
            checkout_date=datetime.now() + timedelta(days=1),
            created_by="前台小李",
            updated_by="前台小李",
        )
        db_session.add(checkin)
        db_session.commit()

        export_service = ExportService(db_session)
        data = export_service._get_checkin_data()

        assert len(data) >= 1
        for d in data:
            if d.get("checkin_no") == "CI-MASK-001":
                assert d["guest_phone"] == "138****5678"
                assert "**" in d["guest_name"] or d["guest_name"] == "张*丰"
                assert "********" in d["id_card"]
                break

    def test_permission_service(self, db_session):
        """测试权限校验服务"""
        from app.utils.security import PermissionService

        perm_service = PermissionService()

        perm_service.assign_role("user_finance", "finance")
        perm_service.assign_role("user_reception", "reception")
        perm_service.assign_role("user_auditor", "auditor")
        perm_service.assign_role("user_admin", "admin")

        assert perm_service.check_permission("user_finance", "reconciliation:adjust")
        assert perm_service.check_permission("user_finance", "export:freeze")
        assert not perm_service.check_permission("user_reception", "reconciliation:adjust")
        assert not perm_service.check_permission("user_auditor", "export:freeze")
        assert perm_service.check_permission("user_admin", "anything")

        try:
            perm_service.require_permission("user_reception", "reconciliation:adjust", "人工改判")
            assert False, "应该抛出权限异常"
        except PermissionError as e:
            assert "无权" in str(e)

    def test_conflict_lock_service(self, db_session):
        """测试冲突锁服务"""
        from app.utils.security import ConflictLockService

        lock_service = ConflictLockService()

        assert lock_service.acquire_lock("checkin", "CI-LOCK-001", "user1")
        assert not lock_service.acquire_lock("checkin", "CI-LOCK-001", "user2")
        assert lock_service.is_locked("checkin", "CI-LOCK-001") == "user1"

        lock_service.release_lock("checkin", "CI-LOCK-001")
        assert lock_service.is_locked("checkin", "CI-LOCK-001") is None

        assert lock_service.acquire_lock("checkin", "CI-LOCK-001", "user2")
        assert lock_service.is_locked("checkin", "CI-LOCK-001") == "user2"
        assert not lock_service.force_release("checkin", "CI-LOCK-001", "user1")
        assert lock_service.force_release("checkin", "CI-LOCK-001", "user2")
        assert lock_service.is_locked("checkin", "CI-LOCK-001") is None

    def test_retry_queue_service(self, db_session):
        """测试重试队列服务"""
        from app.utils.retry_queue import RetryQueueService

        retry_service = RetryQueueService(max_retries=3)

        call_count = [0]
        def failing_callback(data):
            call_count[0] += 1
            if call_count[0] < 3:
                raise ValueError(f"模拟失败 {call_count[0]}")
            return "success"

        task_id = retry_service.enqueue("test_task", {"key": "value"}, callback=failing_callback)

        result1 = retry_service.process_next()
        assert result1["status"] == "retry_scheduled"
        assert result1["retry_count"] == 1

        result2 = retry_service.process_next()
        assert result2["status"] == "retry_scheduled"
        assert result2["retry_count"] == 2

        result3 = retry_service.process_next()
        assert result3["status"] == "completed"
        assert result3["result"] == "success"

        stats = retry_service.get_stats()
        assert stats["history"] >= 3

    def test_dead_letter_queue_service(self, db_session):
        """测试死信队列服务"""
        from app.utils.retry_queue import DeadLetterQueueService, RetryQueueService

        dlq_service = DeadLetterQueueService()
        retry_service = RetryQueueService(max_retries=2)

        def always_fail(data):
            raise ValueError("始终失败")

        task_id = retry_service.enqueue("fail_task", {"key": "value"}, callback=always_fail)

        for _ in range(5):
            result = retry_service.process_next()
            if result["status"] == "moved_to_dead_letter":
                break

        failed = retry_service.get_failed()
        assert len(failed) >= 1

        dlq_id = dlq_service.add(failed[0])
        assert dlq_id.startswith("DLQ-")

        assert dlq_service.review(dlq_id, "财务主管", "已确认是网络问题，手动重试", resolved=False)

        stats = dlq_service.get_stats()
        assert stats["total"] >= 1
        assert stats["reviewed"] >= 1

    def test_sms_record_model(self, db_session):
        """测试短信截图记录模型"""
        from app.models.sms_record import SmsRecord
        from datetime import datetime

        sms = SmsRecord(
            sms_no="SMS-001",
            checkin_no="CI-SMS-001",
            order_no="ORD-SMS-001",
            guest_name="测试客人",
            guest_phone="13812345678",
            sms_type="验证码",
            sms_content="您的验证码是123456",
            image_path="/sms/screenshots/001.png",
            sent_time=datetime.now(),
            sender="系统",
            operator="前台小李",
            batch_no="BATCH-SMS-001",
        )
        db_session.add(sms)
        db_session.commit()

        saved = db_session.query(SmsRecord).filter_by(sms_no="SMS-001").first()
        assert saved is not None
        assert saved.guest_name == "测试客人"

    def test_handover_record_model(self, db_session):
        """测试门店交接记录模型"""
        from app.models.handover import HandoverRecord
        from datetime import datetime

        handover = HandoverRecord(
            handover_no="HD-001",
            shift_type="夜班",
            handover_date=datetime.now(),
            operator_out="前台小李",
            operator_in="前台小王",
            room_count=50,
            checkin_count=10,
            checkout_count=8,
            total_cash=1500.0,
            total_card=3000.0,
            total_online=2000.0,
            total_amount=6500.0,
            issues=["203房间客人投诉噪音", "305房间空调故障"],
            remarks="夜班交接正常",
            batch_no="BATCH-HD-001",
            status="completed",
        )
        db_session.add(handover)
        db_session.commit()

        saved = db_session.query(HandoverRecord).filter_by(handover_no="HD-001").first()
        assert saved is not None
        assert saved.total_amount == 6500.0
        assert saved.shift_type == "夜班"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
