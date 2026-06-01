import numpy as np
from typing import Tuple, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class ChargeType(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


class DirectionReversalType(Enum):
    NONE = "none"
    E_FIELD = "electric_field"
    B_FIELD = "magnetic_field"
    BOTH = "both"


@dataclass
class PointCharge:
    id: str
    position: np.ndarray
    charge: float
    charge_type: ChargeType
    timestamp: float = 0.0

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)


@dataclass
class Coil:
    id: str
    center: np.ndarray
    normal: np.ndarray
    radius: float
    current: float
    turns: int = 1
    timestamp: float = 0.0

    def __post_init__(self):
        self.center = np.array(self.center, dtype=np.float64)
        self.normal = np.array(self.normal, dtype=np.float64)
        norm = np.linalg.norm(self.normal)
        if norm > 0:
            self.normal = self.normal / norm


@dataclass
class FieldSample:
    position: np.ndarray
    e_field: np.ndarray
    b_field: np.ndarray
    e_magnitude: float
    b_magnitude: float
    has_explosion: bool = False
    explosion_reason: Optional[str] = None

    def __post_init__(self):
        self.position = np.array(self.position, dtype=np.float64)
        self.e_field = np.array(self.e_field, dtype=np.float64)
        self.b_field = np.array(self.b_field, dtype=np.float64)


