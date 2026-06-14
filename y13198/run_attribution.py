#!/usr/bin/env python3
"""
滑轮组张力误差归因分析 - CLI入口脚本

稳定接口约定:
  - 参数名保持不变，日常脚本可直接引用
  - 退出码: 0=成功, 1=输入错误, 2=处理异常
  - 错误信息前缀固定，方便脚本 grep

用法示例:
  python run_attribution.py --input data/sample_records.json --output reports/result.json
  python run_attribution.py --input data/sample_records.json --html reports/report.html
  python run_attribution.py --input data/sample_records.json --boundary-sigma 2.5 --html reports/report_v2.html
"""

import sys
import json
import argparse
from pathlib import Path

ERROR_PREFIX_INPUT = "[输入错误]"
ERROR_PREFIX_RUNTIME = "[运行错误]"
ERROR_PREFIX_CONFIG = "[配置错误]"
SUCCESS_PREFIX = "[归因完成]"


def print_error(prefix: str, message: str) -> None:
    print(f"{prefix} {message}", file=sys.stderr)


def parse_args():
    parser = argparse.ArgumentParser(
        description="滑轮组张力误差归因分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
返回码说明:
  0 - 分析成功完成
  1 - 输入文件错误 (不存在、格式不对)
  2 - 运行时异常 (参数非法、处理失败)

稳定参数列表 (日常脚本可安全引用):
  --input, -i              输入数据文件路径 (JSON格式)
  --output, -o             输出分析结果 JSON 路径
  --html                   输出 HTML 报告路径
  --standard-unit          标准力单位 (默认: N)
  --boundary-sigma         边界样本判定标准差倍数 (默认: 2.0)
  --tension-tolerance      张力容差比例 (默认: 0.15)
  --unit-confidence        单位问题置信度阈值 (默认: 0.4)
  --direction-confidence   方向问题置信度阈值 (默认: 0.5)
  --quiet, -q              静默模式，只输出关键信息
        """,
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入数据文件路径 (JSON格式，包含records数组)",
        dest="input_path",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="输出分析结果 JSON 路径 (可选)",
        dest="output_path",
    )
    parser.add_argument(
        "--html",
        default=None,
        help="输出 HTML 报告路径 (可选)",
        dest="html_path",
    )
    parser.add_argument(
        "--standard-unit",
        default="N",
        help="标准力单位 (N/kN/kgf/t 等，默认: N)",
        dest="standard_unit",
    )
    parser.add_argument(
        "--boundary-sigma",
        type=float,
        default=2.0,
        help="边界样本判定的标准差倍数 (默认: 2.0)",
        dest="boundary_sigma",
    )
    parser.add_argument(
        "--tension-tolerance",
        type=float,
        default=0.15,
        help="张力容差比例 (默认: 0.15)",
        dest="tension_tolerance",
    )
    parser.add_argument(
        "--unit-confidence",
        type=float,
        default=0.4,
        help="单位问题置信度阈值 (默认: 0.4)",
        dest="unit_confidence",
    )
    parser.add_argument(
        "--direction-confidence",
        type=float,
        default=0.5,
        help="方向问题置信度阈值 (默认: 0.5)",
        dest="direction_confidence",
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="静默模式，减少输出",
        dest="quiet",
    )

    return parser.parse_args()


def main():
    args = parse_args()

    try:
        from pulley_tension import TensionAttributionAnalyzer
        from pulley_tension.report import ReportGenerator
    except ImportError as e:
        print_error(ERROR_PREFIX_RUNTIME, f"无法导入分析模块: {e}")
        print_error(ERROR_PREFIX_RUNTIME, "请确认在项目根目录下运行，或已安装pulley_tension包")
        return 2

    input_path = Path(args.input_path)
    if not input_path.exists():
        print_error(ERROR_PREFIX_INPUT, f"输入文件不存在: {input_path}")
        print_error(ERROR_PREFIX_INPUT, "请使用 --input 指定正确的JSON数据文件路径")
        return 1

    try:
        with open(input_path, "r", encoding="utf-8") as f:
            input_data = json.load(f)
    except json.JSONDecodeError as e:
        print_error(ERROR_PREFIX_INPUT, f"输入文件JSON格式错误: {e}")
        return 1
    except Exception as e:
        print_error(ERROR_PREFIX_INPUT, f"读取输入文件失败: {e}")
        return 1

    if isinstance(input_data, dict) and "records" in input_data:
        records = input_data["records"]
        meta = {k: v for k, v in input_data.items() if k != "records"}
    elif isinstance(input_data, list):
        records = input_data
        meta = {}
    else:
        print_error(ERROR_PREFIX_INPUT, "输入文件格式不正确：需为records数组或包含records字段的对象")
        return 1

    if not records:
        print_error(ERROR_PREFIX_INPUT, "输入记录为空，无法进行归因分析")
        return 1

    if not args.quiet:
        print(f"📂 加载记录 {len(records)} 条，来自 {input_path}")

    try:
        analyzer = TensionAttributionAnalyzer(
            standard_unit=args.standard_unit,
            tension_tolerance=args.tension_tolerance,
            direction_confidence_threshold=args.direction_confidence,
            unit_confidence_threshold=args.unit_confidence,
            boundary_sigma=args.boundary_sigma,
        )
    except Exception as e:
        print_error(ERROR_PREFIX_CONFIG, f"分析器初始化失败: {e}")
        return 2

    try:
        result = analyzer.analyze(records)
    except Exception as e:
        print_error(ERROR_PREFIX_RUNTIME, f"归因分析过程出错: {e}")
        return 2

    summary = result.summary

    if not args.quiet:
        print(f"✅ 分析完成")
        print(f"   总记录: {summary['total_records']} 条")
        print(f"   正常记录: {summary['normal_count']} 条")
        print(f"   单位问题: {summary['unit_issue_count']} 项")
        print(f"   方向问题: {summary['direction_issue_count']} 项")
        print(f"   边界样本: {summary['boundary_sample_count']} 个")
        print(f"   已处理: {summary['processed_count']} 条")
        print(f"   待补材料: {summary['pending_count']} 条")
        print(f"   人工改判: {summary['manual_count']} 条")

    if args.output_path:
        try:
            output_path = Path(args.output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
            if not args.quiet:
                print(f"📄 结果已写入: {output_path}")
        except Exception as e:
            print_error(ERROR_PREFIX_RUNTIME, f"写入JSON结果失败: {e}")
            return 2

    if args.html_path:
        try:
            report_gen = ReportGenerator(title="滑轮组张力误差归因报告")
            report_gen.generate_html(result, args.html_path, meta=meta)
            if not args.quiet:
                print(f"🌐 HTML报告已生成: {args.html_path}")
        except Exception as e:
            print_error(ERROR_PREFIX_RUNTIME, f"生成HTML报告失败: {e}")
            return 2

    print(f"{SUCCESS_PREFIX} 滑轮组张力误差归因分析完成，共{summary['total_records']}条记录")

    return 0


if __name__ == "__main__":
    sys.exit(main())
