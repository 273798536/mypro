#!/usr/bin/env python3
"""验证脚本：直接调用包内功能"""

import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12336')

from datetime import datetime, timedelta
from gray_power.models import (
    DelayStatus,
    ExperimentGroup,
    MetricData,
    SampleInfo,
)
from gray_power.power import PowerAnalyzer, _norm_cdf, _norm_ppf
from gray_power.conflict import ConflictDetector
from gray_power.trace import TraceChain
from gray_power.report import PowerReport

print("=" * 70)
print("第一步：验证数学函数")
print("=" * 70)

print("\n1.1 _norm_cdf (标准正态 CDF) 准确性验证:")
test_cases = [
    (-3, 0.00135),
    (-1.96, 0.025),
    (0, 0.5),
    (1.96, 0.975),
    (3, 0.99865),
]
for x, expected in test_cases:
    actual = _norm_cdf(x)
    err = abs(actual - expected)
    status = "✓" if err < 0.0001 else "✗"
    print(f"  {status} Phi({x:+.2f}) = {actual:.5f} (预期 {expected:.5f}) | 误差={err:.6f}")

print("\n1.2 _norm_ppf (分位数函数) 准确性验证:")
for p, expected in [(0.025, -1.96), (0.5, 0), (0.975, 1.96)]:
    actual = _norm_ppf(p)
    err = abs(actual - expected)
    status = "✓" if err < 0.0001 else "✗"
    print(f"  {status} Phi^-1({p}) = {actual:.5f} (预期 {expected:+.2f}) | 误差={err:.6f}")

print("\n1.3 核心 bug 场景：次日留存率（d=-0.2588, n=1800）")
import math
d = -0.2588
n_min = 1800
z_alpha2 = _norm_ppf(1 - 0.05 / 2)
ncp = d * math.sqrt(n_min / 2)
print(f"  z_alpha/2 = {z_alpha2:.5f}")
print(f"  ncp = d * sqrt(n/2) = {d} * sqrt({n_min}/2) = {ncp:.5f}")

wrong_power = 1 - _norm_ppf(z_alpha2 - ncp)
print(f"\n  错误公式: 1 - Phi^-1(z - ncp) = {wrong_power:.5f}")

power_right = 1 - _norm_cdf(z_alpha2 - ncp)
power_left = _norm_cdf(-z_alpha2 - ncp)
correct_power = power_right + power_left
print(f"\n  正确公式: 1 - Phi(z - ncp) + Phi(-z - ncp)")
print(f"            = 1 - Phi({z_alpha2 - ncp:.5f}) + Phi({-z_alpha2 - ncp:.5f})")
print(f"            = 1 - {_norm_cdf(z_alpha2 - ncp):.5f} + {power_left:.5f}")
print(f"            = {power_right:.5f} + {power_left:.5f}")
print(f"            = {correct_power:.5f}  ✓")

print("\n" + "=" * 70)
print("第二步：运行完整演示流程")
print("=" * 70)

now = datetime.now()
groups = [
    ExperimentGroup(group_id="ctrl", group_name="对照组", is_control=True, traffic_ratio=0.5),
    ExperimentGroup(group_id="treat", group_name="实验组", is_control=False, traffic_ratio=0.5),
]

metrics = [
    MetricData(
        metric_id="retention",
        metric_name="次日留存率",
        unit="比例",
        control_mean=0.35,
        control_std=0.08,
        treatment_mean=0.33,
        treatment_std=0.07,
        control_n=4500,
        treatment_n=1800,
        arrival_time=now + timedelta(hours=14),
        expected_time=now,
        delay_status=DelayStatus.DELAYED,
        delay_hours=14.0,
        source_channel="ch_all",
        source_city="gz",
    ),
]

sample_infos = [
    SampleInfo(group_id="ctrl", required_n=5000, actual_n=4500, min_detectable_effect=0.02),
    SampleInfo(group_id="treat", required_n=2500, actual_n=1800, min_detectable_effect=0.02),
]

analyzer = PowerAnalyzer(alpha=0.05, desired_power=0.8)
conflict_detector = ConflictDetector()
trace_chain = TraceChain()
report_gen = PowerReport(analyzer, conflict_detector, trace_chain)

report_text, snapshot = report_gen.generate(
    experiment_name="验证实验",
    groups=groups,
    metrics=metrics,
    sample_infos=sample_infos,
)

output_path = "/tmp/gray_power_verification_report.txt"
with open(output_path, "w") as f:
    f.write(report_text)

print(f"\n✓ 报告已生成: {output_path}")

for pr in snapshot.power_results:
    print(f"\n  指标: {pr.metric_name}")
    print(f"  功效: {pr.achieved_power:.6f}")
    print(f"  置信区间: [{pr.confidence_interval_lower:.6f}, {pr.confidence_interval_upper:.6f}]")
    print(f"  效应量: {pr.effect_size:.4f}")
    print(f"  显著性: {'✓ 是' if pr.is_significant else '✗ 否'}")
    for step in pr.intermediate_steps:
        if step.step_name == "achieved_power":
            print(f"  \n  功效计算说明: {step.note}")
            print(f"  公式: {step.formula}")

print("\n" + "=" * 70)
print("验证完成")
print("=" * 70)
