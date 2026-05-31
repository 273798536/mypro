import pandas as pd
import os
from datetime import datetime
from models import AnalysisResult
from config import RESULT_DIR


def export_to_excel(result: AnalysisResult, filename: str = None) -> str:
    if filename is None:
        filename = f"品牌联名授权回款分析_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    filepath = os.path.join(RESULT_DIR, filename)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        summary_data = {
            '项目': [
                '分析报告ID',
                '分析时间',
                '合同数量',
                '保证金记录数',
                '回款报告数',
                '授权分成总额',
                '保底抵扣总额',
                '保证金核销总额',
                '最终应收总额',
                '异常数量',
                '来源文件'
            ],
            '数值': [
                result.report_id,
                result.analysis_date.strftime('%Y-%m-%d %H:%M:%S'),
                result.total_contracts,
                result.total_deposits,
                result.total_payments,
                f"{result.total_royalty:.2f}",
                f"{result.total_guarantee_deduction:.2f}",
                f"{result.total_deposit_verification:.2f}",
                f"{result.total_final_receivable:.2f}",
                len(result.anomalies),
                '; '.join(result.source_files)
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='总体概览', index=False)
        
        brand_data = []
        for brand, data in result.summary_by_brand.items():
            brand_data.append({
                '品牌': brand,
                '授权分成': data['total_royalty'],
                '保底抵扣': data['total_guarantee'],
                '保证金核销': data['total_deposit'],
                '最终应收': data['final_receivable'],
                '异常笔数': data['anomaly_count']
            })
        pd.DataFrame(brand_data).to_excel(writer, sheet_name='按品牌汇总', index=False)
        
        period_data = []
        for period, data in result.summary_by_period.items():
            period_data.append({
                '周期': period,
                '授权分成': data['total_royalty'],
                '保底抵扣': data['total_guarantee'],
                '保证金核销': data['total_deposit'],
                '最终应收': data['final_receivable'],
                '异常笔数': data['anomaly_count']
            })
        pd.DataFrame(period_data).to_excel(writer, sheet_name='按周期汇总', index=False)
        
        split_data = []
        for split in result.royalty_splits:
            sources = '; '.join([f"{s.file_name}!{s.sheet_name}:{s.row_number}" for s in split.sources])
            split_data.append({
                '周期': split.period,
                '合同编号': split.contract_no,
                '品牌': split.brand_name,
                '渠道': split.channel,
                '销售额': split.sales_amount,
                '退货额': split.return_amount,
                '净销售': split.net_sales,
                '分成比例': f"{split.royalty_rate*100:.1f}%",
                '计算授权费': split.calculated_royalty,
                '实际授权费': split.actual_royalty,
                '差异': split.difference,
                '保底抵扣': split.guarantee_deduction,
                '保证金核销': split.deposit_verification,
                '最终应收': split.final_receivable,
                '是否异常': '是' if split.is_anomaly else '否',
                '关联异常ID': '; '.join(split.anomaly_ids),
                '数据来源': sources
            })
        pd.DataFrame(split_data).to_excel(writer, sheet_name='授权分成明细', index=False)
        
        anomaly_data = []
        for anomaly in result.anomalies:
            sources = '; '.join([f"{s.file_name}!{s.sheet_name}:{s.row_number}[{s.material_type}]" for s in anomaly.sources])
            anomaly_data.append({
                '异常ID': anomaly.id,
                '异常类型': anomaly.type,
                '合同编号': anomaly.contract_no,
                '周期': anomaly.period or '',
                '异常描述': anomaly.description,
                '预期值': anomaly.expected_value if anomaly.expected_value is not None else '',
                '实际值': anomaly.actual_value if anomaly.actual_value is not None else '',
                '差异': anomaly.difference if anomaly.difference is not None else '',
                '修正建议': anomaly.correction_suggestion,
                '数据来源': sources
            })
        pd.DataFrame(anomaly_data).to_excel(writer, sheet_name='异常详情', index=False)
        
        anomaly_data = []
        for anomaly in result.anomalies:
            for source in anomaly.sources:
                anomaly_data.append({
                    '异常ID': anomaly.id,
                    '异常类型': anomaly.type,
                    '异常描述': anomaly.description,
                    '来源文件': source.file_name,
                    '来源工作表': source.sheet_name or '',
                    '来源行号': source.row_number,
                    '材料类型': source.material_type,
                    '修正建议': anomaly.correction_suggestion
                })
        pd.DataFrame(anomaly_data).to_excel(writer, sheet_name='追溯明细', index=False)
    
    return filepath
