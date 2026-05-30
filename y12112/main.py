import sys

from shuttle_dispatch import (
    AssignmentStatus, Employee, Exporter, Schedule, ShuttleSolver,
    Station, StationStatus, Vehicle, Validator, DispatchTracker,
)


def sample_1_basic():
    print("=" * 60)
    print("样例1: 基础调度 — 6名员工、3个候选站点、2辆班车")
    print("=" * 60)

    employees = [
        Employee(id="E001", name="张三", address="朝阳路10号", candidate_stations=["S01", "S02"]),
        Employee(id="E002", name="李四", address="海淀路20号", candidate_stations=["S01", "S03"]),
        Employee(id="E003", name="王五", address="西城路30号", candidate_stations=["S02", "S03"]),
        Employee(id="E004", name="赵六", address="东城路40号", candidate_stations=["S01"]),
        Employee(id="E005", name="钱七", address="丰台路50号", candidate_stations=["S02", "S03"]),
        Employee(id="E006", name="孙八", address="通州路60号", candidate_stations=["S03"]),
    ]

    stations = [
        Station(id="S01", name="朝阳站", location="朝阳路口", fixed_cost=1.0),
        Station(id="S02", name="海淀站", location="海淀路口", fixed_cost=1.0),
        Station(id="S03", name="西城站", location="西城路口", fixed_cost=1.2),
    ]

    vehicles = [
        Vehicle(id="V01", plate="京A·11111", capacity=4),
    ]

    solver = ShuttleSolver(employees, stations, vehicles)
    result = solver.solve()

    print(f"\n求解状态: {'可行' if result.is_feasible else '不可行'}")
    if result.is_feasible:
        print(f"目标函数值: {result.total_cost}")
        print(f"选中站点: {result.selected_stations}")
        print(f"站点班车数: {result.station_bus_count}")
        print(f"站点员工数: {result.station_employee_count}")
        print(f"\n分配明细:")
        station_map = {s.id: s.name for s in stations}
        for a in result.assignments:
            emp = next(e for e in employees if e.id == a.employee_id)
            print(f"  {emp.name} ({emp.address}) → [{station_map[a.station_id]}]")

    print("\n" + solver.explain_capacity(result))
    return result, employees, stations, vehicles


def sample_2_overflow():
    print("\n" + "=" * 60)
    print("样例2: 容量超限 — 5名员工只有1个站点可选，车坐不下")
    print("=" * 60)

    employees = [
        Employee(id="E101", name="周九", address="远郊路1号", candidate_stations=["S10"]),
        Employee(id="E102", name="吴十", address="远郊路2号", candidate_stations=["S10"]),
        Employee(id="E103", name="郑冬", address="远郊路3号", candidate_stations=["S10"]),
        Employee(id="E104", name="王腊", address="远郊路4号", candidate_stations=["S10"]),
        Employee(id="E105", name="冯春", address="远郊路5号", candidate_stations=["S10"]),
    ]

    stations = [
        Station(id="S10", name="远郊站", location="远郊路口", fixed_cost=1.0),
    ]

    vehicles = [
        Vehicle(id="V10", plate="京B·22222", capacity=3),
    ]

    solver = ShuttleSolver(employees, stations, vehicles, max_buses_per_station=1)
    result = solver.solve()

    print(f"\n求解状态: {'可行' if result.is_feasible else '不可行'}")
    if not result.is_feasible:
        print(f"原因: {result.infeasibility_reason}")
        print("\n" + solver.explain_infeasibility(result))
    else:
        print(f"站点班车数: {result.station_bus_count}")

        validator = Validator(employees, stations, vehicles)
        overflow_items, overflow_report = validator.check_capacity_overflow(result)
        print(f"\n超限员工数: {len(overflow_items)}")
        print(overflow_report)

    return result, employees, stations, vehicles


def sample_3_closure_and_supplemental():
    print("\n" + "=" * 60)
    print("样例3: 站点关闭 + 补录班次 — 关站后重算，补录追踪变更")
    print("=" * 60)

    employees = [
        Employee(id="E201", name="甲", address="A小区", candidate_stations=["S20", "S21"]),
        Employee(id="E202", name="乙", address="B小区", candidate_stations=["S20", "S22"]),
        Employee(id="E203", name="丙", address="C小区", candidate_stations=["S21", "S22"]),
        Employee(id="E204", name="丁", address="D小区", candidate_stations=["S20", "S21", "S22"]),
    ]

    stations = [
        Station(id="S20", name="A站", location="A路口", fixed_cost=1.0),
        Station(id="S21", name="B站", location="B路口", fixed_cost=1.0),
        Station(id="S22", name="C站", location="C路口", fixed_cost=1.5),
    ]

    vehicles = [
        Vehicle(id="V20", plate="京C·33333", capacity=5),
    ]

    tracker = DispatchTracker()
    result = tracker.initialize(employees, stations, vehicles)
    print(f"\n初始求解: 可行={result.is_feasible}, 站点={result.selected_stations}")
    print(f"班车分配: {result.station_bus_count}")

    print(f"\n--- 关闭站点 B站 ---")
    new_result, changes, impact = tracker.close_station("S21")
    print(f"关站后: 可行={new_result.is_feasible}, 站点={new_result.selected_stations}")
    print(f"变更: {changes}")
    print(f"\n影响分析:\n{impact}")

    print(f"\n--- 补录班次 ---")
    schedules = [
        Schedule(id="SH01", station_id="S20", vehicle_id="V20", departure_time="07:30", route_order=1),
        Schedule(id="SH02", station_id="S22", vehicle_id="V20", departure_time="07:45", route_order=2),
    ]
    tracker.add_schedules(schedules)
    print(f"班次补录完成")
    print(f"\n{tracker.get_change_summary()}")

    exporter = Exporter(
        tracker.current.employees,
        tracker.current.stations,
        tracker.current.vehicles,
        tracker.current.schedules,
    )
    print(f"\n--- 正向追溯: 员工甲 → 结果 ---")
    print(exporter.trace_forward("E201", new_result))

    print(f"\n--- 反向追溯: 站点A站 → 员工 ---")
    print(exporter.trace_backward("S20", new_result))

    print(f"\n--- 月度复盘 ---")
    print(exporter.export_monthly_report(new_result))


def sample_4_duplication():
    print("\n" + "=" * 60)
    print("样例4: 员工重复检测")
    print("=" * 60)

    employees = [
        Employee(id="E301", name="张三", address="朝阳路10号", candidate_stations=["S30"]),
        Employee(id="E301", name="张三(重)", address="朝阳路10号", candidate_stations=["S30"]),
        Employee(id="E302", name="李四", address="海淀路20号", candidate_stations=["S30"]),
        Employee(id="E303", name="李四", address="海淀路21号", candidate_stations=["S30"]),
    ]

    stations = [
        Station(id="S30", name="测试站", location="测试路口", fixed_cost=1.0),
    ]
    vehicles = [Vehicle(id="V30", plate="京D·44444", capacity=10)]

    validator = Validator(employees, stations, vehicles)
    dup_items, dup_report = validator.check_employee_duplication(employees)
    print(dup_report)


def main():
    print("整数规划班车调度系统 — 演示样例")
    print()

    sample_1_basic()
    sample_2_overflow()
    sample_3_closure_and_supplemental()
    sample_4_duplication()

    print("\n" + "=" * 60)
    print("全部样例运行完毕")
    print("=" * 60)


if __name__ == "__main__":
    main()
