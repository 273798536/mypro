from datetime import datetime
from typing import List, Dict, Optional
import json
from .models import (
    MatchOdds, StakeRecord, MatchResult, ParlayLeg, ParlayBet,
    RiskLevel, RiskReport, ValidationIssue, OddStatus, LegStatus
)
from .validator import DataValidator
from .correlation import CorrelationAnalyzer
import uuid


class ParlayCalculator:
    def __init__(self, current_time: Optional[datetime] = None):
        self.current_time = current_time or datetime.now()
        self.validator = DataValidator(self.current_time)
        self.correlation_analyzer = CorrelationAnalyzer()

    def load_data(self, odds: List[MatchOdds], results: List[MatchResult], stakes: List[StakeRecord]) -> None:
        self.validator.load_data(odds, results, stakes)

    def build_parlay(self, parlay_config: Dict) -> Optional[ParlayBet]:
        parlay_id = parlay_config["parlay_id"]
        description = parlay_config.get("description", "")

        stake, stake_issues = self.validator.validate_stake(parlay_id)
        if stake is None:
            return None

        legs: List[ParlayLeg] = []
        all_issues: List[ValidationIssue] = stake_issues.copy()

        for leg_config in parlay_config["legs"]:
            leg_id = leg_config["leg_id"]
            match_id = leg_config["match_id"]
            market_type = leg_config["market_type"]
            selection = leg_config["selection"]

            odd, odd_issues = self.validator.validate_odd(match_id, market_type, selection, leg_id)
            all_issues.extend(odd_issues)

            if odd is None:
                continue

            result = self.validator.validate_result(match_id)
            leg = ParlayLeg(leg_id=leg_id, match_odds=odd, result=result)
            leg.status = self.validator.determine_leg_status(leg)
            legs.append(leg)

        if not legs:
            return None

        parlay_bet = ParlayBet(
            parlay_id=parlay_id,
            legs=legs,
            stake=stake,
            validation_issues=all_issues
        )

        parlay_issues = self.validator.validate_parlay(parlay_bet)
        parlay_bet.validation_issues.extend(parlay_issues)

        self._calculate_parlay(parlay_bet, description)
        return parlay_bet

    def _calculate_parlay(self, parlay: ParlayBet, description: str) -> None:
        trace_steps = []

        valid_legs = [leg for leg in parlay.legs if leg.status != LegStatus.EXPIRED]
        trace_steps.append({
            "step": "1_leg_validation",
            "input_leg_count": len(parlay.legs),
            "valid_leg_count": len(valid_legs),
            "expired_leg_count": len(parlay.legs) - len(valid_legs),
            "details": f"原始{len(parlay.legs)}关，有效{len(valid_legs)}关，过期{len(parlay.legs) - len(valid_legs)}关"
        })

        if len(valid_legs) < 2:
            parlay.risk_level = RiskLevel.CRITICAL
            parlay.risk_score = 1.0
            parlay.status = LegStatus.VOID
            trace_steps.append({
                "step": "2_calculation_aborted",
                "reason": "有效关卡不足2关，无法计算组合赔率",
                "risk_level_assigned": RiskLevel.CRITICAL.value
            })
            parlay.calculation_trace = {
                "description": description,
                "steps": trace_steps,
                "timestamp": self.current_time.isoformat()
            }
            return

        total_odds = 1.0
        odds_breakdown = []
        for leg in valid_legs:
            total_odds *= leg.match_odds.odd_value
            odds_breakdown.append({
                "leg_id": leg.leg_id,
                "match": f"{leg.match_odds.home_team} vs {leg.match_odds.away_team}",
                "odd_value": leg.match_odds.odd_value
            })

        parlay.total_odds = total_odds
        potential_payout = parlay.stake.amount * total_odds
        parlay.potential_payout = potential_payout

        trace_steps.append({
            "step": "3_odds_calculation",
            "odds_breakdown": odds_breakdown,
            "total_odds": round(total_odds, 4),
            "formula": " × ".join([str(o["odd_value"]) for o in odds_breakdown]) + f" = {total_odds:.4f}",
            "stake_amount": parlay.stake.amount,
            "potential_payout": round(potential_payout, 2),
            "potential_profit": round(potential_payout - parlay.stake.amount, 2)
        })

        correlations, max_corr = self.correlation_analyzer.analyze_correlations(valid_legs)
        parlay.correlations = correlations

        high_corr_count = len([c for c in correlations if c.correlation >= 0.7])
        trace_steps.append({
            "step": "4_correlation_analysis",
            "total_correlation_pairs": len(correlations),
            "high_correlation_pairs": high_corr_count,
            "max_correlation": round(max_corr, 4),
            "correlation_explanation": self.correlation_analyzer.get_correlation_explanation(max_corr),
            "high_risk_pairs": [
                {
                    "pair": f"{c.match_a} <-> {c.match_b}",
                    "correlation": c.correlation,
                    "reason": c.reason
                }
                for c in correlations if c.correlation >= 0.7
            ]
        })

        self._calculate_actual_payout(parlay, valid_legs, trace_steps)
        self._determine_risk_level(parlay, max_corr, trace_steps)

        parlay.calculation_trace = {
            "description": description,
            "steps": trace_steps,
            "timestamp": self.current_time.isoformat()
        }

    def _calculate_actual_payout(self, parlay: ParlayBet, valid_legs: List[ParlayLeg], trace_steps: List) -> None:
        won_legs = [leg for leg in valid_legs if leg.status == LegStatus.WON]
        lost_legs = [leg for leg in valid_legs if leg.status == LegStatus.LOST]
        void_legs = [leg for leg in valid_legs if leg.status == LegStatus.VOID]
        pending_legs = [leg for leg in valid_legs if leg.status == LegStatus.PENDING]

        leg_status_breakdown = []
        for leg in valid_legs:
            result_str = "未知"
            if leg.result:
                result_str = f"{leg.result.home_score}-{leg.result.away_score}"
            leg_status_breakdown.append({
                "leg_id": leg.leg_id,
                "match": f"{leg.match_odds.home_team} vs {leg.match_odds.away_team}",
                "selection": leg.match_odds.selection,
                "result": result_str,
                "status": leg.status.value,
                "odd_value": leg.match_odds.odd_value
            })

        if len(lost_legs) > 0:
            parlay.status = LegStatus.LOST
            parlay.actual_payout = 0.0
            parlay.profit = -parlay.stake.amount
            trace_steps.append({
                "step": "5_result_calculation",
                "status": LegStatus.LOST.value,
                "won_count": len(won_legs),
                "lost_count": len(lost_legs),
                "void_count": len(void_legs),
                "pending_count": len(pending_legs),
                "legs_detail": leg_status_breakdown,
                "actual_payout": 0.0,
                "profit": -parlay.stake.amount,
                "reason": f"有{len(lost_legs)}关未中，组合投注失败"
            })
        elif len(pending_legs) > 0:
            parlay.status = LegStatus.PENDING
            parlay.actual_payout = 0.0
            parlay.profit = 0.0
            trace_steps.append({
                "step": "5_result_calculation",
                "status": LegStatus.PENDING.value,
                "won_count": len(won_legs),
                "lost_count": len(lost_legs),
                "void_count": len(void_legs),
                "pending_count": len(pending_legs),
                "legs_detail": leg_status_breakdown,
                "actual_payout": 0.0,
                "profit": 0.0,
                "reason": f"还有{len(pending_legs)}关比赛未结束"
            })
        elif len(won_legs) == len(valid_legs):
            actual_odds = 1.0
            for leg in won_legs:
                actual_odds *= leg.match_odds.odd_value
            parlay.status = LegStatus.WON
            parlay.actual_payout = parlay.stake.amount * actual_odds
            parlay.profit = parlay.actual_payout - parlay.stake.amount
            trace_steps.append({
                "step": "5_result_calculation",
                "status": LegStatus.WON.value,
                "won_count": len(won_legs),
                "lost_count": len(lost_legs),
                "void_count": len(void_legs),
                "pending_count": len(pending_legs),
                "legs_detail": leg_status_breakdown,
                "actual_odds": round(actual_odds, 4),
                "actual_payout": round(parlay.actual_payout, 2),
                "profit": round(parlay.profit, 2),
                "reason": f"全部{len(won_legs)}关命中"
            })
        else:
            parlay.status = LegStatus.VOID
            parlay.actual_payout = parlay.stake.amount
            parlay.profit = 0.0
            trace_steps.append({
                "step": "5_result_calculation",
                "status": LegStatus.VOID.value,
                "won_count": len(won_legs),
                "lost_count": len(lost_legs),
                "void_count": len(void_legs),
                "pending_count": len(pending_legs),
                "legs_detail": leg_status_breakdown,
                "actual_payout": parlay.stake.amount,
                "profit": 0.0,
                "reason": "比赛结果无效或走盘，返还本金"
            })

    def _determine_risk_level(self, parlay: ParlayBet, max_corr: float, trace_steps: List) -> None:
        score_components = []

        has_critical = any(issue.level == "CRITICAL" for issue in parlay.validation_issues)
        has_expired = any(leg.status == LegStatus.EXPIRED for leg in parlay.legs)
        all_expired = all(leg.status == LegStatus.EXPIRED for leg in parlay.legs)
        zero_stake = parlay.stake.amount <= 0

        if all_expired or zero_stake:
            parlay.risk_level = RiskLevel.CRITICAL
            parlay.risk_score = 1.0
            score_components.append({"factor": "全部赔率过期或零本金", "score": 1.0, "weight": 1.0})
        elif has_critical or has_expired:
            corr_risk = self.correlation_analyzer.get_risk_contribution(max_corr, len(parlay.legs))
            issue_risk = 0.7
            parlay.risk_score = max(corr_risk, issue_risk)
            parlay.risk_level = RiskLevel.HIGH
            score_components.append({"factor": "存在严重问题（过期/零本金）", "score": issue_risk, "weight": 0.6})
            score_components.append({"factor": "相关性风险", "score": corr_risk, "weight": 0.4})
        elif max_corr >= 0.7:
            corr_risk = self.correlation_analyzer.get_risk_contribution(max_corr, len(parlay.legs))
            parlay.risk_score = corr_risk
            parlay.risk_level = RiskLevel.HIGH
            score_components.append({"factor": "高相关性", "score": corr_risk, "weight": 1.0})
        elif max_corr >= 0.4:
            corr_risk = self.correlation_analyzer.get_risk_contribution(max_corr, len(parlay.legs))
            parlay.risk_score = corr_risk
            parlay.risk_level = RiskLevel.MEDIUM
            score_components.append({"factor": "中相关性", "score": corr_risk, "weight": 1.0})
        else:
            corr_risk = self.correlation_analyzer.get_risk_contribution(max_corr, len(parlay.legs))
            parlay.risk_score = corr_risk
            parlay.risk_level = RiskLevel.LOW
            score_components.append({"factor": "低相关性", "score": corr_risk, "weight": 1.0})

        trace_steps.append({
            "step": "6_risk_assessment",
            "risk_level": parlay.risk_level.value,
            "risk_score": round(parlay.risk_score, 4),
            "score_components": score_components,
            "key_factors": {
                "has_critical_issues": has_critical,
                "has_expired_odds": has_expired,
                "all_expired_odds": all_expired,
                "zero_stake": zero_stake,
                "max_correlation": round(max_corr, 4),
                "leg_count": len(parlay.legs)
            }
        })

    def calculate_report(self, parlays_config: List[Dict]) -> RiskReport:
        all_parlays: List[ParlayBet] = []
        total_stake = 0.0
        total_potential = 0.0
        total_actual = 0.0
        total_profit = 0.0
        risk_distribution: Dict[RiskLevel, int] = {
            RiskLevel.LOW: 0,
            RiskLevel.MEDIUM: 0,
            RiskLevel.HIGH: 0,
            RiskLevel.CRITICAL: 0
        }
        summary_issues: List[ValidationIssue] = []

        for config in parlays_config:
            parlay = self.build_parlay(config)
            if parlay:
                all_parlays.append(parlay)
                total_stake += parlay.stake.amount
                total_potential += parlay.potential_payout
                total_actual += parlay.actual_payout
                total_profit += parlay.profit
                risk_distribution[parlay.risk_level] += 1
                summary_issues.extend(parlay.validation_issues)

        report = RiskReport(
            report_id=str(uuid.uuid4())[:8],
            generated_at=self.current_time,
            total_parlays=len(all_parlays),
            total_stake=total_stake,
            total_potential_payout=total_potential,
            total_actual_payout=total_actual,
            total_profit=total_profit,
            risk_distribution=risk_distribution,
            parlays=all_parlays,
            summary_issues=summary_issues
        )

        return report
