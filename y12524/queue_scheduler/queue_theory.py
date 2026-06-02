import math
import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import heapq

from .models import QueueConfig, IntervalStats, SimulationResult
from .errors import validate_arrival_rate, validate_handle_time, validate_agent_count, validate_service_level, SimulationError


def erlang_c(c: int, a: float) -> float:
    if a >= c:
        return 1.0

    sum_terms = 0.0
    for n in range(c):
        sum_terms += (a ** n) / math.factorial(n)

    numerator = (a ** c) / (math.factorial(c) * (1 - a / c))
    denominator = sum_terms + numerator

    return numerator / denominator


def average_wait_time(c: int, lambda_: float, mu: float) -> float:
    if lambda_ >= c * mu:
        return float('inf')

    a = lambda_ / mu
    p_wait = erlang_c(c, a)
    return p_wait / (c * mu - lambda_)


def average_queue_length(c: int, lambda_: float, mu: float) -> float:
    if lambda_ >= c * mu:
        return float('inf')

    a = lambda_ / mu
    p_wait = erlang_c(c, a)
    rho = a / c
    return (p_wait * rho) / (1 - rho)


def service_level(c: int, lambda_: float, mu: float, t: float) -> float:
    if lambda_ >= c * mu:
        return 0.0

    a = lambda_ / mu
    p_wait = erlang_c(c, a)
    rho = a / c
    return 1 - p_wait * math.exp(-(c * mu - lambda_) * t)


def agent_utilization(c: int, lambda_: float, mu: float) -> float:
    if lambda_ >= c * mu:
        return 1.0
    return lambda_ / (c * mu)


def calculate_mmcc_metrics(
    arrival_rate: float,
    avg_handle_seconds: float,
    num_agents: int,
    target_wait_seconds: float = 20.0
) -> Dict[str, float]:
    validate_arrival_rate(arrival_rate)
    validate_handle_time(avg_handle_seconds)
    validate_agent_count(num_agents)

    mu = 3600.0 / avg_handle_seconds
    lambda_ = arrival_rate

    rho = agent_utilization(num_agents, lambda_, mu)
    p_wait = erlang_c(num_agents, lambda_ / mu)
    avg_wait = average_wait_time(num_agents, lambda_, mu)
    avg_queue = average_queue_length(num_agents, lambda_, mu)
    sl = service_level(num_agents, lambda_, mu, target_wait_seconds)

    return {
        "arrival_rate": lambda_,
        "service_rate": mu,
        "traffic_intensity": lambda_ / mu,
        "agent_utilization": rho,
        "probability_wait": p_wait,
        "avg_wait_seconds": avg_wait if avg_wait != float('inf') else 9999,
        "avg_queue_length": avg_queue if avg_queue != float('inf') else 9999,
        "service_level": max(0.0, min(1.0, sl)),
        "is_stable": lambda_ < num_agents * mu
    }


def find_min_agents(
    arrival_rate: float,
    avg_handle_seconds: float,
    target_service_level: float = 0.80,
    target_wait_seconds: float = 20.0,
    max_agents: int = 50
) -> int:
    validate_arrival_rate(arrival_rate)
    validate_handle_time(avg_handle_seconds)
    validate_service_level(target_service_level)

    mu = 3600.0 / avg_handle_seconds
    lambda_ = arrival_rate

    for c in range(1, max_agents + 1):
        sl = service_level(c, lambda_, mu, target_wait_seconds)
        if sl >= target_service_level and lambda_ < c * mu:
            return c

    raise SimulationError(
        f"在坐席数不超过 {max_agents} 的情况下无法达到目标服务水平",
        suggestion="请考虑降低目标服务水平、延长目标等待时间，或增加最大坐席数限制",
        details=[
            f"到达率：{arrival_rate:.1f} 通/小时",
            f"平均通话时长：{avg_handle_seconds:.0f} 秒",
            f"目标服务水平：{target_service_level*100:.0f}% @ {target_wait_seconds:.0f}秒"
        ]
    )


@dataclass
class Event:
    time: float
    event_type: str
    call_id: int

    def __lt__(self, other: 'Event') -> bool:
        return self.time < other.time

    def __le__(self, other: 'Event') -> bool:
        return self.time <= other.time


