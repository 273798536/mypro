import csv
import os
import sys
from datetime import datetime

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(DATA_DIR, "题目清单.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "整数规划参数试算结果.csv")
REPORT_FILE = os.path.join(DATA_DIR, "整数规划参数试算说明.txt")

REQUIRED_FIELDS = [
    "原始行号", "题目ID", "变量名", "系数", "单位", "换算因子",
    "目标系数", "约束方向", "右端项", "右端项单位", "记录类型",
    "撤回标记", "撤回原因", "撤回关联题目ID", "筛选口径", "备注",
]

PARSE_ERRORS = []
WITHDRAWAL_WARNINGS = []


def log_parse_error(row_num, message):
    msg = f"第{row_num}行解析异常: {message}"
    PARSE_ERRORS.append(msg)
    print(f"      ⚠ {msg}")


def load_problems(filepath):
    rows = []
    expected_cols = len(REQUIRED_FIELDS)
    with open(filepath, encoding="utf-8") as f:
        raw_lines = f.readlines()
    if not raw_lines:
        log_parse_error(1, "CSV文件为空")
        return rows

    header_line = raw_lines[0].strip()
    header_cols = next(csv.reader([header_line]))
    if len(header_cols) != expected_cols:
        log_parse_error(1, f"表头列数={len(header_cols)}, 期望={expected_cols}。"
                           f"请检查是否有未转义的逗号导致列错位。表头: {header_cols}")

    reader = csv.DictReader(raw_lines)
    for line_no, r in enumerate(reader, start=2):
        missing = [f for f in REQUIRED_FIELDS if f not in r or r[f] is None]
        if missing:
            log_parse_error(line_no, f"缺少字段: {missing}, 原始列数={len(r)}")
            continue

        if r["题目ID"] is None or str(r["题目ID"]).strip() == "":
            log_parse_error(line_no, "题目ID为空, 跳过该行")
            continue

        if r["撤回标记"] not in ("Y", "N"):
            log_parse_error(line_no, f"撤回标记值异常='{r['撤回标记']}', 应为Y或N")

        if r["撤回标记"] == "Y" and (not r["撤回关联题目ID"] or r["撤回关联题目ID"].strip() == ""):
            log_parse_error(line_no, "撤回记录但撤回关联题目ID为空, 将无法关联到替代记录")

        try:
            r["原始行号"] = int(r["原始行号"]) if r["原始行号"] else line_no
        except (ValueError, TypeError):
            log_parse_error(line_no, f"原始行号不是整数='{r['原始行号']}', 使用行号{line_no}作为替代")
            r["原始行号"] = line_no

        try:
            r["系数"] = float(r["系数"])
        except (ValueError, TypeError):
            log_parse_error(line_no, f"系数不是数字='{r['系数']}', 标记为坏数据")
            r["系数"] = float("nan")

        try:
            r["换算因子"] = float(r["换算因子"])
        except (ValueError, TypeError):
            log_parse_error(line_no, f"换算因子不是数字='{r['换算因子']}', 标记为坏数据")
            r["换算因子"] = float("nan")

        try:
            r["目标系数"] = float(r["目标系数"])
        except (ValueError, TypeError):
            log_parse_error(line_no, f"目标系数不是数字='{r['目标系数']}', 标记为坏数据")
            r["目标系数"] = float("nan")

        try:
            r["右端项"] = float(r["右端项"])
        except (ValueError, TypeError):
            log_parse_error(line_no, f"右端项不是数字='{r['右端项']}', 标记为坏数据")
            r["右端项"] = float("nan")

        rows.append(r)
    return rows


def check_division_by_zero(row):
    factor = row["换算因子"]
    if factor == 0:
        return {
            "触发": True,
            "原因": f"题目{row['题目ID']}变量{row['变量名']}的换算因子为0,无法将'{row['单位']}'换算到标准单位",
            "下一步": f"请核实题目清单原始行{row['原始行号']}的换算因子,确认'{row['单位']}'的正确换算关系后补录",
        }
    return {"触发": False, "原因": "", "下一步": ""}


def convert_to_standard(row, div_check):
    if div_check["触发"]:
        return None, "除零边界-无法换算", False
    converted_coeff = row["系数"] * row["换算因子"]
    if row["右端项单位"] == row["单位"]:
        converted_rhs = row["右端项"] * row["换算因子"]
        unit_match = True
    else:
        converted_rhs = row["右端项"]
        unit_match = False
    return converted_coeff, converted_rhs, unit_match


def link_withdrawal(rows):
    active = {}
    withdrawn_ids = set()
    withdrawal_links = {}
    withdrawal_row_map = {}
    for r in rows:
        if r["撤回标记"] == "Y":
            withdrawn_ids.add(r["题目ID"])
            target = r["撤回关联题目ID"].strip() if r["撤回关联题目ID"] else ""
            if not target:
                msg = f"题目{r['题目ID']}(原始行号{r['原始行号']})撤回记录的撤回关联题目ID为空,无法连接到替代记录"
                WITHDRAWAL_WARNINGS.append(msg)
                print(f"      ⚠ {msg}")
            withdrawal_links[r["题目ID"]] = {
                "撤回原因": r["撤回原因"],
                "替代题目ID": target,
                "结论": f"题目{r['题目ID']}已撤回({r['撤回原因']}),由题目{target if target else '?'}替代",
                "原始行号": r["原始行号"],
            }
            withdrawal_row_map[r["题目ID"]] = r["原始行号"]
        else:
            active[r["题目ID"]] = r
    for wid, link in withdrawal_links.items():
        replacer = link["替代题目ID"]
        if replacer and replacer in active:
            link["替代记录类型"] = active[replacer]["记录类型"]
            link["替代原始行号"] = active[replacer]["原始行号"]
            link["关联成功"] = True
        else:
            link["替代记录类型"] = "未找到"
            link["替代原始行号"] = "?"
            link["关联成功"] = False
            msg = (f"题目{wid}(原始行号{link['原始行号']})的撤回关联题目ID='{replacer}'未找到对应活跃记录, "
                   f"撤回链路中断。请检查: 1)题目ID是否写错 2)替代题目是否也被撤回 3)CSV逗号是否未转义导致列错位")
            WITHDRAWAL_WARNINGS.append(msg)
            print(f"      ⚠ {msg}")
    return active, withdrawn_ids, withdrawal_links


def trial_calculate(active_rows):
    results = []
    obj_value = 0.0
    for tid, row in active_rows.items():
        div_check = check_division_by_zero(row)
        is_nan_bad = False
        for field in ["系数", "换算因子", "目标系数", "右端项"]:
            if isinstance(row[field], float) and row[field] != row[field]:
                is_nan_bad = True
                break
        converted_coeff, converted_rhs, unit_match = convert_to_standard(row, div_check)
        is_bad = div_check["触发"] or converted_coeff is None or is_nan_bad
        unit_mismatch_msg = ""
        if not unit_match and not is_bad:
            unit_mismatch_msg = (
                f"变量单位'{row['单位']}'与右端项单位'{row['右端项单位']}'不一致,"
                f"右端项未做换算,结果可能偏差"
            )
        contribution = 0.0
        bound_value = ""
        if not is_bad:
            if row["约束方向"] == "<=":
                if converted_coeff != 0:
                    max_val = converted_rhs / converted_coeff
                    int_max = int(max_val)
                    bound_value = f"x<={int_max}(={converted_rhs}/{converted_coeff}取整)"
                    contribution = row["目标系数"] * int_max
                else:
                    bound_value = "系数换算后为0,无上界约束"
                    contribution = 0.0
            elif row["约束方向"] == ">=":
                if converted_coeff != 0:
                    min_val = converted_rhs / converted_coeff
                    int_min = max(0, int(min_val) + (1 if min_val > int(min_val) else 0))
                    bound_value = f"x>={int_min}(={converted_rhs}/{converted_coeff}向上取整)"
                    contribution = row["目标系数"] * int_min
                else:
                    bound_value = "系数换算后为0,无下界约束"
                    contribution = 0.0
            else:
                if converted_coeff != 0:
                    exact_val = converted_rhs / converted_coeff
                    bound_value = f"x={exact_val}(={converted_rhs}/{converted_coeff})"
                    contribution = row["目标系数"] * exact_val
                else:
                    bound_value = "系数换算后为0,无法确定"
                    contribution = 0.0
            if isinstance(contribution, (int, float)):
                obj_value += contribution
        results.append(
            {
                "题目ID": tid,
                "变量名": row["变量名"],
                "原始系数": row["系数"],
                "原始单位": row["单位"],
                "换算因子": row["换算因子"],
                "标准系数": converted_coeff if converted_coeff is not None else "除零-无法计算",
                "约束方向": row["约束方向"],
                "原始右端项": row["右端项"],
                "右端项单位": row["右端项单位"],
                "标准右端项": converted_rhs if not is_bad else "除零-无法计算",
                "单位一致": "是" if unit_match else ("否-右端项未换算" if not is_bad else "-"),
                "单位不一致说明": unit_mismatch_msg,
                "目标系数": row["目标系数"],
                "试算边界": bound_value if not is_bad else "除零-无法计算",
                "目标贡献": contribution if not is_bad else 0,
                "记录类型": row["记录类型"],
                "坏数据标记": "是" if is_bad else "否",
                "除零触发": "是" if div_check["触发"] else "否",
                "除零原因": div_check["原因"] if div_check["触发"] else "",
                "除零下一步": div_check["下一步"] if div_check["触发"] else "",
                "筛选口径": row["筛选口径"],
                "来源原始行号": row["原始行号"],
                "备注": row["备注"],
            }
        )
    return results, obj_value


def build_withdrawal_results(withdrawal_links):
    results = []
    for wid, link in withdrawal_links.items():
        results.append(
            {
                "题目ID": wid,
                "变量名": "-",
                "原始系数": "-",
                "原始单位": "-",
                "换算因子": "-",
                "标准系数": "-",
                "约束方向": "-",
                "原始右端项": "-",
                "右端项单位": "-",
                "标准右端项": "-",
                "单位一致": "-",
                "单位不一致说明": "-",
                "目标系数": "-",
                "试算边界": "-",
                "目标贡献": "-",
                "记录类型": "撤回",
                "坏数据标记": "否",
                "除零触发": "否",
                "除零原因": "",
                "除零下一步": "",
                "筛选口径": "-",
                "来源原始行号": "-",
                "备注": link["结论"]
                + f"(替代记录类型={link['替代记录类型']},替代原始行号={link['替代原始行号']})",
            }
        )
    return results


def export_csv(results, obj_value, filepath):
    fieldnames = [
        "题目ID",
        "变量名",
        "原始系数",
        "原始单位",
        "换算因子",
        "标准系数",
        "约束方向",
        "原始右端项",
        "右端项单位",
        "标准右端项",
        "单位一致",
        "单位不一致说明",
        "目标系数",
        "试算边界",
        "目标贡献",
        "记录类型",
        "坏数据标记",
        "除零触发",
        "除零原因",
        "除零下一步",
        "筛选口径",
        "来源原始行号",
        "备注",
    ]
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow(r)
        f.write(f"# 试算目标函数值(不含坏数据贡献): {obj_value}\n")
        f.write(f"# 导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# 筛选口径: 年级=高一|科目=数学\n")
        f.write(f"# 解析异常数: {len(PARSE_ERRORS)}\n")
        for i, e in enumerate(PARSE_ERRORS, 1):
            f.write(f"# 解析异常{i}: {e}\n")
        f.write(f"# 撤回告警数: {len(WITHDRAWAL_WARNINGS)}\n")
        for i, w in enumerate(WITHDRAWAL_WARNINGS, 1):
            f.write(f"# 撤回告警{i}: {w}\n")


def generate_report(active_rows, withdrawn_ids, withdrawal_links, trial_results, obj_value):
    lines = []
    lines.append("=" * 60)
    lines.append("整数规划参数试算说明（给不看代码的人看）")
    lines.append("=" * 60)
    lines.append("")
    lines.append("一、这份结果是什么？")
    lines.append("   把题目清单里的参数做一遍试算，检查单位换算后数字是否对得上，")
    lines.append("   哪些参数被撤回了、哪些数据有问题不能参与计算。")
    lines.append("")
    lines.append("二、数字从哪来？")
    lines.append("   每一行结果都标注了'来源原始行号'，对应题目清单CSV里的行。")
    lines.append("   比如来源原始行号=1，就去题目清单第1行核对。")
    lines.append("   换算公式：标准系数 = 原始系数 × 换算因子")
    lines.append("   当变量单位与右端项单位一致时，右端项也乘以同一换算因子，保证等式两边单位统一。")
    lines.append("")

    section_num = 3
    if PARSE_ERRORS:
        lines.append(f"{cn_num(section_num)}、CSV解析异常（先看这里！）")
        lines.append(f"   共检测到 {len(PARSE_ERRORS)} 条解析问题，可能是逗号未转义或字段格式不对：")
        for e in PARSE_ERRORS:
            lines.append(f"   ⚠ {e}")
        lines.append("   → 修复方法：含逗号的字段要用英文双引号包裹，数字字段不能有文字")
        lines.append("")
        section_num += 1

    lines.append(f"{cn_num(section_num)}、撤回记录怎么连到结论？")
    section_num += 1
    for wid, link in withdrawal_links.items():
        lines.append(f"   题目{wid}已撤回，原因：{link['撤回原因']}")
        if link["关联成功"]:
            lines.append(f"   → 由题目{link['替代题目ID']}(原始行号{link['替代原始行号']}, {link['替代记录类型']}记录)替代")
        else:
            lines.append(f"   → ⚠ 关联失败！撤回关联题目ID='{link['替代题目ID']}'找不到对应活跃记录")
            lines.append(f"   → 请检查：题目ID是否写错、替代题目是否也被撤回、CSV逗号是否未转义")
    if not withdrawal_links:
        lines.append("   本次无撤回记录。")
    if WITHDRAWAL_WARNINGS:
        lines.append(f"   撤回告警共 {len(WITHDRAWAL_WARNINGS)} 条")
    lines.append("")

    lines.append(f"{cn_num(section_num)}、坏数据/除零边界怎么处理？")
    section_num += 1
    bad_rows = [r for r in trial_results if r["坏数据标记"] == "是"]
    if bad_rows:
        for br in bad_rows:
            lines.append(f"   题目{br['题目ID']}（来源行号{br['来源原始行号']}）：{br['除零原因']}")
            lines.append(f"   → {br['除零下一步']}")
    else:
        lines.append("   本次未检测到坏数据。")
    lines.append("")

    lines.append(f"{cn_num(section_num)}、单位换算检查")
    section_num += 1
    mismatch_rows = [r for r in trial_results if r["单位一致"] != "是"]
    if mismatch_rows:
        has_mismatch = False
        for mr in mismatch_rows:
            if mr["坏数据标记"] == "否" and mr["单位不一致说明"]:
                lines.append(f"   题目{mr['题目ID']}：{mr['单位不一致说明']}")
                has_mismatch = True
        if not has_mismatch:
            lines.append("   所有有效记录的单位均已一致换算。")
    else:
        lines.append("   所有有效记录的单位均已一致换算。")
    lines.append("")

    lines.append(f"{cn_num(section_num)}、试算结果概要")
    section_num += 1
    good_count = len([r for r in trial_results if r["坏数据标记"] == "否"])
    lines.append(f"   参与计算的变量数: {good_count}")
    lines.append(f"   坏数据隔离数: {len(bad_rows)}")
    lines.append(f"   撤回记录数: {len(withdrawn_ids)}")
    lines.append(f"   解析异常数: {len(PARSE_ERRORS)}")
    lines.append(f"   试算目标函数值(不含坏数据): {obj_value}")
    lines.append("")

    lines.append(f"{cn_num(section_num)}、详细计算过程（每条记录的来龙去脉）")
    for r in trial_results:
        lines.append(f"   --- 题目{r['题目ID']} (来源行号{r['来源原始行号']}, {r['记录类型']}记录) ---")
        lines.append(f"   变量: {r['变量名']}")
        lines.append(f"   原始: 系数={r['原始系数']}{r['原始单位']}, 换算因子={r['换算因子']}")
        if r["坏数据标记"] == "否":
            lines.append(f"   换算后: 标准系数={r['标准系数']}, 约束{r['约束方向']}{r['标准右端项']}")
            lines.append(f"   目标系数: {r['目标系数']}, 试算边界: {r['试算边界']}")
            lines.append(f"   目标贡献: {r['目标贡献']}")
            if r["单位一致"] != "是" and r["单位不一致说明"]:
                lines.append(f"   ⚠ {r['单位不一致说明']}")
        else:
            lines.append(f"   ⚠ 坏数据: {r['除零原因'] if r['除零原因'] else '字段格式异常'}")
            lines.append(f"   → {r['除零下一步'] if r['除零下一步'] else '请检查该字段格式'}")
        lines.append("")
    lines.append("=" * 60)
    return "\n".join(lines)


CN_NUMS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]


