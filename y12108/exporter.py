import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class ExportResult:
    success: bool
    file_path: Optional[str]
    message: str


class DataExporter:
    def __init__(self, timezone: str = 'Asia/Shanghai'):
        self.timezone = timezone

    def export_to_excel(self, analysis_result: Dict, output_path: str) -> ExportResult:
        try:
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                self._write_summary_sheet(writer, analysis_result)
                self._write_timeseries_sheet(writer, analysis_result)
                self._write_anomalies_sheet(writer, analysis_result)
                self._write_issues_sheet(writer, analysis_result)
                self._write_calendar_sheet(writer, analysis_result)

            return ExportResult(
                success=True,
                file_path=output_path,
                message=f'数据已成功导出到 {output_path}'
            )
        except Exception as e:
            return ExportResult(
                success=False,
                file_path=None,
                message=f'导出失败: {str(e)}'
            )

    def _write_summary_sheet(self, writer, analysis_result: Dict):
        summary_data = []
        
        metadata = analysis_result.get('metadata', {})
        summary_data.append(['分析概览', ''])
        summary_data.append(['指标名称', metadata.get('metric_name', 'N/A')])
        summary_data.append(['分析时间', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        summary_data.append(['数据时间范围', f"{metadata.get('start_time', 'N/A')} ~ {metadata.get('end_time', 'N/A')}"])
        summary_data.append(['采样频率', metadata.get('frequency', 'N/A')])
        summary_data.append(['时区', metadata.get('timezone', self.timezone)])
        summary_data.append(['', ''])
        
        stats = analysis_result.get('stats', {})
        summary_data.append(['统计信息', ''])
        summary_data.append(['数据点总数', stats.get('total_points', 0)])
        summary_data.append(['异常点数量', stats.get('anomaly_count', 0)])
        summary_data.append(['异常率', f"{stats.get('anomaly_rate', 0)*100:.2f}%"])
        summary_data.append(['暴涨异常', stats.get('anomaly_by_type', {}).get('spike', 0)])
        summary_data.append(['暴跌异常', stats.get('anomaly_by_type', {}).get('drop', 0)])
        summary_data.append(['', ''])
        
        quality_stats = analysis_result.get('quality_issues', {})
        summary_data.append(['数据质量', ''])
        summary_data.append(['采样中断数', quality_stats.get('sampling_gaps', 0)])
        summary_data.append(['重复记录数', quality_stats.get('duplicates', 0)])
        summary_data.append(['空值记录数', quality_stats.get('null_values', 0)])
        summary_data.append(['日历冲突数', quality_stats.get('calendar_conflicts', 0)])
        summary_data.append(['活动重叠数', quality_stats.get('event_overlaps', 0)])
        summary_data.append(['', ''])
        
        quality_result = analysis_result.get('quality_result', 'PASS')
        summary_data.append(['质量检查结果', quality_result])
        
        df = pd.DataFrame(summary_data, columns=['项目', '值'])
        df.to_excel(writer, sheet_name='分析概览', index=False)

    def _write_timeseries_sheet(self, writer, analysis_result: Dict):
        decomposed = analysis_result.get('decomposed_data', pd.DataFrame())
        if not decomposed.empty:
            df = decomposed.copy()
            if 'timestamp' in df.columns:
                df['timestamp'] = df['timestamp'].dt.tz_localize(None)
            df.to_excel(writer, sheet_name='原始数据与分解', index=False)

    def _write_anomalies_sheet(self, writer, analysis_result: Dict):
        anomalies = analysis_result.get('annotated_anomalies', pd.DataFrame())
        if not anomalies.empty:
            df = anomalies.copy()
            if 'timestamp' in df.columns:
                df['timestamp'] = df['timestamp'].dt.tz_localize(None)
            df.to_excel(writer, sheet_name='异常明细', index=False)

    def _write_issues_sheet(self, writer, analysis_result: Dict):
        issues = analysis_result.get('quality_issues_detail', [])
        if issues:
            issue_records = []
            for issue in issues:
                issue_records.append({
                    '问题类型': issue.type if hasattr(issue, 'type') else str(issue.get('type', '')),
                    '严重程度': issue.severity if hasattr(issue, 'severity') else str(issue.get('severity', '')),
                    '问题描述': issue.message if hasattr(issue, 'message') else str(issue.get('message', '')),
                    '详细信息': json.dumps(issue.details if hasattr(issue, 'details') else issue.get('details', {}), ensure_ascii=False)
                })
            df = pd.DataFrame(issue_records)
            df.to_excel(writer, sheet_name='数据质量问题', index=False)

        gaps = analysis_result.get('sampling_gaps', pd.DataFrame())
        if not gaps.empty:
            df = gaps.copy()
            for col in ['gap_start', 'gap_end']:
                if col in df.columns:
                    df[col] = df[col].dt.tz_localize(None)
            df.to_excel(writer, sheet_name='采样中断明细', index=False)

    def _write_calendar_sheet(self, writer, analysis_result: Dict):
        calendar = analysis_result.get('calendar_data', pd.DataFrame())
        if not calendar.empty:
            df = calendar.copy()
            for col in ['date', 'start_time', 'end_time']:
                if col in df.columns:
                    df[col] = df[col].dt.tz_localize(None)
            df.to_excel(writer, sheet_name='日历数据', index=False)

        conflicts = analysis_result.get('calendar_conflicts', [])
        if conflicts:
            conflict_records = []
            for c in conflicts:
                conflict_records.append({
                    '冲突时间': c.timestamp.strftime('%Y-%m-%d %H:%M:%S') if hasattr(c, 'timestamp') else '',
                    '冲突类型': c.conflict_type if hasattr(c, 'conflict_type') else '',
                    '数据源A': c.source_a if hasattr(c, 'source_a') else '',
                    '数据源B': c.source_b if hasattr(c, 'source_b') else '',
                    'A的值': c.value_a if hasattr(c, 'value_a') else '',
                    'B的值': c.value_b if hasattr(c, 'value_b') else '',
                    '严重程度': c.severity if hasattr(c, 'severity') else '',
                    '描述': c.message if hasattr(c, 'message') else ''
                })
            df = pd.DataFrame(conflict_records)
            df.to_excel(writer, sheet_name='日历冲突', index=False)

        overlaps = analysis_result.get('event_overlaps', [])
        if overlaps:
            overlap_records = []
            for o in overlaps:
                overlap_records.append({
                    '重叠开始': o.overlap_start.strftime('%Y-%m-%d %H:%M:%S') if hasattr(o, 'overlap_start') else '',
                    '重叠结束': o.overlap_end.strftime('%Y-%m-%d %H:%M:%S') if hasattr(o, 'overlap_end') else '',
                    '重叠时长': str(o.overlap_duration) if hasattr(o, 'overlap_duration') else '',
                    '活动1': o.event1_name if hasattr(o, 'event1_name') else '',
                    '活动2': o.event2_name if hasattr(o, 'event2_name') else '',
                    '活动1来源': o.event1_source if hasattr(o, 'event1_source') else '',
                    '活动2来源': o.event2_source if hasattr(o, 'event2_source') else ''
                })
            df = pd.DataFrame(overlap_records)
            df.to_excel(writer, sheet_name='活动重叠', index=False)

    def export_to_csv(self, analysis_result: Dict, output_dir: str) -> ExportResult:
        import os
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            decomposed = analysis_result.get('decomposed_data', pd.DataFrame())
            if not decomposed.empty:
                decomposed.to_csv(f"{output_dir}/timeseries_decomposed.csv", index=False)
            
            anomalies = analysis_result.get('annotated_anomalies', pd.DataFrame())
            if not anomalies.empty:
                anomalies.to_csv(f"{output_dir}/anomalies_detailed.csv", index=False)
            
            gaps = analysis_result.get('sampling_gaps', pd.DataFrame())
            if not gaps.empty:
                gaps.to_csv(f"{output_dir}/sampling_gaps.csv", index=False)

            return ExportResult(
                success=True,
                file_path=output_dir,
                message=f'CSV文件已导出到目录 {output_dir}'
            )
        except Exception as e:
            return ExportResult(
                success=False,
                file_path=None,
                message=f'导出失败: {str(e)}'
            )


class ReportGenerator:
    def __init__(self, template_path: Optional[str] = None):
        self.template_path = template_path

    def generate_markdown_report(self, analysis_result: Dict, output_path: str) -> ExportResult:
        try:
            report = self._build_markdown_report(analysis_result)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(report)

            return ExportResult(
                success=True,
                file_path=output_path,
                message=f'报告已生成: {output_path}'
            )
        except Exception as e:
            return ExportResult(
                success=False,
                file_path=None,
                message=f'报告生成失败: {str(e)}'
            )

    def _build_markdown_report(self, analysis_result: Dict) -> str:
        report = '# 时间序列异常分解分析报告\n\n'
        report += '> 本报告由时间序列异常分解系统自动生成\n\n'
        
        report += self._generate_header_section(analysis_result)
        report += self._generate_overview_section(analysis_result)
        report += self._generate_quality_section(analysis_result)
        report += self._generate_anomaly_section(analysis_result)
        report += self._generate_calendar_section(analysis_result)
        report += self._generate_conclusion_section(analysis_result)
        
        report += '\n---\n'
        report += f'*生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*\n'
        
        return report

    def _generate_header_section(self, result: Dict) -> str:
        metadata = result.get('metadata', {})
        section = '## 基本信息\n\n'
        section += '| 项目 | 内容 |\n|------|------|\n'
        section += f"| 指标名称 | {metadata.get('metric_name', 'N/A')} |\n"
        section += f"| 数据范围 | {metadata.get('start_time', 'N/A')} ~ {metadata.get('end_time', 'N/A')} |\n"
        section += f"| 采样频率 | {metadata.get('frequency', 'N/A')} |\n"
        section += f"| 时区 | {metadata.get('timezone', 'Asia/Shanghai')} |\n\n"
        return section

    def _generate_overview_section(self, result: Dict) -> str:
        stats = result.get('stats', {})
        section = '## 分析概览\n\n'
        
        anomaly_count = stats.get('anomaly_count', 0)
        total_points = stats.get('total_points', 1)
        anomaly_rate = anomaly_count / total_points * 100
        
        section += f"- **数据点总数**: {total_points:,}\n"
        section += f"- **异常点数量**: {anomaly_count:,}\n"
        section += f"- **异常率**: {anomaly_rate:.2f}%\n"
        section += f"- **暴涨异常**: {stats.get('anomaly_by_type', {}).get('spike', 0)}\n"
        section += f"- **暴跌异常**: {stats.get('anomaly_by_type', {}).get('drop', 0)}\n\n"
        
        section += '### 分解效果\n\n'
        section += f"- **趋势解释度**: {stats.get('trend_strength', 0)*100:.1f}%\n"
        section += f"- **季节解释度**: {stats.get('seasonal_strength', 0)*100:.1f}%\n"
        section += f"- **总体方差解释**: {stats.get('explained_variance', 0)*100:.1f}%\n\n"
        
        return section

    def _generate_quality_section(self, result: Dict) -> str:
        section = '## 数据质量检查\n\n'
        
        quality_result = result.get('quality_result', 'PASS')
        quality_emoji = '✅' if quality_result == 'PASS' else '⚠️'
        
        section += f'**检查结果**: {quality_emoji} {quality_result}\n\n'
        
        issues = result.get('quality_issues_detail', [])
        if not issues:
            section += '> 未发现数据质量问题\n\n'
            return section
        
        high_issues = [i for i in issues if (i.severity if hasattr(i, 'severity') else i.get('severity')) == 'high']
        medium_issues = [i for i in issues if (i.severity if hasattr(i, 'severity') else i.get('severity')) == 'medium']
        
        section += f'- 🔴 **严重问题**: {len(high_issues)} 个\n'
        section += f'- 🟡 **中等问题**: {len(medium_issues)} 个\n'
        section += f'- 🔵 **一般问题**: {len(issues) - len(high_issues) - len(medium_issues)} 个\n\n'
        
        section += '### 问题详情\n\n'
        for issue in issues:
            severity = issue.severity if hasattr(issue, 'severity') else issue.get('severity', 'low')
            message = issue.message if hasattr(issue, 'message') else issue.get('message', '')
            emoji = '🔴' if severity == 'high' else '🟡' if severity == 'medium' else '🔵'
            section += f'{emoji} **{message}**\n\n'
        
        gaps = result.get('sampling_gaps', pd.DataFrame())
        if not gaps.empty:
            section += '### 采样中断详情\n\n'
            section += '> 注意：采样中断可能导致分析结果不准确，请确认数据完整性\n\n'
            for _, gap in gaps.iterrows():
                duration = gap.get('duration', 'N/A')
                missing = gap.get('missing_points', 0)
                section += f"- **{gap['gap_start'].strftime('%Y-%m-%d %H:%M')}** ~ "
                section += f"**{gap['gap_end'].strftime('%Y-%m-%d %H:%M')}** "
                section += f"中断 {duration}, 缺失 {missing} 个点\n"
            section += '\n'
        
        return section

    def _generate_anomaly_section(self, result: Dict) -> str:
        section = '## 异常检测与归因\n\n'
        
        anomalies = result.get('annotated_anomalies', pd.DataFrame())
        if anomalies.empty:
            section += '> 未检测到异常点\n\n'
            return section
        
        section += '### 异常归因分布\n\n'
        cause_dist = result.get('cause_distribution', {})
        for cause, count in cause_dist.items():
            section += f"- {cause}: {count} 个\n"
        section += '\n'
        
        section += '### 异常明细\n\n'
        
        critical = anomalies[anomalies['severity'] == 'critical'] if 'severity' in anomalies.columns else pd.DataFrame()
        high = anomalies[anomalies['severity'] == 'high'] if 'severity' in anomalies.columns else pd.DataFrame()
        
        top_anomalies = pd.concat([critical, high]).head(10)
        
        if not top_anomalies.empty:
            for _, row in top_anomalies.iterrows():
                severity = row.get('severity', 'medium')
                severity_emoji = '🔴' if severity == 'critical' else '🟠' if severity == 'high' else '🟡'
                
                section += f"#### {severity_emoji} {row['timestamp'].strftime('%Y-%m-%d %H:%M')}\n\n"
                section += f"- **类型**: {'暴涨' if row.get('anomaly_type') == 'spike' else '暴跌'}\n"
                section += f"- **实际值**: {row.get('value', 0):.2f}\n"
                section += f"- **预期值**: {row.get('expected', 0):.2f}\n"
                section += f"- **偏离程度**: {row.get('deviation_pct', 0):+.1f}%\n"
                
                cause_desc = row.get('primary_cause_desc', '原因待查')
                human_readable = row.get('human_readable', '')
                
                section += f"- **归因结果**: {cause_desc}\n"
                section += f"- **置信度**: {row.get('cause_confidence', 0)*100:.0f}%\n\n"
                
                if human_readable:
                    section += f"> {human_readable}\n\n"
        
        return section

    def _generate_calendar_section(self, result: Dict) -> str:
        section = '## 日历与活动信息\n\n'
        
        conflicts = result.get('calendar_conflicts', [])
        overlaps = result.get('event_overlaps', [])
        
        if conflicts:
            section += f'### ⚠️ 日历数据冲突 ({len(conflicts)} 处)\n\n'
            section += '> 以下日期在不同数据源中的标记不一致，需要人工确认\n\n'
            for c in conflicts[:5]:
                section += f"- **{c.timestamp.strftime('%Y-%m-%d')}**: "
                section += f"`{c.source_a}`标记为`{c.value_a}`，"
                section += f"`{c.source_b}`标记为`{c.value_b}`\n"
            if len(conflicts) > 5:
                section += f"\n... 还有 {len(conflicts) - 5} 处冲突，请查看完整数据\n"
            section += '\n'
        
        if overlaps:
            section += f'### 📅 活动重叠 ({len(overlaps)} 处)\n\n'
            section += '> 以下活动时间存在重叠，可能产生复合效应\n\n'
            for o in overlaps[:5]:
                section += f"- **{o.event1_name}** ({o.event1_source}) 与 "
                section += f"**{o.event2_name}** ({o.event2_source}) 重叠 "
                section += f"{o.overlap_duration}\n"
            if len(overlaps) > 5:
                section += f"\n... 还有 {len(overlaps) - 5} 处重叠\n"
            section += '\n'
        
        if not conflicts and not overlaps:
            section += '> 日历数据检查通过，未发现冲突或重叠\n\n'
        
        return section

    def _generate_conclusion_section(self, result: Dict) -> str:
        section = '## 总结与建议\n\n'
        
        stats = result.get('stats', {})
        quality_result = result.get('quality_result', 'PASS')
        
        anomaly_count = stats.get('anomaly_count', 0)
        cause_dist = result.get('cause_distribution', {})
        
        if quality_result != 'PASS':
            section += '### ⚠️ 数据质量优先处理\n\n'
            section += '存在数据质量问题，可能影响分析准确性。建议：\n'
            section += '- 优先修复采样中断，确保数据完整性\n'
            section += '- 确认并统一不同来源的日历数据\n'
            section += '- 检查时区设置是否正确\n\n'
        
        if anomaly_count > 0:
            section += '### 📊 异常分析结论\n\n'
            
            main_causes = sorted(cause_dist.items(), key=lambda x: x[1], reverse=True)[:3]
            if main_causes:
                section += f"主要异常原因: {', '.join([c[0] for c in main_causes])}\n\n"
            
            section += '### 💡 建议行动\n\n'
            section += '- 将严重异常事件同步给相关业务团队\n'
            section += '- 对原因待查的异常进行人工复核\n'
            section += '- 月底复盘时导出完整数据进行回顾\n\n'
        else:
            section += '### ✅ 运行平稳\n\n'
            section += '未检测到明显异常，业务运行平稳。\n\n'
        
        return section
