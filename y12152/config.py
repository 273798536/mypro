from dataclasses import dataclass
from typing import Dict, List


@dataclass
class SafetyBoundaries:
    max_speed_rpm: float = 10000.0
    min_speed_rpm: float = 100.0
    warning_speed_rpm: float = 9000.0
    max_vacuum_pa: float = 0.1
    warning_vacuum_pa: float = 0.05
    max_temperature_c: float = 120.0
    warning_temperature_c: float = 100.0
    max_temp_rise_rate_c_per_min: float = 5.0
    warning_temp_rise_rate_c_per_min: float = 3.0


@dataclass
class EnergyCalculationParams:
    moment_of_inertia_kg_m2: float = 0.5
    efficiency: float = 0.95


@dataclass
class MaterialParams:
    tensile_strength_mpa: float = 800.0
    density_kg_m3: float = 7850.0
    elastic_modulus_gpa: float = 200.0
    poisson_ratio: float = 0.3


RESPONSIBLE_PERSONS = {
    "speed_violation": ["机械工程师", "系统主管"],
    "vacuum_leak": ["真空系统工程师", "运维主管"],
    "temperature_lag": ["热管理工程师", "质量主管"],
    "material_issue": ["材料工程师", "研发主管"]
}


OUTPUT_PATHS = {
    "normal_results": "./output/normal_results/",
    "boundary_cases": "./output/boundary_cases/",
    "bad_inputs": "./output/bad_inputs/",
    "pending_review": "./output/pending_review/",
    "reports": "./output/reports/"
}

