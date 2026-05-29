import argparse
import sys
from pathlib import Path

from .parser import TrajectoryParser
from .analyzer import RewardAnalyzer
from .detector import AnomalyDetector
from .reporter import ReportGenerator


def main():
    parser = argparse.ArgumentParser(
        description="强化学习奖励审计工具 - 分析轨迹数据，检测奖励泄漏和异常行为",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python -m rl_reward_audit audit trajectory.json
  python -m rl_reward_audit audit trajectory.json --output-dir ./reports
  python -m rl_reward_audit audit trajectory.json --leakage-threshold 2.5
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    audit_parser = subparsers.add_parser("audit", help="执行奖励审计")
    audit_parser.add_argument("input_file", help="轨迹数据文件路径 (JSON或CSV)")
    audit_parser.add_argument(
        "--output-dir", "-o", default="./audit_reports", help="报告输出目录"
    )
    audit_parser.add_argument(
        "--no-auto-correct", action="store_true", help="禁用自动数据修正"
    )
    audit_parser.add_argument(
        "--strict", action="store_true", help="启用严格模式（缺失字段报错）"
    )
    audit_parser.add_argument(
        "--leakage-threshold",
        type=float,
        default=3.0,
        help="奖励泄漏Z-score阈值 (默认: 3.0)",
    )
    audit_parser.add_argument(
        "--loop-min-length",
        type=int,
        default=3,
        help="动作循环最小长度 (默认: 3)",
    )
    audit_parser.add_argument(
        "--loop-max-repeat",
        type=int,
        default=3,
        help="动作循环最大重复次数 (默认: 3)",
    )
    audit_parser.add_argument(
        "--quiet", "-q", action="store_true", help="静默模式，不输出终端摘要"
    )

    demo_parser = subparsers.add_parser("demo", help="生成示例数据并运行审计")
    demo_parser.add_argument(
        "--output-dir", "-o", default="./demo_reports", help="报告输出目录"
    )

    args = parser.parse_args()

    if args.command == "audit":
        run_audit(args)
    elif args.command == "demo":
        run_demo(args)
    else:
        parser.print_help()
        sys.exit(1)


def run_audit(args):
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"错误: 文件不存在: {input_path}")
        sys.exit(1)

    print(f"📂 正在解析轨迹数据: {input_path.name}")

    parser = TrajectoryParser(
        auto_correct=not args.no_auto_correct,
        strict=args.strict,
    )

    try:
        parsing_result = parser.parse_file(str(input_path))
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        sys.exit(1)

    print(f"✅ 解析完成: {len(parsing_result.trajectories)} 条轨迹")
    if parsing_result.corrections:
        print(f"⚠️  自动修正: {len(parsing_result.corrections)} 处")

    print("🔍 正在分析奖励数据...")
    analyzer = RewardAnalyzer(parsing_result)
    analysis_result = analyzer.analyze()

    print("🚨 正在检测异常模式...")
    detector = AnomalyDetector(
        parsing_result,
        reward_leakage_threshold=args.leakage_threshold,
        loop_min_length=args.loop_min_length,
        loop_max_repeat=args.loop_max_repeat,
    )
    anomalies = detector.detect_all()
    analysis_result.anomalies = anomalies

    print(f"✅ 检测完成: {len(anomalies)} 处异常")

    print("📝 正在生成报告...")
    reporter = ReportGenerator(analysis_result)

    output_dir = Path(args.output_dir)
    reporter.save_all(str(output_dir))

    if not args.quiet:
        print()
        print(reporter.generate_terminal_summary())

    print(f"📦 报告已保存至: {output_dir}/")
    print(f"   - {output_dir.name}/audit_report_summary.txt (终端摘要)")
    print(f"   - {output_dir.name}/audit_report_human.md (人类可读报告)")
    print(f"   - {output_dir.name}/audit_report_machine.json (机器可读数据)")


