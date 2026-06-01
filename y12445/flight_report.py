from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from physics import Vector2, FlightEvent, EventType, Planet, TimeWindow
from spacecraft import Spacecraft, BurnRecord
from detection import IntegratedDetector
import json
from datetime import datetime


class FlightPhase(Enum):
    LAUNCH = "发射阶段"
    TRANSIT = "转移阶段"
    GRAVITY_ASSIST = "引力弹弓阶段"
    APPROACH = "接近阶段"
    ORBIT_INSERTION = "轨道插入"
    TERMINAL = "终端阶段"


class ResultCategory(Enum):
    USABLE = "可直接使用"
    NEEDS_VERIFICATION = "需物理社团老师确认"
    UNUSABLE = "暂时不能算"


@dataclass
class PhaseSummary:
    phase: FlightPhase
    start_time: float
    end_time: float
    duration: float
    events: List[FlightEvent]
    delta_v_used: float
    fuel_used: float
    max_velocity: float
    min_altitude: float


@dataclass
class TraceNode:
    time: float
    position: Vector2
    velocity: Vector2
    fuel: float
    gravity_force: Vector2
    net_acceleration: Vector2
    contributing_planets: List[str]


@dataclass
class ChainOfCausality:
    root_cause: str
    contributing_factors: List[str]
    critical_events: List[FlightEvent]
    outcome: str
    evidence: List[str]


class FlightTracer:
    def __init__(self):
        self.trace_nodes: List[TraceNode] = []

    def record_state(self, time: float, position: Vector2, velocity: Vector2,
                     fuel: float, gravity_force: Vector2, net_acceleration: Vector2,
                     contributing_planets: List[str]):
        self.trace_nodes.append(TraceNode(
            time=time,
            position=Vector2(position.x, position.y),
            velocity=Vector2(velocity.x, velocity.y),
            fuel=fuel,
            gravity_force=Vector2(gravity_force.x, gravity_force.y),
            net_acceleration=Vector2(net_acceleration.x, net_acceleration.y),
            contributing_planets=contributing_planets
        ))

    def get_trace_summary(self) -> dict:
        if not self.trace_nodes:
            return {}

        velocities = [n.velocity.magnitude() for n in self.trace_nodes]
        fuels = [n.fuel for n in self.trace_nodes]

        return {
            "total_trace_points": len(self.trace_nodes),
            "max_velocity": max(velocities),
            "min_velocity": min(velocities),
            "final_fuel": fuels[-1],
            "time_span": self.trace_nodes[-1].time - self.trace_nodes[0].time
        }


