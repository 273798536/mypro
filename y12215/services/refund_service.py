from typing import List, Optional, Tuple
from datetime import date, datetime
from decimal import Decimal
import uuid
from models import (
    AnnualPassAccount, RefundRecord, RevenueDetail,
    RevenueType, AdjustmentRecord, AdjustmentType
)


class RefundService:
    def __init__(self, data_store, revenue_service):
        self.data_store = data_store
        self.revenue_service = revenue_service

    def process_refund(self, account_id: str, refund_date: date,
                       refund_amount: Optional[Decimal] = None,
                       is_posted_date: Optional[date] = None,
                       source_order_id: Optional[str] = None,
                       remarks: str = "") -> RefundRecord:
        account = self.data_store.get_account(account_id)
        if not account:
            raise ValueError(f"Account {account_id} not found")
        if refund_amount is None:
            refund_amount = self.calculate_refund_amount(account, refund_date)
        affected_details = self._get_affected_revenue_details(account, refund_date)
        refund = RefundRecord(
            refund_id=f"ref_{uuid.uuid4().hex[:8]}",
            account_id=account_id,
            refund_date=refund_date,
            refund_amount=refund_amount,
            is_posted_date=is_posted_date or refund_date,
            affected_period=self._get_affected_period(affected_details),
            affected_revenue_detail_ids=[d.detail_id for d in affected_details],
            source_order_id=source_order_id,
            remarks=remarks
        )
        self.data_store.add_refund_record(refund)
        self._create_refund_adjustment(refund, account, affected_details)
        self._create_refund_revenue_details(refund, account, affected_details)
        refund.is_processed = True
        refund.processed_at = datetime.now()
        return refund

    def calculate_refund_amount(self, account: AnnualPassAccount,
                                refund_date: date) -> Decimal:
        return self.revenue_service.get_deferred_revenue(account.account_id, refund_date)

    def _get_affected_revenue_details(self, account: AnnualPassAccount,
                                      refund_date: date) -> List[RevenueDetail]:
        details = self.data_store.get_revenue_details_by_account(account.account_id)
        return [d for d in details if d.revenue_date >= refund_date and not d.is_adjusted]

    def _get_affected_period(self, details: List[RevenueDetail]) -> Optional[str]:
        if not details:
            return None
        sorted_details = sorted(details, key=lambda d: d.revenue_date)
        start_year = sorted_details[0].revenue_date.year
        end_year = sorted_details[-1].revenue_date.year
        if start_year == end_year:
            return str(start_year)
        return f"{start_year}-{end_year}"

    def _create_refund_adjustment(self, refund: RefundRecord,
                                  account: AnnualPassAccount,
                                  affected_details: List[RevenueDetail]) -> AdjustmentRecord:
        adjustment = AdjustmentRecord(
            adjustment_id=f"adj_{uuid.uuid4().hex[:8]}",
            account_id=account.account_id,
            adjustment_type=AdjustmentType.REFUND,
            adjustment_date=refund.refund_date,
            amount=-refund.refund_amount,
            affected_revenue_detail_ids=[d.detail_id for d in affected_details],
            source_record_id=refund.refund_id,
            source_record_type="refund",
            is_processed=True,
            processed_at=datetime.now()
        )
        self.data_store.add_adjustment_record(adjustment)
        for detail in affected_details:
            detail.is_adjusted = True
        return adjustment

    def _create_refund_revenue_details(self, refund: RefundRecord,
                                       account: AnnualPassAccount,
                                       affected_details: List[RevenueDetail]) -> List[RevenueDetail]:
        refund_details = []
        for detail in affected_details:
            refund_detail = RevenueDetail(
                detail_id=f"rev_{uuid.uuid4().hex[:8]}",
                account_id=account.account_id,
                package_version_id=account.package_version_id,
                revenue_date=detail.revenue_date,
                amount=-detail.amount,
                revenue_type=RevenueType.REFUND,
                related_detail_id=detail.detail_id,
                source_record_id=refund.refund_id,
                source_record_type="refund"
            )
            self.data_store.add_revenue_detail(refund_detail)
            refund_details.append(refund_detail)
        return refund_details

    def trace_refund_impact(self, refund_id: str) -> dict:
        refund = self.data_store.refund_records.get(refund_id)
        if not refund:
            return {}
        account = self.data_store.get_account(refund.account_id)
        affected_details = [
            self.data_store.revenue_details.get(did)
            for did in refund.affected_revenue_detail_ids
        ]
        affected_details = [d for d in affected_details if d]
        refund_details = [
            d for d in self.data_store.get_revenue_details_by_account(refund.account_id)
            if d.source_record_id == refund_id and d.revenue_type == RevenueType.REFUND
        ]
        return {
            "refund_id": refund.refund_id,
            "refund_date": refund.refund_date,
            "refund_amount": refund.refund_amount,
            "affected_period": refund.affected_period,
            "account_id": refund.account_id,
            "customer_name": account.customer_name if account else None,
            "affected_revenue_count": len(affected_details),
            "refund_detail_count": len(refund_details),
            "affected_details": [
                {
                    "detail_id": d.detail_id,
                    "revenue_date": d.revenue_date,
                    "original_amount": d.amount,
                    "package_version_id": d.package_version_id
                }
                for d in affected_details
            ]
        }

    def get_cross_year_refunds(self, year: int) -> List[RefundRecord]:
        return [
            r for r in self.data_store.refund_records.values()
            if r.affected_period and "-" in r.affected_period
        ]
