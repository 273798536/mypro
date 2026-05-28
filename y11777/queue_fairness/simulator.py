import math
import random
from typing import Optional

from .models import (
    Agent,
    CallRecord,
    CallStatus,
    Customer,
    CustomerTier,
    DispatchStrategy,
    StrategyName,
)


class Simulator:
    def __init__(self, strategy: DispatchStrategy, agents: list[Agent]):
        self.strategy = strategy
        self.agents = agents
        self.current_time = 0.0
        self._agent_free_at: dict[str, float] = {a.agent_id: 0.0 for a in agents}

    def run(self, customers: list[Customer], arrival_times: list[float],
            service_time_range: tuple[float, float] = (60.0, 300.0)) -> list[CallRecord]:
        if len(customers) != len(arrival_times):
            raise ValueError("customers和arrival_times长度必须一致")

        indexed = sorted(zip(arrival_times, range(len(customers)), customers),
                         key=lambda x: x[0])

        queue: list[CallRecord] = []
        results: list[CallRecord] = []
        serving: list[CallRecord] = []

        next_arrival_idx = 0
        random.seed(id(self))
        service_range = service_time_range

        def next_event_time():
            candidates = []
            if next_arrival_idx < len(indexed):
                candidates.append(indexed[next_arrival_idx][0])
            for call in serving:
                if call.end_time is not None:
                    candidates.append(call.end_time)
            return min(candidates) if candidates else None

        while next_arrival_idx < len(indexed) or queue or serving:
            evt_time = next_event_time()
            if evt_time is None:
                break

            self.current_time = evt_time

            finished = [c for c in serving if c.end_time is not None and c.end_time <= self.current_time]
            for c in finished:
                c.status = CallStatus.COMPLETED
                c.add_audit("complete", "status", CallStatus.SERVING,
                            CallStatus.COMPLETED, "服务完成", "simulator")
                serving.remove(c)
                results.append(c)

            while next_arrival_idx < len(indexed) and indexed[next_arrival_idx][0] <= self.current_time:
                arr_time, idx, customer = indexed[next_arrival_idx]
                next_arrival_idx += 1
                call = CallRecord(
                    call_id=f"call-{idx:04d}",
                    customer=customer,
                    arrival_time=arr_time,
                    source="simulation",
                )
                queue.append(call)

            self._sort_queue(queue)
            self._dispatch_from_queue(queue, serving, service_range)

            abandoned = []
            for call in queue:
                wait = self.current_time - call.arrival_time
                if wait >= call.customer.patience_seconds:
                    call.status = CallStatus.ABANDONED
                    call.wait_time = wait
                    call.add_audit("abandon", "status", CallStatus.WAITING,
                                   CallStatus.ABANDONED,
                                   f"等待{wait:.0f}秒超过耐心阈值{call.customer.patience_seconds:.0f}秒",
                                   "simulator")
                    results.append(call)
                    abandoned.append(call)
            for c in abandoned:
                queue.remove(c)

        return results

    def _sort_queue(self, queue: list[CallRecord]):
        strategy = self.strategy.name
        if strategy == StrategyName.FIFO:
            queue.sort(key=lambda c: c.arrival_time)
        elif strategy == StrategyName.VIP_FIRST:
            tier_order = {CustomerTier.VIP: 0, CustomerTier.NORMAL: 1, CustomerTier.LOW: 2}
            queue.sort(key=lambda c: (tier_order.get(c.customer.tier, 1), c.arrival_time))
        elif strategy == StrategyName.SKILL_MATCH:
            queue.sort(key=lambda c: c.arrival_time)
        elif strategy == StrategyName.VIP_SKILL_HYBRID:
            tier_order = {CustomerTier.VIP: 0, CustomerTier.NORMAL: 1, CustomerTier.LOW: 2}
            queue.sort(key=lambda c: (tier_order.get(c.customer.tier, 1), c.arrival_time))
        elif strategy == StrategyName.WEIGHTED_FAIR:
            tier_weights = {CustomerTier.VIP: 3.0, CustomerTier.NORMAL: 2.0, CustomerTier.LOW: 1.0}
            queue.sort(key=lambda c: -tier_weights.get(c.customer.tier, 1.0)
                       * (1 + math.log1p(self.current_time - c.arrival_time)))

    def _dispatch_from_queue(self, queue: list[CallRecord], serving: list[CallRecord],
                             service_range: tuple[float, float]):
        dispatched = []
        for call in queue:
            if call.status != CallStatus.WAITING:
                continue
            agent = self._pick_agent(call)
            if agent is None:
                continue
            self._assign_agent(call, agent, service_range)
            serving.append(call)
            dispatched.append(call)
        for c in dispatched:
            queue.remove(c)

    def _pick_agent(self, call: CallRecord) -> Optional[Agent]:
        free_agents = [a for a in self.agents if self._agent_free_at[a.agent_id] <= self.current_time]
        if not free_agents:
            return None

        strategy = self.strategy.name
        if strategy == StrategyName.SKILL_MATCH or strategy == StrategyName.VIP_SKILL_HYBRID:
            if call.customer.required_skill:
                skilled = [a for a in free_agents if call.customer.required_skill in a.skills]
                if skilled:
                    return skilled[0]
            if strategy == StrategyName.SKILL_MATCH:
                return free_agents[0]
            return free_agents[0]

        return free_agents[0]

    def _assign_agent(self, call: CallRecord, agent: Agent, service_range: tuple[float, float]):
        base_service = random.uniform(service_range[0], service_range[1])
        service_time = base_service / agent.efficiency

        if call.customer.required_skill and call.customer.required_skill not in agent.skills:
            service_time *= 1.5
            call.skill_matched = False
            call.add_audit("mismatch", "skill_matched", None, False,
                           f"坐席{agent.agent_id}缺少技能[{call.customer.required_skill}]，服务时间+50%",
                           "simulator")
        else:
            call.skill_matched = True

        call.assigned_agent = agent
        call.start_time = self.current_time
        call.wait_time = self.current_time - call.arrival_time
        call.service_time = service_time
        call.end_time = self.current_time + service_time
        call.status = CallStatus.SERVING

        self._agent_free_at[agent.agent_id] = call.end_time

        call.add_audit("dispatch", "status", CallStatus.WAITING, CallStatus.SERVING,
                       f"策略[{self.strategy.name.value}]分配坐席{agent.agent_id}，等待{call.wait_time:.1f}秒",
                       "simulator")
