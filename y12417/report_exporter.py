import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import List, Dict, Optional

from models import DailySettlementReport, DailySettlementItem, SettlementException, ExceptionType
from correction_guide import CorrectionGuide


class ReportExporter:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def export_full_report(
        self,
        report: DailySettlementReport,
        exceptions: List[SettlementException],
        format: str = "csv"
    ) -> Dict[str, str]:
        """导出完整报告：明细 + 异常 + 汇总"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        date_str = report.settlement_date.strftime("%Y%m%d")
        
        result = {}
        
        detail_file = self.output_dir / f"settlement_detail_{date_str}_{timestamp}.csv"
        self.export_settlement_details(report, str(detail_file))
        result["detail"] = str(detail_file)
        
        exception_file = self.output_dir / f"settlement_exception_{date_str}_{timestamp}.csv"
        self.export_exceptions(exceptions, str(exception_file))
        result["exception"] = str(exception_file)
        
        summary_file = self.output_dir / f"settlement_summary_{date_str}_{timestamp}.txt"
        self.export_summary_report(report, exceptions, str(summary_file))
        result["summary"] = str(summary_file)
        
        human_readable_file = self.output_dir / f"business_report_{date_str}_{timestamp}.txt"
        self.export_human_readable_report(report, exceptions, str(human_readable_file))
        result["business_report"] = str(human_readable_file)
        
        json_file = self.output_dir / f"settlement_{date_str}_{timestamp}.json"
        self.export_to_json(report, exceptions, str(json_file))
        result["json"] = str(json_file)
        
        return result

    def export_settlement_details(
        self,
        report: DailySettlementReport,
        file_path: str
    ) -> None:
        """导出结算明细CSV"""
        headers = [
            "结算ID", "合约编号", "账户编号", "账户名称",
            "证券代码", "证券名称", "借券数量", "结算日期",
            "费率版本", "应用费率(%)", "计算天数",
            "基础费用", "展期费用", "跨日调整", "费用合计",
            "计算过程", "异常数量", "异常类型"
        ]
        
        with open(file_path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            for item in report.items:
                exception_types = ";".join([
                    exc.exception_type.value for exc in item.exceptions
                ]) if item.exceptions else ""
                
                row = [
                    item.settlement_id,
                    item.contract_id,
                    item.account_id,
                    item.account_name,
                    item.security_code,
                    item.security_name,
                    item.quantity,
                    item.settlement_date.strftime("%Y-%m-%d"),
                    item.rate_version_id,
                    f"{item.rate:.4f}",
                    item.days,
                    f"{item.base_fee:.2f}",
                    f"{item.extension_fee:.2f}",
                    f"{item.cross_day_adjustment:.2f}",
                    f"{item.total_fee:.2f}",
                    item.calculation_details,
                    len(item.exceptions),
                    exception_types
                ]
                writer.writerow(row)

    def export_exceptions(
        self,
        exceptions: List[SettlementException],
        file_path: str
    ) -> None:
        """导出异常明细CSV"""
        headers = [
            "异常ID", "异常类型", "严重级别", "标题",
            "详细描述", "修正建议",
            "关联合约", "关联证券", "关联账户", "关联日期",
            "来源字段"
        ]
        
        with open(file_path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            for exc in exceptions:
                row = [
                    exc.exception_id,
                    exc.exception_type.value,
                    exc.severity,
                    exc.title,
                    exc.description,
                    exc.suggestion,
                    exc.related_contract_id or "",
                    exc.related_security_code or "",
                    exc.related_account_id or "",
                    exc.related_date.strftime("%Y-%m-%d") if exc.related_date else "",
                    exc.source_field or ""
                ]
                writer.writerow(row)

    def export_summary_report(
        self,
        report: DailySettlementReport,
        exceptions: List[SettlementException],
        file_path: str
    ) -> None:
        """导出汇总报告（文本格式）"""
        lines = []
        
        lines.append("=" * 80)
        lines.append("证券借券费用日结汇总报告")
        lines.append("=" * 80)
        lines.append(f"报告编号: {report.report_id}")
        lines.append(f"结算日期: {report.settlement_date.strftime('%Y年%m月%d日')}")
        lines.append(f"生成时间: {report.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"生成方式: {report.generated_by}")
        lines.append("-" * 80)
        
        lines.append("\n【结算汇总】")
        lines.append(f"  有效合约数: {report.total_contracts} 份")
        lines.append(f"  费用合计:   ¥ {report.total_fee:>12,.2f}")
        
        fee_breakdown = self._calculate_fee_breakdown(report)
        lines.append(f"  - 基础费用: ¥ {fee_breakdown['base']:>12,.2f}")
        lines.append(f"  - 展期费用: ¥ {fee_breakdown['extension']:>12,.2f}")
        lines.append(f"  - 跨日调整: ¥ {fee_breakdown['cross_day']:>12,.2f}")
        
        lines.append("\n【异常统计】")
        exc_summary = self._summarize_exceptions(exceptions)
        lines.append(f"  异常总数: {exc_summary['total']} 项")
        lines.append(f"  - 高危 (HIGH):   {exc_summary['HIGH']} 项")
        lines.append(f"  - 中危 (MEDIUM): {exc_summary['MEDIUM']} 项")
        lines.append(f"  - 低危 (LOW):    {exc_summary['LOW']} 项")
        
        lines.append("\n【异常类型分布】")
        for exc_type, count in exc_summary.items():
            if exc_type not in ['total', 'HIGH', 'MEDIUM', 'LOW'] and count > 0:
                type_name = self._get_exception_type_name(exc_type)
                lines.append(f"  - {type_name}: {count} 项")
        
        lines.append("\n" + "=" * 80)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

    def export_human_readable_report(
        self,
        report: DailySettlementReport,
        exceptions: List[SettlementException],
        file_path: str
    ) -> None:
        """导出业务友好的可读报告"""
        lines = []
        
        lines.append("╔" + "═" * 78 + "╗")
        lines.append("║" + " " * 25 + "证券借券费用日结报告" + " " * 30 + "║")
        lines.append("╚" + "═" * 78 + "╝")
        lines.append("")
        lines.append(f"📅 结算日期: {report.settlement_date.strftime('%Y年%m月%d日')}")
        lines.append(f"⏰ 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        lines.append("┌" + "─" * 76 + "┐")
        lines.append("│  一、费用汇总" + " " * 65 + "│")
        lines.append("├" + "─" * 76 + "┤")
        lines.append(f"│  有效合约: {report.total_contracts:>5} 份" + " " * 58 + "│")
        lines.append(f"│  费用总计: ¥ {report.total_fee:>12,.2f}" + " " * 52 + "│")
        lines.append("│" + " " * 76 + "│")
        
        fee_breakdown = self._calculate_fee_breakdown(report)
        lines.append(f"│    基础费用: ¥ {fee_breakdown['base']:>12,.2f}" + " " * 50 + "│")
        if fee_breakdown['extension'] > 0:
            lines.append(f"│    展期费用: ¥ {fee_breakdown['extension']:>12,.2f}" + " " * 50 + "│")
        if fee_breakdown['cross_day'] != 0:
            lines.append(f"│    跨日调整: ¥ {fee_breakdown['cross_day']:>12,.2f}" + " " * 50 + "│")
        
        lines.append("└" + "─" * 76 + "┘")
        lines.append("")
        
        cross_day_exceptions = [e for e in exceptions if e.exception_type == ExceptionType.CROSS_DAY_RETURN]
        if cross_day_exceptions:
            lines.append("┌" + "─" * 76 + "┐")
            lines.append("│  ⚠️  归还跨日特别说明" + " " * 56 + "│")
            lines.append("├" + "─" * 76 + "┤")
            lines.append(f"│  今日共发现 {len(cross_day_exceptions)} 笔归还跨日情况" + " " * 47 + "│")
            lines.append("│" + " " * 76 + "│")
            
            for i, exc in enumerate(cross_day_exceptions[:5], 1):
                lines.append(f"│  {i}. {exc.title}" + " " * (72 - len(exc.title)) + "│")
            
            if len(cross_day_exceptions) > 5:
                lines.append(f"│  ... 还有 {len(cross_day_exceptions) - 5} 笔" + " " * 57 + "│")
            
            lines.append("│" + " " * 76 + "│")
            lines.append("│  💡 说明: 归还跨日是指客户未能在到期日归还借券，" + " " * 29 + "│")
            lines.append("│     需按实际占用天数补收费用。请与业务确认是否正常。" + " " * 30 + "│")
            lines.append("└" + "─" * 76 + "┘")
            lines.append("")
        
        high_exceptions = [e for e in exceptions if e.severity == "HIGH"]
        if high_exceptions:
            lines.append("┌" + "─" * 76 + "┐")
            lines.append("│  🔴 需紧急处理的问题" + " " * 57 + "│")
            lines.append("├" + "─" * 76 + "┤")
            
            for i, exc in enumerate(high_exceptions, 1):
                title = exc.title[:65]
                lines.append(f"│  {i}. {title}" + " " * (72 - len(title)) + "│")
            
            lines.append("│" + " " * 76 + "│")
            lines.append("│  请立即处理以上问题，处理完成后重新日结" + " " * 38 + "│")
            lines.append("└" + "─" * 76 + "┘")
            lines.append("")
        
        action_plan = CorrectionGuide.generate_action_plan(exceptions)
        if action_plan["urgent"] or action_plan["review"]:
            lines.append("┌" + "─" * 76 + "┐")
            lines.append("│  📋 今日待办事项" + " " * 60 + "│")
            lines.append("├" + "─" * 76 + "┤")
            lines.append(f"│  需立即处理: {len(action_plan['urgent']):>3} 项" + " " * 55 + "│")
            lines.append(f"│  需人工审核: {len(action_plan['review']):>3} 项" + " " * 55 + "│")
            lines.append("│" + " " * 76 + "│")
            lines.append("│  详细待办清单请查看异常修正指引文件" + " " * 42 + "│")
            lines.append("└" + "─" * 76 + "┘")
            lines.append("")
        
        lines.append("┌" + "─" * 76 + "┐")
        lines.append("│  📊 前10大费用明细" + " " * 59 + "│")
        lines.append("├" + "─" * 76 + "┤")
        
        sorted_items = sorted(report.items, key=lambda x: x.total_fee, reverse=True)[:10]
        for i, item in enumerate(sorted_items, 1):
            name = item.account_name[:12] if len(item.account_name) > 12 else item.account_name
            security = item.security_name[:10] if len(item.security_name) > 10 else item.security_name
            line = f"│  {i:2d}. {name:<12} {security:<10} ¥{item.total_fee:>10,.2f}"
            lines.append(line + " " * (77 - len(line)) + "│")
        
        lines.append("└" + "─" * 76 + "┘")
        lines.append("")
        
        lines.append("─" * 80)
        lines.append("💾 相关文件:")
        lines.append("   - 结算明细: settlement_detail_*.csv")
        lines.append("   - 异常清单: settlement_exception_*.csv")
        lines.append("   - 修正指引: 请运行 check 命令查看")
        lines.append("─" * 80)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

    def export_to_json(
        self,
        report: DailySettlementReport,
        exceptions: List[SettlementException],
        file_path: str
    ) -> None:
        """导出JSON格式（用于系统对接）"""
        data = {
            "report_id": report.report_id,
            "settlement_date": report.settlement_date.isoformat(),
            "created_at": report.created_at.isoformat(),
            "summary": {
                "total_contracts": report.total_contracts,
                "total_fee": report.total_fee
            },
            "items": [
                {
                    "settlement_id": item.settlement_id,
                    "contract_id": item.contract_id,
                    "account_id": item.account_id,
                    "account_name": item.account_name,
                    "security_code": item.security_code,
                    "security_name": item.security_name,
                    "quantity": item.quantity,
                    "rate": item.rate,
                    "rate_version_id": item.rate_version_id,
                    "days": item.days,
                    "base_fee": item.base_fee,
                    "extension_fee": item.extension_fee,
                    "cross_day_adjustment": item.cross_day_adjustment,
                    "total_fee": item.total_fee,
                    "calculation_details": item.calculation_details,
                    "exceptions_count": len(item.exceptions)
                }
                for item in report.items
            ],
            "exceptions": [
                {
                    "exception_id": exc.exception_id,
                    "type": exc.exception_type.value,
                    "severity": exc.severity,
                    "title": exc.title,
                    "description": exc.description,
                    "suggestion": exc.suggestion,
                    "related_contract_id": exc.related_contract_id,
                    "related_security_code": exc.related_security_code,
                    "related_account_id": exc.related_account_id,
                    "related_date": exc.related_date.isoformat() if exc.related_date else None
                }
                for exc in exceptions
            ]
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _calculate_fee_breakdown(self, report: DailySettlementReport) -> Dict[str, float]:
        return {
            "base": sum(item.base_fee for item in report.items),
            "extension": sum(item.extension_fee for item in report.items),
            "cross_day": sum(item.cross_day_adjustment for item in report.items)
        }

    def _summarize_exceptions(self, exceptions: List[SettlementException]) -> Dict[str, int]:
        summary = {
            "total": len(exceptions),
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0
        }
        
        for exc in exceptions:
            exc_type = exc.exception_type.value
            if exc_type not in summary:
                summary[exc_type] = 0
            summary[exc_type] += 1
            summary[exc.severity] += 1
        
        return summary

    def _get_exception_type_name(self, exc_type: str) -> str:
        type_names = {
            "CROSS_DAY_RETURN": "归还跨日",
            "RATE_EXPIRED": "费率过期",
            "EXTENSION_MISSED": "展期漏算",
            "RATE_MISSING": "费率缺失",
            "ACCOUNT_NAME_CHANGED": "账户更名",
            "DATA_INCOMPLETE": "数据不完整"
        }
        return type_names.get(exc_type, exc_type)
