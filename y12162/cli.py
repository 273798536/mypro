#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path

from config import OUTPUT_DIR, EXAMPLES_DIR
from data_loader import load_data, get_bad_row_categories_summary
from quality_check import run_quality_checks
from energy_calculator import calculate_regenerative_braking_energy
from data_exporter import export_all_results, export_current_missing_path
from traceability import create_trace_report

def print_separator(char="=", length=60):
    print(char * length)

def print_title(title):
    print_separator()
    print(f"  {title}")
    print_separator()

def main():
    parser = argparse.ArgumentParser(
        description="列车再生制动能量分析系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python cli.py --input examples/sample_train_data.csv
  python cli.py --input data.csv --output output/
  python cli.py --input data.csv --show-current-missing
  python cli.py --input data.csv --trace
        """
    )
    
    parser.add_argument(
        "--input", "-i",
        type=str,
        help="输入数据文件路径 (CSV/Excel)"
    )
    
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=str(OUTPUT_DIR),
        help=f"输出目录 (默认: {OUTPUT_DIR})"
    )
    
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="不导出文件，仅显示分析结果"
    )
    
    parser.add_argument(
        "--show-current-missing",
        action="store_true",
        help="显示电流缺采失败路径"
    )
    
    parser.add_argument(
        "--show-bad-rows",
        action="store_true",
        help="显示坏行明细"
    )
    
    parser.add_argument(
        "--trace",
        action="store_true",
        help="生成数据追溯报告"
    )
    
    parser.add_argument(
        "--use-example",
        action="store_true",
        help="使用示例数据进行测试"
    )
    
    args = parser.parse_args()
    
    if args.use_example:
        example_file = EXAMPLES_DIR / "sample_train_data.csv"
        if example_file.exists():
            args.input = str(example_file)
        else:
            print("错误: 找不到示例数据文件")
            sys.exit(1)
    
    if not args.input:
        parser.print_help()
        sys.exit(0)
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误: 文件不存在: {args.input}")
        sys.exit(1)
    
    print_title("🚇 列车再生制动能量分析系统")
    
    try:
        print("\n[1/4] 正在加载数据...")
        loaded_data = load_data(str(input_path))
        print(f"  ✓ 加载完成: {loaded_data.metadata.get('总行数', 0)} 行")
        print(f"  ✓ 有效数据: {len(loaded_data.valid_data)} 行")
        print(f"  ✓ 坏行: {len(loaded_data.bad_rows)} 行")
        
        print("\n[2/4] 正在进行质量检查...")
        quality_result = run_quality_checks(loaded_data.valid_data)
        print(f"  ✓ 电流缺采: {len(quality_result.current_missing_data)} 组")
        print(f"  ✓ 站间重复: {len(quality_result.duplicate_section_data)} 处")
        print(f"  ✓ 坡度版本错: {len(quality_result.wrong_slope_data)} 处")
        
        print("\n[3/4] 正在计算再生制动能量...")
        energy_result = calculate_regenerative_braking_energy(quality_result.valid_data)
        print(f"  ✓ 总制动能量: {energy_result.summary.get('总制动能量(kWh)', 0):.2f} kWh")
        print(f"  ✓ 总牵引能量: {energy_result.summary.get('总牵引能量(kWh)', 0):.2f} kWh")
        print(f"  ✓ 平均能量回收率: {energy_result.summary.get('平均能量回收率(%)', 0):.2f}%")
        print(f"  ✓ 制动阶段数: {energy_result.summary.get('制动阶段数', 0)}")
        
        print("\n[4/4] 导出结果...")
        if not args.no_export:
            export_result = export_all_results(
                loaded_data, quality_result, energy_result,
                output_dir=args.output
            )
            print(f"  ✓ 已导出 {export_result.summary['total_files_exported']} 个文件")
            print(f"  ✓ 输出目录: {args.output}")
        else:
            print("  ✓ 跳过导出 (--no-export)")
        
        if args.trace:
            print("\n正在生成数据追溯报告...")
            trace_result = create_trace_report(energy_result, args.output)
            print(f"  ✓ 生成 {trace_result['total_chains']} 条追溯链")
            print(f"  ✓ JSON报告: {trace_result['json_report']}")
            print(f"  ✓ CSV摘要: {trace_result['csv_summary']}")
        
        print_separator()
        print("\n📊 分析摘要")
        print_separator()
        
        print("\n坏行分类统计:")
        bad_summary = get_bad_row_categories_summary(loaded_data.bad_rows)
        if not bad_summary.empty:
            for _, row in bad_summary.iterrows():
                print(f"  - {row['问题类别']}: {row['数量']} 行 ({row['处理方式']})")
        else:
            print("  - 无坏行")
        
        if args.show_current_missing:
            print("\n电流缺采失败路径:")
            if not quality_result.current_missing_data.empty:
                for _, row in quality_result.current_missing_data.iterrows():
                    print(f"  - {row['开始时间']} ~ {row['结束时间']}")
                    print(f"    缺失: {row['缺失点数']}点, 时长: {row['缺失时长(秒)']}秒")
                    print(f"    区间: {row['区间']}, 列车: {row['列车号']}")
            else:
                print("  - 无电流缺采")
        
        if args.show_bad_rows:
            print("\n坏行明细:")
            if not loaded_data.bad_rows.empty:
                for _, row in loaded_data.bad_rows.iterrows():
                    print(f"  [行{row['原始行号']}] {row['问题类别']}: {row['问题描述']}")
            else:
                print("  - 无坏行")
        
        print("\n" + "="*60)
        print("✅ 分析完成!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ 处理出错: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
