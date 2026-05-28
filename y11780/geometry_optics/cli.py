"""命令行界面 - 几何光路求交CLI工具"""

from __future__ import annotations
import argparse
import sys
import os
import json
from typing import List, Optional

from .io.parser import InputParser
from .io.validator import validate_json_schema
from .io.exporter import ResultExporter
from .analysis.engine import OpticsProcessor
from .core.models import ResultStatus


def create_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog='geo-optics',
        description='几何光路求交CLI工具 - 批量检查镜面反射题',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本用法 - 处理单个题目
  geo-optics check -i problem.json

  # 批量处理目录下所有题目
  geo-optics batch -d ./problems/ -o ./results/

  # 只显示摘要，不显示详情
  geo-optics check -i problem.json --brief

  # 导出JSON和CSV报告
  geo-optics check -i problem.json --json result.json --csv result.csv

  # 严格验证模式
  geo-optics check -i problem.json --strict

  # 验证输入文件格式，不进行计算
  geo-optics validate -i problem.json

  # 显示输入格式示例
  geo-optics example
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    check_parser = subparsers.add_parser('check', help='检查单个题目，计算交点和反射角')
    _add_check_arguments(check_parser)

    batch_parser = subparsers.add_parser('batch', help='批量处理多个题目文件')
    _add_batch_arguments(batch_parser)

    validate_parser = subparsers.add_parser('validate', help='验证输入文件格式')
    _add_validate_arguments(validate_parser)

    example_parser = subparsers.add_parser('example', help='显示输入格式示例')

    return parser


def _add_check_arguments(parser: argparse.ArgumentParser):
    """添加check命令的参数"""
    parser.add_argument('-i', '--input', required=True, help='输入JSON文件路径')
    parser.add_argument('-o', '--output', help='输出文本报告路径（默认打印到控制台）')
    parser.add_argument('--json', help='导出JSON报告路径')
    parser.add_argument('--csv', help='导出CSV报告路径')
    parser.add_argument('--brief', action='store_true', help='只显示摘要，不显示详细结果')
    parser.add_argument('--strict', action='store_true', help='严格验证模式')
    parser.add_argument('--no-explain', action='store_true', help='不显示解释信息')
    parser.add_argument('--silent', action='store_true', help='静默模式，不打印到控制台')


def _add_batch_arguments(parser: argparse.ArgumentParser):
    """添加batch命令的参数"""
    parser.add_argument('-d', '--directory', required=True, help='包含输入JSON文件的目录')
    parser.add_argument('-o', '--output-dir', required=True, help='输出报告的目录')
    parser.add_argument('--format', choices=['text', 'json', 'both'], default='both',
                        help='输出报告格式（默认: both）')
    parser.add_argument('--strict', action='store_true', help='严格验证模式')
    parser.add_argument('--pattern', default='*.json', help='输入文件匹配模式（默认: *.json）')


def _add_validate_arguments(parser: argparse.ArgumentParser):
    """添加validate命令的参数"""
    parser.add_argument('-i', '--input', required=True, help='输入JSON文件路径')
    parser.add_argument('--strict', action='store_true', help='严格验证模式')


def print_header():
    """打印程序头部信息"""
    print("=" * 70)
    print("  🔬 几何光路求交CLI工具 v1.0")
    print("  📐 镜面反射题批量检查系统")
    print("=" * 70)
    print()


