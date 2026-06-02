import pandas as pd
from pathlib import Path
from datetime import datetime


class ReportExporter:
    def __init__(self, data_manager, correlation_analyzer, spurious_detector):
        self.dm = data_manager
        self.ca = correlation_analyzer
        self.scd = spurious_detector
    
    def export_full_report(self, output_path):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            self._write_summary_sheet(writer)
            self._write_correlation_sheet(writer)
            self._write_spurious_detection_sheet(writer)
            self._write_audit_trail_sheet(writer)
            self._write_outliers_sheet(writer)
            self._write_raw_data_sheet(writer)
        
        return f"报告已导出到: {output_path}"
    
    def _write_summary_sheet(self, writer):
        summary_data = []
        
        info = self.dm.info()
        summary_data.append(["数据概览", ""])
        summary_data.append(["指标数据", info['指标数据']])
        summary_data.append(["指标数量", info['指标数量']])
        summary_data.append(["样本分组数量", info['样本分组数量']])
        summary_data.append(["时间窗口数量", info['时间窗口数量']])
        summary_data.append(["", ""])
        
        scd_summary = self.scd.get_summary()
        if scd_summary:
            summary_data.append(["热力假象检测", ""])
            summary_data.append(["总指标对", scd_summary['total_pairs']])
            summary_data.append(["发现假象", scd_summary['spurious_count']])
            summary_data.append(["假象率", f"{scd_summary['spurious_rate']:.1%}"])
            summary_data.append(["高风险", scd_summary['high_risk_count']])
            summary_data.append(["中风险", scd_summary['medium_risk_count']])
            summary_data.append(["", ""])
        
        summary_data.append(["报告生成时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        
        df = pd.DataFrame(summary_data, columns=["项目", "内容"])
        df.to_excel(writer, sheet_name="摘要", index=False)
        
        workbook = writer.book
        worksheet = writer.sheets["摘要"]
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            worksheet.column_dimensions[column].width = max_length + 2
    
    def _write_correlation_sheet(self, writer):
        if 'pairs' not in self.ca.corr_results:
            return
        
        pairs = self.ca.corr_results['pairs']
        
        df_data = []
        for p in pairs:
            df_data.append({
                '指标1': p['metric1'],
                '指标2': p['metric2'],
                '子集': p.get('subset', 'all'),
                '相关系数': round(p['correlation'], 4) if pd.notna(p['correlation']) else None,
                'P值': round(p['p_value'], 6) if pd.notna(p['p_value']) else None,
                '样本数': p['n_samples'],
                '显著': p['significant'],
                '剔除异常后相关': round(p['corr_without_outliers'], 4) if pd.notna(p['corr_without_outliers']) else None,
                '相关系数变化': round(p['correlation_diff'], 4) if pd.notna(p['correlation_diff']) else None
            })
        
        df = pd.DataFrame(df_data)
        df = df.sort_values('相关系数变化', ascending=False)
        df.to_excel(writer, sheet_name="相关性分析", index=False)
        
        worksheet = writer.sheets["相关性分析"]
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            worksheet.column_dimensions[column].width = max_length + 2
    
    def _write_spurious_detection_sheet(self, writer):
        if 'spurious_pairs' not in self.scd.detection_results:
            return
        
        spurious = self.scd.detection_results['spurious_pairs']
        
        df_data = []
        for p in spurious:
            evidence = p.get('evidence', {})
            df_data.append({
                '指标1': p['metric1'],
                '指标2': p['metric2'],
                '风险等级': p['risk_level'],
                '假象类型': p['spurious_type'],
                '原始相关系数': round(p['original_corr'], 4),
                '剔除异常后': round(p['clean_corr'], 4),
                '相关系数下降': round(p['corr_drop'], 4),
                '异常点数量': p['outlier_count'],
                '关键异常点': ', '.join(p['key_outliers']),
                '显著性变化': evidence.get('significance_changed', False),
                '最大杠杆值': round(evidence.get('max_leverage', 0), 4),
                '最大Cook\'s D': round(evidence.get('max_cooks_d', 0), 4)
            })
        
        df = pd.DataFrame(df_data)
        if not df.empty:
            df['风险等级排序'] = df['风险等级'].map({'high': 0, 'medium': 1, 'low': 2})
            df = df.sort_values(['风险等级排序', '相关系数下降'], ascending=[True, False])
            df = df.drop(columns=['风险等级排序'])
        df.to_excel(writer, sheet_name="热力假象检测", index=False)
        
        worksheet = writer.sheets["热力假象检测"]
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            worksheet.column_dimensions[column].width = max_length + 2
    
    def _write_audit_trail_sheet(self, writer):
        if not self.scd.audit_trail:
            return
        
        all_audit_data = []
        id_col = self.dm.metadata.get('id_column', 'sample_id')
        
        for pair_key, audit in self.scd.audit_trail.items():
            metric1, metric2 = pair_key.split('_vs_')
            influential_data = audit.get('influential_data', [])
            
            for item in influential_data:
                all_audit_data.append({
                    '指标对': pair_key,
                    '指标1': metric1,
                    '指标2': metric2,
                    id_col: item.get(id_col, ''),
                    f'{metric1}_值': round(item.get(metric1, 0), 4),
                    f'{metric2}_值': round(item.get(metric2, 0), 4),
                    '杠杆值': round(item.get('leverage', 0), 4),
                    'Cook\'s D': round(item.get('cooks_d', 0), 4),
                    '原始相关系数': round(audit.get('original_correlation', 0), 4),
                    '剔除后相关系数': round(audit.get('clean_correlation', 0), 4),
                    '相关系数下降': round(audit.get('correlation_drop', 0), 4),
                    '原始P值': round(audit.get('original_p_value', 0), 6),
                    '剔除后P值': round(audit.get('clean_p_value', 0), 6)
                })
        
        if all_audit_data:
            df = pd.DataFrame(all_audit_data)
            df.to_excel(writer, sheet_name="追溯明细", index=False)
            
            worksheet = writer.sheets["追溯明细"]
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                worksheet.column_dimensions[column].width = max_length + 2
    
    def _write_outliers_sheet(self, writer):
        if 'outliers' not in self.ca.corr_results:
            return
        
        outliers = self.ca.corr_results['outliers']
        df_data = []
        
        for metric, info in outliers.items():
            for sample_id in info.get('outlier_indices', []):
                df_data.append({
                    '指标': metric,
                    '异常样本ID': sample_id
                })
        
        if df_data:
            df = pd.DataFrame(df_data)
            df.to_excel(writer, sheet_name="异常值列表", index=False)
            
            worksheet = writer.sheets["异常值列表"]
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                worksheet.column_dimensions[column].width = max_length + 2
    
    def _write_raw_data_sheet(self, writer):
        df = self.dm.get_combined_data()
        if df is None:
            return
        
        df.to_excel(writer, sheet_name="原始数据", index=False)
        
        worksheet = writer.sheets["原始数据"]
        for i, col in enumerate(worksheet.columns):
            if i < 10:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                worksheet.column_dimensions[column].width = min(max_length + 2, 30)
