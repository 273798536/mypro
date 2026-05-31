import math
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from ..utils import Config, AuditLogger

@dataclass
class FrictionAnalysisResult:
    segment_id: str
    zone: str
    row_id: int
    friction_coeff: float
    temperature: float
    slope_angle: float
    surface_type: str
    ice_risk_score: float
    ice_risk_level: str
    analysis_trace: Dict[str, Any] = field(default_factory=dict)

class FrictionAnalyzer:
    def __init__(self, audit_logger: AuditLogger):
        self.config = Config()
        self.audit_logger = audit_logger
        
        self.surface_friction_map = {
            "powder": {"base": 0.08, "temp_factor": 0.002},
            "packed": {"base": 0.05, "temp_factor": 0.003},
            "ice": {"base": 0.02, "temp_factor": 0.005},
            "wet": {"base": 0.06, "temp_factor": 0.001},
            "crust": {"base": 0.04, "temp_factor": 0.004}
        }
    
    def analyze_segment(self, segment_data: Dict[str, Any]) -> FrictionAnalysisResult:
        segment_id = segment_data.get("segment_id", "unknown")
        zone = segment_data.get("zone", "unknown")
        row_id = segment_data.get("row_id", -1)
        
        friction_coeff = float(segment_data.get("friction_coeff", 0.05))
        temperature = float(segment_data.get("temperature", 0))
        slope_angle = float(segment_data.get("slope_angle", 0))
        surface_type = str(segment_data.get("surface_type", "packed")).lower()
        
        ice_risk_score = self._calculate_ice_risk(friction_coeff, temperature, slope_angle, surface_type)
        ice_risk_level = self._determine_risk_level(ice_risk_score)
        
        trace = {
            "friction_coeff_input": friction_coeff,
            "temperature_input": temperature,
            "slope_angle_input": slope_angle,
            "surface_type_input": surface_type,
            "ice_risk_components": {
                "friction_component": self._friction_risk_component(friction_coeff),
                "temperature_component": self._temperature_risk_component(temperature),
                "slope_component": self._slope_risk_component(slope_angle)
            }
        }
        
        result = FrictionAnalysisResult(
            segment_id=segment_id,
            zone=zone,
            row_id=row_id,
            friction_coeff=friction_coeff,
            temperature=temperature,
            slope_angle=slope_angle,
            surface_type=surface_type,
            ice_risk_score=ice_risk_score,
            ice_risk_level=ice_risk_level,
            analysis_trace=trace
        )
        
        self.audit_logger.log_analysis_result(
            segment_id,
            "friction_analysis",
            {
                "row_id": row_id,
                "zone": zone,
                "friction_coeff": friction_coeff,
                "ice_risk_score": ice_risk_score,
                "ice_risk_level": ice_risk_level
            }
        )
        
        return result
    
    def analyze_batch(self, segments: List[Dict[str, Any]]) -> List[FrictionAnalysisResult]:
        results = []
        for seg in segments:
            results.append(self.analyze_segment(seg))
        return results
    
    def _calculate_ice_risk(self, friction: float, temp: float, 
                            slope: float, surface: str) -> float:
        friction_risk = self._friction_risk_component(friction)
        temp_risk = self._temperature_risk_component(temp)
        slope_risk = self._slope_risk_component(slope)
        surface_risk = self._surface_risk_component(surface)
        
        total_risk = (
            friction_risk * 0.4 +
            temp_risk * 0.25 +
            slope_risk * 0.25 +
            surface_risk * 0.1
        )
        
        return round(total_risk, 2)
    
    def _friction_risk_component(self, friction: float) -> float:
        if friction <= 0.02:
            return 1.0
        elif friction <= 0.04:
            return 0.8
        elif friction <= 0.06:
            return 0.5
        elif friction <= 0.08:
            return 0.2
        else:
            return 0.0
    
    def _temperature_risk_component(self, temp: float) -> float:
        if temp < -15:
            return 0.3
        elif temp < -5:
            return 0.5
        elif temp < 0:
            return 0.8
        elif temp < 5:
            return 1.0
        else:
            return 0.6
    
    def _slope_risk_component(self, slope: float) -> float:
        if slope < 10:
            return 0.2
        elif slope < 20:
            return 0.4
        elif slope < 30:
            return 0.7
        elif slope < 40:
            return 0.9
        else:
            return 1.0
    
    def _surface_risk_component(self, surface: str) -> float:
        surface = surface.lower()
        if surface == "ice":
            return 1.0
        elif surface == "crust":
            return 0.8
        elif surface == "packed":
            return 0.5
        elif surface == "wet":
            return 0.6
        elif surface == "powder":
            return 0.2
        else:
            return 0.5
    
    def _determine_risk_level(self, risk_score: float) -> str:
        if risk_score >= 0.8:
            return "CRITICAL"
        elif risk_score >= 0.6:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MEDIUM"
        else:
            return "LOW"
    
    def get_segments_by_risk_level(self, results: List[FrictionAnalysisResult], 
                                    level: str) -> List[FrictionAnalysisResult]:
        return [r for r in results if r.ice_risk_level == level.upper()]
