import math
from dataclasses import dataclass, field
from typing import List, Dict, Any
from ..utils import Config, AuditLogger

@dataclass
class SpeedEstimateResult:
    segment_id: str
    zone: str
    row_id: int
    slope_angle: float
    friction_coeff: float
    estimated_speed_kmh: float
    max_safe_speed_kmh: float
    speed_category: str
    calculation_trace: Dict[str, Any] = field(default_factory=dict)

class SpeedEstimator:
    def __init__(self, audit_logger: AuditLogger):
        self.config = Config()
        self.audit_logger = audit_logger
        
        self.gravity = 9.81
        self.mass_kg = 75
    
    def estimate_speed(self, segment_data: Dict[str, Any]) -> SpeedEstimateResult:
        segment_id = segment_data.get("segment_id", "unknown")
        zone = segment_data.get("zone", "unknown")
        row_id = segment_data.get("row_id", -1)
        
        slope_angle = float(segment_data.get("slope_angle", 0))
        friction_coeff = float(segment_data.get("friction_coeff", 0.05))
        temperature = float(segment_data.get("temperature", 0))
        surface_type = str(segment_data.get("surface_type", "packed")).lower()
        
        estimated_speed = self._calculate_speed(slope_angle, friction_coeff)
        max_safe_speed = self._calculate_max_safe_speed(
            slope_angle, friction_coeff, temperature, surface_type
        )
        speed_category = self._categorize_speed(max_safe_speed)
        
        trace = {
            "slope_angle": slope_angle,
            "friction_coeff": friction_coeff,
            "temperature": temperature,
            "surface_type": surface_type,
            "calculation_steps": {
                "gravity_component": self.gravity * math.sin(math.radians(slope_angle)),
                "friction_force": friction_coeff * self.gravity * math.cos(math.radians(slope_angle)),
                "net_acceleration": (self.gravity * math.sin(math.radians(slope_angle)) - 
                                     friction_coeff * self.gravity * math.cos(math.radians(slope_angle)))
            }
        }
        
        result = SpeedEstimateResult(
            segment_id=segment_id,
            zone=zone,
            row_id=row_id,
            slope_angle=slope_angle,
            friction_coeff=friction_coeff,
            estimated_speed_kmh=round(estimated_speed, 1),
            max_safe_speed_kmh=round(max_safe_speed, 1),
            speed_category=speed_category,
            calculation_trace=trace
        )
        
        self.audit_logger.log_analysis_result(
            segment_id,
            "speed_estimation",
            {
                "row_id": row_id,
                "zone": zone,
                "slope_angle": slope_angle,
                "friction_coeff": friction_coeff,
                "estimated_speed_kmh": round(estimated_speed, 1),
                "max_safe_speed_kmh": round(max_safe_speed, 1),
                "speed_category": speed_category
            }
        )
        
        return result
    
    def estimate_batch(self, segments: List[Dict[str, Any]]) -> List[SpeedEstimateResult]:
        results = []
        for seg in segments:
            results.append(self.estimate_speed(seg))
        return results
    
    def _calculate_speed(self, slope_angle: float, friction_coeff: float) -> float:
        slope_rad = math.radians(slope_angle)
        
        gravity_component = self.gravity * math.sin(slope_rad)
        friction_component = friction_coeff * self.gravity * math.cos(slope_rad)
        
        net_acceleration = max(0, gravity_component - friction_component)
        
        distance_m = 100
        time_s = math.sqrt(2 * distance_m / net_acceleration) if net_acceleration > 0 else float('inf')
        
        if time_s == float('inf') or time_s == 0:
            speed_ms = 0
        else:
            speed_ms = distance_m / time_s
        
        speed_kmh = speed_ms * 3.6
        
        base_speed = math.sqrt(2 * self.gravity * distance_m * 
                              (math.sin(slope_rad) - friction_coeff * math.cos(slope_rad)))
        base_speed_kmh = abs(base_speed) * 3.6 if base_speed >= 0 else 0
        
        return base_speed_kmh * self.config.SPEED_FACTOR * 0.5
    
    def _calculate_max_safe_speed(self, slope_angle: float, friction_coeff: float,
                                   temperature: float, surface_type: str) -> float:
        base_max_speed = 80.0
        
        slope_factor = 1.0
        if slope_angle > 35:
            slope_factor = 0.4
        elif slope_angle > 25:
            slope_factor = 0.6
        elif slope_angle > 15:
            slope_factor = 0.8
        
        friction_factor = 1.0
        if friction_coeff < 0.03:
            friction_factor = 0.5
        elif friction_coeff < 0.05:
            friction_factor = 0.7
        elif friction_coeff < 0.08:
            friction_factor = 0.9
        
        temp_factor = 1.0
        if temperature >= 0 and temperature < 3:
            temp_factor = 0.6
        elif temperature < -5:
            temp_factor = 0.8
        
        surface_factor_map = {
            "ice": 0.4,
            "crust": 0.6,
            "packed": 0.9,
            "wet": 0.7,
            "powder": 1.0
        }
        surface_factor = surface_factor_map.get(surface_type.lower(), 0.8)
        
        max_speed = (base_max_speed * slope_factor * friction_factor * 
                     temp_factor * surface_factor)
        
        return max_speed
    
    def _categorize_speed(self, speed_kmh: float) -> str:
        if speed_kmh < 30:
            return "LOW"
        elif speed_kmh < 50:
            return "MODERATE"
        elif speed_kmh < 70:
            return "HIGH"
        else:
            return "EXTREME"
    
    def get_speed_by_zone(self, results: List[SpeedEstimateResult], zone: str) -> List[SpeedEstimateResult]:
        return [r for r in results if r.zone.lower() == zone.lower()]
