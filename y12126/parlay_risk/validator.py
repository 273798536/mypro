from datetime import datetime
from typing import List, Dict, Tuple, Optional
from .models import (
    MatchOdds, StakeRecord, MatchResult, ParlayLeg, ParlayBet,
    ValidationIssue, OddStatus, LegStatus
)


class DataValidator:
    def __init__(self, current_time: Optional[datetime] = None):
        self.current_time = current_time or datetime.now()
        self.odds_index: Dict[Tuple[str, str, str], MatchOdds] = {}
        self.results_index: Dict[str, MatchResult] = {}
        self.stakes_index: Dict[str, StakeRecord] = {}

    def load_data(self, odds: List[MatchOdds], results: List[MatchResult], stakes: List[StakeRecord]) -> None:
        for odd in odds:
            key = (odd.match_id, odd.market_type, odd.selection)
            self.odds_index[key] = odd

        for result in results:
            self.results_index[result.match_id] = result

        for stake in stakes:
            if stake.parlay_id:
                self.stakes_index[stake.parlay_id] = stake

    def validate_odd(self, match_id: str, market_type: str, selection: str, leg_id: str) -> Tuple[Optional[MatchOdds], List[ValidationIssue]]:
        issues: List[ValidationIssue] = []
        key = (match_id, market_type, selection)
        odd = self.odds_index.get(key)

        if odd is None:
            issues.append(ValidationIssue(
                level="CRITICAL",
                code="ODD_NOT_FOUND",
                message=f"未找到赔率: 比赛={match_id}, 市场={market_type}, 选项={selection}",
                leg_id=leg_id,
                details={"match_id": match_id, "market_type": market_type, "selection": selection}
            ))
            return None, issues

        if odd.status == OddStatus.EXPIRED:
            expiry_str = odd.expiry_time.isoformat() if odd.expiry_time else "未知"
            current_str = self.current_time.isoformat()
            issues.append(ValidationIssue(
                level="CRITICAL",
                code="ODD_EXPIRED",
                message=f"赔率已过期: 到期时间={expiry_str}, 当前时间={current_str}",
                leg_id=leg_id,
                details={
                    "expiry_time": expiry_str,
                    "current_time": current_str,
                    "update_time": odd.update_time.isoformat() if odd.update_time else None,
                    "hours_since_update": round((self.current_time - odd.update_time).total_seconds() / 3600, 2)
                }
            ))

        elif odd.expiry_time and self.current_time > odd.expiry_time:
            expiry_str = odd.expiry_time.isoformat()
            current_str = self.current_time.isoformat()
            issues.append(ValidationIssue(
                level="CRITICAL",
                code="ODD_PAST_EXPIRY",
                message=f"赔率已过有效期: 到期={expiry_str}, 当前={current_str}",
                leg_id=leg_id,
                details={
                    "expiry_time": expiry_str,
                    "current_time": current_str,
                    "overdue_hours": round((self.current_time - odd.expiry_time).total_seconds() / 3600, 2)
                }
            ))

        if odd.odd_value <= 1.0:
            issues.append(ValidationIssue(
                level="WARNING",
                code="ODD_VALUE_TOO_LOW",
                message=f"赔率值异常: {odd.odd_value} (通常应 > 1.0)",
                leg_id=leg_id,
                details={"odd_value": odd.odd_value}
            ))

        return odd, issues

    def validate_stake(self, parlay_id: str) -> Tuple[Optional[StakeRecord], List[ValidationIssue]]:
        issues: List[ValidationIssue] = []
        stake = self.stakes_index.get(parlay_id)

        if stake is None:
            issues.append(ValidationIssue(
                level="CRITICAL",
                code="STAKE_NOT_FOUND",
                message=f"未找到本金记录: 组合ID={parlay_id}",
                details={"parlay_id": parlay_id}
            ))
            return None, issues

        if stake.amount <= 0:
            issues.append(ValidationIssue(
                level="CRITICAL",
                code="STAKE_ZERO_OR_NEGATIVE",
                message=f"本金异常: {stake.amount} {stake.currency} (必须 > 0)",
                details={
                    "stake_id": stake.stake_id,
                    "amount": stake.amount,
                    "currency": stake.currency,
                    "bettor_id": stake.bettor_id
                }
            ))

        if stake.placed_time > self.current_time:
            issues.append(ValidationIssue(
                level="WARNING",
                code="STAKE_FUTURE_TIME",
                message=f"下注时间在未来: {stake.placed_time.isoformat()}",
                details={
                    "stake_id": stake.stake_id,
                    "placed_time": stake.placed_time.isoformat(),
                    "current_time": self.current_time.isoformat()
                }
            ))

        return stake, issues

    def validate_result(self, match_id: str) -> Optional[MatchResult]:
        return self.results_index.get(match_id)

    def determine_leg_status(self, leg: ParlayLeg) -> LegStatus:
        odd = leg.match_odds

        if odd.status == OddStatus.EXPIRED or (odd.expiry_time and self.current_time > odd.expiry_time):
            return LegStatus.EXPIRED

        if leg.result is None:
            return LegStatus.PENDING

        if not leg.result.is_final:
            return LegStatus.PENDING

        won = self._check_selection_won(odd, leg.result)
        if won is None:
            return LegStatus.VOID
        elif won:
            return LegStatus.WON
        else:
            return LegStatus.LOST

    def _check_selection_won(self, odd: MatchOdds, result: MatchResult) -> Optional[bool]:
        home_score = result.home_score
        away_score = result.away_score
        market = odd.market_type
        selection = odd.selection

        if "胜负" in market:
            if selection.endswith("胜") and "主场" not in selection and "客场" not in selection:
                if odd.home_team in selection:
                    return home_score > away_score
                elif odd.away_team in selection:
                    return away_score > home_score
                elif selection == "平局":
                    return home_score == away_score
            if selection == "主胜":
                return home_score > away_score
            elif selection == "客胜":
                return away_score > home_score
            elif selection == "平局":
                return home_score == away_score

        elif "让球" in market or "让分" in market:
            import re
            handicap_match = re.search(r'([+-]?\d+\.?\d*)', market)
            if handicap_match:
                handicap = float(handicap_match.group(1))
                adjusted_home = home_score + handicap
                if odd.home_team in selection or "主" in selection:
                    return adjusted_home > away_score
                elif odd.away_team in selection or "客" in selection:
                    return away_score > adjusted_home

        elif "大小球" in market or "总分" in market:
            import re
            total_match = re.search(r'(\d+\.?\d*)', market)
            if total_match:
                total = float(total_match.group(1))
                actual_total = home_score + away_score
                if "大" in selection:
                    return actual_total > total
                elif "小" in selection:
                    return actual_total < total

        return None

    def validate_parlay(self, parlay_bet: ParlayBet) -> List[ValidationIssue]:
        all_issues: List[ValidationIssue] = []

        if len(parlay_bet.legs) < 2:
            all_issues.append(ValidationIssue(
                level="CRITICAL",
                code="INSUFFICIENT_LEGS",
                message=f"组合投注至少需要2关，当前只有{len(parlay_bet.legs)}关",
                details={"leg_count": len(parlay_bet.legs)}
            ))

        valid_legs = [leg for leg in parlay_bet.legs if leg.match_odds.status == OddStatus.VALID]
        if len(valid_legs) == 0:
            all_issues.append(ValidationIssue(
                level="CRITICAL",
                code="ALL_ODDS_EXPIRED",
                message="组合中所有赔率均已过期，无法计算",
                details={"total_legs": len(parlay_bet.legs)}
            ))
        elif len(valid_legs) < len(parlay_bet.legs):
            expired_count = len(parlay_bet.legs) - len(valid_legs)
            all_issues.append(ValidationIssue(
                level="WARNING",
                code="PARTIAL_ODDS_EXPIRED",
                message=f"组合中有{expired_count}/{len(parlay_bet.legs)}关赔率已过期，仅计算有效部分",
                details={"valid_count": len(valid_legs), "expired_count": expired_count}
            ))

        return all_issues
