#!/usr/bin/env python3
import json
import sys
import os
import math
from datetime import datetime


def load_input(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def is_empty_matrix(data):
    if data is None:
        return True
    if isinstance(data, list):
        if len(data) == 0:
            return True
        if all(isinstance(row, list) and len(row) == 0 for row in data):
            return True
    return False


def check_units(meta, param_label, original_st_source):
    units = meta.get("units", None)
    if units is None or units == "":
        print(f"[单位缺失追踪] 参数组 {param_label}: 原始来源 {original_st_source} 未指定单位")
        print(f"  ↳ 计算草稿原始说法: '数据输入时单位字段可留空，留空则按无量纲处理'")
        print(f"  ↳ 本链路判断: 视为无量纲 (dimensionless)，不参与单位换算")
        return "dimensionless"
    return units


def matrix_to_nested_list(matrix_data):
    if isinstance(matrix_data, dict):
        rows = matrix_data.get("rows", [])
        return [row.get("values", []) for row in rows]
    return matrix_data


def frobenius_norm(M):
    return math.sqrt(sum(x * x for row in M for x in row))


def invert_2x2(M):
    a, b = M[0][0], M[0][1]
    c, d = M[1][0], M[1][1]
    det = a * d - b * c
    if abs(det) < 1e-12:
        return None
    inv_det = 1.0 / det
    return [
        [d * inv_det, -b * inv_det],
        [-c * inv_det, a * inv_det],
    ]


def condition_number_2x2(M, M_inv):
    norm_M = frobenius_norm(M)
    norm_Minv = frobenius_norm(M_inv)
    return norm_M * norm_Minv


def unit_conversion(value, from_unit, to_unit):
    print(f"  [单位换算] {value} {from_unit} → {to_unit}")
    if from_unit == to_unit:
        return value
    factors = {
        ("mm", "m"): 0.001,
        ("m", "mm"): 1000.0,
        ("cm", "m"): 0.01,
        ("m", "cm"): 100.0,
    }
    key = (from_unit, to_unit)
    if key in factors:
        factor = factors[key]
        result = value * factor
        print(f"    换算系数: {factor}, 结果: {result} {to_unit}")
        return result
    print(f"    无换算规则，保持原值")
    return value


def process_param_group(group_data, group_label):
    result = {
        "label": group_label,
        "is_empty_input": False,
        "empty_set_decision": "",
        "condition_number": None,
        "norm": None,
        "matrix_shape": [0, 0],
        "matrix_values": [],
        "intermediate_steps": [],
        "unit_used": "",
        "unit_warning_detail": "",
    }

    meta = group_data.get("meta", {})
    original_source = group_data.get("original_st_source", "unknown")

    unit = check_units(meta, group_label, original_source)
    result["unit_used"] = unit
    if unit == "dimensionless":
        result["unit_warning_detail"] = (
            f"原始来源 {original_source} 单位字段为空;"
            f" 计算草稿说法:'数据输入时单位字段可留空，留空则按无量纲处理'"
        )

    matrix_raw = group_data.get("matrix", None)
    M = matrix_to_nested_list(matrix_raw)

    if is_empty_matrix(M):
        result["is_empty_input"] = True
        result["empty_set_decision"] = (
            "空集合判定: 输入为空矩阵或空列表;"
            " 处理链判断: 空集合视为合法输入，条件数记为 N/A，"
            " 统计时计入'空输入样本'分类，不参与数值平均。"
        )
        result["intermediate_steps"].append("检测到空集合输入")
        result["intermediate_steps"].append("执行空集合分支: 标记 is_empty_input=True")
        result["intermediate_steps"].append("条件数赋值 N/A，跳过矩阵求逆")
        return result

    rows = len(M)
    cols = len(M[0]) if rows > 0 else 0
    result["matrix_shape"] = [rows, cols]
    result["matrix_values"] = M

    target_unit = "m"
    M_converted = []
    for row in M:
        new_row = []
        for v in row:
            new_val = unit_conversion(v, unit, target_unit)
            new_row.append(new_val)
        M_converted.append(new_row)
    result["intermediate_steps"].append(f"矩阵原始值: {M}")
    result["intermediate_steps"].append(f"单位换算 ({unit} → {target_unit}): {M_converted}")

    if rows == 2 and cols == 2:
        M_inv = invert_2x2(M_converted)
        if M_inv is None:
            result["condition_number"] = float("inf")
            result["intermediate_steps"].append("矩阵奇异，行列式≈0，条件数记为 inf")
        else:
            cn = condition_number_2x2(M_converted, M_inv)
            result["condition_number"] = cn
            result["norm"] = frobenius_norm(M_converted)
            result["intermediate_steps"].append(f"矩阵逆: {M_inv}")
            result["intermediate_steps"].append(f"||M||_F = {result['norm']}")
            result["intermediate_steps"].append(f"||M^-1||_F = {frobenius_norm(M_inv)}")
            result["intermediate_steps"].append(f"cond(M) = ||M|| * ||M^-1|| = {cn}")
    else:
        result["intermediate_steps"].append(
            f"当前脚本仅内置 2x2 精确求逆，收到 {rows}x{cols} 矩阵，条件数暂记 N/A"
        )

    return result


def build_report(results, filter_conditions):
    valid_cns = [
        r["condition_number"]
        for r in results
        if r["condition_number"] is not None and r["condition_number"] != float("inf")
    ]
    empty_count = sum(1 for r in results if r["is_empty_input"])
    inf_count = sum(1 for r in results if r["condition_number"] == float("inf"))

    stats = {
        "total_samples": len(results),
        "empty_input_samples": empty_count,
        "valid_numeric_samples": len(valid_cns),
        "singular_matrix_samples": inf_count,
        "condition_number_avg": sum(valid_cns) / len(valid_cns) if valid_cns else 0.0,
        "condition_number_max": max(valid_cns) if valid_cns else 0.0,
        "condition_number_min": min(valid_cns) if valid_cns else 0.0,
    }

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "filter_conditions": filter_conditions,
        "statistics": stats,
        "detail_rows": [],
        "screenshot_explanation_keys": [
            "statistics.condition_number_avg",
            "statistics.empty_input_samples",
            "detail_rows[*].empty_set_decision",
            "detail_rows[*].unit_warning_detail",
            "detail_rows[*].intermediate_steps",
        ],
    }

    for r in results:
        report["detail_rows"].append(
            {
                "label": r["label"],
                "is_empty_input": r["is_empty_input"],
                "matrix_shape": r["matrix_shape"],
                "unit_used": r["unit_used"],
                "unit_warning_detail": r["unit_warning_detail"],
                "condition_number": (
                    "inf" if r["condition_number"] == float("inf") else r["condition_number"]
                ),
                "empty_set_decision": r["empty_set_decision"],
                "intermediate_steps": r["intermediate_steps"],
            }
        )

    return report


