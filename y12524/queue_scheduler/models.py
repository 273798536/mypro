from dataclasses import dataclass, field
from datetime import datetime, date, time
from typing import List, Optional, Dict, Tuple
import pandas as pd


@dataclass
class CallRecord:
    call_time: datetime
    wait_seconds: float
    handle_seconds: float
    agent_id: Optional[str] = None
    is_abandoned: bool = False


@dataclass
class Shift:
    agent_id: str
    shift_date: date
    start_time: time
    end_time: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None


@dataclass
class Holiday:
    holiday_date: date
    name: str
    is_peak: bool = False
    traffic_multiplier: float = 1.0


@dataclass
class QueueConfig:
    target_service_level: float = 0.80
    target_wait_seconds: float = 20.0
    max_abandon_rate: float = 0.05
    sim_iterations: int = 1000


@dataclass
class IntervalStats:
    interval_start: datetime
    interval_end: datetime
    arrival_rate: float
    avg_handle_time: float
    num_agents: int
    offered_calls: int
    answered_calls: int
    abandoned_calls: int
    avg_wait_time: float
    service_level: float
    max_wait_time: float
    avg_queue_length: float
    agent_utilization: float

    def to_dict(self) -> Dict:
        return {
            "时段": self.interval_start.strftime("%Y-%m-%d %H:%M"),
            "坐席数": self.num_agents,
            "来电数": self.offered_calls,
            "接听数": self.answered_calls,
            "放弃数": self.abandoned_calls,
            "平均等待(秒)": round(self.avg_wait_time, 1),
            "最大等待(秒)": round(self.max_wait_time, 1),
            "服务水平": round(self.service_level * 100, 1),
            "平均排队长度": round(self.avg_queue_length, 2),
            "坐席利用率": round(self.agent_utilization * 100, 1),
        }


@dataclass
class SimulationResult:
    config: QueueConfig
    intervals: List[IntervalStats] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)
    wait_time_distribution: List[float] = field(default_factory=list)

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame([i.to_dict() for i in self.intervals])
