"""单位系统 - 处理单位换算，防止单位不一致导致的计算偏差"""

from typing import Dict, Optional, Tuple
from .models import Unit


class UnitConversionError(Exception):
    pass


class UnitSystem:
    def __init__(self):
        self._units: Dict[str, Unit] = {}
        self._init_standard_units()

    def _init_standard_units(self):
        length_units = [
            Unit("米", "m", "length", 1.0, "m"),
            Unit("千米", "km", "length", 1000.0, "m"),
            Unit("厘米", "cm", "length", 0.01, "m"),
            Unit("毫米", "mm", "length", 0.001, "m"),
            Unit("公里", "km", "length", 1000.0, "m"),
        ]

        weight_units = [
            Unit("千克", "kg", "weight", 1.0, "kg"),
            Unit("克", "g", "weight", 0.001, "kg"),
            Unit("吨", "t", "weight", 1000.0, "kg"),
            Unit("公斤", "kg", "weight", 1.0, "kg"),
            Unit("斤", "jin", "weight", 0.5, "kg"),
        ]

        currency_units = [
            Unit("元", "CNY", "currency", 1.0, "CNY"),
            Unit("万元", "wCNY", "currency", 10000.0, "CNY"),
            Unit("亿元", "eCNY", "currency", 100000000.0, "CNY"),
        ]

        quantity_units = [
            Unit("个", "pcs", "quantity", 1.0, "pcs"),
            Unit("件", "pcs", "quantity", 1.0, "pcs"),
            Unit("套", "set", "quantity", 1.0, "set"),
            Unit("箱", "box", "quantity", 1.0, "box"),
        ]

        rate_units = [
            Unit("百分比", "%", "rate", 1.0, "%"),
            Unit("小数", "decimal", "rate", 100.0, "%"),
        ]

        for u in length_units + weight_units + currency_units + quantity_units + rate_units:
            self._units[u.symbol] = u
            self._units[u.name] = u

    def convert(self, value: float, from_unit: str, to_unit: str) -> Tuple[float, Dict]:
        if from_unit == to_unit:
            return value, {
                "from_unit": from_unit,
                "to_unit": to_unit,
                "factor": 1.0,
                "original_value": value,
                "converted_value": value,
            }

        from_u = self._get_unit(from_unit)
        to_u = self._get_unit(to_unit)

        if from_u.dimension != to_u.dimension:
            raise UnitConversionError(
                f"无法将 {from_unit}({from_u.dimension}) 转换为 {to_unit}({to_u.dimension})，量纲不一致"
            )

        to_base = value * from_u.conversion_factor
        converted = to_base / to_u.conversion_factor

        return converted, {
            "from_unit": from_unit,
            "to_unit": to_unit,
            "dimension": from_u.dimension,
            "to_base_factor": from_u.conversion_factor,
            "from_base_factor": to_u.conversion_factor,
            "original_value": value,
            "converted_value": converted,
        }

    def _get_unit(self, unit_name: str) -> Unit:
        if unit_name not in self._units:
            raise UnitConversionError(f"未知单位: {unit_name}")
        return self._units[unit_name]

    def add_custom_unit(self, unit: Unit):
        self._units[unit.symbol] = unit
        self._units[unit.name] = unit

    def get_available_units(self, dimension: Optional[str] = None):
        if dimension:
            return {k: v for k, v in self._units.items() if v.dimension == dimension}
        return self._units
