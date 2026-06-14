import os
import copy
from calculator import run_calculation, CalcParam
from jump_detector import detect_jump
from history_logger import HistoryLogger
from report_generator import generate_report
from test_problems import get_student_problems


def main():
    output_dir = "reports"
    os.makedirs(output_dir, exist_ok=True)

    history = HistoryLogger("history.json")

    problems = get_student_problems()

    print("=" * 60)
    print("  组合计数参数试算 — 学生错题试跑")
    print("=" * 60)
    print()

    all_results = []

    for problem in problems:
        print(f"--- 正在处理 {problem.problem_id}: {problem.title}")

        params_copy = copy.deepcopy(problem.params)

        result = run_calculation(
            problem_id=problem.problem_id,
            formula_key=problem.formula_key,
            params=params_copy,
            material_name=problem.material_name,
        )
        all_results.append(result)

        jump_analysis = detect_jump(result)

        history_records = history.get_records_by_problem(problem.problem_id)

        report = generate_report(
            result=result,
            jump_analysis=jump_analysis,
            history_records=history_records,
            problem_title=problem.title,
        )

        report_path = os.path.join(output_dir, f"{problem.problem_id}_report.md")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report)

        print(f"  计算结果: {result.converted_result:.4g} {result.result_unit}")
        if result.unit_issues:
            print(f"  单位问题: {len(result.unit_issues)} 项")
        if result.boundary_issues:
            print(f"  边界问题: {len(result.boundary_issues)} 项")
        if result.material_check.get("is_alias"):
            print(f"  材料核对: 别名 {result.material_check['input_name']} → {result.material_check['standard_name']}")
        if jump_analysis.has_jump:
            print(f"  ⚠️ 跳变检测: {', '.join(jump_analysis.cause_categories)}")
        print(f"  报告已生成: {report_path}")
        print()

    print()
    print("--- 模拟助教小岑的人工修正操作（STU-003 材料名称不一致）")
    print()

    stu003 = next(p for p in problems if p.problem_id == "STU-003")
    params_before = copy.deepcopy(stu003.params)
    result_before = run_calculation(
        problem_id="STU-003",
        formula_key=stu003.formula_key,
        params=params_before,
        material_name=stu003.material_name,
    )

    params_after = copy.deepcopy(stu003.params)
    params_after["density"].unit = "g/cm³"
    result_after = run_calculation(
        problem_id="STU-003",
        formula_key=stu003.formula_key,
        params=params_after,
        material_name="钢材",
    )

    history.log_manual_correction(
        problem_id="STU-003",
        operator="建模助教-小岑",
        before_result=result_before,
        after_result=result_after,
        remark="学生写的Q235是钢材的牌号，对应标准材料名称为钢材，密度单位补充为 g/cm³",
    )
    print("  已记录人工修正操作（小岑判断：Q235 → 钢材，补充密度单位）")
    print()

    print("--- 模拟小岑对 STU-004 的单位补全操作")
    print()

    stu004 = next(p for p in problems if p.problem_id == "STU-004")
    params_004_before = copy.deepcopy(stu004.params)
    result_004_before = run_calculation(
        problem_id="STU-004",
        formula_key=stu004.formula_key,
        params=params_004_before,
        material_name=stu004.material_name,
    )

    history.log_param_adjustment(
        problem_id="STU-004",
        operator="建模助教-小岑",
        param_name="density",
        old_value=0.6,
        new_value=0.6,
        old_unit="",
        new_unit="g/cm³",
        remark="学生漏写密度单位，根据题目描述补充为 g/cm³",
    )
    print("  已记录参数调整操作（小岑补全密度单位）")
    print()

    print("--- 重新生成带历史记录的报告（STU-003 和 STU-004）")
    print()

    for pid in ["STU-003", "STU-004"]:
        prob = next(p for p in problems if p.problem_id == pid)
        params = copy.deepcopy(prob.params)
        if pid == "STU-003":
            params["density"].unit = "g/cm³"
            mat_name = "钢材"
        else:
            params["density"].unit = "g/cm³"
            mat_name = prob.material_name

        result = run_calculation(
            problem_id=pid,
            formula_key=prob.formula_key,
            params=params,
            material_name=mat_name,
        )

        baseline_result = result_before if pid == "STU-003" else result_004_before
        jump_analysis = detect_jump(result, baseline_result)

        hist_records = history.get_records_by_problem(pid)

        report = generate_report(
            result=result,
            jump_analysis=jump_analysis,
            history_records=hist_records,
            problem_title=prob.title,
        )

        report_path = os.path.join(output_dir, f"{pid}_report_with_history.md")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report)

        print(f"  {pid} 报告（含历史）已生成: {report_path}")

    print()
    print("=" * 60)
    print("  试跑完成！报告汇总:")
    print(f"  - 学生错题数量: {len(problems)} 道")
    print(f"  - 报告输出目录: {output_dir}/")
    print(f"  - 历史记录文件: history.json")
    print("=" * 60)


if __name__ == "__main__":
    main()
