#!/usr/bin/env python3
"""
报价阶梯反推工具 - CLI入口

用法:
  python -m quote_reverse_tool.cli check                       # 检查配置
  python -m quote_reverse_tool.cli reverse <报价文件>           # 反推单个报价
  python -m quote_reverse_tool.cli batch <目录>                 # 批量反推
  python -m quote_reverse_tool.cli demo                         # 运行样例数据
"""

import argparse
import sys
import os
from pathlib import Path

from .config_loader import ConfigLoader
from .engine import ReverseEngine
from .validator import ConfigValidator
from .reporter import Reporter
from .audit import AuditManager

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "quote_reverse_tool" / "config" / "config.yaml"
SAMPLES_DIR = BASE_DIR / "quote_reverse_tool" / "data" / "samples"
OUTPUT_DIR = BASE_DIR / "quote_reverse_tool" / "output" / "reports"


def cmd_check(args):
    """检查配置是否有问题"""
    loader = ConfigLoader(str(CONFIG_PATH))
    validator = ConfigValidator(loader)
    result = validator.validate_tiers()

    reporter = Reporter(str(OUTPUT_DIR))
    reporter.print_config_validation(result)

    return 0 if result.is_valid else 1


def cmd_reverse(args):
    """反推单个报价单"""
    quotation_path = Path(args.quotation_file)
    if not quotation_path.exists():
        print(f"❌ 文件不存在: {quotation_path}")
        return 1

    loader = ConfigLoader(str(CONFIG_PATH))
    engine = ReverseEngine(loader)
    reporter = Reporter(str(OUTPUT_DIR))
    audit = AuditManager()

    quotation_id, customer_id, items = loader.load_quotation(str(quotation_path))

    results = []
    for item in items:
        result = engine.reverse_quote(item)
        results.append(result)

        show_steps = not args.exceptions_only
        reporter.print_console_report(
            result,
            show_steps=show_steps,
            show_exceptions_only=args.exceptions_only,
            audit_manager=audit
        )

        if args.export_json:
            path = reporter.export_json(result)
            print(f"\n📤 JSON报告已导出: {path}")

        if args.export_text:
            path = reporter.export_text(result, audit_manager=audit)
            print(f"📤 文本报告已导出: {path}")

    if len(results) > 1:
        reporter.print_batch_summary(results)

    has_errors = any(not r.is_valid for r in results)
    return 1 if has_errors else 0


def cmd_batch(args):
    """批量反推目录下的所有报价单"""
    dir_path = Path(args.directory)
    if not dir_path.is_dir():
        print(f"❌ 目录不存在: {dir_path}")
        return 1

    json_files = sorted(dir_path.glob("*.json"))
    if not json_files:
        print(f"❌ 目录中没有找到JSON文件")
        return 1

    loader = ConfigLoader(str(CONFIG_PATH))
    engine = ReverseEngine(loader)
    reporter = Reporter(str(OUTPUT_DIR))
    audit = AuditManager()

    all_results = []
    print(f"📂 开始批量处理 {len(json_files)} 个报价单...\n")

    for i, json_file in enumerate(json_files, 1):
        print(f"[{i}/{len(json_files)}] 处理: {json_file.name}")
        try:
            quotation_id, customer_id, items = loader.load_quotation(str(json_file))
            for item in items:
                result = engine.reverse_quote(item)
                all_results.append(result)
        except Exception as e:
            print(f"  ❌ 处理失败: {e}")

    reporter.print_batch_summary(all_results)

    if args.export_json:
        path = reporter.export_json_batch(all_results)
        print(f"\n📤 批量JSON报告已导出: {path}")

    has_errors = any(not r.is_valid for r in all_results)
    return 1 if has_errors else 0


def cmd_demo(args):
    """运行样例数据，展示三种场景"""
    loader = ConfigLoader(str(CONFIG_PATH))
    engine = ReverseEngine(loader)
    reporter = Reporter(str(OUTPUT_DIR))
    audit = AuditManager()

    sample_files = [
        ("01_normal_record.json", "✅ 正常记录"),
        ("02_boundary_record.json", "⚠️  边界记录（阶梯重叠+四舍五入）"),
        ("03_bad_data_record.json", "❌ 异常数据（审批越权+折扣超限）"),
    ]

    all_results = []
    print("\n" + "=" * 80)
    print("🎯 报价阶梯反推工具 - 样例演示")
    print("=" * 80)

    for filename, description in sample_files:
        filepath = SAMPLES_DIR / filename
        if not filepath.exists():
            print(f"\n❌ 找不到样例文件: {filepath}")
            continue

        print(f"\n\n{'='*80}")
        print(f"{description} - {filename}")
        print("=" * 80)

        try:
            quotation_id, customer_id, items = loader.load_quotation(str(filepath))
            for item in items:
                result = engine.reverse_quote(item)
                all_results.append(result)

                show_steps = not args.exceptions_only
                reporter.print_console_report(
                    result,
                    show_steps=show_steps,
                    show_exceptions_only=args.exceptions_only,
                    audit_manager=audit
                )
        except Exception as e:
            print(f"❌ 处理失败: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 80)
    print("📊 样例演示汇总")
    print("=" * 80)
    reporter.print_batch_summary(all_results)

    if args.export_json:
        path = reporter.export_json_batch(all_results, filename="demo_results.json")
        print(f"\n📤 演示结果已导出: {path}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        prog="quote-reverse",
        description="报价阶梯反推工具：从最终报价反推折扣阶梯和审批级别是否合理",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s check
  %(prog)s reverse quote.json
  %(prog)s reverse quote.json --exceptions-only
  %(prog)s reverse quote.json --export-json --export-text
  %(prog)s batch ./quotations
  %(prog)s demo
        """
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    p_check = subparsers.add_parser("check", help="检查折扣阶梯配置是否有重叠等问题")
    p_check.set_defaults(func=cmd_check)

    p_reverse = subparsers.add_parser("reverse", help="反推单个报价单")
    p_reverse.add_argument("quotation_file", help="报价单JSON文件路径")
    p_reverse.add_argument("--exceptions-only", "-e", action="store_true", help="只显示异常步骤")
    p_reverse.add_argument("--export-json", "-j", action="store_true", help="导出JSON报告")
    p_reverse.add_argument("--export-text", "-t", action="store_true", help="导出文本报告")
    p_reverse.set_defaults(func=cmd_reverse)

    p_batch = subparsers.add_parser("batch", help="批量反推目录下的所有报价单")
    p_batch.add_argument("directory", help="包含报价单JSON文件的目录")
    p_batch.add_argument("--export-json", "-j", action="store_true", help="导出批量JSON报告")
    p_batch.set_defaults(func=cmd_batch)

    p_demo = subparsers.add_parser("demo", help="运行样例数据，展示三种场景")
    p_demo.add_argument("--exceptions-only", "-e", action="store_true", help="只显示异常步骤")
    p_demo.add_argument("--export-json", "-j", action="store_true", help="导出演示结果")
    p_demo.set_defaults(func=cmd_demo)

    args = parser.parse_args()

    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\n⏹️  已中断")
        return 130
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
