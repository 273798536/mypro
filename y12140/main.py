#!/usr/bin/env python3
"""
粒子沉降速度计算系统
==================

一个面向环保实验员的批量沉降计算工具

功能：
1. 批量处理多组实验数据
2. 正常结果、边界值、异常数据三路输出
3. 检测粒径单位错误、温度缺失、样本重复等问题
4. 检测不同人维护的颗粒和液体数据之间的冲突
5. 生成面向非技术人员可阅读的报告

使用方法：
    python main.py --combined data/samples_combined.csv
    python main.py --particle data/particles.csv --liquid data/liquids.csv
"""

import argparse
import os
import sys
from datetime import datetime

from data_loader import DataLoader
from batch_processor import BatchProcessor
from report_generator import ReportGenerator


def main():
    parser = argparse.ArgumentParser(description='粒子沉降速度计算系统')
    parser.add_argument('--combined', type=str, help='合并格式的CSV文件')
    parser.add_argument('--particle', type=str, help='颗粒数据CSV文件')
    parser.add_argument('--liquid', type=str, help='液体数据CSV文件')
    parser.add_argument('--output-dir', type=str, default='output', help='输出目录')
    parser.add_argument('--no-report', action='store_true', help='不生成Markdown报告')
    parser.add_argument('--monthly', action='store_true', help='生成月度复盘报告')

    args = parser.parse_args()

    if not args.combined and not (args.particle and args.liquid):
        parser.print_help()
        print("\n请提供 --combined 或者同时提供 --particle 和 --liquid")
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    print("=" * 60)
    print("  粒子沉降速度计算系统")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    print("正在加载数据...")
    if args.combined:
        records = DataLoader.load_from_csv(combined_file=args.combined)
        print(f"  ✓ 从合并文件加载了 {len(records)} 条记录")
    else:
        particle_records = DataLoader._load_particle_csv(args.particle)
        liquid_records = DataLoader._load_liquid_csv(args.liquid)
        print(f"  ✓ 从颗粒文件加载了 {len(particle_records)} 条记录")
        print(f"  ✓ 从液体文件加载了 {len(liquid_records)} 条记录")

        particle_ids = set(p.sample_id for p in particle_records)
        liquid_ids = set(l.sample_id for l in liquid_records)
        common_ids = particle_ids & liquid_ids
        print(f"  ✓ 匹配到 {len(common_ids)} 条共同样本")

        records = DataLoader._merge_particle_liquid(particle_records, liquid_records)

    print()
    print("正在验证数据并计算沉降速度...")
    processor = BatchProcessor()

    if args.combined:
        result = processor.process_batch(records)
    else:
        particle_records = DataLoader._load_particle_csv(args.particle)
        liquid_records = DataLoader._load_liquid_csv(args.liquid)
        result = processor.process_with_separate_sources(particle_records, liquid_records)

    stats = processor.get_statistics(result)
    print(f"  ✓ 处理完成")
    print()
    print("=" * 60)
    print("  处理结果统计")
    print("=" * 60)
    print(f"  总记录数:     {stats['total_records']}")
    print(f"  ✅ 正常结果:   {stats['normal_results']}")
    print(f"  ⚠️  边界值:     {stats['boundary_results']}")
    print(f"  ❌ 异常数据:   {stats['anomalies']}")
    print(f"     - 严重异常: {stats['critical_anomalies']}")
    print(f"     - 警告:     {stats['warning_anomalies']}")
    print(f"  🔄 合并冲突:   {stats['merge_conflicts']}")
    print(f"  📊 成功率:     {stats['success_rate']}")
    print("=" * 60)
    print()

    normal_path = os.path.join(args.output_dir, '正常结果.csv')
    boundary_path = os.path.join(args.output_dir, '边界值结果.csv')
    anomaly_path = os.path.join(args.output_dir, '异常记录.csv')
    conflict_path = os.path.join(args.output_dir, '数据冲突.csv')

    print("正在保存结果文件...")

    if result.normal_results:
        DataLoader.save_results_to_csv(result.normal_results, normal_path)
        print(f"  ✓ 正常结果已保存到: {normal_path}")

    if result.boundary_results:
        DataLoader.save_results_to_csv(result.boundary_results, boundary_path)
        print(f"  ✓ 边界值结果已保存到: {boundary_path}")

    if result.anomalies:
        DataLoader.save_anomalies_to_csv(result.anomalies, anomaly_path)
        print(f"  ✓ 异常记录已保存到: {anomaly_path}")

    if result.merge_conflicts:
        DataLoader.save_conflicts_to_csv(result.merge_conflicts, conflict_path)
        print(f"  ✓ 数据冲突已保存到: {conflict_path}")

    print()

    if not args.no_report:
        print("正在生成面向非技术人员的报告...")
        report_gen = ReportGenerator(result)
        report_path = os.path.join(args.output_dir, '沉降计算报告.md')
        report_gen.save_report(report_path)
        print(f"  ✓ 报告已保存到: {report_path}")

        if args.monthly:
            monthly_path = os.path.join(args.output_dir, '月度复盘报告.md')
            monthly_report = report_gen.generate_monthly_summary(
                month=datetime.now().strftime('%Y年%m月'),
                total_batches=1
            )
            with open(monthly_path, 'w', encoding='utf-8') as f:
                f.write(monthly_report)
            print(f"  ✓ 月度复盘报告已保存到: {monthly_path}")

        print()
        print("=" * 60)
        print("  报告内容预览（给非技术同事看的部分）")
        print("=" * 60)

        has_unit_errors = any(
            a.anomaly_type.value in ('missing_size_unit', 'invalid_size_unit')
            for a in result.anomalies
        )

        if has_unit_errors:
            print("\n📌 【重点提醒】为什么粒径单位错了为什么过不了？")
            print("-" * 40)
            print("  沉降速度和粒径平方成正比：v ∝ d²")
            print("  单位差1级（如μm写成mm），结果差100万倍！")
            print("  1000微米 = 1毫米")
            print("  不拦着的话，后面全返工")
            print("-" * 40)
            print()

        if result.merge_conflicts:
            print("🔄 【需要协调】以下数据有冲突，系统不会悄悄选一边")
            print("-" * 40)
            for c in result.merge_conflicts[:3]:
                print(f"  样本【{c.sample_id}】:")
                print(f"    {c.resolution_note[:60]}...")
            if len(result.merge_conflicts) > 3:
                print(f"  ... 还有 {len(result.merge_conflicts) - 3} 条")
            print("-" * 40)
            print()

    print(f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("所有结果文件说明：")
    print("  📄 正常结果.csv - 可直接用于实验分析")
    print("  📄 边界值结果.csv - 接近模型范围边缘，谨慎使用")
    print("  📄 异常记录.csv - 有问题的数据，带人话解释")
    print("  📄 数据冲突.csv - 不同人维护的数据不一致")
    print("  📄 沉降计算报告.md - 给非技术同事看的完整报告")
    print()

    if stats['critical_anomalies'] > 0:
        print("⚠️  下次运行前请先修正严重异常！")
        print()


if __name__ == '__main__':
    main()
