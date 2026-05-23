from datetime import datetime
from typing import Any, Dict
from pathlib import Path
import pandas as pd

from lease_audit.models.database import (
    get_session, EquipmentLease, ReturnRecord, ReturnItem,
    RepairEstimate, ImportFailure, ImportBatch, ImportRecord
)
from lease_audit.utils.common import get_export_dir, parse_date, json_loads


class ExportService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.session = get_session(db_path)
    
    def export_data(
        self,
        export_type: str,
        file_format: str = "excel",
        output_path: str = None,
        start_date: str = None,
        end_date: str = None,
        include_failures: bool = False
    ) -> Dict[str, Any]:
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ext = {"excel": "xlsx", "csv": "csv", "json": "json"}[file_format]
            output_path = str(Path(get_export_dir()) / f"{export_type}_{timestamp}.{ext}")
        
        output_path = str(Path(output_path).resolve())
        
        export_map = {
            "all": self._export_all,
            "leases": self._export_leases,
            "returns": self._export_returns,
            "repairs": self._export_repairs,
            "failures": self._export_failures
        }
        
        exporter = export_map.get(export_type)
        if not exporter:
            raise ValueError(f"未知的导出类型: {export_type}")
        
        dfs = exporter(start_date, end_date, include_failures)
        record_count = sum(len(df) for df in dfs.values())
        
        if file_format == "excel":
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                for sheet_name, df in dfs.items():
                    df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
        elif file_format == "csv":
            if len(dfs) == 1:
                df = list(dfs.values())[0]
                df.to_csv(output_path, index=False, encoding='utf-8-sig')
            else:
                base_path = Path(output_path)
                for sheet_name, df in dfs.items():
                    df.to_csv(
                        str(base_path.parent / f"{base_path.stem}_{sheet_name}{base_path.suffix}"),
                        index=False, encoding='utf-8-sig'
                    )
        else:
            import json
            data = {k: df.to_dict('records') for k, df in dfs.items()}
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        
        return {
            "file_path": output_path,
            "record_count": record_count,
            "failure_count": len(dfs.get("导入失败", [])) if include_failures else 0
        }
    
    def _export_leases(self, start_date: str = None, end_date: str = None, include_failures: bool = False) -> Dict[str, pd.DataFrame]:
        query = self.session.query(EquipmentLease)
        if start_date:
            dt = parse_date(start_date)
            if dt:
                query = query.filter(EquipmentLease.lease_start_date >= dt)
        if end_date:
            dt = parse_date(end_date)
            if dt:
                query = query.filter(EquipmentLease.lease_start_date <= dt)
        
        leases = query.all()
        data = []
        for l in leases:
            record = l.import_record
            batch = record.batch if record else None
            data.append({
                "原始行号": record.original_row_no if record else "",
                "批次号": batch.batch_no if batch else "",
                "租赁单号": l.lease_no,
                "客户名称": l.customer_name,
                "客户电话": l.customer_phone,
                "设备名称": l.equipment_name,
                "设备型号": l.equipment_model,
                "序列号": l.serial_no,
                "租赁开始日期": l.lease_start_date,
                "预计归还日期": l.expected_return_date,
                "押金金额": l.deposit_amount,
                "月租金": l.monthly_rent,
                "状态": l.status
            })
        
        return {"租赁单": pd.DataFrame(data)}
    
    def _export_returns(self, start_date: str = None, end_date: str = None, include_failures: bool = False) -> Dict[str, pd.DataFrame]:
        query = self.session.query(ReturnRecord)
        if start_date:
            dt = parse_date(start_date)
            if dt:
                query = query.filter(ReturnRecord.return_date >= dt)
        if end_date:
            dt = parse_date(end_date)
            if dt:
                query = query.filter(ReturnRecord.return_date <= dt)
        
        returns = query.all()
        return_data = []
        item_data = []
        
        for r in returns:
            record = r.import_record
            batch = record.batch if record else None
            return_data.append({
                "原始行号": record.original_row_no if record else "",
                "批次号": batch.batch_no if batch else "",
                "归还单号": r.return_no,
                "租赁单号": r.lease_no,
                "客户名称": r.customer_name,
                "归还日期": r.return_date,
                "归还人": r.returned_by,
                "接收人": r.received_by,
                "门店": r.store_location,
                "总扣减押金": r.total_deposit_deduction,
                "实际退款": r.actual_refund,
                "状态": r.status,
                "备注": r.remark
            })
            
            items = self.session.query(ReturnItem).filter_by(return_record_id=r.id).all()
            for item in items:
                item_data.append({
                    "归还单号": r.return_no,
                    "配件名称": item.item_name,
                    "配件类型": item.item_type,
                    "序列号": item.serial_no,
                    "应还数量": item.expected_quantity,
                    "实还数量": item.returned_quantity,
                    "单价": item.unit_price,
                    "扣减押金": item.deposit_deduction,
                    "扣减原因": item.deduction_reason,
                    "状况": item.condition
                })
        
        result = {"归还单": pd.DataFrame(return_data)}
        if item_data:
            result["归还配件明细"] = pd.DataFrame(item_data)
        return result
    
    def _export_repairs(self, start_date: str = None, end_date: str = None, include_failures: bool = False) -> Dict[str, pd.DataFrame]:
        query = self.session.query(RepairEstimate)
        if start_date:
            dt = parse_date(start_date)
            if dt:
                query = query.filter(RepairEstimate.estimated_at >= dt)
        if end_date:
            dt = parse_date(end_date)
            if dt:
                query = query.filter(RepairEstimate.estimated_at <= dt)
        
        repairs = query.all()
        data = []
        for r in repairs:
            record = r.import_record
            batch = record.batch if record else None
            data.append({
                "原始行号": record.original_row_no if record else "",
                "批次号": batch.batch_no if batch else "",
                "估价单号": r.estimate_no,
                "租赁单号": r.lease_no,
                "设备名称": r.equipment_name,
                "序列号": r.serial_no,
                "客户名称": r.customer_name,
                "损坏描述": r.damage_description,
                "预估费用": r.estimated_cost,
                "人工费用": r.labor_cost,
                "配件费用": r.parts_cost,
                "总费用": r.total_cost,
                "估价人": r.estimated_by,
                "估价日期": r.estimated_at,
                "状态": r.status
            })
        
        return {"维修估价": pd.DataFrame(data)}
    
    def _export_failures(self, start_date: str = None, end_date: str = None, include_failures: bool = False) -> Dict[str, pd.DataFrame]:
        query = self.session.query(ImportFailure)
        if start_date:
            dt = parse_date(start_date)
            if dt:
                query = query.filter(ImportFailure.created_at >= dt)
        if end_date:
            dt = parse_date(end_date)
            if dt:
                query = query.filter(ImportFailure.created_at <= dt)
        
        failures = query.all()
        data = []
        for f in failures:
            batch = self.session.query(ImportBatch).filter_by(id=f.batch_id).first()
            try:
                original = json_loads(f.original_data)
                original_preview = str(original)[:200]
            except:
                original_preview = f.original_data[:200]
            
            data.append({
                "批次号": batch.batch_no if batch else "",
                "数据源类型": batch.source_type if batch else "",
                "原始行号": f.original_row_no,
                "错误类型": f.error_type,
                "错误信息": f.error_message,
                "原始数据预览": original_preview,
                "状态": "已解决" if f.resolved else "未解决",
                "解决时间": f.resolved_at,
                "解决人": f.resolved_by
            })
        
        return {"导入失败": pd.DataFrame(data)}
    
    def _export_all(self, start_date: str = None, end_date: str = None, include_failures: bool = False) -> Dict[str, pd.DataFrame]:
        result = {}
        result.update(self._export_leases(start_date, end_date))
        result.update(self._export_returns(start_date, end_date))
        result.update(self._export_repairs(start_date, end_date))
        if include_failures:
            result.update(self._export_failures(start_date, end_date))
        return result
