from typing import List, Dict, Any, Optional, Tuple

from .models import MonitorRecord, ReagentRecord, AnomalyRecord


STANDARD_CURVE_DEFAULT_SLOPE = 0.0076
STANDARD_CURVE_DEFAULT_INTERCEPT = 0.002


def _safe_value(val: Optional[float], default: float = 0.0) -> float:
    return val if val is not None else default


def calculate_balance(
    monitor: MonitorRecord,
    reagents: List[ReagentRecord],
    curve_slope: Optional[float] = None,
    curve_intercept: Optional[float] = None,
) -> Dict[str, Any]:
    slope = curve_slope if curve_slope is not None else STANDARD_CURVE_DEFAULT_SLOPE
    intercept = curve_intercept if curve_intercept is not None else STANDARD_CURVE_DEFAULT_INTERCEPT

    blank = _safe_value(monitor.blank_control_value)
    sample = _safe_value(monitor.sample_value)
    corrected_abs = max(sample - blank, 0.0)

    if slope != 0:
        concentration = corrected_abs / slope
    else:
        concentration = 0.0

    dilution_factor = 1.0
    notes = []
    if concentration > 2.0:
        dilution_factor = 5.0
        notes.append("浓度超过线性范围上限，建议按1:5稀释后重测")
    elif concentration > 1.0:
        dilution_factor = 2.0
        notes.append("浓度接近线性范围上限，建议按1:2稀释确认")

    reagent_cost = {}
    for rid in monitor.reagent_ids:
        r = next((x for x in reagents if x.reagent_id == rid), None)
        if r and r.volume_used:
            reagent_cost[r.name] = {
                "volume_used": r.volume_used,
                "unit": r.volume_unit or "mL",
                "cost_per_sample": r.volume_used,
            }

    uncertainty = 0.0
    if concentration > 0:
        uncertainty = concentration * 0.05
        notes.append("不确定度按5%估算（实际需根据本实验室验证数据）")

    return {
        "sample_id": monitor.sample_id,
        "sample_name": monitor.sample_name,
        "blank_absorbance": blank,
        "blank_unit": monitor.blank_control_unit or "A",
        "sample_absorbance": sample,
        "sample_unit": monitor.sample_unit or "A",
        "corrected_absorbance": round(corrected_abs, 4),
        "standard_curve": {
            "slope": slope,
            "intercept": intercept,
            "source": "使用本实验室默认参数（建议填入实际标曲编号对应数值）",
        },
        "concentration_mg_l": round(concentration, 3),
        "concentration_unit": "mg/L",
        "dilution_factor": dilution_factor,
        "reagent_cost_summary": reagent_cost,
        "uncertainty_mg_l": round(uncertainty, 4),
        "calculation_notes": notes,
        "formula": "浓度(mg/L) = (样品吸光度 - 空白吸光度) / 标曲斜率",
    }


