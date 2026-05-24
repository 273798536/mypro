#!/usr/bin/env python3
"""生成并导出报告"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Batch
from app.services.report_service import ReportService


def generate_excel_reports():
    print("正在生成Excel报告...")
    db = SessionLocal()
    
    try:
        batch = db.query(Batch).first()
        if not batch:
            print("未找到批次数据")
            return
        
        os.makedirs("reports", exist_ok=True)
        
        report_data = ReportService.export_report_to_excel(db, batch)
        report_path = f"reports/batch_{batch.batch_no}_report.xlsx"
        with open(report_path, "wb") as f:
            f.write(report_data.getvalue())
        print(f"✅ 物料汇总报告已生成: {report_path}")
        
        audit_data = ReportService.get_audit_log_excel(db, batch.id)
        audit_path = f"reports/batch_{batch.batch_no}_audit.xlsx"
        with open(audit_path, "wb") as f:
            f.write(audit_data.getvalue())
        print(f"✅ 审计日志报告已生成: {audit_path}")
        
        print("\n报告生成完成!")
        
    finally:
        db.close()


if __name__ == "__main__":
    generate_excel_reports()
