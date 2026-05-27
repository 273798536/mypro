from typing import Optional, Tuple


class UnitConverter:
    MASS_UNITS = {
        "g": 1.0,
        "kg": 1000.0,
        "mg": 0.001,
        "t": 1e6,
    }

    VOLUME_UNITS = {
        "cm³": 1.0,
        "m³": 1e6,
        "ml": 1.0,
        "l": 1000.0,
        "dm³": 1000.0,
    }

    DENSITY_UNITS = {
        "g/cm³": 1.0,
        "kg/m³": 0.001,
        "g/ml": 1.0,
        "kg/l": 1.0,
    }

    @classmethod
    def normalize_unit(cls, unit: str) -> str:
        if not unit:
            return ""
        return unit.strip().lower().replace("^3", "³").replace("^3", "³")

    @classmethod
    def is_valid_mass_unit(cls, unit: str) -> bool:
        return cls.normalize_unit(unit) in cls.MASS_UNITS

    @classmethod
    def is_valid_volume_unit(cls, unit: str) -> bool:
        return cls.normalize_unit(unit) in cls.VOLUME_UNITS

    @classmethod
    def is_valid_density_unit(cls, unit: str) -> bool:
        return cls.normalize_unit(unit) in cls.DENSITY_UNITS

    @classmethod
    def to_standard_mass(cls, value: float, unit: str) -> Optional[float]:
        norm_unit = cls.normalize_unit(unit)
        if norm_unit not in cls.MASS_UNITS:
            return None
        return value * cls.MASS_UNITS[norm_unit]

    @classmethod
    def to_standard_volume(cls, value: float, unit: str) -> Optional[float]:
        norm_unit = cls.normalize_unit(unit)
        if norm_unit not in cls.VOLUME_UNITS:
            return None
        return value * cls.VOLUME_UNITS[norm_unit]

    @classmethod
    def to_standard_density(cls, value: float, unit: str) -> Optional[float]:
        norm_unit = cls.normalize_unit(unit)
        if norm_unit not in cls.DENSITY_UNITS:
            return None
        return value * cls.DENSITY_UNITS[norm_unit]

    @classmethod
    def convert_mass(cls, value: float, from_unit: str, to_unit: str) -> Optional[float]:
        norm_from = cls.normalize_unit(from_unit)
        norm_to = cls.normalize_unit(to_unit)
        if norm_from not in cls.MASS_UNITS or norm_to not in cls.MASS_UNITS:
            return None
        return value * cls.MASS_UNITS[norm_from] / cls.MASS_UNITS[norm_to]

    @classmethod
    def convert_volume(cls, value: float, from_unit: str, to_unit: str) -> Optional[float]:
        norm_from = cls.normalize_unit(from_unit)
        norm_to = cls.normalize_unit(to_unit)
        if norm_from not in cls.VOLUME_UNITS or norm_to not in cls.VOLUME_UNITS:
            return None
        return value * cls.VOLUME_UNITS[norm_from] / cls.VOLUME_UNITS[norm_to]

    @classmethod
    def convert_density(cls, value: float, from_unit: str, to_unit: str) -> Optional[float]:
        norm_from = cls.normalize_unit(from_unit)
        norm_to = cls.normalize_unit(to_unit)
        if norm_from not in cls.DENSITY_UNITS or norm_to not in cls.DENSITY_UNITS:
            return None
        return value * cls.DENSITY_UNITS[norm_from] / cls.DENSITY_UNITS[norm_to]

    @classmethod
    def get_available_mass_units(cls) -> Tuple[str, ...]:
        return tuple(cls.MASS_UNITS.keys())

    @classmethod
    def get_available_volume_units(cls) -> Tuple[str, ...]:
        return tuple(cls.VOLUME_UNITS.keys())

    @classmethod
    def get_available_density_units(cls) -> Tuple[str, ...]:
        return tuple(cls.DENSITY_UNITS.keys())
