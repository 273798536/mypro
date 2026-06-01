from dataclasses import dataclass, field
from typing import List, Optional
from physics import Vector2, FlightEvent, EventType, GravitySimulator, Planet, TimeWindow
import math


@dataclass
class BurnRecord:
    time: float
    delta_v: Vector2
    fuel_used: float
    fuel_before: float
    fuel_after: float
    reason: str


@dataclass
class SpacecraftState:
    time: float
    position: Vector2
    velocity: Vector2
    fuel_remaining: float
    events: List[FlightEvent] = field(default_factory=list)
    burn_records: List[BurnRecord] = field(default_factory=list)
    total_delta_v: float = 0.0


class Spacecraft:
    def __init__(self, initial_fuel: float = 1000.0, fuel_efficiency: float = 0.1):
        self.initial_fuel = initial_fuel
        self.fuel_efficiency = fuel_efficiency
        self.state = SpacecraftState(
            time=0.0,
            position=Vector2(0, 0),
            velocity=Vector2(0, 0),
            fuel_remaining=initial_fuel
        )
        self.fuel_depleted = False

    def set_initial_state(self, position: Vector2, velocity: Vector2, time: float = 0.0):
        self.state = SpacecraftState(
            time=time,
            position=position,
            velocity=velocity,
            fuel_remaining=self.initial_fuel
        )
        self.fuel_depleted = False
        self._add_event(EventType.LAUNCH, position, velocity, self.initial_fuel, {
            "initial_position": {"x": position.x, "y": position.y},
            "initial_velocity": {"x": velocity.x, "y": velocity.y}
        })

    def burn(self, delta_v: Vector2, reason: str = "maneuver") -> bool:
        if self.fuel_depleted:
            return False

        fuel_required = delta_v.magnitude() / self.fuel_efficiency
        fuel_before = self.state.fuel_remaining

        if fuel_required > self.state.fuel_remaining:
            actual_fuel = self.state.fuel_remaining
            actual_delta_v = delta_v * (actual_fuel / fuel_required) if fuel_required > 0 else Vector2(0, 0)

            self.state.velocity = self.state.velocity + actual_delta_v
            self.state.total_delta_v += actual_delta_v.magnitude()
            self.state.fuel_remaining = 0.0
            self.fuel_depleted = True

            self._add_burn_record(self.state.time, actual_delta_v, actual_fuel, fuel_before, 0.0, reason + " (partial - fuel depleted)")
            self._add_event(EventType.FUEL_DEPLETED, self.state.position, self.state.velocity, 0.0, {
                "maneuver": reason,
                "planned_delta_v": delta_v.magnitude(),
                "achieved_delta_v": actual_delta_v.magnitude(),
                "fuel_shortage": fuel_required - actual_fuel
            })
            return False
        else:
            self.state.velocity = self.state.velocity + delta_v
            self.state.total_delta_v += delta_v.magnitude()
            self.state.fuel_remaining -= fuel_required

            self._add_burn_record(self.state.time, delta_v, fuel_required, fuel_before, self.state.fuel_remaining, reason)
            self._add_event(EventType.BURN, self.state.position, self.state.velocity, self.state.fuel_remaining, {
                "maneuver": reason,
                "delta_v": delta_v.magnitude(),
                "fuel_used": fuel_required,
                "remaining_fuel_ratio": self.state.fuel_remaining / self.initial_fuel
            })
            return True

    def _add_event(self, event_type: EventType, position: Vector2, velocity: Vector2,
                   fuel: float, details: dict):
        event = FlightEvent(
            time=self.state.time,
            event_type=event_type,
            position=Vector2(position.x, position.y),
            velocity=Vector2(velocity.x, velocity.y),
            fuel_remaining=fuel,
            details=details
        )
        self.state.events.append(event)

    def _add_burn_record(self, time: float, delta_v: Vector2, fuel_used: float,
                         fuel_before: float, fuel_after: float, reason: str):
        record = BurnRecord(
            time=time,
            delta_v=Vector2(delta_v.x, delta_v.y),
            fuel_used=fuel_used,
            fuel_before=fuel_before,
            fuel_after=fuel_after,
            reason=reason
        )
        self.state.burn_records.append(record)

    def get_fuel_status(self) -> dict:
        return {
            "initial": self.initial_fuel,
            "remaining": self.state.fuel_remaining,
            "used": self.initial_fuel - self.state.fuel_remaining,
            "ratio_remaining": self.state.fuel_remaining / self.initial_fuel,
            "depleted": self.fuel_depleted
        }

    def predict_fuel_for_burn(self, delta_v_magnitude: float) -> dict:
        fuel_required = delta_v_magnitude / self.fuel_efficiency
        return {
            "fuel_required": fuel_required,
            "fuel_available": self.state.fuel_remaining,
            "sufficient": fuel_required <= self.state.fuel_remaining,
            "shortfall": max(0, fuel_required - self.state.fuel_remaining)
        }


