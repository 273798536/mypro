#!/usr/bin/env python3
"""
概率赌场风控局 v1.0
Probability Casino Risk Control Bureau

教育目标:
  1. 破产概率意识 — 高破产风险时硬拦截，违规可从筹码定位
  2. 赔率正确使用 — 识别赔率错用，违规可从赔率牌定位
  3. 风险管理实践 — 在约束条件下做出最优决策

核心设计:
  - 筹码管理 / 下注上限: 分离维护，模拟真实风控分工
  - 赔率牌: 版本管理，晚到当补充版本，不推翻已有结果
  - 破产概率: Monte Carlo 模拟，从筹码可定位，超阈值硬拦截
  - 赔率错用: 从赔率牌可定位，详尽说明错因
  - 排行榜: 可导出 CSV
"""

import csv
import random
import sys
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from pathlib import Path


# ============================================================
# 数据模型
# ============================================================

@dataclass
class OddsCard:
    card_id: str
    version: int
    game_type: str
    payout_multiplier: float
    stated_win_prob: float
    is_supplementary: bool = False
    supplementary_for_round: Optional[int] = None
    is_correct: bool = True

    def label(self):
        tag = "补充版" if self.is_supplementary else "标准版"
        return (f"{self.card_id} | 赔付{self.payout_multiplier:.1f}x | "
                f"标注胜率{self.stated_win_prob*100:.2f}% | {tag}")


@dataclass
class ChipSnapshot:
    snapshot_id: int
    round_number: int
    chips: int
    bet_amount: int
    bankruptcy_prob: float
    prob_ignored: bool = False


@dataclass
class BetLimit:
    game_type: str
    min_bet: int
    max_bet: int
    set_by: str = "风控局"


@dataclass
class Violation:
    violation_type: str
    round_number: int
    detail: str
    trace_chips: Optional[ChipSnapshot] = None
    trace_odds_card: Optional[OddsCard] = None
    penalty: int = 0

    def format(self):
        lines = []
        if self.violation_type == "BANKRUPTCY_PROB_IGNORED":
            lines.append("🚫 违规: 破产概率忽略")
            if self.trace_chips:
                cs = self.trace_chips
                lines.append(
                    f"   定位 -> 筹码快照 #{cs.snapshot_id}: "
                    f"第{cs.round_number}轮, 筹码={cs.chips}, "
                    f"下注={cs.bet_amount}, 破产概率={cs.bankruptcy_prob*100:.1f}%"
                )
            lines.append(f"   扣分: {self.penalty}")
        elif self.violation_type == "ODDS_MISAPPLICATION":
            lines.append("🚫 违规: 赔率错用")
            if self.trace_odds_card:
                oc = self.trace_odds_card
                lines.append(
                    f"   定位 -> 赔率牌 {oc.card_id} v{oc.version}: "
                    f"赔付={oc.payout_multiplier}x, "
                    f"标注胜率={oc.stated_win_prob*100:.2f}%, "
                    f"游戏={oc.game_type}"
                )
            lines.append(f"   原因: {self.detail}")
            lines.append(f"   扣分: {self.penalty}")
        return "\n".join(lines)


@dataclass
class RoundResult:
    round_number: int
    game_type: str
    true_win_prob: float
    true_payout: float
    odds_card_used: Optional[OddsCard]
    chip_snapshot: ChipSnapshot
    won: bool
    payout: int
    chips_after: int
    violations: List[Violation] = field(default_factory=list)
    failure_reasons: List[str] = field(default_factory=list)
    supplementary_card: Optional[OddsCard] = None


@dataclass
class PlayerRecord:
    player_name: str
    final_chips: int
    rounds_played: int
    total_violations: int
    score: float
    violation_details: List[str] = field(default_factory=list)
    completed_at: str = ""


# ============================================================
# 游戏类型定义
# ============================================================

