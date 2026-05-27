"""核心业务处理模块"""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    Streamer, RewardRecord, PlatformShareVersion, RefundRecord,
    TaxRule, SettlementDetail, SettlementReport
)


class ProcessorError(Exception):
    """处理错误，包含上下文信息"""
    def __init__(self, message: str, context: Optional[Dict] = None):
        self.context = context or {}
        super().__init__(message)


def get_applicable_share_version(
    share_versions: List[PlatformShareVersion],
    record_date: date
) -> Optional[PlatformShareVersion]:
    """根据日期获取适用的分成版本"""
    applicable = []
    for version in share_versions:
        if version.effective_date <= record_date:
            if version.expire_date is None or record_date <= version.expire_date:
                applicable.append(version)
    
    if not applicable:
        return None
    
    applicable.sort(key=lambda v: v.effective_date, reverse=True)
    return applicable[0]


def get_applicable_tax_rule(
    tax_rules: List[TaxRule],
    tax_type: str,
    income: Decimal,
    record_date: date
) -> Optional[TaxRule]:
    """根据收入金额和日期获取适用的税率规则"""
    applicable = []
    for rule in tax_rules:
        if rule.tax_type != tax_type:
            continue
        if rule.effective_date > record_date:
            continue
        if rule.expire_date and record_date > rule.expire_date:
            continue
        if income < rule.income_min:
            continue
        if rule.income_max is not None and income >= rule.income_max:
            continue
        applicable.append(rule)
    
    if not applicable:
        return None
    
    applicable.sort(key=lambda r: r.income_min, reverse=True)
    return applicable[0]


def calculate_tax(rule: TaxRule, income: Decimal) -> Decimal:
    """计算税额"""
    return (income * rule.tax_rate) - rule.quick_deduction


class RewardAggregator:
    """流水归集器"""
    
    def __init__(self, streamers: List[Streamer], rewards: List[RewardRecord],
                 refunds: List[RefundRecord]):
        self.streamers = streamers
        self.rewards = rewards
        self.refunds = refunds
        self.streamer_map = {s.streamer_id: s for s in streamers}
        self.warnings: List[str] = []
    
    def aggregate_by_period(self, target_period: Optional[str] = None) -> Dict[str, Dict[str, SettlementDetail]]:
        """按周期和主播聚合流水
        
        Returns:
            {period: {streamer_id: SettlementDetail}}
        """
        period_streamer_rewards: Dict[str, Dict[str, List[RewardRecord]]] = defaultdict(lambda: defaultdict(list))
        period_streamer_refunds: Dict[str, Dict[str, List[RefundRecord]]] = defaultdict(lambda: defaultdict(list))
        
        for reward in self.rewards:
            if reward.is_refunded:
                continue
            period = reward.settlement_period
            if target_period and period != target_period:
                continue
            period_streamer_rewards[period][reward.streamer_id].append(reward)
        
        for refund in self.refunds:
            period = refund.refund_processed_period or refund.original_settlement_period
            if target_period and period != target_period:
                continue
            period_streamer_refunds[period][refund.streamer_id].append(refund)
        
        all_periods = set(period_streamer_rewards.keys()) | set(period_streamer_refunds.keys())
        result: Dict[str, Dict[str, SettlementDetail]] = {}
        
        for period in sorted(all_periods):
            result[period] = {}
            streamer_ids = set(period_streamer_rewards[period].keys()) | set(period_streamer_refunds[period].keys())
            
            for streamer_id in streamer_ids:
                streamer = self.streamer_map.get(streamer_id)
                if not streamer:
                    self.warnings.append(
                        f"周期{period}: 未找到主播ID {streamer_id} 的信息，已跳过"
                    )
                    continue
                
                rewards_list = period_streamer_rewards[period].get(streamer_id, [])
                refunds_list = period_streamer_refunds[period].get(streamer_id, [])
                
                total_rewards = sum((r.amount for r in rewards_list), Decimal('0'))
                refund_amount = sum((r.refund_amount for r in refunds_list), Decimal('0'))
                
                detail = SettlementDetail(
                    streamer_id=streamer_id,
                    streamer_name=streamer.name,
                    settlement_period=period,
                    total_rewards=total_rewards,
                    refund_amount=refund_amount,
                    net_rewards=total_rewards - refund_amount,
                    reward_count=len(rewards_list),
                    refund_count=len(refunds_list),
                )
                
                result[period][streamer_id] = detail
        
        return result


