"""rebalance_cli: 基金组合再平衡命令行工具"""

from .loader import (
    DataLoadError,
    load_all,
    load_forbidden_list,
    load_holdings,
    load_portfolio_config,
    load_position_limits,
    load_suggestions,
    load_target_weights,
)
from .models import (
    FailureReason,
    ForbiddenFund,
    Holding,
    Portfolio,
    PositionLimit,
    SourceInfo,
    Suggestion,
    TargetWeight,
    TradeAction,
)
from .solver import (
    FundAnalysis,
    SolveResult,
    analyze_portfolio,
    generate_suggestions,
    validate_existing_suggestions,
)
from .reporter import (
    ReportData,
    render_json,
    render_markdown,
    render_terminal,
)

__all__ = [
    "DataLoadError",
    "FailureReason",
    "ForbiddenFund",
    "FundAnalysis",
    "Holding",
    "Portfolio",
    "PositionLimit",
    "ReportData",
    "SolveResult",
    "SourceInfo",
    "Suggestion",
    "TargetWeight",
    "TradeAction",
    "analyze_portfolio",
    "generate_suggestions",
    "load_all",
    "load_forbidden_list",
    "load_holdings",
    "load_portfolio_config",
    "load_position_limits",
    "load_suggestions",
    "load_target_weights",
    "render_json",
    "render_markdown",
    "render_terminal",
    "validate_existing_suggestions",
]
