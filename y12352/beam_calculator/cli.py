#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from .units import UnitSystem, Unit, Quantity
from .models import Beam, Load, LoadType, BoundaryCondition, BeamSection, Material
from .validator import InputValidator
from .calculator import BeamCalculator
from .steps import StepTracker
from .warnings import WarningCollector
from .report import ReportGenerator
from .charts import ChartGenerator
from .io import DataImporter, RawData, ProcessedData


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="beam-calc",
        description="桥梁简支梁受力分析器 - Simply Supported Beam Stress Analyzer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 从JSON文件导入并计算
  beam-calc --input beam.json --output report.txt

  # 指定长度和载荷直接计算
  beam-calc --length 10 --unit m \\
    --load "concentrated,10000,3" \\
    --load "uniform,5000,0,10" \\
    --output report.md --format md

  # 多源导入: 梁参数+载荷清单+备注
  beam-calc --beam-json beam_params.json \\
    --loads-csv loads.csv \\
    --notes-csv notes.csv \\
    --output-dir ./output

  # 单位混合输入
  beam-calc --length 500 --unit cm \\
    --load "concentrated,10,kN,2,m" \\
    --load "uniform,50,N/mm,0,5,m" \\
    --output mixed_units_report.txt
        """,
    )

    parser.add_argument("-v", "--version", action="version", version="%(prog)s 1.0.0")
    parser.add_argument("--verbose", action="store_true", help="显示详细输出")
    parser.add_argument("--debug", action="store_true", help="调试模式，保留所有中间数据")

    io_group = parser.add_argument_group("输入输出选项")
    io_group.add_argument("-i", "--input", help="主输入JSON文件 (包含完整的梁和载荷定义)")
    io_group.add_argument("--beam-json", help="梁参数JSON文件")
    io_group.add_argument("--loads-csv", help="载荷清单CSV文件")
    io_group.add_argument("--notes-csv", help="备注CSV文件")
    io_group.add_argument("-o", "--output", help="输出报告文件路径")
    io_group.add_argument("-d", "--output-dir", default="./output", help="输出目录 (默认: ./output)")
    io_group.add_argument("-f", "--format", choices=["txt", "md", "json", "all"], default="txt",
                          help="报告格式 (默认: txt)")
    io_group.add_argument("--no-charts", action="store_true", help="不生成图表")
    io_group.add_argument("--chart-format", choices=["png", "svg", "pdf"], default="png",
                          help="图表格式 (默认: png)")

    beam_group = parser.add_argument_group("梁参数 (命令行直接指定)")
    beam_group.add_argument("--length", type=float, help="梁长度")
    beam_group.add_argument("--unit", default="m", help="长度单位 (默认: m)")
    beam_group.add_argument("--left-support", default="pinned",
                           choices=["pinned", "roller", "fixed", "铰支", "滚动支座", "固定"])
    beam_group.add_argument("--right-support", default="roller",
                           choices=["pinned", "roller", "fixed", "铰支", "滚动支座", "固定"])
    beam_group.add_argument("--name", default="beam", help="梁名称")

    load_group = parser.add_argument_group("载荷选项 (命令行直接指定)")
    load_group.add_argument("--load", action="append", default=[],
                           help="""载荷定义，格式:
  集中力: type,magnitude,position
         (默认单位: 力单位由 --unit-system 决定，engineering=kN, metric=N)
  集中力偶: moment,magnitude,position
         (默认单位: 力矩单位由 --unit-system 决定，engineering=kN·m, metric=N·m)
  均布载荷: uniform,magnitude,start,end
         (默认单位: 分布载荷单位由 --unit-system 决定，engineering=kN/m, metric=N/m)
  三角分布: triangular,magnitude,start,end
  梯形分布: trapezoidal,magnitude_start,magnitude_end,start,end
  可显式指定单位: type,magnitude,mag_unit,position,pos_unit
                   type,magnitude,mag_unit,start,start_unit,end,end_unit
  示例:
    --load "concentrated,10,3"                  (engineering系统: 10kN @ 3m)
    --load "concentrated,10000,N,3,m"           (10000N @ 3m)
    --load "uniform,5,0,10"                     (engineering系统: 5kN/m, 0~10m)
    --load "uniform,5000,N/m,0,m,10,m"         (5000N/m, 0~10m)
