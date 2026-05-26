from typing import List, Dict
from pathlib import Path
from datetime import datetime
import pandas as pd
from .models import CalculationResult, OrderStatus, ReportSummary, SalesOrder


class Reporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_console_report(
        self,
        summary: ReportSummary,
        results: List[CalculationResult],
        orders: List[SalesOrder],
    ) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("佣金阶梯复核报告")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)
        lines.append("")

        lines.append("【总体概览】")
        lines.append(f"  订单总数:     {summary.total_orders}")
        lines.append(f"  正常计算:     {summary.normal_count} ({summary.normal_count/summary.total_orders*100:.1f}%)")
        lines.append(f"  已修正:       {summary.corrected_count}")
        lines.append(f"  待人工确认:   {summary.pending_review_count}")
        lines.append(f"  错误/缺失:    {summary.error_count}")
        lines.append(f"  佣金总额:     ¥{summary.total_commission:,.2f}")
        lines.append("")

        lines.append("【异常分组】")
        lines.append(f"  跨区订单:     {summary.cross_region_count}")
        lines.append(f"  回款未达标:   {summary.payment_pending_count}")
        lines.append(f"  费率版本错:   {summary.rate_mismatch_count}")
        lines.append("")

        if summary.pending_review_count > 0:
            lines.append("【待人工确认订单】")
            pending = [r for r in results if r.status == OrderStatus.MANUAL_REVIEW]
            for r in pending[:10]:
                order = next((o for o in orders if o.order_id == r.order_id), None)
                region = order.region if order else "未知"
                product = order.product_line if order else "未知"
                lines.append(f"  {r.order_id} | {r.salesperson} | {region} | {product}")
                for msg in r.messages:
                    lines.append(f"    → {msg}")
            if len(pending) > 10:
                lines.append(f"  ... 还有 {len(pending) - 10} 条待确认")
            lines.append("")

        if summary.error_count > 0:
            lines.append("【错误订单】")
            errors = [r for r in results if r.status in [OrderStatus.ERROR, OrderStatus.MISSING_DATA]]
            for r in errors[:10]:
                lines.append(f"  {r.order_id} | {r.salesperson}")
                for msg in r.messages:
                    lines.append(f"    × {msg}")
            if len(errors) > 10:
                lines.append(f"  ... 还有 {len(errors) - 10} 条错误")
            lines.append("")

        lines.append("=" * 70)
        return "\n".join(lines)

    def generate_detailed_report(
        self,
        results: List[CalculationResult],
        orders: List[SalesOrder],
        filename: str = "commission_report.xlsx",
    ) -> str:
        output_path = self.output_dir / filename

        order_map = {o.order_id: o for o in orders}

        rows = []
        for result in results:
            order = order_map.get(result.order_id)
            row = {
                "订单ID": result.order_id,
                "销售人员": result.salesperson,
                "区域": order.region if order else "",
                "产品线": order.product_line if order else "",
                "订单金额": result.base_amount,
                "适用费率": f"{result.applicable_rate * 100:.1f}%",
                "阶梯区间": result.tier_level,
                "费率版本": result.rate_version_used,
                "调整前佣金": result.commission_before_adjustment,
                "调整金额": result.adjustment,
                "最终佣金": result.final_commission,
                "状态": self._status_to_text(result.status),
                "备注": "; ".join(result.messages),
                "来源文件": order.source_file if order else "",
            }
            rows.append(row)

        df = pd.DataFrame(rows)

        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="全部订单", index=False)

            self._write_sheet(writer, "正常计算", [r for r in results if r.status == OrderStatus.NORMAL], order_map)
            self._write_sheet(writer, "已修正", [r for r in results if r.status == OrderStatus.CORRECTED], order_map)
            self._write_sheet(writer, "待人工确认", [r for r in results if r.status == OrderStatus.MANUAL_REVIEW], order_map)
            self._write_sheet(writer, "跨区订单", [r for r in results if r.status == OrderStatus.CROSS_REGION], order_map)
            self._write_sheet(writer, "回款未达标", [r for r in results if r.status == OrderStatus.PAYMENT_PENDING], order_map)
            self._write_sheet(writer, "费率版本错", [r for r in results if r.status == OrderStatus.RATE_VERSION_MISMATCH], order_map)
            self._write_sheet(writer, "错误", [r for r in results if r.status in [OrderStatus.ERROR, OrderStatus.MISSING_DATA]], order_map)

            summary_rows = []
            salespeople = set(r.salesperson for r in results)
            for person in salespeople:
                person_results = [r for r in results if r.salesperson == person]
                summary_rows.append({
                    "销售人员": person,
                    "订单数": len(person_results),
                    "订单总额": sum(r.base_amount for r in person_results),
                    "佣金总额": sum(r.final_commission for r in person_results),
                    "正常订单": sum(1 for r in person_results if r.status == OrderStatus.NORMAL),
                    "异常订单": sum(1 for r in person_results if r.status != OrderStatus.NORMAL),
                })
            pd.DataFrame(summary_rows).to_excel(writer, sheet_name="个人汇总", index=False)

        return str(output_path)

    def _write_sheet(self, writer, sheet_name: str, results: List[CalculationResult], order_map: Dict) -> None:
        if not results:
            pd.DataFrame(columns=["订单ID", "销售人员", "状态", "备注"]).to_excel(writer, sheet_name=sheet_name, index=False)
            return

        rows = []
        for result in results:
            order = order_map.get(result.order_id)
            rows.append({
                "订单ID": result.order_id,
                "销售人员": result.salesperson,
                "区域": order.region if order else "",
                "产品线": order.product_line if order else "",
                "订单金额": result.base_amount,
                "适用费率": f"{result.applicable_rate * 100:.1f}%",
                "阶梯区间": result.tier_level,
                "费率版本": result.rate_version_used,
                "调整前佣金": result.commission_before_adjustment,
                "调整金额": result.adjustment,
                "最终佣金": result.final_commission,
                "状态": self._status_to_text(result.status),
                "备注": "; ".join(result.messages),
            })
        pd.DataFrame(rows).to_excel(writer, sheet_name=sheet_name, index=False)

    def _status_to_text(self, status: OrderStatus) -> str:
        status_map = {
            OrderStatus.NORMAL: "正常",
            OrderStatus.CORRECTED: "已修正",
            OrderStatus.CROSS_REGION: "跨区销售",
            OrderStatus.PAYMENT_PENDING: "回款未达标",
            OrderStatus.RATE_VERSION_MISMATCH: "费率版本错",
            OrderStatus.MISSING_DATA: "数据缺失",
            OrderStatus.MANUAL_REVIEW: "待人工确认",
            OrderStatus.ERROR: "错误",
        }
        return status_map.get(status, status.value)

    def generate_summary_csv(
        self,
        summary: ReportSummary,
        filename: str = "summary.csv",
    ) -> str:
        output_path = self.output_dir / filename
        data = {
            "指标": [
                "订单总数", "正常计算", "已修正", "待人工确认", "错误/缺失",
                "跨区订单", "回款未达标", "费率版本错", "佣金总额"
            ],
            "数值": [
                summary.total_orders,
                summary.normal_count,
                summary.corrected_count,
                summary.pending_review_count,
                summary.error_count,
                summary.cross_region_count,
                summary.payment_pending_count,
                summary.rate_mismatch_count,
                summary.total_commission,
            ],
        }
        pd.DataFrame(data).to_csv(output_path, index=False, encoding="utf-8-sig")
        return str(output_path)

    def generate_pending_review_report(
        self,
        results: List[CalculationResult],
        orders: List[SalesOrder],
        filename: str = "pending_review.csv",
    ) -> str:
        output_path = self.output_dir / filename
        pending = [r for r in results if r.status == OrderStatus.MANUAL_REVIEW]
        order_map = {o.order_id: o for o in orders}

        rows = []
        for r in pending:
            order = order_map.get(r.order_id)
            rows.append({
                "订单ID": r.order_id,
                "销售人员": r.salesperson,
                "区域": order.region if order else "",
                "产品线": order.product_line if order else "",
                "订单金额": r.base_amount,
                "问题描述": "; ".join(r.messages),
                "建议处理": "请人工核实后确认或修正",
            })

        pd.DataFrame(rows).to_csv(output_path, index=False, encoding="utf-8-sig")
        return str(output_path)
