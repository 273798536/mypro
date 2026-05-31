#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.utils import Config, AuditLogger
from src.importers import DataImporter
from src.analyzers import FrictionAnalyzer, SpeedEstimator, RiskAnalyzer
from src.reporters import ReportGenerator

def demo_manual_correction():
    print("=" * 60)
    print("演示: 人工修正数据")
    print("=" * 60)
    
    Config.ensure_dirs()
    audit_logger = AuditLogger(Config.LOGS_DIR)
    importer = DataImporter(audit_logger)
    
    sample_file = Config.SAMPLE_DATA_DIR / "slope_data_sample.csv"
    
    print("\n1. 首次导入（不修正）:")
    result1 = importer.import_from_csv(str(sample_file))
    print(f"   有效行数: {len(result1.valid_rows)}")
    print(f"   坏行数: {len(result1.bad_rows)}")
    print(f"   摩擦系数缺失: {len(result1.missing_friction_rows)}")
    
    print("\n2. 模拟人工修正（补充第20行的摩擦系数）:")
    importer.apply_manual_correction(
        row_id=20,
        field="friction_coeff",
        new_value="0.025",
        reason="人工测量冰面摩擦系数",
        corrector="张教练"
    )
    
    print("3. 重新导入（应用修正）:")
    result2 = importer.import_from_csv(str(sample_file))
    print(f"   有效行数: {len(result2.valid_rows)}")
    print(f"   坏行数: {len(result2.bad_rows)}")
    print(f"   摩擦系数缺失: {len(result2.missing_friction_rows)}")
    
    print("\n4. 查看修正历史:")
    corrections = audit_logger.get_correction_history()
    for corr in corrections:
        print(f"   行{corr['row_id']}: {corr['field']} -> {corr['new_value']} "
              f"({corr['reason']})")
    
    return result2

def demo_full_analysis():
    print("\n" + "=" * 60)
    print("演示: 完整分析流程")
    print("=" * 60)
    
    Config.ensure_dirs()
    audit_logger = AuditLogger(Config.LOGS_DIR)
    
    sample_file = Config.SAMPLE_DATA_DIR / "slope_data_sample.csv"
    
    importer = DataImporter(audit_logger)
    import_result = importer.import_from_csv(str(sample_file))
    import_result.importer = importer
    
    print(f"\n导入完成:")
    print(f"  - 总行数: {import_result.total_rows}")
    print(f"  - 有效行数: {len(import_result.valid_rows)}")
    print(f"  - 坏行数: {len(import_result.bad_rows)}")
    
    print("\n执行分析...")
    friction_analyzer = FrictionAnalyzer(audit_logger)
    friction_results = friction_analyzer.analyze_batch(import_result.valid_rows)
    
    speed_estimator = SpeedEstimator(audit_logger)
    speed_results = speed_estimator.estimate_batch(import_result.valid_rows)
    
    risk_analyzer = RiskAnalyzer(audit_logger)
    risk_results = risk_analyzer.analyze_batch(
        import_result.valid_rows, friction_results, speed_results
    )
    
    print("\n分析完成:")
    risk_counts = {}
    for r in risk_results:
        risk_counts[r.overall_risk_level] = risk_counts.get(r.overall_risk_level, 0) + 1
    for level, count in risk_counts.items():
        print(f"  - {level}: {count} 个坡段")
    
    print("\n生成报告...")
    report_gen = ReportGenerator(audit_logger)
    report_files = report_gen.generate_full_report(
        import_result, friction_results, speed_results, 
        risk_results, Config.REPORTS_DIR
    )
    
    print("\n报告文件:")
    for name, path in report_files.items():
        print(f"  - {name}: {Path(path).name}")
    
    return risk_results, report_gen

def demo_result_tracing(risk_results, report_gen):
    print("\n" + "=" * 60)
    print("演示: 结果追溯")
    print("=" * 60)
    
    if risk_results:
        sample_result = risk_results[0]
        trace_id = sample_result.trace_id
        
        print(f"\n追溯 trace_id: {trace_id}")
        print(f"  坡段: {sample_result.segment_id}")
        print(f"  区域: {sample_result.zone}")
        print(f"  风险等级: {sample_result.overall_risk_level}")
        print(f"  风险分区: {sample_result.risk_zone}")
        print(f"  原始数据行: row_{sample_result.row_id}")
        print(f"  速度估算: {sample_result.speed_estimate_kmh} km/h")
        print(f"  安全速度: {sample_result.max_safe_speed_kmh} km/h")
        print(f"  结冰风险分: {sample_result.ice_risk_score}")
        
        if sample_result.accident_link:
            print(f"  事故关联: {sample_result.accident_link.accident_count} 起")
            print(f"  关联因素: {', '.join(sample_result.accident_link.contributing_factors)}")
        
        print(f"\n追溯链接:")
        print(f"  - 原始数据: raw_data#row_{sample_result.row_id}")
        print(f"  - 速度计算: speed_calc#{sample_result.segment_id}")
        print(f"  - 风险计算: risk_calc#{trace_id}")

def demo_failure_path():
    print("\n" + "=" * 60)
    print("演示: 摩擦系数缺失失败路径")
    print("=" * 60)
    
    Config.ensure_dirs()
    audit_logger = AuditLogger(Config.LOGS_DIR)
    importer = DataImporter(audit_logger)
    
    sample_file = Config.SAMPLE_DATA_DIR / "slope_data_sample.csv"
    import_result = importer.import_from_csv(str(sample_file))
    
    print(f"\n摩擦系数缺失的记录: {len(import_result.missing_friction_rows)} 条")
    print("-" * 60)
    
    for row in import_result.missing_friction_rows:
        data = row["data"]
        print(f"  行{row['row_id']}: {data.get('zone', '?')} 坡段 {data.get('segment_id', '?')}")
        print(f"    坡度: {data.get('slope_angle', '?')}° | "
              f"气温: {data.get('temperature', '?')}°C | "
              f"表面: {data.get('surface_type', '?')}")
        print(f"    处理: 跳过正常分析流程，等待补充数据")
    
    print("\n失败路径报告已生成: reports/failure_path_report.md")
    print("这些记录不会混入正常分析结果中！")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("滑雪雪道摩擦分析系统 - 演示")
    print("=" * 60)
    
    demo_manual_correction()
    risk_results, report_gen = demo_full_analysis()
    demo_result_tracing(risk_results, report_gen)
    demo_failure_path()
    
    print("\n" + "=" * 60)
    print("演示完成！")
    print("=" * 60)
    print("\n命令行使用方式:")
    print("  python main.py data/sample/slope_data_sample.csv")
    print("\n查看目录:")
    print("  - reports/: 分析报告")
    print("  - logs/: 操作日志和审计痕迹")
    print("  - output/: 输出文件")
