from typing import Optional
from models import SizeUnit, DensityUnit, TimeUnit


class UnitConverter:
    SIZE_TO_METER = {
        SizeUnit.MM: 0.001,
        SizeUnit.UM: 1e-6,
        SizeUnit.NM: 1e-9,
        SizeUnit.M: 1.0
    }

    DENSITY_TO_KG_M3 = {
        DensityUnit.KG_M3: 1.0,
        DensityUnit.G_CM3: 1000.0
    }

    TIME_TO_SECOND = {
        TimeUnit.SECOND: 1.0,
        TimeUnit.MINUTE: 60.0,
        TimeUnit.HOUR: 3600.0
    }

    @classmethod
    def diameter_to_meters(cls, value: float, unit: Optional[SizeUnit]) -> float:
        if unit is None:
            raise ValueError("Size unit is required for conversion")
        factor = cls.SIZE_TO_METER.get(unit)
        if factor is None:
            raise ValueError(f"Unsupported size unit: {unit}")
        return value * factor

    @classmethod
    def density_to_kgm3(cls, value: float, unit: Optional[DensityUnit]) -> float:
        if unit is None:
            raise ValueError("Density unit is required for conversion")
        factor = cls.DENSITY_TO_KG_M3.get(unit)
        if factor is None:
            raise ValueError(f"Unsupported density unit: {unit}")
        return value * factor

    @classmethod
    def time_to_seconds(cls, value: float, unit: TimeUnit) -> float:
        factor = cls.TIME_TO_SECOND.get(unit)
        if factor is None:
            raise ValueError(f"Unsupported time unit: {unit}")
        return value * factor

    @classmethod
    def meters_to(cls, value_m: float, target_unit: SizeUnit) -> float:
        factor = cls.SIZE_TO_METER.get(target_unit)
        if factor is None:
            raise ValueError(f"Unsupported size unit: {target_unit}")
        return value_m / factor

    @classmethod
    def kgm3_to(cls, value_kgm3: float, target_unit: DensityUnit) -> float:
        factor = cls.DENSITY_TO_KG_M3.get(target_unit)
        if factor is None:
            raise ValueError(f"Unsupported density unit: {target_unit}")
        return value_kgm3 / factor

    @staticmethod
    def celsius_to_kelvin(celsius: float) -> float:
        return celsius + 273.15

    @staticmethod
    def dynamic_viscosity_water(temperature_celsius: float) -> float:
        t = temperature_celsius
        if t <= 20:
            return 1.002e-3
        elif t <= 25:
            return 0.890e-3
        elif t <= 30:
            return 0.798e-3
        elif t <= 40:
            return 0.653e-3
        elif t <= 50:
            return 0.547e-3
        else:
            A = 2.414e-5
            B = 247.8
            C = 140.0
            return A * 10 ** (B / (t + C))
