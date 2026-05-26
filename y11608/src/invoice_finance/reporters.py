"""报告生成器"""
import json
from datetime import datetime
from typing import Dict, List, Any
from io import StringIO

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

from .models import (
    ProcessingSummary, InvoiceProcessingResult, RiskAlert,
    ProcessingStatus, RiskType
)
from .engine import InvoiceFinanceEngine


class ReportGenerator:
    """报告生成器"""

    def __init__(self, engine: InvoiceFinanceEngine):
        self.engine = engine
        self.console = Console()

    def generate_terminal_summary(self, summary: ProcessingSummary) -> str:
        """生成终端摘要"""
        output = StringIO()
        console = Console(file=output, force_terminal=True)

        console.print()
        title = Text("发票融资额度占用处理报告", style="bold blue", justify="center")
        console.print(Panel(title, border_style="blue"))

        console.print(f"\n[dim]生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/dim]")

        total_table = Table(title="总体概览", box=box.SIMPLE, show_header=True)
        total_table.add_column("指标", style="cyan")
        total_table.add_column("数量", justify="right")
        total_table.add_column("金额(元)", justify="right")
        total_table.add_row("发票总数", str(summary.total_invoices), f"{summary.total_amount:,.2f}")
        total_table.add_row("风险告警总数", str(summary.total_risk_alerts), "-")
        console.print(total_table)

        status_table = Table(title="处理状态分布", box=box.SIMPLE, show_header=True)
        status_table.add_column("状态", style="cyan")
        status_table.add_column("数量", justify="right")
        status_table.add_column("占比", justify="right")
        status_table.add_column("金额(元)", justify="right")
        status_table.add_column("金额占比", justify="right")

        if summary.total_invoices > 0:
            status_table.add_row(
                "[green]正常[/green]",
                str(summary.normal_count),
                f"{summary.normal_count / summary.total_invoices * 100:.1f}%",
                f"{summary.normal_amount:,.2f}",
                f"{summary.normal_amount / summary.total_amount * 100:.1f}%" if summary.total_amount > 0 else "0.0%"
            )
            status_table.add_row(
                "[yellow]已修正[/yellow]",
                str(summary.corrected_count),
                f"{summary.corrected_count / summary.total_invoices * 100:.1f}%",
                f"{summary.corrected_amount:,.2f}",
                f"{summary.corrected_amount / summary.total_amount * 100:.1f}%" if summary.total_amount > 0 else "0.0%"
            )
            status_table.add_row(
                "[red]需人工确认[/red]",
                str(summary.need_manual_count),
                f"{summary.need_manual_count / summary.total_invoices * 100:.1f}%",
                f"{summary.need_manual_amount:,.2f}",
                f"{summary.need_manual_amount / summary.total_amount * 100:.1f}%" if summary.total_amount > 0 else "0.0%"
            )
            status_table.add_row(
                "[dim]未处理[/dim]",
                str(summary.unprocessed_count),
                f"{summary.unprocessed_count / summary.total_invoices * 100:.1f}%",
                f"{summary.unprocessed_amount:,.2f}",
                f"{summary.unprocessed_amount / summary.total_amount * 100:.1f}%" if summary.total_amount > 0 else "0.0%"
            )

        console.print(status_table)

        if summary.risk_breakdown:
            risk_table = Table(title="风险类型分布", box=box.SIMPLE, show_header=True)
            risk_table.add_column("风险类型", style="cyan")
            risk_table.add_column("数量", justify="right")
            risk_table.add_column("占比", justify="right")

            for risk_type, count in summary.risk_breakdown.items():
                pct = f"{count / summary.total_risk_alerts * 100:.1f}%" if summary.total_risk_alerts > 0 else "0.0%"
                risk_table.add_row(self._format_risk_type(risk_type), str(count), pct)

            console.print(risk_table)

        if summary.need_manual_count > 0:
            console.print(f"\n[bold red]⚠️  有 {summary.need_manual_count} 张发票需要人工确认，请优先处理[/bold red]")

        if summary.corrected_count > 0:
            console.print(f"\n[bold yellow]ℹ️  系统自动修正了 {summary.corrected_count} 张发票的问题，请核对修正痕迹[/bold yellow]")

        return output.getvalue()

    def generate_detail_report(self, status_filter: ProcessingStatus = None) -> str:
        """生成详细报告"""
        output = StringIO()
        console = Console(file=output, force_terminal=True)

        results = list(self.engine.processing_results.values())
        if status_filter:
            results = [r for r in results if r.status == status_filter]

        if not results:
            console.print("[dim]没有符合条件的记录[/dim]")
            return output.getvalue()

        for result in results:
            invoice = self.engine.invoices.get(result.invoice_id)
            if not invoice:
                continue

            status_style = {
                ProcessingStatus.NORMAL: "green",
                ProcessingStatus.CORRECTED: "yellow",
                ProcessingStatus.NEED_MANUAL: "red",
                ProcessingStatus.UNPROCESSED: "dim"
            }.get(result.status, "white")

            title = Text(f"发票 {result.invoice_no}", style=f"bold {status_style}")
            console.print(Panel(title, border_style=status_style))

            console.print(f"  发票ID: {result.invoice_id}")
            console.print(f"  发票金额: {invoice.amount:,.2f} 元")
            console.print(f"  占用金额: {result.occupied_amount:,.2f} 元")
            console.print(f"  可用金额: {result.available_amount:,.2f} 元")
            console.print(f"  处理状态: [{status_style}]{result.status.value}[/{status_style}]")

            if result.notes:
                console.print(f"  备注:")
                for note in result.notes:
                    console.print(f"    • {note}")

            if result.risk_alerts:
                console.print(f"  风险告警:")
                for alert in result.risk_alerts:
                    severity_style = "red" if alert.severity == "high" else "yellow"
                    console.print(f"    [{severity_style}]• [{alert.severity}] {alert.risk_type.value}: {alert.message}[/{severity_style}]")

            if result.corrections:
                console.print(f"  修正痕迹 ({len(result.corrections)} 条):")
                for trace in result.corrections:
                    console.print(f"    • [{trace.operated_at.strftime('%Y-%m-%d %H:%M')}] {trace.operator} 修改 {trace.field_name}: {trace.old_value} → {trace.new_value}")
                    console.print(f"      原因: {trace.reason} (来源: {trace.source.value})")

            console.print()

        return output.getvalue()

    def generate_json_output(self, summary: ProcessingSummary) -> str:
        """生成机器可读的JSON输出"""
        data = {
            "report_type": "invoice_finance_occupation",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_invoices": summary.total_invoices,
                "total_amount": summary.total_amount,
                "unprocessed": {
                    "count": summary.unprocessed_count,
                    "amount": summary.unprocessed_amount
                },
                "corrected": {
                    "count": summary.corrected_count,
                    "amount": summary.corrected_amount
                },
                "need_manual": {
                    "count": summary.need_manual_count,
                    "amount": summary.need_manual_amount
                },
                "normal": {
                    "count": summary.normal_count,
                    "amount": summary.normal_amount
                },
                "total_risk_alerts": summary.total_risk_alerts,
                "risk_breakdown": summary.risk_breakdown
            },
            "details": []
        }

        for invoice_id, result in self.engine.processing_results.items():
            invoice = self.engine.invoices.get(invoice_id)
            if not invoice:
                continue

            detail = {
                "invoice_id": result.invoice_id,
                "invoice_no": result.invoice_no,
                "invoice_amount": invoice.amount,
                "occupied_amount": result.occupied_amount,
                "available_amount": result.available_amount,
                "status": result.status.value,
                "notes": result.notes,
                "risk_alerts": [
                    {
                        "alert_id": a.alert_id,
                        "risk_type": a.risk_type.value,
                        "severity": a.severity,
                        "message": a.message,
                        "details": a.details
                    }
                    for a in result.risk_alerts
                ],
                "corrections": [
                    {
                        "trace_id": c.trace_id,
                        "field_name": c.field_name,
                        "old_value": str(c.old_value),
                        "new_value": str(c.new_value),
                        "operator": c.operator,
                        "operated_at": c.operated_at.isoformat(),
                        "reason": c.reason,
                        "source": c.source.value
                    }
                    for c in result.corrections
                ]
            }
            data["details"].append(detail)

        return json.dumps(data, ensure_ascii=False, indent=2)

    def generate_audit_export(self, filepath: str) -> None:
        """导出审计报告（CSV格式）"""
        import csv

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '发票号码', '发票ID', '发票金额', '占用金额', '可用金额',
                '处理状态', '风险类型', '风险级别', '风险描述',
                '修正字段', '原值', '新值', '操作人', '操作时间', '修正原因', '数据来源'
            ])

            for invoice_id, result in self.engine.processing_results.items():
                invoice = self.engine.invoices.get(invoice_id)
                if not invoice:
                    continue

                if not result.risk_alerts and not result.corrections:
                    writer.writerow([
                        result.invoice_no, result.invoice_id, invoice.amount,
                        result.occupied_amount, result.available_amount,
                        result.status.value, '', '', '', '', '', '', '', '', '', ''
                    ])
                else:
                    for alert in result.risk_alerts:
                        writer.writerow([
                            result.invoice_no, result.invoice_id, invoice.amount,
                            result.occupied_amount, result.available_amount,
                            result.status.value, alert.risk_type.value, alert.severity,
                            alert.message, '', '', '', '', '', '', ''
                        ])
                    for corr in result.corrections:
                        writer.writerow([
                            result.invoice_no, result.invoice_id, invoice.amount,
                            result.occupied_amount, result.available_amount,
                            result.status.value, '', '', '',
                            corr.field_name, corr.old_value, corr.new_value,
                            corr.operator, corr.operated_at.strftime('%Y-%m-%d %H:%M:%S'),
                            corr.reason, corr.source.value
                        ])

    def _format_risk_type(self, risk_type: str) -> str:
        """格式化风险类型显示"""
        mapping = {
            RiskType.DUPLICATE_PLEDGE.value: "🔴 重复质押",
            RiskType.PARTIAL_WRITE_OFF.value: "🟡 部分核销",
            RiskType.BUYER_REVOKED.value: "🔴 买方撤确认",
            RiskType.EXCEED_CREDIT.value: "🔴 超额占用",
            RiskType.INVOICE_INVALID.value: "🟠 发票无效"
        }
        return mapping.get(risk_type, risk_type)
