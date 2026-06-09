from app.models import Batch, CalculationRecord, ExperimentRecord, TemperatureCurve, TemperatureUnit
from app.utils.temperature_utils import to_celsius
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List


def calculate_decay_rate(initial_activity: float, final_activity: float,
                          time_hours: float = None) -> Dict:
    result = {
        "before": {"decay_rate": None, "formula": "原始数据"},
        "after": {"decay_rate": None, "formula": ""},
        "difference": None
    }

    if initial_activity is None or final_activity is None:
        return result

    raw_decay = None
    if initial_activity > 0:
        raw_decay = (initial_activity - final_activity) / initial_activity * 100

    result["before"]["decay_rate"] = raw_decay

    normalized_initial = max(0.01, float(initial_activity))
    normalized_final = max(0, min(float(final_activity), normalized_initial))
    calc_decay = (normalized_initial - normalized_final) / normalized_initial * 100

    if time_hours and time_hours > 0:
        per_hour = calc_decay / float(time_hours)
        result["after"]["decay_rate"] = calc_decay
        result["after"]["formula"] = f"配平后衰减率={calc_decay:.2f}%, 单位时间衰减={per_hour:.4f}%/h"
    else:
        result["after"]["decay_rate"] = calc_decay
        result["after"]["formula"] = f"配平后衰减率={calc_decay:.2f}%"

    if raw_decay is not None:
        result["difference"] = f"原始衰减率={raw_decay:.2f}%, 配平后={calc_decay:.2f}%, 差值={abs(calc_decay - raw_decay):.4f}%"
    else:
        result["difference"] = f"配平后衰减率={calc_decay:.2f}%"

    return result


def perform_balance_calculation(db: Session, batch_id: int, operator: str = None) -> List[CalculationRecord]:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"批次ID {batch_id} 不存在")

    records = []
    experiments = db.query(ExperimentRecord).filter(
        ExperimentRecord.batch_id == batch_id
    ).all()

    for exp in experiments:
        decay_result = calculate_decay_rate(exp.initial_activity, exp.final_activity)

        calc = CalculationRecord(
            batch_id=batch_id,
            calculation_type="decay_rate_calculation",
            before_value=f"记录编号={exp.record_no}, 初始活性={exp.initial_activity}, 最终活性={exp.final_activity}, 原始衰减率={exp.decay_rate}",
            after_value=decay_result["after"]["formula"],
            difference=decay_result["difference"],
            reason="活性衰减率配平计算: 归一化处理初末活性, 避免除零和负值异常",
            operator=operator
        )
        db.add(calc)
        records.append(calc)

    temp_stats = analyze_temperature_consistency(db, batch_id)
    if temp_stats:
        calc_temp = CalculationRecord(
            batch_id=batch_id,
            calculation_type="temperature_consistency",
            before_value=temp_stats["before"],
            after_value=temp_stats["after"],
            difference=temp_stats["difference"],
            reason=temp_stats["reason"],
            operator=operator
        )
        db.add(calc_temp)
        records.append(calc_temp)

    db.commit()
    return records


def analyze_temperature_consistency(db: Session, batch_id: int) -> Dict:
    curves = db.query(TemperatureCurve).filter(
        TemperatureCurve.batch_id == batch_id
    ).order_by(TemperatureCurve.time_point.asc()).all()

    if not curves:
        return None

    unit_counts = {}
    celsius_values = []
    raw_descriptions = []

    for c in curves:
        unit = c.temperature_unit.value if c.temperature_unit else "unknown"
        unit_counts[unit] = unit_counts.get(unit, 0) + 1
        if c.temperature_value is not None:
            celsius_val = to_celsius(c.temperature_value, c.temperature_unit)
            if celsius_val is not None:
                celsius_values.append(celsius_val)
        if c.temperature_raw:
            raw_descriptions.append(f"{c.time_point}h: {c.temperature_raw}")

    before = f"温度单位分布: {unit_counts}, 原始数据: {', '.join(raw_descriptions[:5])}"

    if len(unit_counts) > 1:
        after = f"已统一换算为摄氏度(°C), 共{len(celsius_values)}个有效数据点"
        reason = f"检测到温度单位混用: {unit_counts}. 已全部转换为摄氏度进行比较分析"
        diff = f"混合单位点数: {sum(unit_counts.values())}, 统一后有效温度点: {len(celsius_values)}"
    else:
        after = f"温度单位一致: {list(unit_counts.keys())[0]}, 共{len(celsius_values)}个数据点"
        reason = "温度单位统一, 无需转换"
        diff = "无单位差异"

    if celsius_values:
        avg_temp = sum(celsius_values) / len(celsius_values)
        after += f", 平均温度={avg_temp:.1f}°C, 范围={min(celsius_values):.1f}~{max(celsius_values):.1f}°C"

    return {
        "before": before,
        "after": after,
        "difference": diff,
        "reason": reason
    }


def get_calculation_history(db: Session, batch_id: int) -> List[CalculationRecord]:
    return db.query(CalculationRecord).filter(
        CalculationRecord.batch_id == batch_id
    ).order_by(CalculationRecord.calculated_at.desc()).all()
