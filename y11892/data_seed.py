from datetime import datetime, timedelta
from models import CallRecord, Agent, DispatchStrategyConfig, CustomerLevel, SkillType, DispatchStrategy
from store import store


def seed_sample_data():
    store.agents.clear()
    store.call_records.clear()
    store.strategies.clear()
    store.pending_confirmations.clear()
    store.strategy_supplement_logs.clear()

    agents = [
        Agent(agent_id="A001", name="张三", skills=[SkillType.GENERAL, SkillType.BILLING]),
        Agent(agent_id="A002", name="李四", skills=[SkillType.TECHNICAL, SkillType.GENERAL]),
        Agent(agent_id="A003", name="王五", skills=[SkillType.COMPLAINT, SkillType.PREMIUM]),
        Agent(agent_id="A004", name="赵六", skills=[SkillType.PREMIUM, SkillType.GENERAL]),
    ]
    for agent in agents:
        store.add_agent(agent)

    strategies = [
        DispatchStrategyConfig(
            strategy_id="S001",
            strategy_type=DispatchStrategy.FIFO,
            name="先到先得策略",
            description="按来电时间顺序分配",
            is_active=False
        ),
        DispatchStrategyConfig(
            strategy_id="S002",
            strategy_type=DispatchStrategy.PRIORITY,
            name="优先级优先策略",
            description="VIP客户优先",
            vip_weight=2.0,
            is_active=True
        ),
        DispatchStrategyConfig(
            strategy_id="S003",
            strategy_type=DispatchStrategy.SKILL_MATCH,
            name="技能匹配优先策略",
            description="按技能匹配度分配",
            skill_match_weight=2.0,
            is_active=False
        ),
        DispatchStrategyConfig(
            strategy_id="S004",
            strategy_type=DispatchStrategy.FAIRNESS,
            name="公平优先策略",
            description="兼顾公平性分配",
            fairness_weight=1.5,
            vip_weight=0.5,
            is_active=False
        ),
    ]
    for strategy in strategies:
        store.add_strategy(strategy)

    base_time = datetime.now() - timedelta(hours=2)

    calls = [
        CallRecord(
            call_id="C001",
            phone="13800000001",
            customer_level=CustomerLevel.REGULAR,
            required_skill=SkillType.GENERAL,
            arrival_time=base_time,
            start_service_time=base_time + timedelta(seconds=45),
            end_service_time=base_time + timedelta(seconds=345),
            assigned_agent_id="A001",
            wait_time_seconds=45,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C002",
            phone="13800000002",
            customer_level=CustomerLevel.VIP,
            required_skill=SkillType.PREMIUM,
            arrival_time=base_time + timedelta(seconds=10),
            start_service_time=base_time + timedelta(seconds=15),
            end_service_time=base_time + timedelta(seconds=315),
            assigned_agent_id="A003",
            wait_time_seconds=5,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C003",
            phone="13800000003",
            customer_level=CustomerLevel.REGULAR,
            required_skill=SkillType.BILLING,
            arrival_time=base_time + timedelta(seconds=20),
            start_service_time=base_time + timedelta(seconds=320),
            end_service_time=base_time + timedelta(seconds=620),
            assigned_agent_id="A001",
            wait_time_seconds=300,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C004",
            phone="13800000004",
            customer_level=CustomerLevel.REGULAR,
            required_skill=SkillType.TECHNICAL,
            arrival_time=base_time + timedelta(seconds=30),
            start_service_time=base_time + timedelta(seconds=50),
            end_service_time=base_time + timedelta(seconds=350),
            assigned_agent_id="A002",
            wait_time_seconds=20,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C005",
            phone="13800000005",
            customer_level=CustomerLevel.VIP,
            required_skill=SkillType.GENERAL,
            arrival_time=base_time + timedelta(seconds=40),
            start_service_time=base_time + timedelta(seconds=55),
            end_service_time=base_time + timedelta(seconds=355),
            assigned_agent_id="A004",
            wait_time_seconds=15,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C006",
            phone="13800000006",
            customer_level=CustomerLevel.REGULAR,
            required_skill=SkillType.GENERAL,
            arrival_time=base_time + timedelta(seconds=50),
            start_service_time=base_time + timedelta(seconds=250),
            end_service_time=base_time + timedelta(seconds=550),
            assigned_agent_id="A001",
            wait_time_seconds=200,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C007",
            phone="13800000007",
            customer_level=CustomerLevel.GOLD,
            required_skill=SkillType.COMPLAINT,
            arrival_time=base_time + timedelta(seconds=60),
            start_service_time=base_time + timedelta(seconds=80),
            end_service_time=base_time + timedelta(seconds=380),
            assigned_agent_id="A003",
            wait_time_seconds=20,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
        CallRecord(
            call_id="C008",
            phone="13800000008",
            customer_level=CustomerLevel.REGULAR,
            required_skill=SkillType.PREMIUM,
            arrival_time=base_time + timedelta(seconds=70),
            start_service_time=base_time + timedelta(seconds=100),
            end_service_time=base_time + timedelta(seconds=400),
            assigned_agent_id="A002",
            wait_time_seconds=30,
            is_served=True,
            dispatch_strategy_used=DispatchStrategy.PRIORITY
        ),
    ]

    for call in calls:
        store.add_call_record(call)

    store.data_version = "1.0.0"
