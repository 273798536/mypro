import json
import math
import random
import numpy as np
from sqlalchemy.orm import Session
from app.models import ErrorAnalysis, QuestionItem, CounterExample
from app.config import settings
from typing import List, Optional, Dict


def _parse_kkt_params(q: QuestionItem) -> dict:
    try:
        if q.kkt_params_json:
            return json.loads(q.kkt_params_json)
    except (json.JSONDecodeError, TypeError):
        pass
    return {}


def _safe_float(v, default=0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except (ValueError, TypeError):
        return default


def analyze_kkt_error(params: dict) -> dict:
    """
    对单题 KKT 参数进行误差分析。
    KKT 条件四项：平稳性、原始可行性、对偶可行性、互补松弛。
    此处基于参数数值扰动的近似模拟计算各项误差。
    """
    lagrangian_grad = _safe_float(params.get("lagrangian_gradient") or params.get("梯度范数"))
    primal_constraint = _safe_float(params.get("primal_constraint") or params.get("原始约束偏差"))
    dual_multiplier = _safe_float(params.get("dual_multiplier") or params.get("对偶乘子"))
    complementarity = _safe_float(params.get("complementarity") or params.get("互补松弛残差"))

    base = 1.0
    stationarity_err = min(abs(lagrangian_grad) / base, 2.0)
    primal_err = min(abs(primal_constraint) / base, 2.0)
    dual_err = min(max(0.0, -dual_multiplier) / base, 2.0)
    comp_err = min(abs(complementarity) / base, 2.0)

    violation = (stationarity_err + primal_err + dual_err + comp_err) / 4.0

    weights = params.get("weights")
    if isinstance(weights, (list, tuple)) and len(weights) >= 4:
        try:
            w = [float(x) for x in weights[:4]]
            s = sum(w) or 1.0
            violation = (
                w[0] * stationarity_err + w[1] * primal_err +
                w[2] * dual_err + w[3] * comp_err
            ) / s
        except (ValueError, TypeError):
            pass

    is_excessive = violation >= settings.ERROR_THRESHOLD_CRITICAL

    detail_parts = []
    if stationarity_err >= settings.ERROR_THRESHOLD_WARN:
        detail_parts.append(f"平稳性误差较高({stationarity_err:.3f})，梯度不接近零，可能需要复核目标函数与约束构造")
    if primal_err >= settings.ERROR_THRESHOLD_WARN:
        detail_parts.append(f"原始可行性偏差较大({primal_err:.3f})，解可能不满足约束")
    if dual_err >= settings.ERROR_THRESHOLD_WARN:
        detail_parts.append(f"对偶可行性异常({dual_err:.3f})，存在负乘子，请核对不等式约束方向")
    if comp_err >= settings.ERROR_THRESHOLD_WARN:
        detail_parts.append(f"互补松弛残差偏大({comp_err:.3f})，请检查活跃约束识别")
    if not detail_parts:
        detail_parts.append("各项 KKT 条件误差在允许范围内")

    return {
        "stationarity_error": round(stationarity_err, 6),
        "primal_feasibility_error": round(primal_err, 6),
        "dual_feasibility_error": round(dual_err, 6),
        "complementarity_error": round(comp_err, 6),
        "overall_error": round(violation, 6),
        "kkt_violation_degree": round(violation, 6),
        "is_excessive": is_excessive,
        "analysis_detail": "；".join(detail_parts)
    }


def run_error_analysis(db: Session, batch_id: int) -> List[ErrorAnalysis]:
    questions = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).all()
    results: List[ErrorAnalysis] = []

    db.query(ErrorAnalysis).filter(ErrorAnalysis.batch_id == batch_id).delete()
    db.commit()

    for q in questions:
        params = _parse_kkt_params(q)
        if not params:
            mock = {
                "lagrangian_gradient": random.uniform(0, 0.2),
                "primal_constraint": random.uniform(0, 0.15),
                "dual_multiplier": random.uniform(-0.05, 0.3),
                "complementarity": random.uniform(0, 0.1)
            }
            analysis = analyze_kkt_error(mock)
            analysis["analysis_detail"] = "(基于默认模拟参数) " + analysis["analysis_detail"]
        else:
            analysis = analyze_kkt_error(params)

        ea = ErrorAnalysis(
            batch_id=batch_id,
            question_id=q.id,
            **analysis
        )
        db.add(ea)
        results.append(ea)

    db.commit()
    for ea in results:
        db.refresh(ea)
    return results


