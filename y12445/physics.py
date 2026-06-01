import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
from enum import Enum


class Vector2:
    def __init__(self, x: float = 0.0, y: float = 0.0):
        self.x = x
        self.y = y

    def __add__(self, other: 'Vector2') -> 'Vector2':
        return Vector2(self.x + other.x, self.y + other.y)

    def __sub__(self, other: 'Vector2') -> 'Vector2':
        return Vector2(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> 'Vector2':
        return Vector2(self.x * scalar, self.y * scalar)

    def magnitude(self) -> float:
        return math.sqrt(self.x * self.x + self.y * self.y)

    def normalize(self) -> 'Vector2':
        mag = self.magnitude()
        if mag == 0:
            return Vector2(0, 0)
        return Vector2(self.x / mag, self.y / mag)

    def dot(self, other: 'Vector2') -> float:
        return self.x * other.x + self.y * other.y

    def distance_to(self, other: 'Vector2') -> float:
        return (other - self).magnitude()

    def angle(self) -> float:
        return math.atan2(self.y, self.x)

    def __repr__(self) -> str:
        return f"Vector2({self.x:.2f}, {self.y:.2f})"


@dataclass
class Planet:
    name: str
    position: Vector2
    mass: float
    radius: float
    color: str = "blue"
    gravitational_parameter: float = field(init=False)

    def __post_init__(self):
        self.gravitational_parameter = 6.67430e-11 * self.mass


@dataclass
class TimeWindow:
    planet_name: str
    start_time: float
    end_time: float
    description: str
    required_approach_distance: float


class EventType(Enum):
    LAUNCH = "launch"
    BURN = "burn"
    GRAVITY_ASSIST = "gravity_assist"
    WINDOW_ENTER = "window_enter"
    WINDOW_EXIT = "window_exit"
    WINDOW_MISS = "window_miss"
    COLLISION_RISK = "collision_risk"
    COLLISION = "collision"
    FUEL_DEPLETED = "fuel_depleted"
    ARRIVAL = "arrival"
    ORBIT_INSERTION = "orbit_insertion"


@dataclass
class FlightEvent:
    time: float
    event_type: EventType
    position: Vector2
    velocity: Vector2
    fuel_remaining: float
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "time": self.time,
            "event_type": self.event_type.value,
            "position": {"x": self.position.x, "y": self.position.y},
            "velocity": {"x": self.velocity.x, "y": self.velocity.y},
            "fuel_remaining": self.fuel_remaining,
            "details": self.details
        }


class GravitySimulator:
    def __init__(self, dt: float = 1.0):
        self.dt = dt
        self.g_constant = 6.67430e-11

    def calculate_gravity(self, position: Vector2, planets: List[Planet],
                          exclude_planet: Optional[str] = None) -> Vector2:
        total_force = Vector2(0, 0)
        for planet in planets:
            if exclude_planet and planet.name == exclude_planet:
                continue
            direction = planet.position - position
            distance = direction.magnitude()
            if distance < planet.radius:
                distance = planet.radius
            force_magnitude = self.g_constant * planet.mass / (distance * distance)
            force = direction.normalize() * force_magnitude
            total_force = total_force + force
        return total_force

    def step(self, position: Vector2, velocity: Vector2,
             planets: List[Planet]) -> Tuple[Vector2, Vector2]:
        acceleration = self.calculate_gravity(position, planets)
        new_velocity = velocity + acceleration * self.dt
        new_position = position + new_velocity * self.dt
        return new_position, new_velocity

    def calculate_orbital_velocity(self, planet: Planet, altitude: float) -> float:
        radius = planet.radius + altitude
        return math.sqrt(self.g_constant * planet.mass / radius)