GAME_TYPES = {
    "轮盘赌-单号": {
        "true_win_prob": 1 / 37,
        "payout": 35.0,
        "description": "押37个数中的1个",
    },
    "轮盘赌-红黑": {
        "true_win_prob": 18 / 37,
        "payout": 1.0,
        "description": "押红或黑",
    },
    "骰子-大小": {
        "true_win_prob": 486 / 1080,
        "payout": 1.0,
        "description": "三骰总和大小(含豹子通杀)",
    },
    "骰子-豹子": {
        "true_win_prob": 6 / 216,
        "payout": 24.0,
        "description": "三骰点数相同",
    },
    "百家乐-庄": {
        "true_win_prob": 0.4586,
        "payout": 0.95,
        "description": "押庄赢(抽水5%)",
    },
    "百家乐-闲": {
        "true_win_prob": 0.4462,
        "payout": 1.0,
        "description": "押闲赢",
    },
}


# ============================================================
# 筹码管理器 (与下注上限分离维护)
# ============================================================

class ChipManager:
    def __init__(self, initial_chips: int = 1000):
        self.chips = initial_chips
        self.initial_chips = initial_chips
        self.snapshots: List[ChipSnapshot] = []
        self._next_id = 1

    def snapshot(self, round_number: int, bet_amount: int,
                 bankruptcy_prob: float) -> ChipSnapshot:
        snap = ChipSnapshot(
            snapshot_id=self._next_id,
            round_number=round_number,
            chips=self.chips,
            bet_amount=bet_amount,
            bankruptcy_prob=bankruptcy_prob,
        )
        self._next_id += 1
        self.snapshots.append(snap)
        return snap

    def apply_result(self, won: bool, bet: int, net_profit: int):
        if won:
            self.chips += net_profit
        else:
            self.chips -= bet

    def is_bankrupt(self):
        return self.chips <= 0


# ============================================================
# 下注上限管理器 (与筹码分离维护)
# ============================================================

class BetLimitManager:
    def __init__(self):
        self.limits: Dict[str, BetLimit] = {}
        self._init_defaults()

    def _init_defaults(self):
        self.limits["轮盘赌-单号"] = BetLimit("轮盘赌-单号", 10, 500, "风控局")
        self.limits["轮盘赌-红黑"] = BetLimit("轮盘赌-红黑", 50, 1000, "风控局")
        self.limits["骰子-大小"] = BetLimit("骰子-大小", 50, 800, "风控局")
        self.limits["骰子-豹子"] = BetLimit("骰子-豹子", 10, 200, "风控局")
        self.limits["百家乐-庄"] = BetLimit("百家乐-庄", 50, 2000, "风控局")
        self.limits["百家乐-闲"] = BetLimit("百家乐-闲", 50, 2000, "风控局")

    def get_limit(self, game_type: str) -> BetLimit:
        return self.limits.get(game_type, BetLimit(game_type, 10, 500, "风控局"))


# ============================================================
# 赔率牌注册表 (版本管理 + 补充版本)
# ============================================================

class OddsCardRegistry:
    def __init__(self):
        self.cards: Dict[str, List[OddsCard]] = {}
        self._build_deck()

    def _build_deck(self):
        for game_name, info in GAME_TYPES.items():
            true_p = info["true_win_prob"]
            payout = info["payout"]

            prefix = game_name.split("-")[0][:1].upper()

            correct = OddsCard(
                card_id=f"{prefix}-v1",
                version=1,
                game_type=game_name,
                payout_multiplier=payout,
                stated_win_prob=round(true_p, 6),
                is_correct=True,
            )
            wrong_prob = OddsCard(
                card_id=f"{prefix}-v2",
                version=2,
                game_type=game_name,
                payout_multiplier=payout * 1.05,
                stated_win_prob=round(true_p * 1.1, 6),
                is_correct=False,
            )
            wrong_payout = OddsCard(
                card_id=f"{prefix}-v3",
                version=3,
                game_type=game_name,
                payout_multiplier=payout * 0.9,
                stated_win_prob=round(true_p, 6),
                is_correct=False,
            )

            self.cards[game_name] = [correct, wrong_prob, wrong_payout]

    def get_available_cards(self, game_type: str) -> List[OddsCard]:
        return self.cards.get(game_type, [])

    def make_supplementary(self, card: OddsCard, for_round: int) -> OddsCard:
        return OddsCard(
            card_id=f"{card.card_id}-S{for_round}",
            version=card.version,
            game_type=card.game_type,
            payout_multiplier=card.payout_multiplier,
            stated_win_prob=card.stated_win_prob,
            is_supplementary=True,
            supplementary_for_round=for_round,
            is_correct=card.is_correct,
        )


