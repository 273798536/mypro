#!/usr/bin/env python3
import os
import sys
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import JointCheckWorkflow, ReportConfig


def main():
    parser = argparse.ArgumentParser(
        description="机器人关节力矩检查工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用样例数据运行完整检查（载荷越界场景）
  python run_check.py --example exceeded

  # 使用正常样例数据运行
  python run_check.py --example normal

  # 使用自定义数据文件
  python run_check.py \\
    --joint examples/joint_config.json \\
    --load examples/load_config_exceeded.json \\
    --motion examples/motion_sequence.json \\
    --output my_reports

  # 只生成文本报告，不生成图表
  python run_check.py --example exceeded --no-plots --format text
        """,
    )

    parser.add_argument(
        "--joint",
        "-j",
        help="关节配置文件路径 (JSON)",
    )
    parser.add_argument(
        "--load",
        "-l",
        help="载荷配置文件路径 (JSON)",
    )
    parser.add_argument(
        "--motion",
        "-m",
        help="动作序列文件路径 (JSON/CSV)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="reports",
        help="输出目录 (默认: reports)",
    )
    parser.add_argument(
        "--example",
        choices=["normal", "exceeded"],
        help="使用内置样例数据",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="不生成可视化图表",
    )
    parser.add_argument(
        "--format",
        choices=["html", "text", "json", "all"],
        default="all",
        help="报告输出格式 (默认: all)",
    )
    parser.add_argument(
        "--include-raw",
        action="store_true",
        help="在报告中包含原始数据",
    )

    args = parser.parse_args()

    example_dir = os.path.join(os.path.dirname(__file__), "examples")

    if args.example:
        joint_file = os.path.join(example_dir, "joint_config.json")
        motion_file = os.path.join(example_dir, "motion_sequence.json")
        if args.example == "exceeded":
            load_file = os.path.join(example_dir, "load_config_exceeded.json")
            print(f"📋 使用样例数据: 载荷越界场景")
        else:
            load_file = os.path.join(example_dir, "load_config_normal.json")
            print(f"📋 使用样例数据: 正常场景")
    else:
        joint_file = args.joint
        load_file = args.load
        motion_file = args.motion

        if not all([joint_file, load_file, motion_file]):
            print("❌ 错误: 请指定所有数据文件或使用 --example 参数")
            print()
            parser.print_help()
            sys.exit(1)

    report_config = ReportConfig(
        include_raw_data=args.include_raw,
        include_plots=not args.no_plots,
        format=args.format,
    )

    workflow = JointCheckWorkflow(
        output_dir=args.output,
        report_config=report_config,
    )

    result = workflow.run_full_workflow(
        joint_config_file=joint_file,
        load_config_file=load_file,
        motion_sequence_file=motion_file,
        generate_plots=not args.no_plots,
    )

    print()
    print("=" * 60)
    print("检查总结")
    print("=" * 60)
    print(f"  输出目录: {os.path.abspath(args.output)}")
    print(f"  总超限数: {result['violation_summary']['total_violations']}")
    print(f"  严重超限: {result['violation_summary']['critical_count']}")
    print(f"  警告: {result['violation_summary']['warning_count']}")

    if result["has_load_violation"]:
        print()
        print("  🔴 检测到载荷越界! 这是关键失败路径!")
        print("     请查看报告获取详细信息。")

    if result["has_critical_violations"]:
        print()
        print("  ⚠️  存在严重超限，请务必检查!")
        sys.exit(2)

    print()
    print("✅ 检查完成!")
    sys.exit(0)


if __name__ == "__main__":
    main()