class EventDrivenSimulator:
    def __init__(
        self,
        arrival_rate: float,
        avg_handle_seconds: float,
        num_agents: int,
        sim_duration_seconds: float = 3600.0,
        abandon_time_seconds: Optional[float] = None
    ):
        self.lambda_ = arrival_rate / 3600.0
        self.mu = 1.0 / avg_handle_seconds
        self.c = num_agents
        self.duration = sim_duration_seconds
        self.abandon_time = abandon_time_seconds

        self.rng = np.random.default_rng()

    def run(self) -> Tuple[List[float], List[float], int, int, int]:
        events: List[Event] = []
        call_id = 0
        current_time = 0.0

        inter_arrival = self.rng.exponential(1 / self.lambda_)
        next_arrival = inter_arrival
        heapq.heappush(events, Event(next_arrival, 'arrival', call_id))

        busy_agents = 0
        queue: List[Tuple[float, int]] = []
        call_data: Dict[int, Dict] = {}
        wait_times: List[float] = []
        service_times: List[float] = []
        abandoned = 0
        answered = 0
        offered = 0

        while events:
            event = heapq.heappop(events)
            current_time = event.time

            if current_time > self.duration:
                break

            if event.event_type == 'arrival':
                offered += 1
                call_data[event.call_id] = {
                    'arrival_time': current_time,
                    'abandon_time': current_time + self.abandon_time if self.abandon_time else None
                }

                call_id += 1
                inter_arrival = self.rng.exponential(1 / self.lambda_)
                next_arrival = current_time + inter_arrival
                if next_arrival < self.duration:
                    heapq.heappush(events, Event(next_arrival, 'arrival', call_id))

                if busy_agents < self.c:
                    busy_agents += 1
                    wait_times.append(0.0)
                    service_time = self.rng.exponential(1 / self.mu)
                    service_times.append(service_time)
                    heapq.heappush(events, Event(current_time + service_time, 'departure', event.call_id))
                    call_data[event.call_id]['wait_time'] = 0.0
                    answered += 1
                else:
                    queue.append((current_time, event.call_id))
                    if self.abandon_time:
                        heapq.heappush(events, Event(
                            current_time + self.abandon_time,
                            'abandon',
                            event.call_id
                        ))

            elif event.event_type == 'departure':
                busy_agents -= 1
                if queue:
                    queue.sort()
                    arrival_time, waiting_call_id = queue.pop(0)
                    wait_time = current_time - arrival_time
                    wait_times.append(wait_time)
                    call_data[waiting_call_id]['wait_time'] = wait_time

                    service_time = self.rng.exponential(1 / self.mu)
                    service_times.append(service_time)
                    heapq.heappush(events, Event(current_time + service_time, 'departure', waiting_call_id))
                    busy_agents += 1
                    answered += 1

            elif event.event_type == 'abandon':
                in_queue = any(cid == event.call_id for _, cid in queue)
                if in_queue:
                    queue = [(t, cid) for t, cid in queue if cid != event.call_id]
                    abandoned += 1
                    if event.call_id in call_data:
                        wait_times.append(current_time - call_data[event.call_id]['arrival_time'])

        wait_times_array = np.array(wait_times) if wait_times else np.array([0.0])
        return wait_times_array, np.array(service_times), offered, answered, abandoned


def simulate_interval(
    interval_start: datetime,
    interval_end: datetime,
    arrival_rate: float,
    avg_handle_seconds: float,
    num_agents: int,
    config: QueueConfig,
    abandon_time_seconds: Optional[float] = 180.0
) -> IntervalStats:
    duration_seconds = (interval_end - interval_start).total_seconds()

    metrics = calculate_mmcc_metrics(
        arrival_rate=arrival_rate,
        avg_handle_seconds=avg_handle_seconds,
        num_agents=num_agents,
        target_wait_seconds=config.target_wait_seconds
    )

    simulator = EventDrivenSimulator(
        arrival_rate=arrival_rate,
        avg_handle_seconds=avg_handle_seconds,
        num_agents=num_agents,
        sim_duration_seconds=duration_seconds,
        abandon_time_seconds=abandon_time_seconds
    )

    all_wait_times = []
    total_offered = 0
    total_answered = 0
    total_abandoned = 0

    for _ in range(max(1, config.sim_iterations // 10)):
        wait_times, service_times, offered, answered, abandoned = simulator.run()
        all_wait_times.extend(wait_times)
        total_offered += offered
        total_answered += answered
        total_abandoned += abandoned

    avg_wait = np.mean(all_wait_times) if all_wait_times else 0.0
    max_wait = np.max(all_wait_times) if all_wait_times else 0.0
    wait_times_array = np.array(all_wait_times)
    sl = np.sum(wait_times_array <= config.target_wait_seconds) / len(wait_times_array) if len(wait_times_array) > 0 else 0.0

    avg_offered = total_offered / max(1, config.sim_iterations // 10)
    avg_answered = total_answered / max(1, config.sim_iterations // 10)
    avg_abandoned = total_abandoned / max(1, config.sim_iterations // 10)

    return IntervalStats(
        interval_start=interval_start,
        interval_end=interval_end,
        arrival_rate=arrival_rate,
        avg_handle_time=avg_handle_seconds,
        num_agents=num_agents,
        offered_calls=int(round(avg_offered)),
        answered_calls=int(round(avg_answered)),
        abandoned_calls=int(round(avg_abandoned)),
        avg_wait_time=avg_wait,
        service_level=sl,
        max_wait_time=max_wait,
        avg_queue_length=metrics['avg_queue_length'],
        agent_utilization=metrics['agent_utilization']
    ), all_wait_times


def compare_agent_scenarios(
    arrival_rate: float,
    avg_handle_seconds: float,
    base_agents: int,
    target_service_level: float = 0.80,
    target_wait_seconds: float = 20.0,
    extra_agents: int = 3
) -> List[Dict]:
    scenarios = []

    for c in range(max(1, base_agents - extra_agents), base_agents + extra_agents + 1):
        try:
            metrics = calculate_mmcc_metrics(
                arrival_rate=arrival_rate,
                avg_handle_seconds=avg_handle_seconds,
                num_agents=c,
                target_wait_seconds=target_wait_seconds
            )

            scenarios.append({
                "agents": c,
                "service_level": metrics['service_level'],
                "avg_wait_seconds": metrics['avg_wait_seconds'],
                "max_wait_estimate": metrics['avg_wait_seconds'] * 3,
                "avg_queue_length": metrics['avg_queue_length'],
                "agent_utilization": metrics['agent_utilization'],
                "meets_target": metrics['service_level'] >= target_service_level and metrics['is_stable'],
                "wait_reduction_vs_base": None
            })
        except Exception:
            continue

    base_metrics = next((s for s in scenarios if s['agents'] == base_agents), None)
    if base_metrics:
        for s in scenarios:
            if base_metrics['avg_wait_seconds'] > 0:
                s['wait_reduction_vs_base'] = (
                    (base_metrics['avg_wait_seconds'] - s['avg_wait_seconds']) /
                    base_metrics['avg_wait_seconds']
                )

    return scenarios