def cmd_check(args: argparse.Namespace) -> int:
    """执行check命令"""
    if not args.silent:
        print_header()
        print(f"📂 正在处理文件: {args.input}")
        print()

    try:
        parser = InputParser(auto_correct=True)
        problem_input = parser.parse_file(args.input)

        if parser.warnings and not args.silent:
            print("⚠️  输入解析警告:")
            for w in parser.warnings:
                print(f"   - {w}")
            print()

        processor = OpticsProcessor(strict_validation=args.strict)
        result = processor.process(problem_input)

        show_details = not args.brief
        text_report = ResultExporter.to_text_string(result, show_details=show_details)

        if not args.silent:
            if args.no_explain:
                lines = text_report.split('\n')
                filtered = [l for l in lines if '💡' not in l and '解释' not in l]
                print('\n'.join(filtered))
            else:
                print(text_report)
        else:
            if result.status == ResultStatus.ERROR:
                print(json.dumps({
                    "status": "error",
                    "problem_id": result.problem_id,
                    "score": result.total_score,
                    "max_score": result.max_score
                }))
            elif result.status == ResultStatus.WARNING:
                print(json.dumps({
                    "status": "warning",
                    "problem_id": result.problem_id,
                    "score": result.total_score,
                    "max_score": result.max_score
                }))
            else:
                print(json.dumps({
                    "status": "success",
                    "problem_id": result.problem_id,
                    "score": result.total_score,
                    "max_score": result.max_score
                }))

        if args.output:
            ResultExporter.to_text(result, args.output, show_details=show_details)
            if not args.silent:
                print(f"\n📄 文本报告已保存: {args.output}")

        if args.json:
            ResultExporter.to_json(result, args.json)
            if not args.silent:
                print(f"📄 JSON报告已保存: {args.json}")

        if args.csv:
            ResultExporter.to_csv(result, args.csv)
            if not args.silent:
                print(f"📄 CSV报告已保存: {args.csv}")

        if result.status == ResultStatus.ERROR:
            return 2
        elif result.status == ResultStatus.WARNING:
            return 1
        return 0

    except ValueError as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        return 3
    except FileNotFoundError as e:
        print(f"❌ 文件不存在: {e}", file=sys.stderr)
        return 4
    except Exception as e:
        print(f"❌ 未知错误: {e}", file=sys.stderr)
        return 5


def cmd_batch(args: argparse.Namespace) -> int:
    """执行batch命令"""
    print_header()
    print(f"📁 批量处理目录: {args.directory}")
    print(f"📤 输出目录: {args.output_dir}")
    print()

    import glob

    pattern = os.path.join(args.directory, args.pattern)
    input_files = sorted(glob.glob(pattern))

    if not input_files:
        print(f"❌ 未找到匹配 '{args.pattern}' 的文件")
        return 4

    print(f"📋 找到 {len(input_files)} 个待处理文件")
    print()

    os.makedirs(args.output_dir, exist_ok=True)

    success_count = 0
    warning_count = 0
    error_count = 0
    failed_files = []

    parser = InputParser(auto_correct=True)
    processor = OpticsProcessor(strict_validation=args.strict)

    for i, filepath in enumerate(input_files, 1):
        filename = os.path.basename(filepath)
        base_name = os.path.splitext(filename)[0]

        print(f"[{i}/{len(input_files)}] 处理: {filename}", end=" ")

        try:
            problem_input = parser.parse_file(filepath)
            result = processor.process(problem_input)

            if args.format in ['text', 'both']:
                text_path = os.path.join(args.output_dir, f"{base_name}_report.txt")
                ResultExporter.to_text(result, text_path)

            if args.format in ['json', 'both']:
                json_path = os.path.join(args.output_dir, f"{base_name}_report.json")
                ResultExporter.to_json(result, json_path)

            if result.status == ResultStatus.SUCCESS:
                print("✅ 成功")
                success_count += 1
            elif result.status == ResultStatus.WARNING:
                print("⚠️  警告")
                warning_count += 1
            else:
                print("❌ 错误")
                error_count += 1
                failed_files.append((filename, "处理错误"))

        except Exception as e:
            print(f"❌ 失败: {str(e)[:50]}")
            error_count += 1
            failed_files.append((filename, str(e)))

    print()
    print("=" * 50)
    print("📊 批量处理完成")
    print("=" * 50)
    print(f"   总计: {len(input_files)}")
    print(f"   ✅ 成功: {success_count}")
    print(f"   ⚠️  警告: {warning_count}")
    print(f"   ❌ 错误: {error_count}")
    print(f"   📈 成功率: {success_count/len(input_files)*100:.1f}%")

    if failed_files:
        print()
        print("❌ 失败文件列表:")
        for fname, err in failed_files:
            print(f"   - {fname}: {err}")

    if error_count > 0:
        return 2
    elif warning_count > 0:
        return 1
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """执行validate命令"""
    print_header()
    print(f"🔍 正在验证文件: {args.input}")
    print()

    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)

        is_valid, errors, warnings = validate_json_schema(data)

        if errors:
            print("❌ 格式错误:")
            for e in errors:
                print(f"   - {e}")
            print()

        if warnings:
            print("⚠️  格式警告:")
            for w in warnings:
                print(f"   - {w}")
            print()

        if is_valid:
            print("✅ JSON格式验证通过")

            try:
                parser = InputParser(auto_correct=False)
                problem_input = parser.parse_file(args.input)

                if parser.warnings:
                    print()
                    print("⚠️  内容警告:")
                    for w in parser.warnings:
                        print(f"   - {w}")

                print()
                print("📋 内容摘要:")
                print(f"   题目编号: {problem_input.problem_id}")
                print(f"   来源: {problem_input.source}")
                print(f"   镜面数量: {len(problem_input.mirror_segments)}")
                print(f"   光线数量: {len(problem_input.incident_rays)}")
                print(f"   角度单位: {problem_input.angle_unit}")
                if problem_input.bounding_box:
                    print(f"   边界框: {problem_input.bounding_box}")

                return 0
            except ValueError as e:
                print(f"❌ 内容解析错误: {e}")
                return 2
        else:
            return 1

    except FileNotFoundError:
        print(f"❌ 文件不存在: {args.input}")
        return 4
    except json.JSONDecodeError as e:
        print(f"❌ JSON解析错误: {e}")
        return 3


