from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime

ALLOWED_UNITS = {"个", "万元", "元", "%", "‰", "天", "小时", "次", "人", "平方米", "公里", "吨", "件", "箱"}

STATUS_FLOW = {
    "pending_review": ["reviewing", "rejected", "blocked"],
    "reviewing": ["confirmed", "rejected", "blocked", "pending_review"],
    "confirmed": ["exported", "reopened"],
    "rejected": ["reopened", "reviewing"],
    "blocked": ["reopened", "reviewing"],
    "reopened": ["reviewing", "rejected", "blocked"],
    "exported": []
}

BLOCK_REASON_NO_UNIT = "单位缺失：该记录缺少计量单位，无法进行跨记录汇总对比，已被拦截。请补录单位后再提交复核。"
BLOCK_REASON_NO_VALUE = "数值缺失：该记录缺少核心数值字段，无法参与计算。"
BLOCK_REASON_INVALID_VALUE = "数值格式异常：该记录的数值字段无法解析为有效数字。"
BLOCK_REASON_DUPLICATE = "重复记录：同一批次中存在同名候选且数值完全一致。"


def validate_record(raw: Dict[str, Any], row_no: Optional[int] = None) -> Tuple[bool, str, Dict[str, Any]]:
    issues = []
    cleaned: Dict[str, Any] = {
        "row_no": row_no,
        "candidate_name": None,
        "value": None,
        "unit": None,
        "raw_data": raw,
        "is_boundary": False,
    }

    for key in raw:
        k = key.strip().lower()
        if k in ("name", "候选", "候选名称", "名称", "candidate", "candidate_name"):
            cleaned["candidate_name"] = str(raw[key]).strip() if raw[key] is not None else None
        elif k in ("value", "数值", "值", "金额", "数量"):
            try:
                if raw[key] is not None and str(raw[key]).strip() != "":
                    cleaned["value"] = float(raw[key])
            except (ValueError, TypeError):
                issues.append(("value_invalid", BLOCK_REASON_INVALID_VALUE))
        elif k in ("unit", "单位", "计量单位"):
            u = str(raw[key]).strip() if raw[key] is not None else ""
            cleaned["unit"] = u if u else None
        elif k in ("boundary", "边界", "边界样例", "is_boundary"):
            v = raw[key]
            cleaned["is_boundary"] = bool(v) if v not in (None, "") else False

    if cleaned["candidate_name"] is None or cleaned["candidate_name"] == "":
        cleaned["candidate_name"] = f"第{row_no}行记录" if row_no else "未命名候选"

    if cleaned["value"] is None:
        issues.append(("value_missing", BLOCK_REASON_NO_VALUE))

    if cleaned["unit"] is None or cleaned["unit"] == "":
        issues.append(("unit_missing", BLOCK_REASON_NO_UNIT))

    is_valid = len(issues) == 0
    block_reason = "；".join([detail for _, detail in issues]) if issues else ""

    return is_valid, block_reason, cleaned


def can_transition(from_status: str, to_status: str) -> bool:
    if from_status == to_status:
        return True
    allowed = STATUS_FLOW.get(from_status, [])
    return to_status in allowed


def describe_status(status: str) -> str:
    mapping = {
        "pending_review": "待复核",
        "reviewing": "复核中",
        "confirmed": "已确认",
        "rejected": "已驳回",
        "blocked": "已拦截",
        "reopened": "已重开",
        "exported": "已导出",
        "imported": "已导入",
        "processing": "处理中",
        "completed": "已完成",
    }
    return mapping.get(status, status)


def evaluate_formula(expr: str, context: Dict[str, Any]) -> Optional[float]:
    if not expr or not expr.strip():
        return None
    try:
        safe_dict = {"__builtins__": {}}
        safe_dict.update({k: v for k, v in context.items() if isinstance(v, (int, float))})
        result = eval(expr, safe_dict, {})
        return float(result) if result is not None else None
    except Exception:
        return None


def format_block_reason_for_report(reason: str) -> str:
    if not reason:
        return ""
    parts = []
    if "单位缺失" in reason:
        parts.append("【单位缺失】记录缺少计量单位，导致无法与其他记录统一口径汇总，因此被系统自动拦截。请在补录完整单位后重新提交复核。")
    if "数值缺失" in reason:
        parts.append("【数值缺失】核心数值字段为空，无法参与候选计算与排名。")
    if "数值格式异常" in reason:
        parts.append("【数值格式异常】数值字段无法解析为有效数字，请检查数据格式。")
    if "重复记录" in reason:
        parts.append("【重复记录】同一批次内存在同名且数值完全一致的重复记录。")
    return "\n".join(parts) if parts else reason