def run_demo(args):
    print("🎬 生成演示数据...")
    demo_data = generate_demo_data()

    import json
    import tempfile

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(demo_data, f, ensure_ascii=False, indent=2)
        temp_path = f.name

    print(f"📂 演示数据已生成: {temp_path}")

    class DemoArgs:
        input_file = temp_path
        output_dir = args.output_dir
        no_auto_correct = False
        strict = False
        leakage_threshold = 1.5
        loop_min_length = 2
        loop_max_repeat = 3
        quiet = False

    run_audit(DemoArgs())


def generate_demo_data():
    trajectories = []

    trajectory1 = {
        "trajectory_id": "demo_traj_001",
        "metadata": {"agent": "PPO", "environment": "GridWorld-v1"},
        "steps": [
            {
                "step_id": 0,
                "state": {"x": 0, "y": 0, "has_key": False, "coins": 0},
                "action": {"name": "move_right", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "exploration", "value": 0.05, "weight": 1.0},
                    {"name": "coin", "value": 0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 1,
                "state": {"x": 1, "y": 0, "has_key": False, "coins": 1},
                "action": {"name": "move_up", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "exploration", "value": 0.05, "weight": 1.0},
                    {"name": "coin", "value": 0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 2,
                "state": {"x": 1, "y": 1, "has_key": False, "coins": 2},
                "action": {"name": "move_right", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "distance_to_goal", "value": -0.05, "weight": 1.0},
                    {"name": "coin", "value": 0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 3,
                "state": {"x": 2, "y": 1, "has_key": True},
                "action": {"name": "pick_up_key", "parameters": {}},
                "reward_items": [
                    {"name": "key_collection", "value": 1.0, "weight": 1.0},
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 4,
                "state": {"x": 2, "y": 1, "has_key": True},
                "action": {"name": "glitch_exploit", "parameters": {"frames": 5}},
                "reward_items": [
                    {"name": "key_collection", "value": 100.0, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 5,
                "state": {"x": 2, "y": 1, "has_key": True},
                "action": {"name": "glitch_exploit", "parameters": {"frames": 5}},
                "reward_items": [
                    {"name": "key_collection", "value": 100.0, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 6,
                "state": {"x": 2, "y": 2, "has_key": True, "coins": 3},
                "action": {"name": "move_up", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "coin", "value": 50.0, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 7,
                "state": {"x": 2, "y": 3, "has_key": True, "coins": 4},
                "action": {"name": "move_up", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "coin", "value": 0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 8,
                "state": {"x": 2, "y": 4, "has_key": True, "coins": 5},
                "action": {"name": "move_up", "parameters": {"distance": 1}},
                "reward_items": [
                    {"name": "movement", "value": -0.1, "weight": 1.0},
                    {"name": "coin", "value": 0.1, "weight": 1.0},
                ],
                "done": False,
            },
            {
                "step_id": 9,
                "state": {"x": 2, "y": 5, "has_key": True},
                "action": {"name": "open_door", "parameters": {}},
                "reward_items": [
                    {"name": "goal_reached", "value": 10.0, "weight": 1.0},
                ],
                "done": True,
            },
        ],
    }

    trajectory2 = {
        "trajectory_id": "demo_traj_002",
        "steps": [
            {"state": {"x": 0, "y": 0}, "action": "move_right"},
            {"state": {"x": 1, "y": 0}, "action": "move_left"},
            {"state": {"x": 0, "y": 0}, "action": "move_right"},
            {"state": {"x": 1, "y": 0}, "action": "move_left"},
            {"state": {"x": 0, "y": 0}, "action": "move_right"},
            {"state": {"x": 1, "y": 0}, "action": "move_left"},
            {"state": {"x": 0, "y": 0}, "action": "move_right"},
            {"state": {"x": 1, "y": 0}, "action": "move_left"},
            {"state": {"x": 0, "y": 0}, "action": "move_right"},
            {"state": {"x": 1, "y": 0}, "action": "move_left"},
        ],
    }

    trajectories.append(trajectory1)
    trajectories.append(trajectory2)

    return {"trajectories": trajectories}


if __name__ == "__main__":
    main()
