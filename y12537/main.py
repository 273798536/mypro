#!/usr/bin/env python3
import argparse
import sys
import os
from gradient_tuner import TuningPipeline


def main():
    parser = argparse.ArgumentParser(
        description="梯度下降调参教具 - 导入、检查、修正提示和导出训练数据",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 分析单个文件
  python main.py --input data/training_log.csv

  # 分析整个目录
  python main.py --input data/ --output ./results

  # 调整最低迭代要求
  python main.py --input data.json --min-iters 100

  # 调整学习率爆炸阈值
  python main.py --input data.csv --explosion-threshold 1.5
        """
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入文件或目录路径（支持 .csv, .json, .txt, .log, .md）"
    )

    parser.add_argument(
        "--output", "-o",
        default="./output",
        help="输出目录路径"
    )

    parser.add_argument(
        "--min-iters",
        type=int,
        default=50,
        help="最低迭代次数要求（默认: 50）"
    )

    parser.add_argument(
        "--explosion-threshold",
        type=float,
        default=2.0,
        help="学习率爆炸阈值（损失涨幅倍数，默认: 2.0）"
    )

    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="静默模式，减少输出"
    )

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ 错误: 输入路径不存在: {args.input}")
        sys.exit(1)

    pipeline = TuningPipeline(
        output_dir=args.output,
        min_iterations_required=args.min_iters,
        explosion_threshold=args.explosion_threshold,
    )

    try:
        result = pipeline.run(
            input_path=args.input,
            output_dir=args.output,
        )

        print("")
        print("📊 分析结果摘要:")
        print(f"   班级总数: {result['records_count']}")
        print(f"   正常班级: {result['normal_count']}")
        print(f"   有问题班级: {result['has_issues_count']}")
        print(f"   发现问题: {result['total_issues']} 个")
        print(f"   输出目录: {result['output_dir']}")

        if result['prioritized_actions']:
            print("")
            print("🎯 优先处理事项:")
            for i, action in enumerate(result['prioritized_actions'][:3], 1):
                priority = {
                    "P0": "🔴 紧急",
                    "P1": "🟡 重要",
                    "P2": "🟢 一般"
                }.get(action.get("priority", "P2"), action.get("priority"))
                print(f"   {i}. [{priority}] {action.get('message', '')}")

        print("")
        print("✅ 分析完成！请查看输出目录。")
        return 0

    except Exception as e:
        print(f"❌ 分析失败: {str(e)}")
        if not args.quiet:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
