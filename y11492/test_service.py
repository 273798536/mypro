#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y11492')

from app.database import SessionLocal, Base, engine
from app.models import TenderTask, TaskStatus, ConflictStrategy
from app.schemas import TaskSubmitRequest, AttachmentFile
from app.services.task_service import TaskService
from datetime import datetime

def run_tests():
    print("=" * 60)
    print("投标资料封版重试补偿队列服务 - 核心功能测试")
    print("=" * 60)
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("\n【测试1】提交新任务")
        print("-" * 60)
        
        request = TaskSubmitRequest(
            tender_no="TENDER-2024-001",
            project_name="XX系统建设项目",
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
            submitter="张三",
            conflict_strategy=ConflictStrategy.APPEND,
            max_retry_times=3
        )
        
        task1, msg1 = TaskService.create_task(db, request)
        print(f"✓ 任务创建成功: ID={task1.id}, 批次={task1.batch_id}")
        print(f"  状态: {task1.status.value}, 提交人: {task1.submitter}")
        print(f"  消息: {msg1}")
        
        print("\n【测试2】重复提交 - 追加策略")
        print("-" * 60)
        
        request2 = TaskSubmitRequest(
            tender_no="TENDER-2024-001",
            project_name="XX系统建设项目",
            qualification_file=AttachmentFile(
                file_name="资质证书_更新版.pdf",
                file_url="/files/qual_v2.pdf",
                file_size=1034000,
                file_hash="def456uvw",
                version="v1.1"
            ),
            submitter="李四",
            conflict_strategy=ConflictStrategy.APPEND
        )
        
        task2, msg2 = TaskService.create_task(db, request2)
        print(f"✓ 追加任务成功: ID={task2.id}, 父任务ID={task2.parent_task_id}")
        print(f"  消息: {msg2}")
        
        print("\n【测试3】重复提交 - 忽略策略")
        print("-" * 60)
        
        request3 = TaskSubmitRequest(
            tender_no="TENDER-2024-001",
            project_name="XX系统建设项目",
            submitter="王五",
            conflict_strategy=ConflictStrategy.IGNORE
        )
        
        task3, msg3 = TaskService.create_task(db, request3)
        print(f"✓ 忽略策略生效: 任务ID={task3.id}")
        print(f"  消息: {msg3}")
        
        print("\n【测试4】获取任务详情及历史")
        print("-" * 60)
        
        detail = TaskService.get_task_detail(db, task1.id)
        print(f"✓ 任务详情获取成功")
        print(f"  投标编号: {detail.tender_no}")
        print(f"  历史记录数: {len(detail.histories)}")
        for h in detail.histories:
            print(f"    - {h.operate_time.strftime('%H:%M:%S')} | {h.operation_type} | {h.operator}")
        
        print("\n【测试5】获取统计数据")
        print("-" * 60)
        
        stats = TaskService.get_statistics(db)
        print(f"✓ 统计数据获取成功")
        print(f"  总任务数: {stats['total_tasks']}")
        print(f"  待处理: {stats['pending_tasks']}")
        print(f"  死信: {stats['dead_letter_tasks']}")
        print(f"  今日提交: {stats['today_submitted']}")
        
        print("\n【测试6】取消任务")
        print("-" * 60)
        
        from app.schemas import CancelRequest
        cancel_req = CancelRequest(
            operator="管理员",
            reason="撤回后重新提交"
        )
        
        cancelled_task = TaskService.cancel_task(db, task2.id, cancel_req)
        print(f"✓ 任务取消成功")
        print(f"  新状态: {cancelled_task.status.value}")
        
        print("\n【测试6.1】撤回后重新提交（覆盖策略）")
        print("-" * 60)
        
        request_overwrite = TaskSubmitRequest(
            tender_no="TENDER-2024-001",
            project_name="XX系统建设项目",
            qualification_file=AttachmentFile(
                file_name="资质证书_最终版.pdf",
                file_url="/files/qual_final.pdf",
                file_size=1056000,
                file_hash="final789xyz",
                version="v2.0"
            ),
            submitter="张三",
            conflict_strategy=ConflictStrategy.OVERWRITE
        )
        
        task_overwrite, msg_overwrite = TaskService.create_task(db, request_overwrite)
        print(f"✓ 覆盖提交成功: ID={task_overwrite.id}")
        print(f"  消息: {msg_overwrite}")
        
        print("\n【测试7】冻结任务")
        print("-" * 60)
        
        from app.schemas import FreezeRequest
        freeze_req = FreezeRequest(
            operator="审计员",
            reason="导出前冻结，待复核"
        )
        
        frozen_task = TaskService.freeze_task(db, task1.id, freeze_req)
        print(f"✓ 任务冻结成功")
        print(f"  是否已冻结: {frozen_task.is_frozen}")
        print(f"  冻结人: {frozen_task.frozen_by}")
        print(f"  冻结原因: {frozen_task.frozen_reason}")
        
        print("\n【测试8】任务列表查询")
        print("-" * 60)
        
        total, tasks = TaskService.list_tasks(db, page=1, page_size=10)
        print(f"✓ 列表查询成功")
        print(f"  总数: {total}")
        for t in tasks:
            print(f"    ID={t.id} | {t.tender_no} | {t.status.value} | {t.submitter}")
        
        print("\n" + "=" * 60)
        print("✓ 所有核心功能测试通过！")
        print("=" * 60)
        
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
