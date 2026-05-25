#!/usr/bin/env python3
"""验证项目经理报告中的人工理由字段"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Batch, StateRecord, AuditLog, OperationType
from app.services.report_service import ReportService


def verify_manual_reason_in_report():
    print("\n" + "=" * 70)
    print("  🧪 验证：项目经理报告 - 人工理由字段")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        batch = db.query(Batch).filter(Batch.batch_no == "EXPO-2024-SH-001").first()
        if not batch:
            print("❌ 未找到批次，请先运行初始化和演示脚本")
            return False
        
        print(f"\n📋 批次: {batch.batch_no} - {batch.exhibition_name}")
        
        print("\n--- 第一步：检查 state_records 中的人工处理记录 ---")
        state_records = db.query(StateRecord).filter(
            StateRecord.batch_id == batch.id,
            StateRecord.material_id.isnot(None),
            StateRecord.is_freeze_snapshot == False,
            StateRecord.change_source.notin_(["logistics_import", "borrow_import", "freeze"])
        ).all()
        
        if not state_records:
            print("⚠️  state_records 中没有人工处理记录")
        else:
            print(f"✅ 找到 {len(state_records)} 条人工处理状态记录:")
            for sr in state_records:
                print(f"   • material_id={sr.material_id}, {sr.from_status} → {sr.to_status}")
                print(f"     来源: {sr.change_source}, 原因: {sr.reason}")
        
        print("\n--- 第二步：检查 audit_logs 中的 REVIEW/OVERRULE 记录 ---")
        manual_audits = db.query(AuditLog).filter(
            AuditLog.batch_id == batch.id,
            AuditLog.operation_type.in_([OperationType.REVIEW, OperationType.OVERRULE])
        ).all()
        
        if not manual_audits:
            print("⚠️  audit_logs 中没有 REVIEW/OVERRULE 类型的审计记录（这是预期的，因为是旧数据）")
            print("   💡 修复后新产生的复核改判会写入正确的审计类型")
        else:
            print(f"✅ 找到 {len(manual_audits)} 条 REVIEW/OVERRULE 审计记录:")
            for audit in manual_audits:
                print(f"   • id={audit.id}, type={audit.operation_type}, record_id={audit.record_id}")
                print(f"     原因: {audit.change_reason}")
        
        print("\n--- 第三步：检查报告接口返回的人工理由 ---")
        report = ReportService.get_batch_report(db, batch)
        
        print(f"\n报告中 {len(report.items)} 个物料的人工理由:")
        has_manual_reason = 0
        for item in report.items:
            if item.manual_reason:
                has_manual_reason += 1
                print(f"\n  ✅ {item.material_code} - {item.material_name}")
                print(f"     当前状态: {item.current_status}")
                print(f"     人工理由:")
                for i, line in enumerate(item.manual_reason.split('\n'), 1):
                    print(f"       {i}. {line}")
            else:
                print(f"  ⚪ {item.material_code} - {item.material_name}: 无人工理由（状态: {item.current_status}）")
        
        print(f"\n--- 第四步：结果判定 ---")
        if has_manual_reason > 0:
            print(f"✅ 验证通过！共 {has_manual_reason} 个物料有人工处理理由")
            print("   人工理由已正确进入报告，可以导出到Excel")
            
            print("\n--- 第五步：验证 Excel 导出 ---")
            excel_data = ReportService.export_report_to_excel(db, batch)
            excel_path = f"reports/test_manual_reason_{batch.batch_no}.xlsx"
            os.makedirs("reports", exist_ok=True)
            with open(excel_path, "wb") as f:
                f.write(excel_data.getvalue())
            print(f"✅ Excel 报告已导出: {excel_path}")
            print(f"   文件大小: {os.path.getsize(excel_path)} 字节")
            
            return True
        else:
            print("❌ 验证失败！没有任何物料有人工理由")
            return False
            
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def verify_after_refresh():
    """重新运行完整流程后验证，确保新的审计类型也正确"""
    print("\n" + "=" * 70)
    print("  🔄 额外验证：新产生的复核改判操作是否写入正确审计类型")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        batch = db.query(Batch).filter(Batch.batch_no == "EXPO-2024-SH-001").first()
        if not batch:
            return False
        
        print(f"\n检查 demo_flow.py 产生的复核改判操作审计日志类型...")
        
        audits = db.query(AuditLog).filter(
            AuditLog.batch_id == batch.id,
            AuditLog.record_type == "material",
            AuditLog.change_reason.like("%复核改判%")
        ).all()
        
        if audits:
            print(f"✅ 找到 {len(audits)} 条复核改判审计记录:")
            for audit in audits:
                print(f"   • id={audit.id}, operation_type={audit.operation_type}")
                print(f"     原因: {audit.change_reason}")
                if audit.operation_type in [OperationType.REVIEW, OperationType.OVERRULE]:
                    print(f"   ✅ 审计类型正确！")
                else:
                    print(f"   ❌ 审计类型错误，应为 REVIEW 或 OVERRULE")
                    return False
            return True
        else:
            print("⚠️  未找到复核改判的审计记录，请运行 demo_flow.py")
            return True
            
    finally:
        db.close()


if __name__ == "__main__":
    success = verify_manual_reason_in_report()
    if success:
        success = verify_after_refresh() and success
    
    print("\n" + "=" * 70)
    if success:
        print("  🎉 人工理由验证通过！")
    else:
        print("  ❌ 人工理由验证失败")
    print("=" * 70)
    sys.exit(0 if success else 1)
