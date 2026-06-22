import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_cleanse import cleanse_samples
from exceptions import build_exception_dashboard, export_cleanse_log_lines
from models import SamplingParams, SamplingMethod
from sampling import run_sampling


def load_records():
    sample_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "error_questions_mixed.json",
    )
    with open(sample_path, "r", encoding="utf-8") as f:
        return json.load(f)["records"]


def demo_cleanse():
    print("=" * 60)
    print("【样例 1】数据清洗 —— 旧称呼 / 缺值 / 单位缺失 / 边界 / 后补说明")
    print("=" * 60)
    records = load_records()
    result = cleanse_samples(records)

    print(f"输入总数      : {result.total_input}")
    print(f"有效样本      : {result.valid_count}")
    print(f"排除总数      : {result.excluded_count}")
    print(f"缺值数        : {result.missing_value_count}")
    print(f"单位缺失      : {result.unit_missing_count}")
    print(f"边界异常      : {result.boundary_outlier_count}")
    print(f"后补说明合并  : {result.supplement_merged}")
    print(f"旧称呼映射行数: {len(result.old_term_renamed)}")
    print()

    print("--- 因单位缺失被排除的样本ID（供图表/报告过滤） ---")
    print(result.excluded_unit_missing_ids)
    print()

    print("--- 异常样本明细（复核人视角） ---")
    for s in result.samples:
        if s.issues:
            print(f"  [{s.status.value}] {s.sample_id} 行{s.raw_row_no} "
                  f"学生={s.student_name} 题数={s.error_question_count}{s.error_question_count_unit or '?'} "
                  f"失分={s.error_score}{s.error_score_unit or '?'}")
            for iss in s.issues:
                print(f"      - {iss['issue_type']} | {iss.get('field')} | {iss['detail']}")
    print()

    print("--- cleanse_log_lines（可直接粘到报告） ---")
    for line in export_cleanse_log_lines(result)[:10]:
        print("  " + line)

    return result


def demo_sampling(cleanse_result):
    print("\n" + "=" * 60)
    print("【样例 2】概率抽样 —— 简单随机（Cochran 公式自动算样本量）")
    print("=" * 60)
    params = SamplingParams(
        method=SamplingMethod.SIMPLE_RANDOM,
        confidence_level=0.95,
        margin_of_error=0.05,
        random_seed=42,
    )
    result = run_sampling(cleanse_result.samples, params)

    print(f"合格总数 N    : {result.total_eligible}")
    print(f"抽样数量 n    : {result.sample_size_used}")
    print(f"实际入样比例  : {result.sample_ratio_used}")
    print(f"入样样本数    : {len(result.selected_ids)}")
    print()

    print("--- 公式中间过程（复核人不用回代码找） ---")
    for step in result.intermediate_steps:
        print(f"  ▶ {step.step_name}")
        if step.formula:
            print(f"    公式: {step.formula}")
        if step.variables:
            print(f"    变量: {json.dumps(step.variables, ensure_ascii=False)}")
        if step.unit_check:
            print(f"    单位: {json.dumps(step.unit_check, ensure_ascii=False)}")
        print(f"    结果: {step.result_value}")
        print()

    print("--- 抽样摘要 ---")
    print(json.dumps(result.summary, indent=2, ensure_ascii=False))

    return result


def demo_stratified(cleanse_result):
    print("\n" + "=" * 60)
    print("【样例 3】分层抽样 —— 按 class_id 分层，比例分配")
    print("=" * 60)
    params = SamplingParams(
        method=SamplingMethod.STRATIFIED,
        sample_ratio=0.5,
        stratify_by="class_id",
        random_seed=42,
    )
    result = run_sampling(cleanse_result.samples, params)

    print(f"合格总数 N    : {result.total_eligible}")
    print(f"抽样比例      : {result.sample_ratio_used}")
    print(f"入样样本数    : {len(result.selected_ids)}")
    print()

    print("--- 分层分布 ---")
    for k, v in result.stratify_distribution.items():
        print(f"  层 {k}: 总体 {v['population']}, 分配 {v['allocated']}, 实抽 {v['selected']}")
    print()

    print("--- 抽样阶段排除明细 ---")
    for ex in result.excluded_from_sampling[:5]:
        print(f"  - {ex['sample_id']} 原因={ex['reason']}")

    return result


def demo_exception_dashboard(cleanse_result, sampling_result):
    print("\n" + "=" * 60)
    print("【样例 4】异常分流仪表盘 —— 下一班接手时看这个就够")
    print("=" * 60)
    dashboard = build_exception_dashboard(cleanse_result, sampling_result)

    print("--- 状态分布 ---")
    print(json.dumps(dashboard["status_distribution"], indent=2, ensure_ascii=False))
    print()

    print("--- 单位缺失详情（字段、单位、原数值） ---")
    for d in dashboard["unit_missing_detail"][:3]:
        print(json.dumps(d, indent=2, ensure_ascii=False))
        print()

    print("--- 后补说明合并详情 ---")
    for d in dashboard["supplement_detail"]:
        print(json.dumps(d, indent=2, ensure_ascii=False))
        print()

    print(f"--- 抽样中间公式过程共 {len(dashboard.get('sampling_intermediate_steps', []))} 步 ---")


def demo_errors():
    print("\n" + "=" * 60)
    print("【样例 5】参数错误返回样例")
    print("=" * 60)

    print("--- sample_ratio 超出 (0,1] 区间 ---")
    try:
        SamplingParams(sample_ratio=1.5)
    except Exception as e:
        print(f"  {type(e).__name__}: {e}")

    print()
    print("--- sample_size 非正数 ---")
    try:
        SamplingParams(sample_size=0)
    except Exception as e:
        print(f"  {type(e).__name__}: {e}")

    print()
    print("--- confidence_level 超出 [0.8, 0.999] ---")
    try:
        SamplingParams(confidence_level=0.5)
    except Exception as e:
        print(f"  {type(e).__name__}: {e}")


if __name__ == "__main__":
    cleanse_result = demo_cleanse()
    sampling_result = demo_sampling(cleanse_result)
    demo_stratified(cleanse_result)
    demo_exception_dashboard(cleanse_result, sampling_result)
    demo_errors()
