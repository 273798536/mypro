import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from core.electromagnetic import ElectromagneticField, FieldSample


class BoundaryCondition(Enum):
    REFLECT = "reflect"
    ABSORB = "absorb"
    PERIODIC = "periodic"
    NONE = "none"


class ParticleStatus(Enum):
    NORMAL = "normal"
    OUT_OF_BOUNDS = "out_of_bounds"
    DIRECTION_REVERSED = "direction_reversed"
    FIELD_EXPLOSION = "field_explosion"
    NUMERICAL_ERROR = "numerical_error"
    MASS_MISSING = "mass_missing"
    CHARGE_MISSING = "charge_missing"


class ReversalSource(Enum):
    E_FIELD = "electric_field"
    B_FIELD = "magnetic_field"
    ACCELERATION = "acceleration"
    NUMERICAL = "numerical"
    UNKNOWN = "unknown"


@dataclass
class DirectionReversalEvent:
    timestamp: float
    step_index: int
    position: np.ndarray
    velocity_before: np.ndarray
    velocity_after: np.ndarray
    acceleration: np.ndarray
    reversal_source: ReversalSource
    e_field_sample: Optional[FieldSample] = None
    b_field_sample: Optional[FieldSample] = None
    dot_product: float = 0.0

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)
        self.velocity_before = np.array(self.velocity_before, dtype=np.float64)
        self.velocity_after = np.array(self.velocity_after, dtype=np.float64)
        self.acceleration = np.array(self.acceleration, dtype=np.float64)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "step_index": self.step_index,
            "position": self.position.tolist(),
            "velocity_before": self.velocity_before.tolist(),
            "velocity_after": self.velocity_after.tolist(),
            "acceleration": self.acceleration.tolist(),
            "reversal_source": self.reversal_source.value,
            "dot_product": self.dot_product,
            "e_field_sample": {
                "position": self.e_field_sample.position.tolist(),
                "e_field": self.e_field_sample.e_field.tolist(),
                "e_magnitude": self.e_field_sample.e_magnitude,
                "has_explosion": self.e_field_sample.has_explosion
            } if self.e_field_sample else None,
            "b_field_sample": {
                "position": self.b_field_sample.position.tolist(),
                "b_field": self.b_field_sample.b_field.tolist(),
                "b_magnitude": self.b_field_sample.b_magnitude,
                "has_explosion": self.b_field_sample.has_explosion
            } if self.b_field_sample else None
        }


@dataclass
class OutOfBoundsEvent:
    timestamp: float
    step_index: int
    position: np.ndarray
    velocity: np.ndarray
    boundary_normal: np.ndarray
    boundary_position: float
    boundary_axis: str

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)
        self.velocity = np.array(self.velocity, dtype=np.float64)
        self.boundary_normal = np.array(self.boundary_normal, dtype=np.float64)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "step_index": self.step_index,
            "position": self.position.tolist(),
            "velocity": self.velocity.tolist(),
            "boundary_normal": self.boundary_normal.tolist(),
            "boundary_position": self.boundary_position,
            "boundary_axis": self.boundary_axis
        }


@dataclass
class Particle:
    id: str
    position: np.ndarray
    velocity: np.ndarray
    charge: Optional[float] = None
    mass: Optional[float] = None
    name: str = ""
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)
        self.velocity = np.array(self.velocity, dtype=np.float64)

    def validate(self) -> Tuple[bool, List[str]]:
        errors = []
        if self.mass is None:
            errors.append("mass_missing")
        if self.charge is None:
            errors.append("charge_missing")
        return len(errors) == 0, errors

    def get_validation_hints(self) -> Dict[str, List[str]]:
        hints = {}
        if self.mass is None:
            hints["mass"] = [
                "请补充粒子质量，单位为千克(kg)",
                "常见粒子质量: 电子=9.11e-31 kg, 质子=1.67e-27 kg",
                "可使用 set_mass() 方法设置质量"
            ]
        if self.charge is None:
            hints["charge"] = [
                "请补充粒子电荷量，单位为库仑(C)",
                "常见粒子电荷: 电子=-1.60e-19 C, 质子=1.60e-19 C",
                "可使用 set_charge() 方法设置电荷"
            ]
        return hints

    def set_mass(self, mass: float) -> None:
        self.mass = mass

    def set_charge(self, charge: float) -> None:
        self.charge = charge


