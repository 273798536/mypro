from typing import List, Tuple
from .models import ParlayLeg, CorrelationResult


class CorrelationAnalyzer:
    def __init__(self):
        self.high_correlation_threshold = 0.7
        self.medium_correlation_threshold = 0.4

    def analyze_correlations(self, legs: List[ParlayLeg]) -> Tuple[List[CorrelationResult], float]:
        correlations: List[CorrelationResult] = []
        max_correlation = 0.0

        for i in range(len(legs)):
            for j in range(i + 1, len(legs)):
                leg_a = legs[i]
                leg_b = legs[j]
                corr, reason = self._calculate_correlation(leg_a, leg_b)
                if corr > max_correlation:
                    max_correlation = corr
                correlations.append(CorrelationResult(
                    leg_a_id=leg_a.leg_id,
                    leg_b_id=leg_b.leg_id,
                    correlation=corr,
                    reason=reason,
                    match_a=f"{leg_a.match_odds.home_team} vs {leg_a.match_odds.away_team}",
                    match_b=f"{leg_b.match_odds.home_team} vs {leg_b.match_odds.away_team}"
                ))

        return correlations, max_correlation

    def _calculate_correlation(self, leg_a: ParlayLeg, leg_b: ParlayLeg) -> Tuple[float, str]:
        odd_a = leg_a.match_odds
        odd_b = leg_b.match_odds

        if odd_a.match_id == odd_b.match_id:
            if odd_a.market_type == odd_b.market_type:
                return 0.95, "同一场比赛 + 同一市场类型（极高相关）"
            elif self._is_same_outcome_direction(odd_a, odd_b):
                return 0.85, "同一场比赛 + 同向结果（高相关）"
            elif self._is_opposite_outcome_direction(odd_a, odd_b):
                return -0.3, "同一场比赛 + 反向结果（负相关）"
            else:
                return 0.75, "同一场比赛 + 不同市场（中高相关）"

        if odd_a.league == odd_b.league:
            if self._is_related_teams(odd_a, odd_b):
                return 0.45, "同一联赛 + 关联球队（中相关）"
            return 0.25, "同一联赛 + 不同球队（低相关）"

        if self._is_same_sport(odd_a.league, odd_b.league):
            return 0.15, "同一运动项目 + 不同联赛（极低相关）"

        return 0.05, "不同运动项目（几乎无相关）"

    def _is_same_outcome_direction(self, odd_a, odd_b) -> bool:
        if odd_a.home_team in odd_a.selection and odd_b.home_team in odd_b.selection:
            return True
        if odd_a.away_team in odd_a.selection and odd_b.away_team in odd_b.selection:
            return True
        if "大" in odd_a.selection and "大" in odd_b.selection:
            return True
        if "小" in odd_a.selection and "小" in odd_b.selection:
            return True
        if odd_a.selection == "平局" and odd_b.selection == "平局":
            return True
        return False

    def _is_opposite_outcome_direction(self, odd_a, odd_b) -> bool:
        if odd_a.home_team in odd_a.selection and odd_b.away_team in odd_b.selection:
            return True
        if odd_a.away_team in odd_a.selection and odd_b.home_team in odd_b.selection:
            return True
        if "大" in odd_a.selection and "小" in odd_b.selection:
            return True
        if "小" in odd_a.selection and "大" in odd_b.selection:
            return True
        return False

    def _is_related_teams(self, odd_a, odd_b) -> bool:
        teams_a = {odd_a.home_team, odd_a.away_team}
        teams_b = {odd_b.home_team, odd_b.away_team}
        return len(teams_a.intersection(teams_b)) > 0

    def _is_same_sport(self, league_a: str, league_b: str) -> bool:
        football_leagues = {"英超", "西甲", "德甲", "意甲", "法甲", "中超", "欧冠", "欧联"}
        basketball_leagues = {"NBA", "CBA", "欧洲篮球联赛"}

        a_is_football = any(l in league_a for l in football_leagues)
        b_is_football = any(l in league_b for l in football_leagues)
        if a_is_football and b_is_football:
            return True

        a_is_basketball = any(l in league_a for l in basketball_leagues)
        b_is_basketball = any(l in league_b for l in basketball_leagues)
        if a_is_basketball and b_is_basketball:
            return True

        return False

    def get_correlation_explanation(self, correlation: float) -> str:
        if correlation >= self.high_correlation_threshold:
            return f"高相关性 ({correlation:.2f}): 风险显著增加，投注并非独立事件，同时命中概率远低于理论值"
        elif correlation >= self.medium_correlation_threshold:
            return f"中相关性 ({correlation:.2f}): 存在一定关联，实际胜率略低于理论值"
        elif correlation > 0:
            return f"低相关性 ({correlation:.2f}): 接近独立事件，风险可控"
        else:
            return f"负相关性 ({correlation:.2f}): 反向关联，可对冲部分风险"

    def get_risk_contribution(self, max_correlation: float, leg_count: int) -> float:
        corr_factor = max(0, max_correlation - 0.3) * 2
        leg_factor = max(0, leg_count - 2) * 0.1
        return min(1.0, corr_factor + leg_factor)
