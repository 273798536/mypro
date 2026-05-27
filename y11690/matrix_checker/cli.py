"""矩阵分块乘法校验CLI - 主入口"""

import argparse
import sys
from pathlib import Path
from typing import Optional

import numpy as np

from .parser import MatrixParser, MatrixParseError
from .block_tracker import BlockTracker
from .error_analyzer import ErrorAnalyzer
from .reporter import ReportGenerator


def print_banner():
    """打印横幅"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║          矩阵分块乘法校验工具 v1.0                           ║
║          Matrix Block Multiplication Checker                 ║
╠══════════════════════════════════════════════════════════════╣
║  用于自动检查矩阵分块乘法过程，支持：                         ║
║  - 多格式矩阵文件解析 (.txt/.csv/.mat/.json)                 ║
║  - 分块过程追踪与步骤验证                                     ║
║  - 浮点误差容忍与错因定位                                     ║
║  - 三类报告导出 (未处理/已修正/需人工确认)                   ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_step(msg: str):
    """打印步骤"""
    print(f"  ▶ {msg}")


def print_warning(msg: str):
    """打印警告"""
    print(f"  ⚠ {msg}")


def print_error(msg: str):
    """打印错误"""
    print(f"  ✗ {msg}")


def print_success(msg: str):
    """打印成功"""
    print(f"  ✓ {msg}")


def validate_inputs(args) -> list:
    """验证输入参数"""
    errors = []

    if not Path(args.matrix_a).exists():
        errors.append(f"矩阵A文件不存在: {args.matrix_a}")

    if not Path(args.matrix_b).exists():
        errors.append(f"矩阵B文件不存在: {args.matrix_b}")

    if args.steps and not Path(args.steps).exists():
        errors.append(f"步骤文件不存在: {args.steps}")

    if args.block_size <= 0:
        errors.append(f"分块大小必须为正整数，当前: {args.block_size}")

    if args.error_threshold <= 0:
        errors.append(f"误差阈值必须为正数，当前: {args.error_threshold}")

    return errors


def load_matrices(args):
    """加载矩阵"""
    print_step("解析矩阵A...")
    try:
        matrix_a, meta_a = MatrixParser.parse_file(args.matrix_a)
        print_success(f"矩阵A加载成功: {matrix_a.shape} (来源: {meta_a.get('source', 'N/A')})")
    except MatrixParseError as e:
        print_error(f"矩阵A解析失败: {e}")
        return None, None

    print_step("解析矩阵B...")
    try:
        matrix_b, meta_b = MatrixParser.parse_file(args.matrix_b)
        print_success(f"矩阵B加载成功: {matrix_b.shape} (来源: {meta_b.get('source', 'N/A')})")
    except MatrixParseError as e:
        print_error(f"矩阵B解析失败: {e}")
        return None, None

    return matrix_a, matrix_b


def load_steps(args):
    """加载学生步骤"""
    if not args.steps:
        print_warning("未提供步骤文件，将只计算标准结果")
        return []

    print_step("解析学生步骤...")
    try:
        steps_content = Path(args.steps).read_text(encoding='utf-8')
        steps = MatrixParser.parse_steps(steps_content)
        print_success(f"步骤解析成功: {len(steps)} 个步骤")
        return steps
    except MatrixParseError as e:
        print_error(f"步骤解析失败: {e}")
        return []


def validate_dimensions(matrix_a, matrix_b, block_size):
    """验证维度"""
    print_step("验证维度...")
    issues = MatrixParser.validate_dimensions(matrix_a.shape, matrix_b.shape, block_size)

    for warning in issues.get('warnings', []):
        print_warning(warning)
    for error in issues.get('errors', []):
        print_error(error)

    if issues['errors']:
        print_error("维度验证失败，无法继续")
        return False

    return True


def run_tracking(matrix_a, matrix_b, block_size, steps, error_threshold, verbose=False):
    """运行分块追踪"""
    print_step("初始化分块追踪器...")
    tracker = BlockTracker(matrix_a, matrix_b, block_size)
    print_success(f"追踪器初始化完成: {tracker.a_blocks_row}x{tracker.b_blocks_col} 分块网格")

    if steps:
        print_step(f"验证并应用 {len(steps)} 个步骤...")
        valid_count = 0
        for i, step in enumerate(steps, 1):
            record = tracker.validate_step(step)
            tracker.steps.append(record)

            if record.is_valid:
                tracker.apply_step(record)
                valid_count += 1
                if verbose:
                    print_success(f"  步骤{i}: A{record.a_block} * B{record.b_block} ✓")
            else:
                print_error(f"  步骤{i}: A{record.a_block} * B{record.b_block} ✗")
                for issue in record.issues:
                    print_error(f"    - {issue}")

        print_success(f"步骤处理完成: {valid_count}/{len(steps)} 有效")

    print_step("计算最终状态...")
    tracker.compute_final_status(error_threshold)

    return tracker


def run_analysis(tracker, error_threshold):
    """运行误差分析"""
    print_step("执行误差分析...")
    analyzer = ErrorAnalyzer(tracker, error_threshold)
    categories = analyzer.analyze()
    suggestions = analyzer.generate_suggestions()

    if categories:
        print_success(f"分析完成: {len(categories)} 个错误分类，{len(suggestions)} 条建议")
        for cat in categories:
            icon = '✗' if cat.severity == 'error' else '⚠' if cat.severity == 'warning' else 'ℹ'
            print(f"    [{cat.severity.upper()}] {icon} {cat.message}")
    else:
        print_success("未发现明显错误")

    return analyzer


def generate_reports(tracker, analyzer, args, metadata):
    """生成报告"""
    print_step("生成报告...")
    reporter = ReportGenerator(tracker, analyzer, metadata)
    report = reporter.generate()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    formats = args.format.split(',')

    generated = []

    if 'json' in formats:
        json_path = output_dir / 'report.json'
        reporter.export_json(str(json_path))
        generated.append(f"JSON: {json_path}")

    if 'text' in formats or 'txt' in formats:
        text_path = output_dir / 'report.txt'
        reporter.export_text(str(text_path))
        generated.append(f"文本: {text_path}")

    if 'html' in formats:
        html_path = output_dir / 'report.html'
        reporter.export_html(str(html_path))
        generated.append(f"HTML: {html_path}")

    for g in generated:
        print_success(f"  报告已生成: {g}")

    return report


def print_summary(report):
    """打印摘要"""
    summary = report['summary']

    print("\n" + "=" * 60)
    print("  校验结果摘要")
    print("=" * 60)

    print(f"\n  分块状态统计:")
    for status, count in summary['status_counts'].items():
        icon = {'correct': '✓', 'incorrect': '✗', 'skipped': '…', 'mismatch': '✗'}.get(status, '•')
        print(f"    {icon} {status}: {count}")

    print(f"\n  处理分类:")
    for cat, count in summary['by_category'].items():
        icon = {'corrected': '✓', 'unprocessed': '…', 'needs_review': '⚠'}.get(cat, '•')
        print(f"    {icon} {cat}: {count}")

    print(f"\n  完成率: {summary['completion_rate']['description']}")

    error_summary = summary.get('error_summary', {})
    if error_summary.get('total_categories', 0) > 0:
        print(f"\n  错误分类:")
        for cat, count in error_summary.get('by_category', {}).items():
            print(f"    - {cat}: {count}")

    print()


def create_demo_data(output_dir: str):
    """创建示例数据"""
    print_step("创建示例数据...")

    demo_dir = Path(output_dir)
    demo_dir.mkdir(parents=True, exist_ok=True)

    np.random.seed(42)
    A = np.random.randint(1, 10, (6, 6)).astype(float)
    B = np.random.randint(1, 10, (6, 6)).astype(float)

    np.savetxt(str(demo_dir / 'matrix_a.txt'), A, fmt='%.1f',
               header='# 矩阵A - 6x6', comments='')
    np.savetxt(str(demo_dir / 'matrix_b.txt'), B, fmt='%.1f',
               header='# 矩阵B - 6x6', comments='')

    steps_content = """# 分块乘法步骤 (ai,aj,bi,bj,ar,ac,br,bc)
