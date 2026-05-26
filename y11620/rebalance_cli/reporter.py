"""报告生成器：终端摘要 + JSON机器可读 + Markdown报告"""

import json
from dataclasses import asdict, dataclass, field
from typing import Optional

from .models import FailureReason, Portfolio, Suggestion, TradeAction
from .solver import FundAnalysis, SolveResult


@dataclass
class ReportData:
    portfolio_value: float = 0.0
    cash: float = 0.0
    min_trade_amount: float = 0.0
    funds: list[dict] = field(default_factory=list)
    valid_suggestions: list[dict] = field(default_factory=list)
    failed_suggestions: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _fmt_amount(v: float) -> str:
    return f"{v:,.2f}"


def _fmt_pct(v: float) -> str:
    return f"{v:.2f}%"


def _build_report_data(
    portfolio: Portfolio,
    analysis_result: SolveResult,
    suggestions: list[Suggestion],
) -> ReportData:
    data = ReportData(
        portfolio_value=portfolio.total_market_value,
        cash=portfolio.cash,
        min_trade_amount=portfolio.min_trade_amount,
    )

    for a in analysis_result.analyses:
        fund_entry = {
            "fund_code": a.fund_code,
            "fund_name": a.fund_name,
            "current_weight": round(a.current_weight, 4),
            "target_weight": round(a.target_weight, 4),
            "weight_deviation": round(a.weight_deviation, 4),
            "current_value": a.current_value,
            "target_value": a.target_value,
            "value_gap": round(a.value_gap, 2),
            "action": a.action.value,
            "trade_amount": a.trade_amount,
            "is_forbidden": a.is_forbidden,
            "forbidden_reason": a.forbidden_reason,
            "min_trade_violation": a.min_trade_violation,
            "position_limit_violation": a.position_limit_violation,
            "insufficient_cash": a.insufficient_cash,
            "insufficient_holding": a.insufficient_holding,
            "source_hint": a.source_hint,
        }
        data.funds.append(fund_entry)

    for s in suggestions:
        entry = {
            "fund_code": s.fund_code,
            "fund_name": s.fund_name,
            "action": s.action.value,
            "amount": s.amount,
            "is_valid": s.is_valid,
            "failure_reason": s.failure_reason.value if s.failure_reason else "",
            "failure_source": str(s.failure_source) if s.failure_source else "",
            "source": str(s.source) if s.source else "",
        }
        if s.is_valid:
            data.valid_suggestions.append(entry)
        else:
            data.failed_suggestions.append(entry)

    data.warnings = analysis_result.warnings
    return data


def render_terminal(
    portfolio: Portfolio,
    analysis_result: SolveResult,
    suggestions: list[Suggestion],
) -> str:
    lines = []
    total_mv = portfolio.total_market_value

    lines.append("=" * 60)
    lines.append("  基金组合再平衡 — 终端摘要")
    lines.append("=" * 60)
    lines.append(f"  组合总市值: {_fmt_amount(total_mv)}  |  现金: {_fmt_amount(portfolio.cash)}  |  最小交易额: {_fmt_amount(portfolio.min_trade_amount)}")
    lines.append("-" * 60)

    lines.append(f"\n  权重偏离分析 ({len(analysis_result.analyses)} 只基金):")
    lines.append(f"  {'代码':<12} {'名称':<16} {'当前%':>8} {'目标%':>8} {'偏离%':>8} {'缺口':>12} {'操作':>6}")
    lines.append("  " + "-" * 80)

    for a in analysis_result.analyses:
        dev_sign = "+" if a.weight_deviation >= 0 else ""
        lines.append(
            f"  {a.fund_code:<12} {a.fund_name:<16} "
            f"{_fmt_pct(a.current_weight):>8} {_fmt_pct(a.target_weight):>8} "
            f"{dev_sign}{_fmt_pct(a.weight_deviation):>7} "
            f"{_fmt_amount(a.value_gap):>12} {a.action.value:>6}"
        )

    alerts = [a for a in analysis_result.analyses
              if a.is_forbidden or a.min_trade_violation or
              a.insufficient_cash or a.insufficient_holding or
              a.position_limit_violation]

    if alerts:
        lines.append(f"\n  ⚠ 异常警示 ({len(alerts)} 项):")
        for a in alerts:
            alert_parts = []
            if a.is_forbidden:
                alert_parts.append(f"禁买: {a.forbidden_reason} (来源: {a.forbidden_source})")
            if a.min_trade_violation:
                alert_parts.append(f"交易额 {_fmt_amount(a.trade_amount)} 低于最小 {_fmt_amount(portfolio.min_trade_amount)}")
            if a.insufficient_cash:
                alert_parts.append(f"需买入 {_fmt_amount(a.trade_amount)}，现金不足")
            if a.insufficient_holding:
                alert_parts.append(f"需卖出 {_fmt_amount(a.trade_amount)}，持仓不足")
            if a.position_limit_violation:
                alert_parts.append(f"持仓限制: {a.limit_violation_detail}")
            lines.append(f"    {a.fund_code} {a.fund_name}: {' | '.join(alert_parts)}")
            lines.append(f"      来源: {a.source_hint}")

    if suggestions:
        valid = [s for s in suggestions if s.is_valid]
        failed = [s for s in suggestions if not s.is_valid]

        lines.append(f"\n  调仓建议:")
        lines.append(f"  {'代码':<12} {'名称':<16} {'操作':>6} {'金额':>14} {'状态':>10}")
        lines.append("  " + "-" * 62)

        for s in suggestions:
            status = "✓" if s.is_valid else "✗"
            lines.append(
                f"  {s.fund_code:<12} {s.fund_name:<16} "
                f"{s.action.value:>6} {_fmt_amount(s.amount):>14} {status:>10}"
            )
            if not s.is_valid:
                lines.append(
                    f"    失败原因: {s.failure_reason.value}"
                    + (f" (来源: {s.failure_source})" if s.failure_source else "")
                )

        lines.append(f"\n  统计: 可行 {len(valid)} 条, 失败 {len(failed)} 条")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)