# ============================================================
# 概率引擎 (Monte Carlo 破产概率)
# ============================================================

class ProbabilityEngine:
    def __init__(self, n_simulations: int = 2000, n_rounds: int = 50):
        self.n_simulations = n_simulations
        self.n_rounds = n_rounds

    def bankruptcy_probability(
        self, chips: int, bet: int, win_prob: float, payout: float
    ) -> float:
        if chips <= 0:
            return 1.0
        if bet <= 0:
            return 0.0

        bankrupt_count = 0
        for _ in range(self.n_simulations):
            c = chips
            for _ in range(self.n_rounds):
                if c <= 0:
                    break
                actual_bet = min(bet, c)
                if random.random() < win_prob:
                    c += int(payout * actual_bet)
                else:
                    c -= actual_bet
            if c <= 0:
                bankrupt_count += 1

        return bankrupt_count / self.n_simulations

    def expected_value(self, bet: int, win_prob: float, payout: float) -> float:
        return bet * (win_prob * payout - (1 - win_prob))


# ============================================================
# 风控局 (主控制器)
# ============================================================

BANKRUPTCY_THRESHOLD = 0.50
BANKRUPTCY_PENALTY = 200
ODDS_MISAPPLY_PENALTY = 150

BANKRUPTCY_OVERRIDE_PREFIX = "OVERRIDE"


