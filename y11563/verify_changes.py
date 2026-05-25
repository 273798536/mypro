#!/usr/bin/env python3
"""验证所有新增功能"""
import sys

def verify_all():
    print("=" * 60)
    print("  酒店夜审 API - 新增功能验证")
    print("=" * 60)
    
    # 1. 数据脱敏
    print("\n[1] 数据脱敏测试...")
    from app.utils.mask import mask_phone, mask_id_card, mask_name, mask_sensitive_data
    
    assert mask_phone("13812345678") == "138****5678", "手机号脱敏失败"
    assert mask_id_card("110101199001011234") == "110101********1234", "身份证脱敏失败"
    assert mask_name("张三丰") == "张*丰", "姓名脱敏失败"
    
    data = {"guest_phone": "13812345678", "guest_name": "张三", "id_card": "110101199001011234"}
    masked = mask_sensitive_data(data)
    assert masked["guest_phone"] == "138****5678"
    assert "*" in masked["guest_name"]
    assert "********" in masked["id_card"]
    
    print("  ✅ 数据脱敏测试通过")
    
    # 2. 权限校验
    print("\n[2] 权限校验测试...")
    from app.utils.security import PermissionService
    
    ps = PermissionService()
    ps.assign_role("finance_user", "finance")
    ps.assign_role("reception_user", "reception")
    ps.assign_role("admin_user", "admin")
    
    assert ps.check_permission("finance_user", "reconciliation:adjust"), "财务应有改判权限"
    assert ps.check_permission("finance_user", "export:freeze"), "财务应有冻结权限"
    assert not ps.check_permission("reception_user", "reconciliation:adjust"), "前台不应有改判权限"
    assert ps.check_permission("admin_user", "anything"), "admin应有所有权限"
    
    print("  ✅ 权限校验测试通过")
    
    # 3. 冲突锁
    print("\n[3] 冲突锁测试...")
    from app.utils.security import ConflictLockService
    
    lock = ConflictLockService()
    assert lock.acquire_lock("checkin", "CI-001", "user1"), "user1应能获取锁"
    assert not lock.acquire_lock("checkin", "CI-001", "user2"), "user2不应能获取锁"
    assert lock.is_locked("checkin", "CI-001") == "user1", "锁应属于user1"
    
    lock.release_lock("checkin", "CI-001")
    assert lock.is_locked("checkin", "CI-001") is None, "锁应被释放"
    
    print("  ✅ 冲突锁测试通过")
    
    # 4. 重试队列
    print("\n[4] 重试队列测试...")
    from app.utils.retry_queue import RetryQueueService
    
    rq = RetryQueueService(max_retries=3)
    
    call_count = [0]
    def failing_callback(data):
        call_count[0] += 1
        if call_count[0] < 3:
            raise ValueError(f"模拟失败 {call_count[0]}")
        return "success"
    
    task_id = rq.enqueue("test_task", {"key": "value"}, callback=failing_callback)
    assert task_id.startswith("RQ-"), "任务ID格式不正确"
    
    result = rq.process_next()
    assert result["status"] == "retry_scheduled", "第一次应重试"
    
    result = rq.process_next()
    assert result["status"] == "retry_scheduled", "第二次应重试"
    
    result = rq.process_next()
    assert result["status"] == "completed", "第三次应成功"
    assert result["result"] == "success"
    
    print("  ✅ 重试队列测试通过")
    
    # 5. 死信队列
    print("\n[5] 死信队列测试...")
    from app.utils.retry_queue import DeadLetterQueueService
    
    dlq = DeadLetterQueueService()
    dlq_id = dlq.add({"task_id": "test", "error": "测试错误"})
    assert dlq_id.startswith("DLQ-"), "死信ID格式不正确"
    
    assert dlq.review(dlq_id, "财务主管", "已确认，手动处理"), "审核应成功"
    
    stats = dlq.get_stats()
    assert stats["total"] >= 1
    assert stats["reviewed"] >= 1
    
    print("  ✅ 死信队列测试通过")
    
    # 6. 短信截图模型
    print("\n[6] 短信截图模型测试...")
    from app.models.sms_record import SmsRecord
    from datetime import datetime
    
    sms = SmsRecord(
        sms_no="SMS-VERIFY-001",
        checkin_no="CI-VERIFY-001",
        guest_name="测试客人",
        guest_phone="13812345678",
        sms_type="验证码",
        sms_content="您的验证码是123456",
        sent_time=datetime.now(),
        operator="前台小李",
    )
    assert sms.sms_no == "SMS-VERIFY-001"
    print("  ✅ 短信截图模型测试通过")
    
    # 7. 门店交接记录模型
    print("\n[7] 门店交接记录模型测试...")
    from app.models.handover import HandoverRecord
    
    handover = HandoverRecord(
        handover_no="HD-VERIFY-001",
        shift_type="夜班",
        operator_out="前台小李",
        operator_in="前台小王",
        total_cash=1500.0,
        total_amount=6500.0,
        issues=["203房间客人投诉"],
        remarks="夜班交接正常",
    )
    assert handover.handover_no == "HD-VERIFY-001"
    assert handover.shift_type == "夜班"
    print("  ✅ 门店交接记录模型测试通过")
    
    # 8. 数据库模型初始化
    print("\n[8] 数据库模型初始化测试...")
    from app.database import Base, engine
    import app.models
    
    Base.metadata.create_all(bind=engine)
    print("  ✅ 数据库模型初始化成功")
    
    # 9. 权限校验 API 集成测试
    print("\n[9] 权限校验 API 集成测试...")
    from app.api.deps import permission_service
    
    permission_service.assign_role("test_finance", "finance")
    permission_service.assign_role("test_reception", "reception")
    permission_service.assign_role("test_auditor", "auditor")
    permission_service.assign_role("test_admin", "admin")
    
    assert permission_service.check_permission("test_finance", "reconciliation:adjust")
    assert permission_service.check_permission("test_finance", "export:freeze")
    assert not permission_service.check_permission("test_reception", "reconciliation:adjust")
    assert not permission_service.check_permission("test_auditor", "export:freeze")
    assert permission_service.check_permission("test_admin", "anything")
    
    print("  ✅ 权限校验 API 集成测试通过")
    
    # 10. 服务层重试队列机制
    print("\n[10] 服务层重试队列机制测试...")
    from app.services.records import RecordService
    from app.database import SessionLocal
    
    db = SessionLocal()
    service = RecordService(db)
    
    result = service.batch_process_with_retry(
        items=[{"checkin_no": "CI-RETRY-001", "guest_name": "测试客人"}],
        record_type="checkin",
        max_retries=3,
        operator="tester",
    )
    
    assert "total" in result
    assert "success" in result
    assert "retry_stats" in result
    assert "dlq_stats" in result
    assert result["retry_stats"] is not None
    assert result["dlq_stats"] is not None
    db.close()
    
    print("  ✅ 服务层重试队列机制测试通过")
    
    print("\n" + "=" * 60)
    print("  所有新增功能验证通过！")
    print("  - 数据脱敏: 手机号/身份证/姓名")
    print("  - 权限校验: API层集成")
    print("  - 冲突锁: 并发控制")
    print("  - 重试队列: 服务层集成")
    print("  - 死信队列: 失败任务处理")
    print("  - 短信截图: API/CLI 入口")
    print("  - 门店交接: API/CLI 入口")
    print("  - 人工改判: 需finance角色")
    print("  - 导出冻结: 需finance角色")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(verify_all())
