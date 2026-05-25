#!/usr/bin/env python3
"""验证冻结前后状态的正确性"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Batch, StateRecord
from app.services.report_service import ReportService


def verify_freeze_status():
    print("\n" + "=" * 70)
    print("  🧪 验证：冻结前后状态的正确性")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        batch = db.query(Batch).filter(Batch.batch_no == "EXPO-2024-SH-001").first()
        if not batch:
            print("❌ 未找到批次，请先运行初始化和演示脚本")
            return False
        
        print(f"\n📋 批次: {batch.batch_no} - {batch.exhibition_name}")
        print(f"   frozen_at (Python 本地时间): {batch.frozen_at}")
        
        print("\n--- 第一步：检查冻结快照和后续操作的时间 ---")
        freeze_snaps = db.query(StateRecord).filter(
            StateRecord.batch_id == batch.id,
            StateRecord.is_freeze_snapshot == True
        ).all()
        
        print(f"✅ 找到 {len(freeze_snaps)} 条冻结快照")
        for snap in freeze_snaps[:3]:
            print(f"   • material_id={snap.material_id}, time={snap.changed_at}, status={snap.to_status}")
        
        print("\n--- 第二步：验证使用快照时间 vs frozen_at 比较的区别 ---")
        test_material_id = 2  # PROJ-002
        
        snap = db.query(StateRecord).filter(
            StateRecord.batch_id == batch.id,
            StateRecord.material_id == test_material_id,
            StateRecord.is_freeze_snapshot == True
        ).first()
        
        if snap:
            print(f"\nPROJ-002 冻结快照时间: {snap.changed_at}")
            print(f"批次 frozen_at 时间: {batch.frozen_at}")
            print(f"时间差: {batch.frozen_at - snap.changed_at}")
            
            post_freeze = db.query(StateRecord).filter(
                StateRecord.batch_id == batch.id,
                StateRecord.material_id == test_material_id,
                StateRecord.changed_at > snap.changed_at,
                StateRecord.is_freeze_snapshot == False
            ).all()
            
            print(f"\n使用快照时间 (changed_at > {snap.changed_at}):")
            print(f"  ✅ 找到 {len(post_freeze)} 条冻结后记录")
            for r in post_freeze:
                print(f"     • {r.from_status} → {r.to_status} (source: {r.change_source})")
                print(f"       原因: {r.reason[:60]}...")
            
            old_way = db.query(StateRecord).filter(
                StateRecord.batch_id == batch.id,
                StateRecord.material_id == test_material_id,
                StateRecord.changed_at >= batch.frozen_at
            ).all()
            print(f"\n使用 batch.frozen_at (changed_at >= {batch.frozen_at}):")
            print(f"  ❌ 找到 {len(old_way)} 条记录（这是之前错误的原因）")
        
        print("\n--- 第三步：检查报告接口返回 ---")
        report = ReportService.get_batch_report(db, batch)
        
        print(f"\n报告中各物料的冻结前后状态:")
        all_correct = True
        for item in report.items:
            has_freeze_data = item.status_before_freeze is not None or item.status_after_freeze is not None
            if has_freeze_data:
                print(f"\n  ✅ {item.material_code} - {item.material_name}")
                print(f"     冻结前: {item.status_before_freeze}")
                print(f"     冻结后: {item.status_after_freeze}")
                print(f"     当前: {item.current_status}")
                if item.manual_reason:
                    print(f"     人工理由: {item.manual_reason[:60]}...")
                if item.final_disposition:
                    print(f"     最终去向: {item.final_disposition}")
                
                if item.material_code == "PROJ-002":
                    if item.status_after_freeze == "returned":
                        print(f"     ✅ PROJ-002 冻结后状态正确: returned")
                    else:
                        print(f"     ❌ PROJ-002 冻结后状态错误: {item.status_after_freeze}, 应为 returned")
                        all_correct = False
        
        print("\n--- 第四步：验证 Excel 导出 ---")
        excel_data = ReportService.export_report_to_excel(db, batch)
        excel_path = f"reports/test_freeze_status_{batch.batch_no}.xlsx"
        os.makedirs("reports", exist_ok=True)
        with open(excel_path, "wb") as f:
            f.write(excel_data.getvalue())
        print(f"\n✅ Excel 报告已导出: {excel_path}")
        
        import pandas as pd
        xls = pd.ExcelFile(excel_path)
        df_detail = pd.read_excel(xls, sheet_name="明细")
        proj002_row = df_detail[df_detail["物料编码"] == "PROJ-002"].iloc[0]
        
        print("\nExcel 中 PROJ-002 的数据:")
        print(f"  冻结前状态: {proj002_row['冻结前状态']}")
        print(f"  冻结后状态: {proj002_row['冻结后状态']}")
        print(f"  当前状态: {proj002_row['当前状态']}")
        print(f"  人工理由: {proj002_row['人工理由'][:60]}..." if pd.notna(proj002_row['人工理由']) else "  人工理由: 空")
        
        excel_status_after = str(proj002_row['冻结后状态']) if pd.notna(proj002_row['冻结后状态']) else None
        if excel_status_after == "returned":
            print(f"\n✅ Excel 冻结后状态正确！")
        else:
            print(f"\n❌ Excel 冻结后状态错误: {excel_status_after}")
            all_correct = False
        
        print("\n" + "=" * 70)
        if all_correct:
            print("  🎉 冻结前后状态验证通过！")
            print("=" * 70)
            return True
        else:
            print("  ❌ 冻结前后状态验证失败")
            print("=" * 70)
            return False
            
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = verify_freeze_status()
    sys.exit(0 if success else 1)
