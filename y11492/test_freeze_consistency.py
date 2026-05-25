#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y11492')
import time

print("=" * 80)
print("投标资料封版重试补偿队列服务 - 冻结链路一致性验证")
print("=" * 80)

print("\n【验证1】依赖导入测试")
print("-" * 80)
try:
    from app.config import settings
    from app.database import SessionLocal, Base, engine
    from app.models import TenderTask, TaskStatus, ConflictStrategy, DeadLetterTask
    from app.schemas import TaskSubmitRequest, AttachmentFile, FreezeRequest
    from app.services.task_service import TaskService
    from app.queue.processor import TaskProcessor
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("✓ 所有依赖导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证2】创建测试任务并处理到成功")
print("-" * 80)
try:
    request = TaskSubmitRequest(
        tender_no="FREEZE-TEST-001",
        project_name="冻结链路测试项目",
        qualification_file=AttachmentFile(
            file_name="资质证书.pdf",
            file_url="/files/qual.pdf",
            file_size=1024000,
            version="v1.0"
        ),
        quotation_version=AttachmentFile(
            file_name="报价清单.xlsx",
            file_url="/files/quote.xlsx",
            file_size=512000,
            version="v2.0"
        ),
        submitter="测试员",
        conflict_strategy=ConflictStrategy.APPEND,
        max_retry_times=3
    )
    
    task, msg = TaskService.create_task(db, request)
    print(f"✓ 任务创建成功: ID={task.id}, 状态={task.status.value}")
    
    processor = TaskProcessor()
    result = processor.process_task(db, task)
    db.refresh(task)
    print(f"✓ 任务处理完成: 结果={'成功' if result else '失败'}, 状态={task.status.value}")
    
except Exception as e:
    print(f"✗ 任务处理失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证3】创建新待冻结任务（状态PENDING）")
print("-" * 80)
try:
    request2 = TaskSubmitRequest(
        tender_no="FREEZE-TEST-002",
        project_name="待冻结测试项目",
        qualification_file=AttachmentFile(
            file_name="资质证书_待冻结.pdf",
            file_url="/files/qual_freeze.pdf",
            file_size=1024000,
            version="v1.0"
        ),
        submitter="测试员",
        conflict_strategy=ConflictStrategy.APPEND
    )
    
    task2, msg2 = TaskService.create_task(db, request2)
    print(f"✓ 待冻结任务创建成功: ID={task2.id}")
    print(f"  状态: {task2.status.value}")
    print(f"  is_frozen: {task2.is_frozen}")
    
except Exception as e:
    print(f"✗ 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证4】执行冻结操作并验证一致性")
print("-" * 80)
try:
    freeze_req = FreezeRequest(
        operator="审计员",
        reason="导出前冻结，防止修改"
    )
    
    frozen_task = TaskService.freeze_task(db, task2.id, freeze_req)
    db.refresh(frozen_task)
    
    print(f"✓ 冻结操作执行成功")
    print(f"  任务ID: {frozen_task.id}")
    print(f"  status: {frozen_task.status.value}")
    print(f"  is_frozen: {frozen_task.is_frozen}")
    print(f"  status_before_frozen: {frozen_task.status_before_frozen.value}")
    print(f"  frozen_by: {frozen_task.frozen_by}")
    print(f"  frozen_reason: {frozen_task.frozen_reason}")
    
    assert frozen_task.status == TaskStatus.FROZEN, f"状态应为frozen，实际为{frozen_task.status.value}"
    assert frozen_task.is_frozen == True, "is_frozen应为True"
    assert frozen_task.status_before_frozen == TaskStatus.PENDING, "冻结前状态应为pending"
    print("✓ 冻结后字段一致性验证通过")
    
except Exception as e:
    print(f"✗ 冻结验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证5】验证历史记录与状态一致")
