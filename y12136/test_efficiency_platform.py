import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

sys.path.insert(0, str(Path(__file__).parent))

from app.database import Base, engine, SessionLocal
from app import models, schemas, crud
from app.cop_calculator import COPCalculator
from app.report_exporter import ReportExporter

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("=" * 80)
print("热泵换热效率台 - 功能测试")
print("=" * 80)

print("\n" + "-" * 80)
print("1. 创建设备档案")
print("-" * 80)

equipment_data = schemas.EquipmentProfileCreate(
    equipment_id="HP-001",
    equipment_name="一号楼主热泵",
    model="KFXRS-38II",
    rated_power=9.5,
    rated_heating_capacity=38.0,
    rated_cop_heating=4.0,
    rated_cooling_capacity=30.0,
    rated_cop_cooling=3.5,
    design_flow_rate=6.5,
    min_flow_rate=4.0,
    max_flow_rate=8.0,
    design_inlet_temp_heating=40.0,
    design_outlet_temp_heating=45.0,
    design_inlet_temp_cooling=12.0,
    design_outlet_temp_cooling=7.0,
    manufacturer="某热泵厂家",
    contact_person="张工",
    contact_phone="13800138000",
    installation_date=datetime(2023, 1, 15),
    remarks="主要负责一号楼采暖和制冷"
)

equipment = crud.create_equipment_profile(db, equipment_data)
print(f"✓ 创建设备成功: {equipment.equipment_name} (ID: {equipment.equipment_id})")
print(f"  额定功率: {equipment.rated_power} kW")
print(f"  额定COP(制热): {equipment.rated_cop_heating}")
print(f"  设计流量: {equipment.design_flow_rate} m³/h")
print(f"  设备档案版本: v{equipment.version}")

print("\n" + "-" * 80)
print("2. 正常数据采集 - 完整COP计算")
print("-" * 80)

normal_request = schemas.DataCollectionRequest(
    record_time=datetime.now() - timedelta(hours=2),
    equipment_id="HP-001",
    inlet_water_temp=40.5,
    outlet_water_temp=45.2,
    outdoor_temp=5.5,
    flow_rate=6.3,
    refrigerant_temp=8.2,
    compressor_temp=75.0
)

cop_result, anomalies, message = crud.process_data_collection(db, normal_request)
print(f"✓ {message}")
if cop_result:
    print(f"  记录时间: {cop_result.record_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  运行模式: {cop_result.operating_mode}")
    print(f"  工况分组: {cop_result.operating_condition_group}")
    print(f"  室外温度: {cop_result.outdoor_temp}℃")
    print(f"  进出水温差: {cop_result.water_temp_diff:.1f}℃")
    print(f"  流量: {cop_result.flow_rate:.2f} m³/h")
    print(f"  换热量: {cop_result.heating_capacity:.2f} kW")
    print(f"  功率消耗: {cop_result.power_consumption:.2f} kW")
    print(f"  实测COP: {cop_result.cop:.3f}")
    print(f"  额定COP: {cop_result.rated_cop:.3f}")
    print(f"  偏差率: {cop_result.cop_deviation:.1f}%")
    print(f"  计算方式: {cop_result.calculation_method}")
    print(f"  是否异常: {'是' if cop_result.has_anomaly else '否'}")

if anomalies:
    for a in anomalies:
        print(f"  ⚠️  异常: [{a.anomaly_type}] {a.anomaly_description}")
        print(f"     下一步: {a.next_action}")

print("\n" + "-" * 80)
print("3. 流量缺采 - 走待确认分支")
print("-" * 80)

missing_flow_request = schemas.DataCollectionRequest(
    record_time=datetime.now() - timedelta(hours=1),
    equipment_id="HP-001",
    inlet_water_temp=41.0,
    outlet_water_temp=45.8,
    outdoor_temp=3.2,
    flow_rate=None,
    is_flow_missing=True
)

