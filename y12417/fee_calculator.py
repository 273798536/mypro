import uuid
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from models import (
    StockLoanContract, DailySettlementItem, DailySettlementReport,
    SettlementException, ExceptionType, ContractStatus
)
from rate_manager import RateManager, RateLookupResult


@dataclass
class CalculationPeriod:
    start_date: date
    end_date: date
    days: int
    rate: float
    rate_version_id: str
    period_type: str


@dataclass
class CrossDayReturnInfo:
    is_cross_day: bool
    original_due_date: date
    actual_return_date: date
    cross_days: int
    cross_day_fee: float
    description: str


class FeeCalculator:
    def __init__(self, rate_manager: RateManager):
        self.rate_manager = rate_manager

    def calculate_settlement(
        self,
        contracts: List[StockLoanContract],
        settlement_date: date
    ) -> DailySettlementReport:
        report = DailySettlementReport(
            report_id=f"SETTLE-{settlement_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}",
            settlement_date=settlement_date
        )
        
        for contract in contracts:
            item = self._calculate_contract_fee(contract, settlement_date)
            if item:
                report.items.append(item)
                report.exceptions.extend(item.exceptions)
        
        report.total_contracts = len(report.items)
        report.total_fee = sum(item.total_fee for item in report.items)
        
        return report

    def _calculate_contract_fee(
        self,
        contract: StockLoanContract,
        settlement_date: date
    ) -> Optional[DailySettlementItem]:
        exceptions: List[SettlementException] = []
        
        calc_start, calc_end, is_cross_day_return = self._determine_calculation_period(
            contract, settlement_date, exceptions
        )
        
        if calc_start > calc_end:
            return None
        
        periods = self._split_by_rate_periods(
            contract.security_code, calc_start, calc_end
        )
        
        total_base_fee = 0.0
        total_days = 0
        rate_version_id = ""
        applied_rate = 0.0
        calc_details = []
        
        for period in periods:
            if period.rate is None:
                exc = self._create_exception(
                    ExceptionType.RATE_MISSING,
                    "HIGH",
                    f"证券[{contract.security_code}]缺失费率",
                    f"合约[{contract.contract_id}]在{period.start_date}至{period.end_date}期间无法找到有效费率",
                    "请检查费率表配置，补充该证券在相应日期的费率",
                    contract,
                    period.start_date,
                    "rate"
                )
                exceptions.append(exc)
                continue
            
            period_fee = self._calculate_period_fee(
                contract.quantity, period.rate, period.days
            )
            total_base_fee += period_fee
            total_days += period.days
            
            if not rate_version_id:
                rate_version_id = period.rate_version_id
                applied_rate = period.rate
            
            calc_details.append(
                f"{period.start_date}~{period.end_date}({period.days}天) x {period.rate}% = {period_fee:.2f}"
            )
        
        extension_fee = 0.0
        if contract.is_extended:
            extension_fee, ext_detail = self._calculate_extension_fee(
                contract, settlement_date, exceptions
            )
            if ext_detail:
                calc_details.append(ext_detail)
        
        cross_day_adjustment = 0.0
        cross_day_info = None
        if is_cross_day_return:
            cross_day_info = self._calculate_cross_day_return_adjustment(
                contract, settlement_date, exceptions
            )
            if cross_day_info:
                cross_day_adjustment = cross_day_info.cross_day_fee
                calc_details.append(
                    f"归还跨日调整: {cross_day_info.description}"
                )
        
        total_fee = total_base_fee + extension_fee + cross_day_adjustment
        
        item = DailySettlementItem(
            settlement_id=f"ITEM-{contract.contract_id}-{settlement_date.strftime('%Y%m%d')}",
            contract_id=contract.contract_id,
            account_id=contract.account_id,
            account_name=contract.account_name,
            security_code=contract.security_code,
            security_name=contract.security_name,
            quantity=contract.quantity,
            settlement_date=settlement_date,
            rate_version_id=rate_version_id,
            rate=applied_rate,
            days=total_days,
            base_fee=total_base_fee,
            extension_fee=extension_fee,
            cross_day_adjustment=cross_day_adjustment,
            total_fee=total_fee,
            calculation_details="; ".join(calc_details),
            exceptions=exceptions
        )
        
        return item

    def _determine_calculation_period(
        self,
        contract: StockLoanContract,
        settlement_date: date,
        exceptions: List[SettlementException]
    ) -> Tuple[date, date, bool]:
        is_cross_day_return = False
        
        if contract.status == ContractStatus.RETURNED:
            if contract.actual_return_date:
                calc_end = contract.actual_return_date
                if contract.actual_return_date > contract.due_date:
                    is_cross_day_return = True
        elif contract.status == ContractStatus.EXTENDED:
            calc_end = min(contract.due_date, settlement_date)
        else:
            calc_end = min(contract.due_date, settlement_date)
        
        calc_start = max(contract.loan_date, settlement_date - timedelta(days=1))
        
        if calc_start > contract.due_date and not contract.is_extended and not contract.actual_return_date:
            exc = self._create_exception(
                ExceptionType.EXTENSION_MISSED,
                "HIGH",
                f"合约[{contract.contract_id}]可能漏展期",
                f"合约应于{contract.due_date}到期，但结算日{settlement_date}已超期且未标记展期",
                "请核对该合约是否已办理展期手续，如已展期请更新合约的到期日期并标记为展期状态",
                contract,
                contract.due_date,
                "due_date"
            )
            exceptions.append(exc)
        
        return calc_start, calc_end, is_cross_day_return

    def _split_by_rate_periods(
        self,
        security_code: str,
        start_date: date,
        end_date: date
    ) -> List[CalculationPeriod]:
        periods = []
        current = start_date
        
        while current <= end_date:
            rate_result = self.rate_manager.get_rate_for_date(security_code, current)
            
            if rate_result.found and rate_result.effective_date:
                period_end = rate_result.expiry_date or end_date
                if period_end > end_date:
                    period_end = end_date
                
                days = (period_end - current).days + 1
                
                periods.append(CalculationPeriod(
                    start_date=current,
                    end_date=period_end,
                    days=days,
                    rate=rate_result.rate,
                    rate_version_id=rate_result.version_id or "",
                    period_type="normal"
                ))
                
                current = period_end + timedelta(days=1)
            else:
                periods.append(CalculationPeriod(
                    start_date=current,
                    end_date=current,
                    days=1,
                    rate=None,
                    rate_version_id="",
                    period_type="missing_rate"
                ))
                current += timedelta(days=1)
        
        return periods

    def _calculate_period_fee(self, quantity: int, rate: float, days: int) -> float:
        return quantity * (rate / 100) * (days / 365)

    def _calculate_extension_fee(
        self,
        contract: StockLoanContract,
        settlement_date: date,
        exceptions: List[SettlementException]
    ) -> Tuple[float, Optional[str]]:
        if not contract.original_due_date:
            return 0.0, None
        
        extension_start = contract.original_due_date + timedelta(days=1)
        extension_end = min(contract.due_date, settlement_date)
        
        if extension_start > extension_end:
            return 0.0, None
        
        rate_result = self.rate_manager.get_rate_for_date(
            contract.security_code, extension_start
        )
        
        if not rate_result.found:
            exc = self._create_exception(
                ExceptionType.RATE_MISSING,
                "HIGH",
                f"展期费率缺失",
                f"合约[{contract.contract_id}]展期期间({extension_start}~{extension_end})无法找到有效费率",
                "请检查费率表配置，确保展期期间有有效费率",
                contract,
                extension_start,
                "rate"
            )
            exceptions.append(exc)
            return 0.0, None
        
        days = (extension_end - extension_start).days + 1
        fee = self._calculate_period_fee(contract.quantity, rate_result.rate, days)
        
        detail = f"展期{contract.extension_count}次({extension_start}~{extension_end}, {days}天): {fee:.2f}"
        return fee, detail

    def _calculate_cross_day_return_adjustment(
        self,
        contract: StockLoanContract,
        settlement_date: date,
        exceptions: List[SettlementException]
    ) -> Optional[CrossDayReturnInfo]:
        if not contract.actual_return_date or not contract.due_date:
            return None
        
        if contract.actual_return_date <= contract.due_date:
            return None
        
        cross_days = (contract.actual_return_date - contract.due_date).days
        
        rate_result = self.rate_manager.get_rate_for_date(
            contract.security_code, contract.due_date
        )
        
        daily_rate = 0.0
        rate_version = ""
        if rate_result.found:
            daily_rate = rate_result.rate
            rate_version = rate_result.version_id or ""
        
        cross_day_fee = self._calculate_period_fee(
            contract.quantity, daily_rate, cross_days
        )
        
        description = (
            f"应还日{contract.due_date}，实还日{contract.actual_return_date}，"
            f"逾期{cross_days}天，补收{cross_day_fee:.2f}元。"
            f"（注：客户{contract.account_name}的{contract.security_name}借券"
            f"未能在到期日归还，占用资金/券源{cross_days}天）"
        )
        
        exc = self._create_exception(
            ExceptionType.CROSS_DAY_RETURN,
            "MEDIUM",
            f"合约[{contract.contract_id}]归还跨日",
            description,
            "请与业务确认：1) 逾期归还是否正常；2) 是否已通知客户相关费用；3) 是否需要收取罚息",
            contract,
            contract.actual_return_date,
            "actual_return_date"
        )
        exceptions.append(exc)
        
        return CrossDayReturnInfo(
            is_cross_day=True,
            original_due_date=contract.due_date,
            actual_return_date=contract.actual_return_date,
            cross_days=cross_days,
            cross_day_fee=cross_day_fee,
            description=description
        )

    def _create_exception(
        self,
        exc_type: ExceptionType,
        severity: str,
        title: str,
        description: str,
        suggestion: str,
        contract: StockLoanContract,
        related_date: Optional[date],
        source_field: Optional[str]
    ) -> SettlementException:
        return SettlementException(
            exception_id=f"EXC-{uuid.uuid4().hex[:8]}",
            exception_type=exc_type,
            severity=severity,
            title=title,
            description=description,
            suggestion=suggestion,
            related_contract_id=contract.contract_id,
            related_security_code=contract.security_code,
            related_account_id=contract.account_id,
            related_date=related_date,
            source_field=source_field
        )

    def recalculate_with_correction(
        self,
        item: DailySettlementItem,
        contract: StockLoanContract,
        correction_note: str
    ) -> DailySettlementItem:
        new_item = self._calculate_contract_fee(contract, item.settlement_date)
        if new_item:
            new_item.settlement_id = item.settlement_id
            new_item.calculation_details += f" [修正备注: {correction_note}]"
            return new_item
        return item
