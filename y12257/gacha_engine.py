import random
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from models import (
    CharacterCard,
    GachaPool,
    PlayerState,
    Rarity,
    DrawType,
    Resource,
)


class RiskLevel(Enum):
    NONE = "无风险"
    LOW = "低风险"
    MEDIUM = "中风险"
    HIGH = "高风险"
    CRITICAL = "严重风险"


@dataclass
class ProbabilitySnapshot:
    step: int
    timestamp: datetime
    rarity_probabilities: Dict[Rarity, float]
    pity_counters: Dict[Rarity, int]
    trigger_reason: str
    actual_rarity: Rarity
    drawn_card_id: str
    drawn_card_name: str


@dataclass
class RiskAlert:
    step: int
    timestamp: datetime
    risk_level: RiskLevel
    alert_type: str
    resource_name: str
    current_amount: int
    required_amount: int
    deficit: int
    impact_score: int
    message: str


@dataclass
class DrawRecord:
    step: int
    timestamp: datetime
    draw_type: DrawType
    card_id: str
    card_name: str
    rarity: Rarity
    is_duplicate: bool
    pity_triggered: bool
    pity_rarity: Optional[Rarity]
    resources_consumed: Dict[str, int]
    resources_gained: Dict[str, int]
    probability_snapshot: Optional[ProbabilitySnapshot] = None
    risk_alerts: List[RiskAlert] = field(default_factory=list)


@dataclass
class GameSession:
    session_id: str
    player: PlayerState
    pool: GachaPool
    draw_records: List[DrawRecord] = field(default_factory=list)
    total_score: int = 0
    risk_penalty: int = 0
    step_counter: int = 0
    draw_costs: Dict[DrawType, Dict[str, int]] = field(default_factory=dict)

    def __post_init__(self):
        if not self.draw_costs:
            self.draw_costs = {
                DrawType.SINGLE: {"钻石": 160},
                DrawType.TEN_PULL: {"钻石": 1600},
            }
        self.player.init_pity_for_pool(
            self.pool.pool_id, list(self.pool.pity_config.keys())
        )