class FlightReporter:
    def __init__(self, spacecraft: Spacecraft, detector: IntegratedDetector,
                 tracer: FlightTracer, planets: List[Planet], windows: List[TimeWindow]):
        self.spacecraft = spacecraft
        self.detector = detector
        self.tracer = tracer
        self.planets = planets
        self.windows = windows
        self.generated_at = datetime.now()

    def generate_full_report(self) -> dict:
        return {
            "report_metadata": {
                "generated_at": self.generated_at.isoformat(),
                "mission_duration": self.spacecraft.state.time,
                "simulation_time_steps": len(self.tracer.trace_nodes)
            },
            "mission_overview": self._generate_mission_overview(),
            "flight_chain": self._generate_flight_chain(),
            "fuel_analysis": self._generate_fuel_analysis(),
            "window_analysis": self._generate_window_analysis(),
            "collision_analysis": self._generate_collision_analysis(),
            "causality_chain": self._analyze_causality(),
            "score_breakdown": self._generate_score_breakdown()
        }

    def _generate_mission_overview(self) -> dict:
        state = self.spacecraft.state
        events = state.events

        return {
            "final_position": {"x": state.position.x, "y": state.position.y},
            "final_velocity": state.velocity.magnitude(),
            "total_delta_v": state.total_delta_v,
            "total_events": len(events),
            "event_types": self._count_event_types(events),
            "success_criteria": self._evaluate_success_criteria()
        }

    def _generate_flight_chain(self) -> dict:
        phases = self._identify_phases()
        return {
            "total_phases": len(phases),
            "phases": [self._phase_to_dict(p) for p in phases],
            "critical_path": self._identify_critical_path()
        }

    def _identify_phases(self) -> List[PhaseSummary]:
        phases = []
        events = self.spacecraft.state.events
        if not events:
            return phases

        current_phase_start = 0.0
        current_phase_type = FlightPhase.LAUNCH
        phase_events = []

        for event in events:
            new_phase = self._event_to_phase(event.event_type)
            if new_phase and new_phase != current_phase_type:
                if phase_events:
                    phases.append(self._create_phase_summary(
                        current_phase_type, current_phase_start, event.time, phase_events
                    ))
                current_phase_start = event.time
                current_phase_type = new_phase
                phase_events = [event]
            else:
                phase_events.append(event)

        if phase_events:
            phases.append(self._create_phase_summary(
                current_phase_type, current_phase_start, self.spacecraft.state.time, phase_events
            ))

        return phases

    def _event_to_phase(self, event_type: EventType) -> Optional[FlightPhase]:
        mapping = {
            EventType.LAUNCH: FlightPhase.LAUNCH,
            EventType.BURN: FlightPhase.TRANSIT,
            EventType.GRAVITY_ASSIST: FlightPhase.GRAVITY_ASSIST,
            EventType.WINDOW_ENTER: FlightPhase.APPROACH,
            EventType.ORBIT_INSERTION: FlightPhase.ORBIT_INSERTION,
            EventType.ARRIVAL: FlightPhase.TERMINAL
        }
        return mapping.get(event_type)

    def _create_phase_summary(self, phase_type: FlightPhase, start: float,
                              end: float, events: List[FlightEvent]) -> PhaseSummary:
        burn_records = self.spacecraft.state.burn_records
        phase_burns = [b for b in burn_records if start <= b.time <= end]
        delta_v = sum(b.delta_v.magnitude() for b in phase_burns)
        fuel = sum(b.fuel_used for b in phase_burns)

        return PhaseSummary(
            phase=phase_type,
            start_time=start,
            end_time=end,
            duration=end - start,
            events=events,
            delta_v_used=delta_v,
            fuel_used=fuel,
            max_velocity=max(e.velocity.magnitude() for e in events) if events else 0,
            min_altitude=0
        )

    def _phase_to_dict(self, phase: PhaseSummary) -> dict:
        return {
            "phase": phase.phase.value,
            "start_time": phase.start_time,
            "end_time": phase.end_time,
            "duration": phase.duration,
            "delta_v_used": phase.delta_v_used,
            "fuel_used": phase.fuel_used,
            "max_velocity": phase.max_velocity,
            "events_count": len(phase.events),
            "events": [e.to_dict() for e in phase.events]
        }

    def _identify_critical_path(self) -> List[dict]:
        events = self.spacecraft.state.events
        critical_types = [
            EventType.BURN, EventType.WINDOW_ENTER, EventType.WINDOW_MISS,
            EventType.COLLISION_RISK, EventType.FUEL_DEPLETED, EventType.COLLISION
        ]
        return [e.to_dict() for e in events if e.event_type in critical_types]

    def _generate_fuel_analysis(self) -> dict:
        fuel_status = self.spacecraft.get_fuel_status()
        burn_records = self.spacecraft.state.burn_records

        return {
            **fuel_status,
            "burn_count": len(burn_records),
            "burns": [
                {
                    "time": b.time,
                    "delta_v": b.delta_v.magnitude(),
                    "fuel_used": b.fuel_used,
                    "fuel_before": b.fuel_before,
                    "fuel_after": b.fuel_after,
                    "reason": b.reason
                }
                for b in burn_records
            ],
            "efficiency": self._calculate_fuel_efficiency()
        }

    def _calculate_fuel_efficiency(self) -> dict:
        total_delta_v = self.spacecraft.state.total_delta_v
        total_fuel_used = self.spacecraft.initial_fuel - self.spacecraft.state.fuel_remaining

        if total_fuel_used == 0:
            return {"delta_v_per_fuel": 0, "rating": "N/A"}

        ratio = total_delta_v / total_fuel_used

        if ratio > 0.15:
            rating = "优秀"
        elif ratio > 0.1:
            rating = "良好"
        elif ratio > 0.05:
            rating = "一般"
        else:
            rating = "较差"

        return {
            "delta_v_per_fuel": ratio,
            "rating": rating,
            "description": "单位燃料获得的速度增量"
        }

    def _generate_window_analysis(self) -> dict:
        return self.detector.window_detector.get_window_summary()

    def _generate_collision_analysis(self) -> dict:
        collision_summary = self.detector.collision_detector.get_collision_summary()
        independence_check = self.detector.verify_window_collision_independence()

        return {
            **collision_summary,
            "independence_verification": independence_check
        }

    def _count_event_types(self, events: List[FlightEvent]) -> dict:
        counts = {}
        for event in events:
            key = event.event_type.value
            counts[key] = counts.get(key, 0) + 1
        return counts

    def _evaluate_success_criteria(self) -> dict:
        windows = self.detector.window_detector.get_window_summary()
        collisions = self.detector.collision_detector.get_collision_summary()
        fuel_status = self.spacecraft.get_fuel_status()

        return {
            "windows_captured": sum(1 for w in windows.values() if w["success"]),
            "total_windows": len(windows),
            "had_collision": collisions["had_collision"],
            "fuel_remaining_ratio": fuel_status["ratio_remaining"],
            "mission_success": False
        }

    def _analyze_causality(self) -> dict:
        events = self.spacecraft.state.events
        root_cause = "任务正常执行"
        factors = []
        critical_events = []
        outcome = "任务进行中"

        window_misses = [e for e in events if e.event_type == EventType.WINDOW_MISS]
        fuel_depleted = [e for e in events if e.event_type == EventType.FUEL_DEPLETED]
        collisions = [e for e in events if e.event_type == EventType.COLLISION]

        if collisions:
            root_cause = "发生碰撞事件"
            outcome = "任务失败 - 碰撞"
            critical_events = collisions
            factors.append("与行星发生物理碰撞")
        elif fuel_depleted:
            root_cause = "燃料耗尽"
            outcome = "任务受限 - 燃料不足"
            critical_events = fuel_depleted
            factors.append("燃料在关键机动前耗尽")
            if window_misses:
                factors.append("燃料不足导致无法进行轨道修正以捕获窗口")
        elif window_misses:
            root_cause = "时间窗口错过"
            outcome = "任务降级 - 窗口错过"
            critical_events = window_misses
            for miss in window_misses:
                factors.append(f"{miss.details.get('planet', '未知')}窗口: {miss.details.get('miss_reason', '原因未知')}")

        evidence = []
        for e in critical_events:
            evidence.append(f"t={e.time:.1f}: {e.event_type.value} - {e.details}")

        return {
            "root_cause": root_cause,
            "contributing_factors": factors,
            "outcome": outcome,
            "evidence": evidence
        }

    def _generate_score_breakdown(self) -> dict:
        base_score = 1000
        penalties = []
        deductions = 0

        windows = self.detector.window_detector.get_window_summary()
        for planet_name, status in windows.items():
            if status["missed"]:
                penalty = 200
                deductions += penalty
                penalties.append({
                    "item": f"窗口错过 - {planet_name}",
                    "penalty": penalty,
                    "reason": "未能在时间窗口内到达目标行星",
                    "related_to_orbit": "轨道推进不足或时机不对导致窗口错过"
                })

        collisions = self.detector.collision_detector.get_collision_summary()
        if collisions["had_collision"]:
            penalty = 500
            deductions += penalty
            penalties.append({
                "item": "碰撞事件",
                "penalty": penalty,
                "reason": "飞船与行星发生碰撞",
                "related_to_orbit": "轨道计算或机动执行错误导致碰撞"
            })

        if collisions["danger_count"] > 0:
            penalty = 50 * collisions["danger_count"]
            deductions += penalty
            penalties.append({
                "item": "碰撞危险警告",
                "penalty": penalty,
                "count": collisions["danger_count"],
                "reason": "多次接近危险距离",
                "related_to_orbit": "轨道精确度不足"
            })

        fuel_status = self.spacecraft.get_fuel_status()
        if fuel_status["depleted"]:
            penalty = 300
            deductions += penalty
            penalties.append({
                "item": "燃料耗尽",
                "penalty": penalty,
                "reason": "飞行过程中燃料完全耗尽",
                "related_to_orbit": "可能导致后续轨道机动无法执行"
            })

        final_score = max(0, base_score - deductions)

        return {
            "base_score": base_score,
            "total_penalties": deductions,
            "final_score": final_score,
            "penalty_details": penalties
        }

    def save_report(self, filename: str):
        report = self.generate_full_report()
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
