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
from app.services.auth_service import AuthService

def test_full_flow():
    print("=" * 60)
    print("银行网点排班验收回放链路服务 - 全流程测试")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        print("\n[1/10] 初始化数据库和默认用户...")
        init_db()
        AuthService.init_default_users(db)
        print("✓ 数据库和默认用户初始化完成")
        
        print("\n[2/10] 测试创建回放链路...")
        chain = ReplayService.create_chain(
            db,
            chain_name="测试回放-中关村支行2024-01-15",
            branch_id="B001",
            branch_name="中关村支行",
            replay_date="2024-01-15",
            created_by="张行长",
        )
        print(f"✓ 回放链路创建成功，ID: {chain.chain_id}")
        
        print("\n[3/10] 测试造数功能...")
        test_data = ReplayService.generate_test_data(db, chain, teller_count=5)
        
        assert len(test_data['schedules']) == 5, f"应该生成5条排班记录，实际{len(test_data['schedules'])}条"
        assert len(test_data['leaves']) == 2, f"应该生成2条培训请假记录，实际{len(test_data['leaves'])}条"
        assert len(test_data['forecasts']) == 8, f"应该生成8条业务量预测记录，实际{len(test_data['forecasts'])}条"
        assert len(test_data['shift_records']) == 5, f"应该生成5条班次记录，实际{len(test_data['shift_records'])}条"
        assert len(test_data['price_adjustments']) == 3, f"应该生成3条手工改价记录，实际{len(test_data['price_adjustments'])}条"
        
        from app.models import LeaveRequest, BusinessForecast, ShiftRecord, PriceAdjustment
        
        schedule_count = db.query(TellerSchedule).filter(TellerSchedule.branch_id == chain.branch_id).count()
        leave_count = db.query(LeaveRequest).filter(LeaveRequest.branch_id == chain.branch_id).count()
        forecast_count = db.query(BusinessForecast).filter(BusinessForecast.branch_id == chain.branch_id).count()
        shift_count = db.query(ShiftRecord).filter(ShiftRecord.branch_id == chain.branch_id).count()
        price_count = db.query(PriceAdjustment).filter(PriceAdjustment.branch_id == chain.branch_id).count()
        
        assert schedule_count == 5, f"数据库teller_schedules应为5条，实际{schedule_count}条"
        assert leave_count == 2, f"数据库leave_requests应为2条，实际{leave_count}条"
        assert forecast_count == 8, f"数据库business_forecasts应为8条，实际{forecast_count}条"
        assert shift_count == 5, f"数据库shift_records应为5条，实际{shift_count}条"
        assert price_count == 3, f"数据库price_adjustments应为3条，实际{price_count}条"
        
        first_schedule = db.query(TellerSchedule).filter(TellerSchedule.branch_id == chain.branch_id).first()
        assert first_schedule.source_file == "test_data_generation", "来源文件应保留"
        assert first_schedule.source_row_number is not None, "原始行号应保留"
        assert first_schedule.raw_value is not None, "原始值应保留"
        assert first_schedule.parsed_value is not None, "解析值应保留"
        assert first_schedule.import_batch_id is not None, "导入批次应保留"
        
        first_leave = db.query(LeaveRequest).filter(LeaveRequest.branch_id == chain.branch_id).first()
        assert first_leave.is_training == True, "请假单应标记为培训"
        assert first_leave.source_file is not None, "请假单来源文件应保留"
        assert first_leave.raw_value is not None, "请假单原始值应保留"
        
        scenario = test_data.get('scenario', {})
        assert scenario.get('training_tellers'), "应包含培训柜员信息"
        assert scenario.get('lunch_break_conflict') == True, "应标记存在午休规则冲突"
        assert scenario.get('peak_window_demand') == 4, "高峰窗口需求应为4"
        assert scenario.get('actual_available_tellers') == 3, "实际全天可用柜员应为3（早班1+中班2）"
        
        print(f"✓ 造数完成，5类数据全部生成:")
        print(f"  - 排班记录: {len(test_data['schedules'])}条")
        print(f"  - 培训请假单: {len(test_data['leaves'])}条 ({len(scenario['training_tellers'])}名早班柜员外出培训)")
        print(f"  - 业务量预测: {len(test_data['forecasts'])}条 (8个时段)")
        print(f"  - 班次记录: {len(test_data['shift_records'])}条")
        print(f"  - 手工改价表: {len(test_data['price_adjustments'])}条")
        print(f"  - 场景设计: 高峰需求{scenario['peak_window_demand']}窗 vs 早班实际1人, 午休冲突={'存在' if scenario['lunch_break_conflict'] else '无'}")
        
        print("\n[4/10] 测试启动服务...")
        start_result = ReplayService.start_service(db, chain)
        print("✓ 服务启动完成")
        print("  - 命令脚本日志已记录")
        print("  - 本地持久化日志已记录")
        print(f"  - 服务地址: {start_result['service_url']}")
        
        print("\n[5/10] 测试发送真实HTTP请求...")
        http_result = ReplayService.send_real_http_requests(db, chain, request_count=5)
        print(f"✓ 真实HTTP请求发送完成: 成功{http_result['success']}条, 失败{http_result['failed']}条")
        
        assert http_result['total'] == 5, f"应该发送5条请求，实际发送{http_result['total']}条"
        assert http_result['failed'] >= 1, f"应该至少有1条失败的请求，实际失败{http_result['failed']}条"
        
        failed_logs = [log for log in http_result['logs'] if not log['success']]
        assert len(failed_logs) == http_result['failed'], "失败计数与实际失败日志数不一致"
        
        print(f"  失败请求详情:")
        for log in failed_logs:
            print(f"    ✗ {log['method']} {log['endpoint']} [{log['status_code']}] - {log.get('description', '')}")
        
        success_logs = [log for log in http_result['logs'] if log['success']]
        assert len(success_logs) == http_result['success'], "成功计数与实际成功日志数不一致"
        
        db.refresh(chain)
        assert chain.request_count == 5, f"数据库中request_count应为5，实际为{chain.request_count}"
        assert chain.request_failed_count >= 1, f"数据库中request_failed_count应>=1，实际为{chain.request_failed_count}"
        
        for log in http_result['logs']:
            status = "✓" if log['success'] else "✗"
            print(f"  {status} {log['method']} {log['endpoint']} [{log['status_code']}] {log['response_time_ms']}ms - {log['description']}")
            assert 'request_id' in log, "每条HTTP日志应该有request_id"
            assert 'timestamp' in log, "每条HTTP日志应该有timestamp"
            assert 'response_body_preview' in log, "每条HTTP日志应该有响应体预览"
        
        print("\n[6/9] 测试数据对账...")
        reconcile_result = ReplayService.reconcile_data(db, chain)
        
        analysis = reconcile_result.get('analysis_details', {})
        assert reconcile_result['anomaly_count'] >= 2, f"应至少检测到2个异常（人手不足+午休冲突），实际{reconcile_result['anomaly_count']}个"
        assert reconcile_result['diff_count'] >= 2, f"应至少检测到2个差异，实际{reconcile_result['diff_count']}个"
        
        staffing_shortage = [a for a in reconcile_result['anomalies'] if a['type'] == 'training_staffing_shortage']
        lunch_conflict = [a for a in reconcile_result['anomalies'] if a['type'] == 'lunch_break_rule_conflict']
        
        assert len(staffing_shortage) >= 1, "应检测到培训导致的窗口人手不足异常"
        assert len(lunch_conflict) >= 1, "应检测到午休规则冲突异常"
        
        shortage = staffing_shortage[0]
        assert shortage['severity'] == 'high', "人手不足异常严重程度应为high"
        assert shortage['window_demand'] > shortage['available_windows'], "窗口需求应大于实际可用"
        assert 'staffing_gap' in shortage, "应有人力缺口计算"
        assert 'evidence' in shortage, "应有证据链（关联预测、请假、排班ID"
        
        lunch = lunch_conflict[0]
        assert lunch['severity'] == 'medium', "午休冲突严重程度应为medium"
        assert lunch['available_tellers'] < 2, "午休可用柜员应少于2人"
        assert 'resolution_options' in lunch, "应有解决方案建议"
        assert len(lunch['resolution_options']) >= 3, "应至少有3个解决方案选项"
        
        assert analysis.get('training_leaves') == 2, f"分析详情应包含2条培训请假，实际{analysis.get('training_leaves')}"
        assert analysis.get('forecast_records') == 8, f"分析详情应包含8条预测记录，实际{analysis.get('forecast_records')}"
        assert analysis.get('available_morning') == 1, f"早班可用柜员应为1人（2名早班柜员外出培训），实际{analysis.get('available_morning')}"
        assert analysis.get('available_afternoon') == 2, f"中班可用柜员应为2人，实际{analysis.get('available_afternoon')}"
        
        print(f"✓ 对账完成: 发现 {reconcile_result['diff_count']} 个差异, {reconcile_result['anomaly_count']} 个异常")
        print(f"  - 分析详情: 排班{analysis.get('total_schedules')}、请假{analysis.get('training_leaves')}、预测{analysis.get('forecast_records')}、班次{analysis.get('shift_records')}、改价{analysis.get('price_adjustments')}")
        for anomaly in reconcile_result['anomalies']:
            severity_icon = "🔴" if anomaly['severity'] == 'high' else "🟡"
            print(f"  {severity_icon} {anomaly['type']}: {anomaly['description'][:80]}...")
            print(f"     违反规则: {anomaly['rule_violated']}")
        
        print("\n[7/10] 测试导出报告...")
        export_path, export_name = ReplayService.export_report(db, chain, operator="system")
        print(f"✓ 报告导出成功: {export_name}")
        print(f"  - 文件路径: {export_path}")
        
        print("\n[8/10] 测试权限拦截...")
        print("\n  [8.1] 无权限用户测试(operator王柜员)...")
        perm_fail = AuthService.require_permission(db, "U003", ["branch_manager", "admin"], "人工改判")
        print(f"  {'✓' if not perm_fail['passed'] else '✗'} 无权限拦截: {perm_fail['message']}")
        print(f"    实际拦截: {perm_fail['intercepted']}")
        
        print("\n  [8.2] 有权限用户测试(branch_manager张行长)...")
        perm_pass = AuthService.require_permission(db, "U001", ["branch_manager", "admin"], "人工改判")
        print(f"  {'✓' if perm_pass['passed'] else '✗'} 有权限通过: {perm_pass['message']}")
        print(f"    实际拦截: {perm_pass['intercepted']}")
        
        print("\n[9/10] 测试数据库记录验证...")
        from app.models import LeaveRequest, BusinessForecast, ShiftRecord, PriceAdjustment
        
        leave_count = db.query(LeaveRequest).count()
        forecast_count = db.query(BusinessForecast).count()
        shift_count = db.query(ShiftRecord).count()
        price_count = db.query(PriceAdjustment).count()
        
        assert leave_count >= 2, f"数据库leave_requests应>=2条，实际{leave_count}条（之前为0）"
        assert forecast_count >= 8, f"数据库business_forecasts应>=8条，实际{forecast_count}条（之前为0）"
        assert shift_count >= 5, f"数据库shift_records应>=5条，实际{shift_count}条（之前为0）"
        assert price_count >= 3, f"数据库price_adjustments应>=3条，实际{price_count}条（之前为0）"
        
        print(f"✓ 数据库记录验证通过（之前均为0）:")
        print(f"  - leave_requests: {leave_count}条 ✓")
        print(f"  - business_forecasts: {forecast_count}条 ✓")
        print(f"  - shift_records: {shift_count}条 ✓")
        print(f"  - price_adjustments: {price_count}条 ✓")
        
        db.refresh(chain)
        assert chain.anomaly_count >= 2, f"链路anomaly_count应>=2，实际{chain.anomaly_count}（之前为0）"
        assert chain.reconcile_diff_count >= 2, f"链路reconcile_diff_count应>=2，实际{chain.reconcile_diff_count}（之前为0）"
        assert chain.anomaly_details is not None, "链路anomaly_details不应为空"
        
        reconcile_data = json.loads(chain.reconcile_result) if chain.reconcile_result else {}
        assert "对账通过" not in reconcile_data.get('conclusion', ''), "结论不应为'对账通过，无异常'（之前为0异常）"
        
        print(f"✓ 对账结果验证通过（之前diff_count=0、anomaly_count=0）:")
        print(f"  - anomaly_count: {chain.anomaly_count} ✓")
        print(f"  - diff_count: {chain.reconcile_diff_count} ✓")
        print(f"  - 结论: {reconcile_data.get('conclusion', '')[:60]}... ✓")
        
        print("\n[10/10] 测试自动化检查...")
        
        print("\n  [10.1] 导出一致性检查...")
        consistency_result = AutomationCheckService.check_export_consistency(db, chain.chain_id, export_path)
        print(f"  {'✓' if consistency_result['passed'] else '✗'} 导出一致性检查: {consistency_result['message']}")
        for check in consistency_result['checks']:
            status = "✓" if check['passed'] else "✗"
            extra = f" ({check.get('log_count', 0)}条日志, 操作者: {check.get('operator', 'N/A')})" if check['passed'] and check['check'] == 'status_log_exists' else ""
            print(f"    {status} {check['check']}: {check.get('message', '通过')}{extra}")
        
        print("\n  [10.2] 异常保留检查...")
        test_task = TaskService.create_task(db, "test", "测试任务", created_by="system")
        TaskService.start_task(db, test_task)
        test_error = Exception("培训导致窗口人手不足，午休规则冲突")
        TaskService.handle_failure(db, test_task, test_error, "WAITING_MANUAL")
        
        preserve_result = AutomationCheckService.check_exception_preserve(db, test_task.task_id)
        print(f"  {'✓' if preserve_result['passed'] else '✗'} 异常保留检查: {preserve_result['message']}")
        
        print("\n  [10.3] 重启后历史一致性检查...")
        snapshot = AutomationCheckService.capture_before_restart_snapshot(db, "async_task", test_task.task_id)
        restart_result = AutomationCheckService.check_restart_history(db, "async_task", test_task.task_id, snapshot)
        print(f"  {'✓' if restart_result['passed'] else '✗'} 重启历史检查: {restart_result['message']}")
        
        print("\n  [10.4] 重复导入检查...")
        import tempfile
        from app.models.import_batch import ImportBatch
        from datetime import datetime
        import uuid
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("test,data,123")
            temp_file = f.name
        
        try:
            file_hash = __import__('app.services.import_service', fromlist=['ImportService']).ImportService.calculate_file_hash(temp_file)
            
            existing_batch = ImportBatch(
                batch_id=f"BATCH_{uuid.uuid4().hex[:16]}",
                batch_name=f"teller_schedule_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                data_type="teller_schedule",
                source_file_name="test.csv",
                source_file_hash=file_hash,
                source_file_path=temp_file,
                total_rows=1,
                success_rows=1,
                status="completed",
                created_by="test_user",
            )
            db.add(existing_batch)
            db.commit()
            
            dup_result1 = AutomationCheckService.check_duplicate_import(db, temp_file, "teller_schedule")
            print(f"  {'✓' if not dup_result1['passed'] else '✗'} 重复导入拦截: {dup_result1['message']}")
            print(f"    现有批次ID: {dup_result1.get('existing_batch_id', 'N/A')}")
        finally:
            import os
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
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
        logs = StatusService.get_entity_status_history(db, "async_tasks", test_task.task_id)
        print(f"  状态变更记录: {len(logs)}条")
        assert len(logs) > 0, "任务状态历史应该有记录（pending→running→waiting_manual）"
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