def render_json(
    portfolio: Portfolio,
    analysis_result: SolveResult,
    suggestions: list[Suggestion],
) -> str:
    data = _build_report_data(portfolio, analysis_result, suggestions)
    return json.dumps(asdict(data), ensure_ascii=False, indent=2)


def render_markdown(
    portfolio: Portfolio,
    analysis_result: SolveResult,
    suggestions: list[Suggestion],
) -> str:
    lines = []
    total_mv = portfolio.total_market_value

    lines.append("# 基金组合再平衡报告")
    lines.append("")
    lines.append("## 组合概况")
    lines.append("")
    lines.append("| 指标 | 数值 |")
    lines.append("|------|------|")
    lines.append(f"| 组合总市值 | {_fmt_amount(total_mv)} |")
    lines.append(f"| 现金余额 | {_fmt_amount(portfolio.cash)} |")
    lines.append(f"| 最小交易额 | {_fmt_amount(portfolio.min_trade_amount)} |")
    lines.append(f"| 持仓基金数 | {len(portfolio.holdings)} |")
    lines.append(f"| 目标权重项数 | {len(portfolio.target_weights)} |")
    lines.append("")

    lines.append("## 权重偏离分析")
    lines.append("")
    lines.append("| 基金代码 | 基金名称 | 当前权重 | 目标权重 | 偏离 | 市值缺口 | 操作 |")
    lines.append("|----------|----------|----------|----------|------|----------|------|")

    for a in analysis_result.analyses:
        dev_sign = "+" if a.weight_deviation >= 0 else ""
        lines.append(
            f"| {a.fund_code} | {a.fund_name} "
            f"| {_fmt_pct(a.current_weight)} | {_fmt_pct(a.target_weight)} "
            f"| {dev_sign}{_fmt_pct(a.weight_deviation)} "
            f"| {_fmt_amount(a.value_gap)} | {a.action.value} |"
        )

    alerts = [a for a in analysis_result.analyses
              if a.is_forbidden or a.min_trade_violation or
              a.insufficient_cash or a.insufficient_holding or
              a.position_limit_violation]

    if alerts:
        lines.append("")
        lines.append("## ⚠ 异常警示")
        lines.append("")
        for a in alerts:
            lines.append(f"### {a.fund_code} {a.fund_name}")
            lines.append("")
            if a.is_forbidden:
                lines.append(f"- **禁买基金**: {a.forbidden_reason}")
                lines.append(f"  - 来源: `{a.forbidden_source}`")
            if a.min_trade_violation:
                lines.append(f"- **小额交易碎片**: 交易额 {_fmt_amount(a.trade_amount)} 低于最小 {_fmt_amount(portfolio.min_trade_amount)}")
            if a.insufficient_cash:
                lines.append(f"- **现金不足**: 需买入 {_fmt_amount(a.trade_amount)}，现金仅 {_fmt_amount(portfolio.cash)}")
            if a.insufficient_holding:
                lines.append(f"- **持仓不足**: 需卖出 {_fmt_amount(a.trade_amount)}，持仓市值 {_fmt_amount(a.current_value)}")
            if a.position_limit_violation:
                lines.append(f"- **持仓限制**: {a.limit_violation_detail}")
            lines.append(f"- 来源痕迹: `{a.source_hint}`")
            lines.append("")

    if suggestions:
        valid = [s for s in suggestions if s.is_valid]
        failed = [s for s in suggestions if not s.is_valid]

        lines.append("## 调仓建议")
        lines.append("")
        lines.append(f"- **可行建议**: {len(valid)} 条")
        lines.append(f"- **失败建议**: {len(failed)} 条")
        lines.append("")
        lines.append("| 基金代码 | 基金名称 | 操作 | 金额 | 状态 | 失败原因 | 来源 |")
        lines.append("|----------|----------|------|------|------|----------|------|")

        for s in suggestions:
            status = "✓ 可行" if s.is_valid else "✗ 失败"
            reason = s.failure_reason.value if not s.is_valid else "-"
            src = str(s.failure_source) if (not s.is_valid and s.failure_source) else "-"
            lines.append(
                f"| {s.fund_code} | {s.fund_name} "
                f"| {s.action.value} | {_fmt_amount(s.amount)} "
                f"| {status} | {reason} | {src} |"
            )

    return "\n".join(lines)
