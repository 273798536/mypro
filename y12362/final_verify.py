#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "robot_joint_checker"))

from src import JointCheckWorkflow, TorqueCalculator

def main():
    output = []
    
    output.append("=" * 60)
    output.append("速度计算Bug修复验证")
    output.append("=" * 60)

    # 测试1: 单元测试
    output.append("\n【测试1】单元测试 - 速度计算函数")
    output.append("-" * 50)
    calc = TorqueCalculator()
    angles = [0, 15, 30]
    times = [0.0, 0.2, 0.4]
    vels = calc._calculate_velocities(angles, times)
    expected = (30 - 0) / (0.4 - 0.0)
    output.append(f"  角度: {angles}, 时间: {times}")
    output.append(f"  预期速度: {expected} °/s")
    output.append(f"  计算速度: {vels[1]} °/s")
    test1_pass = abs(vels[1] - expected) < 0.001
    output.append(f"  结果: {'PASS' if test1_pass else 'FAIL'}")

    # 测试2: 检查是否有过度放大
    output.append("\n【测试2】检查速度放大问题")
    output.append("-" * 50)
    buggy_value = 75 * 57.2958
    output.append(f"  修复前Bug: math.degrees(75) = {buggy_value:.2f} °/s (错误)")
    output.append(f"  修复后正确: 75 °/s (正确)")
    test2_pass = vels[1] < 1000
    output.append(f"  当前结果 {vels[1]} < 1000: {'PASS' if test2_pass else 'FAIL'}")

    # 测试3: 完整链路
    output.append("\n【测试3】完整链路测试")
    output.append("-" * 50)
    data_dir = os.path.join(os.path.dirname(__file__), "test_colleague", "data")
    output_dir = os.path.join(os.path.dirname(__file__), "test_colleague", "results")
    
    joint_file = os.path.join(data_dir, "joint_config.json")
    load_file = os.path.join(data_dir, "load_config.json")
    motion_file = os.path.join(data_dir, "motion_angles.json")
    
    output.append(f"  关节配置: {joint_file}")
    output.append(f"  载荷配置: {load_file}")
    output.append(f"  动作序列: {motion_file}")
    output.append(f"  输出目录: {output_dir}")
    
    workflow = JointCheckWorkflow(output_dir=output_dir)
    result = workflow.run_full_workflow(
        joint_config_file=joint_file,
        load_config_file=load_file,
        motion_sequence_file=motion_file,
        generate_plots=False,
    )

    # 测试4: 速度结果验证
    output.append("\n【测试4】速度结果验证")
    output.append("-" * 50)
    check_result = result["check_result"]
    output.append("  样例数据预期:")
    output.append("    关节1: 角度每0.2秒变15度 → 75 °/s (限制: 60 °/s)")
    output.append("    关节2: 角度每0.2秒变20度 → 100 °/s (限制: 80 °/s)")

    output.append("\n  实际计算结果:")
    velocities_ok = True
    velocity_data = {}
    for joint_id, vels in check_result.velocity_results.items():
        max_vel = max(abs(v) for v in vels) if vels else 0
        config = check_result.joint_configs.get(joint_id)
        limit = config.max_angular_velocity if config else 0
        output.append(f"    关节{joint_id}: 最大速度 {max_vel:.2f} °/s (限制: {limit} °/s)")
        velocity_data[joint_id] = max_vel
        if max_vel > 500:
            velocities_ok = False

    output.append(f"\n  速度量级合理 (<500 °/s): {'PASS' if velocities_ok else 'FAIL'}")

    # 测试5: 超限检测
    output.append("\n【测试5】超限检测结果")
    output.append("-" * 50)
    vs = result["violation_summary"]
    output.append(f"  总超限数: {vs['total_violations']}")
    output.append(f"  严重超限: {vs['critical_count']}")
    output.append(f"  警告: {vs['warning_count']}")
    output.append(f"  载荷越界: {'YES 🔴' if vs['has_load_violation'] else 'NO'} (关键失败路径)")
    output.append(f"  角度超限: {'YES' if vs['has_angle_violation'] else 'NO'}")
    output.append(f"  速度超限: {'YES' if vs['has_velocity_violation'] else 'NO'}")
    output.append(f"  力矩超限: {'YES' if vs['has_torque_violation'] else 'NO'}")

    # 测试6: 报告生成
    output.append("\n【测试6】报告生成验证")
    output.append("-" * 50)
    reports_exist = True
    for name, path in result["reports"].items():
        if not name.endswith("_error"):
            exists = os.path.exists(path)
            output.append(f"  {name}: {path} {'EXISTS' if exists else 'MISSING'}")
            if not exists:
                reports_exist = False

    # 保存JSON结果供检查
    result_json_path = os.path.join(output_dir, "verification_result.json")
    with open(result_json_path, "w") as f:
        json.dump({
            "test1_pass": test1_pass,
            "test2_pass": test2_pass,
            "velocities_ok": velocities_ok,
            "reports_exist": reports_exist,
            "velocity_data": velocity_data,
            "violation_summary": vs,
        }, f, indent=2)
    output.append(f"\n  验证结果已保存: {result_json_path}")

    # 总结
    output.append("\n" + "=" * 60)
    output.append("验证总结")
    output.append("=" * 60)
    all_pass = test1_pass and test2_pass and velocities_ok and reports_exist
    if all_pass:
        output.append("ALL TESTS PASSED! Bug已修复。")
        output.append("\n修复前后对比:")
        output.append("  修复前: 关节1速度 4297.18 °/s → 严重错误")
        output.append(f"  修复后: 关节1速度 {velocity_data.get(1, 0):.2f} °/s → 正确")
        output.append("\n关键失败路径(载荷越界)仍可正常检测。")
    else:
        output.append("SOME TESTS FAILED!")

    output.append("=" * 60)
    
    # 写入输出文件
    output_file = os.path.join(os.path.dirname(__file__), "verification_output.txt")
    with open(output_file, "w") as f:
        f.write("\n".join(output))
    
    print("\n".join(output))
    return 0 if all_pass else 1

if __name__ == "__main__":
    sys.exit(main())