@dataclass
class SimulationConfig:
    time_step: float = 1e-9
    total_time: float = 1e-6
    boundary_min: np.ndarray = field(default_factory=lambda: np.array([-1.0, -1.0, -1.0]))
    boundary_max: np.ndarray = field(default_factory=lambda: np.array([1.0, 1.0, 1.0]))
    boundary_condition: BoundaryCondition = BoundaryCondition.ABSORB
    save_interval: int = 1
    reversal_detection_threshold: float = 1e-10

    def __post_init__(self):
        self.boundary_min = np.array(self.boundary_min, dtype=np.float64)
        self.boundary_max = np.array(self.boundary_max, dtype=np.float64)


@dataclass
class SimulationFrame:
    step_index: int
    timestamp: float
    position: np.ndarray
    velocity: np.ndarray
    acceleration: np.ndarray
    e_field: np.ndarray
    b_field: np.ndarray
    e_magnitude: float
    b_magnitude: float
    lorentz_force: np.ndarray
    status: ParticleStatus
    field_has_explosion: bool = False
    explosion_reason: Optional[str] = None

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)
        self.velocity = np.array(self.velocity, dtype=np.float64)
        self.acceleration = np.array(self.acceleration, dtype=np.float64)
        self.e_field = np.array(self.e_field, dtype=np.float64)
        self.b_field = np.array(self.b_field, dtype=np.float64)
        self.lorentz_force = np.array(self.lorentz_force, dtype=np.float64)


