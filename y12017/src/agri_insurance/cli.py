#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path

from .processor import process_premium_data, show_batch_list
from .__init__ import __version__


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║              农业订单保险保费核算工具                   ║
║         Agri-Insurance Premium Calculator               ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)
    print(f"版本: v{__version__}")
    print()


def print_summary(result):
    print("\n" + "=" * 60)
    print("📊 处理结果摘要")
    print("=" * 60)
    print(f"批次ID: {result.batch_id}")
    print(f"处理时间: {result.process_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print(f"📋 数据统计:")
    print(f"  • 农户档案: {result.farmer_count} 户")
    print(f"  • 收购订单: {result.order_count} 单")
    print(f"    - 正常订单: {result.order_count - result.cancelled_order_count - result.amended_order_count} 单")
    print(f"    - 撤销订单: {result.cancelled_order_count} 单  ⚠️")
    print(f"    - 变更订单: {result.amended_order_count} 单  🔄")
    print(f"  • 保费记录: {result.premium_count} 条")
    print()
    print(f"  • 面积核验: {result.verification_count} 条")
    print(f"  • 保费分摊: {result.split_count} 条")
    print(f"  • 复核问题: {result.review_count} 项")
    print()
    print(f"💰 保费核算:")
    print(f"  • 总保费: {result.total_premium:>10.2f} 元")
    print(f"  • 财政补贴: {result.total_subsidy:>10.2f} 元")
    print(f"  • 农户自缴: {result.total_farmer_payable:>10.2f} 元")
    print()
    print(f"🔗 数据哈希: {result.data_hash}")
    print()
    print("📁 输出文件:")
    for name, path in result.output_files.items():
        print(f"  • {name}:")
        print(f"    {path}")
    print()
    print("=" * 60)
    print()


def main():
    parser = argparse.ArgumentParser(
        description="农业订单保险保费核算工具 - 保费分摊、面积核验、复核清单",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 处理样例数据
  agri-insurance process --input ./sample_data --output ./output

  # 强制重新处理相同数据
  agri-insurance process --input ./sample_data --output ./output --force

  # 查看处理历史
  agri-insurance list --output ./output

  # 在新项目目录直接试用（使用内置样例）
  mkdir -p my_work/input my_work/output
  cp sample_data/*.json my_work/input/
  agri-insurance process --input my_work/input --output my_work/output
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    process_parser = subparsers.add_parser("process", help="处理保费数据")
    process_parser.add_argument("--input", "-i", required=True, help="输入数据目录")
    process_parser.add_argument("--output", "-o", required=True, help="输出结果目录")
    process_parser.add_argument("--force", "-f", action="store_true", help="强制重新计算（覆盖重复检测）")
    process_parser.add_argument("--quiet", "-q", action="store_true", help="静默模式，减少输出")

    list_parser = subparsers.add_parser("list", help="查看处理历史")
    list_parser.add_argument("--output", "-o", required=True, help="输出结果目录（用于读取批次记录）")

    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    args = parser.parse_args()

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    print_banner()

    if args.command == "list":
        show_batch_list(args.output)
        return

    if args.command == "process":
        success, message, result = process_premium_data(
            input_dir=args.input,
            output_dir=args.output,
            force=args.force
        )

        if not success:
            print(f"❌ 处理失败")
            print(message)
            sys.exit(1)

        if not args.quiet:
            print_summary(result)

        print(f"✅ {message}")
        print(f"批次ID: {result.batch_id}")
        print(f"数据哈希: {result.data_hash}")
        print()
        print("💡 提示: 重复运行相同数据会被自动检测，使用 --force 可强制重新计算")
        print("💡 提示: 每个输出文件都包含溯源信息，可追踪每条记录的原始来源")


if __name__ == "__main__":
    main()
