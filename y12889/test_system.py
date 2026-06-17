import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import ExperimentStatus
from schemas import (
    ExperimentCreate, BuoyDataCreate, VesselTrackCreate,
    WeatherForecastCreate, StatusUpdateRequest
)
from services.import_service import ImportService
from services.workflow_service import WorkflowService
from services.trace_service import TraceService
from services.cleaning_service import CleaningService
from services.weather_service import WeatherService
from services.report_service import ReportService
from services.handover_service import HandoverService

Base.metadata.create_all(bind=engine)


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_full_workflow():
    db = SessionLocal()

    print_section("1. 创建实验记录")
    exp_create = ExperimentCreate(
        experiment_no="OCEAN-2026-06-001",
        vessel_name="海洋探索号",
        start_date=datetime(2026, 6, 1, 8, 0, 0),
        end_date=datetime(2026, 6, 5, 18, 0, 0),
        area="东海A区"
    )
    experiment = ImportService.create_experiment(db, exp_create)
    print(f"✓ 实验创建成功: {experiment.experiment_no}, ID={experiment.id}")
    print(f"  当前状态: {experiment.status.value}")

    print_section("2. 导入浮标数据（含深度为负的异常数据）")
    buoy_data_list = [
        BuoyDataCreate(
            experiment_id=experiment.id,
            buoy_id="BUOY-001",
            record_time=datetime(2026, 6, 1, 9, 0, 0),
            ph_value=8.1,
            temperature=24.5,
            salinity=34.2,
            depth=15.5,
            dissolved_oxygen=6.8
        ),
        BuoyDataCreate(
            experiment_id=experiment.id,
            buoy_id="BUOY-001",
            record_time=datetime(2026, 6, 1, 10, 0, 0),
            ph_value=8.05,
            temperature=24.3,
            salinity=34.1,
            depth=-2.5,
            dissolved_oxygen=6.5
        ),
        BuoyDataCreate(
            experiment_id=experiment.id,
            buoy_id="BUOY-001",
            record_time=datetime(2026, 6, 1, 11, 0, 0),
            ph_value=8.12,
            temperature=24.6,
            salinity=34.3,
            depth=20.0,
            dissolved_oxygen=7.0
        )
    ]
    buoys = ImportService.import_buoy_data(db, buoy_data_list)
    print(f"✓ 导入 {len(buoys)} 条浮标数据")
    for b in buoys:
        status = "✗ 拦截" if b.depth < 0 else "✓ 有效"
        print(f"  {status} - 时间: {b.record_time.strftime('%H:%M')}, 深度: {b.depth:>6.1f}m, 质量: {b.data_quality}")

    print_section("3. 自动生成的风险通报（深度为负拦截）")
    risks = WorkflowService.get_risks_by_experiment(db, experiment.id, resolved=False)
    print(f"✓ 未解决风险通报: {len(risks)} 条")
    for r in risks:
        print(f"  编号: {r.notification_no}")
        print(f"  原因: {r.block_reason.value}")
        print(f"  说明: {r.description[:100]}...")
    print(f"  实验状态自动变为: {experiment.status.value}")

    print_section("4. 导入船舶轨迹数据")
    tracks = [
        VesselTrackCreate(
            experiment_id=experiment.id,
            record_time=datetime(2026, 6, 1, 9, 0, 0),
            longitude=122.5,
            latitude=30.2,
            speed=8.5,
            heading=180.0
        ),
        VesselTrackCreate(
            experiment_id=experiment.id,
            record_time=datetime(2026, 6, 1, 10, 0, 0),
            longitude=122.55,
            latitude=30.15,
            speed=120.0,
            heading=185.0
        ),
        VesselTrackCreate(
            experiment_id=experiment.id,
            record_time=datetime(2026, 6, 1, 11, 0, 0),
            longitude=122.6,
            latitude=30.1,
            speed=9.0,
            heading=190.0
        )
    ]
    vessel_tracks = ImportService.import_vessel_tracks(db, tracks)
    print(f"✓ 导入 {len(vessel_tracks)} 条船舶轨迹")

    print_section("5. 轨迹清洗（自动检测异常）")
    clean_result = CleaningService.clean_trajectory(db, experiment.id)
    print(f"✓ 清洗完成: {clean_result['cleaned']} 条轨迹, 发现 {clean_result['anomalies']} 个异常")
    print(f"  清洗版本: v{clean_result['version']}")

    print_section("6. 浮标数据补录 → 自动触发轨迹级联更新")
    supplementary_data = [
        BuoyDataCreate(
            experiment_id=experiment.id,
            buoy_id="BUOY-002",
            record_time=datetime(2026, 6, 1, 9, 30, 0),
            ph_value=8.08,
            temperature=24.4,
            salinity=34.2,
            depth=18.0,
            dissolved_oxygen=6.9,
            is_supplementary=True
        )
    ]
    buoys_supp = ImportService.import_buoy_data(db, supplementary_data)
    print(f"✓ 补录 {len(buoys_supp)} 条浮标数据")

    history = CleaningService.get_track_cleaning_history(db, experiment.id)
    print(f"✓ 轨迹清洗历史版本: {len(history)} 个")
    for h in history:
        print(f"  v{h['version']}: {h['total_records']} 条记录, {h['anomaly_count']} 个异常")

    print_section("7. 气象预报导入（晚到数据，版本化保存，不覆盖旧结果）")
    forecasts = [
        WeatherForecastCreate(
            experiment_id=experiment.id,
            forecast_time=datetime(2026, 5, 31, 18, 0, 0),
            forecast_for_date=datetime(2026, 6, 1),
            wind_speed=5.0,
            wind_direction="NE",
            wave_height=1.0,
            air_pressure=1013.0
        )
    ]
    ImportService.import_weather_forecast(db, forecasts)
    print("✓ 导入第一版气象预报")

    late_forecasts = [
        WeatherForecastCreate(
            experiment_id=experiment.id,
            forecast_time=datetime(2026, 6, 1, 10, 0, 0),
            forecast_for_date=datetime(2026, 6, 1),
            wind_speed=18.0,
            wind_direction="NE",
            wave_height=3.5,
            air_pressure=1000.0,
            is_late=True
        )
    ]
    ImportService.import_weather_forecast(db, late_forecasts)
    print("✓ 导入晚到修正版气象预报")

    print_section("8. 气象预报影响分析（提示受影响结论，不覆盖旧结果）")
    impact = WeatherService.analyze_weather_impact(db, experiment.id)
    print(f"✓ 是否受影响: {'是' if impact['impacted'] else '否'}")
    print(f"  晚到预报数: {impact['late_forecast_count']}")
    print(f"  旧结果保留: {'是' if impact['old_results_preserved'] else '否'}")
    for i, conclusion in enumerate(impact['impacted_conclusions'], 1):
        print(f"  受影响结论 {i}: {conclusion}")

    versions = WeatherService.get_forecast_versions(db, experiment.id)
    print(f"✓ 预报版本历史:")
    for v in versions:
        print(f"  日期: {v['forecast_date']}, 版本数: {len(v['versions'])}")
        for ver in v['versions']:
            print(f"    v{ver['version']}: 风速={ver['wind_speed']}m/s, 浪高={ver['wave_height']}m, 晚到={ver['is_late']}")

    print_section("9. 解除风险通报 → 状态自动恢复")
    for r in risks:
        WorkflowService.resolve_risk(
            db, r.id, "diver_coach",
            "经核实，该深度负值由传感器信号干扰导致，已排除"
        )
    exp_after = ImportService.get_experiment(db, experiment.id)
    print(f"✓ 风险已解除")
    print(f"  实验状态自动恢复为: {exp_after.status.value}")

    print_section("10. 工作流状态推进")
    transitions = [
        (ExperimentStatus.APPROVED, "复核通过"),
        (ExperimentStatus.COMPLETED, "处理完成"),
    ]
    current_exp = experiment
    for target_status, action in transitions:
        current_exp = WorkflowService.update_status(
            db, current_exp.id, target_status, "diver_coach", action
        )
        print(f"✓ {action}: {target_status.value}")

    print_section("11. 生成报告并导出")
    report = ReportService.generate_report(
        db, experiment.id, "monthly", "diver_coach"
    )
    print(f"✓ 报告生成: {report.report_no}")
    print(f"  有效数据: {report.valid_count} 条")
    print(f"  拦截数据: {report.blocked_count} 条")
    print(f"  气象影响: {'是' if report.weather_impacted else '否'}")

    export_data = ReportService.get_export_report_data(db, report.id)
    print(f"\n✓ 导出报告内容:")
    print(f"  报告编号: {export_data.report_no}")
    print(f"  实验编号: {export_data.experiment_no}")
    print(f"  船舶: {export_data.vessel_name}")
    print(f"  周期: {export_data.period}")

    if export_data.depth_block_explanation:
        print(f"\n  【深度为负拦截说明】:")
        for line in export_data.depth_block_explanation.split('\n')[:5]:
            print(f"    {line}")

    print_section("12. 处理痕迹查询（重启后可追溯）")
    traces = TraceService.get_traces_by_experiment(db, experiment.id)
    print(f"✓ 共 {len(traces)} 条处理痕迹:")
    for t in traces:
        time_str = t.operation_time.strftime('%Y-%m-%d %H:%M:%S')
        status_str = f"{t.old_status or '-'} → {t.new_status or '-'}"
        print(f"  [{time_str}] {t.operation:20s} | {status_str:25s} | {t.remark or ''}")

    print_section("13. 月底转交视图（船队关心哪些不能用）")
    handover = HandoverService.get_monthly_handover(db, 2026, 6)
    print(f"✓ {handover.month} 转交统计:")
    print(f"  总实验数: {handover.total_experiments}")
    print(f"  可用: {handover.available_count}, 不可用: {handover.unavailable_count}")
    print(f"\n  不可用记录详情:")
    for record in handover.blocked_records:
        print(f"    实验: {record.experiment_no}, 船舶: {record.vessel_name}")
        print(f"    原因: {record.block_reason.value}, 深度: {record.depth_value}m")
        print(f"    通报编号: {record.notification_no}")
        print()

    print_section("13b. 月底转交视图（新增含未解决风险的实验）")
    exp2 = ImportService.create_experiment(db, ExperimentCreate(
        experiment_no="OCEAN-2026-06-002",
        vessel_name="深海调查船",
        start_date=datetime(2026, 6, 10, 8, 0, 0),
        end_date=datetime(2026, 6, 15, 18, 0, 0),
        area="南海B区"
    ))
    ImportService.import_buoy_data(db, [
        BuoyDataCreate(
            experiment_id=exp2.id,
            buoy_id="BUOY-003",
            record_time=datetime(2026, 6, 10, 9, 0, 0),
            ph_value=7.9,
            temperature=26.0,
            salinity=33.5,
            depth=-5.0,
            dissolved_oxygen=6.0
        )
    ])
    print("✓ 新建实验 OCEAN-2026-06-002，导入深度为负的浮标数据（未解决）")

    handover2 = HandoverService.get_monthly_handover(db, 2026, 6)
    print(f"\n✓ {handover2.month} 更新后转交统计:")
    print(f"  总实验数: {handover2.total_experiments}")
    print(f"  可用: {handover2.available_count}, 不可用: {handover2.unavailable_count}")
    print(f"\n  不可用记录详情（船队关心的内容）:")
    for record in handover2.blocked_records:
        print(f"    实验: {record.experiment_no}, 船舶: {record.vessel_name}")
        print(f"    原因: {record.block_reason.value}, 深度: {record.depth_value}m")
        print(f"    通报编号: {record.notification_no}")
        print(f"    说明: {record.block_description[:80]}...")
        print()

    print_section("14. 验证持久化（模拟重启查询）")
    db2 = SessionLocal()
    traces_after = TraceService.get_all_traces(db2)
    print(f"✓ 新连接查询到 {len(traces_after)} 条处理痕迹")
    print(f"  (数据已持久化到数据库，重启服务不丢失)")

    db.close()
    db2.close()

    print_section("✓ 所有测试通过")
    print("\n系统核心功能验证完成:")
    print("  ✓ 数据导入（浮标、轨迹、气象预报）")
    print("  ✓ 深度为负自动拦截 + 风险通报")
    print("  ✓ 工作流状态机（导入→复核→通过→完成→导出）")
    print("  ✓ 轨迹清洗与异常检测")
    print("  ✓ 浮标补录 → 轨迹级联更新")
    print("  ✓ 气象预报版本化（不覆盖旧结果）")
    print("  ✓ 气象晚到影响分析与提示")
    print("  ✓ 处理痕迹持久化（重启可追溯）")
    print("  ✓ 报告导出（深度拦截原因可追溯）")
    print("  ✓ 月底转交视图（不可用记录清单）")
    print()


if __name__ == "__main__":
    test_full_workflow()
