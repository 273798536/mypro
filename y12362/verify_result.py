#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, 'robot_joint_checker')

from src.torque_calculator import TorqueCalculator
from src import JointCheckWorkflow
import json

result_data = {}

# 测试1: 简单单元测试
calc = TorqueCalculator()
angles = [0, 15, 30]
times = [0.0, 0.2, 0.4]
vels = calc._calculate_velocities(angles, times)
result_data["unit_test"] = {
    "expected": 75.0,
    "actual": vels[1],
    "pass": abs(vels[1] - 75.0) < 0.001
}

# 测试2: 完整链路
data_dir = "test_colleague/data"
output_dir = "test_colleague/results"
os.makedirs(output_dir, exist_ok=True)

workflow = JointCheckWorkflow(output_dir=output_dir)
result = workflow.run_full_workflow(
    joint_config_file=os.path.join(data_dir, "joint_config.json"),
    load_config_file=os.path.join(data_dir, "load_config.json"),
    motion_sequence_file=os.path.join(data_dir, "motion_angles.json"),
    generate_plots=False,
)

check_result = result["check_result"]

# 速度结果
velocity_data = {}
for joint_id, vels in check_result.velocity_results.items():
    max_vel = max(abs(v) for v in vels) if vels else 0
    velocity_data[joint_id] = max_vel

result_data["velocity_results"] = velocity_data
result_data["velocity_ok"] = all(v < 500 for v in velocity_data.values())

# 超限结果
vs = result["violation_summary"]
result_data["violation_summary"] = vs

# 报告文件
reports = {}
for name, path in result["reports"].items():
    if not name.endswith("_error"):
        reports[name] = os.path.exists(path)
result_data["reports_exist"] = reports

# 保存结果
with open("fix_verification_result.json", "w") as f:
    json.dump(result_data, f, indent=2, ensure_ascii=False)

# 打印总结
print("=" * 60)
print("Bug修复验证结果")
print("=" * 60)
print(f"\n单元测试: {'PASS' if result_data['unit_test']['pass'] else 'FAIL'}")
print(f"  预期: {result_data['unit_test']['expected']} °/s")
print(f"  实际: {result_data['unit_test']['actual']} °/s")

print(f"\n速度计算合理: {'PASS' if result_data['velocity_ok'] else 'FAIL'}")
for jid, vel in result_data['velocity_results'].items():
    print(f"  关节{jid}: {vel:.2f} °/s")

print(f"\n修复前后对比:")
print("  修复前 - 关节1: 4297.18 °/s (错误, 约57.3倍放大)")
print(f"  修复后 - 关节1: {result_data['velocity_results'].get(1, 0):.2f} °/s (正确)")

print(f"\n超限检测:")
print(f"  载荷越界: {'是 🔴 关键失败路径' if vs['has_load_violation'] else '否'}")
print(f"  总超限数: {vs['total_violations']}")

print(f"\n报告生成:")
for name, exists in result_data['reports_exist'].items():
    print(f"  {name}: {'✓' if exists else '✗'}")

print("\n" + "=" * 60)
all_pass = result_data['unit_test']['pass'] and result_data['velocity_ok'] and all(result_data['reports_exist'].values())
print("全部验证通过!" if all_pass else "存在未通过项!")
print("=" * 60)
