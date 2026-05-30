#!/usr/bin/env python3
import argparse
import os
import sys
from report import run_full_analysis


def main():
    parser = argparse.ArgumentParser(
        description='🎵 声学节拍相似度分析 - 音乐版权检测工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本用法 - 分析两首音频
  python main.py --file1 original.mp3 --file2 suspect.mp3

  # 指定输出目录
  python main.py --file1 a.wav --file2 b.wav --output ./output_case001

  # 禁用移调不变性（用于确认原调相似性）
  python main.py --file1 a.wav --file2 b.wav --no-transposition-invariance

  # 禁用速度归一化（用于确认原始速度差异）
  python main.py --file1 a.wav --file2 b.wav --no-speed-normalization

  # 批量模式 - 自动生成测试数据并验证
  python main.py --generate-test-data --output ./test_output
        """
    )

    parser.add_argument('--file1', type=str,
                       help='原始音频文件路径 (参考文件)')
    parser.add_argument('--file2', type=str,
                       help='待检测音频文件路径 (可疑文件)')
    parser.add_argument('--output', type=str, default='./analysis_output',
                       help='输出目录路径 (默认: ./analysis_output)')
    parser.add_argument('--no-transposition-invariance', action='store_true',
                       help='禁用移调不变性处理（不移调修正）')
    parser.add_argument('--no-speed-normalization', action='store_true',
                       help='禁用速度归一化处理（不修正速度差异）')
    parser.add_argument('--generate-test-data', action='store_true',
                       help='生成测试音频数据并运行端到端测试')
    parser.add_argument('--test-case', type=str, choices=['same', 'speed', 'transpose', 'both', 'different'],
                       help='指定测试用例类型 (与--generate-test-data配合使用)')

    args = parser.parse_args()

    if args.generate_test_data:
        from test_generator import run_all_tests
        print("🧪 运行端到端测试...\n")
        run_all_tests(args.output, args.test_case)
        return

    if not args.file1 or not args.file2:
        parser.error("必须指定 --file1 和 --file2 参数，或使用 --generate-test-data 运行测试")

    if not os.path.exists(args.file1):
        print(f"❌ 错误: 文件1不存在: {args.file1}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.file2):
        print(f"❌ 错误: 文件2不存在: {args.file2}", file=sys.stderr)
        sys.exit(1)

    supported_formats = ('.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac')
    if not args.file1.lower().endswith(supported_formats):
        print(f"⚠️  警告: 文件1格式可能不支持，建议使用: {', '.join(supported_formats)}")
    if not args.file2.lower().endswith(supported_formats):
        print(f"⚠️  警告: 文件2格式可能不支持，建议使用: {', '.join(supported_formats)}")

    try:
        report = run_full_analysis(
            file1_path=args.file1,
            file2_path=args.file2,
            output_dir=args.output,
            enable_transposition_invariance=not args.no_transposition_invariance,
            enable_speed_normalization=not args.no_speed_normalization
        )

        print(f"\n📁 所有输出文件已保存至: {os.path.abspath(args.output)}")
        print(f"   - JSON完整报告: full_report.json")
        print(f"   - CSV汇总表格: summary_report.csv, beat_alignment.csv, matched_segments.csv, issues.csv")
        print(f"   - 可视化图表: 01_*.png ~ 04_*.png (共4张)")
        print(f"\n⚠️  本工具为辅助分析，最终判定需结合人工复核。")

        if report['verdict']['needs_manual_review']:
            print(f"\n🔴 重要: 根据分析结果，建议进行人工复核！")

    except Exception as e:
        print(f"\n❌ 分析过程中发生错误: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
