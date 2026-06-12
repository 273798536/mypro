from typing import Optional, Tuple, Dict, Any, List
import math
from .models import ExceptionType, CalculationException


SAFE_FUNCTIONS = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "ceil": math.ceil,
    "floor": math.floor,
    "sqrt": math.sqrt,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "pow": math.pow,
}


def safe_eval_formula(
    expression: str,
    params: Dict[str, float],
    question_id: str = "",
) -> Tuple[Optional[float], Optional[CalculationException], List[Dict[str, Any]]]:
    trace: List[Dict[str, Any]] = []
    trace.append({
        "step": "input",
        "params": dict(params),
        "expression": expression,
    })
    if not expression or not isinstance(expression, str):
        exc = CalculationException(
            exception_type=ExceptionType.FORMULA_ERROR,
            question_id=question_id,
            message="公式表达式为空或格式错误",
            detail={"expression": expression},
            suggestion="请在题目清单中填写正确的公式表达式。"
        )
        return None, exc, trace
    used_vars = set()
    for k in params:
        if k in expression:
            used_vars.add(k)
    try:
        env = {"__builtins__": {}}
        env.update(SAFE_FUNCTIONS)
        for k, v in params.items():
            try:
                env[k] = float(v)
            except (TypeError, ValueError):
                exc = CalculationException(
                    exception_type=ExceptionType.FORMULA_ERROR,
                    question_id=question_id,
                    message=f"参数 {k} 的值无法转换为数字",
                    detail={"param": k, "value": v},
                    suggestion=f"请检查参数 {k} 是否为有效数字。"
                )
                return None, exc, trace
        result = eval(expression, env)
        trace.append({
            "step": "eval",
            "used_params": sorted(list(used_vars)),
            "result_raw": result,
        })
        try:
            result_float = float(result)
        except (TypeError, ValueError):
            exc = CalculationException(
                exception_type=ExceptionType.FORMULA_ERROR,
                question_id=question_id,
                message=f"公式计算结果不是数值类型",
                detail={"result_type": type(result).__name__, "result": str(result)},
                suggestion="请检查公式是否返回数值。"
            )
            return None, exc, trace
        trace.append({
            "step": "final",
            "result": result_float,
        })
        return result_float, None, trace
    except NameError as e:
        exc = CalculationException(
            exception_type=ExceptionType.FORMULA_ERROR,
            question_id=question_id,
            message=f"公式中引用了未定义的变量或函数：{e}",
            detail={"expression": expression, "available_params": list(params.keys())},
            suggestion="请确认公式中所有变量名在 input_params 中存在。"
        )
        return None, exc, trace
    except ZeroDivisionError:
        exc = CalculationException(
            exception_type=ExceptionType.FORMULA_ERROR,
            question_id=question_id,
            message="公式出现除零错误",
            detail={"expression": expression, "params": params},
            suggestion="请检查分母相关参数是否为零。"
        )
        return None, exc, trace
    except Exception as e:
        exc = CalculationException(
            exception_type=ExceptionType.FORMULA_ERROR,
            question_id=question_id,
            message=f"公式计算异常：{type(e).__name__} - {str(e)}",
            detail={"expression": expression},
            suggestion="请联系投研助理检查公式语法。"
        )
        return None, exc, trace
