from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime


class Rarity(Enum):
    COMMON = "普通"
    RARE = "稀有"
    EPIC = "史诗"
    LEGENDARY = "传说"


class DrawType(Enum):
    SINGLE = "单抽"
    TEN_PULL = "十连"


@dataclass
class CharacterCard:
    card_id: str
    name: str
    rarity: Rarity
    base_probability: float
    description: str = ""
    dupe_convert: Dict[str, int] = field(default_factory=dict)

    def __post_init__(self):
        if not self.dupe_convert:
            if self.rarity == Rarity.COMMON:
                self.dupe_convert = {"碎片": 5, "金币": 100}
            elif self.rarity == Rarity.RARE:
                self.dupe_convert = {"碎片": 15, "金币": 300}
            elif self.rarity == Rarity.EPIC:
                self.dupe_convert = {"碎片": 50, "金币": 1000}
            elif self.rarity == Rarity.LEGENDARY:
                self.dupe_convert = {"碎片": 150, "金币": 3000}


@dataclass
class GachaPool:
    pool_id: str
    name: str
    cards: List[CharacterCard]
    pity_config: Dict[Rarity, int]
    start_time: datetime
    end_time: Optional[datetime] = None
    featured_card_ids: List[str] = field(default_factory=list)

    def get_card_by_id(self, card_id: str) -> Optional[CharacterCard]:
        for card in self.cards:
            if card.card_id == card_id:
                return card
        return None

    def get_cards_by_rarity(self, rarity: Rarity) -> List[CharacterCard]:
        return [card for card in self.cards if card.rarity == rarity]


@dataclass
class Resource:
    name: str
    current: int
    max_capacity: Optional[int] = None

    def can_consume(self, amount: int) -> bool:
        return self.current >= amount

    def consume(self, amount: int) -> bool:
        if self.can_consume(amount):
            self.current -= amount
            return True
        return False

    def add(self, amount: int):
        self.current += amount
        if self.max_capacity and self.current > self.max_capacity:
            self.current = self.max_capacity


@dataclass
class PlayerState:
    player_id: str
    name: str
    resources: Dict[str, Resource] = field(default_factory=dict)
    owned_cards: Dict[str, int] = field(default_factory=dict)
    pity_counters: Dict[str, Dict[Rarity, int]] = field(default_factory=dict)
    draw_count: int = 0

    def init_pity_for_pool(self, pool_id: str, rarities: List[Rarity]):
        if pool_id not in self.pity_counters:
            self.pity_counters[pool_id] = {rarity: 0 for rarity in rarities}

    def get_pity_count(self, pool_id: str, rarity: Rarity) -> int:
        if pool_id not in self.pity_counters:
            return 0
        return self.pity_counters[pool_id].get(rarity, 0)

    def increment_pity(self, pool_id: str, rarity: Rarity):
        if pool_id in self.pity_counters:
            self.pity_counters[pool_id][rarity] += 1

    def reset_pity(self, pool_id: str, rarity: Rarity):
        if pool_id in self.pity_counters:
            self.pity_counters[pool_id][rarity] = 0

    def owns_card(self, card_id: str) -> bool:
        return self.owned_cards.get(card_id, 0) > 0

    def add_card(self, card_id: str, count: int = 1):
        self.owned_cards[card_id] = self.owned_cards.get(card_id, 0) + count

    def get_resource(self, resource_name: str) -> Optional[Resource]:
        return self.resources.get(resource_name)

    def has_enough_resource(self, resource_name: str, amount: int) -> bool:
        resource = self.get_resource(resource_name)
        return resource is not None and resource.can_consume(amount)