def main():
    input_path = sys.argv[1] if len(sys.argv) > 1 else "input/matrix_inputs.json"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
    os.makedirs(output_dir, exist_ok=True)

    print(f"读取输入: {input_path}")
    payload = load_input(input_path)

    filter_conditions = payload.get("filter_conditions", {})
    param_groups = payload.get("param_groups", [])

    print(f"筛选条件: {json.dumps(filter_conditions, ensure_ascii=False)}")

    results = []
    for group in param_groups:
        label = group.get("label", "unnamed")
        print(f"\n===== 处理参数组: {label} =====")
        r = process_param_group(group, label)
        results.append(r)

    report = build_report(results, filter_conditions)

    out_path = os.path.join(output_dir, "condition_number_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    txt_path = os.path.join(output_dir, "condition_number_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("矩阵条件数图表解释 —— 计算结果报告\n")
        f.write("=" * 50 + "\n")
        f.write(f"生成时间: {report['generated_at']}\n\n")
        f.write("【筛选条件】\n")
        for k, v in report["filter_conditions"].items():
            f.write(f"  {k}: {v}\n")
        f.write("\n【统计数字】\n")
        for k, v in report["statistics"].items():
            f.write(f"  {k}: {v}\n")
        f.write("\n【明细表】\n")
        for row in report["detail_rows"]:
            f.write("-" * 40 + "\n")
            f.write(f"参数组: {row['label']}\n")
            f.write(f"  是否空输入: {row['is_empty_input']}\n")
            f.write(f"  矩阵形状: {row['matrix_shape']}\n")
            f.write(f"  使用单位: {row['unit_used']}\n")
            if row["unit_warning_detail"]:
                f.write(f"  单位追踪: {row['unit_warning_detail']}\n")
            f.write(f"  条件数: {row['condition_number']}\n")
            if row["empty_set_decision"]:
                f.write(f"  空集合处理: {row['empty_set_decision']}\n")
            if row["intermediate_steps"]:
                f.write("  中间计算过程:\n")
                for step in row["intermediate_steps"]:
                    f.write(f"    → {step}\n")
        f.write("\n【截图说明锚点】\n")
        for key in report["screenshot_explanation_keys"]:
            f.write(f"  - {key}\n")

    print(f"\nJSON 报告已写入: {out_path}")
    print(f"文本报告已写入: {txt_path}")
    print("\n完成。")


if __name__ == "__main__":
    main()