class RiskControlBureau:
    def __init__(self):
        self.chip_mgr = ChipManager()
        self.bet_limit_mgr = BetLimitManager()
        self.odds_registry = OddsCardRegistry()
        self.prob_engine = ProbabilityEngine()
        self.round_results: List[RoundResult] = []
        self.violations: List[Violation] = []
        self.leaderboard: List[PlayerRecord] = []
        self.current_round = 0
        self.total_rounds = 10
        self.player_name = ""

    def _pick_game(self, round_num: int) -> str:
        rng = random.Random(round_num * 37 + 42)
        names = list(GAME_TYPES.keys())
        return rng.choice(names)

    def _generate_round_odds_cards(
        self, game_type: str, round_num: int
    ) -> Tuple[List[OddsCard], bool, Optional[OddsCard]]:
        all_cards = list(self.odds_registry.get_available_cards(game_type))
        random.shuffle(all_cards)

        late_arrival = random.random() < 0.25
        supplementary = None

        if late_arrival and len(all_cards) > 1:
            available = all_cards[:2]
            supplementary_card = all_cards[2]
            supplementary = self.odds_registry.make_supplementary(
                supplementary_card, round_num
            )
        else:
            available = all_cards
            late_arrival = False

        return available, late_arrival, supplementary

    def _check_odds_misapplication(
        self, card: OddsCard, true_win_prob: float, true_payout: float
    ) -> Optional[Violation]:
        prob_diff = abs(card.stated_win_prob - true_win_prob)
        payout_diff = abs(card.payout_multiplier - true_payout)

        reasons = []
        if prob_diff > 0.003:
            reasons.append(
                f"标注胜率{card.stated_win_prob*100:.2f}%与真实胜率"
                f"{true_win_prob*100:.2f}%偏差{prob_diff*100:.2f}个百分点"
            )
        if payout_diff > 0.05:
            reasons.append(
                f"赔付{card.payout_multiplier:.2f}x与真实赔付"
                f"{true_payout:.2f}x偏差{payout_diff:.2f}x"
            )

        if reasons:
            return Violation(
                violation_type="ODDS_MISAPPLICATION",
                round_number=self.current_round,
                detail="; ".join(reasons),
                trace_odds_card=card,
                penalty=ODDS_MISAPPLY_PENALTY,
            )
        return None

    def play_round(
        self,
        game_type: str,
        bet_amount: int,
        card_index: int,
        available_cards: List[OddsCard],
        supplementary_card: Optional[OddsCard],
        override_code: Optional[str],
        precomputed_bankrupt_prob: Optional[float] = None,
    ) -> RoundResult:
        game_info = GAME_TYPES[game_type]
        true_win_prob = game_info["true_win_prob"]
        true_payout = game_info["payout"]

        selected_card = (
            available_cards[card_index]
            if card_index < len(available_cards)
            else None
        )

        if precomputed_bankrupt_prob is not None:
            bankrupt_prob = precomputed_bankrupt_prob
        else:
            bankrupt_prob = self.prob_engine.bankruptcy_probability(
                self.chip_mgr.chips, bet_amount, true_win_prob, true_payout
            )

        snap = self.chip_mgr.snapshot(self.current_round, bet_amount, bankrupt_prob)

        round_violations: List[Violation] = []
        failure_reasons: List[str] = []

        if bet_amount > 0 and bankrupt_prob > BANKRUPTCY_THRESHOLD:
            if override_code and override_code.startswith(BANKRUPTCY_OVERRIDE_PREFIX):
                snap.prob_ignored = True
                v = Violation(
                    violation_type="BANKRUPTCY_PROB_IGNORED",
                    round_number=self.current_round,
                    detail=(
                        f"破产概率{bankrupt_prob*100:.1f}%超过阈值"
                        f"{BANKRUPTCY_THRESHOLD*100:.0f}%仍继续下注"
                    ),
                    trace_chips=snap,
                    penalty=BANKRUPTCY_PENALTY,
                )
                round_violations.append(v)
                self.violations.append(v)
                failure_reasons.append(
                    f"破产概率忽略: 筹码{snap.chips}, 下注{bet_amount}, "
                    f"破产概率{bankrupt_prob*100:.1f}%"
                )

        if selected_card and bet_amount > 0:
            odds_violation = self._check_odds_misapplication(
                selected_card, true_win_prob, true_payout
            )
            if odds_violation:
                round_violations.append(odds_violation)
                self.violations.append(odds_violation)
                failure_reasons.append(f"赔率错用: {odds_violation.detail}")

        won = False
        net_profit = 0
        chips_after = self.chip_mgr.chips

        if bet_amount > 0:
            won = random.random() < true_win_prob
            if won:
                effective_payout = (
                    selected_card.payout_multiplier
                    if selected_card
                    else true_payout
                )
                net_profit = int(effective_payout * bet_amount)
            self.chip_mgr.apply_result(won, bet_amount, net_profit)
            chips_after = self.chip_mgr.chips

        if supplementary_card and bet_amount > 0:
            supp_violation = self._check_odds_misapplication(
                supplementary_card, true_win_prob, true_payout
            )
            if supp_violation:
                supplementary_card.is_correct = False

        result = RoundResult(
            round_number=self.current_round,
            game_type=game_type,
            true_win_prob=true_win_prob,
            true_payout=true_payout,
            odds_card_used=selected_card,
            chip_snapshot=snap,
            won=won,
            payout=net_profit,
            chips_after=chips_after,
            violations=round_violations,
            failure_reasons=failure_reasons,
            supplementary_card=supplementary_card,
        )

        self.round_results.append(result)
        return result

    def calculate_score(self) -> float:
        base = self.chip_mgr.chips
        penalty = sum(v.penalty for v in self.violations)
        bonus = 0
        for r in self.round_results:
            if not r.violations and r.chip_snapshot.bet_amount > 0:
                if r.chip_snapshot.bankruptcy_prob <= BANKRUPTCY_THRESHOLD:
                    bonus += 30
            if r.odds_card_used and r.odds_card_used.is_correct:
                bonus += 20
        return max(0, base - penalty + bonus)

    def finish_game(self) -> PlayerRecord:
        score = self.calculate_score()
        record = PlayerRecord(
            player_name=self.player_name,
            final_chips=self.chip_mgr.chips,
            rounds_played=self.current_round,
            total_violations=len(self.violations),
            score=score,
            violation_details=[v.format() for v in self.violations],
            completed_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        self.leaderboard.append(record)
        return record

    def export_leaderboard(self, filepath: str):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "排名", "玩家", "最终筹码", "轮数", "违规数", "得分", "完成时间"
            ])
            sorted_records = sorted(
                self.leaderboard, key=lambda r: r.score, reverse=True
            )
            for i, rec in enumerate(sorted_records, 1):
                writer.writerow([
                    i, rec.player_name, rec.final_chips,
                    rec.rounds_played, rec.total_violations,
                    f"{rec.score:.1f}", rec.completed_at,
                ])
        return str(path)


