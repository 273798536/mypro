#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "robot_joint_checker"))

from src import JointCheckWorkflow


def main():
    print("=" * 60)
    print("同事测试 - 机器人关节力矩检查")
    print("=" * 60)
    print()

    data_dir = os.path.join(os.path.dirname(__file__), "data")
    output_dir = os.path.join(os.path.dirname(__file__), "results")

    joint_file = os.path.join(data_dir, "joint_config.json")
    load_file = os.path.join(data_dir, "load_config.json")
    motion_file = os.path.join(data_dir, "motion_angles.json")

    print(f"📁 关节配置: {joint_file}")
    print(f"📁 载荷配置: {load_file}")
    print(f"📁 动作序列: {motion_file}")
    print(f"📁 输出目录: {output_dir}")
    print()

    workflow = JointCheckWorkflow(output_dir=output_dir)

    result = workflow.run_full_workflow(
        joint_config_file=joint_file,
        load_config_file=load_file,
        motion_sequence_file=motion_file,
        generate_plots=False,
    )

    print()
    print("=" * 60)
    print("测试结果验证")
    print("=" * 60)

    if result["has_load_violation"]:
        print("✅ 成功检测到载荷越界!")
        print("   (关键失败路径验证通过)")
    else:
        print("❌ 未检测到载荷越界!")
        print("   (请检查载荷配置文件)")

    if result["violation_summary"]["has_angle_violation"]:
        print("✅ 成功检测到角度超限!")
    else:
        print("❌ 未检测到角度超限!")

    if result["violation_summary"]["has_velocity_violation"]:
        print("✅ 成功检测到速度超限!")
    else:
        print("❌ 未检测到速度超限!")

    print()
    print(f"📊 超限总数: {result['violation_summary']['total_violations']}")
    print(f"   - 严重: {result['violation_summary']['critical_count']}")
    print(f"   - 警告: {result['violation_summary']['warning_count']}")

    print()
    print(f"📄 报告文件:")
    for name, path in result["reports"].items():
        if not name.endswith("_error"):
            print(f"   - {name}: {path}")

    print()
    print("=" * 60)
    if result["has_load_violation"]:
        print("✅ 测试成功! 载荷越界的失败路径清晰可见。")
        print("   请查看报告获取详细信息。")
        sys.exit(0)
    else:
        print("❌ 测试失败! 未检测到预期的载荷越界。")
        sys.exit(1)


if __name__ == "__main__":
    main()
