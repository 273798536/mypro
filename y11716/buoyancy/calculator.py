from typing import Dict, Any, Optional, List, Tuple
from .unit_converter import UnitConverter


class BuoyancyCalculator:
    GRAVITY = 9.8
    CRITICAL_THRESHOLD = 0.02

    @classmethod
    def calculate_object_density(cls, mass: float, mass_unit: str, volume: float, volume_unit: str) -> Optional[float]:
        std_mass = UnitConverter.to_standard_mass(mass, mass_unit)
        std_volume = UnitConverter.to_standard_volume(volume, volume_unit)
        if std_mass is None or std_volume is None or std_volume == 0:
            return None
        return std_mass / std_volume

    @classmethod
    def calculate_buoyant_force(cls, liquid_density: float, liquid_density_unit: str, volume: float, volume_unit: str) -> Optional[float]:
        std_density = UnitConverter.to_standard_density(liquid_density, liquid_density_unit)
        std_volume = UnitConverter.to_standard_volume(volume, volume_unit)
        if std_density is None or std_volume is None:
            return None
        volume_m3 = std_volume * 1e-6
        density_kgm3 = std_density * 1000
        return density_kgm3 * cls.GRAVITY * volume_m3

    @classmethod
    def calculate_weight(cls, mass: float, mass_unit: str) -> Optional[float]:
        std_mass = UnitConverter.to_standard_mass(mass, mass_unit)
        if std_mass is None:
            return None
        mass_kg = std_mass / 1000
        return mass_kg * cls.GRAVITY

    @classmethod
    def determine_state(cls, object_density: float, liquid_density: float, liquid_density_unit: str) -> Tuple[str, bool]:
        std_liquid_density = UnitConverter.to_standard_density(liquid_density, liquid_density_unit)
        if std_liquid_density is None:
            return "未知", False

        density_ratio = object_density / std_liquid_density
        diff = abs(object_density - std_liquid_density)
        relative_diff = diff / max(object_density, std_liquid_density)

        is_critical = relative_diff <= cls.CRITICAL_THRESHOLD

        if is_critical:
            return "悬浮", True
        elif object_density < std_liquid_density:
            if density_ratio < 0.9:
                return "漂浮", False
            else:
                return "漂浮/悬浮", True
        else:
            if density_ratio > 1.1:
                return "下沉", False
            else:
                return "下沉/悬浮", True

    @classmethod
    def check_state_consistency(cls, calculated_state: str, observed_state: str) -> Tuple[bool, str]:
        observed = observed_state.strip()

        if calculated_state == observed:
            return True, "记录与计算一致"

        if "/" in calculated_state and "/" in observed:
            calc_parts = set(calculated_state.split("/"))
            obs_parts = set(observed.split("/"))
            if calc_parts & obs_parts:
                return True, "边界情况，记录可接受"

        if "/" in calculated_state:
            calc_parts = set(calculated_state.split("/"))
            if observed in calc_parts:
                return True, "边界情况，记录可接受"

        if "/" in observed:
            obs_parts = set(observed.split("/"))
            if calculated_state in obs_parts:
                return True, "边界情况，记录可接受"

        state_hierarchy = {
            "漂浮": 1,
            "漂浮/悬浮": 2,
            "悬浮": 3,
            "下沉/悬浮": 4,
            "下沉": 5,
        }

        calc_level = state_hierarchy.get(calculated_state, 0)
        obs_level = state_hierarchy.get(observed, 0)

        if abs(calc_level - obs_level) <= 1:
            return True, "相邻状态，可能为测量误差"

        return False, f"记录状态 '{observed}' 与计算状态 '{calculated_state}' 明显不符"

    @classmethod
    def process_record(cls, record: Dict[str, Any]) -> Dict[str, Any]:
        result = {
            **record,
            "_calculations": {},
            "_status": "success",
        }

        try:
            mass = float(record["mass"])
            volume = float(record["volume"])
            liquid_density = float(record["liquid_density"])
        except (ValueError, TypeError, KeyError):
            result["_status"] = "error"
            result["_error_message"] = "数值转换失败"
            return result

        object_density = cls.calculate_object_density(
            mass, record["mass_unit"], volume, record["volume_unit"]
        )

        if object_density is None:
            result["_status"] = "error"
            result["_error_message"] = "物体密度计算失败"
            return result

        buoyant_force = cls.calculate_buoyant_force(
            liquid_density, record["liquid_density_unit"], volume, record["volume_unit"]
        )

        weight = cls.calculate_weight(mass, record["mass_unit"])

        calculated_state, is_critical = cls.determine_state(
            object_density, liquid_density, record["liquid_density_unit"]
        )

        is_consistent, consistency_message = cls.check_state_consistency(
            calculated_state, record["observed_state"]
        )

        std_liquid_density = UnitConverter.to_standard_density(
            liquid_density, record["liquid_density_unit"]
        )

        result["_calculations"] = {
            "object_density_g_cm3": round(object_density, 6),
            "liquid_density_g_cm3": round(std_liquid_density, 6) if std_liquid_density else None,
            "buoyant_force_N": round(buoyant_force, 6) if buoyant_force else None,
            "weight_N": round(weight, 6) if weight else None,
            "calculated_state": calculated_state,
            "is_critical_state": is_critical,
            "is_consistent": is_consistent,
            "consistency_message": consistency_message,
            "density_ratio": round(object_density / std_liquid_density, 6) if std_liquid_density else None,
        }

        if not is_consistent:
            result["_status"] = "warning"
            result["_warning_message"] = consistency_message

        return result

    @classmethod
    def process_batch(cls, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [cls.process_record(record) for record in records]