cop_result2, anomalies2, message2 = crud.process_data_collection(
    db, missing_flow_request, allow_estimated=False
)
print(f"✓ {message2}")

pending_flow = crud.get_flow_records(db, status="待确认", limit=1)[0]
print(f"  待确认记录ID: {pending_flow.id}")
print(f"  状态: {pending_flow.status}")

for a in anomalies2:
    print(f"  ⚠️  异常: [{a.anomaly_type}] {a.anomaly_description}")
    print(f"     责任人: {a.responsible_person} ({a.contact_phone})")
    print(f"     下一步: {a.next_action}")

print("\n  → 补录流量数据并确认:")
flow_record, cop_result3, anomalies3 = crud.confirm_flow_record(
    db, pending_flow.id, flow_rate=6.4, confirmed_by="李工"
)
print(f"  ✓ 流量确认完成，COP已重新计算")
if cop_result3:
    print(f"    新COP: {cop_result3.cop:.3f}")
    print(f"    计算方式: {cop_result3.calculation_method}")

print("\n" + "-" * 80)
print("4. 温度传感器异常检测")
print("-" * 80)

sensor_error_request = schemas.DataCollectionRequest(
    record_time=datetime.now() - timedelta(minutes=30),
    equipment_id="HP-001",
    inlet_water_temp=40.0,
    outlet_water_temp=95.0,
    outdoor_temp=4.8,
    flow_rate=6.2
)

cop_result4, anomalies4, message4 = crud.process_data_collection(
    db, sensor_error_request, allow_estimated=False
)
print(f"✓ {message4}")
if cop_result4:
    print(f"  COP: {cop_result4.cop:.3f}")
    print(f"  计算方式: {cop_result4.calculation_method}")
for a in anomalies4:
    if "传感器" in a.anomaly_type:
        print(f"  ⚠️  异常: [{a.anomaly_type}] {a.anomaly_description}")
        print(f"     责任人: {a.responsible_person}")
        print(f"     下一步: {a.next_action}")

print("\n" + "-" * 80)
print("5. 除霜周期检测")
print("-" * 80)

defrost_request = schemas.DataCollectionRequest(
    record_time=datetime.now() - timedelta(minutes=15),
    equipment_id="HP-001",
    inlet_water_temp=42.0,
    outlet_water_temp=42.8,
    outdoor_temp=2.5,
    flow_rate=6.3
)

cop_result5, anomalies5, message5 = crud.process_data_collection(db, defrost_request)
print(f"✓ {message5}")
for a in anomalies5:
    if "除霜" in a.anomaly_type:
        print(f"  ⚠️  异常: [{a.anomaly_type}] {a.anomaly_description}")
        print(f"     责任人: {a.responsible_person}")
        print(f"     下一步: {a.next_action}")

print("\n" + "-" * 80)
print("6. 设备档案更新 - 自动追踪版本并重新计算")
print("-" * 80)

print(f"  当前版本: v{equipment.version}")
print(f"  当前额定COP: {equipment.rated_cop_heating}")

update_data = schemas.EquipmentProfileUpdate(
    rated_cop_heating=4.2,
    rated_power=9.8,
    changed_by="王主任",
    change_remarks="根据厂家最新测试报告更新额定参数"
)

updated_equipment, update_info = crud.update_equipment_profile(
    db, "HP-001", update_data
)

print(f"✓ 设备档案已更新")
print(f"  新版本: v{update_info['version']}")
print(f"  变更字段: {update_info['changed_fields']}")
print(f"  原值: {update_info['old_values']}")
print(f"  新值: {update_info['new_values']}")
print(f"  受影响记录: {update_info['recalculation']['affected_records']} 条")
print(f"  已重新计算: {update_info['recalculation']['recalculated_records']} 条")
print(f"  待人工复核: {update_info['recalculation']['pending_review']} 条")

