import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.data_loader import DataLoader
from src.duplicate_detector import DuplicateDetector
from src.convex_hull import ConvexHullAnalyzer
from src.radius_checker import RadiusChecker
from src.map_visualizer import MapVisualizer
from src.report_generator import ReportGenerator


def main():
    print("=" * 60)
    print("📦 凸包仓库覆盖范围分析系统")
    print("=" * 60)
    
    loader = DataLoader(data_dir="data")
    detector = DuplicateDetector(distance_threshold_meters=50)
    analyzer = ConvexHullAnalyzer()
    checker = RadiusChecker(boundary_warning_ratio=0.9)
    visualizer = MapVisualizer(output_dir="output")
    reporter = ReportGenerator(output_dir="output")
    
    print("\n📥 1. 加载数据...")
    communities = loader.load_communities("communities_with_conflicts.csv")
    warehouses = loader.load_warehouse_candidates("warehouse_candidates_with_conflicts.csv")
    print(f"   - 小区数据: {len(communities)} 条")
    print(f"   - 仓库候选: {len(warehouses)} 条")
    
    print("\n🔍 2. 合并数据并检测冲突...")
    all_points, _ = loader.merge_datasets(communities, warehouses)
    conflicts = detector.detect_all_conflicts(all_points)
    
    summary = conflicts['summary']
    print(f"   - 总冲突数: {summary['total_conflicts']}")
    print(f"   - 坐标完全重复: {summary['exact_duplicate_count']}")
    print(f"   - 坐标接近: {summary['near_duplicate_count']}")
    
    if summary['has_high_risk']:
        print("   ⚠️  发现高风险冲突！（小区和仓库坐标重合）")
        print("   👇 以下是详细原因（人话版）：")
        for conflict in conflicts['exact_duplicates']:
            print(f"\n   {conflict.human_reason}")
            print(f"   💡 建议: {conflict.suggestion}")
    
    print("\n📐 3. 半径越界检测...")
    radius_issues = checker.check_radius_violations(communities, warehouses)
    rad_summary = radius_issues['summary']
    print(f"   - 检查配对数: {rad_summary['total_checked_pairs']}")
    print(f"   - 超出半径: {rad_summary['over_radius_count']} 对")
    print(f"   - 接近边界: {rad_summary['near_boundary_count']} 对")
    
    print("\n📊 4. 凸包覆盖分析...")
    coverage_results = analyzer.analyze_all_warehouses(communities, warehouses)
    overall = coverage_results['overall_coverage']
    print(f"   - 小区覆盖率: {overall['coverage_rate']}%")
    print(f"   - 覆盖人口: {overall['covered_population']} 人")
    
    print("\n🏆 5. 候选仓库比较...")
    comparison = analyzer.compare_warehouse_candidates(communities, warehouses)
    print(comparison.to_string(index=False))
    
    print("\n🗺️  6. 生成交互式地图...")
    map_file = visualizer.create_coverage_map(
        communities, warehouses, coverage_results,
        "coverage_map.html"
    )
    print(f"   - 地图文件: {map_file}")
    
    print("\n📝 7. 生成完整报告...")
    report_file = reporter.generate_full_report(
        conflicts, radius_issues, coverage_results,
        comparison, map_file
    )
    print(f"   - 完整报告: {report_file}")
    
    dup_report_file = reporter.generate_duplicate_only_report(conflicts)
    print(f"   - 坐标重复专项报告: {dup_report_file}")
    
    print("\n" + "=" * 60)
    print("✅ 分析完成！")
    print("=" * 60)
    print("\n📁 输出文件:")
    print(f"   1. {map_file} - 交互式地图（浏览器打开）")
    print(f"   2. {report_file} - 完整分析报告")
    print(f"   3. {dup_report_file} - 坐标重复检测报告")
    print("\n💡 提示: 先看坐标重复报告，处理完冲突再看覆盖分析！")


if __name__ == "__main__":
    main()
