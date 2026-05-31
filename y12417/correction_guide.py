from typing import List, Dict, Optional
from datetime import date

from models import SettlementException, ExceptionType, DailySettlementItem, StockLoanContract


class CorrectionGuide:
    @staticmethod
    def generate_action_plan(exceptions: List[SettlementException]) -> Dict[str, List]:
        action_plan = {
            "urgent": [],
            "review": [],
            "informational": []
        }
        
        for exc in exceptions:
            action = CorrectionGuide._format_action_item(exc)
            
            if exc.severity == "HIGH":
                action_plan["urgent"].append(action)
            elif exc.severity == "MEDIUM":
                action_plan["review"].append(action)
            else:
                action_plan["informational"].append(action)
        
        return action_plan

    @staticmethod
    def _format_action_item(exc: SettlementException) -> Dict:
        related_info = []
        if exc.related_contract_id:
            related_info.append(f"合约: {exc.related_contract_id}")
        if exc.related_security_code:
            related_info.append(f"证券: {exc.related_security_code}")
        if exc.related_account_id:
            related_info.append(f"账户: {exc.related_account_id}")
        if exc.related_date:
            related_info.append(f"日期: {exc.related_date}")
        
        return {
            "exception_id": exc.exception_id,
            "type": exc.exception_type.value,
            "title": exc.title,
            "description": exc.description,
            "suggestion": exc.suggestion,
            "related": "; ".join(related_info) if related_info else "",
            "severity": exc.severity,
            "source_field": exc.source_field
        }

    @staticmethod
    def print_action_plan(action_plan: Dict[str, List]) -> str:
        lines = []
        
        lines.append("=" * 80)
        lines.append("证券借券费用日结 - 异常修正指引")
        lines.append("=" * 80)
        
        urgent_count = len(action_plan["urgent"])
        review_count = len(action_plan["review"])
        info_count = len(action_plan["informational"])
        
        lines.append(f"\n概览: 需立即处理 {urgent_count} 项 | 需人工审核 {review_count} 项 | 提示信息 {info_count} 项")
        lines.append("-" * 80)
        
        if action_plan["urgent"]:
            lines.append("\n" + "=" * 80)
            lines.append("【紧急处理 - 需立即修正】")
            lines.append("=" * 80)
            for i, item in enumerate(action_plan["urgent"], 1):
                lines.append(CorrectionGuide._format_action_item_text(i, item))
        
        if action_plan["review"]:
            lines.append("\n" + "=" * 80)
            lines.append("【人工审核 - 需业务确认】")
            lines.append("=" * 80)
            for i, item in enumerate(action_plan["review"], 1):
                lines.append(CorrectionGuide._format_action_item_text(i, item))
        
        if action_plan["informational"]:
            lines.append("\n" + "=" * 80)
            lines.append("【提示信息 - 系统自动识别】")
            lines.append("=" * 80)
            for i, item in enumerate(action_plan["informational"], 1):
                lines.append(CorrectionGuide._format_action_item_text(i, item))
        
        lines.append("\n" + "=" * 80)
        lines.append("修正完成后，请重新运行日结程序以生成准确的报表")
        lines.append("=" * 80)
        
        return "\n".join(lines)

    @staticmethod
    def _format_action_item_text(index: int, item: Dict) -> str:
        lines = []
        lines.append(f"\n{index}. {item['title']}")
        lines.append(f"   类型: {item['type']}")
        if item["related"]:
            lines.append(f"   关联: {item['related']}")
        lines.append(f"   问题: {item['description']}")
        lines.append(f"   → 建议: {item['suggestion']}")
        return "\n".join(lines)

    @staticmethod
    def explain_cross_day_return_human_readable(contract: StockLoanContract, fee: float, cross_days: int) -> str:
        explanation = f"""
┌─────────────────────────────────────────────────────────────┐
│                    归还跨日费用说明                           │
├─────────────────────────────────────────────────────────────┤
│  客户名称: {contract.account_name:<40} │
│  证券名称: {contract.security_name:<40} │
│  合约编号: {contract.contract_id:<40} │
├─────────────────────────────────────────────────────────────┤
│  应还日期: {contract.due_date.strftime('%Y-%m-%d'):<40} │
│  实还日期: {contract.actual_return_date.strftime('%Y-%m-%d') if contract.actual_return_date else '未填写':<40} │
│  逾期天数: {cross_days:>3} 天{"":<34} │
├─────────────────────────────────────────────────────────────┤
│  费用说明:{"":<51} │
│  根据业务规则，借券费用按实际占用天数计算。{"":<21} │
│  该合约在到期日未能按时归还，实际占用了 {cross_days:>3} 天，{"":<20} │
│  因此需要补收这 {cross_days:>3} 天的借券费用。{"":<28} │
├─────────────────────────────────────────────────────────────┤
│  补收金额: ¥ {fee:>10.2f}{"":<33} │
└─────────────────────────────────────────────────────────────┘
        """
        return explanation

    @staticmethod
    def explain_rate_version_change_human_readable(
        security_name: str,
        old_rate: float,
        new_rate: float,
        change_date: date,
        version_id: str
    ) -> str:
        explanation = f"""
┌─────────────────────────────────────────────────────────────┐
│                    费率版本变更说明                           │
├─────────────────────────────────────────────────────────────┤
│  证券名称: {security_name:<40} │
│  版本编号: {version_id:<40} │
├─────────────────────────────────────────────────────────────┤
│  变更日期: {change_date.strftime('%Y-%m-%d'):<40} │
│  原费率:   {old_rate:>7.4f} %{"":<32} │
│  新费率:   {new_rate:>7.4f} %{"":<32} │
│  变动:     {'+' if new_rate > old_rate else ''}{new_rate - old_rate:>+.4f} %{"":<26} │
├─────────────────────────────────────────────────────────────┤
│  说明:{"":<53} │
│  自 {change_date.strftime('%Y年%m月%d日')} 起，该证券的借券{"":<16} │
│  费率已调整，新合约及展期合约将使用新费率计算。{"":<20} │
└─────────────────────────────────────────────────────────────┘
        """
        return explanation

    @staticmethod
    def explain_extension_missed_human_readable(
        contract: StockLoanContract,
        days_overdue: int
    ) -> str:
        explanation = f"""
┌─────────────────────────────────────────────────────────────┐
│                    可能漏展期提醒                             │
├─────────────────────────────────────────────────────────────┤
│  客户名称: {contract.account_name:<40} │
│  证券名称: {contract.security_name:<40} │
│  合约编号: {contract.contract_id:<40} │
├─────────────────────────────────────────────────────────────┤
│  出借日期: {contract.loan_date.strftime('%Y-%m-%d'):<40} │
│  到期日期: {contract.due_date.strftime('%Y-%m-%d'):<40} │
│  超期天数: {days_overdue:>3} 天{"":<34} │
├─────────────────────────────────────────────────────────────┤
│  风险提示:{"":<51} │
│  该合约已超期 {days_overdue:>3} 天，但系统中既未标记展期，{"":<18} │
│  也未记录归还。请立即核实：{"":<35} │
│  1. 是否已实际归还但未录入系统？{"":<30} │
│  2. 是否已办理展期但未更新合约？{"":<30} │
│  3. 如继续持有，请尽快办理展期手续{"":<29} │
└─────────────────────────────────────────────────────────────┘
        """
        return explanation

    @staticmethod
    def get_calculation_trace(item: DailySettlementItem) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append(f"计算追溯 - 结算明细 {item.settlement_id}")
        lines.append("=" * 80)
        lines.append(f"合约编号: {item.contract_id}")
        lines.append(f"账户名称: {item.account_name}")
        lines.append(f"证券代码: {item.security_code} ({item.security_name})")
        lines.append(f"借券数量: {item.quantity:,} 股")
        lines.append(f"结算日期: {item.settlement_date}")
        lines.append(f"费率版本: {item.rate_version_id}")
        lines.append(f"应用费率: {item.rate:.4f}%")
        lines.append("-" * 80)
        lines.append(f"计算天数: {item.days} 天")
        lines.append(f"基础费用: ¥ {item.base_fee:>12.2f}")
        if item.extension_fee > 0:
            lines.append(f"展期费用: ¥ {item.extension_fee:>12.2f}")
        if item.cross_day_adjustment != 0:
            lines.append(f"跨日调整: ¥ {item.cross_day_adjustment:>12.2f}")
        lines.append("-" * 80)
        lines.append(f"费用合计: ¥ {item.total_fee:>12.2f}")
        lines.append("-" * 80)
        lines.append("计算过程:")
        lines.append(f"  {item.calculation_details}")
        lines.append("=" * 80)
        return "\n".join(lines)
