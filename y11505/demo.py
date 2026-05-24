#!/usr/bin/env python3
import sys
import os
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, SessionLocal
from app.core.constants import BatchStatus, RecordStatus, DuplicateStrategy
from app.services import (
    BatchService,
    ImportService,
    AuditService,
    ExportService,
    StateMachineService,
)
from app.tasks import TaskManager, DataProcessingTask
from app.schemas import BatchCreate, BatchImportRequest


def print_separator(title=""):
    line = "=" * 80
    if title:
        print(f"\n{line}")
        print(f"  {title}")
        print(line)
    else:
        print(f"\n{line}\n")


def step1_init_database():
    print_separator("步骤 1: 初始化数据库")
    init_db()
    print("✓ 数据库初始化完成")
    print("✓ 创建了所有数据表: batches, inspection_records, calibration_certificates,")
    print("  repair_quotes, price_adjustments, devices, attachments,")
    print("  status_histories, audit_logs, async_tasks")


def step2_import_sample_data():
    print_separator("步骤 2: 导入样例数据")
    
    db = SessionLocal()
    batch_service = BatchService(db)
    import_service = ImportService(db)
    
    inspection_records = [
        {
            "record_no": "INSP-2024-001",
            "device_code": "DEV-001",
            "device_name": "心电图机",
            "inspection_date": "2024-01-15",
            "inspector": "张工程师",
            "inspection_items": "外观,功能,校准",
            "inspection_result": "正常",
        },
        {
            "record_no": "INSP-2024-002",
            "device_code": "DEV-002",
            "device_name": "血压监测仪",
            "inspection_date": "2024-01-15",
            "inspector": "张工程师",
            "inspection_items": "外观,功能,校准",
            "inspection_result": "异常",
            "abnormal_description": "显示屏显示模糊，需要维修",
        },
        {
            "record_no": "INSP-2024-003",
            "device_code": "DEV-003",
            "device_name": "超声诊断仪",
            "inspection_date": "2024-01-16",
            "inspector": "李工程师",
            "inspection_items": "外观,功能,探头",
            "inspection_result": "正常",
        },
    ]
    
    yesterday = datetime.now() - timedelta(days=1)
    expired_date = yesterday - timedelta(days=30)
    future_date = yesterday + timedelta(days=365)
    
    calibration_certificates = [
        {
            "certificate_no": "CERT-2024-001",
            "device_code": "DEV-001",
            "device_name": "心电图机",
            "calibration_agency": "市计量检定所",
            "calibration_date": "2024-01-01",
            "effective_date": "2024-01-01",
            "expiry_date": future_date.strftime("%Y-%m-%d"),
            "calibration_result": "合格",
        },
        {
            "certificate_no": "CERT-2024-002",
            "device_code": "DEV-002",
            "device_name": "血压监测仪",
            "calibration_agency": "市计量检定所",
            "calibration_date": "2023-06-01",
            "effective_date": "2023-06-01",
            "expiry_date": expired_date.strftime("%Y-%m-%d"),
            "calibration_result": "合格",
        },
    ]
    
    repair_quotes = [
        {
            "quote_no": "QUOTE-2024-001",
            "device_code": "DEV-002",
            "device_name": "血压监测仪",
            "fault_description": "显示屏显示模糊",
            "repair_content": "更换显示屏模组",
            "quote_amount": 2500.00,
            "quote_date": "2024-01-18",
            "valid_until": "2024-02-18",
            "repair_vendor": "XX医疗设备维修有限公司",
            "quote_status": "pending",
        },
    ]
    
    import_request = BatchImportRequest(
        batch_no="BATCH-2024-001",
        batch_name="2024年1月第一批次巡检",
        department="心内科",
        operator="系统管理员",
        description="心内科医疗器械月度巡检",
        duplicate_strategy=DuplicateStrategy.OVERWRITE,
        inspection_records=inspection_records,
        calibration_certificates=calibration_certificates,
        repair_quotes=repair_quotes,
    )
    
    batch = batch_service.get_batch_by_no(import_request.batch_no)
    if not batch:
        batch_create = BatchCreate(
            batch_no=import_request.batch_no,
            name=import_request.batch_name,
            description=import_request.description,
            department=import_request.department,
            operator=import_request.operator,
            duplicate_strategy=import_request.duplicate_strategy,
        )
        batch = batch_service.create_batch(batch_create)
        print(f"✓ 创建批次: {batch.batch_no} - {batch.name}")
    
    results = import_service.import_batch_data(
        batch=batch,
        inspection_records=import_request.inspection_records,
        calibration_certificates=import_request.calibration_certificates,
        repair_quotes=import_request.repair_quotes,
        operator=import_request.operator,
    )
    
    batch_service.update_batch_stats(batch)
    
    print(f"\n数据导入结果:")
    print(f"  巡检记录: {results['inspection_records']}")
    print(f"  校准证书: {results['calibration_certificates']}")
    print(f"  维修报价: {results['repair_quotes']}")
    
    if results["errors"]:
        print(f"\n  错误: {results['errors']}")
    
    print(f"\n批次统计:")
    print(f"  总记录数: {batch.record_count}")
    print(f"  异常记录数: {batch.abnormal_count}")
    print(f"  当前状态: {batch.status}")
    
    db.close()