def list_error_analyses(db: Session, batch_id: int, only_excessive: bool = False,
                         skip: int = 0, limit: int = 200) -> List[ErrorAnalysis]:
    from sqlalchemy.orm import joinedload
    query = db.query(ErrorAnalysis).options(joinedload(ErrorAnalysis.question)).filter(
        ErrorAnalysis.batch_id == batch_id
    )
    if only_excessive:
        query = query.filter(ErrorAnalysis.is_excessive == True)
    return query.order_by(ErrorAnalysis.overall_error.desc()).offset(skip).limit(limit).all()


def get_error_distribution(db: Session, batch_id: int) -> Dict:
    eas = list_error_analyses(db, batch_id, limit=10000)
    bins = {
        "<0.01": 0,
        "0.01-0.05": 0,
        "0.05-0.15": 0,
        ">=0.15": 0
    }
    total = len(eas)
    excessive = 0
    sum_err = 0.0
    for ea in eas:
        v = ea.overall_error or 0.0
        sum_err += v
        if v >= settings.ERROR_THRESHOLD_CRITICAL:
            excessive += 1
        if v < 0.01:
            bins["<0.01"] += 1
        elif v < settings.ERROR_THRESHOLD_WARN:
            bins["0.01-0.05"] += 1
        elif v < settings.ERROR_THRESHOLD_CRITICAL:
            bins["0.05-0.15"] += 1
        else:
            bins[">=0.15"] += 1
    return {
        "total": total,
        "excessive_count": excessive,
        "average_error": round(sum_err / total, 6) if total > 0 else 0.0,
        "distribution": bins,
        "warn_threshold": settings.ERROR_THRESHOLD_WARN,
        "critical_threshold": settings.ERROR_THRESHOLD_CRITICAL
    }


def generate_counter_examples(db: Session, question_id: int) -> List[CounterExample]:
    q = db.query(QuestionItem).filter(QuestionItem.id == question_id).first()
    if not q:
        return []

    db.query(CounterExample).filter(CounterExample.question_id == question_id).delete()
    db.commit()

    params = _parse_kkt_params(q)
    examples: List[CounterExample] = []

    e1 = CounterExample(
        question_id=question_id,
        example_content=f"反例1：若梯度∇L = [{_safe_float(params.get('lagrangian_gradient')):.3f}, ...] 不趋近于 0，则该点不满足 KKT 平稳性条件。请回查题目 {q.question_code} 的目标函数与约束构造是否正确。",
        source_reference=q.source_remark or f"题目清单第{q.original_row_no}行",
        explanation="该反例对应 KKT 条件中的平稳性要求：拉格朗日函数梯度在最优解处应为零向量。"
    )
    db.add(e1)
    examples.append(e1)

    e2 = CounterExample(
        question_id=question_id,
        example_content=f"反例2：若存在不等式约束 g_i(x*) < 0 且对应乘子 λ_i = {_safe_float(params.get('dual_multiplier')):.3f} ≠ 0，则违反互补松弛条件，该点不是最优解。请回查题目 {q.question_code} 的活跃约束识别。",
        source_reference=q.image_name or f"题目清单第{q.original_row_no}行",
        explanation="该反例对应 KKT 条件中的互补松弛：λ_i · g_i(x*) = 0，两者不同时为正。"
    )
    db.add(e2)
    examples.append(e2)

    if params.get("dual_multiplier") and _safe_float(params.get("dual_multiplier")) < 0:
        e3 = CounterExample(
            question_id=question_id,
            example_content=f"反例3：对偶乘子 λ_i = {_safe_float(params.get('dual_multiplier')):.3f} 为负，不满足 λ_i ≥ 0，说明约束方向可能取反或该点不可行。",
            source_reference=f"参数表对应记录",
            explanation="该反例对应 KKT 条件中的对偶可行性：不等式约束的拉格朗日乘子非负。"
        )
        db.add(e3)
        examples.append(e3)

    db.commit()
    for ex in examples:
        db.refresh(ex)
    return examples


def list_counter_examples(db: Session, question_id: int) -> List[CounterExample]:
    return db.query(CounterExample).filter(CounterExample.question_id == question_id).order_by(
        CounterExample.created_at.desc()
    ).all()