@dataclass
class ManeuverOption:
    name: str
    description: str
    delta_v: Vector2
    fuel_cost: float
    benefit: str
    risk: str
    priority_score: float


class ManeuverPlanner:
    def __init__(self, spacecraft: Spacecraft, simulator: GravitySimulator):
        self.spacecraft = spacecraft
        self.simulator = simulator

    def analyze_current_options(self, planets: List[Planet],
                                windows: List[TimeWindow]) -> List[ManeuverOption]:
        options = []
        state = self.spacecraft.state

        for planet in planets:
            to_planet = planet.position - state.position
            distance = to_planet.magnitude()

            if distance < planet.radius * 10:
                orbital_v = self.simulator.calculate_orbital_velocity(planet, distance - planet.radius)
                current_relative_v = (state.velocity - Vector2(0, 0)).magnitude()

                insertion_burn = to_planet.normalize() * (orbital_v - current_relative_v) * 0.1
                fuel_pred = self.spacecraft.predict_fuel_for_burn(insertion_burn.magnitude())

                options.append(ManeuverOption(
                    name=f"轨道插入 - {planet.name}",
                    description=f"进入{planet.name}轨道，需要减速",
                    delta_v=insertion_burn,
                    fuel_cost=fuel_pred["fuel_required"],
                    benefit=f"成功进入{planet.name}轨道，完成任务目标",
                    risk="燃料不足可能导致坠毁或错过窗口",
                    priority_score=0.9 if fuel_pred["sufficient"] else 0.3
                ))

        for window in windows:
            if window.start_time <= state.time <= window.end_time:
                target_planet = next((p for p in planets if p.name == window.planet_name), None)
                if target_planet:
                    to_window = target_planet.position - state.position
                    approach_burn = to_window.normalize() * 500

                    fuel_pred = self.spacecraft.predict_fuel_for_burn(approach_burn.magnitude())

                    options.append(ManeuverOption(
                        name=f"窗口捕获 - {window.description}",
                        description=f"在时间窗口内接近{window.planet_name}",
                        delta_v=approach_burn,
                        fuel_cost=fuel_pred["fuel_required"],
                        benefit="利用时间窗口获得最佳引力弹弓效果",
                        risk="错过窗口将大幅增加后续燃料消耗",
                        priority_score=0.8 if fuel_pred["sufficient"] else 0.4
                    ))

        if self.spacecraft.fuel_depleted:
            options.append(ManeuverOption(
                name="漂流模式",
                description="燃料耗尽，只能依靠引力继续飞行",
                delta_v=Vector2(0, 0),
                fuel_cost=0,
                benefit="无燃料消耗，听天由命",
                risk="可能无法到达目标或错过所有窗口",
                priority_score=0.1
            ))

        return sorted(options, key=lambda x: x.priority_score, reverse=True)
