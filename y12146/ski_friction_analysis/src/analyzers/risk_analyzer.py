from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from ..utils import Config, AuditLogger

@dataclass
class AccidentLink:
    segment_id: str
    accident_point: Optional[str]
    accident_count: int
    risk_correlation_score: float
    contributing_factors: List[str]

@dataclass
class RiskAnalysisResult:
    segment_id: str
    zone: str
    row_id: int
    overall_risk_score: float
    overall_risk_level: str
    risk_zone: str
    speed_estimate_kmh: float
    max_safe_speed_kmh: float
    ice_risk_score: float
    accident_link: Optional[AccidentLink]
    risk_factors: Dict[str, Any] = field(default_factory=dict)
    trace_id: str = ""

class RiskAnalyzer:
    def __init__(self, audit_logger: AuditLogger):
        self.config = Config()
        self.audit_logger = audit_logger
        self._trace_counter = 0
    
    def _generate_trace_id(self, segment_id: str) -> str:
        self._trace_counter += 1
        return f"{segment_id}-{self._trace_counter:04d}"
    
    def analyze_risk(self, segment_data: Dict[str, Any],
                     friction_result: Optional[Dict[str, Any]] = None,
                     speed_result: Optional[Dict[str, Any]] = None) -> RiskAnalysisResult:
        
        segment_id = segment_data.get("segment_id", "unknown")
        zone = segment_data.get("zone", "unknown")
        row_id = segment_data.get("row_id", -1)
        trace_id = self._generate_trace_id(segment_id)
        
        ice_risk_score = 0.5
        if friction_result:
            ice_risk_score = friction_result.get("ice_risk_score", 0.5)
        
        speed_estimate = 40.0
        max_safe_speed = 50.0
        if speed_result:
            speed_estimate = speed_result.get("estimated_speed_kmh", 40.0)
            max_safe_speed = speed_result.get("max_safe_speed_kmh", 50.0)
        
        slope_angle = float(segment_data.get("slope_angle", 0))
        temperature = float(segment_data.get("temperature", 0))
        friction_coeff = float(segment_data.get("friction_coeff", 0.05))
        
        speed_over_ratio = speed_estimate / max_safe_speed if max_safe_speed > 0 else 1.0
        
        overall_risk_score = self._calculate_overall_risk(
            ice_risk_score, speed_over_ratio, slope_angle, temperature
        )
        overall_risk_level = self._determine_risk_level(overall_risk_score)
        risk_zone = self._assign_risk_zone(overall_risk_level, zone)
        
        accident_point = segment_data.get("accident_point")
        accident_count = int(segment_data.get("accident_count", 0) or 0)
        
        accident_link = None
        if accident_point or accident_count > 0:
            accident_link = self._link_accident(
                segment_id, accident_point, accident_count,
                ice_risk_score, speed_over_ratio
            )
        
        risk_factors = {
            "ice_risk": ice_risk_score,
            "speed_risk": min(speed_over_ratio, 1.5),
            "slope_risk": slope_angle / 45.0,
            "temperature_risk": self._temp_risk_factor(temperature),
            "friction_risk": (0.1 - friction_coeff) / 0.1 if friction_coeff < 0.1 else 0
        }
        
        result = RiskAnalysisResult(
            segment_id=segment_id,
            zone=zone,
            row_id=row_id,
            overall_risk_score=round(overall_risk_score, 2),
            overall_risk_level=overall_risk_level,
            risk_zone=risk_zone,
            speed_estimate_kmh=round(speed_estimate, 1),
            max_safe_speed_kmh=round(max_safe_speed, 1),
            ice_risk_score=round(ice_risk_score, 2),
            accident_link=accident_link,
            risk_factors=risk_factors,
            trace_id=trace_id
        )
        
        self.audit_logger.log_analysis_result(
            segment_id,
            "risk_analysis",
            {
                "row_id": row_id,
                "trace_id": trace_id,
                "zone": zone,
                "overall_risk_score": round(overall_risk_score, 2),
                "overall_risk_level": overall_risk_level,
                "risk_zone": risk_zone,
                "has_accident_link": accident_link is not None
            }
        )
        
        return result
    
    def analyze_batch(self, segments: List[Dict[str, Any]],
                      friction_results: Optional[List[Dict[str, Any]]] = None,
                      speed_results: Optional[List[Dict[str, Any]]] = None) -> List[RiskAnalysisResult]:
        results = []
        
        friction_map = {}
        if friction_results:
            for fr in friction_results:
                if hasattr(fr, 'segment_id'):
                    friction_map[fr.segment_id] = {
                        "ice_risk_score": fr.ice_risk_score,
                        "ice_risk_level": fr.ice_risk_level
                    }
                else:
                    seg_id = fr.get("segment_id")
                    if seg_id:
                        friction_map[seg_id] = fr
        
        speed_map = {}
        if speed_results:
            for sr in speed_results:
                if hasattr(sr, 'segment_id'):
                    speed_map[sr.segment_id] = {
                        "estimated_speed_kmh": sr.estimated_speed_kmh,
                        "max_safe_speed_kmh": sr.max_safe_speed_kmh
                    }
                else:
                    seg_id = sr.get("segment_id")
                    if seg_id:
                        speed_map[seg_id] = sr
        
        for seg in segments:
            seg_id = seg.get("segment_id")
            fr = friction_map.get(seg_id)
            sr = speed_map.get(seg_id)
            results.append(self.analyze_risk(seg, fr, sr))
        
        return results
    
    def _calculate_overall_risk(self, ice_risk: float, speed_ratio: float,
                                 slope: float, temp: float) -> float:
        slope_factor = min(slope / 30.0, 1.0)
        temp_factor = self._temp_risk_factor(temp)
        
        risk_score = (
            ice_risk * 0.35 +
            min(speed_ratio, 1.5) * 0.3 +
            slope_factor * 0.2 +
            temp_factor * 0.15
        )
        
        return min(risk_score, 1.0)
    
    def _temp_risk_factor(self, temp: float) -> float:
        if temp < -10:
            return 0.3
        elif temp < -2:
            return 0.6
        elif temp < 2:
            return 1.0
        else:
            return 0.7
    
    def _determine_risk_level(self, risk_score: float) -> str:
        if risk_score >= 0.75:
            return "CRITICAL"
        elif risk_score >= 0.55:
            return "HIGH"
        elif risk_score >= 0.35:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _assign_risk_zone(self, risk_level: str, zone: str) -> str:
        zone_prefix = zone[:2].upper() if zone else "ZZ"
        risk_suffix = {
            "CRITICAL": "R1",
            "HIGH": "R2",
            "MEDIUM": "R3",
            "LOW": "R4"
        }
        return f"{zone_prefix}-{risk_suffix.get(risk_level, 'R4')}"
    
    def _link_accident(self, segment_id: str, accident_point: Optional[str],
                       accident_count: int, ice_risk: float, 
                       speed_ratio: float) -> AccidentLink:
        factors = []
        
        if ice_risk >= 0.6:
            factors.append("结冰风险高")
        if speed_ratio >= 1.0:
            factors.append("速度超出安全范围")
        if accident_count >= 3:
            factors.append("历史事故多发")
        
        correlation_score = (ice_risk * 0.5 + min(speed_ratio, 1.5) * 0.3 + 
                            min(accident_count / 5.0, 1.0) * 0.2)
        
        return AccidentLink(
            segment_id=segment_id,
            accident_point=accident_point,
            accident_count=accident_count,
            risk_correlation_score=round(correlation_score, 2),
            contributing_factors=factors
        )
    
    def get_results_by_risk_level(self, results: List[RiskAnalysisResult], 
                                  level: str) -> List[RiskAnalysisResult]:
        return [r for r in results if r.overall_risk_level == level.upper()]
    
    def get_results_with_accidents(self, results: List[RiskAnalysisResult]) -> List[RiskAnalysisResult]:
        return [r for r in results if r.accident_link is not None]
    
    def trace_result(self, results: List[RiskAnalysisResult], 
                     trace_id: str) -> Optional[RiskAnalysisResult]:
        for r in results:
            if r.trace_id == trace_id:
                return r
        return None
