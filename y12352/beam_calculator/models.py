from dataclasses import dataclass, field
from typing import List, Optional, Union
from enum import Enum
from .units import Quantity, Unit, UnitSystem


class LoadType(Enum):
    CONCENTRATED_FORCE = "concentrated_force"
    CONCENTRATED_MOMENT = "concentrated_moment"
    UNIFORM_DISTRIBUTED = "uniform_distributed"
    TRIANGULAR_DISTRIBUTED = "triangular_distributed"
    TRAPEZOIDAL_DISTRIBUTED = "trapezoidal_distributed"

    @classmethod
    def from_string(cls, s: str) -> "LoadType":
        s_lower = s.strip().lower()
        mapping = {
            "集中力": cls.CONCENTRATED_FORCE,
            "集中荷载": cls.CONCENTRATED_FORCE,
            "concentrated": cls.CONCENTRATED_FORCE,
            "concentrated_force": cls.CONCENTRATED_FORCE,
            "point": cls.CONCENTRATED_FORCE,
            "point_load": cls.CONCENTRATED_FORCE,
            "集中力偶": cls.CONCENTRATED_MOMENT,
            "集中弯矩": cls.CONCENTRATED_MOMENT,
            "moment": cls.CONCENTRATED_MOMENT,
            "concentrated_moment": cls.CONCENTRATED_MOMENT,
            "均布荷载": cls.UNIFORM_DISTRIBUTED,
            "uniform": cls.UNIFORM_DISTRIBUTED,
            "uniform_distributed": cls.UNIFORM_DISTRIBUTED,
            "udl": cls.UNIFORM_DISTRIBUTED,
            "三角分布": cls.TRIANGULAR_DISTRIBUTED,
            "三角形": cls.TRIANGULAR_DISTRIBUTED,
            "triangular": cls.TRIANGULAR_DISTRIBUTED,
            "triangular_distributed": cls.TRIANGULAR_DISTRIBUTED,
            "梯形分布": cls.TRAPEZOIDAL_DISTRIBUTED,
            "梯形": cls.TRAPEZOIDAL_DISTRIBUTED,
            "trapezoidal": cls.TRAPEZOIDAL_DISTRIBUTED,
            "trapezoidal_distributed": cls.TRAPEZOIDAL_DISTRIBUTED,
        }
        if s_lower in mapping:
            return mapping[s_lower]
        raise ValueError(f"无法识别的载荷类型: {s}")


class BoundaryCondition(Enum):
    PINNED = "pinned"
    ROLLER = "roller"
    FIXED = "fixed"
    FREE = "free"

    @classmethod
    def from_string(cls, s: str) -> "BoundaryCondition":
        s_lower = s.strip().lower()
        mapping = {
            "铰支": cls.PINNED,
            "铰支座": cls.PINNED,
            "pinned": cls.PINNED,
            "pin": cls.PINNED,
            "hinged": cls.PINNED,
            "滚动支座": cls.ROLLER,
            "辊轴": cls.ROLLER,
            "roller": cls.ROLLER,
            "固定": cls.FIXED,
            "固定端": cls.FIXED,
            "fixed": cls.FIXED,
            "clamped": cls.FIXED,
            "自由": cls.FREE,
            "free": cls.FREE,
        }
        if s_lower in mapping:
            return mapping[s_lower]
        raise ValueError(f"无法识别的边界条件: {s}")


@dataclass
class Load:
    load_type: LoadType
    magnitude: Quantity
    position: Optional[Quantity] = None
    start_position: Optional[Quantity] = None
    end_position: Optional[Quantity] = None
    magnitude_end: Optional[Quantity] = None
    direction: str = "downward"
    source: Optional[str] = None

    def validate(self, beam_length: Quantity) -> List[str]:
        errors = []

        if self.load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
            if self.position is None:
                errors.append(f"{self.load_type.value} 需要指定作用位置")
            else:
                pos_m = self.position.to_base().value
                length_m = beam_length.to_base().value
                if pos_m < 0 or pos_m > length_m:
                    errors.append(
                        f"载荷作用位置 {self.position} 超出梁范围 [0, {beam_length}]"
                    )

        elif self.load_type in [LoadType.UNIFORM_DISTRIBUTED,
                                 LoadType.TRIANGULAR_DISTRIBUTED,
                                 LoadType.TRAPEZOIDAL_DISTRIBUTED]:
            if self.start_position is None or self.end_position is None:
                errors.append(f"{self.load_type.value} 需要指定起止位置")
            else:
                start_m = self.start_position.to_base().value
                end_m = self.end_position.to_base().value
                length_m = beam_length.to_base().value
                if start_m < 0 or start_m > length_m:
                    errors.append(
                        f"分布载荷起始位置 {self.start_position} 超出梁范围"
                    )
                if end_m < 0 or end_m > length_m:
                    errors.append(
                        f"分布载荷结束位置 {self.end_position} 超出梁范围"
                    )
                if start_m >= end_m:
                    errors.append(
                        f"分布载荷起始位置 {self.start_position} 必须小于结束位置 {self.end_position}"
                    )

            if self.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
                if self.magnitude_end is None:
                    errors.append("梯形分布载荷需要指定结束位置的载荷集度")

        if self.magnitude.value == 0:
            errors.append("载荷大小不能为零")

        return errors

    def get_effective_force(self) -> Quantity:
        if self.load_type == LoadType.CONCENTRATED_FORCE:
            return self.magnitude
        elif self.load_type == LoadType.CONCENTRATED_MOMENT:
            return Quantity(0, self.magnitude.unit)
        elif self.load_type == LoadType.UNIFORM_DISTRIBUTED:
            length = self.end_position - self.start_position
            length_m = length.convert_to(Unit.M).value
            q_base = self.magnitude.convert_to(Unit.N_M).value
            return Quantity(q_base * length_m, Unit.N)
        elif self.load_type == LoadType.TRIANGULAR_DISTRIBUTED:
            length = self.end_position - self.start_position
            length_m = length.convert_to(Unit.M).value
            q_base = self.magnitude.convert_to(Unit.N_M).value
            return Quantity(0.5 * q_base * length_m, Unit.N)
        elif self.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
            length = self.end_position - self.start_position
            length_m = length.convert_to(Unit.M).value
            q1_base = self.magnitude.convert_to(Unit.N_M).value
            q2_base = self.magnitude_end.convert_to(Unit.N_M).value
            return Quantity(0.5 * (q1_base + q2_base) * length_m, Unit.N)
        return Quantity(0, Unit.N)

    def get_centroid_position(self) -> Quantity:
        if self.load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
            return self.position
        elif self.load_type == LoadType.UNIFORM_DISTRIBUTED:
            return (self.start_position + self.end_position) / 2
        elif self.load_type == LoadType.TRIANGULAR_DISTRIBUTED:
            a = self.start_position
            b = self.end_position
            return Quantity(
                a.value + (2/3) * (b.value - a.value),
                a.unit
            )
        elif self.load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
            a = self.start_position
            b = self.end_position
            q1 = self.magnitude.value
            q2 = self.magnitude_end.value
            if q1 + q2 == 0:
                return (a + b) / 2
            centroid = a.value + (b.value - a.value) * (q1 + 2*q2) / (3*(q1 + q2))
            return Quantity(centroid, a.unit)
        return self.position


