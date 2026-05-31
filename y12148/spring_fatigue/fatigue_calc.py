"""疲劳寿命估算核心算法"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple
import math
from enum import Enum

from .spring_params import SpringParameter
from .load_cycles import LoadCycle, LoadSpectrum
from .materials import Material, MaterialDatabase
from .units import UnitValidator


class AnomalyType(Enum):
    UNIT_ERROR = "单位错误"
    CYCLE_INTERRUPTION = "循环中断"
    MATERIAL_MISMATCH = "材料混用"
    STRESS_EXCEED_YIELD = "应力超过屈服"
    OUTSIDE_SN_RANGE = "超出S-N曲线范围"
    NEGATIVE_DAMAGE = "损伤累积异常"


@dataclass
class AnomalyRecord:
    anomaly_type: AnomalyType
    description: str
    source_record_id: Optional[str] = None
    severity: str = "warning"
    related_data: Dict = field(default_factory=dict)


@dataclass
class FatigueResult:
    spring_param_id: str
    load_record_id: str
    material_grade: str
    max_stress_mpa: float
    min_stress_mpa: float
    mean_stress_mpa: float
    stress_amplitude_mpa: float
    stress_ratio: float
    estimated_cycles: float
    damage_ratio: float
    sn_source_record_id: Optional[str] = None
    fatigue_limit_check: str = ""
    warnings: List[str] = field(default_factory=list)


class FatigueCalculator:
    def __init__(self, material_db: MaterialDatabase):
        self.material_db = material_db
        self.anomalies: List[AnomalyRecord] = []
    
    def clear_anomalies(self):
        self.anomalies = []
    
    def _get_wahl_factor(self, spring_index: float) -> float:
        return (4 * spring_index - 1) / (4 * spring_index - 4) + 0.615 / spring_index
    
    def calculate_stress(
        self,
        spring: SpringParameter,
        load: float,
        load_unit: str,
        unit_validator: UnitValidator
    ) -> Tuple[float, Optional[str]]:
        material = self.material_db.get_material(spring.material_grade)
        if not material:
            self.anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.MATERIAL_MISMATCH,
                description=f"未知材料牌号: {spring.material_grade}",
                source_record_id=spring.record_id,
                severity="error"
            ))
            return (0.0, None)
        
        load_n = unit_validator.to_n(load, load_unit)
        wire_d_mm = unit_validator.to_mm(spring.wire_diameter, spring.wire_diameter_unit)
        mean_d_mm = unit_validator.to_mm(spring.mean_coil_diameter, spring.mean_coil_diameter_unit)
        
        spring_index = mean_d_mm / wire_d_mm
        wahl_factor = self._get_wahl_factor(spring_index)
        
        stress_mpa = (8 * load_n * mean_d_mm) / (math.pi * wire_d_mm**3) * wahl_factor
        
        if stress_mpa > material.yield_strength_mpa:
            self.anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.STRESS_EXCEED_YIELD,
                description=f"应力({stress_mpa:.1f}MPa)超过屈服强度({material.yield_strength_mpa}MPa)",
                source_record_id=spring.record_id,
                severity="error",
                related_data={"stress": stress_mpa, "yield": material.yield_strength_mpa}
            ))
        
        return (stress_mpa, material.material_id)
    
    def _apply_mean_stress_correction(
        self,
        stress_amplitude: float,
        mean_stress: float,
        material: Material
    ) -> float:
        if mean_stress <= 0:
            return stress_amplitude
        
        ultimate = material.tensile_strength_mpa
        if stress_amplitude <= 0:
            return 0
        
        corrected_amplitude = stress_amplitude * ultimate / (ultimate - mean_stress)
        return corrected_amplitude
    
    def calculate_single_cycle_fatigue(
        self,
        spring: SpringParameter,
        load_cycle: LoadCycle,
        unit_validator: UnitValidator
    ) -> Optional[FatigueResult]:
        material = self.material_db.get_material(spring.material_grade)
        if not material:
            return None
        
        max_stress, _ = self.calculate_stress(spring, load_cycle.max_load, load_cycle.load_unit, unit_validator)
        min_stress, _ = self.calculate_stress(spring, load_cycle.min_load, load_cycle.load_unit, unit_validator)
        
        if max_stress == 0 and min_stress == 0:
            return None
        
        mean_stress = (max_stress + min_stress) / 2
        stress_amplitude = abs(max_stress - min_stress) / 2
        
        if max_stress != 0:
            stress_ratio = min_stress / max_stress
        else:
            stress_ratio = 0
        
        corrected_amplitude = self._apply_mean_stress_correction(stress_amplitude, mean_stress, material)
        
        if corrected_amplitude <= 0:
            estimated_cycles = float('inf')
            sn_record_id = None
            self.anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.NEGATIVE_DAMAGE,
                description="应力幅为零或负值，可能循环中断",
                source_record_id=load_cycle.record_id,
                severity="warning"
            ))
        else:
            estimated_cycles, sn_record_id = material.get_cycles_for_stress(corrected_amplitude)
        
        if material.fatigue_limit_mpa:
            if corrected_amplitude <= material.fatigue_limit_mpa:
                fatigue_check = f"通过(≤{material.fatigue_limit_mpa}MPa)"
            else:
                fatigue_check = f"不通过(>{material.fatigue_limit_mpa}MPa)"
        else:
            fatigue_check = "未定义疲劳极限"
        
        warnings = []
        if corrected_amplitude > material.sn_curve[0].stress_mpa if material.sn_curve else False:
            warnings.append("应力超过S-N曲线最大范围")
            self.anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.OUTSIDE_SN_RANGE,
                description=f"等效应力幅({corrected_amplitude:.1f}MPa)超出S-N曲线范围",
                source_record_id=sn_record_id or load_cycle.record_id,
                severity="warning"
            ))
        
        damage_ratio = load_cycle.cycles / estimated_cycles if estimated_cycles > 0 else 0
        
        return FatigueResult(
            spring_param_id=spring.record_id,
            load_record_id=load_cycle.record_id,
            material_grade=spring.material_grade,
            max_stress_mpa=max_stress,
            min_stress_mpa=min_stress,
            mean_stress_mpa=mean_stress,
            stress_amplitude_mpa=stress_amplitude,
            stress_ratio=stress_ratio,
            estimated_cycles=estimated_cycles,
            damage_ratio=damage_ratio,
            sn_source_record_id=sn_record_id,
            fatigue_limit_check=fatigue_check,
            warnings=warnings
        )
    
    def calculate_spectrum_fatigue(
        self,
        spring: SpringParameter,
        spectrum: LoadSpectrum,
        unit_validator: UnitValidator
    ) -> Dict:
        results = []
        total_damage = 0.0
        
        for load_cycle in spectrum.cycles:
            result = self.calculate_single_cycle_fatigue(spring, load_cycle, unit_validator)
            if result:
                results.append(result)
                total_damage += result.damage_ratio
        
        estimated_total_life = 1.0 / total_damage if total_damage > 0 else float('inf')
        
        return {
            "individual_results": results,
            "total_damage": total_damage,
            "estimated_total_cycles": estimated_total_life * spectrum.get_total_cycles() if estimated_total_life != float('inf') else float('inf'),
            "miner_rule_check": "通过" if total_damage <= 1.0 else "不通过",
            "anomalies": self.anomalies.copy()
        }