class ElectromagneticField:
    def __init__(self, epsilon0: float = 8.854e-12, mu0: float = 4 * np.pi * 1e-7):
        self.epsilon0 = epsilon0
        self.mu0 = mu0
        self.charges: List[PointCharge] = []
        self.coils: List[Coil] = []
        self.k_e = 1.0 / (4 * np.pi * epsilon0)
        self.k_b = mu0 / (4 * np.pi)

    def add_charge(self, charge: PointCharge) -> None:
        self.charges.append(charge)

    def add_coil(self, coil: Coil) -> None:
        self.coils.append(coil)

    def remove_charge(self, charge_id: str) -> bool:
        original_len = len(self.charges)
        self.charges = [c for c in self.charges if c.id != charge_id]
        return len(self.charges) < original_len

    def remove_coil(self, coil_id: str) -> bool:
        original_len = len(self.coils)
        self.coils = [c for c in self.coils if c.id != coil_id]
        return len(self.coils) < original_len

    def calculate_e_field(self, position: np.ndarray) -> Tuple[np.ndarray, float, bool, Optional[str]]:
        position = np.array(position, dtype=np.float64)
        e_total = np.zeros(3, dtype=np.float64)
        has_explosion = False
        explosion_reason = None

        for charge in self.charges:
            r = position - charge.position
            r_mag = np.linalg.norm(r)

            if r_mag < 1e-10:
                has_explosion = True
                explosion_reason = f"Position too close to charge {charge.id}"
                return np.full(3, np.inf), np.inf, has_explosion, explosion_reason

            e = self.k_e * charge.charge * r / (r_mag ** 3)
            e_total += e

        e_magnitude = np.linalg.norm(e_total)

        if np.isinf(e_magnitude) or e_magnitude > 1e20:
            has_explosion = True
            explosion_reason = "Electric field magnitude exceeds numerical limit"

        return e_total, e_magnitude, has_explosion, explosion_reason

    def calculate_b_field_from_charge(self, position: np.ndarray, charge: PointCharge, velocity: np.ndarray) -> np.ndarray:
        r = position - charge.position
        r_mag = np.linalg.norm(r)

        if r_mag < 1e-10:
            return np.zeros(3)

        b = self.k_b * charge.charge * np.cross(velocity, r) / (r_mag ** 3)
        return b

    def calculate_b_field_from_coil(self, position: np.ndarray, coil: Coil) -> Tuple[np.ndarray, float]:
        position = np.array(position, dtype=np.float64)
        r_vec = position - coil.center
        r_parallel = np.dot(r_vec, coil.normal) * coil.normal
        r_perp_vec = r_vec - r_parallel
        r_perp = np.linalg.norm(r_perp_vec)
        z = np.linalg.norm(r_parallel)

        a = coil.radius
        if a < 1e-10:
            return np.zeros(3), 0.0

        rho = r_perp
        if rho < 1e-10 and abs(z) < 1e-10:
            b_z = self.mu0 * coil.current * coil.turns / (2 * a)
            return coil.normal * b_z, b_z

        b_total = np.zeros(3, dtype=np.float64)
        num_segments = 100
        dtheta = 2 * np.pi / num_segments

        for i in range(num_segments):
            theta = i * dtheta
            tangent = np.array([-np.sin(theta), np.cos(theta), 0])
            if abs(coil.normal[2]) < 0.9:
                rot_axis = np.cross([0, 0, 1], coil.normal)
                rot_axis_norm = np.linalg.norm(rot_axis)
                if rot_axis_norm > 1e-10:
                    rot_axis = rot_axis / rot_axis_norm
                    rot_angle = np.arccos(coil.normal[2])
                    tangent = self._rotate_vector(tangent, rot_axis, rot_angle)

            segment_pos = coil.center + a * (
                np.cos(theta) * self._get_perpendicular1(coil.normal) +
                np.sin(theta) * self._get_perpendicular2(coil.normal)
            )

            dl = a * dtheta * tangent
            r_seg = position - segment_pos
            r_mag = np.linalg.norm(r_seg)

            if r_mag < 1e-10:
                continue

            db = self.k_b * coil.current * coil.turns * np.cross(dl, r_seg) / (r_mag ** 3)
            b_total += db

        b_magnitude = np.linalg.norm(b_total)
        return b_total, b_magnitude

    def _get_perpendicular1(self, normal: np.ndarray) -> np.ndarray:
        if abs(normal[0]) < abs(normal[1]) and abs(normal[0]) < abs(normal[2]):
            v = np.array([0, -normal[2], normal[1]])
        elif abs(normal[1]) < abs(normal[2]):
            v = np.array([-normal[2], 0, normal[0]])
        else:
            v = np.array([-normal[1], normal[0], 0])
        return v / np.linalg.norm(v)

    def _get_perpendicular2(self, normal: np.ndarray) -> np.ndarray:
        perp1 = self._get_perpendicular1(normal)
        return np.cross(normal, perp1)

    def _rotate_vector(self, vec: np.ndarray, axis: np.ndarray, angle: float) -> np.ndarray:
        cos_a = np.cos(angle)
        sin_a = np.sin(angle)
        return (
            vec * cos_a +
            np.cross(axis, vec) * sin_a +
            axis * np.dot(axis, vec) * (1 - cos_a)
        )

    def calculate_b_field(self, position: np.ndarray, moving_charges: Optional[List[Tuple[PointCharge, np.ndarray]]] = None) -> Tuple[np.ndarray, float, bool, Optional[str]]:
        position = np.array(position, dtype=np.float64)
        b_total = np.zeros(3, dtype=np.float64)
        has_explosion = False
        explosion_reason = None

        for coil in self.coils:
            b_coil, _ = self.calculate_b_field_from_coil(position, coil)
            b_total += b_coil

        if moving_charges:
            for charge, velocity in moving_charges:
                b_charge = self.calculate_b_field_from_charge(position, charge, velocity)
                b_total += b_charge

        b_magnitude = np.linalg.norm(b_total)

        if np.isinf(b_magnitude) or b_magnitude > 1e20:
            has_explosion = True
            explosion_reason = "Magnetic field magnitude exceeds numerical limit"

        return b_total, b_magnitude, has_explosion, explosion_reason

    def sample_field(self, position: np.ndarray, moving_charges: Optional[List[Tuple[PointCharge, np.ndarray]]] = None) -> FieldSample:
        e_field, e_mag, e_explode, e_reason = self.calculate_e_field(position)
        b_field, b_mag, b_explode, b_reason = self.calculate_b_field(position, moving_charges)

        has_explosion = e_explode or b_explode
        explosion_reason = e_reason if e_explode else (b_reason if b_explode else None)

        return FieldSample(
            position=position,
            e_field=e_field,
            b_field=b_field,
            e_magnitude=e_mag,
            b_magnitude=b_mag,
            has_explosion=has_explosion,
            explosion_reason=explosion_reason
        )

    def check_direction_reversal(self, pos1: np.ndarray, pos2: np.ndarray) -> Tuple[DirectionReversalType, dict]:
        sample1 = self.sample_field(pos1)
        sample2 = self.sample_field(pos2)

        e_dot = np.dot(sample1.e_field, sample2.e_field)
        b_dot = np.dot(sample1.b_field, sample2.b_field)

        e_reversed = e_dot < -1e-10
        b_reversed = b_dot < -1e-10

        if e_reversed and b_reversed:
            reversal_type = DirectionReversalType.BOTH
        elif e_reversed:
            reversal_type = DirectionReversalType.E_FIELD
        elif b_reversed:
            reversal_type = DirectionReversalType.B_FIELD
        else:
            reversal_type = DirectionReversalType.NONE

        details = {
            "e_dot_product": e_dot,
            "b_dot_product": b_dot,
            "e_reversed": e_reversed,
            "b_reversed": b_reversed,
            "pos1_sample": sample1,
            "pos2_sample": sample2
        }

        return reversal_type, details

    def get_config_snapshot(self) -> dict:
        return {
            "charges": [
                {
                    "id": c.id,
                    "position": c.position.tolist(),
                    "charge": c.charge,
                    "charge_type": c.charge_type.value,
                    "timestamp": c.timestamp
                }
                for c in self.charges
            ],
            "coils": [
                {
                    "id": c.id,
                    "center": c.center.tolist(),
                    "normal": c.normal.tolist(),
                    "radius": c.radius,
                    "current": c.current,
                    "turns": c.turns,
                    "timestamp": c.timestamp
                }
                for c in self.coils
            ],
            "constants": {
                "epsilon0": self.epsilon0,
                "mu0": self.mu0
            }
        }