# 分块大小 = 2
0,0,0,0,2,2,2,2  # A(0,0) * B(0,0)
0,1,1,0,2,2,2,2  # A(0,1) * B(1,0)
0,2,2,0,2,2,2,2  # A(0,2) * B(2,0)
0,0,0,1,2,2,2,2  # A(0,0) * B(0,1)
0,1,1,1,2,2,2,2  # A(0,1) * B(1,1)
0,2,2,1,2,2,2,2  # A(0,2) * B(2,1)
0,0,0,2,2,2,2,2  # A(0,0) * B(0,2)
0,1,1,2,2,2,2,2  # A(0,1) * B(1,2)
0,2,2,2,2,2,2,2  # A(0,2) * B(2,2)
1,0,0,0,2,2,2,2  # A(1,0) * B(0,0)
1,1,1,0,2,2,2,2  # A(1,1) * B(1,0)
1,2,2,0,2,2,2,2  # A(1,2) * B(2,0)
1,0,0,1,2,2,2,2  # A(1,0) * B(0,1)
1,1,1,1,2,2,2,2  # A(1,1) * B(1,1)
1,2,2,1,2,2,2,2  # A(1,2) * B(2,1)
1,0,0,2,2,2,2,2  # A(1,0) * B(0,2)
1,1,1,2,2,2,2,2  # A(1,1) * B(1,2)
1,2,2,2,2,2,2,2  # A(1,2) * B(2,2)
2,0,0,0,2,2,2,2  # A(2,0) * B(0,0)
2,1,1,0,2,2,2,2  # A(2,1) * B(1,0)
2,2,2,0,2,2,2,2  # A(2,2) * B(2,0)
2,0,0,1,2,2,2,2  # A(2,0) * B(0,1)
2,1,1,1,2,2,2,2  # A(2,1) * B(1,1)
2,2,2,1,2,2,2,2  # A(2,2) * B(2,1)
2,0,0,2,2,2,2,2  # A(2,0) * B(0,2)
2,1,1,2,2,2,2,2  # A(2,1) * B(1,2)
2,2,2,2,2,2,2,2  # A(2,2) * B(2,2)
"""

    (demo_dir / 'steps_full.txt').write_text(steps_content, encoding='utf-8')

    steps_partial = """# 部分步骤 (故意缺少一些)