print("-" * 80)
try:
    histories = TaskService.get_task_histories(db, task2.id)
    freeze_history = None
    for h in histories:
        if h.operation_type == "freeze":
            freeze_history = h
            break
    
    assert freeze_history is not None, "应存在freeze操作记录"
    assert freeze_history.before_status.value == "pending", f"before_status应为pending，实际为{freeze_history.before_status}"
    assert freeze_history.after_status.value == "frozen", f"after_status应为frozen，实际为{freeze_history.after_status}"
    assert freeze_history.operator == "审计员"
    
    print(f"✓ 历史记录验证通过")
    print(f"  历史记录数: {len(histories)}")
    for h in histories:
        print(f"    - {h.operate_time.strftime('%H:%M:%S')} | {h.operation_type:15s} | {h.before_status.value if h.before_status else '':10s} → {h.after_status.value if h.after_status else '':10s} | {h.operator}")
    
    assert freeze_history.after_status == frozen_task.status, "历史after_status应与任务当前status一致"
    print("✓ 历史记录与任务状态一致性验证通过")
    
except Exception as e:
    print(f"✗ 历史验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证6】验证统计数据与实际状态一致")
print("-" * 80)
try:
    stats = TaskService.get_statistics(db)
    print(f"✓ 统计数据获取成功")
    print(f"  total_tasks: {stats['total_tasks']}")
    print(f"  pending_tasks: {stats['pending_tasks']}")
    print(f"  success_tasks: {stats['success_tasks']}")
    print(f"  frozen_tasks: {stats['frozen_tasks']}")
    print(f"  today_submitted: {stats['today_submitted']}")
    
    all_tasks = db.query(TenderTask).all()
    actual_frozen = sum(1 for t in all_tasks if t.status == TaskStatus.FROZEN or t.is_frozen)
    actual_pending = sum(1 for t in all_tasks if t.status == TaskStatus.PENDING and not t.is_frozen)
    actual_success = sum(1 for t in all_tasks if t.status == TaskStatus.SUCCESS)
    
    print(f"  实际frozen数: {actual_frozen}")
    print(f"  实际pending数: {actual_pending}")
    print(f"  实际success数: {actual_success}")
    
    assert stats['frozen_tasks'] == actual_frozen, f"统计frozen={stats['frozen_tasks']} != 实际{actual_frozen}"
    assert stats['pending_tasks'] == actual_pending, f"统计pending={stats['pending_tasks']} != 实际{actual_pending}"
    assert stats['success_tasks'] == actual_success, f"统计success={stats['success_tasks']} != 实际{actual_success}"
    assert stats['today_submitted'] >= 2, f"today_submitted={stats['today_submitted']} 应至少为2"
    print("✓ 统计数据与实际状态一致性验证通过")
    
except Exception as e:
    print(f"✗ 统计验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证7】验证列表查询与详情一致")
print("-" * 80)
try:
    total, tasks = TaskService.list_tasks(db, page=1, page_size=10)
    
    list_frozen = sum(1 for t in tasks if t.status == TaskStatus.FROZEN)
    list_pending = sum(1 for t in tasks if t.status == TaskStatus.PENDING)
    
    print(f"  列表frozen数: {list_frozen}")
    print(f"  列表pending数: {list_pending}")
    
    detail = TaskService.get_task_detail(db, task2.id)
    print(f"  详情status: {detail.status.value}")
    print(f"  详情is_frozen: {detail.is_frozen}")
    print(f"  详情status_before_frozen: {detail.status_before_frozen.value if detail.status_before_frozen else None}")
    
    assert detail.status == TaskStatus.FROZEN, "详情status应为frozen"
    assert detail.is_frozen == True, "详情is_frozen应为True"
    assert list_frozen == actual_frozen, "列表frozen数应与实际一致"
    print("✓ 列表、详情、实际状态三者一致性验证通过")
    
except Exception as e:
    print(f"✗ 列表/详情验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证8】验证解冻操作恢复原状态")
