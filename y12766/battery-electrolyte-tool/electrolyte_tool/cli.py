import argparse
import os
import sys
from pathlib import Path

from .data_loader import DataLoader
from .spectrum_analyzer import SpectrumAnalyzer
from .report_generator import ReportGenerator


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="electrolyte-tool",
        description="电池电解液配比实验数据整合与谱图分析工具 - 面向环境监测员",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 最常用：一键分析样例数据
  electrolyte-tool analyze --demo

  # 分析自己的数据（实验记录+谱图数据）
  electrolyte-tool analyze \\
      --experiment data/实验记录旧表.csv \\
      --spectrum   data/谱图数据.csv \\
      --conditions data/反应条件.json \\
      --notes      data/补录备注.txt \\
      --output     分析报告.html

  # 只看典型重叠案例（用于培训/复核演示）
  electrolyte-tool show-cases

  # 严格模式：重叠阈值收紧，不放过边界情况
  electrolyte-tool analyze --demo --overlap-threshold 0.05

  # 生成纯文本报告（方便贴邮件）
  electrolyte-tool analyze --demo --format txt --output 报告.txt
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用子命令")

    analyze_parser = subparsers.add_parser(
        "analyze",
        help="加载数据并执行谱图复核分析",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="""
分析子命令 - 整合各种来源的实验数据，执行谱峰重叠检测，生成报告。
支持旧表格式、夹杂备注的谱图数据、共享盘反应条件、补录备注等混乱输入。
        """,
    )
    analyze_parser.add_argument(
        "--experiment", "-e",
        type=str, default=None,
        help="实验记录CSV路径（旧表，可含漏填单位、混合列名）",
    )
    analyze_parser.add_argument(
        "--spectrum", "-s",
        type=str, default=None,
        help="谱图数据CSV路径（可夹着人工备注行、#注释）",
    )
    analyze_parser.add_argument(
        "--conditions", "-c",
        type=str, default=None,
        help="共享盘上的反应条件JSON路径",
    )
    analyze_parser.add_argument(
        "--notes", "-n",
        type=str, default=None,
        help="补录备注文本文件路径",
    )
    analyze_parser.add_argument(
        "--demo",
        action="store_true", default=False,
        help="使用内置样例数据运行（含坏数据、漏填、补录备注等真实情况）",
    )
    analyze_parser.add_argument(
        "--output", "-o",
        type=str, default=None,
        help="输出报告路径。不填则打印到控制台",
    )
    analyze_parser.add_argument(
        "--format", "-f",
        choices=["html", "txt", "json"],
        default="html",
        help="报告格式: html(默认,课题组可读) / txt(纯文本) / json(程序处理)",
    )
    analyze_parser.add_argument(
        "--overlap-threshold", "-t",
        type=float, default=0.08,
        help="谱峰重叠判定阈值(ppm)，默认0.08；值越小越严格",
    )
    analyze_parser.add_argument(
        "--verbose", "-v",
        action="store_true", default=False,
        help="显示详细加载过程和警告",
    )

    cases_parser = subparsers.add_parser(
        "show-cases",
        help="显示3个典型谱峰重叠边界案例（每个都真实改变判定结果）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="""
显示典型案例子命令 - 用于培训、复核演示。
展示3个真实的边界案例：DMC/EMC接近峰、FEC/杂质误判、三峰聚堆干扰。
每个案例都真的会改变最终判定结论。
        """,
    )
    cases_parser.add_argument(
        "--output", "-o",
        type=str, default=None,
        help="输出案例报告路径。不填则打印到控制台",
    )
    cases_parser.add_argument(
        "--format", "-f",
        choices=["html", "txt"],
        default="txt",
        help="报告格式: txt(默认) / html",
    )

    return parser


def _get_demo_paths() -> dict:
    base = Path(__file__).parent.parent / "examples"
    return {
        "experiment": str(base / "old_spreadsheet.csv"),
        "spectrum": str(base / "spectrum_data.csv"),
        "conditions": str(base / "reaction_conditions.json"),
        "notes": str(base / "manual_notes.txt"),
    }


def cmd_analyze(args: argparse.Namespace) -> int:
    if args.demo:
        paths = _get_demo_paths()
        exp_csv = paths["experiment"]
        spec_csv = paths["spectrum"]
        cond_json = paths["conditions"]
        notes_txt = paths["notes"]
        print("使用内置样例数据运行分析...")
    else:
        exp_csv = args.experiment
        spec_csv = args.spectrum
        cond_json = args.conditions
        notes_txt = args.notes
        if not exp_csv and not spec_csv:
            print("错误: 至少提供 --experiment 或 --spectrum 其中一个，或使用 --demo")
            return 2

    loader = DataLoader(verbose=args.verbose)
    records = loader.load_all(
        experiment_csv=exp_csv,
        spectrum_csv=spec_csv,
        reaction_json=cond_json,
        notes_txt=notes_txt,
    )

    if not records:
        print("错误: 未能加载到任何有效数据，请检查文件路径和格式")
        return 1

    print(f"已加载 {len(records)} 条实验记录")
    if loader.warnings:
        print(f"加载过程中发现 {len(loader.warnings)} 条警告")
        if args.verbose:
            for w in loader.warnings:
                print(f"  - {w}")

    analyzer = SpectrumAnalyzer(overlap_threshold=args.overlap_threshold)
    results = analyzer.analyze_batch(records)

    changed = sum(1 for r in results if r.result_changed)
    print(f"分析完成: {len(results)} 条，其中 {changed} 条复核后结论有变化")

    generator = ReportGenerator()
    if args.format == "html":
        report = generator.generate_html(records, results, loader.warnings)
    elif args.format == "txt":
        report = generator.generate_text(records, results, loader.warnings)
    else:
        report = generator.generate_json(records, results, loader.warnings)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"报告已保存至: {os.path.abspath(args.output)}")
    else:
        print("\n" + "=" * 60)
        print(report)

    return 0


def cmd_show_cases(args: argparse.Namespace) -> int:
    cases = SpectrumAnalyzer.get_overlap_cases()
    generator = ReportGenerator()

    if args.format == "html":
        report = generator.generate_cases_html(cases)
    else:
        report = generator.generate_cases_text(cases)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"案例报告已保存至: {os.path.abspath(args.output)}")
    else:
        print(report)

    return 0


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "analyze":
        return cmd_analyze(args)
    elif args.command == "show-cases":
        return cmd_show_cases(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())
