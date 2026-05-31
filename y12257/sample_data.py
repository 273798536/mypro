from datetime import datetime
from models import CharacterCard, GachaPool, PlayerState, Rarity, Resource


def create_sample_pool() -> GachaPool:
    cards = [
        CharacterCard(
            card_id="LEG_001",
            name="黎明圣剑·艾拉",
            rarity=Rarity.LEGENDARY,
            base_probability=0.008,
            description="光之守护者，手持圣剑的传奇骑士",
        ),
        CharacterCard(
            card_id="LEG_002",
            name="暗影刺客·夜刃",
            rarity=Rarity.LEGENDARY,
            base_probability=0.008,
            description="来自暗夜的神秘刺客，一击致命",
        ),
        CharacterCard(
            card_id="EPIC_001",
            name="火焰法师·伊格尼斯",
            rarity=Rarity.EPIC,
            base_probability=0.015,
            description="精通火系魔法的元素师",
        ),
        CharacterCard(
            card_id="EPIC_002",
            name="冰霜弓手·希尔瓦",
            rarity=Rarity.EPIC,
            base_probability=0.015,
            description="百步穿杨的精灵射手",
        ),
        CharacterCard(
            card_id="EPIC_003",
            name="雷霆战士·托尔",
            rarity=Rarity.EPIC,
            base_probability=0.015,
            description="召唤雷电的狂战士",
        ),
        CharacterCard(
            card_id="RARE_001",
            name="见习骑士·艾伦",
            rarity=Rarity.RARE,
            base_probability=0.05,
            description="正在修行的年轻骑士",
        ),
        CharacterCard(
            card_id="RARE_002",
            name="药剂师·莉娜",
            rarity=Rarity.RARE,
            base_probability=0.05,
            description="擅长调配各种药剂的少女",
        ),
        CharacterCard(
            card_id="RARE_003",
            name="斥候·莱恩",
            rarity=Rarity.RARE,
            base_probability=0.05,
            description="身手敏捷的侦察兵",
        ),
        CharacterCard(
            card_id="RARE_004",
            name="铁匠·格林",
            rarity=Rarity.RARE,
            base_probability=0.05,
            description="打造精良武器的工匠",
        ),
        CharacterCard(
            card_id="COMMON_001",
            name="村民·甲",
            rarity=Rarity.COMMON,
            base_probability=0.15,
            description="普通的村庄居民",
        ),
        CharacterCard(
            card_id="COMMON_002",
            name="村民·乙",
            rarity=Rarity.COMMON,
            base_probability=0.15,
            description="普通的村庄居民",
        ),
        CharacterCard(
            card_id="COMMON_003",
            name="村民·丙",
            rarity=Rarity.COMMON,
            base_probability=0.15,
            description="普通的村庄居民",
        ),
        CharacterCard(
            card_id="COMMON_004",
            name="史莱姆",
            rarity=Rarity.COMMON,
            base_probability=0.15,
            description="最弱的怪物，但很可爱",
        ),
    ]

    pity_config = {
        Rarity.LEGENDARY: 90,
        Rarity.EPIC: 10,
        Rarity.RARE: 0,
        Rarity.COMMON: 0,
    }

    return GachaPool(
        pool_id="POOL_001",
        name="曙光召唤池",
        cards=cards,
        pity_config=pity_config,
        start_time=datetime.now(),
        featured_card_ids=["LEG_001", "LEG_002"],
    )


def create_normal_player() -> PlayerState:
    player = PlayerState(
        player_id="PLAYER_001",
        name="策略型玩家",
    )
    player.resources = {
        "钻石": Resource(name="钻石", current=10000, max_capacity=100000),
        "金币": Resource(name="金币", current=50000, max_capacity=1000000),
        "碎片": Resource(name="碎片", current=0, max_capacity=10000),
    }
    return player


def create_overdraft_player() -> PlayerState:
    player = PlayerState(
        player_id="PLAYER_002",
        name="冲动型玩家",
    )
    player.resources = {
        "钻石": Resource(name="钻石", current=2000, max_capacity=100000),
        "金币": Resource(name="金币", current=50000, max_capacity=1000000),
        "碎片": Resource(name="碎片", current=0, max_capacity=10000),
    }
    return player
