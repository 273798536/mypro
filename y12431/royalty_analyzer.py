import uuid
from datetime import datetime
from typing import List, Dict, Tuple
from collections import defaultdict
from models import (
    AuthorizationContract, DepositRecord, PaymentReport,
    RoyaltySplit, AnomalyDetail, AnomalyType, AnalysisResult,
    SourceReference
)


class RoyaltyAnalyzer:
    def __init__(self):
        self.anomalies: List[AnomalyDetail] = []
        self.anomaly_counter = 0
    
    def _create_anomaly(self, anomaly_type: AnomalyType, description: str,
                        contract_no: str, sources: List[SourceReference],
                        correction_suggestion: str, period: str = None,
                        expected_value: float = None, actual_value: float = None,
                        related_data: Dict = None) -> AnomalyDetail:
        self.anomaly_counter += 1
        return AnomalyDetail(
            id=f"anomaly_{self.anomaly_counter}",
            type=anomaly_type,
            description=description,
            contract_no=contract_no,
            period=period,
            expected_value=expected_value,
            actual_value=actual_value,
            difference=(expected_value - actual_value) if expected_value is not None and actual_value is not None else None,
            sources=sources,
            correction_suggestion=correction_suggestion,
            related_data=related_data or {}
        )
    
    def _parse_period_to_date(self, period_str: str) -> Tuple[int, int]:
        import re
        match = re.search(r'(\d{4})[-/年]?(\d{1,2})', period_str)
        if match:
            return int(match.group(1)), int(match.group(2))
        return 0, 0
    
    def analyze_guarantee_deduction(self, contract: AuthorizationContract,
                                     payments: List[PaymentReport],
                                     deposits: List[DepositRecord]) -> Tuple[List[RoyaltySplit], List[AnomalyDetail]]:
        splits = []
        period_anomalies = []
        
        period_payments = defaultdict(list)
        for p in payments:
            if p.contract_no == contract.contract_no:
                period_payments[p.period].append(p)
        
        cumulative_royalty = 0
        guarantee_amount = contract.guaranteed_amount
        deposit_total = sum(d.amount for d in deposits if d.contract_no == contract.contract_no)
        deposit_remaining = deposit_total
        
        for period in sorted(period_payments.keys()):
            period_pay_list = period_payments[period]
            
            for payment in period_pay_list:
                net_sales = payment.sales_amount - payment.return_amount
                calculated_royalty = net_sales * contract.royalty_rate
                
                guarantee_deduction = 0
                if cumulative_royalty < guarantee_amount:
                    remaining_guarantee = guarantee_amount - cumulative_royalty
                    if calculated_royalty < remaining_guarantee:
                        guarantee_deduction = remaining_guarantee - calculated_royalty
                
                deposit_verification = 0
                if deposit_remaining > 0 and payment.actual_payment > 0:
                    deposit_verification = min(deposit_remaining, payment.actual_payment)
                    deposit_remaining -= deposit_verification
                
                final_receivable = calculated_royalty + guarantee_deduction - deposit_verification
                difference = calculated_royalty - payment.royalty_amount
                
                is_anomaly = False
                anomaly_ids = []
                sources = [payment.source, contract.source]
                
                if abs(difference) > 0.01:
                    anomaly = self._create_anomaly(
                        anomaly_type=AnomalyType.ROYALTY_CALCULATION_ERROR,
                        description=f"{period}期{payment.channel}渠道授权分成计算差异：预期{calculated_royalty:.2f}元，实际{payment.royalty_amount:.2f}元",
                        contract_no=contract.contract_no,
                        period=period,
                        expected_value=calculated_royalty,
                        actual_value=payment.royalty_amount,
                        sources=sources,
                        correction_suggestion=f"1. 核对销售净额：销售额{payment.sales_amount:.2f}元 - 退货额{payment.return_amount:.2f}元 = 净销售{net_sales:.2f}元\n2. 按合同分成比例{contract.royalty_rate*100:.1f}%计算：{net_sales:.2f} × {contract.royalty_rate*100:.1f}% = {calculated_royalty:.2f}元\n3. 差异金额：{difference:.2f}元，请联系合作方确认计算依据"
                    )
                    period_anomalies.append(anomaly)
                    anomaly_ids.append(anomaly.id)
                    is_anomaly = True
                
                if guarantee_deduction > 0:
                    anomaly = self._create_anomaly(
                        anomaly_type=AnomalyType.GUARANTEE_SHORTAGE,
                        description=f"{period}期{payment.channel}渠道保底抵扣：累计授权分成{cumulative_royalty:.2f}元未达保底{guarantee_amount:.2f}元，需补收{guarantee_deduction:.2f}元",
                        contract_no=contract.contract_no,
                        period=period,
                        expected_value=guarantee_amount,
                        actual_value=cumulative_royalty,
                        sources=sources,
                        correction_suggestion=f"1. 合同保底金额：{guarantee_amount:.2f}元（合同编号：{contract.contract_no}）\n2. 截止{period}期累计授权分成：{cumulative_royalty:.2f}元\n3. 本期需补收保底差额：{guarantee_deduction:.2f}元\n4. 请在{period}期回款中一并收取保底差额"
                    )
                    period_anomalies.append(anomaly)
                    anomaly_ids.append(anomaly.id)
                    is_anomaly = True
                
                cumulative_royalty += calculated_royalty + guarantee_deduction
                
                split = RoyaltySplit(
                    period=period,
                    contract_no=contract.contract_no,
                    brand_name=contract.brand_name,
                    channel=payment.channel,
                    sales_amount=payment.sales_amount,
                    return_amount=payment.return_amount,
                    net_sales=net_sales,
                    royalty_rate=contract.royalty_rate,
                    calculated_royalty=calculated_royalty,
                    actual_royalty=payment.royalty_amount,
                    difference=difference,
                    guarantee_deduction=guarantee_deduction,
                    deposit_verification=deposit_verification,
                    final_receivable=final_receivable,
                    is_anomaly=is_anomaly,
                    anomaly_ids=anomaly_ids,
                    sources=sources
                )
                splits.append(split)
        
        return splits, period_anomalies
    
    def detect_cross_period_returns(self, payments: List[PaymentReport]) -> List[AnomalyDetail]:
        anomalies = []
        
        contract_periods = defaultdict(lambda: defaultdict(list))
        for p in payments:
            contract_periods[p.contract_no][p.period].append(p)
        
        for contract_no, periods in contract_periods.items():
            sorted_periods = sorted(periods.keys(), key=self._parse_period_to_date)
            
            for i, period in enumerate(sorted_periods):
                for payment in periods[period]:
                    if payment.return_amount > 0 and payment.report_date:
                        year, month = self._parse_period_to_date(period)
                        report_month = payment.report_date.month if payment.report_date else month
                        
                        if abs(report_month - month) > 1 and year > 0:
                            anomaly = self._create_anomaly(
                                anomaly_type=AnomalyType.CROSS_PERIOD_RETURN,
                                description=f"{period}期{payment.channel}渠道存在退货跨期：退货额{payment.return_amount:.2f}元，报告日期{payment.report_date}与结算周期{period}相差{abs(report_month - month)}个月",
                                contract_no=contract_no,
                                period=period,
                                actual_value=payment.return_amount,
                                sources=[payment.source],
                                correction_suggestion=f"1. 退货发生日期：{payment.report_date}\n2. 计入周期：{period}\n3. 建议操作：\n   - 核实退货实际发生的账期\n   - 如确属跨期，调整对应周期销售数据\n   - 在{period}期备注中说明跨期原因\n   - 后续退货需在发生当期申报"
                            )
                            anomalies.append(anomaly)
        
        return anomalies
    
    def detect_channel_missing(self, contract: AuthorizationContract,
                                payments: List[PaymentReport],
                                expected_channels: List[str] = None) -> List[AnomalyDetail]:
        anomalies = []
        
        if expected_channels is None:
            all_channels = set(p.channel for p in payments if p.contract_no == contract.contract_no)
            expected_channels = list(all_channels)
        
        period_channels = defaultdict(set)
        for p in payments:
            if p.contract_no == contract.contract_no:
                period_channels[p.period].add(p.channel)
        
        for period, channels in period_channels.items():
            missing = set(expected_channels) - channels
            if missing:
                anomaly = self._create_anomaly(
                    anomaly_type=AnomalyType.CHANNEL_MISSING,
                    description=f"{period}期存在渠道漏报：缺少{', '.join(missing)}渠道数据",
                    contract_no=contract.contract_no,
                    period=period,
                    sources=[contract.source],
                    correction_suggestion=f"1. 预期渠道：{', '.join(expected_channels)}\n2. 实报渠道：{', '.join(channels)}\n3. 缺失渠道：{', '.join(missing)}\n4. 建议操作：\n   - 向合作方索要缺失渠道的{period}期销售数据\n   - 核实该渠道当期是否确实无销售\n   - 如无销售需提供零申报证明\n   - 补充数据后重新计算授权分成"
                )
                anomalies.append(anomaly)
        
        return anomalies
    
    def analyze_deposit_verification(self, deposits: List[DepositRecord],
                                      payments: List[PaymentReport]) -> List[AnomalyDetail]:
        anomalies = []
        
        contract_deposits = defaultdict(list)
        for d in deposits:
            contract_deposits[d.contract_no].append(d)
        
        for contract_no, dep_list in contract_deposits.items():
            total_deposit = sum(d.amount for d in dep_list)
            total_verified = sum(d.verified_amount for d in dep_list)
            
            if total_verified > total_deposit:
                sources = [d.source for d in dep_list]
                anomaly = self._create_anomaly(
                    anomaly_type=AnomalyType.DEPOSIT_MISMATCH,
                    description=f"合同{contract_no}保证金核销异常：累计核销{total_verified:.2f}元超过保证金总额{total_deposit:.2f}元",
                    contract_no=contract_no,
                    expected_value=total_deposit,
                    actual_value=total_verified,
                    sources=sources,
                    correction_suggestion=f"1. 保证金总额：{total_deposit:.2f}元\n2. 累计核销：{total_verified:.2f}元\n3. 超额核销：{total_verified - total_deposit:.2f}元\n4. 建议操作：\n   - 核对每笔核销记录\n   - 冲回超额核销部分\n   - 更新保证金余额表\n   - 后续核销前确认可用余额"
                )
                anomalies.append(anomaly)
            
            unverified = [d for d in dep_list if not d.is_verified and d.receive_date]
            if len(unverified) >= 3:
                sources = [d.source for d in unverified[:3]]
                anomaly = self._create_anomaly(
                    anomaly_type=AnomalyType.DEPOSIT_MISMATCH,
                    description=f"合同{contract_no}有{len(unverified)}笔保证金超过3期未核销",
                    contract_no=contract_no,
                    actual_value=len(unverified),
                    sources=sources,
                    correction_suggestion=f"1. 未核销笔数：{len(unverified)}笔\n2. 建议操作：\n   - 检查回款是否到账\n   - 及时办理核销手续\n   - 更新保证金状态"
                )
                anomalies.append(anomaly)
        
        return anomalies
    
    def run_full_analysis(self, contracts: List[AuthorizationContract],
                          deposits: List[DepositRecord],
                          payments: List[PaymentReport],
                          source_files: List[str]) -> AnalysisResult:
        all_splits: List[RoyaltySplit] = []
        all_anomalies: List[AnomalyDetail] = []
        
        for contract in contracts:
            contract_payments = [p for p in payments if p.contract_no == contract.contract_no]
            contract_deposits = [d for d in deposits if d.contract_no == contract.contract_no]
            
            splits, guarantee_anomalies = self.analyze_guarantee_deduction(
                contract, contract_payments, contract_deposits
            )
            all_splits.extend(splits)
            all_anomalies.extend(guarantee_anomalies)
            
            channel_anomalies = self.detect_channel_missing(contract, contract_payments)
            all_anomalies.extend(channel_anomalies)
        
        cross_period_anomalies = self.detect_cross_period_returns(payments)
        all_anomalies.extend(cross_period_anomalies)
        
        deposit_anomalies = self.analyze_deposit_verification(deposits, payments)
        all_anomalies.extend(deposit_anomalies)
        
        summary_by_brand = defaultdict(lambda: {
            'total_royalty': 0,
            'total_guarantee': 0,
            'total_deposit': 0,
            'final_receivable': 0,
            'anomaly_count': 0
        })
        
        for split in all_splits:
            brand = split.brand_name
            summary_by_brand[brand]['total_royalty'] += split.calculated_royalty
            summary_by_brand[brand]['total_guarantee'] += split.guarantee_deduction
            summary_by_brand[brand]['total_deposit'] += split.deposit_verification
            summary_by_brand[brand]['final_receivable'] += split.final_receivable
            if split.is_anomaly:
                summary_by_brand[brand]['anomaly_count'] += 1
        
        summary_by_period = defaultdict(lambda: {
            'total_royalty': 0,
            'total_guarantee': 0,
            'total_deposit': 0,
            'final_receivable': 0,
            'anomaly_count': 0
        })
        
        for split in all_splits:
            period = split.period
            summary_by_period[period]['total_royalty'] += split.calculated_royalty
            summary_by_period[period]['total_guarantee'] += split.guarantee_deduction
            summary_by_period[period]['total_deposit'] += split.deposit_verification
            summary_by_period[period]['final_receivable'] += split.final_receivable
            if split.is_anomaly:
                summary_by_period[period]['anomaly_count'] += 1
        
        total_royalty = sum(s.calculated_royalty for s in all_splits)
        total_guarantee = sum(s.guarantee_deduction for s in all_splits)
        total_deposit = sum(s.deposit_verification for s in all_splits)
        total_final = sum(s.final_receivable for s in all_splits)
        
        return AnalysisResult(
            report_id=str(uuid.uuid4()),
            analysis_date=datetime.now(),
            total_contracts=len(contracts),
            total_deposits=len(deposits),
            total_payments=len(payments),
            total_royalty=total_royalty,
            total_guarantee_deduction=total_guarantee,
            total_deposit_verification=total_deposit,
            total_final_receivable=total_final,
            anomalies=all_anomalies,
            royalty_splits=all_splits,
            summary_by_brand=dict(summary_by_brand),
            summary_by_period=dict(summary_by_period),
            source_files=source_files
        )