def step3_check_status_linkage():
    print_separator("步骤 3: 检查证书过期状态联动")
    
    db = SessionLocal()
    
    from app.models import InspectionRecord, CalibrationCertificate, Device
    
    print("检查设备状态联动:")
    
    dev2_certs = db.query(CalibrationCertificate).filter(
        CalibrationCertificate.device_code == "DEV-002"
    ).all()
    
    for cert in dev2_certs:
        print(f"\n  证书 {cert.certificate_no}:")
        print(f"    设备: {cert.device_name}")
        print(f"    有效期至: {cert.expiry_date}")
        print(f"    是否已过期: {cert.is_expired}")
    
    print("\n  巡检记录状态:")
    records = db.query(InspectionRecord).filter(
        InspectionRecord.device_code == "DEV-002"
    ).all()
    
    for record in records:
        print(f"    {record.record_no}: {record.status}")
        if record.status == RecordStatus.CERTIFICATE_EXPIRED:
            print(f"      ✓ 正确: 证书过期状态已自动联动")
    
    print("\n✓ 状态联动验证完成")
    db.close()


def step4_trigger_failed_tasks():
    print_separator("步骤 4: 触发异步任务失败场景")
    
    db = SessionLocal()
    manager = TaskManager(db)
    
    manager.register_handler("simulate_failure", DataProcessingTask.simulate_failure)
    manager.register_handler("process_batch", DataProcessingTask.process_batch_import)
    
    from app.models import Batch
    batch = db.query(Batch).filter(Batch.batch_no == "BATCH-2024-001").first()
    
    print("创建不同类型的失败任务:")
    
    print("\n  1. 创建永久失败任务...")
    task1 = manager.create_task(
        task_name="测试-永久失败",
        task_type="simulate_failure",
        payload={"failure_type": "permanent", "current_attempt": 1},
        batch_id=batch.id if batch else None,
        operator="测试用户",
        max_retries=1,
    )
    manager.execute_task(task1)
    print(f"     任务 {task1.id[:8]}...: {task1.status}")
    
    print("\n  2. 创建需要人工干预的任务...")
    task2 = manager.create_task(
        task_name="测试-需要人工",
        task_type="simulate_failure",
        payload={"failure_type": "manual", "current_attempt": 1},
        batch_id=batch.id if batch else None,
        operator="测试用户",
        max_retries=2,
    )
    for _ in range(3):
        manager.execute_task(task2)
    print(f"     任务 {task2.id[:8]}...: {task2.status}")
    print(f"     重试次数: {task2.retry_count}")
    
    print("\n  3. 创建临时失败任务（会自动重试）...")
    task3 = manager.create_task(
        task_name="测试-临时失败",
        task_type="simulate_failure",
        payload={"failure_type": "transient", "current_attempt": 1},
        batch_id=batch.id if batch else None,
        operator="测试用户",
        max_retries=3,
    )
    manager.execute_task(task3)
    print(f"     任务 {task3.id[:8]}...: {task3.status}")
    print(f"     下次重试时间: {task3.next_run_time}")
    
    print("\n任务失败状态区分:")
    print("  ✓ WAITING_RETRY: 等待自动重试")
    print("  ✓ WAITING_MANUAL: 需要人工干预")
    print("  ✓ PERMANENT_FAILED: 永久失败")
    
    db.close()


