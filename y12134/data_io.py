import pandas as pd
import os
from datetime import datetime
from config import OUTPUT_DIR, DATA_DIR
from audit_log import AuditLogger


class DataImporter:
    def __init__(self, audit_logger=None):
        self.audit_logger = audit_logger or AuditLogger()
    
    def import_from_excel(self, file_path, operator='system'):
        required_sheets = ['SKU资料', '毛利率', '促销日历', '销售历史']
        data = {}
        
        xls = pd.ExcelFile(file_path)
        sheet_names = xls.sheet_names
        
        for sheet in required_sheets:
            if sheet in sheet_names:
                data[sheet] = pd.read_excel(file_path, sheet_name=sheet)
            else:
                raise ValueError(f"Excel文件缺少必需的工作表: {sheet}")
        
        record_count = {k: len(v) for k, v in data.items()}
        self.audit_logger.log_data_import(
            operator=operator,
            file_name=os.path.basename(file_path),
            record_count=record_count
        )
        
        return data
    
    def import_from_csv(self, file_paths, operator='system'):
        required_files = ['sku_data.csv', 'margin_data.csv', 'promotion_calendar.csv', 'sales_history.csv']
        data = {}
        
        file_map = {os.path.basename(f): f for f in file_paths}
        
        for req_file in required_files:
            if req_file in file_map:
                sheet_name = req_file.replace('.csv', '').replace('_', ' ')
                sheet_name = {
                    'sku data': 'SKU资料',
                    'margin data': '毛利率',
                    'promotion calendar': '促销日历',
                    'sales history': '销售历史'
                }.get(sheet_name, sheet_name)
                data[sheet_name] = pd.read_csv(file_map[req_file])
            else:
                raise ValueError(f"缺少必需的CSV文件: {req_file}")
        
        record_count = {k: len(v) for k, v in data.items()}
        self.audit_logger.log_data_import(
            operator=operator,
            file_name=','.join([os.path.basename(f) for f in file_paths]),
            record_count=record_count
        )
        
        return data