@dataclass
class BeamSection:
    width: Optional[Quantity] = None
    height: Optional[Quantity] = None
    area: Optional[Quantity] = None
    moment_of_inertia: Optional[Quantity] = None
    section_modulus: Optional[Quantity] = None
    name: str = "default"


@dataclass
class Material:
    elastic_modulus: Optional[Quantity] = None
    poissons_ratio: Optional[float] = None
    yield_strength: Optional[Quantity] = None
    name: str = "default"


@dataclass
class Beam:
    length: Quantity
    left_support: BoundaryCondition = BoundaryCondition.PINNED
    right_support: BoundaryCondition = BoundaryCondition.ROLLER
    loads: List[Load] = field(default_factory=list)
    section: Optional[BeamSection] = None
    material: Optional[Material] = None
    name: str = "default"
    notes: List[str] = field(default_factory=list)
    source: Optional[str] = None

    def validate(self) -> List[str]:
        errors = []

        if self.length.value <= 0:
            errors.append(f"梁长度必须为正，当前值: {self.length}")

        if self.left_support not in [BoundaryCondition.PINNED, BoundaryCondition.FIXED, BoundaryCondition.ROLLER]:
            errors.append(f"左支座类型 {self.left_support} 不适合简支梁")

        if self.right_support not in [BoundaryCondition.ROLLER, BoundaryCondition.PINNED, BoundaryCondition.FIXED]:
            errors.append(f"右支座类型 {self.right_support} 不适合简支梁")

        if not (self.left_support == BoundaryCondition.PINNED and
                self.right_support == BoundaryCondition.ROLLER):
            errors.append(
                f"注意: 当前边界条件 ({self.left_support.value}, {self.right_support.value}) "
                f"非标准简支梁 (铰支+滚动支座)"
            )

        for i, load in enumerate(self.loads):
            load_errors = load.validate(self.length)
            for err in load_errors:
                errors.append(f"载荷 #{i+1}: {err}")

        return errors

    def add_load(self, load: Load) -> None:
        self.loads.append(load)

    def clear_loads(self) -> None:
        self.loads.clear()

    def to_unit_system(self, unit_system: UnitSystem) -> "Beam":
        new_beam = Beam(
            length=unit_system.convert(self.length, self.length.unit.category),
            left_support=self.left_support,
            right_support=self.right_support,
            loads=[],
            name=self.name,
            notes=list(self.notes),
            source=self.source,
        )

        for load in self.loads:
            new_load = Load(
                load_type=load.load_type,
                magnitude=unit_system.convert(load.magnitude, load.magnitude.unit.category),
                direction=load.direction,
                source=load.source,
            )
            if load.position is not None:
                new_load.position = unit_system.convert(load.position, load.position.unit.category)
            if load.start_position is not None:
                new_load.start_position = unit_system.convert(load.start_position, load.start_position.unit.category)
            if load.end_position is not None:
                new_load.end_position = unit_system.convert(load.end_position, load.end_position.unit.category)
            if load.magnitude_end is not None:
                new_load.magnitude_end = unit_system.convert(load.magnitude_end, load.magnitude_end.unit.category)
            new_beam.add_load(new_load)

        if self.section is not None:
            new_section = BeamSection(
                width=unit_system.convert(self.section.width, self.section.width.unit.category) if self.section.width else None,
                height=unit_system.convert(self.section.height, self.section.height.unit.category) if self.section.height else None,
                area=unit_system.convert(self.section.area, self.section.area.unit.category) if self.section.area else None,
                moment_of_inertia=self.section.moment_of_inertia,
                section_modulus=self.section.section_modulus,
                name=self.section.name,
            )
            new_beam.section = new_section

        if self.material is not None:
            new_material = Material(
                elastic_modulus=unit_system.convert(self.material.elastic_modulus, self.material.elastic_modulus.unit.category) if self.material.elastic_modulus else None,
                poissons_ratio=self.material.poissons_ratio,
                yield_strength=unit_system.convert(self.material.yield_strength, self.material.yield_strength.unit.category) if self.material.yield_strength else None,
                name=self.material.name,
            )
            new_beam.material = new_material

        return new_beam
