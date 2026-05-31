"""材料数据库与S-N曲线模块"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import math


@dataclass
class MaterialSource:
    source_id: str
    name: str
    version: str
    date: str


@dataclass
class SNPoint:
    stress_mpa: float
    cycles: float
    source_record_id: Optional[str] = None


@dataclass
class Material:
    material_id: str
    name: str
    grade: str
    tensile_strength_mpa: float
    yield_strength_mpa: float
    shear_modulus_mpa: float
    elastic_modulus_mpa: float
    sn_curve: List[SNPoint]
    source: MaterialSource
    fatigue_limit_mpa: Optional[float] = None
    
    def get_stress_for_cycles(self, target_cycles: float) -> float:
        if not self.sn_curve:
            return self.fatigue_limit_mpa or self.tensile_strength_mpa * 0.3
        
        sorted_points = sorted(self.sn_curve, key=lambda p: p.cycles)
        
        if target_cycles <= sorted_points[0].cycles:
            return sorted_points[0].stress_mpa
        
        if target_cycles >= sorted_points[-1].cycles:
            return self.fatigue_limit_mpa or sorted_points[-1].stress_mpa
        
        for i in range(len(sorted_points) - 1):
            p1 = sorted_points[i]
            p2 = sorted_points[i + 1]
            
            if p1.cycles <= target_cycles <= p2.cycles:
                log_n1 = math.log10(p1.cycles)
                log_n2 = math.log10(p2.cycles)
                log_s1 = math.log10(p1.stress_mpa)
                log_s2 = math.log10(p2.stress_mpa)
                
                log_n_target = math.log10(target_cycles)
                ratio = (log_n_target - log_n1) / (log_n2 - log_n1)
                log_s_target = log_s1 + ratio * (log_s2 - log_s1)
                
                return math.pow(10, log_s_target)
        
        return self.fatigue_limit_mpa or self.tensile_strength_mpa * 0.3
    
    def get_cycles_for_stress(self, stress_mpa: float) -> Tuple[float, Optional[str]]:
        if not self.sn_curve:
            if self.fatigue_limit_mpa and stress_mpa <= self.fatigue_limit_mpa:
                return (1e7, None)
            return (1e4, "S-N曲线数据不足，使用默认估算")
        
        sorted_points = sorted(self.sn_curve, key=lambda p: p.stress_mpa, reverse=True)
        
        if stress_mpa >= sorted_points[0].stress_mpa:
            return (sorted_points[0].cycles, f"应力超过S-N曲线最大值，使用{sorted_points[0].cycles:.0f}次循环")
        
        if self.fatigue_limit_mpa and stress_mpa <= self.fatigue_limit_mpa:
            return (1e7, f"应力低于疲劳极限，使用10^7次循环")
        
        if stress_mpa <= sorted_points[-1].stress_mpa:
            return (sorted_points[-1].cycles, f"应力低于S-N曲线最小值，使用{sorted_points[-1].cycles:.0f}次循环")
        
        for i in range(len(sorted_points) - 1):
            p1 = sorted_points[i]
            p2 = sorted_points[i + 1]
            
            if p2.stress_mpa <= stress_mpa <= p1.stress_mpa:
                log_s1 = math.log10(p1.stress_mpa)
                log_s2 = math.log10(p2.stress_mpa)
                log_n1 = math.log10(p1.cycles)
                log_n2 = math.log10(p2.cycles)
                
                log_s_target = math.log10(stress_mpa)
                ratio = (log_s_target - log_s1) / (log_s2 - log_s1)
                log_n_target = log_n1 + ratio * (log_n2 - log_n1)
                
                return (math.pow(10, log_n_target), p1.source_record_id)
        
        return (1e5, "无法在S-N曲线上插值，使用默认估算")


class MaterialDatabase:
    def __init__(self):
        self.materials: Dict[str, Material] = {}
        self._init_default_materials()
    
    def _init_default_materials(self):
        default_source = MaterialSource(
            source_id="GB/T_1239-2009",
            name="冷卷圆柱螺旋弹簧技术条件",
            version="2009",
            date="2009-01-01"
        )
        
        self.materials["60Si2MnA"] = Material(
            material_id="MAT_001",
            name="硅锰弹簧钢",
            grade="60Si2MnA",
            tensile_strength_mpa=1500,
            yield_strength_mpa=1300,
            shear_modulus_mpa=80000,
            elastic_modulus_mpa=206000,
            fatigue_limit_mpa=450,
            sn_curve=[
                SNPoint(1200, 1e3, "SN_60Si2MnA_001"),
                SNPoint(900, 1e4, "SN_60Si2MnA_002"),
                SNPoint(700, 1e5, "SN_60Si2MnA_003"),
                SNPoint(550, 1e6, "SN_60Si2MnA_004"),
                SNPoint(450, 1e7, "SN_60Si2MnA_005"),
            ],
            source=default_source
        )
        
        self.materials["50CrVA"] = Material(
            material_id="MAT_002",
            name="铬钒弹簧钢",
            grade="50CrVA",
            tensile_strength_mpa=1500,
            yield_strength_mpa=1300,
            shear_modulus_mpa=80000,
            elastic_modulus_mpa=206000,
            fatigue_limit_mpa=480,
            sn_curve=[
                SNPoint(1250, 1e3, "SN_50CrVA_001"),
                SNPoint(950, 1e4, "SN_50CrVA_002"),
                SNPoint(750, 1e5, "SN_50CrVA_003"),
                SNPoint(580, 1e6, "SN_50CrVA_004"),
                SNPoint(480, 1e7, "SN_50CrVA_005"),
            ],
            source=default_source
        )
        
        self.materials["SUS304"] = Material(
            material_id="MAT_003",
            name="不锈钢",
            grade="SUS304",
            tensile_strength_mpa=700,
            yield_strength_mpa=350,
            shear_modulus_mpa=72000,
            elastic_modulus_mpa=190000,
            fatigue_limit_mpa=250,
            sn_curve=[
                SNPoint(600, 1e3, "SN_SUS304_001"),
                SNPoint(450, 1e4, "SN_SUS304_002"),
                SNPoint(350, 1e5, "SN_SUS304_003"),
                SNPoint(280, 1e6, "SN_SUS304_004"),
                SNPoint(250, 1e7, "SN_SUS304_005"),
            ],
            source=MaterialSource(
                source_id="JIS_G_4314",
                name="弹簧用不锈钢丝",
                version="2016",
                date="2016-01-01"
            )
        )
    
    def get_material(self, grade: str) -> Optional[Material]:
        return self.materials.get(grade)
    
    def list_materials(self) -> List[str]:
        return list(self.materials.keys())