class ReportExporter:
    def __init__(self, audit_logger=None):
        self.audit_logger = audit_logger or AuditLogger()
        self._ensure_output_dir()
    
    def _ensure_output_dir(self):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    def export_classification_report(self, results, file_name=None, operator='system'):
        if file_name is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f'abc_classification_report_{timestamp}.xlsx'
        
        file_path = os.path.join(OUTPUT_DIR, file_name)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            results_display = results.copy()
            
            for col in results_display.columns:
                if pd.api.types.is_datetime64_any_dtype(results_display[col]):
                    results_display[col] = results_display[col].dt.strftime('%Y-%m-%d')
            
            results_display.to_excel(writer, sheet_name='ABC分类结果', index=False)
            
            summary = self._generate_summary(results)
            summary.to_excel(writer, sheet_name='分类汇总', index=False)
            
            basis = results['classification_basis'].iloc[0] if 'classification_basis' in results.columns else 'gross_profit'
            thresholds = pd.DataFrame([
                {'类别': 'A类', '阈值': f"累计前{results['threshold_A'].iloc[0] * 100:.0f}%", '说明': '重点管理 - 高价值'},
                {'类别': 'B类', '阈值': f"累计{results['threshold_A'].iloc[0] * 100:.0f}%-{results['threshold_B'].iloc[0] * 100:.0f}%", '说明': '常规管理 - 中价值'},
                {'类别': 'C类', '阈值': f"累计{results['threshold_B'].iloc[0] * 100:.0f}%-100%", '说明': '简化管理 - 低价值'}
            ])
            thresholds.to_excel(writer, sheet_name='分类阈值说明', index=False)
        
        self.audit_logger.log_report_export(
            operator=operator,
            file_name=file_name,
            report_type='ABC分类报告'
        )
        
        return file_path
    
    def _generate_summary(self, results):
        summary = []
        for abc_class in ['A', 'B', 'C']:
            class_data = results[results['abc_class'] == abc_class]
            if len(class_data) > 0:
                summary.append({
                    '类别': f'{abc_class}类',
                    'SKU数量': len(class_data),
                    'SKU占比': f"{len(class_data) / len(results) * 100:.1f}%",
                    '总销售额': class_data['total_revenue'].sum(),
                    '销售额占比': f"{class_data['total_revenue'].sum() / results['total_revenue'].sum() * 100:.1f}%",
                    '总毛利': class_data['gross_profit'].sum(),
                    '毛利占比': f"{class_data['gross_profit'].sum() / results['gross_profit'].sum() * 100:.1f}%",
                    '平均毛利率': f"{class_data['gross_margin_pct'].mean() * 100:.1f}%",
                    '新品数量': len(class_data[class_data['is_new_product']]),
                    '异常SKU数': len(class_data[class_data['has_anomaly']])
                })
        
        total_row = {
            '类别': '总计',
            'SKU数量': len(results),
            'SKU占比': '100%',
            '总销售额': results['total_revenue'].sum(),
            '销售额占比': '100%',
            '总毛利': results['gross_profit'].sum(),
            '毛利占比': '100%',
            '平均毛利率': f"{results['gross_margin_pct'].mean() * 100:.1f}%",
            '新品数量': len(results[results['is_new_product']]),
            '异常SKU数': len(results[results['has_anomaly']])
        }
        summary.append(total_row)
        
        return pd.DataFrame(summary)
    
    def export_special_cases_report(self, new_product_report, promotion_anomalies, return_impacts, file_name=None, operator='system'):
        if file_name is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f'special_cases_report_{timestamp}.xlsx'
        
        file_path = os.path.join(OUTPUT_DIR, file_name)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            pd.DataFrame(new_product_report.get('new_products', [])).to_excel(writer, sheet_name='新品冷启动', index=False)
            pd.DataFrame(promotion_anomalies).to_excel(writer, sheet_name='促销异常', index=False)
            pd.DataFrame(return_impacts).to_excel(writer, sheet_name='退货冲击分析', index=False)
        
        self.audit_logger.log_report_export(
            operator=operator,
            file_name=file_name,
            report_type='特殊场景分析报告'
        )
        
        return file_path
    
    def export_audit_log(self, logs, file_name=None, operator='system'):
        if file_name is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f'audit_log_{timestamp}.xlsx'
        
        file_path = os.path.join(OUTPUT_DIR, file_name)
        
        df = pd.DataFrame(logs)
        df.to_excel(file_path, index=False)
        
        self.audit_logger.log_report_export(
            operator=operator,
            file_name=file_name,
            report_type='审计日志'
        )
        
        return file_path
    
    def export_detailed_sku_report(self, sku_trace_data, file_name=None, operator='system'):
        if file_name is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f"sku_trace_{sku_trace_data['basic_info']['sku_id']}_{timestamp}.xlsx"
        
        file_path = os.path.join(OUTPUT_DIR, file_name)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            basic_df = pd.DataFrame([sku_trace_data['basic_info']])
            basic_df.to_excel(writer, sheet_name='基本信息', index=False)
            
            metrics_df = pd.DataFrame([sku_trace_data['metrics']])
            metrics_df.to_excel(writer, sheet_name='核心指标', index=False)
            
            class_df = pd.DataFrame([sku_trace_data['classification_details']])
            class_df.to_excel(writer, sheet_name='分类详情', index=False)
            
            flags_df = pd.DataFrame([sku_trace_data['flags']])
            flags_df.to_excel(writer, sheet_name='特殊标记', index=False)
            
            if sku_trace_data['anomalies']:
                anomalies_df = pd.DataFrame(sku_trace_data['anomalies'])
                anomalies_df.to_excel(writer, sheet_name='异常记录', index=False)
        
        self.audit_logger.log_report_export(
            operator=operator,
            file_name=file_name,
            report_type='SKU追溯详情'
        )
        
        return file_path
