import json
import random
from datetime import datetime
from typing import Optional

from .models import Agent, CallRecord, CallStatus, Customer, CustomerTier, DispatchStrategy, StrategyName


SKILLS = ["投诉处理", "技术支持", "账单查询", "业务办理", "VIP专线", "售后退换"]

STRATEGY_PRESETS = {
    "fifo": DispatchStrategy(
        name=StrategyName.FIFO,
        description="先来先服务：按到达顺序分配坐席",
        config={},
    ),
    "vip_first": DispatchStrategy(
        name=StrategyName.VIP_FIRST,
        description="VIP优先：VIP用户优先分配，普通用户排队",
        config={},
    ),
    "skill_match": DispatchStrategy(
        name=StrategyName.SKILL_MATCH,
        description="技能匹配：优先分配具备所需技能的坐席",
        config={},
    ),
    "vip_skill_hybrid": DispatchStrategy(
        name=StrategyName.VIP_SKILL_HYBRID,
        description="VIP+技能混合：VIP走优先通道，普通走技能匹配",
        config={},
    ),
    "weighted_fair": DispatchStrategy(
        name=StrategyName.WEIGHTED_FAIR,
        description="加权公平：综合考虑等级权重和等待时间的公平调度",
        config={},
    ),
}


def generate_customers(count: int, vip_ratio: float = 0.2, low_ratio: float = 0.1,
                       skill_ratio: float = 0.6, seed: Optional[int] = None) -> list[Customer]:
    if seed is not None:
        random.seed(seed)
    customers = []
    for i in range(count):
        r = random.random()
        if r < vip_ratio:
            tier = CustomerTier.VIP
        elif r < vip_ratio + low_ratio:
            tier = CustomerTier.LOW
        else:
            tier = CustomerTier.NORMAL

        required_skill = None
        if random.random() < skill_ratio:
            required_skill = random.choice(SKILLS)

        patience = random.uniform(300, 900) if tier == CustomerTier.VIP else random.uniform(400, 1200)

        customers.append(Customer(
            customer_id=f"CUST-{i:04d}",
            tier=tier,
            required_skill=required_skill,
            patience_seconds=round(patience, 1),
        ))
    return customers


def generate_agents(count: int, skills_per_agent: int = 3, vip_specialist_ratio: float = 0.3,
                    seed: Optional[int] = None) -> list[Agent]:
    if seed is not None:
        random.seed(seed)
    agents = []
    for i in range(count):
        skills = random.sample(SKILLS, min(skills_per_agent, len(SKILLS)))
        if random.random() < vip_specialist_ratio:
            if "VIP专线" not in skills:
                skills[0] = "VIP专线"
        efficiency = random.uniform(0.7, 1.3)
        agents.append(Agent(
            agent_id=f"AGENT-{i:03d}",
            skills=skills,
            efficiency=round(efficiency, 2),
        ))
    return agents


def generate_arrival_times(count: int, duration_seconds: float = 3600.0,
                           peak_hours: Optional[list[tuple[float, float]]] = None,
                           seed: Optional[int] = None) -> list[float]:
    if seed is not None:
        random.seed(seed)
    if peak_hours is None:
        peak_hours = [(0.3, 0.5), (0.7, 0.85)]

    times = []
    for _ in range(count):
        r = random.random()
        if r < 0.6 and peak_hours:
            peak = random.choice(peak_hours)
            t = random.uniform(peak[0] * duration_seconds, peak[1] * duration_seconds)
        else:
            t = random.uniform(0, duration_seconds)
        times.append(round(t, 2))

    return sorted(times)


def generate_all(customer_count: int = 100, agent_count: int = 10,
                 duration_seconds: float = 3600.0, seed: Optional[int] = None):
    if seed is not None:
        random.seed(seed)

    customers = generate_customers(customer_count, seed=seed)
    agents = generate_agents(agent_count, seed=seed)
    arrival_times = generate_arrival_times(customer_count, duration_seconds, seed=seed)

    return customers, agents, arrival_times


def save_seed_data(customers: list[Customer], agents: list[Agent],
                   arrival_times: list[float], path: str):
    data = {
        "generated_at": datetime.now().isoformat(),
        "customers": [
            {
                "customer_id": c.customer_id,
                "tier": c.tier.value,
                "required_skill": c.required_skill,
                "patience_seconds": c.patience_seconds,
            }
            for c in customers
        ],
        "agents": [
            {
                "agent_id": a.agent_id,
                "skills": a.skills,
                "efficiency": a.efficiency,
            }
            for a in agents
        ],
        "arrival_times": arrival_times,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_seed_data(path: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    customers = [
        Customer(
            customer_id=c["customer_id"],
            tier=CustomerTier(c["tier"]),
            required_skill=c.get("required_skill"),
            patience_seconds=c.get("patience_seconds", 600.0),
        )
        for c in data["customers"]
    ]

    agents = [
        Agent(
            agent_id=a["agent_id"],
            skills=a["skills"],
            efficiency=a.get("efficiency", 1.0),
        )
        for a in data["agents"]
    ]

    arrival_times = data["arrival_times"]

    return customers, agents, arrival_times
