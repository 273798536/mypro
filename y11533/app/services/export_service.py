import json
import os
import uuid
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import ReplayChain, TellerSchedule, LeaveRequest, BusinessForecast, PriceAdjustment, ShiftRecord
from app.config import settings
from app.services.import_service import DATA_TYPE_MAP

class ExportService:
    @staticmethod
    def generate_export_filename(export_type: str, branch_id: str = None) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        branch_suffix = f"_{branch_id}" if branch_id else ""
        return f"{export_type}{branch_suffix}_{timestamp}.xlsx"

    @staticmethod
    def export_data(
        db: Session,
        data_type: str,
        filters: Optional[Dict] = None,
        include_evidence: bool = True,
        branch_id: str = None,
    ) -> str:
        model_class = DATA_TYPE_MAP.get(data_type)
        if not model_class:
            raise ValueError(f"不支持的数据类型: {data_type}")
        
        query = db.query(model_class)
        
        if filters:
            if filters.get("start_date"):
                date_field = {
                    "schedule": "schedule_date",
                    "leave": "start_date",
                    "forecast": "forecast_date",
                    "adjustment": "effective_date",
                    "record": "record_date",
                }.get(data_type)
                if date_field:
                    query = query.filter(getattr(model_class, date_field) >= filters["start_date"])
            if filters.get("end_date"):
                date_field = {
                    "schedule": "schedule_date",
                    "leave": "end_date",
                    "forecast": "forecast_date",
                    "adjustment": "effective_date",
                    "record": "record_date",
                }.get(data_type)
                if date_field:
                    query = query.filter(getattr(model_class, date_field) <= filters["end_date"])
            if filters.get("branch_id"):
                query = query.filter(model_class.branch_id == filters["branch_id"])
            if filters.get("status"):
                query = query.filter(model_class.status == filters["status"])
        
        records = query.all()
        
        if not records:
            raise ValueError("没有可导出的数据")
        
        export_data = []
        for record in records:
            row = {c.name: getattr(record, c.name) for c in record.__table__.columns if c.name not in ["raw_value", "parsed_value"]}
            
            if include_evidence:
                row["原始值"] = record.raw_value
                row["解析值"] = record.parsed_value
                row["来源文件"] = record.source_file
                row["原始行号"] = record.source_row_number
                row["导入批次"] = record.import_batch_id
            
            export_data.append(row)
        
        df = pd.DataFrame(export_data)
        
        filename = ExportService.generate_export_filename(data_type, branch_id)
        filepath = os.path.join(settings.EXPORTS_DIR, filename)
        
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="数据", index=False)
            
            if include_evidence:
                evidence_df = df[["来源文件", "原始行号", "原始值", "解析值", "导入批次"]].copy()
                evidence_df.to_excel(writer, sheet_name="原始证据", index=False)
        
        return filepath, filename

    @staticmethod
    def export_replay_chain(
        db: Session,
        chain_id: str,
    ) -> str:
        chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
        if not chain:
            raise ValueError(f"回放链路不存在: {chain_id}")
        
        filename = ExportService.generate_export_filename(f"replay_{chain_id}")
        filepath = os.path.join(settings.EXPORTS_DIR, filename)
        
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_data = {
                "链路ID": [chain.chain_id],
                "链路名称": [chain.chain_name],
                "网点ID": [chain.branch_id],
                "网点名称": [chain.branch_name],
                "回放日期": [chain.replay_date],
                "状态": [chain.status],
                "创建人": [chain.created_by],
                "创建时间": [chain.created_at],
                "完成时间": [chain.completed_at],
                "耗时(秒)": [chain.duration_seconds],
                "请求总数": [chain.request_count],
                "成功请求": [chain.request_success_count],
                "失败请求": [chain.request_failed_count],
                "对账差异数": [chain.reconcile_diff_count],
                "异常数": [chain.anomaly_count],
            }
            pd.DataFrame(summary_data).T.to_excel(writer, sheet_name="链路概览", header=False)
            
            if chain.http_request_log:
                http_logs = json.loads(chain.http_request_log)
                if isinstance(http_logs, list):
                    pd.DataFrame(http_logs).to_excel(writer, sheet_name="HTTP请求日志", index=False)
            
            if chain.command_script_log:
                cmd_df = pd.DataFrame({"命令脚本": [chain.command_script_log]})
                cmd_df.to_excel(writer, sheet_name="命令脚本", index=False)
            
            if chain.persistence_log:
                persist_df = pd.DataFrame({"持久化日志": [chain.persistence_log]})
                persist_df.to_excel(writer, sheet_name="本地持久化", index=False)
            
            if chain.reconcile_result:
                reconcile_data = json.loads(chain.reconcile_result)
                if isinstance(reconcile_data, dict) and "diffs" in reconcile_data:
                    pd.DataFrame(reconcile_data["diffs"]).to_excel(writer, sheet_name="对账差异", index=False)
            
            if chain.anomaly_details:
                anomalies = json.loads(chain.anomaly_details)
                if isinstance(anomalies, list):
                    pd.DataFrame(anomalies).to_excel(writer, sheet_name="异常详情", index=False)
        
        chain.export_file_path = filepath
        chain.export_file_name = filename
        db.commit()
        
        return filepath, filename

    @staticmethod
    def export_with_audit_trail(
        db: Session,
        data_type: str,
        record_id: str,
    ) -> str:
        model_class = DATA_TYPE_MAP.get(data_type)
        if not model_class:
            raise ValueError(f"不支持的数据类型: {data_type}")
        
        id_field = {
            "schedule": "schedule_id",
            "leave": "leave_id",
            "forecast": "forecast_id",
            "adjustment": "adjustment_id",
            "record": "record_id",
        }.get(data_type)
        
        record = db.query(model_class).filter(getattr(model_class, id_field) == record_id).first()
        if not record:
            raise ValueError(f"记录不存在: {record_id}")
        
        filename = f"{data_type}_audit_{record_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(settings.EXPORTS_DIR, filename)
        
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            record_data = {c.name: [getattr(record, c.name)] for c in record.__table__.columns}
            pd.DataFrame(record_data).T.to_excel(writer, sheet_name="记录详情", header=False)
            
            evidence_data = {
                "来源文件": [record.source_file],
                "原始行号": [record.source_row_number],
                "原始值": [record.raw_value],
                "解析值": [record.parsed_value],
                "导入批次": [record.import_batch_id],
                "导入时间": [record.import_time],
                "是否人工改判": [record.is_manual_modified],
                "改判人": [record.modified_by],
                "改判时间": [record.modified_time],
                "改判原因": [record.modified_reason],
            }
            pd.DataFrame(evidence_data).T.to_excel(writer, sheet_name="原始证据", header=False)
        
        return filepath, filename
