import sys
import os
import argparse
import pandas as pd
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data_loader import load_data, save_raw_curve
from src.quality_check import run_quality_checks, QualityReport
from src.unit_validation import validate_and_standardize_units
from src.numerical_integration import IntegrationMethod
from src.filter_sync import FilterConfig, GroupByLevel, apply_filters, sync_filter_to_all
from src.charts import generate_all_charts
from src.report_generator import generate_full_report


def parse_args():
    parser = argparse.ArgumentParser(description='数值积分能耗估算工具')
    parser.add_argument('--input', '-i', type=str, default='data/raw/sample_load_data.csv',
                        help='输入数据文件路径 (CSV或Excel)')
    parser.add_argument('--time-column', '-t', type=str, default=None,
                        help='时间列名（自动检测）')
    parser.add_argument('--columns', '-c', type=str, nargs='+', default=None,
                        help='指定读数列名（自动检测所有数值列）')
    parser.add_argument('--units', type=str, nargs='+', default=None,
                        help='各列单位，如: 主回路=kW 照明回路=kW')
    parser.add_argument('--group-by', '-g', type=str, default='total',
                        choices=['total', 'h', 'D', 'W', 'ME', 'QE', 'YE'],
                        help='分组口径: total(全部)/h(小时)/D(日)/W(周)/ME(月)/QE(季)/YE(年)')
    parser.add_argument('--method', '-m', type=str, default='trapezoidal',
                        choices=['trapezoidal', 'simpsons', 'left_riemann', 'right_riemann'],
                        help='数值积分方法')
    parser.add_argument('--start-time', type=str, default=None,
                        help='筛选起始时间 (YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--end-time', type=str, default=None,
                        help='筛选结束时间 (YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--exclude-negative', action='store_true',
                        help='排除负值读数')
    parser.add_argument('--no-charts', action='store_true',
                        help='不生成图表')
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 60)
    print("数值积分能耗估算系统")
    print("=" * 60)

    print(f"\n[1/7] 加载数据: {args.input}")
    unit_info = {}
    if args.units:
        for u in args.units:
            if '=' in u:
                col, unit = u.split('=', 1)
                unit_info[col.strip()] = unit.strip()

    dataset = load_data(
        args.input,
        time_column=args.time_column,
        reading_columns=args.columns,
        unit_info=unit_info if unit_info else None,
    )
    print(f"  ✓ 已加载 {len(dataset.raw_df)} 条数据")
    print(f"  ✓ 时间列: {dataset.time_column}")
    print(f"  ✓ 读数列: {', '.join(dataset.reading_columns)}")

    raw_curve_path = save_raw_curve(dataset)
    print(f"  ✓ 原始曲线已保存: {raw_curve_path}")

    print(f"\n[2/7] 数据质量检查")
    quality_report = run_quality_checks(dataset)
    print(f"  ✓ 数据质量评分: {quality_report.data_quality_score:.1f}/100")
    if quality_report.issues:
        print(f"  ! 发现 {len(quality_report.issues)} 类问题:")
        for issue in quality_report.issues:
            print(f"    - {issue.issue_type.value}: {issue.count} 处 ({issue.severity.value})")
    else:
        print(f"  ✓ 数据质量良好，未发现问题")

    print(f"\n[3/7] 单位校验与标准化")
    unit_report = validate_and_standardize_units(
        dataset.processed_df,
        dataset.reading_columns,
        dataset.unit_info,
        time_column=dataset.time_column,
    )
    print(f"  ✓ 单位校验{'通过' if unit_report.overall_valid else '存在问题'}")
    for col, result in unit_report.results.items():
        if result.conversion_steps:
            print(f"  - {col}: {result.original_unit} → {result.standardized_unit}")
        else:
            print(f"  - {col}: {result.original_unit} (无需转换)")

    print(f"\n[4/7] 配置筛选条件")
    group_by_map = {
        'total': GroupByLevel.TOTAL,
        'h': GroupByLevel.HOURLY,
        'D': GroupByLevel.DAILY,
        'W': GroupByLevel.WEEKLY,
        'ME': GroupByLevel.MONTHLY,
        'QE': GroupByLevel.QUARTERLY,
        'YE': GroupByLevel.YEARLY,
    }
    method_map = {
        'trapezoidal': IntegrationMethod.TRAPEZOIDAL,
        'simpsons': IntegrationMethod.SIMPSONS,
        'left_riemann': IntegrationMethod.LEFT_RIEMANN,
        'right_riemann': IntegrationMethod.RIGHT_RIEMANN,
    }

    filter_config = FilterConfig(
        time_start=pd.Timestamp(args.start_time) if args.start_time else dataset.processed_df[dataset.time_column].min(),
        time_end=pd.Timestamp(args.end_time) if args.end_time else dataset.processed_df[dataset.time_column].max(),
        selected_columns=list(dataset.reading_columns),
        group_by=group_by_map[args.group_by],
        integration_method=method_map[args.method],
        exclude_negative=args.exclude_negative,
        exclude_null=True,
    )
    print(f"  ✓ 时间范围: {filter_config.time_start} ~ {filter_config.time_end}")
    print(f"  ✓ 分组口径: {group_by_map[args.group_by].value}")
    print(f"  ✓ 积分方法: {method_map[args.method].value}")

    print(f"\n[5/7] 应用筛选与数值积分")
    filtered_result = apply_filters(dataset, unit_report, filter_config)
    print(f"  ✓ 筛选前: {filtered_result.data_points_before} 条")
    print(f"  ✓ 筛选后: {filtered_result.data_points_after} 条")
    print(f"  ✓ 总能耗: {filtered_result.integration_report.total_energy_all_columns:,.2f} {unit_report.target_energy_unit}")

    for col, result in filtered_result.integration_report.results.items():
        print(f"  - {col}: {result.total_energy:,.2f} {result.final_unit}")

    print(f"\n[6/7] 生成图表")
    if not args.no_charts:
        charts = generate_all_charts(dataset, filtered_result, quality_report)
        total_charts = sum(len(v) for v in charts.values())
        print(f"  ✓ 已生成 {total_charts} 张图表:")
        for category, outputs in charts.items():
            for output in outputs:
                print(f"    - {output.title}: {output.file_path}")
    else:
        print(f"  - 已跳过图表生成")
        charts = None

    print(f"\n[7/7] 生成报告")
    reports = generate_full_report(dataset, filtered_result, quality_report, unit_report, charts)
    print(f"  ✓ 外行友好版报告: {reports['layperson'].file_path}")
    print(f"  ✓ 计算细节JSON: {reports['detail_json'].file_path}")

    print("\n" + "=" * 60)
    print("处理完成！输出文件:")
    print(f"  原始曲线: {raw_curve_path}")
    for name, report in reports.items():
        print(f"  {report.title}: {report.file_path}")
    print("=" * 60)

    return filtered_result


if __name__ == '__main__':
    result = main()