# ============================================================
# CLI 界面
# ============================================================

BANNER = r"""
+=====================================================+
|          概 率 赌 场 风 控 局  v1.0                  |
|   Probability Casino Risk Control Bureau              |
|                                                       |
|   教育目标:                                           |
|     * 破产概率意识 -- 超阈值硬拦截，可从筹码定位     |
|     * 赔率正确使用 -- 错用可从赔率牌定位             |
|     * 风险管理实践 -- 在约束下做最优决策             |
+=====================================================+
"""

VIOLATION_SUMMARY_HEADER = """
================================================
          违 规 汇 总 报 告
================================================"""


def _input(prompt: str) -> str:
    try:
        return input(prompt).strip()
    except EOFError:
        return ""


def _print_round_header(bureau: RiskControlBureau, game_type: str):
    game_info = GAME_TYPES[game_type]
    limit = bureau.bet_limit_mgr.get_limit(game_type)
    print(f"\n{'-'*50}")
    print(f"  第 {bureau.current_round}/{bureau.total_rounds} 轮")
    print(f"{'-'*50}")
    print(f"  游戏: {game_type} -- {game_info['description']}")
    print(f"  当前筹码: {bureau.chip_mgr.chips}")
    print(f"  下注上限: {limit.min_bet}~{limit.max_bet} (由{limit.set_by}设定)")


def _print_odds_cards(available: List[OddsCard], late_arrival: bool):
    print(f"\n  可用赔率牌:")
    if late_arrival:
        print(f"  [!] 注意: 赔率牌部分晚到，本轮仅有以下牌可用")
        print(f"  [!] 完整赔率牌将在本轮结束后作为补充版本送达")
    for i, card in enumerate(available):
        print(f"    [{i}] {card.label()}")


def _print_bankruptcy_analysis(
    bureau: RiskControlBureau, bet: int, game_type: str
) -> float:
    game_info = GAME_TYPES[game_type]
    bp = bureau.prob_engine.bankruptcy_probability(
        bureau.chip_mgr.chips, bet,
        game_info["true_win_prob"], game_info["payout"]
    )
    ev = bureau.prob_engine.expected_value(
        bet, game_info["true_win_prob"], game_info["payout"]
    )
    status = "[OK] 安全" if bp <= BANKRUPTCY_THRESHOLD else "[!!] 超阈值"
    print(f"\n  破产概率分析 (下注{bet}):")
    print(f"    50轮内破产概率: {bp*100:.1f}% {status}")
    print(f"    期望收益: {ev:+.1f}")
    return bp


