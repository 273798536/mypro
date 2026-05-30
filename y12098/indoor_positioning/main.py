#!/usr/bin/env python3
import os
import sys
import argparse
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.data_cleaner import DataCleaner
from src.anomaly_detector import AnomalyDetector
from src.visualizer import Visualizer
from src.report_generator import ReportGenerator
from src.trajectory_replay import TrajectoryReplay
from src.generate_test_data import generate_test_data


def main():
    parser = argparse.ArgumentParser(
        description='室内定位信号地图分析工具 - 楼层串跳检测与可视化',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例用法:
  # 生成测试数据并分析
  python main.py --generate-data
  
  # 分析指定文件
  python main.py -i data/indoor_positioning_data.csv
  
  # 只生成报告，不显示图表
  python main.py -i data.csv --no-show
        '''
    )
    
    parser.add_argument('-i', '--input', type=str,
                       help='输入CSV文件路径')
    parser.add_argument('-o', '--output-dir', type=str, default='output',
                       help='输出目录 (默认: output)')
    parser.add_argument('--generate-data', action='store_true',
                       help='生成测试数据后自动分析')
    parser.add_argument('--no-show', action='store_true',
                       help='不显示图表窗口，只生成文件')
    parser.add_argument('--floor-height', type=float, default=3.0,
                       help='楼层高度 (默认: 3.0米)')
    
    args = parser.parse_args()
    
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)
    
    output_dir = os.path.join(project_root, args.output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    input_file = args.input
    if args.generate_data:
        print("="*60)
        print("正在生成测试数据...")
        print("="*60)
        input_file = generate_test_data(os.path.join(project_root, 'data'))
    
    if not input_file or not os.path.exists(input_file):
        print(f"错误: 输入文件不存在: {input_file}")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("📍 室内定位信号地图分析工具")
    print("="*60)
    print(f"输入文件: {input_file}")
    print(f"输出目录: {output_dir}")
    print("-"*60)
    
    print("\n[1/5] 数据清洗...")
    cleaner = DataCleaner(input_file, output_dir)
    df, clean_stats = cleaner.load_and_clean()
    
    print(f"  ✓ 清洗完成")
    print(f"    - 正常数据: {len(df)} 行")
    print(f"    - 空行: {clean_stats.get('empty_rows', 0)}")
    print(f"    - 备注行: {clean_stats.get('comment_rows', 0)}")
    print(f"    - 缺列行: {clean_stats.get('missing_columns_rows', 0)}")
    print(f"    - 无效值行: {clean_stats.get('invalid_value_rows', 0)}")
    
    if df.empty:
        print("错误: 没有有效的数据行")
        sys.exit(1)
    
    print("\n[2/5] 异常检测...")
    detector = AnomalyDetector(output_dir)
    df, anomaly_stats = detector.detect_all(df)
    
    print(f"  ✓ 检测完成")
    print(f"    - 总点数: {anomaly_stats.get('total_points', 0)}")
    print(f"    - 正常点: {anomaly_stats.get('normal_points', 0)}")
    print(f"    - 异常点: {anomaly_stats.get('anomaly_points', 0)} ({anomaly_stats.get('anomaly_percentage', 0):.1f}%)")
    print(f"    - 楼层串跳: {anomaly_stats.get('floor_jumps', 0)} 处")
    print(f"    - 信标重号: {anomaly_stats.get('beacon_duplicates', 0)} 处")
    print(f"    - 轨迹漂移: {anomaly_stats.get('trajectory_drifts', 0)} 处")
    
    if anomaly_stats.get('floor_jumps', 0) > 0:
        print("\n  🚨 楼层串跳详情:")
        for jump in anomaly_stats.get('floor_jump_details', []):
            print(f"    - 行{jump['original_line']}: {jump['description']}")
    
    print("\n[3/5] 生成3D可视化...")
    visualizer = Visualizer(output_dir)
    
    fig_3d = visualizer.create_3d_visualization(df, anomaly_stats)
    fig_3d_path = visualizer.save_figure(fig_3d, '3d_trajectory_view.html')
    
    floor_views = visualizer.create_2d_floor_view(df, anomaly_stats)
    for floor, fig in floor_views.items():
        visualizer.save_figure(fig, f'floor_{floor}_view.html')
    
    print(f"  ✓ 3D视图: {fig_3d_path}")
    print(f"  ✓ 分层视图: {len(floor_views)} 个楼层")
    
    print("\n[4/5] 生成轨迹回放...")
    replay = TrajectoryReplay(output_dir)
    fig_replay = replay.create_replay_animation(df, anomaly_stats)
    replay_path = replay.save_replay(fig_replay)
    print(f"  ✓ 轨迹回放: {replay_path}")
    
    print("\n[5/5] 生成分析报告...")
    reporter = ReportGenerator(output_dir)
    report_path = reporter.generate_complete_report(
        df, clean_stats, anomaly_stats, fig_3d, floor_views
    )
    print(f"  ✓ 完整报告: {report_path}")
    
    print("\n" + "="*60)
    print("✅ 分析完成！")
    print("="*60)
    print("\n输出文件列表:")
    for f in sorted(os.listdir(output_dir)):
        fpath = os.path.join(output_dir, f)
        size = os.path.getsize(fpath)
        print(f"  - {f} ({size/1024:.1f} KB)")
    
    print("\n" + "="*60)
    print("📋 物联网工程师复核清单:")
    print("="*60)
    print("1. 楼层串跳: 请查看 output/floor_jumps.csv 复核")
    print("2. 信标重号: 请查看 output/beacon_duplicates.csv 复核")
    print("3. 轨迹漂移: 请查看 output/trajectory_drifts.csv 复核")
    print("4. 坏行记录: 请查看 output/bad_rows.csv 及分类文件")
    print("5. 截图演示: 打开 analysis_report.html，异常点带文字标注")
    print("6. 轨迹回放: 打开 trajectory_replay.html，支持逐帧查看")
    print("="*60)
    
    if not args.no_show:
        try:
            import webbrowser
            print("\n正在打开报告...")
            webbrowser.open('file://' + os.path.abspath(report_path))
        except:
            pass
    
    return df, clean_stats, anomaly_stats


if __name__ == '__main__':
    main()