0,0,0,0,2,2,2,2
0,1,1,0,2,2,2,2
0,0,0,1,2,2,2,2
1,0,0,0,2,2,2,2
1,1,1,1,2,2,2,2
"""
    (demo_dir / 'steps_partial.txt').write_text(steps_partial, encoding='utf-8')

    steps_errors = """# 包含错误的步骤
0,0,0,0,2,2,2,2
0,1,1,0,2,2,2,2
0,0,0,1,2,2,2,2
3,0,0,0,2,2,2,2  # 索引越界
0,1,0,0,2,2,2,2  # 维度不匹配
"""
    (demo_dir / 'steps_errors.txt').write_text(steps_errors, encoding='utf-8')

    print_success(f"示例数据已创建在: {demo_dir}")
    print(f"""
  已创建:
    - matrix_a.txt: 6x6 矩阵A
    - matrix_b.txt: 6x6 矩阵B
    - steps_full.txt: 完整27个步骤
    - steps_partial.txt: 部分步骤(故意缺失)
    - steps_errors.txt: 包含错误的步骤

  使用示例:
    python -m matrix_checker.cli check \\
        --matrix-a {demo_dir}/matrix_a.txt \\
        --matrix-b {demo_dir}/matrix_b.txt \\
        --steps {demo_dir}/steps_full.txt \\
        --block-size 2
