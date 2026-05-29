from datetime import timedelta
from typing import List, Dict, Optional
from .models import (
    OrderRecord, ChannelContract, DailyRate, CommissionResult,
    ValidationIssue, OrderType, ChannelType
)


class CommissionCalculator:
    def __init__(
        self,
        orders: List[OrderRecord],
        contracts: List[ChannelContract],
        rates: List[DailyRate]
    ):
        self.orders = orders
        self.contracts = contracts
        self.rates = rates
        self.rate_map: Dict[str, DailyRate] = {r.rate_date.isoformat(): r for r in rates}
        self.contract_map: Dict[str, ChannelContract] = {c.channel: c for c in contracts}
        self.issues: List[ValidationIssue] = []
    
    def _get_contract(self, channel: str) -> Optional[ChannelContract]:
        contract = self.contract_map.get(channel)
        if not contract:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"未找到渠道 '{channel}' 的合同配置",
                source_file="channel_contracts.csv"
            ))
        return contract
    
    def _check_cross_night_refund(self, order: OrderRecord) -> List[str]:
        issues = []
        if order.refund_amount > 0 and order.refund_date:
            checkin = order.checkin_date
            checkout = order.checkout_date
            refund = order.refund_date
            
            if checkin < refund < checkout:
                issues.append(f"退款跨夜: 退款日期{refund}在入住期间{checkin}至{checkout}内")
        
        return issues
    
    def _check_half_day_compliance(self, order: OrderRecord) -> List[str]:
        issues = []
        if order.order_type == OrderType.HALF_DAY:
            if order.room_nights != 0.5:
                issues.append(f"半日房房晚数异常: 预期0.5晚，实际{order.room_nights}晚")
            
            contract = self._get_contract(order.channel)
            if contract and contract.half_day_commission_rate is None:
                issues.append(f"半日房合同缺失: 渠道'{order.channel}'未配置半日房佣金率，使用全日房费率计算")
        
        return issues
    
    def _align_with_rate_calendar(self, order: OrderRecord) -> tuple:
        is_weekend = False
        is_holiday = False
        rate_issues = []
        
        checkin = order.checkin_date
        current_date = checkin
        
        rate_info = self.rate_map.get(current_date.isoformat())
        
        if rate_info:
            is_weekend = rate_info.is_weekend
            is_holiday = rate_info.is_holiday
            if rate_info.is_holiday:
                rate_issues.append(f"节假日房价: {current_date}({rate_info.holiday_name})使用节假日费率")
        else:
            rate_issues.append(f"房价日历缺失: {current_date}无房价记录，使用订单默认标记")
            is_weekend = order.is_weekend
            is_holiday = order.is_holiday
        
        return is_weekend, is_holiday, rate_issues
    
    def _calculate_single_commission(self, order: OrderRecord) -> CommissionResult:
        issues = []
        source_materials = []
        
        contract = self._get_contract(order.channel)
        if not contract:
            issues.append(f"缺失合同配置: 无法计算佣金")
            source_materials.append("channel_contracts.csv(缺失)")
            
            return CommissionResult(
                order_id=order.order_id,
                channel=order.channel,
                channel_type=order.channel_type,
                checkin_date=order.checkin_date,
                checkout_date=order.checkout_date,
                order_type=order.order_type,
                room_nights=order.room_nights,
                total_amount=order.total_amount,
                refund_amount=order.refund_amount,
                net_amount=order.net_amount,
                contract_rate=0,
                calculated_commission=0,
                expected_commission=0,
                difference=0,
                issues=issues,
                source_materials=source_materials
            )
        
        source_materials.append("channel_contracts.csv")
        source_materials.append("order_records.csv")
        
        is_weekend, is_holiday, rate_issues = self._align_with_rate_calendar(order)
        issues.extend(rate_issues)
        if rate_issues:
            source_materials.append("rate_calendar.csv")
        
        half_day_issues = self._check_half_day_compliance(order)
        issues.extend(half_day_issues)
        
        cross_night_issues = self._check_cross_night_refund(order)
        issues.extend(cross_night_issues)
        
        applicable_rate = contract.get_commission_rate(
            order_type=order.order_type,
            is_weekend=is_weekend,
            is_holiday=is_holiday
        )
        
        calculated_commission = order.net_amount * applicable_rate
        
        expected_commission = order.total_amount * contract.commission_rate
        
        difference = calculated_commission - expected_commission
        
        if abs(difference) > 0.01:
            diff_reasons = []
            if is_holiday:
                diff_reasons.append(f"节假日加价{contract.holiday_surcharge*100:.1f}%")
            elif is_weekend:
                diff_reasons.append(f"周末加价{contract.weekend_surcharge*100:.1f}%")
            
            if order.order_type == OrderType.HALF_DAY and contract.half_day_commission_rate:
                diff_reasons.append(f"半日房特殊费率{contract.half_day_commission_rate*100:.1f}%")
            
            if order.refund_amount > 0:
                diff_reasons.append(f"退款抵扣{order.refund_amount:.2f}元")
            
            if diff_reasons:
                issues.append(f"差异原因: {'; '.join(diff_reasons)}")
        
        return CommissionResult(
            order_id=order.order_id,
            channel=order.channel,
            channel_type=order.channel_type,
            checkin_date=order.checkin_date,
            checkout_date=order.checkout_date,
            order_type=order.order_type,
            room_nights=order.room_nights,
            total_amount=order.total_amount,
            refund_amount=order.refund_amount,
            net_amount=order.net_amount,
            contract_rate=applicable_rate,
            calculated_commission=calculated_commission,
            expected_commission=expected_commission,
            difference=difference,
            issues=issues,
            source_materials=source_materials
        )
    
    def calculate_all(self) -> tuple:
        results = []
        
        for order in self.orders:
            result = self._calculate_single_commission(order)
            results.append(result)
        
        return results, self.issues
    
    def get_channel_summary(self, results: List[CommissionResult]) -> Dict[str, dict]:
        summary = {}
        
        for result in results:
            channel = result.channel
            if channel not in summary:
                summary[channel] = {
                    'order_count': 0,
                    'total_amount': 0,
                    'refund_amount': 0,
                    'net_amount': 0,
                    'calculated_commission': 0,
                    'expected_commission': 0,
                    'difference': 0,
                    'issue_count': 0,
                    'half_day_count': 0,
                    'cross_night_refund_count': 0
                }
            
            s = summary[channel]
            s['order_count'] += 1
            s['total_amount'] += result.total_amount
            s['refund_amount'] += result.refund_amount
            s['net_amount'] += result.net_amount
            s['calculated_commission'] += result.calculated_commission
            s['expected_commission'] += result.expected_commission
            s['difference'] += result.difference
            
            if result.has_issues:
                s['issue_count'] += 1
            
            if result.order_type == OrderType.HALF_DAY:
                s['half_day_count'] += 1
            
            if any('跨夜' in issue for issue in result.issues):
                s['cross_night_refund_count'] += 1
        
        return summary