class RefundProcessor:
    """退款处理器"""
    
    def __init__(self, refunds: List[RefundRecord], rewards: List[RewardRecord]):
        self.refunds = refunds
        self.rewards = rewards
        self.reward_map = {r.reward_id: r for r in rewards}
        self.warnings: List[str] = []
        self.cross_period_refunds: List[Dict] = []
    
    def detect_cross_period_refunds(self, current_period: str) -> List[Dict]:
        """检测跨期退款
        
        跨期退款：退款发生在与原始打赏不同的结算周期
        """
        cross_period = []
        for refund in self.refunds:
            refund_period = refund.refund_processed_period or current_period
            if refund_period != refund.original_settlement_period:
                refund.is_cross_period = True
                info = {
                    'refund_id': refund.refund_id,
                    'reward_id': refund.reward_id,
                    'streamer_id': refund.streamer_id,
                    'original_period': refund.original_settlement_period,
                    'refund_period': refund_period,
                    'amount': refund.refund_amount,
                    'source': refund._source.dict() if refund._source else {},
                }
                cross_period.append(info)
                self.warnings.append(
                    f"跨期退款: {refund.refund_id} (原始周期:{refund.original_settlement_period}, "
                    f"退款周期:{refund_period}, 金额:{refund.refund_amount})"
                )
        self.cross_period_refunds = cross_period
        return cross_period
    
    def validate_refunds(self) -> List[str]:
        """验证退款记录的完整性"""
        errors = []
        for refund in self.refunds:
            if refund.reward_id not in self.reward_map:
                source_info = ""
                if refund._source:
                    loc = []
                    if refund._source.sheet_name:
                        loc.append(f"Sheet:{refund._source.sheet_name}")
                    if refund._source.line_number:
                        loc.append(f"行{refund._source.line_number}")
                    source_info = f"[{', '.join(loc)}]" if loc else ""
                errors.append(
                    f"{refund._source.source_file}{source_info}: "
                    f"退款{refund.refund_id}引用的打赏记录{refund.reward_id}不存在"
                )
        return errors


class TaxCalculator:
    """税费计算器"""
    
    def __init__(self, share_versions: List[PlatformShareVersion],
                 tax_rules: List[TaxRule], streamers: List[Streamer]):
        self.share_versions = share_versions
        self.tax_rules = tax_rules
        self.streamers = streamers
        self.streamer_map = {s.streamer_id: s for s in streamers}
        self.warnings: List[str] = []
    
    def calculate_settlement(self, detail: SettlementDetail,
                             period_date: date) -> SettlementDetail:
        """计算单个主播的结算明细"""
        streamer = self.streamer_map.get(detail.streamer_id)
        if not streamer:
            self.warnings.append(f"未找到主播 {detail.streamer_id} 的信息")
            return detail
        
        share_version = get_applicable_share_version(self.share_versions, period_date)
        if not share_version:
            detail.warnings.append(f"{period_date} 无适用的分成版本，使用默认比例")
            platform_ratio = Decimal('0.5')
            streamer_ratio = Decimal('0.5')
            guild_ratio = Decimal('0')
            detail.share_version = "DEFAULT"
        else:
            platform_ratio = share_version.platform_ratio
            streamer_ratio = share_version.streamer_ratio
            guild_ratio = share_version.guild_ratio
            detail.share_version = share_version.version_id
            
            total_ratio = platform_ratio + streamer_ratio + guild_ratio
            if total_ratio != Decimal('1'):
                detail.warnings.append(
                    f"分成版本{share_version.version_id}比例合计为{total_ratio}，不等于100%"
                )
        
        detail.platform_share = detail.net_rewards * platform_ratio
        detail.guild_share = detail.net_rewards * guild_ratio
        detail.streamer_gross = detail.net_rewards * streamer_ratio
        
        tax_rule = get_applicable_tax_rule(
            self.tax_rules, streamer.tax_type, detail.streamer_gross, period_date
        )
        if not tax_rule:
            detail.warnings.append(
                f"收入{detail.streamer_gross} 无适用的税率规则，按20%估算"
            )
            detail.tax_amount = detail.streamer_gross * Decimal('0.2')
            detail.tax_rule_used = "ESTIMATED_20"
        else:
            detail.tax_amount = calculate_tax(tax_rule, detail.streamer_gross)
            detail.tax_rule_used = tax_rule.rule_id
        
        detail.streamer_net = detail.streamer_gross - detail.tax_amount
        
        return detail


