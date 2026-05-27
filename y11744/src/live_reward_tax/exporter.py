"""报告导出模块"""
import os
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from decimal import Decimal
import pandas as pd

from .models import SettlementReport, SettlementDetail


def decimal_to_str(value: Decimal) -> str:
    """Decimal转字符串，保留2位小数"""
    return str(value.quantize(Decimal('0.01')))


class ReportExporter:
    """报告导出器"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_run_prefix(self) -> str:
        """生成运行时前缀，保证幂等性"""
        return datetime.now().strftime('%Y%m%d_%H%M%S')
    
    def _ensure_period_dir(self, period: str, run_prefix: str) -> Path:
        """确保周期目录存在"""
        period_dir = self.output_dir / period / run_prefix
        period_dir.mkdir(parents=True, exist_ok=True)
        return period_dir
    
    def export_to_csv(self, report: SettlementReport, run_prefix: str) -> Path:
        """导出为CSV格式"""
        period_dir = self._ensure_period_dir(report.settlement_period, run_prefix)
        filepath = period_dir / f"settlement_{report.settlement_period}.csv"
        
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            
            writer.writerow(['结算报告', report.report_id])
            writer.writerow(['生成时间', report.generated_at.strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow(['结算周期', report.settlement_period])
            writer.writerow(['主播数量', report.total_streamers])
            writer.writerow(['打赏总额', decimal_to_str(report.total_rewards)])
            writer.writerow(['退款总额', decimal_to_str(report.total_refunds)])
            writer.writerow(['个税总额', decimal_to_str(report.total_tax)])
            writer.writerow(['主播实发总额', decimal_to_str(report.total_streamer_net)])
            writer.writerow([])
            
            if report.warnings:
                writer.writerow(['【警告】'])
                for warning in report.warnings:
                    writer.writerow([warning])
                writer.writerow([])
            
            if report.errors:
                writer.writerow(['【错误】'])
                for error in report.errors:
                    writer.writerow([error])
                writer.writerow([])
            
            writer.writerow([
                '主播ID', '主播姓名', '打赏总额', '退款金额', '净打赏',
                '平台分成', '公会分成', '主播税前', '个税', '主播实发',
                '分成版本', '税率规则', '打赏笔数', '退款笔数',
                '跨期退款', '备注'
            ])
            
            for detail in report.details:
                writer.writerow([
                    detail.streamer_id,
                    detail.streamer_name,
                    decimal_to_str(detail.total_rewards),
                    decimal_to_str(detail.refund_amount),
                    decimal_to_str(detail.net_rewards),
                    decimal_to_str(detail.platform_share),
                    decimal_to_str(detail.guild_share),
                    decimal_to_str(detail.streamer_gross),
                    decimal_to_str(detail.tax_amount),
                    decimal_to_str(detail.streamer_net),
                    detail.share_version or '',
                    detail.tax_rule_used or '',
                    detail.reward_count,
                    detail.refund_count,
                    ','.join(detail.cross_period_refunds),
                    '; '.join(detail.warnings),
                ])
        
        return filepath
    
    def export_to_excel(self, report: SettlementReport, run_prefix: str) -> Path:
        """导出为Excel格式"""
        period_dir = self._ensure_period_dir(report.settlement_period, run_prefix)
        filepath = period_dir / f"settlement_{report.settlement_period}.xlsx"
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            summary_data = {
                '项目': [
                    '报告ID', '生成时间', '结算周期', '主播数量',
                    '打赏总额', '退款总额', '个税总额', '主播实发总额'
                ],
                '数值': [
                    report.report_id,
                    report.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    report.settlement_period,
                    report.total_streamers,
                    float(report.total_rewards),
                    float(report.total_refunds),
                    float(report.total_tax),
                    float(report.total_streamer_net),
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='汇总', index=False)
            
            details_data = []
            for detail in report.details:
                details_data.append({
                    '主播ID': detail.streamer_id,
                    '主播姓名': detail.streamer_name,
                    '打赏总额': float(detail.total_rewards),
                    '退款金额': float(detail.refund_amount),
                    '净打赏': float(detail.net_rewards),
                    '平台分成': float(detail.platform_share),
                    '公会分成': float(detail.guild_share),
                    '主播税前': float(detail.streamer_gross),
                    '个税': float(detail.tax_amount),
                    '主播实发': float(detail.streamer_net),
                    '分成版本': detail.share_version or '',
                    '税率规则': detail.tax_rule_used or '',
                    '打赏笔数': detail.reward_count,
                    '退款笔数': detail.refund_count,
                    '跨期退款': ','.join(detail.cross_period_refunds),
                    '备注': '; '.join(detail.warnings),
                })
            
            if details_data:
                pd.DataFrame(details_data).to_excel(writer, sheet_name='明细', index=False)
            
            if report.warnings:
                warnings_data = {'警告': report.warnings}
                pd.DataFrame(warnings_data).to_excel(writer, sheet_name='警告', index=False)
            
            if report.errors:
                errors_data = {'错误': report.errors}
                pd.DataFrame(errors_data).to_excel(writer, sheet_name='错误', index=False)
        
        return filepath
    
    def export_to_json(self, report: SettlementReport, run_prefix: str) -> Path:
        """导出为JSON格式（包含完整溯源信息）"""
        period_dir = self._ensure_period_dir(report.settlement_period, run_prefix)
        filepath = period_dir / f"settlement_{report.settlement_period}.json"
        
        report_dict = {
            'report_id': report.report_id,
            'generated_at': report.generated_at.isoformat(),
            'settlement_period': report.settlement_period,
            'summary': {
                'total_streamers': report.total_streamers,
                'total_rewards': decimal_to_str(report.total_rewards),
                'total_refunds': decimal_to_str(report.total_refunds),
                'total_tax': decimal_to_str(report.total_tax),
                'total_streamer_net': decimal_to_str(report.total_streamer_net),
            },
            'details': [
                {
                    'streamer_id': d.streamer_id,
                    'streamer_name': d.streamer_name,
                    'total_rewards': decimal_to_str(d.total_rewards),
                    'refund_amount': decimal_to_str(d.refund_amount),
                    'net_rewards': decimal_to_str(d.net_rewards),
                    'platform_share': decimal_to_str(d.platform_share),
                    'guild_share': decimal_to_str(d.guild_share),
                    'streamer_gross': decimal_to_str(d.streamer_gross),
                    'tax_amount': decimal_to_str(d.tax_amount),
                    'streamer_net': decimal_to_str(d.streamer_net),
                    'share_version': d.share_version,
                    'tax_rule_used': d.tax_rule_used,
                    'reward_count': d.reward_count,
                    'refund_count': d.refund_count,
                    'cross_period_refunds': d.cross_period_refunds,
                    'warnings': d.warnings,
                }
                for d in report.details
            ],
            'warnings': report.warnings,
            'errors': report.errors,
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def export_manifest(self, run_prefix: str, reports: List[SettlementReport],
                        formats: List[str]) -> Path:
        """导出运行清单，记录本次运行的所有文件"""
        manifest = {
            'run_id': run_prefix,
            'generated_at': datetime.now().isoformat(),
            'reports': [],
        }
        
        for report in reports:
            report_info = {
                'period': report.settlement_period,
                'report_id': report.report_id,
                'files': {},
            }
            for fmt in formats:
                filename = f"settlement_{report.settlement_period}.{fmt}"
                report_info['files'][fmt] = f"{report.settlement_period}/{run_prefix}/{filename}"
            manifest['reports'].append(report_info)
        
        manifest_path = self.output_dir / f"manifest_{run_prefix}.json"
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        
        return manifest_path
    
    def export_all(self, reports: List[SettlementReport],
                   formats: List[str] = None) -> Dict[str, List[Path]]:
        """导出所有报告，支持多格式
        
        Args:
            reports: 结算报告列表
            formats: 导出格式列表，支持 ['csv', 'excel', 'json']，默认全部
        
        Returns:
            各格式导出的文件路径字典
        """
        if formats is None:
            formats = ['csv', 'excel', 'json']
        
        run_prefix = self._get_run_prefix()
        result: Dict[str, List[Path]] = {fmt: [] for fmt in formats}
        
        for report in reports:
            if 'csv' in formats:
                result['csv'].append(self.export_to_csv(report, run_prefix))
            if 'excel' in formats:
                result['excel'].append(self.export_to_excel(report, run_prefix))
            if 'json' in formats:
                result['json'].append(self.export_to_json(report, run_prefix))
        
        self.export_manifest(run_prefix, reports, formats)
        
        return result
