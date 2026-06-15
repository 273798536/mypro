import math
import json
from typing import Dict, Any, Optional, Tuple, List
from geopy.distance import geodesic
from dataclasses import dataclass


@dataclass
class CalculationFormula:
    name: str
    formula: str
    unit: str
    description: str
    scope: str
    threshold: float
    failure_reasons: List[str]


TRAJECTORY_DRIFT_FORMULA = CalculationFormula(
    name="轨迹漂移计算",
    formula="d = R × arccos(sinφ1×sinφ2 + cosφ1×cosφ2×cosΔλ) × 1000",
    unit="米",
    description="基于Haversine公式计算两点间的球面距离，判断是否超出安全区域半径。"
                "其中R为地球半径(6371km)，φ为纬度，λ为经度。",
    scope="适用于近海海域浮标或船舶的轨迹异常检测，适用范围：纬度-90°~90°，经度-180°~180°",
    threshold=500.0,
    failure_reasons=[
        "坐标数据缺失：缺少起始点或目标点的经纬度",
        "坐标格式错误：经纬度超出有效范围",
        "坐标精度不足：经纬度小数位数少于4位",
        "安全半径未配置：浴场安全区域半径未设置",
        "计算溢出：距离过大导致数值溢出"
    ]
)

WATER_QUALITY_FORMULA = CalculationFormula(
    name="水质综合指数计算",
    formula="WQI = Σ(wi × Ii)，其中Ii = (Ci - Cmin) / (Cmax - Cmin) × 100",
    unit="分",
    description="水质综合评价指数，采用加权平均法计算。各指标权重：溶解氧0.35、pH值0.25、"
                "浊度0.20、水温0.10、盐度0.10。评价范围0-100分，分值越高水质越好。",
    scope="适用于近海浴场水质日常监测评价。适用范围：水温0-35℃，pH值6-9，"
          "溶解氧0-20mg/L，浊度0-100NTU，盐度0-40psu",
    threshold=60.0,
    failure_reasons=[
        "关键指标缺失：缺少溶解氧或pH值数据",
        "指标值超出范围：水温、pH值等超出正常监测范围",
        "数据异常：指标值为负值或明显偏离正常值",
        "权重配置错误：指标权重之和不等于1.0",
        "计算异常：归一化处理时出现除零错误"
    ]
)


class TrajectoryDriftCalculator:
    """轨迹漂移计算器"""

    def __init__(self):
        self.formula = TRAJECTORY_DRIFT_FORMULA
        self.EARTH_RADIUS = 6371.0

    def _validate_coordinates(self, lat: float, lng: float, point_name: str) -> Tuple[bool, Optional[str]]:
        if lat is None or lng is None:
            return False, f"{point_name}坐标数据缺失"
        if not (-90 <= lat <= 90):
            return False, f"{point_name}纬度{lat}超出有效范围(-90°~90°)"
        if not (-180 <= lng <= 180):
            return False, f"{point_name}经度{lng}超出有效范围(-180°~180°)"
        if round(lat, 4) == 0 or round(lng, 4) == 0:
            return False, f"{point_name}坐标精度不足"
        return True, None

    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = self.EARTH_RADIUS * c * 1000
        return distance

    def calculate(
        self,
        point1_lat: float,
        point1_lng: float,
        point2_lat: float,
        point2_lng: float,
        safe_radius: float = 500.0
    ) -> Dict[str, Any]:
        result = {
            "drift_distance": None,
            "unit": self.formula.unit,
            "is_abnormal": False,
            "threshold": safe_radius,
            "formula": self.formula.formula,
            "calculation_note": "",
            "failure_reason": None
        }

        valid, error = self._validate_coordinates(point1_lat, point1_lng, "起始点")
        if not valid:
            result["failure_reason"] = error
            result["calculation_note"] = f"计算失败：{error}"
            return result

        valid, error = self._validate_coordinates(point2_lat, point2_lng, "目标点")
        if not valid:
            result["failure_reason"] = error
            result["calculation_note"] = f"计算失败：{error}"
            return result

        if safe_radius <= 0:
            result["failure_reason"] = "安全半径未配置或配置错误"
            result["calculation_note"] = "计算失败：安全半径必须大于0"
            return result

        try:
            distance_geopy = geodesic((point1_lat, point1_lng), (point2_lat, point2_lng)).meters
            distance_haversine = self._haversine_distance(point1_lat, point1_lng, point2_lat, point2_lng)
            drift_distance = (distance_geopy + distance_haversine) / 2

            result["drift_distance"] = round(drift_distance, 2)
            result["is_abnormal"] = drift_distance > safe_radius

            if result["is_abnormal"]:
                result["calculation_note"] = (
                    f"轨迹漂移量{result['drift_distance']}米，"
                    f"超出安全阈值{safe_radius}米，超出量{round(drift_distance - safe_radius, 2)}米"
                )
            else:
                result["calculation_note"] = (
                    f"轨迹漂移量{result['drift_distance']}米，"
                    f"在安全阈值{safe_radius}米范围内，正常"
                )

        except Exception as e:
            result["failure_reason"] = f"计算溢出或异常：{str(e)}"
            result["calculation_note"] = f"计算失败：{str(e)}"

        return result