def cn_num(n):
    if 0 <= n < len(CN_NUMS):
        return CN_NUMS[n]
    return str(n)


def main():
    print("[1/5] 读取题目清单...")
    rows = load_problems(INPUT_FILE)
    print(f"      共读取 {len(rows)} 条记录")

    print("[2/5] 关联撤回记录...")
    active, withdrawn_ids, withdrawal_links = link_withdrawal(rows)
    print(f"      活跃记录 {len(active)} 条, 撤回记录 {len(withdrawn_ids)} 条")
    for wid, link in withdrawal_links.items():
        print(f"      题目{wid} → 替代为题目{link['替代题目ID']}")

    print("[3/5] 除零边界检查 & 单位换算试算...")
    trial_results, obj_value = trial_calculate(active)
    bad_count = len([r for r in trial_results if r["坏数据标记"] == "是"])
    div_count = len([r for r in trial_results if r["除零触发"] == "是"])
    print(f"      坏数据 {bad_count} 条, 除零触发 {div_count} 条")
    for r in trial_results:
        if r["坏数据标记"] == "是":
            print(f"      ⚠ 题目{r['题目ID']}(行号{r['来源原始行号']}): {r['除零原因']}")

    print("[4/5] 组装导出数据（含撤回记录+筛选口径）...")
    withdrawal_results = build_withdrawal_results(withdrawal_links)
    all_results = trial_results + withdrawal_results

    print("[5/5] 写出CSV和说明文件...")
    export_csv(all_results, obj_value, OUTPUT_FILE)

    report = generate_report(active, withdrawn_ids, withdrawal_links, trial_results, obj_value)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(report)

    print()
    print(f"✓ CSV结果: {OUTPUT_FILE}")
    print(f"✓ 说明文件: {REPORT_FILE}")
    print(f"✓ 试算目标函数值: {obj_value}")
    print()
    print("── 说明文件摘要 ──")
    print(report)


if __name__ == "__main__":
    main()
