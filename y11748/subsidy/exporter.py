import csv
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from .models import ProcessedResult, DailySummary


class ResultExporter:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_timestamp(self) -> str:
        return datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def export_summary_csv(self, results: List[ProcessedResult], filename: str = None) -> str:
        if not filename:
            filename = f"subsidy_summary_{self._get_timestamp()}.csv"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '车辆ID', '统计开始', '统计结束', '总里程(km)', '有效里程(km)',
                '总充电量(kWh)', '营运天数', '有效天数', '预估补贴(元)',
                '异常数', '修正数', '规则版本', '处理状态'
            ])
            
            for r in results:
                has_error = any(a.severity == "error" for a in r.all_anomalies)
                status = "需人工复核" if has_error else "正常"
                writer.writerow([
                    r.vehicle_id,
                    r.period_start.isoformat(),
                    r.period_end.isoformat(),
                    r.total_mileage,
                    r.valid_mileage,
                    r.total_charged_kwh,
                    r.operating_days,
                    r.valid_days,
                    r.estimated_subsidy,
                    len(r.all_anomalies),
                    len(r.all_corrections),
                    r.subsidy_rule_applied.rule_id if r.subsidy_rule_applied else "",
                    status
                ])
        
        return str(filepath)
    
    def export_daily_details_csv(self, results: List[ProcessedResult], filename: str = None) -> str:
        if not filename:
            filename = f"daily_details_{self._get_timestamp()}.csv"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '车辆ID', '日期', '当日里程', '充电量', '是否营运', '在线时长',
                '里程有效', '充电有效', '营运有效', '日期有效',
                '异常描述', '修正说明', '数据来源'
            ])
            
            for r in results:
                for ds in r.daily_summaries:
                    anomaly_descs = "; ".join([f"[{a.severity}]{a.description}" for a in ds.anomalies])
                    correction_descs = "; ".join([f"{c.reason}({c.original_value}→{c.corrected_value})" for c in ds.corrections])
                    sources = set()
                    for a in ds.anomalies:
                        pass
                    for c in ds.corrections:
                        sources.add(c.source_record)
                    
                    writer.writerow([
                        ds.vehicle_id,
                        ds.summary_date.isoformat(),
                        ds.mileage,
                        ds.charged_kwh,
                        "是" if ds.is_operating else "否",
                        ds.online_hours,
                        "是" if ds.mileage_valid else "否",
                        "是" if ds.charging_valid else "否",
                        "是" if ds.operation_valid else "否",
                        "是" if ds.is_valid_day else "否",
                        anomaly_descs,
                        correction_descs,
                        ", ".join(sources)
                    ])
        
        return str(filepath)
    
    def export_anomalies_csv(self, results: List[ProcessedResult], filename: str = None) -> str:
        if not filename:
            filename = f"anomalies_{self._get_timestamp()}.csv"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '车辆ID', '异常日期', '异常类型', '严重程度',
                '描述', '原始值', '期望值', '处理建议'
            ])
            
            suggestions = {
                "mileage_decrease": "检查里程采集设备，核实当日实际行驶情况",
                "mileage_gap": "可采用插值结果，或补充当日实际里程凭证",
                "charging_gap": "核实充电记录完整性，补充遗漏的充电数据",
                "invalid_operation_day": "复核营运日历准确性，修正停运/营运标记",
                "suspicious_mileage": "确认当日是否存在特殊运营情况（如长途包车）"
            }
            
            for r in results:
                for a in r.all_anomalies:
                    writer.writerow([
                        a.vehicle_id,
                        a.date.isoformat(),
                        a.anomaly_type.value,
                        a.severity,
                        a.description,
                        a.raw_value if a.raw_value is not None else "",
                        a.expected_value if a.expected_value is not None else "",
                        suggestions.get(a.anomaly_type.value, "请人工核实")
                    ])
        
        return str(filepath)
    
    def export_corrections_csv(self, results: List[ProcessedResult], filename: str = None) -> str:
        if not filename:
            filename = f"correction_traces_{self._get_timestamp()}.csv"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '车辆ID', '修正日期', '修正类型',
                '原始值', '修正值', '修正原因', '来源记录'
            ])
            
            for r in results:
                for c in r.all_corrections:
                    writer.writerow([
                        c.vehicle_id,
                        c.date.isoformat(),
                        c.correction_type.value,
                        c.original_value if c.original_value is not None else "",
                        c.corrected_value if c.corrected_value is not None else "",
                        c.reason,
                        c.source_record
                    ])
        
        return str(filepath)
    
    def export_all(self, results: List[ProcessedResult]) -> Dict[str, str]:
        return {
            "summary": self.export_summary_csv(results),
            "daily_details": self.export_daily_details_csv(results),
            "anomalies": self.export_anomalies_csv(results),
            "corrections": self.export_corrections_csv(results)
        }
    
    def export_declaration_report(self, results: List[ProcessedResult], filename: str = None) -> str:
        if not filename:
            filename = f"declaration_report_{self._get_timestamp()}.csv"
        
        filepath = self.output_dir / filename
        
        eligible_results = [r for r in results if r.estimated_subsidy > 0]
        
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['新能源车辆运营补贴申报明细表'])
            writer.writerow([])
            writer.writerow(['申报单位:', '', '', '', '', '申报日期:', datetime.now().strftime('%Y-%m-%d')])
            writer.writerow([])
            writer.writerow([
                '序号', '车辆ID', '车牌号', '车型',
                '月营运天数', '月有效里程(km)', '月充电量(kWh)',
                '补贴标准(元/km)', '申报补贴(元)', '备注'
            ])
            
            for idx, r in enumerate(eligible_results, 1):
                from .data_reader import DataReader
                writer.writerow([
                    idx,
                    r.vehicle_id,
                    '',
                    '',
                    r.valid_days,
                    r.valid_mileage,
                    r.total_charged_kwh,
                    r.subsidy_rule_applied.subsidy_per_km if r.subsidy_rule_applied else 0,
                    r.estimated_subsidy,
                    '异常待核' if r.all_anomalies else ''
                ])
            
            writer.writerow([])
            writer.writerow(['合计', '', '', '',
                sum(r.valid_days for r in eligible_results),
                sum(r.valid_mileage for r in eligible_results),
                sum(r.total_charged_kwh for r in eligible_results),
                '',
                sum(r.estimated_subsidy for r in eligible_results),
                ''
            ])
        
        return str(filepath)
