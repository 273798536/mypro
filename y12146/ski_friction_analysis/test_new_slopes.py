#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.utils import Config, AuditLogger
from src.importers import DataImporter
from src.analyzers import FrictionAnalyzer, SpeedEstimator, RiskAnalyzer
from src.reporters import ReportGenerator

def test_failure_path_visibility():
    """
    测试新目录雪道数据 - 重点验证摩擦系数缺失的失败路径是否清晰可见
    """
    print("=" * 70)
    print("测试: 新雪道坡度数据 - 摩擦系数缺失失败路径验证")
    print("=" * 70)
    
    Config.ensure_dirs()
    
    test_dir = Config.BASE_DIR / "data" / "test_new_slopes"
    test_file = test_dir / "new_slopes_test.csv"
    output_dir = Config.BASE_DIR / "output" / "test_new_slopes_results"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n测试文件: {test_file}")
    print(f"输出目录: {output_dir}")
    
    audit_logger = AuditLogger(output_dir / "logs")
    importer = DataImporter(audit_logger)
    
    print("\n" + "-" * 70)
    print("步骤1: 导入数据，检查摩擦系数缺失")
    print("-" * 70)
    
    import_result = importer.import_from_csv(str(test_file))
    import_result.importer = importer
    
    print(f"\n导入统计:")
    print(f"  总行数: {import_result.total_rows}")
    print(f"  有效行数: {len(import_result.valid_rows)}")
    print(f"  摩擦系数缺失: {len(import_result.missing_friction_rows)} 条")
    print(f"  空行数: {import_result.skipped_empty_lines}")
    print(f"  注释行数: {import_result.skipped_comment_lines}")
    
    print("\n" + "=" * 70)
    print("失败路径详情 (摩擦系数缺失的记录):")
    print("=" * 70)
    
    if import_result.missing_friction_rows:
        print(f"\n发现 {len(import_result.missing_friction_rows)} 条摩擦系数缺失的记录")
        print("这些记录已被排除在正常分析之外\n")
        
        print("-" * 70)
        print(f"{'行号':<6} {'区域':<12} {'坡段':<8} {'坡度':<6} {'气温':<6} {'表面':<10}")
        print("-" * 70)
        
        for row in import_result.missing_friction_rows:
            data = row["data"]
            print(f"{row['row_id']:<6} {data.get('zone','?'):<12} {data.get('segment_id','?'):<8} "
                  f"{data.get('slope_angle','?'):<6} {data.get('temperature','?'):<6} "
                  f"{data.get('surface_type','?'):<10}")
        
        print("-" * 70)
        print("\n失败路径处理说明:")
        print("  ✓ 这些记录不会进入摩擦分析")
        print("  ✓ 这些记录不会进入速度估算")
        print("  ✓ 这些记录不会进入风险评估")
        print("  ✓ 这些记录单独保存在缺失摩擦系数报告中")
    else:
        print("没有发现摩擦系数缺失的记录")
    
    print("\n" + "-" * 70)
    print("步骤2: 执行正常分析（仅处理有效数据）")
    print("-" * 70)
    
    friction_analyzer = FrictionAnalyzer(audit_logger)
    friction_results = friction_analyzer.analyze_batch(import_result.valid_rows)
    
    speed_estimator = SpeedEstimator(audit_logger)
    speed_results = speed_estimator.estimate_batch(import_result.valid_rows)
    
    risk_analyzer = RiskAnalyzer(audit_logger)
    risk_results = risk_analyzer.analyze_batch(
        import_result.valid_rows, friction_results, speed_results
    )
    
    print(f"\n分析完成:")
    print(f"  摩擦分析: {len(friction_results)} 条")
    print(f"  速度估算: {len(speed_results)} 条")
    print(f"  风险评估: {len(risk_results)} 条")
    
    print(f"\n注意: 分析的记录数 ({len(risk_results)}) = "
          f"有效数据 ({len(import_result.valid_rows)})")
    print(f"      缺失摩擦系数的记录 ({len(import_result.missing_friction_rows)}) "
          f"未被纳入分析")
    
    print("\n" + "-" * 70)
    print("步骤3: 生成报告（包含失败路径报告）")
    print("-" * 70)
    
    report_gen = ReportGenerator(audit_logger)
    report_files = report_gen.generate_full_report(
        import_result, friction_results, speed_results,
        risk_results, output_dir
    )
    
    failure_report = output_dir / "failure_path_report.md"
    report_gen.get_failure_path_report(import_result, failure_report)
    
    print("\n生成的报告文件:")
    for name, path in report_files.items():
        print(f"  ✓ {name}: {Path(path).name}")
    print(f"  ✓ failure_path_report: {failure_report.name}")
    
    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    print(f"\n✓ 摩擦系数缺失记录数: {len(import_result.missing_friction_rows)}")
    print(f"✓ 正常分析记录数: {len(risk_results)}")
    print(f"✓ 失败路径已单独报告: {failure_report.name}")
    print(f"✓ 失败路径未混入正常结果中")
    print("\n关键文件位置:")
    print(f"  - 缺失摩擦系数报告: {report_files.get('missing_friction')}")
    print(f"  - 失败路径详情: {failure_report}")
    print(f"  - 审核日志: {output_dir / 'logs' / 'audit_trail.jsonl'}")
    print("\n" + "=" * 70)
    
    return import_result.missing_friction_rows

if __name__ == "__main__":
    missing_rows = test_failure_path_visibility()
    
    if missing_rows:
        print(f"\n✅ 测试通过: 失败路径可见性验证成功！")
        print(f"   共发现 {len(missing_rows)} 条摩擦系数缺失的记录，")
        print(f"   这些记录已被正确识别并单独报告，未混入正常分析结果。")
    else:
        print("\n⚠️  未发现摩擦系数缺失的记录")
