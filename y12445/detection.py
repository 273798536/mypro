from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from physics import Vector2, Planet, TimeWindow, EventType, FlightEvent
from spacecraft import Spacecraft
import math


class CollisionSeverity(Enum):
    SAFE = "safe"
    WARNING = "warning"
    DANGER = "danger"
    COLLISION = "collision"


@dataclass
class WindowStatus:
    window: TimeWindow
    entered: bool = False
    exited: bool = False
    missed: bool = False
    enter_time: Optional[float] = None
    exit_time: Optional[float] = None
    closest_approach: Optional[float] = None
    closest_approach_time: Optional[float] = None
    approach_distances: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class CollisionRecord:
    time: float
    planet_name: str
    distance: float
    severity: CollisionSeverity
    position: Vector2
    velocity: Vector2
    details: dict


@dataclass
class DetectionState:
    window_statuses: Dict[str, WindowStatus] = field(default_factory=dict)
    collision_records: List[CollisionRecord] = field(default_factory=list)
    active_warnings: List[str] = field(default_factory=list)
    last_check_time: float = 0.0


class WindowDetector:
    def __init__(self, windows: List[TimeWindow]):
        self.windows = windows
        self.state = DetectionState()
        for window in windows:
            self.state.window_statuses[window.planet_name] = WindowStatus(window=window)

    def check_window(self, planet: Planet, spacecraft_pos: Vector2,
                     current_time: float) -> Optional[FlightEvent]:
        status = self.state.window_statuses.get(planet.name)
        if not status:
            return None

        window = status.window
        distance = planet.position.distance_to(spacecraft_pos)
        status.approach_distances.append((current_time, distance))

        if status.closest_approach is None or distance < status.closest_approach:
            status.closest_approach = distance
            status.closest_approach_time = current_time

        in_time_window = window.start_time <= current_time <= window.end_time
        in_approach_range = distance <= window.required_approach_distance * 1.5

        if in_time_window and in_approach_range and not status.entered:
            status.entered = True
            status.enter_time = current_time
            return FlightEvent(
                time=current_time,
                event_type=EventType.WINDOW_ENTER,
                position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                velocity=Vector2(0, 0),
                fuel_remaining=0,
                details={
                    "planet": planet.name,
                    "window": window.description,
                    "distance": distance,
                    "required_distance": window.required_approach_distance,
                    "time_in_window": current_time - window.start_time
                }
            )

        elif status.entered and not status.exited:
            if not in_time_window or distance > window.required_approach_distance * 3:
                status.exited = True
                status.exit_time = current_time
                return FlightEvent(
                    time=current_time,
                    event_type=EventType.WINDOW_EXIT,
                    position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                    velocity=Vector2(0, 0),
                    fuel_remaining=0,
                    details={
                        "planet": planet.name,
                        "window": window.description,
                        "exit_reason": "time" if not in_time_window else "distance",
                        "duration_in_window": current_time - (status.enter_time or current_time),
                        "closest_approach": status.closest_approach
                    }
                )

        elif current_time > window.end_time and not status.entered and not status.missed:
            status.missed = True
            return FlightEvent(
                time=current_time,
                event_type=EventType.WINDOW_MISS,
                position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                velocity=Vector2(0, 0),
                fuel_remaining=0,
                details={
                    "planet": planet.name,
                    "window": window.description,
                    "closest_approach": status.closest_approach,
                    "closest_approach_time": status.closest_approach_time,
                    "required_distance": window.required_approach_distance,
                    "distance_at_window_end": distance,
                    "miss_reason": self._analyze_miss_reason(status, distance)
                }
            )

        return None

    def _analyze_miss_reason(self, status: WindowStatus, final_distance: float) -> str:
        window = status.window
        reasons = []

        if status.closest_approach and status.closest_approach > window.required_approach_distance * 2:
            reasons.append("轨道偏离过大，未能进入有效范围")
        elif status.closest_approach_time:
            if status.closest_approach_time < window.start_time:
                reasons.append("到达时机过早，最近点在窗口开始前")
            elif status.closest_approach_time > window.end_time:
                reasons.append("到达时机过晚，最近点在窗口结束后")

        if not reasons:
            reasons.append("轨迹与目标行星未发生有效交会")

        return "; ".join(reasons)

    def get_window_summary(self) -> dict:
        summary = {}
        for planet_name, status in self.state.window_statuses.items():
            summary[planet_name] = {
                "window_description": status.window.description,
                "entered": status.entered,
                "exited": status.exited,
                "missed": status.missed,
                "enter_time": status.enter_time,
                "exit_time": status.exit_time,
                "closest_approach": status.closest_approach,
                "closest_approach_time": status.closest_approach_time,
                "success": status.entered and not status.missed
            }
        return summary


