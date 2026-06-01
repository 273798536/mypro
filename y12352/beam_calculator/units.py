from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple, Union
from enum import Enum


class UnitCategory(Enum):
    LENGTH = "length"
    FORCE = "force"
    MOMENT = "moment"
    PRESSURE = "pressure"
    DISTRIBUTED_LOAD = "distributed_load"
    ANGLE = "angle"
    MOMENT_OF_INERTIA = "moment_of_inertia"
    SECTION_MODULUS = "section_modulus"


class Unit(Enum):
    M = ("m", UnitCategory.LENGTH, 1.0)
    CM = ("cm", UnitCategory.LENGTH, 0.01)
    MM = ("mm", UnitCategory.LENGTH, 0.001)
    IN = ("in", UnitCategory.LENGTH, 0.0254)
    FT = ("ft", UnitCategory.LENGTH, 0.3048)

    N = ("N", UnitCategory.FORCE, 1.0)
    KN = ("kN", UnitCategory.FORCE, 1000.0)
    MN = ("MN", UnitCategory.FORCE, 1_000_000.0)
    KGF = ("kgf", UnitCategory.FORCE, 9.80665)
    LBF = ("lbf", UnitCategory.FORCE, 4.44822)

    NM = ("N·m", UnitCategory.MOMENT, 1.0)
    KNM = ("kN·m", UnitCategory.MOMENT, 1000.0)
    KGFM = ("kgf·m", UnitCategory.MOMENT, 9.80665)

    PA = ("Pa", UnitCategory.PRESSURE, 1.0)
    MPA = ("MPa", UnitCategory.PRESSURE, 1_000_000.0)
    GPA = ("GPa", UnitCategory.PRESSURE, 1_000_000_000.0)

    N_M = ("N/m", UnitCategory.DISTRIBUTED_LOAD, 1.0)
    KN_M = ("kN/m", UnitCategory.DISTRIBUTED_LOAD, 1000.0)
    N_MM = ("N/mm", UnitCategory.DISTRIBUTED_LOAD, 1000.0)

    DEG = ("°", UnitCategory.ANGLE, 1.0)
    RAD = ("rad", UnitCategory.ANGLE, 57.295779513)

    M4 = ("m^4", UnitCategory.MOMENT_OF_INERTIA, 1.0)
    CM4 = ("cm^4", UnitCategory.MOMENT_OF_INERTIA, 1e-8)
    MM4 = ("mm^4", UnitCategory.MOMENT_OF_INERTIA, 1e-12)

    M3 = ("m^3", UnitCategory.SECTION_MODULUS, 1.0)
    CM3 = ("cm^3", UnitCategory.SECTION_MODULUS, 1e-6)
    MM3 = ("mm^3", UnitCategory.SECTION_MODULUS, 1e-9)

    def __init__(self, symbol: str, category: UnitCategory, to_base: float):
        self.symbol = symbol
        self.category = category
        self.to_base = to_base

    @classmethod
    def from_string(cls, s: str) -> "Unit":
        s_lower = s.strip().lower()
        for unit in cls:
            if unit.symbol.lower() == s_lower or unit.name.lower() == s_lower:
                return unit
        mapping = {
            "米": cls.M, "公尺": cls.M,
            "厘米": cls.CM, "公分": cls.CM,
            "毫米": cls.MM, "公厘": cls.MM,
            "英寸": cls.IN, "寸": cls.IN,
            "英尺": cls.FT, "呎": cls.FT,
            "牛顿": cls.N, "牛": cls.N,
            "千牛": cls.KN,
            "兆牛": cls.MN,
            "千克力": cls.KGF, "公斤力": cls.KGF,
            "磅力": cls.LBF,
            "牛米": cls.NM, "牛顿米": cls.NM,
            "千牛米": cls.KNM,
            "帕": cls.PA, "帕斯卡": cls.PA,
            "兆帕": cls.MPA,
            "吉帕": cls.GPA,
            "牛每米": cls.N_M, "n/m": cls.N_M,
            "千牛每米": cls.KN_M, "kn/m": cls.KN_M,
            "牛每毫米": cls.N_MM, "n/mm": cls.N_MM,
            "度": cls.DEG,
            "弧度": cls.RAD,
            "m^4": cls.M4, "m4": cls.M4, "米^4": cls.M4,
            "cm^4": cls.CM4, "cm4": cls.CM4, "厘米^4": cls.CM4,
            "mm^4": cls.MM4, "mm4": cls.MM4, "毫米^4": cls.MM4,
            "m^3": cls.M3, "m3": cls.M3, "米^3": cls.M3,
            "cm^3": cls.CM3, "cm3": cls.CM3, "厘米^3": cls.CM3,
            "mm^3": cls.MM3, "mm3": cls.MM3, "毫米^3": cls.MM3,
        }
        if s_lower in mapping:
            return mapping[s_lower]
        raise ValueError(f"无法识别的单位: {s}")