""")

    unit_group = parser.add_argument_group("单位系统")
    unit_group.add_argument("--unit-system", choices=["metric", "engineering"], default="engineering",
                           help="单位系统 (默认: engineering=kN,m,kN·m)")
    unit_group.add_argument("--force-unit", help="力单位")
    unit_group.add_argument("--length-unit", help="长度单位")
    unit_group.add_argument("--moment-unit", help="力矩单位")

    report_group = parser.add_argument_group("报告内容选项")
    report_group.add_argument("--no-formulas", action="store_true", help="不包含公式")
    report_group.add_argument("--no-steps", action="store_true", help="不包含计算步骤")
    report_group.add_argument("--no-intermediate", action="store_true", help="不包含中间量")
    report_group.add_argument("--no-raw-data", action="store_true", help="不包含原始输入数据")
    report_group.add_argument("--precision", type=int, default=4, help="数值精度 (默认: 4)")

    calc_group = parser.add_argument_group("计算选项")
    calc_group.add_argument("--points", type=int, default=100, help="计算点数 (默认: 100)")
    calc_group.add_argument("--no-validate", action="store_true", help="跳过输入验证")
    calc_group.add_argument("--calculate-deflection", action="store_true", help="计算挠度 (需要E和I)")
    calc_group.add_argument("--e-modulus", type=float, help="弹性模量 E")
    calc_group.add_argument("--e-unit", default="MPa", help="弹性模量单位")
    calc_group.add_argument("--inertia", type=float, help="截面惯性矩 I")
    calc_group.add_argument("--inertia-unit", default="m^4", help="惯性矩单位")

    return parser


def parse_load_string(load_str: str) -> Dict[str, Any]:
    parts = [p.strip() for p in load_str.split(",")]
    if len(parts) < 3:
        raise ValueError(f"载荷格式错误: {load_str}")

    load_type_str = parts[0].lower()
    load_data: Dict[str, Any] = {}

    if load_type_str in ["concentrated", "point", "集中力", "集中荷载"]:
        load_data["type"] = "concentrated_force"
        load_data["magnitude"] = float(parts[1])
        if len(parts) >= 5:
            load_data["magnitude_unit"] = parts[2]
            load_data["position"] = float(parts[3])
            load_data["position_unit"] = parts[4]
        else:
            load_data["position"] = float(parts[2])

    elif load_type_str in ["moment", "concentrated_moment", "集中力偶", "集中弯矩"]:
        load_data["type"] = "concentrated_moment"
        load_data["magnitude"] = float(parts[1])
        if len(parts) >= 5:
            load_data["magnitude_unit"] = parts[2]
            load_data["position"] = float(parts[3])
            load_data["position_unit"] = parts[4]
        else:
            load_data["position"] = float(parts[2])

    elif load_type_str in ["uniform", "udl", "均布荷载"]:
        load_data["type"] = "uniform_distributed"
        load_data["magnitude"] = float(parts[1])
        if len(parts) >= 6:
            load_data["magnitude_unit"] = parts[2]
            load_data["start_position"] = float(parts[3])
            load_data["start_unit"] = parts[4]
            load_data["end_position"] = float(parts[5])
            load_data["end_unit"] = parts[6] if len(parts) >= 7 else parts[4]
        else:
            load_data["start_position"] = float(parts[2])
            load_data["end_position"] = float(parts[3])

    elif load_type_str in ["triangular", "三角分布", "三角形"]:
        load_data["type"] = "triangular_distributed"
        load_data["magnitude"] = float(parts[1])
        if len(parts) >= 6:
            load_data["magnitude_unit"] = parts[2]
            load_data["start_position"] = float(parts[3])
            load_data["start_unit"] = parts[4]
            load_data["end_position"] = float(parts[5])
            load_data["end_unit"] = parts[6] if len(parts) >= 7 else parts[4]
        else:
            load_data["start_position"] = float(parts[2])
            load_data["end_position"] = float(parts[3])

    elif load_type_str in ["trapezoidal", "梯形分布", "梯形"]:
        load_data["type"] = "trapezoidal_distributed"
        load_data["magnitude"] = float(parts[1])
        load_data["magnitude_end"] = float(parts[2])
        if len(parts) >= 7:
            load_data["magnitude_unit"] = parts[3]
            load_data["start_position"] = float(parts[4])
            load_data["start_unit"] = parts[5]
            load_data["end_position"] = float(parts[6])
            load_data["end_unit"] = parts[7] if len(parts) >= 8 else parts[5]
        else:
            load_data["start_position"] = float(parts[3])
            load_data["end_position"] = float(parts[4])

    else:
        raise ValueError(f"未知载荷类型: {load_type_str}")

    return load_data


def build_beam_from_args(args: argparse.Namespace, importer: DataImporter) -> Beam:
    if args.input:
        importer.import_json(args.input)
    if args.beam_json:
        importer.import_json(args.beam_json)
    if args.loads_csv:
        importer.import_csv(args.loads_csv, "loads")
    if args.notes_csv:
        importer.import_csv(args.notes_csv, "notes")

    if args.length is not None:
        importer.import_beam_length(args.length, args.unit, source="command_line")

    if args.left_support or args.right_support:
        importer.import_supports(args.left_support, args.right_support, source="command_line")

    for load_str in args.load:
        load_data = parse_load_string(load_str)
        importer.import_load(load_data, source="command_line")

    beam = importer.process()

    if args.calculate_deflection:
        if args.e_modulus is not None and args.inertia is not None:
            beam.material = Material(
                elastic_modulus=Quantity(args.e_modulus, Unit.from_string(args.e_unit)),
                name="CLI指定",
            )
            beam.section = BeamSection(
                moment_of_inertia=Quantity(args.inertia, Unit.M),
                name="CLI指定",
            )

    beam.name = args.name
    return beam


def main(argv: Optional[List[str]] = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)

    if not (args.input or args.beam_json or args.length is not None or args.loads_csv):
        parser.print_help()
        print("\n错误: 必须指定至少一个输入源 (--input, --beam-json, --length, 或 --loads-csv)")
        return 1

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.unit_system == "engineering":
        unit_system = UnitSystem.metric_engineering()
    else:
        unit_system = UnitSystem.metric()

    if args.force_unit:
        unit_system.force_unit = Unit.from_string(args.force_unit)
    if args.length_unit:
        unit_system.length_unit = Unit.from_string(args.length_unit)
    if args.moment_unit:
        unit_system.moment_unit = Unit.from_string(args.moment_unit)

    warnings = WarningCollector()
    steps = StepTracker()

    importer = DataImporter(unit_system=unit_system)

    try:
        beam = build_beam_from_args(args, importer)
    except Exception as e:
        print(f"错误: 输入数据解析失败 - {e}", file=sys.stderr)
        if args.debug:
            raise
        return 2

    if args.verbose:
        print(f"梁长度: {beam.length}")
        print(f"支座: {beam.left_support.value} - {beam.right_support.value}")
        print(f"载荷数量: {len(beam.loads)}")
        for i, load in enumerate(beam.loads, 1):
            print(f"  #{i}: {load.load_type.value} {load.magnitude} @ "
                  f"{load.position or f'{load.start_position}-{load.end_position}'}")

    raw_data_path = output_dir / "raw_data.json"
    processed_data_path = output_dir / "processed_data.json"
    importer.save_raw(str(raw_data_path))

    calculator = BeamCalculator(
        unit_system=unit_system,
        warning_collector=warnings,
        step_tracker=steps,
        num_points=args.points,
    )

    try:
        result = calculator.calculate(beam, validate=not args.no_validate)
    except ValueError as e:
        print(f"错误: 计算失败 - {e}", file=sys.stderr)
        print("\n收集到的警告:", file=sys.stderr)
        print(warnings, file=sys.stderr)
        if args.debug:
            raise
        return 3

    importer.processed_data.calculation_result = result
    importer.save_processed(str(processed_data_path))

    if args.verbose:
        print(f"\n左支座反力: {result.left_reaction}")
        print(f"右支座反力: {result.right_reaction}")
        print(f"最大剪力: {result.max_shear_force}")
        print(f"最大弯矩: {result.max_bending_moment}")
        if result.max_deflection:
            print(f"最大挠度: {result.max_deflection}")
        if warnings:
            print(f"\n警告 ({len(warnings)} 项):")
            print(warnings)

    chart_paths = {}
    if not args.no_charts:
        try:
            chart_gen = ChartGenerator(warning_collector=warnings)
            chart_paths = chart_gen.export_all_diagrams(
                result,
                output_dir=str(output_dir),
                prefix=beam.name or "beam",
                format=args.chart_format,
            )
            chart_paths["load_diagram"] = chart_gen.export_load_diagram(
                beam, result,
                f"{output_dir}/{beam.name or 'beam'}_loads.{args.chart_format}",
                format=args.chart_format,
            )
            if args.verbose:
                print("\n生成的图表:")
                for name, path in chart_paths.items():
                    if path:
                        print(f"  {name}: {path}")
        except Exception as e:
            print(f"警告: 图表生成失败 - {e}", file=sys.stderr)

    report_gen = ReportGenerator(
        include_formulas=not args.no_formulas,
        include_steps=not args.no_steps,
        include_intermediate=not args.no_intermediate,
        include_raw_data=not args.no_raw_data,
        precision=args.precision,
    )

    validation = None
    if not args.no_validate:
        validator = InputValidator(unit_system, warnings, steps)
        validation = validator.validate_beam(beam)

    output_base = args.output or (output_dir / f"{beam.name or 'beam'}_report")

    if args.format in ["txt", "all"]:
        report_txt = report_gen.generate_text_report(
            beam, result, warnings, steps,
            raw_data=importer.raw_data,
            validation=validation,
            chart_paths=chart_paths,
        )
        txt_path = output_base if str(output_base).endswith(".txt") else f"{output_base}.txt"
        report_gen.save_report(report_txt, txt_path)
        print(f"文本报告已保存: {txt_path}")

    if args.format in ["md", "all"]:
        report_md = report_gen.generate_markdown_report(
            beam, result, warnings, steps,
            raw_data=importer.raw_data,
            validation=validation,
            chart_paths=chart_paths,
        )
        md_path = output_base if str(output_base).endswith(".md") else f"{output_base}.md"
        report_gen.save_report(report_md, md_path)
        print(f"Markdown报告已保存: {md_path}")

    if args.format in ["json", "all"]:
        report_json = report_gen.generate_json_report(
            beam, result, warnings, steps,
            raw_data=importer.raw_data,
            validation=validation,
            chart_paths=chart_paths,
        )
        json_path = output_base if str(output_base).endswith(".json") else f"{output_base}.json"
        report_gen.save_report(report_json, json_path)
        print(f"JSON报告已保存: {json_path}")

    if warnings.has_errors():
        print("\n⚠️  计算过程中存在错误，请查看报告中的警告部分。", file=sys.stderr)
        return 4

    print("\n✅ 计算完成！所有报告和图表已生成。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
