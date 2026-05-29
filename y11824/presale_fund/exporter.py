import os
import pandas as pd
from datetime import datetime
from typing import List, Dict
from .models import DisbursementRecord, ComparisonResult


class ResultExporter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def export_disbursements(
        self,
        records: List[DisbursementRecord],
        filename: str = None
    ) -> str:
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'disbursements_{timestamp}.xlsx'
        
        filepath = os.path.join(self.output_dir, filename)
        
        summary_data = []
        detail_data = []
        
        for record in records:
            summary_data.append({
                '拨付记录ID': record.disbursement_id,
                '项目ID': record.project_id,
                '项目名称': record.project_name,
                '账户ID': record.account_id,
                '申请总额': record.total_request_amount,
                '批准总额': record.total_approved_amount,
                '状态': record.status.value,
                '批次号': record.run_batch_no,
                '运行时间': record.run_timestamp,
                '明细数量': len(record.items)
            })
            
            for item in record.items:
                detail_data.append({
                    '拨付记录ID': record.disbursement_id,
                    '项目ID': record.project_id,
                    '项目名称': record.project_name,
                    '节点ID': item.node_id,
                    '节点名称': item.node_name,
                    '发票ID': item.invoice_id,
                    '发票金额': item.invoice_amount,
                    '节点完成金额': item.node_completed_amount,
                    '适用监管比例': item.applicable_ratio,
                    '申请金额': item.request_amount,
                    '批准金额': item.approved_amount
                })
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='拨付汇总', index=False)
            pd.DataFrame(detail_data).to_excel(writer, sheet_name='拨付明细', index=False)
        
        return filepath
    
    def export_comparison(
        self,
        comparison_results: List[ComparisonResult],
        filename: str = None
    ) -> str:
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'comparison_{timestamp}.xlsx'
        
        filepath = os.path.join(self.output_dir, filename)
        
        data = []
        for result in comparison_results:
            if result.has_changes:
                for change in result.changes:
                    data.append({
                        '拨付记录ID': result.disbursement_id,
                        '字段名称': change.field_name,
                        '原值': change.old_value,
                        '新值': change.new_value,
                        '变更类型': change.change_type,
                        '变更原因': change.reason or ''
                    })
            else:
                data.append({
                    '拨付记录ID': result.disbursement_id,
                    '字段名称': '-',
                    '原值': '-',
                    '新值': '-',
                    '变更类型': '无变更',
                    '变更原因': '数据一致'
                })
        
        pd.DataFrame(data).to_excel(filepath, sheet_name='变更对比', index=False)
        
        return filepath
    
    def export_detailed_report(
        self,
        records: List[DisbursementRecord],
        comparison_results: List[ComparisonResult],
        filename: str = None
    ) -> str:
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'detailed_report_{timestamp}.xlsx'
        
        filepath = os.path.join(self.output_dir, filename)
        
        summary_data = []
        detail_data = []
        change_data = []
        
        comp_map = {c.disbursement_id: c for c in comparison_results}
        
        for record in records:
            comp = comp_map.get(record.disbursement_id)
            has_changes = comp.has_changes if comp else False
            
            summary_data.append({
                '拨付记录ID': record.disbursement_id,
                '项目ID': record.project_id,
                '项目名称': record.project_name,
                '账户ID': record.account_id,
                '申请总额': record.total_request_amount,
                '批准总额': record.total_approved_amount,
                '状态': record.status.value,
                '批次号': record.run_batch_no,
                '运行时间': record.run_timestamp,
                '是否有变更': '是' if has_changes else '否',
                '明细数量': len(record.items)
            })
            
            for item in record.items:
                detail_data.append({
                    '拨付记录ID': record.disbursement_id,
                    '项目ID': record.project_id,
                    '项目名称': record.project_name,
                    '节点ID': item.node_id,
                    '节点名称': item.node_name,
                    '发票ID': item.invoice_id,
                    '发票金额': item.invoice_amount,
                    '节点完成金额': item.node_completed_amount,
                    '适用监管比例': item.applicable_ratio,
                    '申请金额': item.request_amount,
                    '批准金额': item.approved_amount
                })
            
            if comp and comp.has_changes:
                for change in comp.changes:
                    change_data.append({
                        '拨付记录ID': record.disbursement_id,
                        '项目名称': record.project_name,
                        '字段名称': change.field_name,
                        '原值': change.old_value,
                        '新值': change.new_value,
                        '变更类型': change.change_type,
                        '变更原因': change.reason or ''
                    })
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='拨付汇总', index=False)
            pd.DataFrame(detail_data).to_excel(writer, sheet_name='拨付明细', index=False)
            if change_data:
                pd.DataFrame(change_data).to_excel(writer, sheet_name='变更明细', index=False)
        
        return filepath
    
    def export_query_result(self, query_data: List[Dict], query_type: str) -> str:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'query_{query_type}_{timestamp}.xlsx'
        filepath = os.path.join(self.output_dir, filename)
        
        pd.DataFrame(query_data).to_excel(filepath, index=False)
        
        return filepath