def cmd_example() -> int:
    """显示输入格式示例"""
    example = {
        "problem_id": "MIRROR-001",
        "source": "八年级物理上册 P45 第3题",
        "angle_unit": "degree",
        "refractive_index_env": 1.0,
        "bounding_box": {
            "x_min": 0,
            "x_max": 10,
            "y_min": 0,
            "y_max": 10
        },
        "mirror_segments": [
            {
                "label": "M1",
                "start": [2, 2],
                "end": [8, 2],
                "material": "mirror",
                "refractive_index": 1.0
            }
        ],
        "incident_rays": [
            {
                "label": "R1",
                "origin": [1, 5],
                "angle": -45,
                "wavelength": 550
            },
            {
                "label": "R2",
                "origin": [5, 8],
                "direction": [0, -1]
            },
            {
                "label": "R3",
                "origin": [0, 0],
                "through": [10, 10]
            }
        ],
        "metadata": {
            "difficulty": "easy",
            "chapter": "光的反射",
            "author": "光学助教"
        }
    }

    print_header()
    print("📝 输入文件格式示例 (JSON):")
    print("-" * 70)
    print(json.dumps(example, ensure_ascii=False, indent=2))
    print("-" * 70)
    print()
    print("📌 格式说明:")
    print("  - problem_id: 题目编号（必填）")
    print("  - source: 题目来源（必填）")
    print("  - angle_unit: 角度单位，'degree' 或 'radian'（默认: degree）")
    print("  - refractive_index_env: 环境折射率（默认: 1.0）")
    print("  - bounding_box: 边界框，限定有效区域（可选）")
    print("  - mirror_segments: 镜面线段数组（必填）")
    print("    - label: 镜面标签")
    print("    - start/end: 线段端点坐标 [x, y]")
    print("  - incident_rays: 入射光线数组（必填）")
    print("    - 方向可用三种方式定义:")
    print("      * angle: 角度值（配合angle_unit使用）")
    print("      * direction: 方向向量 [dx, dy]")
    print("      * through: 光线通过的点 [x, y]")
    print()
    print("⚠️  特殊情况检测:")
    print("  - 平行无交: 自动识别并提示")
    print("  - 延长线交点: 标记s参数，不纳入有效结果")
    print("  - 角度单位错: 自动检测可疑值并提示修正")
    print("  - 边界框外: 标记超出范围的交点")

    return 0


def main(argv: Optional[List[str]] = None) -> int:
    """主入口函数"""
    parser = create_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        return 0

    if args.command == 'check':
        return cmd_check(args)
    elif args.command == 'batch':
        return cmd_batch(args)
    elif args.command == 'validate':
        return cmd_validate(args)
    elif args.command == 'example':
        return cmd_example()
    else:
        parser.print_help()
        return 0


if __name__ == '__main__':
    sys.exit(main())
