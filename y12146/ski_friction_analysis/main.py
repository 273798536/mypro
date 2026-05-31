#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.utils import Config, AuditLogger
from src.importers import DataImporter
from src.analyzers import FrictionAnalyzer, SpeedEstimator, RiskAnalyzer
from src.reporters import ReportGenerator

def run_analysis(data_file: str, output_dir: str = None, apply_corrections: bool = True):
    Config.ensure_dirs()
    
    if output_dir is None:
        output_dir = Config.REPORTS_DIR
    
    audit_logger = AuditLogger(Config.LOGS_DIR)
    
    importer = DataImporter(audit_logger)
    
    if apply_corrections:
        print("提示: 可以在导入前调用 importer.apply_manual_correction() 进行人工修正")
    
    print(f"正在导入数据: {data_file}")
    import_result = importer.import_from_csv(data_file)
    import_result.importer = importer
    
    print(f"  - 总行数: {import_result.total_rows}")
    print(f"  - 有效行数: {len(import_result.valid_rows)}")
    print(f"  - 坏行数: {len(import_result.bad_rows)}")
    print(f"  - 摩擦系数缺失: {len(import_result.missing_friction_rows)}")
    print(f"  - 重复坡段: {len(import_result.duplicate_segments)}")
    print(f"  - 气温突变: {len(import_result.temperature_spikes)}")
    
    print("\n正在执行摩擦分析...")
    friction_analyzer = FrictionAnalyzer(audit_logger)
    friction_results = friction_analyzer.analyze_batch(import_result.valid_rows)
    print(f"  - 已分析 {len(friction_results)} 个坡段的结冰风险")
    
    print("\n正在执行速度估算...")
    speed_estimator = SpeedEstimator(audit_logger)
    speed_results = speed_estimator.estimate_batch(import_result.valid_rows)
    print(f"  - 已估算 {len(speed_results)} 个坡段的速度")
    
    print("\n正在执行风险分析...")
    risk_analyzer = RiskAnalyzer(audit_logger)
    risk_results = risk_analyzer.analyze_batch(
        import_result.valid_rows,
        friction_results,
        speed_results
    )
    print(f"  - 已完成 {len(risk_results)} 个坡段的风险评估")
    
    print("\n正在生成报告...")
    report_generator = ReportGenerator(audit_logger)
    report_files = report_generator.generate_full_report(
        import_result,
        friction_results,
        speed_results,
        risk_results,
        output_dir
    )
    
    print("\n报告已生成:")
    for name, path in report_files.items():
        print(f"  - {name}: {path}")
    
    failure_report = Path(output_dir) / "failure_path_report.md"
    report_generator.get_failure_path_report(import_result, failure_report)
    print(f"  - failure_path_report: {failure_report}")
    
    print("\n" + "="*50)
    print("分析完成!")
    print("="*50)
    
    return {
        "import_result": import_result,
        "friction_results": friction_results,
        "speed_results": speed_results,
        "risk_results": risk_results,
        "report_files": report_files,
        "report_generator": report_generator
    }

def show_trace_chain(report_generator: ReportGenerator, trace_id: str):
    result = report_generator.trace_by_id(trace_id)
    if result:
        print(f"\n追溯结果 (trace_id: {trace_id}):")
        print(f"  坡段: {result.segment_id} (行 {result.row_id})")
        print(f"  区域: {result.zone}")
        print(f"  风险等级: {result.risk_level}")
        print(f"  原始数据链接: {result.source_data_link}")
        print(f"  速度计算链接: {result.speed_calc_link}")
        print(f"  风险计算链接: {result.risk_calc_link}")
    else:
        print(f"未找到 trace_id = {trace_id} 的记录")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="滑雪雪道摩擦分析系统")
    parser.add_argument("data_file", help="输入数据文件路径 (CSV格式)")
    parser.add_argument("-o", "--output", help="输出目录", default=None)
    parser.add_argument("--trace", help="要追溯的 trace_id", default=None)
    
    args = parser.parse_args()
    
    results = run_analysis(args.data_file, args.output)
    
    if args.trace:
        show_trace_chain(results["report_generator"], args.trace)
