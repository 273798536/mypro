import os
import io
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session
from app.core.enums import DataSourceType
from app.core.exceptions import PartialImportFailure
from app.services.import_service import ImportService
from app.services.view_service import ViewService


class ExcelService:
    def __init__(self, db: Session):
        self.db = db
        self.import_service = ImportService(db)
        self.view_service = ViewService(db)
        self.export_dir = "exports"
        os.makedirs(self.export_dir, exist_ok=True)

    EXCEL_COLUMN_MAPPING = {
        DataSourceType.SAMPLE_TRANSFER: {
            "流转单号": "transfer_no",
            "款号": "style_code",
            "版本": "version",
            "流转类型": "transfer_type",
            "转出部门": "from_department",
            "转入部门": "to_department",
            "转出人": "from_person",
            "转入人": "to_person",
            "样衣数量": "sample_count",
            "流转日期": "transfer_date",
            "接收日期": "received_date",
            "是否作废": "is_obsolete",
            "状态": "status",
            "备注": "remarks",
        },
        DataSourceType.SIZE_MODIFICATION: {
            "修改单号": "modification_no",
            "款号": "style_code",
            "版本": "version",
            "尺码类型": "size_type",
            "修改原因": "modification_reason",
            "设计师": "designer",
            "打版师": "pattern_maker",
            "修改日期": "modified_date",
            "需要新面料": "requires_new_fabric",
            "旧面料处置": "old_fabric_disposition",
            "是否批准": "is_approved",
            "备注": "remarks",
        },
        DataSourceType.FABRIC_INVENTORY: {
            "出入库单号": "inventory_no",
            "款号": "style_code",
            "版本": "version",
            "面料编码": "fabric_code",
            "面料名称": "fabric_name",
            "面料批次": "fabric_batch",
            "颜色": "color",
            "操作类型": "operation_type",
            "数量": "quantity",
            "单位": "unit",
            "操作日期": "operation_date",
            "操作人": "operator",
            "领用人": "receiver",
            "领用角色": "receiver_role",
            "是否旧版本": "is_old_version",
            "旧版本说明": "old_version_note",
            "备注": "remarks",
        },
        DataSourceType.MANUAL_PRICING: {
            "改价单号": "pricing_no",
            "款号": "style_code",
            "原价": "original_price",
            "改后价": "modified_price",
            "改价原因": "pricing_reason",
            "审批人": "approved_by",
            "审批日期": "approved_date",
            "是否批准": "is_approved",
            "备注": "remarks",
        },
        DataSourceType.SHIFT_RECORD: {
            "班次编号": "shift_no",
            "班次日期": "shift_date",
            "班次类型": "shift_type",
            "工人": "worker",
            "角色": "worker_role",
            "款号": "style_code",
            "工作内容": "work_content",
            "工时": "work_hours",
            "产出数量": "output_quantity",
            "备注": "remarks",
        },
    }

    def parse_excel_file(
        self,
        file_content: bytes,
        source_type: str,
        source_file: str,
        imported_by: str
    ) -> Dict[str, Any]:
        df = pd.read_excel(io.BytesIO(file_content))
        
        column_mapping = self.EXCEL_COLUMN_MAPPING.get(source_type)
        if not column_mapping:
            raise ValueError(f"不支持的数据源类型: {source_type}")

        records = []
        parse_errors = []
        
        for idx, row in df.iterrows():
            try:
                record = {}
                for excel_col, json_col in column_mapping.items():
                    if excel_col in df.columns:
                        value = row[excel_col]
                        if pd.isna(value):
                            value = None
                        elif isinstance(value, pd.Timestamp):
                            value = value.isoformat()
                        elif isinstance(value, bool):
                            value = bool(value)
                        record[json_col] = value
                records.append(record)
            except Exception as e:
                parse_errors.append({
                    "row_number": idx + 2,
                    "error": f"解析失败: {str(e)}"
                })

        try:
            batch = self.import_service.batch_import(
                source_type,
                source_file,
                records,
                imported_by
            )

            return {
                "batch_id": batch.batch_id,
                "total_count": batch.total_count,
                "success_count": batch.success_count,
                "failed_count": batch.failed_count,
                "import_result": batch.import_result,
                "error_details": batch.error_details + parse_errors,
                "parsed_records_count": len(records),
                "parse_error_count": len(parse_errors)
            }
        except PartialImportFailure:
            raise
        except Exception as e:
            raise ValueError(f"Excel导入失败: {str(e)}")

    def generate_sample_excel(self, source_type: str) -> bytes:
        column_mapping = self.EXCEL_COLUMN_MAPPING.get(source_type)
        if not column_mapping:
            raise ValueError(f"不支持的数据源类型: {source_type}")

        sample_data = self._get_sample_data_for_type(source_type)
        df = pd.DataFrame(sample_data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Sheet1')
        output.seek(0)
        
        return output.getvalue()

    def _get_sample_data_for_type(self, source_type: str) -> List[Dict[str, Any]]:
        from app.data.sample_data import (
            SAMPLE_TRANSFERS, SAMPLE_SIZE_MODIFICATIONS,
            SAMPLE_FABRIC_INVENTORY, SAMPLE_MANUAL_PRICINGS,
            SAMPLE_SHIFT_RECORDS
        )
        
        source_map = {
            DataSourceType.SAMPLE_TRANSFER: SAMPLE_TRANSFERS,
            DataSourceType.SIZE_MODIFICATION: SAMPLE_SIZE_MODIFICATIONS,
            DataSourceType.FABRIC_INVENTORY: SAMPLE_FABRIC_INVENTORY,
            DataSourceType.MANUAL_PRICING: SAMPLE_MANUAL_PRICINGS,
            DataSourceType.SHIFT_RECORD: SAMPLE_SHIFT_RECORDS,
        }
        
        json_data = source_map.get(source_type, [])
        column_mapping = self.EXCEL_COLUMN_MAPPING.get(source_type, {})
        
        reverse_mapping = {v: k for k, v in column_mapping.items()}
        
        excel_data = []
        for record in json_data:
            excel_row = {}
            for json_key, value in record.items():
                excel_col = reverse_mapping.get(json_key)
                if excel_col:
                    excel_row[excel_col] = value
            excel_data.append(excel_row)
        
        return excel_data

    def export_ledger_to_excel(
        self,
        record_ids: List[int],
        mask_sensitive: bool = True,
        operator_role: str = "auditor"
    ) -> str:
        exported_data = self.view_service.export_records(
            record_ids,
            mask_sensitive,
            operator_role
        )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"台账导出_{timestamp}.xlsx"
        filepath = os.path.join(self.export_dir, filename)

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_main = pd.DataFrame([self._flatten_dict(r) for r in exported_data])
            df_main.to_excel(writer, index=False, sheet_name='台账记录')

            status_history_data = []
            for record in exported_data:
                for history in record.get('status_history', []):
                    history_row = {
                        '台账编号': record.get('record_no', ''),
                        '时间': history.get('time', ''),
                        '操作人': history.get('operator', ''),
                        '角色': history.get('role', ''),
                        '源状态': history.get('from', ''),
                        '目标状态': history.get('to', ''),
                        '原因': history.get('reason', ''),
                    }
                    status_history_data.append(history_row)
            
            if status_history_data:
                df_history = pd.DataFrame(status_history_data)
                df_history.to_excel(writer, index=False, sheet_name='状态变更历史')

        return filepath

    def export_chain_report_to_excel(
        self,
        chain_data: Dict[str, Any],
        operator_role: str = "brand_planner"
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"处理链报告_{chain_data.get('style_code', 'unknown')}_{timestamp}.xlsx"
        filepath = os.path.join(self.export_dir, filename)

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            summary_data = [{
                '链条编号': chain_data.get('chain_no', ''),
                '款号': chain_data.get('style_code', ''),
                '版本路径': chain_data.get('version_path', ''),
                '是否存在旧面料问题': '是' if chain_data.get('has_old_fabric_issue') else '否',
                '链条状态': chain_data.get('chain_status', ''),
                '复核人': chain_data.get('reviewed_by', ''),
                '复核时间': chain_data.get('reviewed_at', ''),
                '责任分析': chain_data.get('responsibility_analysis', ''),
            }]
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, index=False, sheet_name='概要')

            nodes_data = chain_data.get('chain_nodes', [])
            if nodes_data:
                df_nodes = pd.DataFrame([self._flatten_dict(n) for n in nodes_data])
                df_nodes.to_excel(writer, index=False, sheet_name='版本节点')

            fabric_issues = chain_data.get('old_fabric_records', [])
            if fabric_issues:
                df_issues = pd.DataFrame(fabric_issues)
                df_issues.to_excel(writer, index=False, sheet_name='旧面料问题')

        return filepath

    def _flatten_dict(self, d: Dict[str, Any], parent_key: str = '', sep: str = '_') -> Dict[str, Any]:
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            elif isinstance(v, list):
                items.append((new_key, str(v)))
            else:
                items.append((new_key, v))
        return dict(items)

    def generate_brand_report(self, dashboard_data: Dict[str, Any]) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"品牌企划报告_{timestamp}.xlsx"
        filepath = os.path.join(self.export_dir, filename)

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            overview = dashboard_data.get('overview', {})
            df_overview = pd.DataFrame([{
                '指标': ['总记录数', '人工改判数', '冻结记录数', '有问题处理链数'],
                '数值': [
                    overview.get('total_records', 0),
                    overview.get('manual_adjusted_count', 0),
                    overview.get('frozen_count', 0),
                    overview.get('chains_with_issues', 0),
                ]
            }])
            df_overview.to_excel(writer, index=False, sheet_name='概览')

            status_breakdown = dashboard_data.get('status_breakdown', {})
            if status_breakdown:
                df_status = pd.DataFrame([{
                    '状态': status_breakdown.keys(),
                    '数量': status_breakdown.values(),
                }])
                df_status.to_excel(writer, index=False, sheet_name='状态分布')

            recent_changes = dashboard_data.get('recent_changes', [])
            if recent_changes:
                df_changes = pd.DataFrame(recent_changes)
                df_changes.to_excel(writer, index=False, sheet_name='最近变更')

        return filepath

    def list_exported_files(self) -> List[Dict[str, Any]]:
        files = []
        for filename in os.listdir(self.export_dir):
            filepath = os.path.join(self.export_dir, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    'filename': filename,
                    'filepath': filepath,
                    'size': stat.st_size,
                    'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
        files.sort(key=lambda x: x['created_at'], reverse=True)
        return files
