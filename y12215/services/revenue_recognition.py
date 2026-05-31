from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import uuid
from models import AnnualPassAccount, RevenueDetail, RevenueType


class RevenueRecognitionService:
    def __init__(self, data_store):
        self.data_store = data_store

    def calculate_daily_revenue(self, account: AnnualPassAccount,
                                recognition_date: date) -> Decimal:
        if not account.is_active_on(recognition_date):
            return Decimal('0')
        package_version = self.data_store.get_package_version(account.package_version_id)
        if not package_version:
            return Decimal('0')
        return package_version.daily_rate()

    def generate_monthly_revenue_details(self, account: AnnualPassAccount,
                                         year: int, month: int) -> List[RevenueDetail]:
        details = []
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        current_date = start_date
        while current_date < end_date:
            if account.is_active_on(current_date):
                daily_amount = self.calculate_daily_revenue(account, current_date)
                if daily_amount > 0:
                    detail = RevenueDetail(
                        detail_id=f"rev_{uuid.uuid4().hex[:8]}",
                        account_id=account.account_id,
                        package_version_id=account.package_version_id,
                        revenue_date=current_date,
                        amount=daily_amount,
                        revenue_type=RevenueType.RECOGNIZED,
                        source_record_id=account.account_id,
                        source_record_type="account"
                    )
                    details.append(detail)
            current_date = date.fromordinal(current_date.toordinal() + 1)
        return details

    def generate_revenue_details_for_period(self, account: AnnualPassAccount,
                                            start_date: date,
                                            end_date: date) -> List[RevenueDetail]:
        details = []
        current_date = start_date
        while current_date <= end_date:
            if account.is_active_on(current_date):
                daily_amount = self.calculate_daily_revenue(account, current_date)
                if daily_amount > 0:
                    detail = RevenueDetail(
                        detail_id=f"rev_{uuid.uuid4().hex[:8]}",
                        account_id=account.account_id,
                        package_version_id=account.package_version_id,
                        revenue_date=current_date,
                        amount=daily_amount,
                        revenue_type=RevenueType.RECOGNIZED,
                        source_record_id=account.account_id,
                        source_record_type="account"
                    )
                    details.append(detail)
            current_date = date.fromordinal(current_date.toordinal() + 1)
        return details

    def recognize_revenue_for_account(self, account_id: str, start_date: date,
                                      end_date: date) -> List[RevenueDetail]:
        account = self.data_store.get_account(account_id)
        if not account:
            return []
        details = self.generate_revenue_details_for_period(account, start_date, end_date)
        for detail in details:
            self.data_store.add_revenue_detail(detail)
        return details

    def get_total_recognized_revenue(self, account_id: str, start_date: date,
                                     end_date: date) -> Decimal:
        details = self.data_store.get_revenue_details_by_account(account_id)
        total = Decimal('0')
        for d in details:
            if start_date <= d.revenue_date <= end_date and d.revenue_type == RevenueType.RECOGNIZED:
                total += d.amount
        return total

    def get_deferred_revenue(self, account_id: str, as_of_date: date) -> Decimal:
        account = self.data_store.get_account(account_id)
        if not account:
            return Decimal('0')
        remaining_days = account.remaining_days(as_of_date)
        package_version = self.data_store.get_package_version(account.package_version_id)
        if not package_version:
            return Decimal('0')
        return package_version.daily_rate() * Decimal(remaining_days)