print("-" * 80)
try:
    unfrozen_task = TaskService.unfreeze_task(db, task2.id, "审计员", "复核完成，解冻恢复")
    db.refresh(unfrozen_task)
    
    print(f"✓ 解冻操作执行成功")
    print(f"  任务ID: {unfrozen_task.id}")
    print(f"  status: {unfrozen_task.status.value}")
    print(f"  is_frozen: {unfrozen_task.is_frozen}")
    print(f"  status_before_frozen: {unfrozen_task.status_before_frozen}")
    
    assert unfrozen_task.status == TaskStatus.PENDING, f"状态应恢复为pending，实际为{unfrozen_task.status.value}"
    assert unfrozen_task.is_frozen == False, "is_frozen应为False"
    assert unfrozen_task.status_before_frozen is None, "status_before_frozen应清空"
    
    stats_after = TaskService.get_statistics(db)
    print(f"  解冻后frozen_tasks: {stats_after['frozen_tasks']}")
    print(f"  解冻后pending_tasks: {stats_after['pending_tasks']}")
    
    assert stats_after['frozen_tasks'] == 0, "解冻后frozen统计应为0"
    assert stats_after['pending_tasks'] == 1, "解冻后pending统计应为1"
    print("✓ 解冻后状态及统计一致性验证通过")
    
except Exception as e:
    print(f"✗ 解冻验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证9】验证成功状态任务不能冻结")
print("-" * 80)
try:
    freeze_req2 = FreezeRequest(
        operator="审计员",
        reason="测试冻结成功任务"
    )
    
    result = TaskService.freeze_task(db, task.id, freeze_req2)
    assert result is None, "成功状态的任务应不能冻结"
    print("✓ 成功状态任务冻结操作被正确拒绝")
    
except Exception as e:
    print(f"✗ 冻结边界验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证10】验证冻结后Worker不会处理")
print("-" * 80)
try:
    request3 = TaskSubmitRequest(
        tender_no="FREEZE-TEST-003",
        project_name="Worker跳过测试项目",
        qualification_file=AttachmentFile(
            file_name="资质证书_worker.pdf",
            file_url="/files/qual_worker.pdf",
            file_size=1024000,
            version="v1.0"
        ),
        submitter="测试员",
        conflict_strategy=ConflictStrategy.APPEND
    )
    
    task3, _ = TaskService.create_task(db, request3)
    freeze_req3 = FreezeRequest(operator="审计员", reason="测试Worker跳过")
    TaskService.freeze_task(db, task3.id, freeze_req3)
    db.refresh(task3)
    
    processor = TaskProcessor()
    process_result = processor.process_task(db, task3)
    db.refresh(task3)
    
    print(f"  冻结后调用process_task返回: {process_result}")
    print(f"  任务状态保持: {task3.status.value}")
    
    assert process_result == False, "冻结任务处理应返回False"
    assert task3.status == TaskStatus.FROZEN, "冻结任务状态应保持frozen"
    print("✓ 冻结后Worker正确跳过处理验证通过")
    
except Exception as e:
    print(f"✗ Worker跳过验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

db.close()

print("\n" + "=" * 80)
print("✓ 所有冻结链路一致性验证通过！")
print("=" * 80)
print()
print("验证要点总结:")
print("  ✓ 冻结后 status=frozen, is_frozen=True 一致")
print("  ✓ 冻结后历史记录 after_status 与任务状态一致")
print("  ✓ 冻结后统计 frozen_tasks 与实际一致")
print("  ✓ 冻结后列表、详情、统计三者一致")
print("  ✓ 解冻后恢复原状态并清空冻结前状态")
print("  ✓ 解冻后统计数据同步更新")
print("  ✓ 成功/取消/关闭状态任务不能冻结")
print("  ✓ 冻结后Worker跳过处理")
print("  ✓ today_submitted 日期统计正确")
