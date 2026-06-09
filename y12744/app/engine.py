import math
from typing import Dict, Any, Optional, List, Tuple


class ConicEngine:
    CURVE_ELLIPSE = "ellipse"
    CURVE_HYPERBOLA = "hyperbola"
    CURVE_PARABOLA = "parabola"

    def __init__(self):
        pass

    def identify_curve(self, a: Optional[float], b: Optional[float],
                       c: Optional[float], eccentricity: Optional[float]) -> str:
        if eccentricity is not None:
            e = eccentricity
            if abs(e) < 1e-9:
                return "circle"
            if abs(e - 1) < 1e-9:
                return self.CURVE_PARABOLA
            if e < 1:
                return self.CURVE_ELLIPSE
            if e > 1:
                return self.CURVE_HYPERBOLA
        if a and b:
            if abs(a - b) < 1e-9:
                return "circle"
            if a > 0 and b > 0:
                return self.CURVE_ELLIPSE
            if a * b < 0:
                return self.CURVE_HYPERBOLA
        if c is not None and a is None and b is None:
            return self.CURVE_PARABOLA
        return "unknown"

    def compute_results(self, a: Optional[float], b: Optional[float],
                        c: Optional[float], focus_x: Optional[float],
                        focus_y: Optional[float], directrix: Optional[str],
                        eccentricity: Optional[float], curve_type: Optional[str],
                        unit: Optional[str]) -> Dict[str, Any]:
        results: Dict[str, Any] = {
            "foci": [],
            "vertices": [],
            "major_axis": None,
            "minor_axis": None,
            "focal_length": None,
            "latus_rectum": None,
            "asymptotes": [],
            "formula": None,
            "valid": True,
            "warnings": [],
            "unit_missing": False,
        }

        if not unit:
            results["unit_missing"] = True
            results["warnings"].append("单位缺失，将影响最终结论的严谨性")

        curve = curve_type or self.identify_curve(a, b, c, eccentricity)
        results["curve_type"] = curve

        if curve == "circle" and a:
            if a <= 0:
                results["valid"] = False
                results["warnings"].append(f"圆半径 r={a} 必须为正数")
            else:
                r = a
                results["foci"] = [(0, 0)]
                results["vertices"] = [(r, 0), (-r, 0), (0, r), (0, -r)]
                results["major_axis"] = 2 * r
                results["minor_axis"] = 2 * r
                results["formula"] = f"x² + y² = {r * r}"
        elif curve == self.CURVE_ELLIPSE and a and b:
            if a <= 0 or b <= 0:
                results["valid"] = False
                results["warnings"].append(f"椭圆参数 a={a}, b={b} 必须同为正数")
            else:
                aa, bb = max(a, b), min(a, b)
                discriminant = aa * aa - bb * bb
                if discriminant < 0:
                    results["valid"] = False
                    results["warnings"].append(f"参数异常：a={a}, b={b} 无法构成有效椭圆")
                else:
                    c_val = math.sqrt(discriminant)
                    results["foci"] = [(c_val, 0), (-c_val, 0)] if a >= b else [(0, c_val), (0, -c_val)]
                    results["vertices"] = [(aa, 0), (-aa, 0)] if a >= b else [(0, aa), (0, -aa)]
                    results["major_axis"] = 2 * aa
                    results["minor_axis"] = 2 * bb
                    results["focal_length"] = 2 * c_val
                    results["latus_rectum"] = (2 * bb * bb) / aa
                    results["formula"] = f"x²/{a * a} + y²/{b * b} = 1"
                    results["eccentricity"] = c_val / aa
        elif curve == self.CURVE_HYPERBOLA and a and b:
            if a == 0:
                results["valid"] = False
                results["warnings"].append(f"双曲线参数 a 不能为零")
            else:
                abs_a, abs_b = abs(a), abs(b)
                c_val = math.sqrt(abs_a * abs_a + abs_b * abs_b)
                results["foci"] = [(c_val, 0), (-c_val, 0)]
                results["vertices"] = [(abs_a, 0), (-abs_a, 0)]
                results["focal_length"] = 2 * c_val
                results["latus_rectum"] = (2 * abs_b * abs_b) / abs_a
                results["asymptotes"] = [f"y = {abs_b / abs_a}x", f"y = -{abs_b / abs_a}x"]
                results["formula"] = f"x²/{abs_a * abs_a} - y²/{abs_b * abs_b} = 1"
                results["eccentricity"] = c_val / abs_a
                if a * b >= 0 and curve_type == self.CURVE_HYPERBOLA:
                    results["warnings"].append(f"双曲线参数 a={a}, b={b} 符号异常（按绝对值计算）")
        elif curve == self.CURVE_PARABOLA:
            p = c or 1.0
            results["foci"] = [(p, 0)]
            results["vertices"] = [(0, 0)]
            results["focal_length"] = p
            results["latus_rectum"] = 4 * p
            results["directrix"] = f"x = {-p}"
            results["formula"] = f"y² = {4 * p}x"
            results["eccentricity"] = 1.0
        else:
            results["valid"] = False
            results["warnings"].append("参数不足以识别圆锥曲线类型")

        return results

    def detect_conflicts(self, a: Optional[float], b: Optional[float],
                         c: Optional[float], eccentricity: Optional[float],
                         curve_type: Optional[str]) -> List[str]:
        conflicts: List[str] = []
        if eccentricity is not None and curve_type:
            if curve_type == self.CURVE_ELLIPSE and not (0 < eccentricity < 1):
                conflicts.append(f"椭圆离心率应为0<e<1，但当前e={eccentricity}")
            if curve_type == self.CURVE_HYPERBOLA and eccentricity <= 1:
                conflicts.append(f"双曲线离心率应e>1，但当前e={eccentricity}")
            if curve_type == self.CURVE_PARABOLA and abs(eccentricity - 1) > 1e-6:
                conflicts.append(f"抛物线离心率应为e=1，但当前e={eccentricity}")
        if a and b and curve_type:
            if curve_type in (self.CURVE_ELLIPSE, "circle") and a * b <= 0:
                conflicts.append("椭圆参数a、b应同为正数")
            if curve_type == self.CURVE_HYPERBOLA and a * b >= 0:
                conflicts.append("双曲线参数a、b应异号")
        return conflicts

    def validate_record(self, record_data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        issues: List[Dict[str, Any]] = []
        valid = True

        if not record_data.get("unit"):
            issues.append({
                "issue_type": "unit_missing",
                "severity": "blocker",
                "description": "单位缺失：圆锥曲线参数必须标注长度单位（如cm、m等），否则结论不具备物理意义，报告将被拦截导出。"
            })
            valid = False

        conflicts = self.detect_conflicts(
            record_data.get("a"),
            record_data.get("b"),
            record_data.get("c"),
            record_data.get("eccentricity"),
            record_data.get("curve_type"),
        )
        for conflict in conflicts:
            issues.append({
                "issue_type": "constraint_conflict",
                "severity": "error",
                "description": conflict
            })
            valid = False

        if not record_data.get("a") and not record_data.get("b") and not record_data.get("c") \
                and not record_data.get("eccentricity"):
            issues.append({
                "issue_type": "insufficient_params",
                "severity": "error",
                "description": "参数严重不足：至少需要提供a、b、c或离心率中的一个才能识别曲线。"
            })
            valid = False

        return valid, issues

    def compute_late_impact(self, param_name: str, old_value: str, new_value: str,
                            current_results: Dict[str, Any]) -> List[str]:
        impacted: List[str] = []
        if param_name in ("a", "b", "c"):
            impacted.append("曲线类型判定")
            impacted.append("焦点坐标")
            impacted.append("顶点坐标")
            impacted.append("焦距与长/短轴长度")
            impacted.append("标准方程表达式")
            if current_results.get("curve_type") == "hyperbola":
                impacted.append("渐近线方程")
            if current_results.get("latus_rectum") is not None:
                impacted.append("通径长度")
        if param_name == "eccentricity":
            impacted.append("曲线类型判定")
            impacted.append("离心率取值范围验证")
        if param_name == "unit":
            impacted.append("单位完整性校验")
            impacted.append("报告导出合格性判定")
        return impacted


engine = ConicEngine()
