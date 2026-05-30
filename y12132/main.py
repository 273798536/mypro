"""
航线网络瓶颈分析主入口脚本
"""
import sys
from data_loader import DataLoader
from data_merger import DataMerger
from network_analysis import NetworkAnalyzer
from delay_propagation import DelayPropagationAnalyzer
from report_generator import ReportGenerator
from config import Config

def run_full_analysis():
    """执行完整的分析流程"""
    print("=" * 60)
    print("航线网络瓶颈分析系统")
    print("=" * 60)
    
    print("\n[1/5] 加载数据...")
    loader = DataLoader()
    try:
        nodes_df, flights_df = loader.load_all()
        summary = loader.get_data_summary()
        print(f"  ✓ 节点数据: {summary['nodes']['count']} 条")
        print(f"  ✓ 航班数据: {summary['flights']['count']} 条, {summary['flights']['unique_routes']} 条航线")
    except FileNotFoundError as e:
        print(f"  ✗ 错误: {e}")
        print("\n请先在 data/ 目录下放置 nodes.xlsx 和 flights.xlsx 文件")
        print("或运行 python generate_sample_data.py 生成示例数据")
        sys.exit(1)
    
    print("\n[2/5] 数据合并与冲突检测...")
    merger = DataMerger(nodes_df, flights_df)
    merge_report = merger.analyze()
    print(f"  ✓ 发现 {merge_report['summary']['total_conflicts']} 个数据冲突")
    for conflict_type, count in merge_report['summary']['conflicts_by_type'].items():
        print(f"    - {conflict_type}: {count} 个")
    merger.save_merged_data(Config.MERGED_FILE)
    
    print("\n[3/5] 网络中心性计算与瓶颈识别...")
    analyzer = NetworkAnalyzer(merger.merged_nodes_df, merger.merged_routes_df)
    analyzer.build_network()
    analyzer.calculate_centrality()
    bottlenecks = analyzer.identify_bottlenecks()
    network_report = analyzer.get_analysis_report()
    print(f"  ✓ 构建网络: {network_report['network_summary']['node_count']} 个节点, {network_report['network_summary']['edge_count']} 条边")
    print(f"  ✓ 识别瓶颈节点: {len(bottlenecks)} 个")
    print(f"    - 高优先级: {network_report['bottlenecks']['high_severity']} 个")
    print(f"    - 中优先级: {network_report['bottlenecks']['medium_severity']} 个")
    analyzer.save_analysis_results(Config.BOTTLENECK_FILE)
    
    print("\n[4/5] 延误传播分析...")
    propagation_analyzer = DelayPropagationAnalyzer(analyzer.G, merger.merged_routes_df)
    bottleneck_codes = [b.airport_code for b in bottlenecks[:5]]
    if bottleneck_codes:
        propagation_analyzer.analyze_all_bottlenecks(bottleneck_codes)
        propagation_report = propagation_analyzer.get_propagation_report()
        print(f"  ✓ 分析 {len(bottleneck_codes)} 个关键瓶颈的传播影响")
        print(f"  ✓ 发现 {propagation_report['summary']['total_propagation_paths']} 条传播路径")
        propagation_analyzer.save_propagation_results(Config.PROPAGATION_FILE)
    else:
        propagation_report = {"summary": {}}
        print("  - 无瓶颈节点需要分析传播影响")
    
    print("\n[5/5] 生成分析报告...")
    report_gen = ReportGenerator()
    analysis_data = {
        "merge_report": merge_report,
        "network_report": network_report,
        "propagation_report": propagation_report
    }
    html_path = report_gen.generate_html_report(analysis_data)
    json_path = report_gen.generate_json_report(analysis_data)
    print(f"  ✓ HTML报告: {html_path}")
    print(f"  ✓ JSON报告: {json_path}")
    
    print("\n" + "=" * 60)
    print("分析完成!")
    print("=" * 60)
    print("\n输出文件:")
    print(f"  1. 合并数据: {Config.MERGED_FILE}")
    print(f"  2. 瓶颈分析: {Config.BOTTLENECK_FILE}")
    print(f"  3. 传播分析: {Config.PROPAGATION_FILE}")
    print(f"  4. 分析报告: {html_path}")

if __name__ == "__main__":
    run_full_analysis()
