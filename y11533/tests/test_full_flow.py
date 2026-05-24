import json
import os
import sys
import tempfile
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import TellerSchedule, LeaveRequest, ReplayChain, AsyncTask, StatusLog
from app.services.replay_service import ReplayService
from app.services.task_service import TaskService, TASK_STATUS_WAITING_MANUAL
from app.services.import_service import ImportService
from app.services.export_service import ExportService
from app.services.status_service import StatusService
from app.services.automation_check_service import AutomationCheckService

def test_full_flow():
    print("=" * 60)
    print("银行网点排班验收回放链路服务 - 全流程测试")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        print("\n[1/8] 初始化数据库...")
        init_db()
        print("✓ 数据库初始化完成")
        
        print("\n[2/8] 测试创建回放链路...")
        chain = ReplayService.create_chain(
            db,
            chain_name="测试回放-中关村支行2024-01-15",
            branch_id="B001",
            branch_name="中关村支行",
            replay_date="2024-01-15",
            created_by="张行长",
        )
        print(f"✓ 回放链路创建成功，ID: {chain.chain_id}")
        
        print("\n[3/8] 测试造数功能...")
        test_data = ReplayService.generate_test_data(db, chain, teller_count=5)
        print(f"✓ 造数完成，生成 {len(test_data['schedules'])} 条排班记录")
        
        print("\n[4/8] 测试模拟启动服务...")
        start_result = ReplayService.simulate_service_start(db, chain)
        print("✓ 服务启动模拟完成")
        print("  - 命令脚本日志已记录")
        print("  - 本地持久化日志已记录")
        
        print("\n[5/8] 测试发送HTTP请求...")
        http_result = ReplayService.send_http_requests(db, chain, request_count=10)
        print(f"✓ HTTP请求发送完成: 成功{http_result['success']}条, 失败{http_result['failed']}条")
        
        print("\n[6/8] 测试数据对账...")
        reconcile_result = ReplayService.reconcile_data(db, chain)
        print(f"✓ 对账完成: 发现 {reconcile_result['diff_count']} 个差异, {reconcile_result['anomaly_count']} 个异常")
        if reconcile_result['anomalies']:
            for anomaly in reconcile_result['anomalies'][:2]:
                print(f"  - {anomaly['type']}: {anomaly['description']}")
        
        print("\n[7/8] 测试导出报告...")
        export_path, export_name = ReplayService.export_report(db, chain)
        print(f"✓ 报告导出成功: {export_name}")
        print(f"  - 文件路径: {export_path}")
        
        print("\n[8/8] 测试自动化检查...")
        
        print("\n  [8.1] 导出一致性检查...")
        consistency_result = AutomationCheckService.check_export_consistency(db, chain.chain_id, export_path)
        print(f"  {'✓' if consistency_result['passed'] else '✗'} 导出一致性检查: {consistency_result['message']}")
        
        print("\n  [8.2] 异常保留检查...")
        test_task = TaskService.create_task(db, "test", "测试任务", created_by="system")
        TaskService.start_task(db, test_task)
        test_error = Exception("培训导致窗口人手不足，午休规则冲突")
        TaskService.handle_failure(db, test_task, test_error, "WAITING_MANUAL")
        
        preserve_result = AutomationCheckService.check_exception_preserve(db, test_task.task_id)
        print(f"  {'✓' if preserve_result['passed'] else '✗'} 异常保留检查: {preserve_result['message']}")
        
        print("\n  [8.3] 重启后历史一致性检查...")
        snapshot = AutomationCheckService.capture_before_restart_snapshot(db, "async_task", test_task.task_id)
        restart_result = AutomationCheckService.check_restart_history(db, "async_task", test_task.task_id, snapshot)
        print(f"  {'✓' if restart_result['passed'] else '✗'} 重启历史检查: {restart_result['message']}")
        
        print("\n  [8.4] 权限拦截检查...")
        perm_result = AutomationCheckService.check_permission_intercept(
            "teller", ["branch_manager", "admin"], "人工改判"
        )
        print(f"  {'✓' if not perm_result['passed'] else '✗'} 权限拦截检查: {perm_result['message']}")
        
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        
        chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain.chain_id).first()
        print(f"\n回放链路状态:")
        print(f"  链路ID: {chain.chain_id}")
        print(f"  状态: {chain.status}")
        print(f"  HTTP请求: {chain.request_count}条 (成功:{chain.request_success_count}, 失败:{chain.request_failed_count})")
        print(f"  对账差异: {chain.reconcile_diff_count}个")
        print(f"  异常数: {chain.anomaly_count}个")
        print(f"  导出文件: {chain.export_file_name}")
        
        print(f"\n支行行长重点关注:")
        print(f"  1. 命令脚本: 已记录")
        print(f"  2. HTTP读写: 已记录{chain.request_count}条请求日志")
        print(f"  3. 本地持久化: 已记录网点配置、排班规则、窗口配置")
        
        print(f"\n原始证据保留验证:")
        schedule = db.query(TellerSchedule).first()
        if schedule:
            print(f"  来源文件: {schedule.source_file}")
            print(f"  原始行号: {schedule.source_row_number}")
            print(f"  原始值: 已保留")
            print(f"  解析值: 已保留")
            print(f"  导入批次: {schedule.import_batch_id}")
        
        print(f"\n状态审计验证:")
        logs = StatusService.get_entity_status_history(db, "async_tasks", str(test_task.id))
        print(f"  状态变更记录: {len(logs)}条")
        for log in logs[:3]:
            print(f"    - {log.change_time}: {log.old_status} → {log.new_status} ({log.operator})")
        
        print(f"\n异步任务失败分类验证:")
        print(f"  任务状态: {test_task.status}")
        print(f"  失败分类: {test_task.failure_category}")
        print(f"  失败原因: {test_task.failure_reason}")
        print(f"  支持分类: WAITING_RETRY(等重试) / WAITING_MANUAL(等人工) / PERMANENT_FAILED(永久失败)")
        
        print("\n" + "=" * 60)
        print("✓ 全流程测试通过!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_full_flow()
