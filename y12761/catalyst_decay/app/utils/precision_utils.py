import re


def _parse_decimal_places_from_precision(precision_str: str) -> int:
    if not precision_str:
        return None
    s = str(precision_str).strip()

    dot_match = re.search(r"0\.(\d+)", s)
    if dot_match:
        return len(dot_match.group(1))

    num_match = re.search(r"(\d+)", s)
    if num_match:
        val = int(num_match.group(1))
        if val > 0 and val <= 10:
            return val

    if "万分之一" in s or "0.0001" in s:
        return 4
    if "千分之一" in s or "0.001" in s:
        return 3
    if "百分之一" in s or "0.01" in s:
        return 2
    if "十分之一" in s or "0.1" in s:
        return 1

    return None


def check_weighing_precision(weight_value: float, precision_str: str = None, unit: str = "g") -> list:
    issues = []
    if weight_value is None:
        issues.append("样品称量值缺失")
        return issues

    decimal_places = None
    if precision_str:
        decimal_places = _parse_decimal_places_from_precision(precision_str)

    if decimal_places is None:
        weight_str = f"{weight_value:.10f}".rstrip('0').rstrip('.')
        if '.' in weight_str:
            decimal_places = len(weight_str.split('.')[1])
        else:
            decimal_places = 0

    if decimal_places is not None:
        if unit == "g" and decimal_places < 3:
            issues.append(
                f"称量精度不足: 当前数据精度为小数点后{decimal_places}位, "
                f"催化剂活性实验要求至少精确到0.001g(小数点后3位). "
                f"请使用万分之一以上精度天平重新称量或补录原始称量记录"
            )
        elif unit == "mg" and decimal_places < 0:
            issues.append("称量精度不足: 毫克(mg)级称量应至少精确到整数位")

    return issues


def human_readable_precision_issue(weight_value: float, unit: str = "g") -> str:
    weight_str = f"{weight_value:.10f}".rstrip('0').rstrip('.')
    if '.' in weight_str:
        actual_places = len(weight_str.split('.')[1])
    else:
        actual_places = 0

    if unit == "g":
        if actual_places == 0:
            return f"样品质量记录为{weight_value}g, 仅精确到克, 缺少小数点后数字, 可能是抄录时省略了小数部分"
        elif actual_places == 1:
            return f"样品质量记录为{weight_value}g, 只保留了1位小数(精确到0.1g), 实验需要精确到0.001g, 请补充称量原始数据"
        elif actual_places == 2:
            return f"样品质量记录为{weight_value}g, 只保留了2位小数(精确到0.01g), 可能使用了精度较低的天平, 请核对原始称量记录"
        else:
            return f"样品质量记录为{weight_value}g, 精度满足要求"
    else:
        return f"样品质量记录为{weight_value}{unit}, 请确认称量精度是否满足实验要求"


def human_readable_unit_mixed_issue(raw_value: str, file_name: str, sheet_name: str, row_num: int) -> str:
    return (
        f"温度单位不一致: 发现数据 '{raw_value}' "
        f"(来源文件: {file_name}, 工作表: {sheet_name}, 第{row_num}行). "
        f"请统一将温度单位换算为摄氏度(°C)后再进行数据汇总, "
        f"或在原始数据中明确标注使用的温度单位"
    )


def human_readable_missing_field(field_name: str, file_name: str, sheet_name: str, row_num: int) -> str:
    field_cn_map = {
        "sample_weight": "样品质量",
        "reaction_temperature": "反应温度",
        "initial_activity": "初始活性",
        "final_activity": "最终活性",
        "experiment_date": "实验日期",
        "record_no": "记录编号",
        "weighing_precision": "称量精度",
        "space_velocity": "空速",
        "reaction_condition": "反应条件"
    }
    field_cn = field_cn_map.get(field_name, field_name)
    return (
        f"必填字段缺失: '{field_cn}' 为空 "
        f"(来源文件: {file_name}, 工作表: {sheet_name}, 第{row_num}行). "
        f"请补录该数据后再提交复核"
    )