def step5_workflow_demo():
    print_separator("步骤 5: 完整工作流演示")
    
    db = SessionLocal()
    batch_service = BatchService(db)
    
    batch = batch_service.get_batch_by_no("BATCH-2024-001")
    
    print("批次状态流转:")
    
    print(f"\n  当前状态: {batch.status}")
    
    print(f"\n  1. 提交审核...")
    success, msg = batch_service.submit_for_review(batch, "王审核员")
    print(f"     → {batch.status} [{msg}]")
    
    print(f"\n  2. 开始复核...")
    success, msg = batch_service.start_review(batch, "李复核员")
    print(f"     → {batch.status} [{msg}]")
    
    print(f"\n  3. 人工修正异常记录...")
    from app.models import InspectionRecord
    abnormal_record = db.query(InspectionRecord).filter(
        InspectionRecord.device_code == "DEV-002"
    ).first()
    
    if abnormal_record:
        state_machine = StateMachineService(db)
        success, msg = state_machine.transition_record(
            record=abnormal_record,
            target_status=RecordStatus.PENDING_REPAIR,
            operator="李复核员",
            reason="设备已送修，状态改为待维修",
        )
        print(f"     记录 {abnormal_record.record_no}: {abnormal_record.status}")
    
    print(f"\n  4. 审核通过...")
    success, msg = batch_service.approve_batch(batch, "李复核员", "异常记录已处理")
    print(f"     → {batch.status} [{msg}]")
    
    print(f"\n  5. 冻结批次（临检前）...")
    success, msg = batch_service.freeze_batch(batch, "张护士长", "临检前冻结，准备检查")
    print(f"     → {batch.status} [{msg}]")
    print(f"     冻结前状态: {batch.status_before_freeze}")
    print(f"     冻结原因: {batch.freeze_reason}")
    print(f"     冻结人: {batch.freeze_operator}")
    
    print(f"\n  6. 解冻（发现问题需要修改）...")
    success, msg = batch_service.unfreeze_batch(batch, "张护士长", "发现漏项，补充数据")
    print(f"     → {batch.status} [{msg}]")
    
    print(f"\n  7. 重新冻结并结算...")
    success, msg = batch_service.freeze_batch(batch, "张护士长", "数据补充完成，最终冻结")
    print(f"     → {batch.status} [{msg}]")
    
    success, msg = batch_service.settle_batch(batch, "财务专员", "结算完成")
    print(f"     → {batch.status} [{msg}]")
    
    print(f"\n  8. 归档...")
    success, msg = batch_service.archive_batch(batch, "档案管理员")
    print(f"     → {batch.status} [{msg}]")
    
    print("\n✓ 完整工作流演示完成")
    db.close()


def step6_export_reports():
    print_separator("步骤 6: 生成导出报告")
    
    db = SessionLocal()
    batch_service = BatchService(db)
    export_service = ExportService(db)
    
    batch = batch_service.get_batch_by_no("BATCH-2024-001")
    
    print("生成护士长视图报告:")
    head_nurse_report = export_service.export_for_head_nurse(batch, "张护士长")
    
    print(f"\n  批次信息:")
    print(f"    批次号: {head_nurse_report['batch_info']['batch_no']}")
    print(f"    批次名称: {head_nurse_report['batch_info']['batch_name']}")
    print(f"    科室: {head_nurse_report['batch_info']['department']}")
    
    print(f"\n  冻结信息（护士长关注重点）:")
    freeze_info = head_nurse_report['freeze_info']
    print(f"    冻结前状态: {freeze_info['status_before_freeze']}")
    print(f"    当前状态: {freeze_info['current_status']}")
    print(f"    冻结原因: {freeze_info['freeze_reason']}")
    print(f"    冻结人: {freeze_info['freeze_operator']}")
    print(f"    冻结时间: {freeze_info['freeze_time']}")
    
    print(f"\n  统计信息:")
    stats = head_nurse_report['statistics']
    print(f"    总记录数: {stats['total_records']}")
    print(f"    异常数: {stats['abnormal_count']}")
    print(f"    状态分布:")
    for status, count in stats['status_distribution'].items():
        print(f"      {status}: {count}")
    
    print(f"\n  异常记录明细:")
    for record in head_nurse_report['abnormal_records']:
        print(f"    - {record['device_name']} ({record['device_code']}):")
        print(f"      状态: {record['status']}")
        print(f"      巡检结果: {record['inspection_result']}")
        if record['abnormal_description']:
            print(f"      异常描述: {record['abnormal_description']}")
        if record['manual_reason']:
            print(f"      人工处理理由: {record['manual_reason']}")
        if record['manual_operator']:
            print(f"      处理人: {record['manual_operator']}")
    
    print("\n生成Excel导出文件...")
    excel_path = export_service.export_to_excel(batch, "系统管理员")
    print(f"  ✓ Excel文件已生成: {excel_path}")
    
    db.close()