def generate_retest_plan(
    monitor: MonitorRecord,
    anomaly: AnomalyRecord,
    balance: Dict[str, Any],
) -> Dict[str, Any]:
    plan = {
        "sample_id": monitor.sample_id,
        "sample_name": monitor.sample_name,
        "anomaly_type": anomaly.anomaly_type,
        "anomaly_summary": anomaly.description,
        "need_retest": False,
        "retest_priority": "none",
        "retest_method": "",
        "required_reagents": [],
        "required_volume_ml": 0,
        "quality_control": [],
        "documentation_required": [],
        "estimated_time_min": 0,
    }

    if anomaly.anomaly_type == "BLANK_CONTROL_MISSING":
        plan["need_retest"] = True
        plan["retest_priority"] = "high"
        plan["retest_method"] = "重新做空白对照 + 原样复测"
        plan["required_reagents"] = ["无氨纯水", "纳氏试剂", "酒石酸钾钠溶液"]
        plan["required_volume_ml"] = 50
        plan["quality_control"] = [
            "做3个平行空白，RSD应<5%",
            "同时带一个已知浓度的质控样",
        ]
        plan["documentation_required"] = [
            "新空白测定原始记录",
            "复测结果与原结果对比表",
            "偏差原因分析说明",
        ]
        plan["estimated_time_min"] = 45

    elif anomaly.anomaly_type == "BLANK_CONTROL_ABNORMAL":
        plan["need_retest"] = True
        plan["retest_priority"] = "high"
        plan["retest_method"] = "更换纯水/试剂后重做空白，确认正常后复测样品"
        plan["required_reagents"] = ["新鲜无氨纯水", "纳氏试剂（新开瓶）", "酒石酸钾钠溶液"]
        plan["required_volume_ml"] = 80
        plan["quality_control"] = [
            "新旧纯水空白对比",
            "新旧纳氏试剂空白对比",
            "带质控样验证",
        ]
        plan["documentation_required"] = [
            "排查过程记录（纯水、试剂、器皿逐一验证）",
            "各条件下空白对比表",
            "最终复测结果",
        ]
        plan["estimated_time_min"] = 90

    elif anomaly.anomaly_type == "REAGENT_EXPIRED":
        plan["need_retest"] = True
        plan["retest_priority"] = "high"
        plan["retest_method"] = "更换有效期内新试剂，重新做标曲和样品"
        plan["required_reagents"] = ["新批次纳氏试剂", "新批次酒石酸钾钠", "氨氮标准使用液"]
        plan["required_volume_ml"] = 100
        plan["quality_control"] = [
            "新标曲相关系数r≥0.999",
            "双样平行偏差≤10%",
            "质控样回收率90%-110%",
        ]
        plan["documentation_required"] = [
            "新试剂台账登记记录",
            "新标曲原始数据和曲线图",
            "新旧结果对比及偏差说明",
            "原记录标注'作废'并签字",
        ]
        plan["estimated_time_min"] = 120

    elif anomaly.anomaly_type == "REAGENT_NOT_LOGGED":
        plan["need_retest"] = False
        plan["retest_priority"] = "low"
        plan["retest_method"] = "补录试剂信息，无需复测"
        plan["required_reagents"] = []
        plan["required_volume_ml"] = 0
        plan["quality_control"] = ["核对待补录试剂是否仍在有效期内"]
        plan["documentation_required"] = [
            "试剂领用登记本核对记录",
            "补录后的检测记录",
        ]
        plan["estimated_time_min"] = 15

    elif anomaly.anomaly_type == "UNIT_MISSING":
        plan["need_retest"] = False
        plan["retest_priority"] = "low"
        plan["retest_method"] = "补填单位，无需复测"
        plan["required_reagents"] = []
        plan["required_volume_ml"] = 0
        plan["quality_control"] = ["确认同批次其他记录单位一致"]
        plan["documentation_required"] = ["补填单位后的原始记录"]
        plan["estimated_time_min"] = 5

    elif anomaly.anomaly_type in ("OPERATOR_MISSING", "REVIEWER_MISSING"):
        plan["need_retest"] = False
        plan["retest_priority"] = "low"
        what = "检测人" if anomaly.anomaly_type == "OPERATOR_MISSING" else "审核人"
        plan["retest_method"] = f"补填{what}签字，无需复测"
        plan["required_reagents"] = []
        plan["required_volume_ml"] = 0
        plan["quality_control"] = []
        plan["documentation_required"] = [f"补填{what}签字后的原始记录"]
        plan["estimated_time_min"] = 5

    elif anomaly.anomaly_type == "REMARK_INCOMPLETE":
        plan["need_retest"] = False
        plan["retest_priority"] = "info"
        plan["retest_method"] = "把备注写完整，无需复测"
        plan["required_reagents"] = []
        plan["required_volume_ml"] = 0
        plan["quality_control"] = []
        plan["documentation_required"] = ["补充完整的备注说明"]
        plan["estimated_time_min"] = 10

    elif anomaly.anomaly_type == "STANDARD_CURVE_MISSING":
        plan["need_retest"] = False
        plan["retest_priority"] = "medium"
        plan["retest_method"] = "查找并补填标曲编号；若标曲丢失则重做"
        plan["required_reagents"] = ["氨氮标准使用液"] if not balance.get("standard_curve", {}).get("source", "").find("默认") == -1 else []
        plan["required_volume_ml"] = 50 if plan["required_reagents"] else 0
        plan["quality_control"] = [
            "确认标曲日期与检测日期一致（前后3天内）",
            "标曲相关系数r≥0.999",
        ]
        plan["documentation_required"] = [
            "找到的标曲原始记录复印件",
            "补填编号后的检测记录",
        ]
        if plan["required_reagents"]:
            plan["documentation_required"].append("重新制作的标曲数据及图谱")
            plan["estimated_time_min"] = 60
        else:
            plan["estimated_time_min"] = 15

    if balance.get("calculation_notes"):
        for note in balance["calculation_notes"]:
            if "稀释" in note and plan["need_retest"]:
                plan["retest_method"] += "（" + note + "）"

    return plan


def process_batch_calculations(
    monitors: List[MonitorRecord],
    reagents: List[ReagentRecord],
    anomalies: List[AnomalyRecord],
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    balance_results: Dict[str, Dict[str, Any]] = {}
    retest_plans: Dict[str, List[Dict[str, Any]]] = {}

    for monitor in monitors:
        balance = calculate_balance(monitor, reagents)
        balance_results[monitor.record_id] = balance

    for anomaly in anomalies:
        monitor = next((m for m in monitors if m.record_id == anomaly.monitor_record_id), None)
        if monitor:
            balance = balance_results.get(monitor.record_id, {})
            plan = generate_retest_plan(monitor, anomaly, balance)
            if anomaly.balance_calc is None:
                anomaly.balance_calc = balance
            if anomaly.retest_suggestion is None or anomaly.retest_suggestion == "":
                if plan.get("retest_method"):
                    anomaly.retest_suggestion = plan["retest_method"]

            if anomaly.monitor_record_id not in retest_plans:
                retest_plans[anomaly.monitor_record_id] = []
            retest_plans[anomaly.monitor_record_id].append(plan)

    return balance_results, retest_plans
