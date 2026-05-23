from datetime import datetime
from typing import Any, Dict, List
from pathlib import Path
import pandas as pd

from lease_audit.models.database import (
    get_session, EquipmentLease, ReturnRecord, ReturnItem,
    RepairEstimate, StoreHandover, ReturnPhoto, ImportFailure, ImportBatch
)
from lease_audit.utils.common import parse_date, json_loads


class ReportService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def summary_report(self, start_date: str = None, end_date: str = None, customer: str = None) -> Dict[str, Any]:
        lease_query = self.session.query(EquipmentLease)
        return_query = self.session.query(ReturnRecord)
        repair_query = self.session.query(RepairEstimate)
        
        if start_date:
            start_dt = parse_date(start_date)
            if start_dt:
                lease_query = lease_query.filter(EquipmentLease.lease_start_date >= start_dt)
                return_query = return_query.filter(ReturnRecord.return_date >= start_dt)
                repair_query = repair_query.filter(RepairEstimate.estimated_at >= start_dt)
        
        if end_date:
            end_dt = parse_date(end_date)
            if end_dt:
                lease_query = lease_query.filter(EquipmentLease.lease_start_date <= end_dt)
                return_query = return_query.filter(ReturnRecord.return_date <= end_dt)
                repair_query = repair_query.filter(RepairEstimate.estimated_at <= end_dt)
        
        if customer:
            lease_query = lease_query.filter(EquipmentLease.customer_name.like(f"%{customer}%"))
            return_query = return_query.filter(ReturnRecord.customer_name.like(f"%{customer}%"))
            repair_query = repair_query.filter(RepairEstimate.customer_name.like(f"%{customer}%"))
        
        leases = lease_query.all()
        returns = return_query.all()
        repairs = repair_query.all()
        
        total_deposit = sum(l.deposit_amount for l in leases)
        total_deduction = sum(r.total_deposit_deduction for r in returns)
        total_refund = sum(r.actual_refund for r in returns)
        total_repair_cost = sum(r.total_cost for r in repairs)
        
        failures = self.session.query(ImportFailure).filter_by(resolved=False).count()
        batches = self.session.query(ImportBatch).count()
        
        return {
            "统计周期": f"{start_date or '不限'} 至 {end_date or '不限'}",
            "租赁单总数": len(leases),
            "归还单总数": len(returns),
            "维修估价单总数": len(repairs),
            "总押金金额": round(total_deposit, 2),
            "总扣减押金": round(total_deduction, 2),
            "总退款金额": round(total_refund, 2),
            "总维修费用": round(total_repair_cost, 2),
            "未解决失败记录": failures,
            "总导入批次": batches
        }
    
    def detail_report(self, start_date: str = None, end_date: str = None, customer: str = None) -> Dict[str, Any]:
        query = self.session.query(ReturnRecord)
        
        if customer:
            query = query.filter(ReturnRecord.customer_name.like(f"%{customer}%"))
        
        if start_date:
            start_dt = parse_date(start_date)
            if start_dt:
                query = query.filter(ReturnRecord.return_date >= start_dt)
        
        if end_date:
            end_dt = parse_date(end_date)
            if end_dt:
                query = query.filter(ReturnRecord.return_date <= end_dt)
        
        returns = query.all()
        
        columns = [
            "原始行号", "批次号", "归还单号", "租赁单号", "客户名称", "归还日期",
            "扣款金额", "退款金额", "有无照片", "有无交接单", "有无维修估价", "状态"
        ]
        
        rows = []
        for ret in returns:
            record = ret.import_record
            batch = record.batch if record else None
            photos = self.session.query(ReturnPhoto).filter_by(return_record_id=ret.id).count()
            handovers = self.session.query(StoreHandover).filter_by(return_no=ret.return_no).count()
            repairs = self.session.query(RepairEstimate).filter_by(lease_no=ret.lease_no).count()
            
            rows.append([
                record.original_row_no if record else "",
                batch.batch_no if batch else "",
                ret.return_no,
                ret.lease_no,
                ret.customer_name,
                ret.return_date.strftime("%Y-%m-%d") if ret.return_date else "",
                ret.total_deposit_deduction,
                ret.actual_refund,
                "有" if photos > 0 else "无",
                "有" if handovers > 0 else "无",
                "有" if repairs > 0 else "无",
                ret.status
            ])
        
        return {"columns": columns, "rows": rows}
    
    def financial_report(self, start_date: str = None, end_date: str = None, customer: str = None) -> Dict[str, Any]:
        return_query = self.session.query(ReturnRecord)
        if start_date:
            start_dt = parse_date(start_date)
            if start_dt:
                return_query = return_query.filter(ReturnRecord.return_date >= start_dt)
        if end_date:
            end_dt = parse_date(end_date)
            if end_dt:
                return_query = return_query.filter(ReturnRecord.return_date <= end_dt)
        if customer:
            return_query = return_query.filter(ReturnRecord.customer_name.like(f"%{customer}%"))
        
        returns = return_query.all()
        
        deposit_deductions = []
        for ret in returns:
            items = self.session.query(ReturnItem).filter_by(return_record_id=ret.id).all()
            for item in items:
                if item.deposit_deduction > 0:
                    record = ret.import_record
                    batch = record.batch if record else None
                    deposit_deductions.append(
                        f"行{record.original_row_no if record else '?'} [{batch.batch_no if batch else '?'}] "
                        f"{ret.customer_name} - {item.item_name}: "
                        f"扣{item.deposit_deduction}元 ({item.deduction_reason or '未说明原因'})"
                    )
        
        failure_details = []
        failures = self.session.query(ImportFailure).filter_by(resolved=False).all()
        for f in failures:
            batch = self.session.query(ImportBatch).filter_by(id=f.batch_id).first()
            try:
                data = json_loads(f.original_data)
                row_identifier = data.get("租赁单号") or data.get("归还单号") or data.get("客户名称") or "未知"
            except:
                row_identifier = "未知"
            
            failure_details.append(
                f"[{batch.batch_no if batch else '?'}] 行{f.original_row_no} ({row_identifier}): "
                f"{f.error_type} - {f.error_message}"
            )
        
        return {
            "押金扣减明细": deposit_deductions,
            "导入失败清单": failure_details
        }
    
    def export_report(self, data: Dict, output_path: str, report_format: str):
        output_path = str(Path(output_path).resolve())
        ext = Path(output_path).suffix.lower()
        
        if ext == '.xlsx':
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                if report_format == "summary":
                    df = pd.DataFrame(list(data.items()), columns=["项目", "数值"])
                    df.to_excel(writer, sheet_name="汇总", index=False)
                elif report_format == "detail":
                    df = pd.DataFrame(data["rows"], columns=data["columns"])
                    df.to_excel(writer, sheet_name="明细", index=False)
                elif report_format == "financial":
                    for sheet_name, rows in data.items():
                        if rows:
                            df = pd.DataFrame(rows, columns=["详情"])
                            df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
        elif ext == '.csv':
            if report_format == "detail" and "rows" in data:
                df = pd.DataFrame(data["rows"], columns=data["columns"])
                df.to_csv(output_path, index=False, encoding='utf-8-sig')
            else:
                df = pd.DataFrame(list(data.items()), columns=["项目", "数值"])
                df.to_csv(output_path, index=False, encoding='utf-8-sig')
        else:
            import json
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