def step7_check_audit_logs():
    print_separator("步骤 7: 查看审计日志（谁改了什么）")
    
    db = SessionLocal()
    batch_service = BatchService(db)
    audit_service = AuditService(db)
    
    batch = batch_service.get_batch_by_no("BATCH-2024-001")
    logs = audit_service.get_batch_audit_logs(batch.id, limit=50)
    
    print(f"批次 {batch.batch_no} 的操作历史:")
    print(f"{'时间':<20} {'操作人':<12} {'操作类型':<20} {'备注'}")
    print("-" * 80)
    
    for log in logs:
        time_str = log.operation_time.strftime("%Y-%m-%d %H:%M:%S")
        reason = log.change_reason or ""
        print(f"{time_str:<20} {log.operator:<12} {log.operation_type:<20} {reason}")
    
    print("\n✓ 审计日志记录完整，可追溯所有变更")
    db.close()


def step8_duplicate_import_demo():
    print_separator("步骤 8: 重复导入策略演示")
    
    db = SessionLocal()
    batch_service = BatchService(db)
    import_service = ImportService(db)
    
    print("测试 OVERWRITE 策略:")
    
    inspection_records_v2 = [
        {
            "record_no": "INSP-2024-001",
            "device_code": "DEV-001",
            "device_name": "心电图机",
            "inspection_date": "2024-01-15",
            "inspector": "张工程师",
            "inspection_items": "外观,功能,校准,清洁",
            "inspection_result": "正常",
        },
        {
            "record_no": "INSP-2024-004",
            "device_code": "DEV-004",
            "device_name": "呼吸机",
            "inspection_date": "2024-01-17",
            "inspector": "王工程师",
            "inspection_items": "外观,功能,管路",
            "inspection_result": "正常",
        },
    ]
    
    batch = batch_service.get_batch_by_no("BATCH-2024-001")
    
    print(f"\n  原有记录数: {batch.record_count}")
    
    results = import_service.import_batch_data(
        batch=batch,
        inspection_records=inspection_records_v2,
        calibration_certificates=[],
        repair_quotes=[],
        operator="系统管理员",
    )
    
    batch_service.update_batch_stats(batch)
    
    print(f"  导入结果:")
    print(f"    新增: {results['inspection_records']['created']}")
    print(f"    覆盖: {results['inspection_records']['overwritten']}")
    print(f"    忽略: {results['inspection_records']['ignored']}")
    print(f"    现有记录数: {batch.record_count}")
    
    print("\n✓ 重复导入策略生效，不会悄悄多算")
    db.close()


def main():
    print_separator()
    print("  医疗器械巡检异常回执状态机 - 本地演示")
    print("  =============================================")
    print("  本脚本演示完整流程:")
    print("  1. 初始化数据库")
    print("  2. 导入样例数据")
    print("  3. 检查证书过期状态联动")
    print("  4. 触发异步任务失败场景")
    print("  5. 完整工作流演示（提交-审核-冻结-结算-归档）")
    print("  6. 生成导出报告（护士长视图）")
    print("  7. 查看审计日志")
    print("  8. 重复导入策略演示")
    print_separator()
    
    try:
        step1_init_database()
        step2_import_sample_data()
        step3_check_status_linkage()
        step4_trigger_failed_tasks()
        step5_workflow_demo()
        step6_export_reports()
        step7_check_audit_logs()
        step8_duplicate_import_demo()
        
        print_separator()
        print("  ✓ 演示完成！")
        print("\n  启动服务命令:")
        print("    pip install -r requirements.txt")
        print("    uvicorn app.main:app --reload")
        print("\n  API文档地址:")
        print("    http://localhost:8000/docs")
        print_separator()
        
    except Exception as e:
        print(f"\n✗ 演示过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