@dataclass
class Quantity:
    value: float
    unit: Unit

    def convert_to(self, target_unit: Unit) -> "Quantity":
        if self.unit.category != target_unit.category:
            raise ValueError(
                f"单位类别不匹配: 不能将 {self.unit.category.value} 转换为 {target_unit.category.value}"
            )
        base_value = self.value * self.unit.to_base
        target_value = base_value / target_unit.to_base
        return Quantity(target_value, target_unit)

    def to_base(self) -> "Quantity":
        base_units = {
            UnitCategory.LENGTH: Unit.M,
            UnitCategory.FORCE: Unit.N,
            UnitCategory.MOMENT: Unit.NM,
            UnitCategory.PRESSURE: Unit.PA,
            UnitCategory.DISTRIBUTED_LOAD: Unit.N_M,
            UnitCategory.ANGLE: Unit.DEG,
            UnitCategory.MOMENT_OF_INERTIA: Unit.M4,
            UnitCategory.SECTION_MODULUS: Unit.M3,
        }
        return self.convert_to(base_units[self.unit.category])

    def __add__(self, other: "Quantity") -> "Quantity":
        if not isinstance(other, Quantity):
            return NotImplemented
        other_base = other.convert_to(self.unit)
        return Quantity(self.value + other_base.value, self.unit)

    def __sub__(self, other: "Quantity") -> "Quantity":
        if not isinstance(other, Quantity):
            return NotImplemented
        other_base = other.convert_to(self.unit)
        return Quantity(self.value - other_base.value, self.unit)

    def __mul__(self, scalar: float) -> "Quantity":
        return Quantity(self.value * scalar, self.unit)

    def __truediv__(self, scalar: float) -> "Quantity":
        return Quantity(self.value / scalar, self.unit)

    def __neg__(self) -> "Quantity":
        return Quantity(-self.value, self.unit)

    def __abs__(self) -> "Quantity":
        return Quantity(abs(self.value), self.unit)

    def __lt__(self, other: Union["Quantity", float]) -> bool:
        if isinstance(other, Quantity):
            other_base = other.convert_to(self.unit)
            return self.value < other_base.value
        return self.value < other

    def __gt__(self, other: Union["Quantity", float]) -> bool:
        if isinstance(other, Quantity):
            other_base = other.convert_to(self.unit)
            return self.value > other_base.value
        return self.value > other

    def __le__(self, other: Union["Quantity", float]) -> bool:
        return not self.__gt__(other)

    def __ge__(self, other: Union["Quantity", float]) -> bool:
        return not self.__lt__(other)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Quantity):
            return NotImplemented
        other_base = other.convert_to(self.unit)
        return abs(self.value - other_base.value) < 1e-9

    def __repr__(self) -> str:
        return f"{self.value:.6g} {self.unit.symbol}"

    def __str__(self) -> str:
        return f"{self.value:.4g} {self.unit.symbol}"


@dataclass
class UnitSystem:
    length_unit: Unit = Unit.M
    force_unit: Unit = Unit.N
    moment_unit: Unit = Unit.NM
    pressure_unit: Unit = Unit.PA
    distributed_load_unit: Unit = Unit.N_M
    moment_of_inertia_unit: Unit = Unit.M4
    section_modulus_unit: Unit = Unit.M3

    @classmethod
    def metric(cls) -> "UnitSystem":
        return cls(
            length_unit=Unit.M,
            force_unit=Unit.N,
            moment_unit=Unit.NM,
            pressure_unit=Unit.PA,
            distributed_load_unit=Unit.N_M,
            moment_of_inertia_unit=Unit.M4,
            section_modulus_unit=Unit.M3,
        )

    @classmethod
    def metric_engineering(cls) -> "UnitSystem":
        return cls(
            length_unit=Unit.M,
            force_unit=Unit.KN,
            moment_unit=Unit.KNM,
            pressure_unit=Unit.MPA,
            distributed_load_unit=Unit.KN_M,
            moment_of_inertia_unit=Unit.M4,
            section_modulus_unit=Unit.M3,
        )

    def convert(self, quantity: Quantity, category: UnitCategory) -> Quantity:
        target_unit = {
            UnitCategory.LENGTH: self.length_unit,
            UnitCategory.FORCE: self.force_unit,
            UnitCategory.MOMENT: self.moment_unit,
            UnitCategory.PRESSURE: self.pressure_unit,
            UnitCategory.DISTRIBUTED_LOAD: self.distributed_load_unit,
            UnitCategory.MOMENT_OF_INERTIA: self.moment_of_inertia_unit,
            UnitCategory.SECTION_MODULUS: self.section_modulus_unit,
        }[category]
        return quantity.convert_to(target_unit)

    def check_consistency(self, quantities: Dict[str, Quantity]) -> Tuple[bool, Dict[str, Unit]]:
        mismatches = {}
        for name, qty in quantities.items():
            category = qty.unit.category
            target_unit = {
                UnitCategory.LENGTH: self.length_unit,
                UnitCategory.FORCE: self.force_unit,
                UnitCategory.MOMENT: self.moment_unit,
                UnitCategory.PRESSURE: self.pressure_unit,
                UnitCategory.DISTRIBUTED_LOAD: self.distributed_load_unit,
                UnitCategory.MOMENT_OF_INERTIA: self.moment_of_inertia_unit,
                UnitCategory.SECTION_MODULUS: self.section_modulus_unit,
            }.get(category)
            if target_unit and qty.unit != target_unit:
                mismatches[name] = target_unit
        return (len(mismatches) == 0, mismatches)