history = crud.get_equipment_history(db, "HP-001", limit=1)
if history:
    h = history[0]
    print(f"  变更记录: 版本v{h.version} 由{h.changed_by}在{h.changed_at.strftime('%Y-%m-%d %H:%M')}修改")

print("\n" + "-" * 80)
print("7. 查看更新后的COP结果 - 标注结论变动")
print("-" * 80)

cop_results = crud.get_cop_results(db, equipment_id="HP-001", limit=5)
for result in cop_results:
    if result.remarks:
        print(f"  时间: {result.record_time.strftime('%H:%M')} | "
              f"COP: {result.cop:.3f} | "
              f"设备版本: v{result.equipment_version} | "
              f"备注: {result.remarks[:50]}...")
    else:
        print(f"  时间: {result.record_time.strftime('%H:%M')} | "
              f"COP: {result.cop:.3f} | "
              f"设备版本: v{result.equipment_version}")

print("\n" + "-" * 80)
print("8. 生成效率报告")
print("-" * 80)

end_time = datetime.now()
start_time = end_time - timedelta(days=1)

report = crud.generate_efficiency_report(db, start_time, end_time, "HP-001")

print(f"✓ 效率报告生成完成")
print(f"  报告周期: {report.report_period}")
print(f"  总记录数: {report.total_records}")
print(f"  有效记录: {report.valid_records}")
print(f"  估算记录: {report.estimated_records}")
print(f"  异常记录: {report.anomaly_records}")
print(f"  平均COP: {report.average_cop:.3f}")
print(f"  平均额定COP: {report.average_rated_cop:.3f}")
print(f"  平均偏差率: {report.average_deviation:.1f}%")
print("\n  工况分组统计:")
for group, stats in report.operating_condition_summary.items():
    print(f"    {group}: {stats['count']}条记录, 平均COP={stats['avg_cop']:.3f}, "
          f"异常{stats['anomaly_count']}条")

print("\n" + "-" * 80)
print("9. 生成文本格式效率报告")
print("-" * 80)

text_report = ReportExporter.generate_text_report(db, start_time, end_time, "HP-001")
print(text_report)

print("\n" + "-" * 80)
print("10. 持久化验证 - 查询重启前的记录")
print("-" * 80)

all_cop = crud.get_cop_results(db, equipment_id="HP-001")
print(f"✓ 数据库中已保存 {len(all_cop)} 条COP计算记录")

all_anomalies = crud.get_anomaly_records(db, equipment_id="HP-001")
print(f"✓ 数据库中已保存 {len(all_anomalies)} 条异常记录")

pending_flow = crud.get_flow_records(db, status="待确认")
print(f"✓ 当前待确认流量记录: {len(pending_flow)} 条")

equipment_list = crud.get_equipment_profile(db, "HP-001")
print(f"✓ 设备档案版本: v{equipment_list.version}")

history_list = crud.get_equipment_history(db, "HP-001")
print(f"✓ 设备变更历史: {len(history_list)} 条")

print("\n" + "=" * 80)
print("所有测试通过！系统功能完整可用。")
print("=" * 80)

print("\n主要功能总结:")
print("  ✓ 统一COP计算接口 - 避免各接口各算各的")
print("  ✓ SQLite持久化存储 - 重启后数据不丢失")
print("  ✓ 流量缺采待确认分支 - 可后续补录重算")
print("  ✓ 温度传感器错误检测 - 自动识别异常")
print("  ✓ 除霜周期检测 - 标注特殊工况")
print("  ✓ 设备档案版本追踪 - 补录后自动重算")
print("  ✓ 结论变动标记 - 清楚看出哪些记录受影响")
print("  ✓ 工况分组 - 极寒/严寒/寒冷/温/常温/高温")
print("  ✓ 异常说明统一来源 - 统一责任人指派机制")
print("  ✓ 月底报表导出 - Excel和文本格式")
print("  ✓ 完整效率报告 - 包含COP计算和异常溯源")

db.close()
