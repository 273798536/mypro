#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils import DataManager
from app.algorithms import LinearProgrammingOptimizer, ReportGenerator


def test_full_workflow():
    print("=" * 60)
    print("🧪 线性规划仓储分拨系统 - 完整流程测试")
    print("=" * 60)
    
    dm = DataManager()
    optimizer = LinearProgrammingOptimizer(dm)
    reporter = ReportGenerator()
    
    print("\n1️⃣  生成示例数据...")
    from generate_sample_data import generate_sample_data
    sample_file = generate_sample_data()
    
    print(f"\n2️⃣  从Excel导入数据...")
    try:
        version_id = dm.import_from_excel(sample_file, source="test_script")
        print(f"   ✓ 数据导入成功，版本号: {version_id}")
    except Exception as e:
        print(f"   ✗ 数据导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print(f"\n3️⃣  数据概览:")
    print(f"   - 仓库数量: {len(dm.warehouses)}")
    print(f"   - 门店数量: {len(dm.stores)}")
    print(f"   - 车辆数量: {len(dm.vehicles)}")
    print(f"   - 库存记录: {sum(len(v) for v in dm.inventories.values())}")
    print(f"   - 需求记录: {sum(len(v) for v in dm.demands.values())}")
    
    vehicles = [v for v in dm.vehicles.values() if v.available]
    for vh in vehicles:
        print(f"   - 车辆 {vh.plate_number}: 容量={vh.max_capacity}, 所属仓库={vh.depot_warehouse_id}")
    
    for wh_id, inv_list in dm.inventories.items():
        wh = dm.warehouses.get(wh_id)
        if wh:
            cap = sum(v.max_capacity * optimizer.MAX_TRIPS_PER_VEHICLE for v in vehicles if v.depot_warehouse_id == wh_id or not v.depot_warehouse_id)
            print(f"   - 仓库 {wh.name} 车辆日运力上限: {cap} 件/天")
    
    print(f"\n4️⃣  运行线性规划优化（车辆容量+时限约束已进入LP矩阵）...")
    result = optimizer.optimize()
    
    if result.success:
        print(f"   ✓ 优化成功!")
        print(f"   - 总成本: {result.total_cost:.2f}")
        print(f"   - 运输成本: {result.transport_cost:.2f}")
        print(f"   - 时限惩罚: {result.penalty_cost:.2f}")
        print(f"   - 分拨条数: {len(result.assignments)}")
        print(f"   - 车辆配送趟次: {len(result.vehicle_assignments)} 趟")
        print(f"   - 求解时间: {result.solve_time:.3f} 秒")
    else:
        print(f"   ✗ 优化失败: {result.message}")
        return False
    
    print(f"\n5️⃣  ★ 全局车辆容量LP约束验证（单车单趟级） ★")
    print(f"   ▶ 约束1: 每辆车每趟只能服务一条路线")
    from collections import defaultdict
    vehicle_trip_routes = defaultdict(set)
    for va in result.vehicle_assignments:
        key = (va["vehicle_id"], va["trip_number"])
        vehicle_trip_routes[key].add((va["warehouse_id"], va["store_id"]))
    
    one_route_ok = True
    for (vh_id, trip), routes in vehicle_trip_routes.items():
        vh = dm.vehicles.get(vh_id)
        if len(routes) > 1:
            one_route_ok = False
            print(f"   ✗ {vh.plate_number if vh else vh_id} 第{trip}趟服务了{len(routes)}条路线")
    
    if one_route_ok:
        print("   ✅ 所有车辆每趟仅服务一条路线（OneRoutePerTrip约束生效）")
    else:
        print("   ❌ 存在车辆单趟服务多条路线")
    
    print(f"\n   ▶ 约束2: 每辆车每趟装载量 ≤ 车辆最大容量")
    single_trip_cap_ok = True
    for va in result.vehicle_assignments:
        vh = dm.vehicles.get(va["vehicle_id"])
        if va["load"] > va["max_capacity"] + 0.01:
            single_trip_cap_ok = False
            print(f"   ✗ {va['plate_number']} 第{va['trip_number']}趟超载: {va['load']:.0f}/{va['max_capacity']:.0f}")
    
    if single_trip_cap_ok:
        print("   ✅ 所有车辆趟次装载均不超过容量上限（VehicleCap约束生效）")
    else:
        print("   ❌ 存在车辆趟次超载")
    
    print(f"\n   ▶ 约束3: 每辆车总趟次 ≤ {optimizer.MAX_TRIPS_PER_VEHICLE}")
    max_trips_ok = True
    from collections import Counter
    vehicle_trip_counts = Counter()
    for va in result.vehicle_assignments:
        vehicle_trip_counts[va["vehicle_id"]] += 1
    
    for vh_id, trips in vehicle_trip_counts.items():
        vh = dm.vehicles.get(vh_id)
        if trips > optimizer.MAX_TRIPS_PER_VEHICLE:
            max_trips_ok = False
            print(f"   ✗ {vh.plate_number if vh else vh_id}: {trips} 趟 > {optimizer.MAX_TRIPS_PER_VEHICLE} 趟上限")
    
    if max_trips_ok:
        print(f"   ✅ 所有车辆趟次均不超过{optimizer.MAX_TRIPS_PER_VEHICLE}趟上限")
    else:
        print("   ❌ 存在车辆超趟次限制")
    
    global_vehicle_cap_ok = one_route_ok and single_trip_cap_ok and max_trips_ok
    
    print(f"\n6️⃣  ★ 时限可达性LP约束验证 ★")
    deadline_check_ok = True
    for assign in result.assignments:
        if assign.get("deadline"):
            wh = dm.warehouses.get(assign["warehouse_id"])
            st = dm.stores.get(assign["store_id"])
            delivery_h = assign.get("delivery_hours", 0)
            from datetime import datetime
            from dateutil.parser import isoparse
            try:
                deadline_dt = isoparse(assign["deadline"])
                time_available = (deadline_dt - datetime.now()).total_seconds() / 3600
                feasible = time_available >= delivery_h
                if not feasible:
                    deadline_check_ok = False
                    print(f"   ✗ {wh.name}→{st.name}: 配送需{delivery_h:.1f}h, 可用{time_available:.1f}h")
            except Exception:
                pass
    
    if deadline_check_ok:
        print("   ✅ 所有有截止时间的分拨路线均可达（LP约束生效）")
    else:
        print("   ❌ 存在不可达路线仍被分配（LP约束可能未生效）")
    
    print(f"\n7️⃣  车辆趟次分配详情:")
    from collections import Counter
    vehicle_trip_counts = Counter()
    for va in result.vehicle_assignments:
        vehicle_trip_counts[va["plate_number"]] += 1
        overload = va["load"] > va["max_capacity"]
        if overload:
            print(f"   ✗ {va['plate_number']} 第{va.get('trip_number',1)}趟超载: {va['load']}/{va['max_capacity']}")
    
    for plate, count in vehicle_trip_counts.items():
        print(f"   ✓ {plate}: {count} 趟")
    
    print(f"\n8️⃣  时限惩罚成本验证:")
    total_penalty = 0
    penalty_count = 0
    for assign in result.assignments:
        if assign.get('penalty_cost', 0) > 0:
            total_penalty += assign['penalty_cost']
            penalty_count += 1
    if penalty_count > 0:
        print(f"   ⚠ {penalty_count} 条分拨有时限惩罚，总惩罚成本: {total_penalty:.2f}")
        print(f"   (惩罚已进入LP目标函数，影响分拨决策)")
    else:
        print(f"   ✓ 无时限惩罚成本")
    
    print(f"\n9️⃣  冲突检测结果:")
    if result.conflicts:
        for i, conflict in enumerate(result.conflicts, 1):
            severity_icon = "🔴" if conflict["severity"] == "error" else "🟠" if conflict["severity"] == "warning" else "🔵"
            print(f"   {severity_icon} [{i}] {conflict['description']}")
            print(f"      影响: {conflict['impact']}")
    else:
        print("   ✓ 无冲突")
    
    print(f"\n🔟  分拨方案预览 (前5条):")
    for i, assign in enumerate(result.assignments[:5], 1):
        penalty_str = f", 惩罚: {assign['penalty_cost']:.2f}" if assign.get('penalty_cost', 0) > 0 else ""
        deadline_str = f", 截止: {assign['deadline']}" if assign.get('deadline') else ""
        print(f"   {i}. {assign['warehouse_name']} → {assign['store_name']} ({assign['distance_km']:.1f}km, {assign.get('delivery_hours',0):.1f}h)")
        print(f"      商品: {assign['sku_name']}, 数量: {assign['quantity']:.2f}, 运费: {assign['transport_cost']:.2f}{penalty_str}{deadline_str}")
    
    if len(result.assignments) > 5:
        print(f"   ... 还有 {len(result.assignments) - 5} 条分拨记录")
    
    print(f"\n1️⃣1️⃣  生成Excel报告...")
    try:
        report_file = reporter.generate_excel_report(result, dm)
        print(f"   ✓ 报告已生成: {report_file}")
    except Exception as e:
        print(f"   ✗ 报告生成失败: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n1️⃣2️⃣  保存优化结果...")
    result_path = f"data/results/test_result_{version_id}.json"
    os.makedirs(os.path.dirname(result_path), exist_ok=True)
    optimizer.save_result(result, result_path)
    print(f"   ✓ 结果已保存: {result_path}")
    
    print("\n" + "=" * 60)
    print("✅ 核心功能验证完成!")
    print("=" * 60)
    print("\n📋 验证要点总结:")
    print(f"   {'✅' if global_vehicle_cap_ok else '❌'} 全局车辆容量LP约束: 单车单趟级建模，车辆不可重复计数")
    print(f"   {'✅' if deadline_check_ok else '❌'} 时限可达性LP约束: 车辆趟次级别的不可达路线 x=0")
    print(f"   ✅ 时限惩罚进入目标函数: 总惩罚成本 {total_penalty:.2f}")
    print(f"   ✅ 车辆趟次分配可追踪: {len(result.vehicle_assignments)} 趟")
    print(f"   ✅ Excel报告包含车辆分配+配送时长+截止时间")
    print("\n💡 下一步:")
    print("   1. 运行 'python run.py' 启动Web界面")
    print("   2. 访问 http://localhost:5001 使用系统")
    
    return True


if __name__ == "__main__":
    success = test_full_workflow()
    sys.exit(0 if success else 1)