""")


def build_arg_parser():
    """构建命令行参数解析器"""
    parser = argparse.ArgumentParser(
        prog='matrix-checker',
        description='矩阵分块乘法校验工具 - Matrix Block Multiplication Checker',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本校验
  matrix-checker check --matrix-a A.txt --matrix-b B.txt --steps steps.txt --block-size 2

  # 自定义误差阈值
  matrix-checker check --matrix-a A.txt --matrix-b B.txt --steps steps.txt -b 4 -t 1e-8

  # 多种格式输出
  matrix-checker check --matrix-a A.txt --matrix-b B.txt --steps steps.txt -b 2 -f json,text,html

  # 创建示例数据
  matrix-checker demo --output-dir ./examples

  # 验证维度
  matrix-checker validate --matrix-a A.txt --matrix-b B.txt -b 2
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    check_parser = subparsers.add_parser('check', help='执行完整校验流程')
    check_parser.add_argument('--matrix-a', '-a', required=True, help='矩阵A文件路径')
    check_parser.add_argument('--matrix-b', '-b', required=True, help='矩阵B文件路径')
    check_parser.add_argument('--steps', '-s', help='学生步骤文件路径')
    check_parser.add_argument('--block-size', '-bs', type=int, default=2, help='分块大小 (默认: 2)')
    check_parser.add_argument('--error-threshold', '-t', type=float, default=1e-6,
                              help='误差阈值 (默认: 1e-6)')
    check_parser.add_argument('--output-dir', '-o', default='./report', help='报告输出目录')
    check_parser.add_argument('--format', '-f', default='text,json',
                              help='输出格式 (text,json,html，逗号分隔)')
    check_parser.add_argument('--student', help='学生姓名')
    check_parser.add_argument('--assignment', help='作业名称')
    check_parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')

    validate_parser = subparsers.add_parser('validate', help='仅验证维度')
    validate_parser.add_argument('--matrix-a', '-a', required=True, help='矩阵A文件路径')
    validate_parser.add_argument('--matrix-b', '-b', required=True, help='矩阵B文件路径')
    validate_parser.add_argument('--block-size', '-bs', type=int, default=2, help='分块大小')

    demo_parser = subparsers.add_parser('demo', help='创建示例数据')
    demo_parser.add_argument('--output-dir', '-o', default='./examples', help='示例输出目录')

    return parser


def main():
    """主函数"""
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.command == 'demo':
        create_demo_data(args.output_dir)
        return 0

    if args.command is None:
        parser.print_help()
        return 1

    print_banner()

    errors = validate_inputs(args)
    if errors:
        for error in errors:
            print_error(error)
        return 1

    if args.command == 'validate':
        matrix_a, matrix_b = load_matrices(args)
        if matrix_a is None:
            return 1
        success = validate_dimensions(matrix_a, matrix_b, args.block_size)
        return 0 if success else 1

    if args.command == 'check':
        matrix_a, matrix_b = load_matrices(args)
        if matrix_a is None:
            return 1

        if not validate_dimensions(matrix_a, matrix_b, args.block_size):
            return 1

        steps = load_steps(args)

        tracker = run_tracking(matrix_a, matrix_b, args.block_size, steps, args.error_threshold, args.verbose)

        analyzer = run_analysis(tracker, args.error_threshold)

        metadata = {
            'source_file': args.steps or 'N/A',
            'student_name': args.student or 'N/A',
            'assignment': args.assignment or 'N/A'
        }

        report = generate_reports(tracker, analyzer, args, metadata)

        print_summary(report)

        return 0

    return 1


if __name__ == '__main__':
    sys.exit(main())
