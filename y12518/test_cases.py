from __future__ import annotations

from typing import Dict, List, Any

from portfolio_optimizer.data_models import (
    Position,
    IndustryTag,
    TransactionCost,
    ConstraintConfig,
    OptimizerInput,
)


def create_smooth_case_1() -> Dict[str, Any]:
    """
    顺利场景1: 基础正常求解
    8只股票，分布在3个行业，约束合理，可正常求解
    """
    positions = [
        Position(stock_code="000001", target_weight=0.15, current_weight=0.12, min_weight=0.0, max_weight=0.20),
        Position(stock_code="000002", target_weight=0.12, current_weight=0.10, min_weight=0.0, max_weight=0.20),
        Position(stock_code="600000", target_weight=0.18, current_weight=0.20, min_weight=0.0, max_weight=0.20),
        Position(stock_code="600001", target_weight=0.10, current_weight=0.08, min_weight=0.0, max_weight=0.20),
        Position(stock_code="002001", target_weight=0.15, current_weight=0.18, min_weight=0.0, max_weight=0.20),
        Position(stock_code="002002", target_weight=0.10, current_weight=0.12, min_weight=0.0, max_weight=0.20),
        Position(stock_code="300001", target_weight=0.10, current_weight=0.10, min_weight=0.0, max_weight=0.20),
        Position(stock_code="300002", target_weight=0.10, current_weight=0.10, min_weight=0.0, max_weight=0.20),
    ]

    industry_tags = [
        IndustryTag(stock_code="000001", industry="银行", industry_confidence=0.95),
        IndustryTag(stock_code="000002", industry="银行", industry_confidence=0.95),
        IndustryTag(stock_code="600000", industry="银行", industry_confidence=0.95),
        IndustryTag(stock_code="600001", industry="地产", industry_confidence=0.90),
        IndustryTag(stock_code="002001", industry="医药", industry_confidence=0.85),
        IndustryTag(stock_code="002002", industry="医药", industry_confidence=0.85),
        IndustryTag(stock_code="300001", industry="科技", industry_confidence=0.92),
        IndustryTag(stock_code="300002", industry="科技", industry_confidence=0.92),
    ]

    transaction_costs = [
        TransactionCost(stock_code="000001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.95),
        TransactionCost(stock_code="000002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="600000", buy_cost=0.0015, sell_cost=0.0015, liquidity_score=0.85),
        TransactionCost(stock_code="600001", buy_cost=0.002, sell_cost=0.002, liquidity_score=0.80),
        TransactionCost(stock_code="002001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.92),
        TransactionCost(stock_code="002002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.88),
        TransactionCost(stock_code="300001", buy_cost=0.0015, sell_cost=0.0015, liquidity_score=0.82),
        TransactionCost(stock_code="300002", buy_cost=0.002, sell_cost=0.002, liquidity_score=0.75),
    ]

    constraints = ConstraintConfig(
        total_weight_min=0.95,
        total_weight_max=1.05,
        industry_max_weight={"银行": 0.50, "地产": 0.25, "医药": 0.30, "科技": 0.30},
        max_single_stock_weight=0.20,
        max_turnover=1.0,
        cost_sensitive=True,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "顺利场景1 - 基础正常求解",
        "description": "8只股票分布在4个行业，约束设置合理，预期可正常求解并找到最优解",
        "input": optimizer_input,
    }


def create_smooth_case_2() -> Dict[str, Any]:
    """
    顺利场景2: 行业约束较紧但可行
    测试行业权重约束的处理能力
    """
    positions = [
        Position(stock_code="A001", target_weight=0.25, current_weight=0.20, min_weight=0.05, max_weight=0.30),
        Position(stock_code="A002", target_weight=0.20, current_weight=0.25, min_weight=0.05, max_weight=0.30),
        Position(stock_code="B001", target_weight=0.20, current_weight=0.15, min_weight=0.05, max_weight=0.30),
        Position(stock_code="B002", target_weight=0.15, current_weight=0.20, min_weight=0.05, max_weight=0.30),
        Position(stock_code="C001", target_weight=0.10, current_weight=0.10, min_weight=0.05, max_weight=0.30),
        Position(stock_code="C002", target_weight=0.10, current_weight=0.10, min_weight=0.05, max_weight=0.30),
    ]

    industry_tags = [
        IndustryTag(stock_code="A001", industry="行业A", industry_confidence=0.99),
        IndustryTag(stock_code="A002", industry="行业A", industry_confidence=0.99),
        IndustryTag(stock_code="B001", industry="行业B", industry_confidence=0.99),
        IndustryTag(stock_code="B002", industry="行业B", industry_confidence=0.99),
        IndustryTag(stock_code="C001", industry="行业C", industry_confidence=0.99),
        IndustryTag(stock_code="C002", industry="行业C", industry_confidence=0.99),
    ]

    transaction_costs = [
        TransactionCost(stock_code="A001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="A002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="B001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="B002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="C001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="C002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
    ]

    constraints = ConstraintConfig(
        total_weight_min=1.0,
        total_weight_max=1.0,
        industry_max_weight={"行业A": 0.40, "行业B": 0.40, "行业C": 0.40},
        industry_min_weight={"行业A": 0.30, "行业B": 0.30, "行业C": 0.30},
        max_single_stock_weight=0.30,
        min_single_stock_weight=0.05,
        max_turnover=0.5,
        cost_sensitive=False,
        random_seed=12345,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "顺利场景2 - 行业约束较紧",
        "description": "每个行业有明确的上下限约束，测试行业约束的处理能力",
        "input": optimizer_input,
    }


def create_conflict_case_weight_deficit() -> Dict[str, Any]:
    """
    冲突场景1: 权重不满
    总权重约束下限过高，无法满足
    """
    positions = [
        Position(stock_code="STK01", target_weight=0.20, current_weight=0.0, min_weight=0.0, max_weight=0.25),
        Position(stock_code="STK02", target_weight=0.20, current_weight=0.0, min_weight=0.0, max_weight=0.25),
        Position(stock_code="STK03", target_weight=0.20, current_weight=0.0, min_weight=0.0, max_weight=0.25),
    ]

    industry_tags = [
        IndustryTag(stock_code="STK01", industry="行业X", industry_confidence=0.90),
        IndustryTag(stock_code="STK02", industry="行业Y", industry_confidence=0.90),
        IndustryTag(stock_code="STK03", industry="行业Z", industry_confidence=0.90),
    ]

    transaction_costs = [
        TransactionCost(stock_code="STK01", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.80),
        TransactionCost(stock_code="STK02", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.80),
        TransactionCost(stock_code="STK03", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.80),
    ]

    constraints = ConstraintConfig(
        total_weight_min=1.5,
        total_weight_max=2.0,
        max_single_stock_weight=0.25,
        max_turnover=1.0,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "冲突场景1 - 权重不满",
        "description": "总权重约束下限(1.5)远高于所有股票最大权重之和(0.75)，预期不可行",
        "input": optimizer_input,
    }


def create_conflict_case_industry_conflict() -> Dict[str, Any]:
    """
    冲突场景2: 行业约束冲突
    行业上限与单票约束冲突，导致无法满足
    """
    positions = [
        Position(stock_code="IND01", target_weight=0.20, current_weight=0.15, min_weight=0.15, max_weight=0.30),
        Position(stock_code="IND02", target_weight=0.20, current_weight=0.15, min_weight=0.15, max_weight=0.30),
        Position(stock_code="IND03", target_weight=0.20, current_weight=0.15, min_weight=0.15, max_weight=0.30),
        Position(stock_code="OTH01", target_weight=0.20, current_weight=0.20, min_weight=0.10, max_weight=0.30),
        Position(stock_code="OTH02", target_weight=0.20, current_weight=0.20, min_weight=0.10, max_weight=0.30),
    ]

    industry_tags = [
        IndustryTag(stock_code="IND01", industry="目标行业", industry_confidence=0.95),
        IndustryTag(stock_code="IND02", industry="目标行业", industry_confidence=0.95),
        IndustryTag(stock_code="IND03", industry="目标行业", industry_confidence=0.95),
        IndustryTag(stock_code="OTH01", industry="其他行业", industry_confidence=0.95),
        IndustryTag(stock_code="OTH02", industry="其他行业", industry_confidence=0.95),
    ]

    transaction_costs = [
        TransactionCost(stock_code="IND01", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="IND02", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="IND03", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="OTH01", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="OTH02", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
    ]

    constraints = ConstraintConfig(
        total_weight_min=1.0,
        total_weight_max=1.0,
        industry_max_weight={"目标行业": 0.30},
        max_single_stock_weight=0.30,
        max_turnover=0.5,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "冲突场景2 - 行业约束冲突",
        "description": "目标行业3只股票的最小权重之和(0.45)超过行业上限(0.30)，预期不可行",
        "input": optimizer_input,
    }


def create_conflict_case_forbidden_stock() -> Dict[str, Any]:
    """
    冲突场景3: 禁买标的
    目标权重较高的股票被禁止买入，但其他股票可填补缺口
    """
    positions = [
        Position(stock_code="OK001", target_weight=0.20, current_weight=0.15, min_weight=0.0, max_weight=0.40),
        Position(stock_code="OK002", target_weight=0.20, current_weight=0.15, min_weight=0.0, max_weight=0.40),
        Position(stock_code="FORBID", target_weight=0.35, current_weight=0.35, min_weight=0.0, max_weight=0.50, is_forbidden=True),
        Position(stock_code="OK003", target_weight=0.15, current_weight=0.15, min_weight=0.0, max_weight=0.40),
        Position(stock_code="OK004", target_weight=0.10, current_weight=0.10, min_weight=0.0, max_weight=0.40),
    ]

    industry_tags = [
        IndustryTag(stock_code="OK001", industry="普通", industry_confidence=0.95),
        IndustryTag(stock_code="OK002", industry="普通", industry_confidence=0.95),
        IndustryTag(stock_code="FORBID", industry="限制", industry_confidence=0.99),
        IndustryTag(stock_code="OK003", industry="普通", industry_confidence=0.95),
        IndustryTag(stock_code="OK004", industry="普通", industry_confidence=0.95),
    ]

    transaction_costs = [
        TransactionCost(stock_code="OK001", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="OK002", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="FORBID", buy_cost=0.005, sell_cost=0.005, liquidity_score=0.30),
        TransactionCost(stock_code="OK003", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="OK004", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
    ]

    constraints = ConstraintConfig(
        total_weight_min=0.90,
        total_weight_max=1.10,
        max_single_stock_weight=0.40,
        max_turnover=1.0,
        cost_sensitive=True,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "冲突场景3 - 禁买标的",
        "description": "目标权重最高(35%)的股票被禁止买入，测试求解器如何将权重重新分配给其他股票",
        "input": optimizer_input,
    }


def create_conflict_case_data_conflict() -> Dict[str, Any]:
    """
    冲突场景4: 数据冲突
    持仓权重与行业置信度、流动性存在冲突
    """
    positions = [
        Position(stock_code="HIGH01", target_weight=0.30, current_weight=0.0, min_weight=0.0, max_weight=0.35),
        Position(stock_code="HIGH02", target_weight=0.25, current_weight=0.0, min_weight=0.0, max_weight=0.35),
        Position(stock_code="LOW01", target_weight=0.20, current_weight=0.0, min_weight=0.0, max_weight=0.35),
        Position(stock_code="LOW02", target_weight=0.15, current_weight=0.0, min_weight=0.0, max_weight=0.35),
        Position(stock_code="NORMAL", target_weight=0.10, current_weight=0.0, min_weight=0.0, max_weight=0.35),
    ]

    industry_tags = [
        IndustryTag(stock_code="HIGH01", industry="高权重行业", industry_confidence=0.30),
        IndustryTag(stock_code="HIGH02", industry="高权重行业", industry_confidence=0.40),
        IndustryTag(stock_code="LOW01", industry="低权重行业", industry_confidence=0.95),
        IndustryTag(stock_code="LOW02", industry="低权重行业", industry_confidence=0.90),
        IndustryTag(stock_code="NORMAL", industry="普通行业", industry_confidence=0.85),
    ]

    transaction_costs = [
        TransactionCost(stock_code="HIGH01", buy_cost=0.005, sell_cost=0.005, liquidity_score=0.15),
        TransactionCost(stock_code="HIGH02", buy_cost=0.004, sell_cost=0.004, liquidity_score=0.20),
        TransactionCost(stock_code="LOW01", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.95),
        TransactionCost(stock_code="LOW02", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="NORMAL", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.85),
    ]

    constraints = ConstraintConfig(
        total_weight_min=0.95,
        total_weight_max=1.05,
        max_single_stock_weight=0.35,
        max_turnover=1.0,
        cost_sensitive=True,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "冲突场景4 - 数据冲突",
        "description": "高目标权重的股票行业置信度低、流动性差，测试冲突检测和留痕机制",
        "input": optimizer_input,
    }


def create_conflict_case_turnover_limit() -> Dict[str, Any]:
    """
    冲突场景5: 换手率约束过紧
    当前持仓与目标差异大，但换手率限制过小
    """
    positions = [
        Position(stock_code="T01", target_weight=0.40, current_weight=0.05, min_weight=0.0, max_weight=0.50),
        Position(stock_code="T02", target_weight=0.30, current_weight=0.05, min_weight=0.0, max_weight=0.50),
        Position(stock_code="T03", target_weight=0.20, current_weight=0.45, min_weight=0.0, max_weight=0.50),
        Position(stock_code="T04", target_weight=0.10, current_weight=0.45, min_weight=0.0, max_weight=0.50),
    ]

    industry_tags = [
        IndustryTag(stock_code="T01", industry="行业1", industry_confidence=0.95),
        IndustryTag(stock_code="T02", industry="行业2", industry_confidence=0.95),
        IndustryTag(stock_code="T03", industry="行业3", industry_confidence=0.95),
        IndustryTag(stock_code="T04", industry="行业4", industry_confidence=0.95),
    ]

    transaction_costs = [
        TransactionCost(stock_code="T01", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="T02", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="T03", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
        TransactionCost(stock_code="T04", buy_cost=0.001, sell_cost=0.001, liquidity_score=0.90),
    ]

    constraints = ConstraintConfig(
        total_weight_min=1.0,
        total_weight_max=1.0,
        max_single_stock_weight=0.50,
        max_turnover=0.10,
        cost_sensitive=False,
        random_seed=42,
    )

    optimizer_input = OptimizerInput(
        positions=positions,
        industry_tags=industry_tags,
        transaction_costs=transaction_costs,
        constraints=constraints,
    )

    return {
        "name": "冲突场景5 - 换手率约束过紧",
        "description": "当前权重与目标差异很大(需要换手1.60)，但换手率上限仅0.10，预期不可行",
        "input": optimizer_input,
    }


def get_smooth_cases() -> List[Dict[str, Any]]:
    return [
        create_smooth_case_1(),
        create_smooth_case_2(),
    ]


def get_conflict_cases() -> List[Dict[str, Any]]:
    return [
        create_conflict_case_weight_deficit(),
        create_conflict_case_industry_conflict(),
        create_conflict_case_forbidden_stock(),
        create_conflict_case_data_conflict(),
        create_conflict_case_turnover_limit(),
    ]


def get_all_cases() -> List[Dict[str, Any]]:
    return get_smooth_cases() + get_conflict_cases()