def _print_round_result(result: RoundResult):
    print(f"\n  -- 本轮结果 --")

    if result.chip_snapshot.bet_amount == 0:
        print(f"  跳过本轮")
        print(f"  筹码: {result.chips_after}")
        _print_true_odds_reveal(result)
        return

    outcome = "[WIN] 中奖!" if result.won else "[LOSE] 未中奖"
    print(f"  结果: {outcome}")
    if result.won:
        print(f"  净赢: {result.payout} "
              f"(使用赔率牌: {result.odds_card_used.card_id})")
    print(f"  筹码: {result.chip_snapshot.chips} -> {result.chips_after}")

    for v in result.violations:
        print(f"\n  {v.format()}")

    if result.supplementary_card:
        sc = result.supplementary_card
        print(f"\n  [+] 补充赔率牌已送达:")
        print(f"    {sc.label()}")
        if not sc.is_correct:
            print(f"    [!] 此补充版赔率牌与真实赔率不符 "
                  f"(对比可见上方违规详情)")
        else:
            print(f"    [OK] 此补充版赔率牌与真实赔率一致")

    _print_true_odds_reveal(result)

    if result.failure_reasons and not result.violations:
        for fr in result.failure_reasons:
            print(f"  [!] {fr}")


def _print_true_odds_reveal(result: RoundResult):
    print(f"\n  -- 真实概率揭示 --")
    print(f"  真实胜率: {result.true_win_prob*100:.2f}%  "
          f"真实赔付: {result.true_payout:.1f}x")
    if result.odds_card_used:
        card = result.odds_card_used
        prob_match = abs(card.stated_win_prob - result.true_win_prob) <= 0.003
        payout_match = abs(card.payout_multiplier - result.true_payout) <= 0.05
        if prob_match and payout_match:
            print(f"  你使用的赔率牌 {card.card_id} 与真实参数一致")
        else:
            if not prob_match:
                print(f"  [!] 赔率牌 {card.card_id} 标注胜率"
                      f"{card.stated_win_prob*100:.2f}% != "
                      f"真实胜率{result.true_win_prob*100:.2f}%")
            if not payout_match:
                print(f"  [!] 赔率牌 {card.card_id} 标注赔付"
                      f"{card.payout_multiplier:.1f}x != "
                      f"真实赔付{result.true_payout:.1f}x")


def _print_final_report(bureau: RiskControlBureau, record: PlayerRecord):
    print(f"\n{'='*50}")
    print(f"          游 戏 结 束")
    print(f"{'='*50}")
    print(f"  玩家: {record.player_name}")
    print(f"  最终筹码: {record.final_chips}")
    print(f"  得分: {record.score:.1f}")
    print(f"    = 筹码{record.final_chips}")
    penalty = sum(v.penalty for v in bureau.violations)
    bonus = record.score - record.final_chips + penalty
    print(f"    + 奖励{bonus:.0f}")
    print(f"    - 违规扣分{penalty}")
    print(f"  总违规: {record.total_violations}次")

    if bureau.violations:
        print(VIOLATION_SUMMARY_HEADER)
        for v in bureau.violations:
            print(f"\n  {v.format()}")

    print(f"\n  {'-'*40}")
    print(f"  教训总结:")
    if not bureau.violations:
        print(f"  [OK] 恭喜! 本局无违规，风控意识优秀!")
    else:
        bankruptcy_ignores = [
            v for v in bureau.violations
            if v.violation_type == "BANKRUPTCY_PROB_IGNORED"
        ]
        odds_misapplies = [
            v for v in bureau.violations
            if v.violation_type == "ODDS_MISAPPLICATION"
        ]
        if bankruptcy_ignores:
            print(f"  [X] 破产概率忽略 {len(bankruptcy_ignores)} 次:")
            for v in bankruptcy_ignores:
                cs = v.trace_chips
                print(
                    f"     -> 第{v.round_number}轮: 筹码{cs.chips}, "
                    f"下注{cs.bet_amount}, "
                    f"破产概率{cs.bankruptcy_prob*100:.1f}%"
                )
            print(
                f"     教训: 当破产概率>{BANKRUPTCY_THRESHOLD*100:.0f}%时"
                f"应降低下注或跳过，而非强制继续"
            )
        if odds_misapplies:
            print(f"  [X] 赔率错用 {len(odds_misapplies)} 次:")
            for v in odds_misapplies:
                oc = v.trace_odds_card
                print(
                    f"     -> 第{v.round_number}轮: 赔率牌{oc.card_id}, "
                    f"赔付{oc.payout_multiplier}x, "
                    f"标注胜率{oc.stated_win_prob*100:.2f}%"
                )
                print(f"       原因: {v.detail}")
            print(
                f"     教训: 下注前应核实赔率牌的胜率和赔付"
                f"是否与游戏真实参数一致"
            )

    print(f"\n{'='*50}")


