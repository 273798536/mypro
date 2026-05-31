from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
import numpy as np

from config import EnergyCalculationParams, MaterialParams
from data_models import FlywheelDataRecord, CalculationResult, MaterialParameterRecord


@dataclass
class EnergyBreakdown:
    kinetic_energy_j: float
    stored_energy_kwh: float
    power_output_kw: float
    max_stress_mpa: float
    safety_factor: float
    tip_speed_m_s: float


class EnergyCalculator:
    def __init__(self, params: EnergyCalculationParams = None):
        self.params = params or EnergyCalculationParams()

    def calculate_kinetic_energy(self, speed_rpm: float) -> float:
        omega = (speed_rpm * 2 * np.pi) / 60
        ke = 0.5 * self.params.moment_of_inertia_kg_m2 * omega ** 2
        return ke

    def j_to_kwh(self, energy_j: float) -> float:
        return energy_j / (3.6 * 10**6)

    def calculate_stored_energy(self, speed_rpm: float) -> Tuple[float, float]:
        ke = self.calculate_kinetic_energy(speed_rpm)
        effective_ke = ke * self.params.efficiency
        kwh = self.j_to_kwh(effective_ke)
        return ke, kwh

    def calculate_centrifugal_stress(self, speed_rpm: float, radius_m: float, 
                                     density_kg_m3: float) -> float:
        omega = (speed_rpm * 2 * np.pi) / 60
        stress = density_kg_m3 * omega ** 2 * radius_m ** 2
        return stress / (10**6)

    def calculate_tip_speed(self, speed_rpm: float, radius_m: float) -> float:
        omega = (speed_rpm * 2 * np.pi) / 60
        return omega * radius_m

    def calculate_safety_factor(self, stress_mpa: float, tensile_strength_mpa: float) -> float:
        if stress_mpa <= 0:
            return float('inf')
        return tensile_strength_mpa / stress_mpa

    def calculate_record_energy(self, record: FlywheelDataRecord, 
                                material_params: Optional[MaterialParameterRecord] = None,
                                radius_m: float = 0.5) -> CalculationResult:
        result = CalculationResult(record_id=record.record_id)
        
        if not record.time_series_data:
            result.errors.append("无时间序列数据")
            result.boundary_check_passed = False
            return result

        speeds = [p.speed_rpm for p in record.time_series_data]
        max_speed = max(speeds)
        avg_speed = sum(speeds) / len(speeds)

        ke, kwh = self.calculate_stored_energy(max_speed)
        result.kinetic_energy_j = ke
        result.stored_energy_kwh = kwh

        if material_params:
            result.material_params_version = material_params.param_id
            stress = self.calculate_centrifugal_stress(
                max_speed, radius_m, material_params.density_kg_m3
            )
            result.max_stress_mpa = stress
            result.safety_factor = self.calculate_safety_factor(
                stress, material_params.tensile_strength_mpa
            )
            
            if result.safety_factor < 1.5:
                result.warnings.append(f"安全系数较低: {result.safety_factor:.2f} (建议 >= 1.5)")
            
            if result.safety_factor < 1.0:
                result.errors.append(f"安全系数不足: {result.safety_factor:.2f}")
                result.boundary_check_passed = False

        result.boundary_check_passed = len(result.errors) == 0

        return result

    def calculate_energy_breakdown(self, speed_rpm: float, 
                                   material_params: MaterialParams,
                                   radius_m: float = 0.5) -> EnergyBreakdown:
        ke, kwh = self.calculate_stored_energy(speed_rpm)
        stress = self.calculate_centrifugal_stress(speed_rpm, radius_m, material_params.density_kg_m3)
        safety_factor = self.calculate_safety_factor(stress, material_params.tensile_strength_mpa)
        tip_speed = self.calculate_tip_speed(speed_rpm, radius_m)

        return EnergyBreakdown(
            kinetic_energy_j=ke,
            stored_energy_kwh=kwh,
            power_output_kw=kwh * 60,
            max_stress_mpa=stress,
            safety_factor=safety_factor,
            tip_speed_m_s=tip_speed
        )

    def get_energy_series(self, record: FlywheelDataRecord) -> List[Dict]:
        series = []
        for point in record.time_series_data:
            ke, kwh = self.calculate_stored_energy(point.speed_rpm)
            series.append({
                "timestamp": point.timestamp,
                "speed_rpm": point.speed_rpm,
                "kinetic_energy_j": ke,
                "stored_energy_kwh": kwh
            })
        return series

    def get_calculation_summary(self) -> Dict[str, float]:
        return {
            "moment_of_inertia_kg_m2": self.params.moment_of_inertia_kg_m2,
            "efficiency": self.params.efficiency
        }

