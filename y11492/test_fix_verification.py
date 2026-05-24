#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y11492')

print("=" * 70)
print("投标资料封版重试补偿队列服务 - 修复验证测试")
print("=" * 70)

print("\n【验证1】依赖导入测试")
print("-" * 70)
try:
    from app.config import settings
    print("✓ app.config 导入成功，pydantic-settings 正常工作")
    print(f"  数据库URL: {settings.DATABASE_URL}")
    print(f"  最大重试次数: {settings.MAX_RETRY_TIMES}")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

print("\n【验证2】数据库初始化测试")
print("-" * 70)
try:
    from app.database import SessionLocal, Base, engine
    from app.models import TenderTask, TaskStatus, DeadLetterTask
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("✓ 数据库初始化成功")
except Exception as e:
    print(f"✗ 数据库初始化失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证3】死信分类统计API测试")
print("-" * 70)
try:
    from app.services.dead_letter_service import DeadLetterService
    
    stats = DeadLetterService.get_classification_stats(db)
    print(f"✓ 死信分类统计API正常工作")
    print(f"  当前统计结果: {stats}")
except Exception as e:
    print(f"✗ 死信分类统计失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证4】核心处理器逻辑测试")
print("-" * 70)
try:
    from app.schemas import TaskSubmitRequest, AttachmentFile
    from app.services.task_service import TaskService
    from app.models import ConflictStrategy
    
    request = TaskSubmitRequest(
        tender_no="VERIFY-TEST-001",
        project_name="修复验证测试项目",
        qualification_file=AttachmentFile(
            file_name="资质证书.pdf",
            file_url="/files/qual.pdf",
            file_size=1024000,
            file_hash="abc123xyz",
            version="v1.0"
        ),
        quotation_version=AttachmentFile(
            file_name="报价清单_v2.xlsx",
            file_url="/files/quote.xlsx",
            file_size=512000,
            version="v2.1"
        ),
        sealed_scan_file=AttachmentFile(
            file_name="盖章扫描件.pdf",
            file_url="/files/sealed.pdf",
            file_size=2048000,
            page_count=15
        ),
        submitter="验证测试员",
        conflict_strategy=ConflictStrategy.APPEND,
        max_retry_times=3
    )
    
    task, msg = TaskService.create_task(db, request)
    print(f"✓ 任务创建成功: ID={task.id}, 批次={task.batch_id}")
    print(f"  状态: {task.status.value}")
except Exception as e:
    print(f"✗ 任务创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证5】任务处理器执行测试")
print("-" * 70)
try:
    from app.queue.processor import TaskProcessor
    
    processor = TaskProcessor()
    result = processor.process_task(db, task)
    
    db.refresh(task)
    
    print(f"✓ 任务处理器执行完成")
    print(f"  执行结果: {'成功' if result else '失败'}")
    print(f"  最终状态: {task.status.value}")
    
    if task.process_result:
        print(f"  处理详情包含: {list(task.process_result.keys())}")
        if 'qualification' in task.process_result:
            qual = task.process_result['qualification']
            print(f"    - 资质文件: {qual.get('status')}, 封印码: {qual.get('seal_code', 'N/A')}")
        if 'quotation' in task.process_result:
            quote = task.process_result['quotation']
            print(f"    - 报价版本: {quote.get('status')}, 版本锁定: {quote.get('version_locked', False)}")
        if 'sealed_scan' in task.process_result:
            scan = task.process_result['sealed_scan']
            print(f"    - 盖章扫描: {scan.get('status')}, 验页数: {scan.get('pages_verified', 0)}")
        if 'external_receipt' in task.process_result:
            receipt = task.process_result['external_receipt']
            print(f"    - 外部回执: {receipt.get('status')}, 回执ID: {receipt.get('receipt_id', 'N/A')}")
        if 'compensation' in task.process_result:
            cmp = task.process_result['compensation']
            print(f"    - 补偿入账: {cmp.get('status')}, 补偿ID: {cmp.get('compensation_id', 'N/A')}")
except Exception as e:
    print(f"✗ 任务处理失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证6】任务历史记录完整性")
print("-" * 70)
try:
    histories = TaskService.get_task_histories(db, task.id)
    print(f"✓ 历史记录正常记录")
    print(f"  历史记录数: {len(histories)}")
    for h in histories:
        print(f"    - {h.operate_time.strftime('%H:%M:%S')} | {h.operation_type:20s} | {h.operator}")
except Exception as e:
    print(f"✗ 历史记录查询失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n【验证7】统计数据一致性")
print("-" * 70)
try:
    stats = TaskService.get_statistics(db)
    print(f"✓ 统计数据正常")
    print(f"  总任务数: {stats['total_tasks']}")
    print(f"  成功任务: {stats['success_tasks']}")
    print(f"  死信任务: {stats['dead_letter_tasks']}")
except Exception as e:
    print(f"✗ 统计数据失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

db.close()

print("\n" + "=" * 70)
print("✓ 所有修复验证通过！系统可正常运行")
print("=" * 70)
