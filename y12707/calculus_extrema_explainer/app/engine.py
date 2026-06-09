import re
import math
from datetime import datetime


def parse_derivative(expr: str):
    if not expr:
        return None
    expr = expr.strip().replace(" ", "")
    return expr


def has_zero_division(derivative_expr: str, x_value: float, eps: float = 1e-9) -> bool:
    if not derivative_expr:
        return False
    if abs(x_value) < eps and "/x" in derivative_expr:
        return True
    pattern = r"/\(([^)]+)\)"
    for match in re.finditer(pattern, derivative_expr):
        inner = match.group(1)
        try:
            val = safe_eval_expr(inner, x_value)
            if abs(val) < eps:
                return True
        except Exception:
            pass
    return False


SAFE_MATH_DICT = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "asin": math.asin, "acos": math.acos, "atan": math.atan,
    "sqrt": math.sqrt, "log": math.log, "ln": math.log,
    "exp": math.exp, "abs": abs, "pi": math.pi, "e": math.e,
    "__builtins__": {}
}


def parse_point(expr: str) -> float:
    expr = expr.strip()
    try:
        return float(expr)
    except ValueError:
        return float(eval(expr, SAFE_MATH_DICT))


def safe_eval_expr(expr: str, x: float) -> float:
    safe_dict = dict(SAFE_MATH_DICT)
    safe_dict["x"] = x
    return float(eval(expr, safe_dict))


def check_zero_division_boundary(correct_derivative: str, student_derivative: str, question_meta: dict) -> dict:
    result = {
        "boundary_valid": True,
        "detail": "",
        "risk_points": []
    }
    if question_meta.get("has_zero_division_risk", 0) == 0:
        result["detail"] = "本题无除零风险标记"
        return result

    critical_points = question_meta.get("critical_points", "")
    if critical_points:
        points = [parse_point(p) for p in critical_points.split(",") if p.strip()]
        for x0 in points:
            if has_zero_division(correct_derivative, x0):
                result["risk_points"].append({"x": x0, "side": "correct"})
            if student_derivative and has_zero_division(student_derivative, x0):
                result["risk_points"].append({"x": x0, "side": "student"})

    if result["risk_points"]:
        result["boundary_valid"] = len([r for r in result["risk_points"] if r["side"] == "student"]) == 0
        result["detail"] = f"检测到{len(result['risk_points'])}处除零风险点"

    return result


def run_constraint_checks(batch_record_id: int, wrong_answer: dict, question: dict) -> list:
    checks = []

    boundary = check_zero_division_boundary(
        question.get("correct_derivative", ""),
        wrong_answer.get("student_derivative", ""),
        question
    )
    checks.append({
        "batch_record_id": batch_record_id,
        "check_type": "zero_division_boundary",
        "check_result": "passed" if boundary["boundary_valid"] else "failed",
        "check_passed": 1 if boundary["boundary_valid"] else 0,
        "detail": boundary["detail"] + (f" 风险点: {boundary['risk_points']}" if boundary["risk_points"] else "")
    })

    has_historical = not wrong_answer.get("historical_score_missing", 0)
    checks.append({
        "batch_record_id": batch_record_id,
        "check_type": "historical_score_presence",
        "check_result": "present" if has_historical else "missing",
        "check_passed": 1 if has_historical else 0,
        "detail": "历史评分可用" if has_historical else "历史评分缺失，后续将记录缺口"
    })

    if wrong_answer.get("student_answer") is not None and question.get("correct_answer") is not None:
        range_ok = abs(wrong_answer["student_answer"]) < 1e6
        checks.append({
            "batch_record_id": batch_record_id,
            "check_type": "answer_value_range",
            "check_result": "passed" if range_ok else "failed",
            "check_passed": 1 if range_ok else 0,
            "detail": f"学生答案值域检查 {'通过' if range_ok else '异常'}"
        })

    return checks


def run_error_analysis(batch_record_id: int, wrong_answer: dict, question: dict) -> dict:
    analysis = {
        "batch_record_id": batch_record_id,
        "error_type": "unknown",
        "error_magnitude": None,
        "relative_error": None,
        "root_cause": "",
        "detail": ""
    }

    correct = question.get("correct_answer")
    student = wrong_answer.get("student_answer")

    if correct is not None and student is not None:
        magnitude = abs(student - correct)
        analysis["error_magnitude"] = magnitude
        if abs(correct) > 1e-9:
            analysis["relative_error"] = magnitude / abs(correct)
        else:
            analysis["relative_error"] = magnitude

        if magnitude < 1e-3:
            analysis["error_type"] = "rounding"
            analysis["root_cause"] = "舍入误差"
        elif analysis["relative_error"] is not None and analysis["relative_error"] < 0.1:
            analysis["error_type"] = "minor_calculation"
            analysis["root_cause"] = "计算过程微小误差"
        else:
            analysis["error_type"] = "major_calculation"
            analysis["root_cause"] = "解题思路或核心计算错误"

        analysis["detail"] = f"正确答案={correct}, 学生答案={student}"

    if wrong_answer.get("student_derivative") and question.get("correct_derivative"):
        sd = wrong_answer["student_derivative"].replace(" ", "")
        cd = question["correct_derivative"].replace(" ", "")
        if sd != cd:
            analysis["error_type"] = analysis["error_type"] if analysis["error_type"] != "unknown" else "derivative_mismatch"
            analysis["root_cause"] = (analysis["root_cause"] + "; " if analysis["root_cause"] else "") + "求导过程与标准解不一致"

    return analysis
