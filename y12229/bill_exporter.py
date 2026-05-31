import pandas as pd
from datetime import datetime
from typing import List
import os

from models import (
    VerificationResult,
    ExportBill,
    Issue,
    IssueType,
    IssueSeverity,
)
from data_import import DataStore


class BillExporter:
    def __init__(self, data_store: DataStore, results: List[VerificationResult]):
        self.data_store = data_store
        self.results = results
        self._bill_counter = 0

    def _generate_bill_no(self) -> str:
        self._bill_counter += 1
        return f"BILL-{datetime.now().strftime('%Y%m%d')}-{self._bill_counter:04d}"

    def _generate_issues_summary(self, issues: List[Issue]) -> List[str]:
        summaries = []
        for issue in issues:
            if issue.issue_type == IssueType.PRICE_EXPIRED:
                summaries.append(f"锁价过期-{issue.severity.value}")
            elif issue.issue_type == IssueType.CONTAINER_CHANGED:
                summaries.append(f"箱型替换-{issue.severity.value}")
            elif issue.issue_type == IssueType.BAF_ADJUSTMENT:
                summaries.append(f"燃油追补-{issue.severity.value}")
            elif issue.issue_type == IssueType.QUOTE_VERSION_MISMATCH:
                summaries.append(f"版本变更-{issue.severity.value}")
            else:
                summaries.append(f"其他-{issue.severity.value}")
        return summaries

    def generate_export_bills(self) -> List[ExportBill]:
        bills = []
        for result in self.results:
            booking = self.data_store.get_booking(result.booking_no)
            agreement = self.data_store.get_agreement(result.agreement_id)
            
            if not booking or not agreement:
                continue

            cost_reports = self.data_store.get_booking_cost_reports(result.booking_no)
            other_charges = 0.0
            if cost_reports:
                latest_report = sorted(cost_reports, key=lambda x: x.report_date)[-1]
                other_charges = latest_report.other_charges

            base_rate = result.actual_base_rate
            baf_rate = result.actual_baf_rate
            total_amount = (base_rate + baf_rate) * booking.container_count + other_charges

            issues_summary = self._generate_issues_summary(result.issues)
            has_discrepancy = len(result.issues) > 0
            discrepancy_amount = result.total_diff

            bill = ExportBill(
                bill_no=self._generate_bill_no(),
                booking_no=result.booking_no,
                agreement_id=result.agreement_id,
                customer_name=booking.customer_name,
                trade_lane=booking.trade_lane,
                container_type=result.container_type,
                container_count=booking.container_count,
                etd=booking.etd,
                base_rate=base_rate,
                baf_rate=baf_rate,
                other_charges=other_charges,
                total_amount=total_amount,
                currency=agreement.currency,
                issues_summary=issues_summary,
                has_discrepancy=has_discrepancy,
                discrepancy_amount=discrepancy_amount,
            )
            bills.append(bill)
        return bills

    def export_to_excel(self, file_path: str, include_details: bool = True):
        bills = self.generate_export_bills()
        
        bill_data = []
        for bill in bills:
            bill_data.append({
                "账单编号": bill.bill_no,
                "订舱号": bill.booking_no,
                "协议编号": bill.agreement_id,
                "客户名称": bill.customer_name,
                "航线": bill.trade_lane,
                "箱型": bill.container_type.value,
                "箱量": bill.container_count,
                "开船日期": str(bill.etd),
                "基本运费": bill.base_rate,
                "燃油费": bill.baf_rate,
                "其他费用": bill.other_charges,
                "总金额": bill.total_amount,
                "币种": bill.currency,
                "问题标记": "; ".join(bill.issues_summary) if bill.issues_summary else "",
                "是否有差异": "是" if bill.has_discrepancy else "否",
                "差异金额": bill.discrepancy_amount,
            })

        df_bills = pd.DataFrame(bill_data)

        if include_details:
            issue_data = []
            for result in self.results:
                for issue in result.issues:
                    issue_data.append({
                        "问题编号": issue.issue_id,
                        "订舱号": issue.booking_no,
                        "问题类型": issue.issue_type.value,
                        "严重程度": issue.severity.value,
                        "标题": issue.title,
                        "描述": issue.description,
                        "金额差异": issue.amount_diff,
                        "币种": issue.currency,
                        "数据来源": ", ".join(issue.source_records),
                        "详细信息": str(issue.details),
                    })

            audit_data = []
            for result in self.results:
                booking = self.data_store.get_booking(result.booking_no)
                agreement = self.data_store.get_agreement(result.agreement_id)
                amendments = self.data_store.get_booking_amendments(result.booking_no)
                cost_reports = self.data_store.get_booking_cost_reports(result.booking_no)

                audit_data.append({
                    "订舱号": result.booking_no,
                    "协议编号": result.agreement_id,
                    "协议生效日期": str(agreement.effective_date) if agreement else "",
                    "协议到期日期": str(agreement.expiry_date) if agreement else "",
                    "订舱开船日期": str(booking.etd) if booking else "",
                    "协议箱型": agreement.container_type.value if agreement else "",
                    "订舱箱型": result.container_type.value,
                    "协议报价版本": agreement.quote_version if agreement else "",
                    "订舱报价版本": result.quote_version,
                    "改单次数": len(amendments),
                    "改单编号": ", ".join([a.amendment_id for a in amendments]) if amendments else "",
                    "费用报告编号": ", ".join([r.report_id for r in cost_reports]) if cost_reports else "",
                    "核验状态": "通过" if result.is_match else "异常",
                })

        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            df_bills.to_excel(writer, sheet_name="账单汇总", index=False)
            
            if include_details:
                if issue_data:
                    df_issues = pd.DataFrame(issue_data)
                    df_issues.to_excel(writer, sheet_name="问题明细", index=False)
                
                df_audit = pd.DataFrame(audit_data)
                df_audit.to_excel(writer, sheet_name="复核详情", index=False)

    def export_to_csv(self, file_path: str):
        bills = self.generate_export_bills()
        
        bill_data = []
        for bill in bills:
            bill_data.append({
                "账单编号": bill.bill_no,
                "订舱号": bill.booking_no,
                "协议编号": bill.agreement_id,
                "客户名称": bill.customer_name,
                "航线": bill.trade_lane,
                "箱型": bill.container_type.value,
                "箱量": bill.container_count,
                "开船日期": str(bill.etd),
                "基本运费": bill.base_rate,
                "燃油费": bill.baf_rate,
                "其他费用": bill.other_charges,
                "总金额": bill.total_amount,
                "币种": bill.currency,
                "问题标记": "; ".join(bill.issues_summary) if bill.issues_summary else "",
                "是否有差异": "是" if bill.has_discrepancy else "否",
                "差异金额": bill.discrepancy_amount,
            })

        df = pd.DataFrame(bill_data)
        df.to_csv(file_path, index=False, encoding="utf-8-sig")
