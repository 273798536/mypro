#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    print("测试模块导入...")
    try:
        from app.config import DATABASE_URL
        from app.database import Base, engine, SessionLocal, init_db
        from app import models
        from app.services.work_order_service import WorkOrderService
        from app.services.dirty_record_service import DirtyRecordService
        from app.services.report_service import ReportService
        from app.services.export_service import ExportService
        print("  ✓ 所有模块导入成功")
        return True
    except Exception as e:
        print(f"  ✗ 导入失败: {e}")
        return False

def test_database():
    print("\n测试数据库初始化...")
    try:
        from app.database import init_db
        init_db()
        print("  ✓ 数据库初始化成功")
        return True
    except Exception as e:
        print(f"  ✗ 数据库初始化失败: {e}")
        return False

def test_work_order_service():
    print("\n测试工单服务...")
    try:
        from app.database import SessionLocal
        from app.services.work_order_service import WorkOrderService
        from app.models import SourceType
        
        db = SessionLocal()
        service = WorkOrderService(db)
        
        wo, clue, is_new = service.submit_clue(
            source_type=SourceType.INSPECTION,
            content={"location": "测试路1号", "photo_id": "TEST001", "lamp_count": 2},
            operator="test"
        )
        
        assert wo.id is not None
        assert clue.id is not None
        assert is_new == True
        
        print(f"  ✓ 工单创建成功: {wo.order_no}")
        print(f"  ✓ 线索创建成功: ID={clue.id}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 工单服务测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_clue_association():
    print("\n测试线索关联（同一路段合并到同一工单）...")
    try:
        from app.database import SessionLocal
        from app.services.work_order_service import WorkOrderService
        from app.models import SourceType
        
        db = SessionLocal()
        service = WorkOrderService(db)
        
        wo1, clue1, is_new1 = service.submit_clue(
            source_type=SourceType.HOTLINE,
            content={"location": "测试路2号", "phone": "13800138000", "report_time": "2024-05-20T10:00:00"},
            operator="test"
        )
        
        wo2, clue2, is_new2 = service.submit_clue(
            source_type=SourceType.SPARE_PART,
            content={"location": "测试路2号", "batch_no": "B001", "part_name": "灯泡"},
            operator="test"
        )
        
        assert wo1.id == wo2.id, "同一地点应该关联到同一工单"
        assert is_new1 == True
        assert is_new2 == False
        
        print(f"  ✓ 第一条线索创建新工单")
        print(f"  ✓ 第二条线索关联到同一工单 (ID={wo1.id})")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 线索关联测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_retry_flow():
    print("\n测试重试流程...")
    try:
        from app.database import SessionLocal
        from app.services.work_order_service import WorkOrderService
        from app.models import SourceType
        
        db = SessionLocal()
        service = WorkOrderService(db)
        
        wo, clue, _ = service.submit_clue(
            source_type=SourceType.INSPECTION,
            content={"location": "测试路3号", "photo_id": "TEST003"},
            operator="test"
        )
        
        success, msg = service.process_retry(wo.id, "test")
        print(f"  ✓ 重试执行: {msg}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 重试流程测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_report_service():
    print("\n测试报告服务...")
    try:
        from app.database import SessionLocal
        from app.services.report_service import ReportService
        
        db = SessionLocal()
        service = ReportService(db)
        
        report = service.get_full_report()
        assert "retry_category_summary" in report
        assert "dead_letter_summary" in report
        assert "recovery_summary" in report
        
        print("  ✓ 完整报告生成成功")
        print(f"    - 重试分类统计: {report['retry_category_summary']['total_retries']} 次")
        print(f"    - 死信统计: {report['dead_letter_summary']['total_dead_letters']} 条")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 报告服务测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_export_service():
    print("\n测试导出服务...")
    try:
        from app.database import SessionLocal
        from app.services.export_service import ExportService
        
        db = SessionLocal()
        service = ExportService(db)
        
        filepath = service.export_work_orders_json()
        assert os.path.exists(filepath)
        
        print(f"  ✓ JSON导出成功: {filepath}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 导出服务测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dirty_record_detection():
    print("\n测试脏记录自动检测...")
    try:
        from app.database import SessionLocal
        from app.services.work_order_service import WorkOrderService
        from app.services.dirty_record_service import DirtyRecordService
        from app.models import SourceType
        
        db = SessionLocal()
        service = WorkOrderService(db)
        dirty_service = DirtyRecordService(db)
        
        wo, clue, is_new = service.submit_clue(
            source_type=SourceType.HOTLINE,
            content={"location": "脏记录测试路1号"},
            operator="test"
        )
        
        db.refresh(clue)
        
        assert clue.is_dirty == True, "缺少必填字段应该被标记为脏记录"
        assert clue.dirty_type is not None, "脏记录类型应该被设置"
        assert clue.original_content is not None, "原始内容应该被保留"
        
        print(f"  ✓ 脏记录自动检测成功")
        print(f"    - 脏记录类型: {clue.dirty_type.value}")
        print(f"    - 原因: {clue.dirty_reason}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 脏记录检测测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dirty_record_correction():
    print("\n测试脏记录修正与重新汇总...")
    try:
        from app.database import SessionLocal
        from app.services.work_order_service import WorkOrderService
        from app.services.dirty_record_service import DirtyRecordService
        from app.models import SourceType
        
        db = SessionLocal()
        service = WorkOrderService(db)
        dirty_service = DirtyRecordService(db)
        
        wo, clue, is_new = service.submit_clue(
            source_type=SourceType.HOTLINE,
            content={"location": "修正测试路2号"},
            operator="test"
        )
        
        db.refresh(clue)
        assert clue.is_dirty == True
        
        corrected_content = {
            "location": "修正测试路2号",
            "phone": "13900139000",
            "report_time": "2024-05-20T14:00:00",
            "lamp_count": 3
        }
        
        success, msg, aggregation = dirty_service.correct_clue(
            clue.id, corrected_content, "补充缺失字段", "test"
        )
        
        assert success == True
        db.refresh(clue)
        assert clue.is_dirty == False
        assert clue.is_validated == True
        assert clue.original_content is not None
        
        print(f"  ✓ 脏记录修正成功")
        print(f"    - 原始内容已保留: {clue.original_content is not None}")
        print(f"    - 已验证: {clue.is_validated}")
        print(f"    - 重新汇总结果: 已验证线索={aggregation.get('validated_clues')}, 总灯数={aggregation.get('total_lamps')}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 脏记录修正测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("城市照明抢修重试补偿队列 - 基础功能测试")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_database,
        test_work_order_service,
        test_clue_association,
        test_retry_flow,
        test_dirty_record_detection,
        test_dirty_record_correction,
        test_report_service,
        test_export_service,
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("✓ 所有测试通过！")
        return 0
    else:
        print("✗ 部分测试失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
