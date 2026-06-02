#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "robot_joint_checker"))

from src import JointCheckWorkflow
import math

print("=" * 60)
print("验证速度计算修复")
print("=" * 60)

# 测试1: 简单数值验证
print("\n1. 单元测试: 速度计算")
print("-" * 40)
angles = [0, 15, 30]
times = [0.0, 0.1, 0.2]

from src.torque_calculator import TorqueCalculator
calc = TorqueCalculator()
velocities = calc._calculate_velocities(angles, times)

dt = times[2] - times[0]
d_angle = angles[2] - angles[0]
vel_expected = d_angle / dt

print(f"  角度序列: {angles}")
print(f"  时间序列: {times}")
print(f"  预期速度: {vel_expected} °/s")
print(f"  计算速度: {velocities[1]} °/s")
print(f"  结果: {'✅ 正确' if abs(velocities[1] - vel_expected) < 0.001 else '❌ 错误'}")

# 测试2: 验证 bug 是否存在
print("\n2. Bug 验证: 检查是否还有 math.degrees 放大")
print("-" * 40)
test_vel = 75.0
buggy_vel = math.degrees(test_vel)
print(f"  正常速度: {test_vel} °/s")
print(f"  被 bug 放大后: {buggy_vel:.2f} °/s (约57.3倍)")
print(f"  当前代码输出: {velocities[1]} °/s")
print(f"  说明: {'已修复 - 没有被放大' if abs(velocities[1] - 150) < 1 else '仍有bug - 被放大了'}")

# 测试3: 完整链路测试
print("\n3. 完整链路测试")
print("-" * 40)

data_dir = os.path.join(os.path.dirname(__file__), "test_colleague", "data")
output_dir = os.path.join(os.path.dirname(__file__), "test_colleague", "results")

joint_file = os.path.join(data_dir, "joint_config.json")
load_file = os.path.join(data_dir, "load_config.json")
motion_file = os.path.join(data_dir, "motion_angles.json")

workflow = JointCheckWorkflow(output_dir=output_dir)
result = workflow.run_full_workflow(
    joint_config_file=joint_file,
    load_config_file=load_file,
    motion_sequence_file=motion_file,
    generate_plots=False,
)

print("\n" + "=" * 60)
print("速度数据验证")
print("=" * 60)

check_result = result["check_result"]

# 查看样例数据: 关节1: 0,15,30,45,60,75,90,105,90,75,60
# 关节1 第1步到第7步: 0到105度，用时1.4秒，中心差分计算
# t=0.6s时的差分: angles[4]-angles[2] = 60-30 = 30度，dt=0.8-0.4=0.4秒 -> 75度/秒
print("\n样例数据的预期速度:")
print("  关节1的角度变化: 0→15→30→45→60→75→90→105...")
print("  采样间隔: 0.2秒")
print("  中心差分最大速度约: (105-75)/(1.6-1.2) = 30/0.4 = 75 °/s")

print("\n实际计算的最大速度:")
for joint_id, vels in check_result.velocity_results.items():
    max_vel = max(abs(v) for v in vels) if vels else 0
    config = check_result.joint_configs.get(joint_id)
    limit = config.max_angular_velocity if config else float('inf')
    print(f"  关节{joint_id}: {max_vel:.2f} °/s (限制: {limit} °/s)")

print("\n" + "=" * 60)
print("验证总结")
print("=" * 60)

vel_fixed = True
for joint_id, vels in check_result.velocity_results.items():
    max_vel = max(abs(v) for v in vels) if vels else 0
    if max_vel > 1000:
        vel_fixed = False
        break

if vel_fixed:
    print("✅ 速度计算已修复！数值在合理范围内")
else:
    print("❌ 速度计算仍有问题！数值过大")

print(f"\n超限总数: {result['violation_summary']['total_violations']}")
print(f"速度超限: {result['violation_summary']['has_velocity_violation']}")
print(f"载荷越界: {result['has_load_violation']} (关键失败路径)")

print("\n报告文件:")
for name, path in result["reports"].items():
    if not name.endswith("_error"):
        print(f"  - {name}: {path}")

print("\n" + "=" * 60)
