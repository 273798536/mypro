from datetime import datetime, timedelta
import random
import os

from data_models import FlywheelDataRecord, TimeSeriesPoint
from batch_processor import BatchProcessor
from report_generator import ReportGenerator
from config import OUTPUT_PATHS


def generate_sample_data(experiment_id: str, num_points: int = 10, 
                         speed_base: float = 8000,
                         vacuum_base: float = 0.01,
                         temp_base: float = 60) -> FlywheelDataRecord:
    time_series = []
    start_time = datetime.now() - timedelta(minutes=num_points)
    
    for i in range(num_points):
        timestamp = start_time + timedelta(minutes=i)
        speed = speed_base + random.uniform(-200, 200)
        vacuum = vacuum_base + random.uniform(-0.002, 0.002)
        temp = temp_base + random.uniform(-2, 2)
        
        point = TimeSeriesPoint(
            timestamp=timestamp,
            speed_rpm=speed,
            vacuum_pa=max(0, vacuum),
            temperature_c=temp
        )
        time_series.append(point)
    
    return FlywheelDataRecord(
        experiment_id=experiment_id,
        time_series_data=time_series
    )


def main():
    print("=" * 60)
    print("飞轮储能安全边界分析系统 - 演示")
    print("=" * 60)
    print()

    batch_processor = BatchProcessor()
    report_generator = ReportGenerator()

    print("正在生成示例数据...")
    print()

    records = []

    records.append(generate_sample_data("EXP-001", 10, 8500, 0.008, 55))
    
    records.append(generate_sample_data("EXP-002", 10, 9200, 0.008, 55))
    
    records.append(generate_sample_data("EXP-003", 10, 10500, 0.008, 55))
    
    records.append(generate_sample_data("EXP-004", 10, 8500, 0.15, 55))
    
    records.append(generate_sample_data("EXP-005", 10, 8500, 0.008, 125))

    bad_record = generate_sample_data("EXP-006", 5, 8500, 0.008, 55)
    bad_record.time_series_data[0].speed_rpm = -100
    records.append(bad_record)

    batch_processor.material_tracker.add_material_params(
        experiment_id="EXP-001",
        tensile_strength_mpa=800.0,
        density_kg_m3=7850.0,
        elastic_modulus_gpa=200.0,
        poisson_ratio=0.3,
        source="材料检测报告 No.MAT-2024-001",
        created_by="材料工程师",
        change_reason="初始参数录入"
    )

    batch_processor.material_tracker.add_material_params(
        experiment_id="EXP-003",
        tensile_strength_mpa=800.0,
        density_kg_m3=7850.0,
        elastic_modulus_gpa=200.0,
        poisson_ratio=0.3,
        source="材料检测报告 No.MAT-2024-002",
        created_by="材料工程师",
        change_reason="初始参数录入"
    )

    print(f"共生成 {len(records)} 条实验记录")
    print()

    print("正在批量处理数据...")
    batch_result = batch_processor.process_batch(records, "DEMO-BATCH-001")
    print()

    print("-" * 60)
    print("批量处理结果统计")
    print("-" * 60)
    stats = batch_processor.get_batch_statistics(batch_result)
    print(f"批次编号: {stats['batch_id']}")
    print(f"总记录数: {stats['total_records']}")
    print(f"正常记录: {stats['normal_ratio']*100:.1f}% ({batch_result.normal_count})")
    print(f"边界预警: {stats['boundary_ratio']*100:.1f}% ({batch_result.boundary_count})")
    print(f"坏输入: {stats['bad_input_ratio']*100:.1f}% ({batch_result.bad_input_count})")
    print(f"待确认: {stats['pending_review_ratio']*100:.1f}% ({batch_result.pending_review_count})")
    print()

    print("-" * 60)
    print("分类详情")
    print("-" * 60)
    print(f"正常记录: {[r.experiment_id for r in batch_result.normal_results]}")
    print(f"边界预警: {[r.experiment_id for r in batch_result.boundary_cases]}")
    print(f"坏输入: {[r.experiment_id for r in batch_result.bad_inputs]}")
    print(f"待确认: {[r.experiment_id for r in batch_result.pending_review]}")
    print()

    print("-" * 60)
    print("材料参数补录演示")
    print("-" * 60)
    print("更新 EXP-001 的材料参数...")
    updated_params = batch_processor.material_tracker.update_material_params(
        experiment_id="EXP-001",
        tensile_strength_mpa=850.0,
        density_kg_m3=7800.0,
        updated_by="材料工程师",
        change_reason="重新检测，修正抗拉强度和密度"
    )
    print(f"新版本参数ID: {updated_params.param_id}")
    print(f"变更历史:")
    for entry in batch_processor.material_tracker.get_change_history("EXP-001"):
        print(f"  - {entry.field_name}: {entry.old_value} → {entry.new_value}")
        print(f"    原因: {entry.change_reason}")
    print()

    print("-" * 60)
    print("生成安全报告 - EXP-003 (转速越界待确认)")
    print("-" * 60)
    record_exp003 = next(r for r in records if r.experiment_id == "EXP-003")
    report = report_generator.generate_safety_report(record_exp003)
    
    report_path = report_generator.save_report_to_text(report)
    print(f"安全报告已生成: {report_path}")
    print()

    print("-" * 60)
    print("报告关键信息预览")
    print("-" * 60)
    print(f"能量计算: {report.energy_calculation['stored_energy_kwh']:.4f} kWh")
    print(f"安全系数: {report.energy_calculation['safety_factor']:.2f}")
    print(f"边界检查: {'通过' if report.boundary_check['passed'] else '未通过'}")
    print(f"停机建议: {'是' if report.shutdown_recommendation['should_shutdown'] else '否'}")
    print(f"优先级: {report.shutdown_recommendation['priority']}")
    print(f"负责人员: {report.shutdown_recommendation['responsible_persons']}")
    print()

    print("-" * 60)
    print("结论")
    print("-" * 60)
    for conclusion in report.conclusions:
        print(f"  {conclusion}")
    print()

    print("-" * 60)
    print("下一步行动")
    print("-" * 60)
    for i, step in enumerate(report.shutdown_recommendation['next_steps'], 1):
        print(f"  {i}. {step}")
    print()

    print("=" * 60)
    print("输出文件位置")
    print("=" * 60)
    print(f"正常结果: {os.path.abspath(OUTPUT_PATHS['normal_results'])}")
    print(f"边界案例: {os.path.abspath(OUTPUT_PATHS['boundary_cases'])}")
    print(f"坏输入: {os.path.abspath(OUTPUT_PATHS['bad_inputs'])}")
    print(f"待确认: {os.path.abspath(OUTPUT_PATHS['pending_review'])}")
    print(f"报告目录: {os.path.abspath(OUTPUT_PATHS['reports'])}")
    print()
    print("演示完成！")


if __name__ == "__main__":
    main()

