"""数据加载器：从CSV读取组合、目标权重、约束等，保留原始行号和来源信息"""

import csv
import os
from pathlib import Path

from .models import (
    ForbiddenFund,
    Holding,
    Portfolio,
    PositionLimit,
    SourceInfo,
    Suggestion,
    TargetWeight,
    TradeAction,
)


class DataLoadError(Exception):
    def __init__(self, message: str, source: SourceInfo):
        super().__init__(f"{message} [{source}]")
        self.source = source


def _make_source(file_path: str, line_no: int) -> SourceInfo:
    return SourceInfo(file=os.path.basename(file_path), line_no=line_no)


def _safe_float(val: str, source: SourceInfo, field_name: str) -> float:
    val = val.strip()
    if not val:
        return 0.0
    try:
        return float(val)
    except ValueError:
        raise DataLoadError(
            f"字段 '{field_name}' 无法解析为数字: '{val}'", source
        )


def _safe_int(val: str, source: SourceInfo, field_name: str) -> int:
    val = val.strip()
    if not val:
        return 0
    try:
        return int(val)
    except ValueError:
        raise DataLoadError(
            f"字段 '{field_name}' 无法解析为整数: '{val}'", source
        )


def load_holdings(file_path: str) -> list[Holding]:
    holdings = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            fund_code = (row.get("基金代码") or row.get("fund_code") or "").strip()
            if not fund_code:
                raise DataLoadError("基金代码为空", source)
            fund_name = (row.get("基金名称") or row.get("fund_name") or fund_code).strip()
            shares = _safe_float(
                row.get("持仓份额", row.get("shares", "0")), source, "持仓份额"
            )
            price = _safe_float(
                row.get("当前净值", row.get("current_price", "0")), source, "当前净值"
            )
            holdings.append(
                Holding(
                    fund_code=fund_code,
                    fund_name=fund_name,
                    shares=shares,
                    current_price=price,
                    source=source,
                )
            )
    return holdings


def load_target_weights(file_path: str) -> list[TargetWeight]:
    targets = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            fund_code = (row.get("基金代码") or row.get("fund_code") or "").strip()
            if not fund_code:
                raise DataLoadError("基金代码为空", source)
            tw = _safe_float(
                row.get("目标权重", row.get("target_weight", "0")),
                source,
                "目标权重",
            )
            targets.append(TargetWeight(fund_code=fund_code, target_weight=tw, source=source))
    return targets


def load_position_limits(file_path: str) -> list[PositionLimit]:
    limits = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            fund_code = (row.get("基金代码") or row.get("fund_code") or "").strip()
            if not fund_code:
                raise DataLoadError("基金代码为空", source)
            max_w = row.get("持仓上限", row.get("max_weight", ""))
            min_w = row.get("持仓下限", row.get("min_weight", ""))
            limits.append(
                PositionLimit(
                    fund_code=fund_code,
                    max_weight=_safe_float(max_w, source, "持仓上限") if max_w.strip() else None,
                    min_weight=_safe_float(min_w, source, "持仓下限") if min_w.strip() else None,
                    source=source,
                )
            )
    return limits


def load_forbidden_list(file_path: str) -> list[ForbiddenFund]:
    forbidden = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            fund_code = (row.get("基金代码") or row.get("fund_code") or "").strip()
            if not fund_code:
                raise DataLoadError("基金代码为空", source)
            reason = (row.get("禁买原因") or row.get("reason") or "无说明").strip()
            forbidden.append(ForbiddenFund(fund_code=fund_code, reason=reason, source=source))
    return forbidden


def load_suggestions(file_path: str) -> list[Suggestion]:
    suggestions = []
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            fund_code = (row.get("基金代码") or row.get("fund_code") or "").strip()
            if not fund_code:
                raise DataLoadError("基金代码为空", source)
            fund_name = (row.get("基金名称") or row.get("fund_name") or fund_code).strip()
            action_str = (row.get("操作") or row.get("action") or "").strip()
            action_map = {"买入": TradeAction.BUY, "BUY": TradeAction.BUY,
                          "卖出": TradeAction.SELL, "SELL": TradeAction.SELL,
                          "持有": TradeAction.HOLD, "HOLD": TradeAction.HOLD}
            action = action_map.get(action_str)
            if action is None:
                raise DataLoadError(
                    f"无效的操作类型: '{action_str}'，应为 买入/卖出/持有", source
                )
            amount = _safe_float(
                row.get("金额", row.get("amount", "0")), source, "金额"
            )
            priority = _safe_int(row.get("优先级", row.get("priority", "0")), source, "优先级")
            suggestions.append(
                Suggestion(
                    fund_code=fund_code,
                    fund_name=fund_name,
                    action=action,
                    amount=amount,
                    priority=priority,
                    source=source,
                )
            )
    return suggestions


def load_portfolio_config(file_path: str) -> dict:
    config = {"cash": 0.0, "min_trade_amount": 100.0}
    with open(file_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            source = _make_source(file_path, i)
            config["cash"] = _safe_float(
                row.get("现金", row.get("cash", "0")), source, "现金"
            )
            config["min_trade_amount"] = _safe_float(
                row.get("最小交易额", row.get("min_trade_amount", "100")),
                source,
                "最小交易额",
            )
            break
    return config


def load_all(
    holdings_file: str = "",
    target_file: str = "",
    limits_file: str = "",
    forbidden_file: str = "",
    suggestions_file: str = "",
    config_file: str = "",
) -> Portfolio:
    portfolio = Portfolio()

    if config_file and Path(config_file).exists():
        cfg = load_portfolio_config(config_file)
        portfolio.cash = cfg["cash"]
        portfolio.min_trade_amount = cfg["min_trade_amount"]
        portfolio.source = _make_source(config_file, 1)

    if holdings_file and Path(holdings_file).exists():
        portfolio.holdings = load_holdings(holdings_file)

    if target_file and Path(target_file).exists():
        portfolio.target_weights = load_target_weights(target_file)

    if limits_file and Path(limits_file).exists():
        portfolio.position_limits = load_position_limits(limits_file)

    if forbidden_file and Path(forbidden_file).exists():
        portfolio.forbidden_list = load_forbidden_list(forbidden_file)

    if suggestions_file and Path(suggestions_file).exists():
        portfolio.suggestions = load_suggestions(suggestions_file)

    return portfolio
