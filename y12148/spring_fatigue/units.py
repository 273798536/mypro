"""单位校验与转换模块"""

from typing import Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class UnitError:
    parameter: str
    expected_unit: str
    actual_unit: str
    record_id: Optional[str] = None
    message: str = ""


class UnitValidator:
    FORCE_UNITS = {"N", "kN", "lbf", "kgf"}
    LENGTH_UNITS = {"mm", "cm", "m", "in"}
    STRESS_UNITS = {"MPa", "GPa", "Pa", "psi", "ksi"}
    
    def __init__(self):
        self.errors: list[UnitError] = []
    
    def validate_force(self, value: float, unit: str, parameter: str, record_id: Optional[str] = None) -> bool:
        if unit not in self.FORCE_UNITS:
            self.errors.append(UnitError(
                parameter=parameter,
                expected_unit="N/kN/lbf/kgf",
                actual_unit=unit,
                record_id=record_id,
                message=f"力单位错误: {parameter} 使用了 '{unit}', 应为力单位"
            ))
            return False
        return True
    
    def validate_length(self, value: float, unit: str, parameter: str, record_id: Optional[str] = None) -> bool:
        if unit not in self.LENGTH_UNITS:
            self.errors.append(UnitError(
                parameter=parameter,
                expected_unit="mm/cm/m/in",
                actual_unit=unit,
                record_id=record_id,
                message=f"长度单位错误: {parameter} 使用了 '{unit}', 应为长度单位"
            ))
            return False
        return True
    
    def validate_stress(self, value: float, unit: str, parameter: str, record_id: Optional[str] = None) -> bool:
        if unit not in self.STRESS_UNITS:
            self.errors.append(UnitError(
                parameter=parameter,
                expected_unit="MPa/GPa/Pa/psi/ksi",
                actual_unit=unit,
                record_id=record_id,
                message=f"应力单位错误: {parameter} 使用了 '{unit}', 应为应力单位"
            ))
            return False
        return True
    
    def to_mpa(self, value: float, unit: str) -> float:
        conversions = {
            "MPa": 1.0,
            "GPa": 1000.0,
            "Pa": 1e-6,
            "psi": 0.00689476,
            "ksi": 6.89476
        }
        return value * conversions.get(unit, 1.0)
    
    def to_n(self, value: float, unit: str) -> float:
        conversions = {
            "N": 1.0,
            "kN": 1000.0,
            "lbf": 4.44822,
            "kgf": 9.80665
        }
        return value * conversions.get(unit, 1.0)
    
    def to_mm(self, value: float, unit: str) -> float:
        conversions = {
            "mm": 1.0,
            "cm": 10.0,
            "m": 1000.0,
            "in": 25.4
        }
        return value * conversions.get(unit, 1.0)
    
    def has_errors(self) -> bool:
        return len(self.errors) > 0
    
    def get_error_summary(self) -> str:
        if not self.errors:
            return "无单位错误"
        return "\n".join([f"- [{e.record_id or '未知记录'}] {e.message}" for e in self.errors])
