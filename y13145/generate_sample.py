#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mc_review import MonteCarloReview, WeightChangeReason


SAMPLE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data.json")


def generate_sample() -> str:
    review = MonteCarloReview()

    wa1 = review.add_wrong_answer(
        question_id="MC-001",
        student_answer=120.5,
        correct_answer=100.0,
        error_type="蒙特卡洛采样不足",
        unit="kPa",
        student_id="S2023101",
        original_statement="跑了一万次采样，均值120.5kPa",
        is_dirty=True,
        dirt_description="学生只写了一万次，未说明是否含burn-in",
        raw_data={"iterations": 10000, "burn_in": None, "submitted_via": "word文档扫描件"},
        tags=["采样", "压力"],
    )

    wa2 = review.add_wrong_answer(
        question_id="MC-002",
        student_answer=0.95,
        correct_answer=0.90,
        error_type="置信区间误解",
        unit="无量纲",
        student_id="S2023102",
        original_statement="95%置信区间就是0.95",
        tags=["置信区间", "概念错误"],
    )

    wa3 = review.add_wrong_answer(
        question_id="MC-003",
        student_answer="大概2.5米每秒",
        correct_answer=3.2,
        error_type="有效数字缺失",
        unit="m/s",
        student_id="S2023103",
        original_statement="我估算速度大概2.5m/s吧",
        is_dirty=True,
        dirt_description="学生答案含文字，无法直接数值比较",
        raw_data={"raw_text": "大概2.5米每秒"},
        tags=["脏数据", "速度"],
    )

    wa4 = review.add_wrong_answer(
        question_id="MC-004",
        student_answer=42,
        correct_answer=7,
        error_type="随机数种子误用",
        unit="无量纲",
        student_id="S2023104",
        original_statement="我用了默认seed=42，结果就是42",
        tags=["随机数", "常见错误"],
    )

    review.change_weight(
        wrong_answer_id=wa1.id,
        param_name="采样次数权重",
        old_value=0.3,
        new_value=0.5,
        unit="无量纲",
        reason=WeightChangeReason.CALIBRATION.value,
        reason_detail="经三组对照实验确认采样不足时权重应提高",
        changed_by="小岑",
    )

    review.change_weight(
        wrong_answer_id=wa1.id,
        param_name="收敛阈值",
        old_value=1e-3,
        new_value=5e-4,
        unit="无量纲",
        reason=WeightChangeReason.MANUAL_JUDGMENT.value,
        reason_detail="根据班级整体情况收紧",
        changed_by="小岑",
    )

    review.change_weight(
        wrong_answer_id=wa4.id,
        param_name="随机数种子权重",
        old_value=0.1,
        new_value=0.2,
        unit="无量纲",
        reason=WeightChangeReason.CALIBRATION.value,
        reason_detail="种子误用是高频错误，权重翻倍",
        changed_by="小岑",
    )

    breach = review.check_extrapolation(
        wrong_answer_id=wa2.id,
        param_name="置信水平",
        extrapolated_value=0.95,
        boundary_low=0.80,
        boundary_high=0.90,
        unit="无量纲",
    )

    review.resolve_breach(breach.id, "学生混淆了置信水平与置信区间宽度，已纠正并补做练习", "小岑")

    breach2 = review.check_extrapolation(
        wrong_answer_id=wa3.id,
        param_name="速度",
        extrapolated_value=25.0,
        boundary_low=0,
        boundary_high=10.0,
        unit="m/s",
    )

    review.add_calculation_step(
        description="蒙特卡洛标准误计算（MC-001）",
        formula="σ_MC = s / √N",
        input_values={"s": 15.2, "N": 10000},
        output_value=0.152,
        unit_before="kPa",
        unit_after="kPa",
        boundary_low=0,
        boundary_high=1.0,
        note="按题目要求取10000次采样",
    )

    review.add_calculation_step(
        description="单位换算：kPa → Pa",
        formula="x_Pa = x_kPa × 1000",
        input_values={"x_kPa": 0.152},
        output_value=152.0,
        unit_before="kPa",
        unit_after="Pa",
        conversion_factor=1000,
    )

    review.add_calculation_step(
        description="误差传播计算",
        formula="σ_total = √(σ_a² + σ_b²)",
        input_values={"σ_a": 0.1, "σ_b": 0.05},
        output_value=0.1118,
        unit_before="kPa",
        unit_after="kPa",
        boundary_low=0,
        boundary_high=0.5,
        note="两个独立不确定度的合成",
    )

    review.add_calculation_step(
        description="参数对照：旧权重 vs 新权重",
        formula="Δw = w_new - w_old",
        input_values={"w_old": 0.3, "w_new": 0.5},
        output_value=0.2,
        unit_before="无量纲",
        unit_after="无量纲",
        note="项目经理对照两组参数用",
    )

    review.save(SAMPLE_PATH)
    return SAMPLE_PATH


if __name__ == "__main__":
    path = generate_sample()
    print(f"示例数据已生成: {path}")
    review = MonteCarloReview.load(path)
    s = review.summary()
    print(f"  错题: {s['wrong_answer_count']} 条")
    print(f"  权重修改: {s['weight_change_count']} 次")
    print(f"  越界记录: {s['breach_count']} 次（已处理 {s['resolved_breach_count']}）")
    print(f"  计算步骤: {s['calculation_step_count']} 步")
    print(f"  时间线事件: {s['timeline_total']} 条（已处理 {s['timeline_processed']}，待补 {s['timeline_pending']}，人工改判 {s['timeline_manual_override']}）")
