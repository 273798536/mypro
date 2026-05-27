#!/usr/bin/env python3
import argparse
import csv
import json
import sys
import os
from datetime import datetime
from typing import List, Dict, Any

from buoyancy import (
    DataValidator,
    BuoyancyCalculator,
    AnomalyDetector,
    ReportGenerator,
)


def load_csv(file_path: str) -> List[Dict[str, Any]]:
    records = []
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records


def load_json(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "records" in data:
            return data["records"]
    return []


def load_data(file_path: str) -> List[Dict[str, Any]]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.csv':
        return load_csv(file_path)
    elif ext == '.json':
        return load_json(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请使用 CSV 或 JSON 文件")


def print_header():
    print("=" * 70)
    print("浮力密度判定系统")
    print("Buoyancy Density Judgment System")
    print("=" * 70)
    print()


def print_menu():
    print("\n操作菜单:")
    print("  1. 导入数据文件")
    print("  2. 显示数据概览")
    print("  3. 执行浮力计算")
    print("  4. 显示异常检测结果")
    print("  5. 导出报告 (CSV)")
    print("  6. 导出报告 (JSON)")
    print("  7. 显示支持的单位列表")
    print("  0. 退出")
    print()


def process_data(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    print(f"\n正在验证数据...")
    valid_records, invalid_records = DataValidator.validate_batch(records)
    print(f"  有效记录: {len(valid_records)} 条")
    print(f"  无效记录: {len(invalid_records)} 条")

    print(f"\n正在计算浮力...")
    processed_records = BuoyancyCalculator.process_batch(valid_records)
    print(f"  计算完成")

    print(f"\n正在检测异常...")
    analysis_result = AnomalyDetector.analyze_batch(processed_records, invalid_records)
    print(f"  检测完成")

    return {
        "valid_records": valid_records,
        "invalid_records": invalid_records,
        "processed_records": processed_records,
        "analysis_result": analysis_result,
    }


def show_overview(records: List[Dict[str, Any]]):
    if not records:
        print("暂无数据，请先导入数据文件。")
        return

    print(f"\n数据概览:")
    print(f"  总记录数: {len(records)} 条")
    print()
    print("前5条记录:")
    print("-" * 70)
    print(f"{'样本ID':<12} {'质量':<10} {'单位':<8} {'体积':<10} {'单位':<8} {'记录状态':<10}")
    print("-" * 70)
    for i, record in enumerate(records[:5]):
        print(f"{record.get('sample_id', 'N/A'):<12} "
              f"{record.get('mass', 'N/A'):<10} "
              f"{record.get('mass_unit', 'N/A'):<8} "
              f"{record.get('volume', 'N/A'):<10} "
              f"{record.get('volume_unit', 'N/A'):<8} "
              f"{record.get('observed_state', 'N/A'):<10}")
    if len(records) > 5:
        print(f"... 还有 {len(records) - 5} 条记录")
    print()


def show_anomalies(analysis_result: Dict[str, Any]):
    summary = ReportGenerator.generate_summary_text(analysis_result)
    print(summary)


def show_units():
    from buoyancy import UnitConverter
    print("\n支持的单位列表:")
    print(f"  质量单位: {', '.join(UnitConverter.get_available_mass_units())}")
    print(f"  体积单位: {', '.join(UnitConverter.get_available_volume_units())}")
    print(f"  密度单位: {', '.join(UnitConverter.get_available_density_units())}")
    print()


def export_csv(result: Dict[str, Any], output_dir: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(output_dir, f"buoyancy_report_{timestamp}.csv")

    ReportGenerator.generate_csv(
        result["processed_records"],
        result["invalid_records"],
        result["analysis_result"],
        output_path
    )
    print(f"\nCSV 报告已导出到: {output_path}")


def export_json(result: Dict[str, Any], output_dir: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(output_dir, f"buoyancy_report_{timestamp}.json")

    ReportGenerator.generate_json(
        result["processed_records"],
        result["invalid_records"],
        result["analysis_result"],
        output_path
    )
    print(f"\nJSON 报告已导出到: {output_path}")


def run_cli(output_dir: str):
    print_header()

    records = []
    process_result = None
    processed = False

    while True:
        print_menu()
        choice = input("请选择操作 (0-7): ").strip()

        if choice == "1":
            file_path = input("请输入数据文件路径 (CSV/JSON): ").strip()
            file_path = os.path.expanduser(file_path)
            try:
                records = load_data(file_path)
                print(f"\n成功导入 {len(records)} 条记录")
                processed = False
            except Exception as e:
                print(f"\n导入失败: {e}")

        elif choice == "2":
            show_overview(records)

        elif choice == "3":
            if not records:
                print("\n请先导入数据文件")
                continue
            process_result = process_data(records)
            processed = True

        elif choice == "4":
            if not processed or not process_result:
                print("\n请先执行浮力计算")
                continue
            show_anomalies(process_result["analysis_result"])

        elif choice == "5":
            if not processed or not process_result:
                print("\n请先执行浮力计算")
                continue
            export_csv(process_result, output_dir)

        elif choice == "6":
            if not processed or not process_result:
                print("\n请先执行浮力计算")
                continue
            export_json(process_result, output_dir)

        elif choice == "7":
            show_units()

        elif choice == "0":
            print("\n感谢使用，再见！")
            break

        else:
            print("\n无效的选择，请重新输入")


def run_batch(input_file: str, output_dir: str, export_format: str = "both"):
    print_header()
    print(f"批量处理模式")
    print(f"输入文件: {input_file}")
    print(f"输出目录: {output_dir}")
    print()

    try:
        records = load_data(input_file)
        print(f"成功导入 {len(records)} 条记录")
    except Exception as e:
        print(f"导入失败: {e}")
        sys.exit(1)

    result = process_data(records)

    show_anomalies(result["analysis_result"])

    if export_format in ["csv", "both"]:
        export_csv(result, output_dir)

    if export_format in ["json", "both"]:
        export_json(result, output_dir)

    print("\n批量处理完成！")


def main():
    parser = argparse.ArgumentParser(
        description="浮力密度判定系统 - 批量判断浮沉结论是否合理"
    )
    parser.add_argument(
        "--input", "-i",
        help="输入数据文件路径 (CSV/JSON)",
        required=False
    )
    parser.add_argument(
        "--output-dir", "-o",
        help="报告输出目录",
        default="./output"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["csv", "json", "both"],
        default="both",
        help="导出报告格式 (默认: both)"
    )
    parser.add_argument(
        "--cli",
        action="store_true",
        help="启动交互式命令行界面"
    )

    args = parser.parse_args()

    output_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    if args.input:
        run_batch(args.input, output_dir, args.format)
    else:
        run_cli(output_dir)


if __name__ == "__main__":
    main()
