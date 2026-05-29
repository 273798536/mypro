"""命令行接口 - 排课冲突最小化CLI工具"""

import argparse
import sys
import json
from typing import List, Optional
from pathlib import Path

from . import __version__
from .loader import DataLoader
from .solver import ScheduleSolver
from .scoring import ScoreInterpreter
from .reporter import Reporter
from .visualizer import ScheduleVisualizer


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog="schedule-solver",
        description="排课冲突最小化CLI工具 - 解决教师时间、教室容量、实验课连堂等冲突问题",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本使用 - 从JSON文件加载数据
  schedule-solver --courses data/courses.json --classrooms data/classrooms.json \\
                  --teachers data/teachers.json --timeslots data/timeslots.json

  # 使用CSV文件
  schedule-solver --courses data/courses.csv --classrooms data/classrooms.csv \\
                  --teachers data/teachers.csv --timeslots data/timeslots.csv

  # 生成完整报告
  schedule-solver --courses courses.json --classrooms classrooms.json \\
                  --teachers teachers.json --timeslots timeslots.json \\
                  --format report --output 排课报告.md

  # 生成机器可读JSON
  schedule-solver --courses courses.json --classrooms classrooms.json \\
                  --teachers teachers.json --timeslots timeslots.json \\
                  --format json --output result.json

  # 追溯排课过程
  schedule-solver --courses courses.json --classrooms classrooms.json \\
                  --teachers teachers.json --timeslots timeslots.json --trace

  # 查看某门课的详细信息
  schedule-solver --courses courses.json --classrooms classrooms.json \\
                  --teachers teachers.json --timeslots timeslots.json \\
                  --explain "高等数学"

  # 显示可视化图表
  schedule-solver --courses courses.json --classrooms classrooms.json \\
                  --teachers teachers.json --timeslots timeslots.json --charts
        """
    )

    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"schedule-solver v{__version__}"
    )

    input_group = parser.add_argument_group("输入数据文件")
    input_group.add_argument(
        "--courses",
        required=True,
        help="课程清单文件 (JSON或CSV格式)"
    )
    input_group.add_argument(
        "--classrooms",
        required=True,
        help="教室清单文件 (JSON或CSV格式)"
    )
    input_group.add_argument(
        "--teachers",
        required=True,
        help="教师清单文件 (JSON或CSV格式)"
    )
    input_group.add_argument(
        "--timeslots",
        required=True,
        help="时间段清单文件 (JSON或CSV格式)"
    )

    output_group = parser.add_argument_group("输出控制")
    output_group.add_argument(
        "--format",
        choices=["terminal", "report", "json"],
        default="terminal",
        help="输出格式: terminal(终端摘要), report(人读Markdown报告), json(机器可读JSON)"
    )
    output_group.add_argument(
        "--output",
        help="输出文件路径 (不指定则输出到终端)"
    )
    output_group.add_argument(
        "--charts",
        action="store_true",
        help="在终端输出中显示可视化图表"
    )

    analysis_group = parser.add_argument_group("分析选项")
    analysis_group.add_argument(
        "--trace",
        action="store_true",
        help="输出完整的排课决策过程追溯"
    )
    analysis_group.add_argument(
        "--explain",
        metavar="课程名称",
        help="解释指定课程的排课结果或失败原因"
    )
    analysis_group.add_argument(
        "--max-iterations",
        type=int,
        default=100,
        help="最大迭代次数 (默认: 100)"
    )

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    """主函数入口"""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        print("⏳ 正在加载数据...", file=sys.stderr)
        loader = DataLoader()
        courses, classrooms, teachers, timeslots = loader.load_all(
            courses_file=args.courses,
            classrooms_file=args.classrooms,
            teachers_file=args.teachers,
            timeslots_file=args.timeslots
        )

        print(f"✅ 数据加载完成: {len(courses)}门课, {len(classrooms)}间教室, "
              f"{len(teachers)}位教师, {len(timeslots)}个时间段", file=sys.stderr)

        print("🤖 正在进行约束求解...", file=sys.stderr)
        solver = ScheduleSolver(courses, classrooms, teachers, timeslots)
        solution = solver.solve(max_iterations=args.max_iterations)

        print("📊 正在计算方案评分...", file=sys.stderr)
        scorer = ScoreInterpreter()
        score, score_breakdown = scorer.calculate_score(solution, solver)
        solution.score = score
        solution.score_breakdown = score_breakdown

        reporter = Reporter(solution, solver, loader, score, score_breakdown)

        if args.format == "json":
            data = reporter.generate_machine_readable_json(
                include_trace=args.trace,
                explain_course=args.explain
            )
            if args.output:
                reporter.save_report(args.output, format_type="json",
                                     include_trace=args.trace,
                                     explain_course=args.explain)
                print(f"💾 机器可读结果已保存到: {args.output}", file=sys.stderr)
            else:
                print(json.dumps(data, ensure_ascii=False, indent=2))

        elif args.format == "report":
            report = reporter.generate_human_readable_report()
            if args.output:
                reporter.save_report(args.output, format_type="report")
                print(f"💾 完整报告已保存到: {args.output}", file=sys.stderr)
            else:
                print(report)

        else:
            summary = reporter.generate_terminal_summary()
            print(summary)

            if args.charts:
                visualizer = ScheduleVisualizer(solution, score_breakdown)
                print(visualizer.generate_all_charts())

            if args.trace:
                print("\n" + "=" * 80)
                print("  🔍 排课决策过程追溯")
                print("=" * 80)
                trace_data = reporter.generate_machine_readable_json(include_trace=True)
                for i, step in enumerate(trace_data.get("scheduling_trace", []), 1):
                    status = "✅" if step["操作"] == "排课成功" else "❌"
                    print(f"\n{i}. {status} {step['课程']}")
                    print(f"   操作: {step['操作']}")
                    if step.get("教室"):
                        print(f"   教室: {step['教室']}")
                    if step.get("时间"):
                        print(f"   时间: {step['时间']}")
                    print(f"   原因: {step['原因']}")
                    if step.get("发现冲突数", 0) > 0:
                        print(f"   发现冲突: {step['发现冲突数']} 个")
                    print(f"   备选方案数: {step['考虑的备选方案数']}")

            if args.explain:
                explanation_data = reporter.generate_machine_readable_json(
                    explain_course=args.explain
                )
                if "course_explanation" in explanation_data:
                    exp = explanation_data["course_explanation"]
                    print("\n" + "=" * 80)
                    print(f"  📖 课程详情: {args.explain}")
                    print("=" * 80)
                    for key, value in exp.items():
                        if isinstance(value, list):
                            print(f"\n{key}:")
                            for item in value:
                                if isinstance(item, dict):
                                    for k, v in item.items():
                                        print(f"  - {k}: {v}")
                                else:
                                    print(f"  - {item}")
                        elif isinstance(value, dict):
                            print(f"\n{key}:")
                            for k, v in value.items():
                                print(f"  {k}: {v}")
                        else:
                            print(f"{key}: {value}")
                else:
                    print(f"\n⚠️  未找到课程: {args.explain}")

        if solution.unscheduled_count > 0 or solution.total_conflicts > 0:
            return 1
        return 0

    except FileNotFoundError as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        return 2
    except ValueError as e:
        print(f"❌ 数据错误: {e}", file=sys.stderr)
        return 3
    except Exception as e:
        print(f"❌ 意外错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 4


if __name__ == "__main__":
    sys.exit(main())
