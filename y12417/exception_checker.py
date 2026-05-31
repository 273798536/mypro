import uuid
from datetime import date, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass

from models import (
    StockLoanContract, CustomerAccount, FeeRate,
    SettlementException, ExceptionType, ContractStatus
)
from rate_manager import RateManager


@dataclass
class CheckResult:
    exceptions: List[SettlementException]
    summary: Dict[str, int]


class ExceptionChecker:
    def __init__(self, rate_manager: RateManager):
        self.rate_manager = rate_manager

    def run_all_checks(
        self,
        contracts: List[StockLoanContract],
        accounts: List[CustomerAccount],
        check_date: date
    ) -> CheckResult:
        exceptions: List[SettlementException] = []
        
        exceptions.extend(self.check_extension_missed(contracts, check_date))
        exceptions.extend(self.check_rate_expired(contracts, check_date))
        exceptions.extend(self.check_cross_day_return(contracts, check_date))
        exceptions.extend(self.check_data_incomplete(contracts))
        exceptions.extend(self.check_account_name_changes(contracts, accounts))
        exceptions.extend(self.check_rate_missing(contracts, check_date))
        
        summary = self._summarize_exceptions(exceptions)
        return CheckResult(exceptions=exceptions, summary=summary)

    def check_extension_missed(
        self,
        contracts: List[StockLoanContract],
        check_date: date
    ) -> List[SettlementException]:
        exceptions = []
        
        for contract in contracts:
            if contract.status in [ContractStatus.RETURNED, ContractStatus.EXPIRED]:
                continue
            
            if contract.is_extended:
                continue
            
            days_overdue = (check_date - contract.due_date).days
            
            if days_overdue > 0 and not contract.actual_return_date:
                exc = SettlementException(
                    exception_id=f"EXC-EXT-{uuid.uuid4().hex[:6]}",
                    exception_type=ExceptionType.EXTENSION_MISSED,
                    severity="HIGH",
                    title=f"合约[{contract.contract_id}]可能漏展期",
                    description=(
                        f"客户[{contract.account_name}]的{contract.security_name}借券合约"
                        f"应于{contract.due_date}到期，现已超期{days_overdue}天。"
                        f"合约状态为{contract.status.value}，未标记展期，也未记录归还。"
                        f"借券数量：{contract.quantity}股，出借日期：{contract.loan_date}"
                    ),
                    suggestion=(
                        "请立即核实：1) 该合约是否已办理展期手续？"
                        "2) 是否已实际归还但未录入系统？"
                        "3) 如确需展期，请更新合约到期日并标记展期状态"
                    ),
                    related_contract_id=contract.contract_id,
                    related_security_code=contract.security_code,
                    related_account_id=contract.account_id,
                    related_date=contract.due_date,
                    source_field="due_date"
                )
                exceptions.append(exc)
            elif 0 <= days_overdue <= 2 and not contract.actual_return_date:
                exc = SettlementException(
                    exception_id=f"EXC-EXT-{uuid.uuid4().hex[:6]}",
                    exception_type=ExceptionType.EXTENSION_MISSED,
                    severity="MEDIUM",
                    title=f"合约[{contract.contract_id}]即将到期",
                    description=(
                        f"客户[{contract.account_name}]的{contract.security_name}借券合约"
                        f"将于{contract.due_date}到期（距今日还有{-days_overdue}天）。"
                        f"请提前确认是否需要展期"
                    ),
                    suggestion=(
                        "建议提前与客户确认是否展期，避免到期未处理造成资金占用"
                    ),
                    related_contract_id=contract.contract_id,
                    related_security_code=contract.security_code,
                    related_account_id=contract.account_id,
                    related_date=contract.due_date,
                    source_field="due_date"
                )
                exceptions.append(exc)
        
        return exceptions

    def check_rate_expired(
        self,
        contracts: List[StockLoanContract],
        check_date: date
    ) -> List[SettlementException]:
        exceptions = []
        
        for contract in contracts:
            if contract.status == ContractStatus.RETURNED:
                continue
            
            rate_result = self.rate_manager.get_rate_for_date(
                contract.security_code, check_date
            )
            
            if rate_result.is_expired:
                exc = SettlementException(
                    exception_id=f"EXC-RATE-{uuid.uuid4().hex[:6]}",
                    exception_type=ExceptionType.RATE_EXPIRED,
                    severity="HIGH",
                    title=f"证券[{contract.security_code}]费率已过期",
                    description=(
                        f"合约[{contract.contract_id}]使用的{contract.security_name}费率"
                        f"已于{rate_result.expiry_date}过期。"
                        f"当前结算日{check_date}无有效费率，可能导致费用计算错误。"
                        f"过期费率版本：{rate_result.version_id}，费率：{rate_result.rate}%"
                    ),
                    suggestion=(
                        "请立即更新费率表：1) 确认该证券最新费率标准；"
                        "2) 在费率系统中添加新的费率版本；"
                        "3) 回溯检查过期后的费用计算是否正确"
                    ),
                    related_contract_id=contract.contract_id,
                    related_security_code=contract.security_code,
                    related_account_id=contract.account_id,
                    related_date=rate_result.expiry_date,
                    source_field="rate"
                )
                exceptions.append(exc)
            elif rate_result.expiry_date:
                days_to_expiry = (rate_result.expiry_date - check_date).days
                if 0 < days_to_expiry <= 7:
                    exc = SettlementException(
                        exception_id=f"EXC-RATE-{uuid.uuid4().hex[:6]}",
                        exception_type=ExceptionType.RATE_EXPIRED,
                        severity="LOW",
                        title=f"证券[{contract.security_code}]费率即将到期",
                        description=(
                            f"合约[{contract.contract_id}]使用的{contract.security_name}费率"
                            f"将于{rate_result.expiry_date}到期（剩余{days_to_expiry}天）。"
                            f"费率版本：{rate_result.version_id}，当前费率：{rate_result.rate}%"
                        ),
                        suggestion=(
                            "请及时更新费率，避免费率中断影响正常结算"
                        ),
                        related_contract_id=contract.contract_id,
                        related_security_code=contract.security_code,
                        related_account_id=contract.account_id,
                        related_date=rate_result.expiry_date,
                        source_field="rate"
                    )
                    exceptions.append(exc)
        
        return exceptions

    def check_cross_day_return(
        self,
        contracts: List[StockLoanContract],
        check_date: date
    ) -> List[SettlementException]:
        exceptions = []
        
        for contract in contracts:
            if not contract.actual_return_date:
                continue
            
            if contract.actual_return_date <= contract.due_date:
                continue
            
            cross_days = (contract.actual_return_date - contract.due_date).days
            
            rate_result = self.rate_manager.get_rate_for_date(
                contract.security_code, contract.due_date
            )
            daily_rate = rate_result.rate if rate_result.found else 0
            estimated_fee = contract.quantity * (daily_rate / 100) * (cross_days / 365)
            
            exc = SettlementException(
                exception_id=f"EXC-CROSS-{uuid.uuid4().hex[:6]}",
                exception_type=ExceptionType.CROSS_DAY_RETURN,
                severity="MEDIUM",
                title=f"合约[{contract.contract_id}]归还跨日",
                description=(
                    f"客户[{contract.account_name}]的{contract.security_name}借券"
                    f"应还日期：{contract.due_date}，实际归还：{contract.actual_return_date}，"
                    f"逾期{cross_days}天。"
                    f"按当前费率估算需补收费用约：{estimated_fee:.2f}元。"
                    f"（注：这{cross_days}天客户实际占用了券源，需按实际占用天数计费）"
                ),
                suggestion=(
                    "请与业务线确认：1) 此次逾期归还是否属于正常业务场景？"
                    "2) 是否已与客户沟通并确认相关费用？"
                    "3) 是否需要额外收取罚息？"
                    "4) 建议在合约备注中记录逾期原因"
                ),
                related_contract_id=contract.contract_id,
                related_security_code=contract.security_code,
                related_account_id=contract.account_id,
                related_date=contract.actual_return_date,
                source_field="actual_return_date"
            )
            exceptions.append(exc)
        
        return exceptions

    def check_data_incomplete(
        self,
        contracts: List[StockLoanContract]
    ) -> List[SettlementException]:
        exceptions = []
        
        for contract in contracts:
            issues = []
            
            if not contract.account_id or not contract.account_id.strip():
                issues.append("账户编号为空")
            
            if not contract.account_name or not contract.account_name.strip():
                issues.append("账户名称为空")
            
            if not contract.security_code or not contract.security_code.strip():
                issues.append("证券代码为空")
            
            if contract.quantity <= 0:
                issues.append(f"借券数量异常({contract.quantity})")
            
            if not contract.loan_date:
                issues.append("出借日期为空")
            
            if not contract.due_date:
                issues.append("到期日期为空")
            
            if contract.loan_date and contract.due_date and contract.loan_date > contract.due_date:
                issues.append("出借日期晚于到期日期")
            
            if issues:
                exc = SettlementException(
                    exception_id=f"EXC-DATA-{uuid.uuid4().hex[:6]}",
                    exception_type=ExceptionType.DATA_INCOMPLETE,
                    severity="HIGH",
                    title=f"合约[{contract.contract_id}]数据不完整",
                    description=(
                        f"合约数据存在以下问题：{', '.join(issues)}。"
                        f"来源：{contract.imported_from}"
                    ),
                    suggestion=(
                        "请检查原始数据文件，补充缺失信息后重新导入。"
                        "数据不完整可能导致费用计算错误"
                    ),
                    related_contract_id=contract.contract_id,
                    related_security_code=contract.security_code,
                    related_account_id=contract.account_id,
                    source_field="multiple"
                )
                exceptions.append(exc)
        
        return exceptions

    def check_account_name_changes(
        self,
        contracts: List[StockLoanContract],
        accounts: List[CustomerAccount]
    ) -> List[SettlementException]:
        exceptions = []
        account_map = {a.account_id: a for a in accounts}
        
        for contract in contracts:
            account = account_map.get(contract.account_id)
            if not account:
                continue
            
            if contract.account_name != account.account_name:
                previous_names = account.previous_names if account.previous_names else []
                
                if contract.account_name in previous_names:
                    exc = SettlementException(
                        exception_id=f"EXC-ACCT-{uuid.uuid4().hex[:6]}",
                        exception_type=ExceptionType.ACCOUNT_NAME_CHANGED,
                        severity="LOW",
                        title=f"账户[{contract.account_id}]名称已更新",
                        description=(
                            f"合约[{contract.contract_id}]中记录的账户名"
                            f"[{contract.account_name}]为历史名称，"
                            f"当前系统中该账户已更名为[{account.account_name}]。"
                            f"历史曾用名包括：{', '.join(previous_names)}"
                        ),
                        suggestion=(
                            "该差异已自动识别，系统将按最新账户名处理。"
                            "建议更新合约数据中的账户名以保持一致性"
                        ),
                        related_contract_id=contract.contract_id,
                        related_account_id=contract.account_id,
                        source_field="account_name"
                    )
                    exceptions.append(exc)
                else:
                    exc = SettlementException(
                        exception_id=f"EXC-ACCT-{uuid.uuid4().hex[:6]}",
                        exception_type=ExceptionType.ACCOUNT_NAME_CHANGED,
                        severity="MEDIUM",
                        title=f"账户[{contract.account_id}]名称不匹配",
                        description=(
                            f"合约[{contract.contract_id}]中的账户名"
                            f"[{contract.account_name}]与系统当前账户名"
                            f"[{account.account_name}]不一致，且不在历史名称列表中。"
                        ),
                        suggestion=(
                            "请核实：1) 是否为账户更名未录入系统？"
                            "2) 合约账户是否填错？"
                            "3) 如确为更名，请在账户信息中添加曾用名记录"
                        ),
                        related_contract_id=contract.contract_id,
                        related_account_id=contract.account_id,
                        source_field="account_name"
                    )
                    exceptions.append(exc)
        
        return exceptions

    def check_rate_missing(
        self,
        contracts: List[StockLoanContract],
        check_date: date
    ) -> List[SettlementException]:
        exceptions = []
        checked_securities = set()
        
        for contract in contracts:
            if contract.security_code in checked_securities:
                continue
            
            rate_result = self.rate_manager.get_rate_for_date(
                contract.security_code, check_date
            )
            
            if not rate_result.found and not rate_result.is_expired:
                exc = SettlementException(
                    exception_id=f"EXC-RATE-{uuid.uuid4().hex[:6]}",
                    exception_type=ExceptionType.RATE_MISSING,
                    severity="HIGH",
                    title=f"证券[{contract.security_code}]缺失费率配置",
                    description=(
                        f"证券{contract.security_name}({contract.security_code})"
                        f"在{check_date}无有效费率配置。{rate_result.message}"
                        f"涉及合约：{contract.contract_id}等"
                    ),
                    suggestion=(
                        "请立即在费率表中添加该证券的费率配置，"
                        "否则无法正确计算相关合约的费用"
                    ),
                    related_security_code=contract.security_code,
                    related_date=check_date,
                    source_field="rate"
                )
                exceptions.append(exc)
            
            checked_securities.add(contract.security_code)
        
        return exceptions

    def _summarize_exceptions(
        self,
        exceptions: List[SettlementException]
    ) -> Dict[str, int]:
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
            
            severity = exc.severity
            if severity in summary:
                summary[severity] += 1
        
        return summary

    def format_exceptions_for_report(
        self,
        exceptions: List[SettlementException]
    ) -> str:
        if not exceptions:
            return "无异常"
        
        lines = []
        lines.append(f"发现 {len(exceptions)} 个异常：")
        lines.append("=" * 80)
        
        by_severity = {"HIGH": [], "MEDIUM": [], "LOW": []}
        for exc in exceptions:
            by_severity[exc.severity].append(exc)
        
        for severity in ["HIGH", "MEDIUM", "LOW"]:
            exc_list = by_severity[severity]
            if not exc_list:
                continue
            
            lines.append(f"\n【{severity} 严重级 - 共{len(exc_list)}项】")
            
            for i, exc in enumerate(exc_list, 1):
                lines.append(f"\n{i}. {exc.title}")
                lines.append(f"   描述: {exc.description}")
                lines.append(f"   建议: {exc.suggestion}")
                if exc.related_contract_id:
                    lines.append(f"   相关合约: {exc.related_contract_id}")
                if exc.related_date:
                    lines.append(f"   相关日期: {exc.related_date}")
        
        return "\n".join(lines)