class CollisionDetector:
    def __init__(self, warning_multiplier: float = 3.0, danger_multiplier: float = 1.5):
        self.warning_multiplier = warning_multiplier
        self.danger_multiplier = danger_multiplier
        self.state = DetectionState()
        self._last_warning_time: Dict[str, float] = {}

    def check_collision(self, planet: Planet, spacecraft_pos: Vector2,
                        spacecraft_vel: Vector2, current_time: float,
                        fuel_remaining: float) -> Tuple[Optional[FlightEvent], Optional[CollisionRecord]]:
        distance = spacecraft_pos.distance_to(planet.position)
        min_safe_distance = planet.radius * 2

        event = None
        record = None

        if distance < planet.radius:
            severity = CollisionSeverity.COLLISION
            event = FlightEvent(
                time=current_time,
                event_type=EventType.COLLISION,
                position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                velocity=Vector2(spacecraft_vel.x, spacecraft_vel.y),
                fuel_remaining=fuel_remaining,
                details={
                    "planet": planet.name,
                    "distance": distance,
                    "planet_radius": planet.radius,
                    "impact_velocity": spacecraft_vel.magnitude()
                }
            )
        elif distance < min_safe_distance * self.danger_multiplier:
            severity = CollisionSeverity.DANGER
            if self._should_emit_warning(planet.name, current_time, "danger"):
                event = FlightEvent(
                    time=current_time,
                    event_type=EventType.COLLISION_RISK,
                    position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                    velocity=Vector2(spacecraft_vel.x, spacecraft_vel.y),
                    fuel_remaining=fuel_remaining,
                    details={
                        "planet": planet.name,
                        "distance": distance,
                        "severity": "danger",
                        "safe_distance": min_safe_distance,
                        "warning": f"距离{planet.name}过近！有碰撞风险"
                    }
                )
        elif distance < min_safe_distance * self.warning_multiplier:
            severity = CollisionSeverity.WARNING
            if self._should_emit_warning(planet.name, current_time, "warning"):
                event = FlightEvent(
                    time=current_time,
                    event_type=EventType.COLLISION_RISK,
                    position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
                    velocity=Vector2(spacecraft_vel.x, spacecraft_vel.y),
                    fuel_remaining=fuel_remaining,
                    details={
                        "planet": planet.name,
                        "distance": distance,
                        "severity": "warning",
                        "safe_distance": min_safe_distance,
                        "warning": f"接近{planet.name}，注意轨道调整"
                    }
                )
        else:
            severity = CollisionSeverity.SAFE

        record = CollisionRecord(
            time=current_time,
            planet_name=planet.name,
            distance=distance,
            severity=severity,
            position=Vector2(spacecraft_pos.x, spacecraft_pos.y),
            velocity=Vector2(spacecraft_vel.x, spacecraft_vel.y),
            details={"min_safe_distance": min_safe_distance}
        )
        self.state.collision_records.append(record)

        return event, record

    def _should_emit_warning(self, planet_name: str, current_time: float, level: str) -> bool:
        key = f"{planet_name}_{level}"
        last_time = self._last_warning_time.get(key, -1000)
        if current_time - last_time > 50:
            self._last_warning_time[key] = current_time
            return True
        return False

    def get_collision_summary(self) -> dict:
        summary = {
            "total_checks": len(self.state.collision_records),
            "collision_count": 0,
            "danger_count": 0,
            "warning_count": 0,
            "safe_count": 0,
            "closest_approach": {},
            "had_collision": False
        }

        for record in self.state.collision_records:
            if record.severity == CollisionSeverity.COLLISION:
                summary["collision_count"] += 1
                summary["had_collision"] = True
            elif record.severity == CollisionSeverity.DANGER:
                summary["danger_count"] += 1
            elif record.severity == CollisionSeverity.WARNING:
                summary["warning_count"] += 1
            else:
                summary["safe_count"] += 1

            planet = record.planet_name
            if planet not in summary["closest_approach"] or record.distance < summary["closest_approach"][planet]:
                summary["closest_approach"][planet] = record.distance

        return summary


class IntegratedDetector:
    def __init__(self, windows: List[TimeWindow]):
        self.window_detector = WindowDetector(windows)
        self.collision_detector = CollisionDetector()
        self.events: List[FlightEvent] = []

    def update(self, planets: List[Planet], spacecraft: Spacecraft) -> List[FlightEvent]:
        new_events = []
        state = spacecraft.state

        for planet in planets:
            window_event = self.window_detector.check_window(
                planet, state.position, state.time
            )
            if window_event:
                window_event.fuel_remaining = state.fuel_remaining
                window_event.velocity = Vector2(state.velocity.x, state.velocity.y)
                new_events.append(window_event)

            collision_event, _ = self.collision_detector.check_collision(
                planet, state.position, state.velocity, state.time, state.fuel_remaining
            )
            if collision_event:
                new_events.append(collision_event)

        self.events.extend(new_events)
        return new_events

    def get_combined_status(self) -> dict:
        return {
            "windows": self.window_detector.get_window_summary(),
            "collisions": self.collision_detector.get_collision_summary()
        }

    def verify_window_collision_independence(self) -> dict:
        verification = {
            "independent_events": True,
            "merged_events_detected": [],
            "details": []
        }

        window_miss_events = [e for e in self.events if e.event_type == EventType.WINDOW_MISS]
        collision_events = [e for e in self.events if e.event_type in [EventType.COLLISION, EventType.COLLISION_RISK]]

        for w_event in window_miss_events:
            w_time = w_event.time
            w_planet = w_event.details.get("planet", "")

            related_collisions = [
                c for c in collision_events
                if abs(c.time - w_time) < 100 and c.details.get("planet", "") == w_planet
            ]

            if related_collisions:
                verification["merged_events_detected"].append({
                    "window_miss_time": w_time,
                    "planet": w_planet,
                    "collision_events_nearby": len(related_collisions),
                    "details": "窗口错过与碰撞事件时间接近，需确认是否为独立事件"
                })

        verification["independent_events"] = len(verification["merged_events_detected"]) == 0
        return verification