class WaterQualityCalculator:
    """水质综合指数计算器"""

    def __init__(self):
        self.formula = WATER_QUALITY_FORMULA
        self.weights = {
            "dissolved_oxygen": 0.35,
            "ph_value": 0.25,
            "turbidity": 0.20,
            "water_temperature": 0.10,
            "salinity": 0.10
        }
        self.ranges = {
            "water_temperature": {"min": 0, "max": 35, "optimal_min": 18, "optimal_max": 28},
            "ph_value": {"min": 6, "max": 9, "optimal_min": 7.5, "optimal_max": 8.5},
            "dissolved_oxygen": {"min": 0, "max": 20, "optimal_min": 6, "optimal_max": 20},
            "turbidity": {"min": 0, "max": 100, "optimal_min": 0, "optimal_max": 10},
            "salinity": {"min": 0, "max": 40, "optimal_min": 25, "optimal_max": 35}
        }

    def _validate_value(self, value: float, name: str, min_val: float, max_val: float) -> Tuple[bool, Optional[str]]:
        if value is None:
            if name in ["dissolved_oxygen", "ph_value"]:
                return False, f"关键指标{name}数据缺失"
            return True, None
        if value < min_val or value > max_val:
            return False, f"{name}={value}超出正常范围[{min_val}, {max_val}]"
        return True, None

    def _calculate_single_index(self, value: float, name: str) -> Optional[float]:
        if value is None:
            return None

        rng = self.ranges[name]
        optimal_min = rng["optimal_min"]
        optimal_max = rng["optimal_max"]
        min_val = rng["min"]
        max_val = rng["max"]

        if optimal_min <= value <= optimal_max:
            return 100.0

        if value < optimal_min:
            if value >= min_val:
                return (value - min_val) / (optimal_min - min_val) * 100
            return 0.0
        else:
            if value <= max_val:
                return (max_val - value) / (max_val - optimal_max) * 100
            return 0.0

    def _get_quality_level(self, score: float) -> str:
        if score >= 80:
            return "优秀"
        elif score >= 60:
            return "良好"
        elif score >= 40:
            return "轻度污染"
        elif score >= 20:
            return "中度污染"
        else:
            return "重度污染"

    def calculate(
        self,
        water_temperature: Optional[float] = None,
        ph_value: Optional[float] = None,
        dissolved_oxygen: Optional[float] = None,
        turbidity: Optional[float] = None,
        salinity: Optional[float] = None
    ) -> Dict[str, Any]:
        result = {
            "quality_level": "未知",
            "quality_score": 0.0,
            "is_abnormal": False,
            "indicators": {},
            "calculation_note": "",
            "failure_reason": None
        }

        indicators = {
            "water_temperature": water_temperature,
            "ph_value": ph_value,
            "dissolved_oxygen": dissolved_oxygen,
            "turbidity": turbidity,
            "salinity": salinity
        }

        for name, value in indicators.items():
            rng = self.ranges[name]
            valid, error = self._validate_value(value, name, rng["min"], rng["max"])
            if not valid:
                result["failure_reason"] = error
                result["calculation_note"] = f"计算失败：{error}"
                return result

        try:
            total_weight = 0.0
            weighted_score = 0.0
            indicator_scores = {}
            missing_indicators = []

            for name, value in indicators.items():
                if value is None:
                    missing_indicators.append(name)
                    indicator_scores[name] = {
                        "value": None,
                        "index": None,
                        "weight": self.weights[name],
                        "status": "缺失"
                    }
                    continue

                idx = self._calculate_single_index(value, name)
                weighted_score += idx * self.weights[name]
                total_weight += self.weights[name]
                indicator_scores[name] = {
                    "value": value,
                    "index": round(idx, 2),
                    "weight": self.weights[name],
                    "status": "正常" if idx >= 60 else "异常"
                }

            if total_weight == 0:
                result["failure_reason"] = "所有指标数据缺失，无法计算"
                result["calculation_note"] = "计算失败：所有指标数据缺失"
                return result

            adjusted_score = weighted_score / total_weight * 100 if total_weight < 1 else weighted_score
            adjusted_score = round(adjusted_score, 2)

            result["quality_score"] = adjusted_score
            result["quality_level"] = self._get_quality_level(adjusted_score)
            result["is_abnormal"] = adjusted_score < self.formula.threshold
            result["indicators"] = indicator_scores

            note_parts = [
                f"水质综合评分{adjusted_score}分，等级：{result['quality_level']}"
            ]
            if missing_indicators:
                note_parts.append(f"，缺失指标：{', '.join(missing_indicators)}，已按可用指标加权计算")
            if result["is_abnormal"]:
                note_parts.append(f"，低于合格线{self.formula.threshold}分")
            result["calculation_note"] = "".join(note_parts)

        except ZeroDivisionError:
            result["failure_reason"] = "计算异常：归一化处理时出现除零错误"
            result["calculation_note"] = "计算失败：除零错误"
        except Exception as e:
            result["failure_reason"] = f"计算异常：{str(e)}"
            result["calculation_note"] = f"计算失败：{str(e)}"

        return result