def _print_leaderboard(bureau: RiskControlBureau):
    if not bureau.leaderboard:
        print("  排行榜为空")
        return
    print(f"\n{'='*50}")
    print(f"          排  行  榜")
    print(f"{'='*50}")
    sorted_records = sorted(
        bureau.leaderboard, key=lambda r: r.score, reverse=True
    )
    print(f"  {'排名':<6}{'玩家':<12}{'筹码':<8}{'违规':<6}{'得分':<10}")
    print(f"  {'-'*42}")
    for i, rec in enumerate(sorted_records, 1):
        print(
            f"  {i:<6}{rec.player_name:<12}{rec.final_chips:<8}"
            f"{rec.total_violations:<6}{rec.score:<10.1f}"
        )
    print(f"{'='*50}")


def _game_loop(bureau: RiskControlBureau):
    for round_num in range(1, bureau.total_rounds + 1):
        bureau.current_round = round_num
        game_type = bureau._pick_game(round_num)
        limit = bureau.bet_limit_mgr.get_limit(game_type)

        available_cards, late_arrival, supplementary = (
            bureau._generate_round_odds_cards(game_type, round_num)
        )

        while True:
            _print_round_header(bureau, game_type)
            _print_odds_cards(available_cards, late_arrival)

            bet_str = _input(
                f"\n  请输入下注额 "
                f"({limit.min_bet}~{limit.max_bet}, 0=跳过): "
            )
            if not bet_str:
                continue
            try:
                bet_amount = int(bet_str)
            except ValueError:
                print("  [!] 请输入数字")
                continue

            if bet_amount == 0:
                result = bureau.play_round(
                    game_type, 0, 0, available_cards,
                    supplementary, None, 0.0,
                )
                _print_round_result(result)
                break

            if bet_amount < limit.min_bet or bet_amount > limit.max_bet:
                print(
                    f"  [!] 下注额须在 "
                    f"{limit.min_bet}~{limit.max_bet} 之间"
                )
                continue

            if bet_amount > bureau.chip_mgr.chips:
                print(
                    f"  [!] 筹码不足 (当前{bureau.chip_mgr.chips})"
                )
                continue

            bp = _print_bankruptcy_analysis(bureau, bet_amount, game_type)

            if bp > BANKRUPTCY_THRESHOLD:
                print(
                    f"\n  [BLOCKED] 风控拦截: "
                    f"破产概率 {bp*100:.1f}% > "
                    f"阈值 {BANKRUPTCY_THRESHOLD*100:.0f}%"
                )
                snap_id = bureau.chip_mgr._next_id
                print(
                    f"     定位 -> 筹码快照 #{snap_id}: "
                    f"第{round_num}轮, "
                    f"筹码={bureau.chip_mgr.chips}, "
                    f"拟下注={bet_amount}"
                )
                print(
                    f"     如确认风险继续，"
                    f"输入覆盖码: "
                    f"{BANKRUPTCY_OVERRIDE_PREFIX}-{round_num}"
                )
                print(f"     或输入 0 修改下注额")
                override = _input("  > ")
                if override == "0":
                    continue
                if override == f"{BANKRUPTCY_OVERRIDE_PREFIX}-{round_num}":
                    pass
                else:
                    print("  <- 返回重新下注")
                    continue

            card_input = _input(
                f"  选择赔率牌序号 [0~{len(available_cards)-1}]: "
            )
            try:
                card_idx = int(card_input)
                if card_idx < 0 or card_idx >= len(available_cards):
                    print("  [!] 无效序号")
                    continue
            except ValueError:
                print("  [!] 请输入数字")
                continue

            override_code = None
            if bp > BANKRUPTCY_THRESHOLD:
                override_code = (
                    f"{BANKRUPTCY_OVERRIDE_PREFIX}-{round_num}"
                )

            result = bureau.play_round(
                game_type, bet_amount, card_idx,
                available_cards, supplementary, override_code,
                bp,
            )
            _print_round_result(result)
            break

        if bureau.chip_mgr.is_bankrupt():
            print(f"\n  [BANKRUPT] 破产! 筹码归零，游戏结束")
            break

    record = bureau.finish_game()
    _print_final_report(bureau, record)

    while True:
        print(
            f"\n  选项: [1]排行榜  [2]导出排行榜  "
            f"[3]再玩一局  [0]退出"
        )
        choice = _input("  > ")
        if choice == "1":
            _print_leaderboard(bureau)
        elif choice == "2":
            default_path = (
                f"leaderboard_"
                f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
            path = (
                _input(f"  导出路径 (默认 {default_path}): ")
                or default_path
            )
            full_path = bureau.export_leaderboard(path)
            print(f"  [OK] 已导出: {full_path}")
        elif choice == "3":
            old_leaderboard = bureau.leaderboard[:]
            new_bureau = RiskControlBureau()
            new_bureau.leaderboard = old_leaderboard
            _start_game(new_bureau)
            return
        elif choice == "0":
            print("  再见!")
            break


def _start_game(bureau: RiskControlBureau):
    print(BANNER)

    name = _input("请输入玩家姓名: ")
    if not name:
        name = "匿名玩家"
    bureau.player_name = name

    rounds_input = _input(
        f"游戏轮数 (默认{bureau.total_rounds}): "
    )
    if rounds_input.isdigit() and int(rounds_input) > 0:
        bureau.total_rounds = int(rounds_input)

    print(f"\n  玩家: {name}")
    print(f"  初始筹码: {bureau.chip_mgr.chips}")
    print(f"  破产概率阈值: {BANKRUPTCY_THRESHOLD*100:.0f}%")
    print(f"  游戏轮数: {bureau.total_rounds}")
    print(f"  开始!")

    _game_loop(bureau)


def show_leaderboard_from_file(filepath: str):
    path = Path(filepath)
    if not path.exists():
        print(f"  文件不存在: {filepath}")
        return
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        print("  排行榜为空")
        return
    print(f"\n{'='*50}")
    print(f"          排  行  榜  (来自 {filepath})")
    print(f"{'='*50}")
    header = rows[0]
    print(f"  {'  '.join(header)}")
    print(f"  {'-'*42}")
    for row in rows[1:]:
        print(f"  {'  '.join(row)}")
    print(f"{'='*50}")


def main():
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "leaderboard" and len(sys.argv) > 2:
            show_leaderboard_from_file(sys.argv[2])
        else:
            print("用法:")
            print(f"  python {sys.argv[0]}              -- 开始游戏")
            print(
                f"  python {sys.argv[0]} leaderboard <file.csv>  "
                f"-- 查看排行榜"
            )
    else:
        bureau = RiskControlBureau()
        _start_game(bureau)


if __name__ == "__main__":
    main()