class ParticleSimulator:
    def __init__(self, em_field: ElectromagneticField, config: SimulationConfig):
        self.em_field = em_field
        self.config = config
        self.particles: List[Particle] = []
        self.frames: Dict[str, List[SimulationFrame]] = {}
        self.direction_reversals: Dict[str, List[DirectionReversalEvent]] = {}
        self.out_of_bounds_events: Dict[str, List[OutOfBoundsEvent]] = {}
        self.current_step = 0
        self.current_time = 0.0

    def add_particle(self, particle: Particle) -> None:
        self.particles.append(particle)
        self.frames[particle.id] = []
        self.direction_reversals[particle.id] = []
        self.out_of_bounds_events[particle.id] = []

    def remove_particle(self, particle_id: str) -> bool:
        original_len = len(self.particles)
        self.particles = [p for p in self.particles if p.id != particle_id]
        if particle_id in self.frames:
            del self.frames[particle_id]
        if particle_id in self.direction_reversals:
            del self.direction_reversals[particle_id]
        if particle_id in self.out_of_bounds_events:
            del self.out_of_bounds_events[particle_id]
        return len(self.particles) < original_len

    def _check_boundary(self, particle: Particle, new_pos: np.ndarray, new_vel: np.ndarray) -> Tuple[np.ndarray, np.ndarray, ParticleStatus, Optional[OutOfBoundsEvent]]:
        status = ParticleStatus.NORMAL
        oob_event = None

        for axis in range(3):
            axis_name = ['x', 'y', 'z'][axis]
            if new_pos[axis] < self.config.boundary_min[axis]:
                status = ParticleStatus.OUT_OF_BOUNDS
                normal = np.zeros(3)
                normal[axis] = -1.0
                oob_event = OutOfBoundsEvent(
                    timestamp=self.current_time,
                    step_index=self.current_step,
                    position=new_pos.copy(),
                    velocity=new_vel.copy(),
                    boundary_normal=normal,
                    boundary_position=self.config.boundary_min[axis],
                    boundary_axis=axis_name
                )
                break
            elif new_pos[axis] > self.config.boundary_max[axis]:
                status = ParticleStatus.OUT_OF_BOUNDS
                normal = np.zeros(3)
                normal[axis] = 1.0
                oob_event = OutOfBoundsEvent(
                    timestamp=self.current_time,
                    step_index=self.current_step,
                    position=new_pos.copy(),
                    velocity=new_vel.copy(),
                    boundary_normal=normal,
                    boundary_position=self.config.boundary_max[axis],
                    boundary_axis=axis_name
                )
                break

        return new_pos, new_vel, status, oob_event

    def _detect_direction_reversal(self, particle: Particle, old_vel: np.ndarray, new_vel: np.ndarray,
                                    acceleration: np.ndarray, field_sample: FieldSample) -> Optional[DirectionReversalEvent]:
        vel_dot = np.dot(old_vel, new_vel)
        vel_mag_old = np.linalg.norm(old_vel)
        vel_mag_new = np.linalg.norm(new_vel)

        if vel_mag_old < self.config.reversal_detection_threshold or vel_mag_new < self.config.reversal_detection_threshold:
            return None

        if vel_dot < -self.config.reversal_detection_threshold:
            reversal_source = ReversalSource.UNKNOWN

            e_dot = np.dot(old_vel, field_sample.e_field)
            if e_dot < -self.config.reversal_detection_threshold and np.linalg.norm(field_sample.e_field) > 0:
                reversal_source = ReversalSource.E_FIELD

            b_cross = np.cross(old_vel, field_sample.b_field)
            b_dot = np.dot(old_vel, b_cross)
            if abs(b_dot) > self.config.reversal_detection_threshold and np.linalg.norm(field_sample.b_field) > 0:
                reversal_source = ReversalSource.B_FIELD

            a_dot = np.dot(old_vel, acceleration)
            if a_dot < -self.config.reversal_detection_threshold and reversal_source == ReversalSource.UNKNOWN:
                reversal_source = ReversalSource.ACCELERATION

            return DirectionReversalEvent(
                timestamp=self.current_time,
                step_index=self.current_step,
                position=particle.position.copy(),
                velocity_before=old_vel.copy(),
                velocity_after=new_vel.copy(),
                acceleration=acceleration.copy(),
                reversal_source=reversal_source,
                e_field_sample=field_sample,
                b_field_sample=field_sample,
                dot_product=vel_dot
            )

        return None

    def _step_particle(self, particle: Particle) -> Tuple[SimulationFrame, Optional[DirectionReversalEvent], Optional[OutOfBoundsEvent]]:
        old_vel = particle.velocity.copy()
        old_pos = particle.position.copy()

        field_sample = self.em_field.sample_field(particle.position)

        if field_sample.has_explosion:
            frame = SimulationFrame(
                step_index=self.current_step,
                timestamp=self.current_time,
                position=particle.position.copy(),
                velocity=particle.velocity.copy(),
                acceleration=np.zeros(3),
                e_field=field_sample.e_field,
                b_field=field_sample.b_field,
                e_magnitude=field_sample.e_magnitude,
                b_magnitude=field_sample.b_magnitude,
                lorentz_force=np.zeros(3),
                status=ParticleStatus.FIELD_EXPLOSION,
                field_has_explosion=True,
                explosion_reason=field_sample.explosion_reason
            )
            return frame, None, None

        lorentz_force = np.zeros(3)
        acceleration = np.zeros(3)

        if particle.charge is not None:
            lorentz_force = particle.charge * (field_sample.e_field + np.cross(particle.velocity, field_sample.b_field))

        if particle.mass is not None and particle.mass > 0:
            acceleration = lorentz_force / particle.mass

        new_vel = particle.velocity + acceleration * self.config.time_step
        new_pos = particle.position + particle.velocity * self.config.time_step + 0.5 * acceleration * self.config.time_step ** 2

        new_pos, new_vel, boundary_status, oob_event = self._check_boundary(particle, new_pos, new_vel)

        reversal_event = self._detect_direction_reversal(
            particle, old_vel, new_vel, acceleration, field_sample
        )

        particle.position = new_pos
        particle.velocity = new_vel

        status = boundary_status if boundary_status != ParticleStatus.NORMAL else ParticleStatus.NORMAL
        if reversal_event is not None and status == ParticleStatus.NORMAL:
            status = ParticleStatus.DIRECTION_REVERSED

        frame = SimulationFrame(
            step_index=self.current_step,
            timestamp=self.current_time,
            position=new_pos.copy(),
            velocity=new_vel.copy(),
            acceleration=acceleration,
            e_field=field_sample.e_field,
            b_field=field_sample.b_field,
            e_magnitude=field_sample.e_magnitude,
            b_magnitude=field_sample.b_magnitude,
            lorentz_force=lorentz_force,
            status=status,
            field_has_explosion=field_sample.has_explosion,
            explosion_reason=field_sample.explosion_reason
        )

        return frame, reversal_event, oob_event

    def run_step(self) -> Dict[str, Tuple[SimulationFrame, Optional[DirectionReversalEvent], Optional[OutOfBoundsEvent]]]:
        results = {}

        for particle in self.particles:
            is_valid, validation_errors = particle.validate()

            if not is_valid:
                frame = SimulationFrame(
                    step_index=self.current_step,
                    timestamp=self.current_time,
                    position=particle.position.copy(),
                    velocity=particle.velocity.copy(),
                    acceleration=np.zeros(3),
                    e_field=np.zeros(3),
                    b_field=np.zeros(3),
                    e_magnitude=0.0,
                    b_magnitude=0.0,
                    lorentz_force=np.zeros(3),
                    status=ParticleStatus.MASS_MISSING if "mass_missing" in validation_errors else ParticleStatus.CHARGE_MISSING
                )
                results[particle.id] = (frame, None, None)
                continue

            frame, reversal_event, oob_event = self._step_particle(particle)
            results[particle.id] = (frame, reversal_event, oob_event)

            if self.current_step % self.config.save_interval == 0:
                self.frames[particle.id].append(frame)
                if reversal_event:
                    self.direction_reversals[particle.id].append(reversal_event)
                if oob_event:
                    self.out_of_bounds_events[particle.id].append(oob_event)

        self.current_time += self.config.time_step
        self.current_step += 1

        return results

    def run_simulation(self) -> Dict[str, List[SimulationFrame]]:
        num_steps = int(self.config.total_time / self.config.time_step)

        for _ in range(num_steps):
            self.run_step()

        return self.frames

    def get_particle_trajectory(self, particle_id: str) -> Optional[np.ndarray]:
        if particle_id not in self.frames:
            return None
        positions = [frame.position for frame in self.frames[particle_id]]
        return np.array(positions)

    def get_reversal_events(self, particle_id: str) -> List[DirectionReversalEvent]:
        return self.direction_reversals.get(particle_id, [])

    def get_out_of_bounds_events(self, particle_id: str) -> List[OutOfBoundsEvent]:
        return self.out_of_bounds_events.get(particle_id, [])

    def get_all_reversals(self) -> Dict[str, List[DirectionReversalEvent]]:
        return self.direction_reversals

    def get_all_out_of_bounds(self) -> Dict[str, List[OutOfBoundsEvent]]:
        return self.out_of_bounds_events

    def has_error_merging(self) -> Dict[str, Dict[str, Any]]:
        results = {}
        for particle in self.particles:
            particle_id = particle.id
            reversals = self.get_reversal_events(particle_id)
            oobs = self.get_out_of_bounds_events(particle_id)

            reversal_steps = set(r.step_index for r in reversals)
            oob_steps = set(o.step_index for o in oobs)

            merged_reversal = len(reversal_steps) > len(set(r.timestamp for r in reversals))
            merged_oob = len(oob_steps) > len(set(o.timestamp for o in oobs))
            overlap = len(reversal_steps.intersection(oob_steps)) > 0

            results[particle_id] = {
                "reversal_events_merged": merged_reversal,
                "out_of_bounds_merged": merged_oob,
                "reversal_oob_overlap": overlap,
                "num_reversals": len(reversals),
                "num_out_of_bounds": len(oobs),
                "overlap_steps": list(reversal_steps.intersection(oob_steps))
            }

        return results

    def get_simulation_snapshot(self) -> dict:
        return {
            "current_step": self.current_step,
            "current_time": self.current_time,
            "config": {
                "time_step": self.config.time_step,
                "total_time": self.config.total_time,
                "boundary_min": self.config.boundary_min.tolist(),
                "boundary_max": self.config.boundary_max.tolist(),
                "boundary_condition": self.config.boundary_condition.value
            },
            "particles": [
                {
                    "id": p.id,
                    "name": p.name,
                    "position": p.position.tolist(),
                    "velocity": p.velocity.tolist(),
                    "charge": p.charge,
                    "mass": p.mass
                }
                for p in self.particles
            ],
            "em_field": self.em_field.get_config_snapshot()
        }