def calculate_risk_level(drift_abnormal: bool, water_abnormal: bool, drift: float = 0, water_score: float = 100) -> Dict[str, Any]:
    """综合风险等级计算"""
    risk_score = 0.0

    if drift_abnormal:
        risk_score += min(drift / 10, 50)
    else:
        risk_score += max(0, 20 - drift / 25)

    if water_abnormal:
        risk_score += max(0, 50 - water_score / 2)
    else:
        risk_score += max(0, 30 - (100 - water_score) / 4)

    risk_score = min(100, round(risk_score, 2))

    if risk_score >= 80:
        level = "高风险"
    elif risk_score >= 50:
        level = "中风险"
    elif risk_score >= 20:
        level = "低风险"
    else:
        level = "正常"

    return {
        "risk_level": level,
        "risk_score": risk_score,
        "is_abnormal": level in ["高风险", "中风险"]
    }


def check_no_navigation_violation(
    point_lat: float,
    point_lng: float,
    no_navigation_coords: str
) -> Dict[str, Any]:
    """检查是否违反禁航区"""
    result = {
        "is_violation": False,
        "violation_note": "",
        "formula": "射线法判断点是否在多边形内",
        "failure_reason": None
    }

    try:
        coords = json.loads(no_navigation_coords)
        if not isinstance(coords, list) or len(coords) < 3:
            result["failure_reason"] = "禁航区坐标格式错误，至少需要3个点"
            return result

        n = len(coords)
        inside = False
        j = n - 1

        for i in range(n):
            xi, yi = coords[i]
            xj, yj = coords[j]

            if ((yi > point_lat) != (yj > point_lat)) and \
               (point_lng < (xj - xi) * (point_lat - yi) / (yj - yi) + xi):
                inside = not inside
            j = i

        result["is_violation"] = inside
        if inside:
            result["violation_note"] = "该点位于禁航区内，存在越界风险"
        else:
            result["violation_note"] = "该点不在禁航区内，正常"

    except json.JSONDecodeError:
        result["failure_reason"] = "禁航区坐标JSON格式解析失败"
    except Exception as e:
        result["failure_reason"] = f"禁航区判断异常：{str(e)}"

    return result