class SettlementEngine:
    """结算引擎"""
    
    def __init__(self, streamers: List[Streamer], rewards: List[RewardRecord],
                 share_versions: List[PlatformShareVersion],
                 refunds: List[RefundRecord], tax_rules: List[TaxRule]):
        self.streamers = streamers
        self.rewards = rewards
        self.share_versions = share_versions
        self.refunds = refunds
        self.tax_rules = tax_rules
        
        self.aggregator = RewardAggregator(streamers, rewards, refunds)
        self.refund_processor = RefundProcessor(refunds, rewards)
        self.tax_calculator = TaxCalculator(share_versions, tax_rules, streamers)
        
        self.warnings: List[str] = []
        self.errors: List[str] = []
    
    def _parse_period_date(self, period: str) -> date:
        """解析周期字符串为日期（取该周期第1天）"""
        try:
            if len(period) == 6 and period.isdigit():
                return datetime(int(period[:4]), int(period[4:6]), 1).date()
            if len(period) == 7 and period[4] in '-_':
                return datetime(int(period[:4]), int(period[5:7]), 1).date()
            return datetime.strptime(period, '%Y-%m').date()
        except ValueError:
            self.warnings.append(f"无法解析周期 {period}，使用当前日期")
            return date.today().replace(day=1)
    
    def process_period(self, period: str) -> SettlementReport:
        """处理单个周期的结算"""
        period_date = self._parse_period_date(period)
        
        aggregated = self.aggregator.aggregate_by_period(period)
        if period not in aggregated:
            return SettlementReport(
                report_id=f"RPT_{period}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                generated_at=datetime.now(),
                settlement_period=period,
                warnings=[f"周期 {period} 无数据"],
            )
        
        refund_errors = self.refund_processor.validate_refunds()
        self.errors.extend(refund_errors)
        
        cross_period = self.refund_processor.detect_cross_period_refunds(period)
        
        streamer_details = aggregated[period]
        calculated_details: List[SettlementDetail] = []
        
        for streamer_id, detail in streamer_details.items():
            cross_for_streamer = [
                r for r in cross_period
                if r['streamer_id'] == streamer_id
                and (r['refund_period'] == period or r['original_period'] == period)
            ]
            if cross_for_streamer:
                detail.cross_period_refunds = [r['refund_id'] for r in cross_for_streamer]
                detail.warnings.append(
                    f"包含{len(cross_for_streamer)}笔跨期退款，需人工复核"
                )
            
            calculated = self.tax_calculator.calculate_settlement(detail, period_date)
            calculated_details.append(calculated)
        
        calculated_details.sort(key=lambda d: d.streamer_net, reverse=True)
        
        total_rewards = sum((d.total_rewards for d in calculated_details), Decimal('0'))
        total_refunds = sum((d.refund_amount for d in calculated_details), Decimal('0'))
        total_tax = sum((d.tax_amount for d in calculated_details), Decimal('0'))
        total_streamer_net = sum((d.streamer_net for d in calculated_details), Decimal('0'))
        
        all_warnings = (
            self.aggregator.warnings
            + self.refund_processor.warnings
            + self.tax_calculator.warnings
            + self.warnings
        )
        
        report = SettlementReport(
            report_id=f"RPT_{period}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            generated_at=datetime.now(),
            settlement_period=period,
            total_streamers=len(calculated_details),
            total_rewards=total_rewards,
            total_refunds=total_refunds,
            total_tax=total_tax,
            total_streamer_net=total_streamer_net,
            details=calculated_details,
            warnings=all_warnings,
            errors=self.errors,
        )
        
        return report
    
    def process_all_periods(self) -> List[SettlementReport]:
        """处理所有有数据的周期"""
        all_periods = set(r.settlement_period for r in self.rewards)
        all_periods.update(r.refund_processed_period or r.original_settlement_period for r in self.refunds)
        
        reports = []
        for period in sorted(all_periods):
            report = self.process_period(period)
            reports.append(report)
        
        return reports
