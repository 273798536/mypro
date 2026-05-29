from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Callable
from models import CallRecord, CustomerLevel, SkillType, DispatchStrategyConfig, Agent
from store import store
from fairness_algorithm import scorer
import copy


class QueueSimulator:
    def __init__(self):
        self.simulation_results: Dict[str, Dict] = {}

    def _get_priority_score(self, call: CallRecord, strategy: DispatchStrategyConfig) -> float:
        score = 0.0

        if strategy.vip_weight > 0:
            if call.customer_level == CustomerLevel.VIP:
                score += 100 * strategy.vip_weight
            elif call.customer_level == CustomerLevel.GOLD:
                score += 60 * strategy.vip_weight
            elif call.customer_level == CustomerLevel.SILVER:
                score += 30 * strategy.vip_weight

        if strategy.wait_time_weight > 0 and call.wait_time_seconds:
            wait_score = min(call.wait_time_seconds / 60, 100)
            score += wait_score * strategy.wait_time_weight

        return score

    def _find_matching_agent(self, call: CallRecord, available_agents: List[Agent]) -> Agent:
        for agent in available_agents:
            if call.required_skill in agent.skills:
                return agent
        return available_agents[0] if available_agents else None

    def simulate_strategy(self, strategy: DispatchStrategyConfig, calls: List[CallRecord]) -> Dict:
        simulation_calls = copy.deepcopy(calls)
        agents = copy.deepcopy(store.get_all_agents())

        queue = []
        served_calls = []
        current_time = min(c.arrival_time for c in calls) if calls else datetime.now()
        event_timeline = []
        agent_end_times = {}

        call_index = 0
        sorted_calls = sorted(simulation_calls, key=lambda c: c.arrival_time)
        max_iterations = 10000
        iteration = 0

        while (call_index < len(sorted_calls) or queue) and iteration < max_iterations:
            iteration += 1

            for agent in agents:
                if not agent.is_available and agent.agent_id in agent_end_times:
                    if agent_end_times[agent.agent_id] <= current_time:
                        agent.is_available = True
                        agent.current_call_id = None
                        del agent_end_times[agent.agent_id]

            while call_index < len(sorted_calls) and sorted_calls[call_index].arrival_time <= current_time:
                queue.append(sorted_calls[call_index])
                call_index += 1

            available_agents = [a for a in agents if a.is_available]

            while available_agents and queue:
                if strategy.strategy_type.value == "先到先得":
                    queue.sort(key=lambda c: c.arrival_time)
                elif strategy.strategy_type.value == "优先级优先":
                    queue.sort(key=lambda c: self._get_priority_score(c, strategy), reverse=True)
                elif strategy.strategy_type.value == "技能匹配优先":
                    queue.sort(key=lambda c: self._get_priority_score(c, strategy), reverse=True)
                elif strategy.strategy_type.value == "混合策略":
                    queue.sort(key=lambda c: self._get_priority_score(c, strategy), reverse=True)
                elif strategy.strategy_type.value == "公平优先":
                    queue.sort(key=lambda c: c.arrival_time)

                call = queue.pop(0)
                agent = self._find_matching_agent(call, available_agents)

                if agent:
                    agent.is_available = False
                    agent.current_call_id = call.call_id
                    call.start_service_time = current_time
                    call.assigned_agent_id = agent.agent_id
                    call.wait_time_seconds = int((current_time - call.arrival_time).total_seconds())
                    call.is_served = True
                    call.dispatch_strategy_used = strategy.strategy_type

                    service_duration = timedelta(minutes=5)
                    end_time = current_time + service_duration
                    call.end_service_time = end_time
                    agent_end_times[agent.agent_id] = end_time

                    event_timeline.append({
                        "time": current_time,
                        "event": "start_service",
                        "call_id": call.call_id,
                        "agent_id": agent.agent_id,
                        "wait_time": call.wait_time_seconds
                    })

                    served_calls.append(call)
                    available_agents.remove(agent)

            if call_index < len(sorted_calls):
                next_arrival = sorted_calls[call_index].arrival_time
                next_end_time = min(agent_end_times.values()) if agent_end_times else None

                if next_end_time and next_end_time < next_arrival:
                    current_time = next_end_time
                else:
                    current_time = next_arrival
            elif agent_end_times:
                current_time = min(agent_end_times.values())
            elif queue:
                current_time += timedelta(minutes=1)
            else:
                break

        metrics, failures = scorer.calculate_fairness_metrics(served_calls + queue)
        overall_score = scorer.calculate_overall_score(metrics)

        return {
            "strategy_id": strategy.strategy_id,
            "strategy_name": strategy.name,
            "overall_score": overall_score,
            "metrics": metrics,
            "served_count": len(served_calls),
            "total_count": len(calls),
            "failures": failures,
            "simulated_calls": served_calls + queue
        }

    def compare_all_strategies(self, calls: List[CallRecord]) -> Dict[str, float]:
        strategies = store.get_all_strategies()
        comparison = {}

        for strategy in strategies:
            result = self.simulate_strategy(strategy, calls)
            comparison[strategy.strategy_type.value] = result["overall_score"]
            self.simulation_results[strategy.strategy_id] = result

        return comparison

    def get_simulation_result(self, strategy_id: str) -> Dict:
        return self.simulation_results.get(strategy_id, {})

    def update_comparison_on_metric_change(self, calls: List[CallRecord]) -> Dict[str, float]:
        return self.compare_all_strategies(calls)


simulator = QueueSimulator()
