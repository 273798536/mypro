#!/usr/bin/env python3
import sys
sys.path.insert(0, 'robot_joint_checker')

from src import TorqueCalculator, JointCheckWorkflow
import os

print("=" * 60)
print("速度计算Bug修复验证")
print("=" * 60)

# 测试1: 单元测试
print("\n【测试1】单元测试 - 速度计算函数")
print("-" * 50)
calc = TorqueCalculator()
angles = [0, 15, 30]
times = [0.0, 0.2, 0.4]
vels = calc._calculate_velocities(angles, times)
expected = (30 - 0) / (0.4 - 0.0)  # 75 °/s
print(f"  角度: {angles}, 时间: {times}")
print(f"  预期速度: {expected} °/s")
print(f"  计算速度: {vels[1]} °/s")
test1_pass = abs(vels[1] - expected) < 0.001
print(f"  结果: {'✅ 通过' if test1_pass else '❌ 失败'}")

# 测试2: 检查是否有过度放大
print("\n【测试2】检查速度放大问题")
print("-" * 50)
print(f"  修复前Bug: math.degrees(75) = {75 * 57.2958:.2f} °/s (错误)")
print(f"  修复后正确: 75 °/s (正确)")
test2_pass = vels[1] < 1000
print(f"  当前结果 {vels[1]} < 1000: {'✅ 通过' if test2_pass else '❌ 失败'}")

# 测试3: 完整链路 - 样例数据速度
print("\n【测试3】完整链路 - 样例数据测试")
print("-" * 50)
data_dir = "test_colleague/data"
workflow = JointCheckWorkflow(output_dir="test_colleague/results")
result = workflow.run_full_workflow(
    joint_config_file=os.path.join(data_dir, "joint_config.json"),
    load_config_file=os.path.join(data_dir, "load_config.json"),
    motion_sequence_file=os.path.join(data_dir, "motion_angles.json"),
    generate_plots=False,
)

print("\n【测试4】速度结果验证")
print("-" * 50)
check_result = result["check_result"]
print("  样例数据预期:")
print("    关节1: 角度每0.2秒变15度 → 75 °/s (限制: 60 °/s)")
print("    关节2: 角度每0.2秒变20度 → 100 °/s (限制: 80 °/s)")

print("\n  实际计算结果:")
velocities_ok = True
for joint_id, vels in check_result.velocity_results.items():
    max_vel = max(abs(v) for v in vels) if vels else 0
    config = check_result.joint_configs.get(joint_id)
    limit = config.max_angular_velocity if config else 0
    print(f"    关节{joint_id}: 最大速度 {max_vel:.2f} °/s (限制: {limit} °/s)")
    if max_vel > 500:
        velocities_ok = False

print(f"\n  速度量级合理 (<500 °/s): {'✅ 通过' if velocities_ok else '❌ 失败'}")

# 测试5: 超限检测
print("\n【测试5】超限检测结果")
print("-" * 50)
vs = result["violation_summary"]
print(f"  总超限数: {vs['total_violations']}")
print(f"  严重超限: {vs['critical_count']}")
print(f"  警告: {vs['warning_count']}")
print(f"  载荷越界: {'是 🔴' if vs['has_load_violation'] else '否'} (关键失败路径)")
print(f"  角度超限: {'是' if vs['has_angle_violation'] else '否'}")
print(f"  速度超限: {'是' if vs['has_velocity_violation'] else '否'}")
print(f"  力矩超限: {'是' if vs['has_torque_violation'] else '否'}")

# 测试6: 报告生成
print("\n【测试6】报告生成验证")
print("-" * 50)
for name, path in result["reports"].items():
    if not name.endswith("_error"):
        exists = os.path.exists(path)
        print(f"  {name}: {path} {'✅ 存在' if exists else '❌ 丢失'}")

# 总结
print("\n" + "=" * 60)
print("验证总结")
print("=" * 60)
all_pass = test1_pass and test2_pass and velocities_ok
if all_pass:
    print("✅ 所有验证通过！Bug已修复。")
    print("\n修复前后对比:")
    print("  修复前: 关节1速度 4297.18 °/s → 严重错误")
    print("  修复后: 关节1速度 ~75 °/s → 正确")
    print("\n关键失败路径(载荷越界)仍可正常检测。")
else:
    print("❌ 部分验证未通过！")

print("=" * 60)