class GachaEngine:
    def __init__(self):
        self.risk_thresholds = {
            "钻石": {
                RiskLevel.LOW: 500,
                RiskLevel.MEDIUM: 200,
                RiskLevel.HIGH: 50,
                RiskLevel.CRITICAL: 0,
            }
        }

    def calculate_effective_probability(
        self, pool: GachaPool, player: PlayerState, rarity: Rarity
    ) -> float:
        base_prob = sum(
            card.base_probability for card in pool.get_cards_by_rarity(rarity)
        )
        pity_count = player.get_pity_count(pool.pool_id, rarity)
        pity_threshold = pool.pity_config.get(rarity, 999)

        if pity_count >= pity_threshold:
            return 1.0

        pity_bonus = 0.0
        if rarity == Rarity.LEGENDARY and pity_threshold <= 90:
            soft_pity_start = pity_threshold - 10
            if pity_count > soft_pity_start:
                pity_bonus = (pity_count - soft_pity_start) * 0.06

        return min(base_prob + pity_bonus, 1.0)

    def roll_rarity(
        self, pool: GachaPool, player: PlayerState
    ) -> Tuple[Rarity, bool, Optional[Rarity]]:
        effective_probs = {}
        for rarity in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            effective_probs[rarity] = self.calculate_effective_probability(
                pool, player, rarity
            )

        pity_triggered = False
        triggered_rarity = None

        for rarity in [Rarity.LEGENDARY, Rarity.EPIC]:
            if effective_probs[rarity] >= 1.0:
                pity_triggered = True
                triggered_rarity = rarity
                return rarity, pity_triggered, triggered_rarity

        roll = random.random()
        cumulative = 0.0

        for rarity in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            prob = effective_probs[rarity]
            cumulative += prob
            if roll < cumulative:
                return rarity, pity_triggered, triggered_rarity

        return Rarity.COMMON, pity_triggered, triggered_rarity

    def select_card(self, pool: GachaPool, rarity: Rarity) -> CharacterCard:
        cards = pool.get_cards_by_rarity(rarity)
        if not cards:
            cards = pool.get_cards_by_rarity(Rarity.COMMON)

        total_weight = sum(card.base_probability for card in cards)
        roll = random.uniform(0, total_weight)
        current = 0.0

        for card in cards:
            current += card.base_probability
            if roll < current:
                return card

        return cards[0]

    def check_resource_risk(
        self, session: GameSession, draw_type: DrawType
    ) -> List[RiskAlert]:
        alerts = []
        costs = session.draw_costs[draw_type]
        step = session.step_counter

        for resource_name, required in costs.items():
            resource = session.player.get_resource(resource_name)
            if not resource:
                continue

            current = resource.current
            deficit = max(0, required - current)

            if deficit > 0:
                risk_level = RiskLevel.CRITICAL
                impact = 50
                message = f"资源[{resource_name}]严重不足：当前{current}，需要{required}，缺口{deficit}"
            elif current < self.risk_thresholds["钻石"].get(RiskLevel.HIGH, 50):
                risk_level = RiskLevel.HIGH
                impact = 20
                message = f"资源[{resource_name}]高风险：当前{current}，接近耗尽"
            elif current < self.risk_thresholds["钻石"].get(RiskLevel.MEDIUM, 200):
                risk_level = RiskLevel.MEDIUM
                impact = 10
                message = f"资源[{resource_name}]中风险：当前{current}，建议补充"
            elif current < self.risk_thresholds["钻石"].get(RiskLevel.LOW, 500):
                risk_level = RiskLevel.LOW
                impact = 5
                message = f"资源[{resource_name}]低风险：当前{current}"
            else:
                continue

            alerts.append(
                RiskAlert(
                    step=step,
                    timestamp=datetime.now(),
                    risk_level=risk_level,
                    alert_type="资源不足",
                    resource_name=resource_name,
                    current_amount=current,
                    required_amount=required,
                    deficit=deficit,
                    impact_score=impact,
                    message=message,
                )
            )

        return alerts

    def consume_resources(
        self, session: GameSession, draw_type: DrawType
    ) -> Tuple[bool, Dict[str, int]]:
        costs = session.draw_costs[draw_type]
        consumed = {}

        for resource_name, amount in costs.items():
            resource = session.player.get_resource(resource_name)
            if not resource or not resource.can_consume(amount):
                return False, {}

        for resource_name, amount in costs.items():
            resource = session.player.get_resource(resource_name)
            resource.consume(amount)
            consumed[resource_name] = amount

        return True, consumed

    def handle_duplicate(
        self, session: GameSession, card: CharacterCard
    ) -> Dict[str, int]:
        rewards = {}
        for resource_name, amount in card.dupe_convert.items():
            if resource_name in session.player.resources:
                session.player.resources[resource_name].add(amount)
            else:
                session.player.resources[resource_name] = Resource(
                    name=resource_name, current=amount
                )
            rewards[resource_name] = amount
        return rewards

    def perform_draw(
        self, session: GameSession, draw_type: DrawType
    ) -> Optional[DrawRecord]:
        session.step_counter += 1
        step = session.step_counter

        risk_alerts = self.check_resource_risk(session, draw_type)

        for alert in risk_alerts:
            session.risk_penalty += alert.impact_score

        success, consumed = self.consume_resources(session, draw_type)
        if not success:
            return None

        rarity, pity_triggered, pity_rarity = self.roll_rarity(
            session.pool, session.player
        )

        card = self.select_card(session.pool, rarity)
        is_duplicate = session.player.owns_card(card.card_id)

        rarity_probs = {}
        pity_counts = {}
        for r in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            rarity_probs[r] = self.calculate_effective_probability(
                session.pool, session.player, r
            )
            pity_counts[r] = session.player.get_pity_count(session.pool.pool_id, r)

        trigger_reason = "正常概率抽取"
        if pity_triggered:
            trigger_reason = f"保底触发（{pity_rarity.value}）"

        prob_snapshot = ProbabilitySnapshot(
            step=step,
            timestamp=datetime.now(),
            rarity_probabilities=rarity_probs,
            pity_counters=pity_counts,
            trigger_reason=trigger_reason,
            actual_rarity=rarity,
            drawn_card_id=card.card_id,
            drawn_card_name=card.name,
        )

        rewards_gained = {}
        if is_duplicate:
            rewards_gained = self.handle_duplicate(session, card)
        else:
            session.player.add_card(card.card_id)

        for r in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            if r == rarity:
                session.player.reset_pity(session.pool.pool_id, r)
                if r in [Rarity.LEGENDARY, Rarity.EPIC]:
                    for lower in [Rarity.RARE, Rarity.COMMON]:
                        session.player.reset_pity(session.pool.pool_id, lower)
            else:
                session.player.increment_pity(session.pool.pool_id, r)

        session.player.draw_count += 1
        score_value = {
            Rarity.LEGENDARY: 100,
            Rarity.EPIC: 30,
            Rarity.RARE: 5,
            Rarity.COMMON: 1,
        }.get(rarity, 0)
        session.total_score += score_value

        record = DrawRecord(
            step=step,
            timestamp=datetime.now(),
            draw_type=draw_type,
            card_id=card.card_id,
            card_name=card.name,
            rarity=rarity,
            is_duplicate=is_duplicate,
            pity_triggered=pity_triggered,
            pity_rarity=pity_rarity,
            resources_consumed=consumed,
            resources_gained=rewards_gained,
            probability_snapshot=prob_snapshot,
            risk_alerts=risk_alerts,
        )

        session.draw_records.append(record)
        return record
