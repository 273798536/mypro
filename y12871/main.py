#!/usr/bin/env python3
"""
海上搜救漂移预测系统 - 主入口
===============================

使用方法:
  python main.py              # 启动交互式终端界面
  python main.py --demo       # 运行演示模式, 自动展示各功能
  python main.py --test       # 运行集成测试
  python main.py --report     # 直接生成样例报告并输出
"""

import sys
import argparse
from datetime import datetime

from sample_data import (
    create_sample_buoys,
    create_sample_restricted_zones,
    create_sample_photos,
    get_sample_description
)
from buoy_manager import BuoyDataManager
from inspection_workflow import InspectionWorkflow
from report_exporter import (
    generate_text_report, generate_comparison_report,
    build_report_from_workflow, format_position
)
from cli import run_cli
from models import CalculationMethod, DriftStatus, Position


def init_workflow():
    """初始化工作流, 加载样例数据"""
    base_time = datetime(2024, 6, 12, 8, 0, 0)

    buoys = create_sample_buoys(base_time)
    zones = create_sample_restricted_zones()
    photos_data = create_sample_photos(base_time)

    buoy_manager = BuoyDataManager(buoys)
    workflow = InspectionWorkflow()
    workflow.set_buoy_manager(buoy_manager)
    workflow.set_restricted_zones(zones)

    for pd in photos_data:
        workflow.add_photo(
            photo_id=pd["photo_id"],
            photo_path=pd["photo_path"],
            capture_time=pd["capture_time"],
            estimated_position=pd["estimated_position"],
            notes=pd["notes"]
        )

    return workflow, buoy_manager


def run_demo():
    """运行演示模式"""
    print("=" * 60)
    print("  海上搜救漂移预测系统 - 演示模式")
    print("=" * 60)
    print()

    workflow, buoy_manager = init_workflow()

    print(get_sample_description())
    print()

    input("按回车键开始演示 (第1步: 基于照片计算漂移轨迹)...")

    print("\n--- 第1步: 基于 PHOTO-001 计算漂移轨迹 ---")
    print("使用综合漂移模型, 12步, 每步1小时")
    print()

    traj1 = workflow.run_calculation(
        photo_id="PHOTO-001",
        method=CalculationMethod.COMPREHENSIVE,
        time_steps=12,
        step_hours=1.0,
        target_type="life_raft_small",
        run_type="initial"
    )

    print(f"✓ 计算完成! 轨迹ID: {traj1.trajectory_id}")
    print(f"  起点: {format_position(traj1.start_position.lat, traj1.start_position.lon)}")
    print(f"  有效漂移点: {len(traj1.drift_points)} 个")

    violations = [dp for dp in traj1.drift_points if dp.in_restricted_zone]
    if violations:
        print(f"  ⚠ 禁航区越界: {len(violations)} 处")
        for v in violations[:3]:
            print(f"    - {format_position(v.position.lat, v.position.lon)} "
                  f"(区域: {v.restricted_zone_id})")

    pending = [dp for dp in traj1.drift_points if dp.status != DriftStatus.NORMAL]
    if pending:
        print(f"  ⚠ 异常/待复核点: {len(pending)} 个")

    print()
    print("前5个漂移点:")
    for i, dp in enumerate(traj1.drift_points[:5], 1):
        print(f"  {i}. {dp.position.timestamp.strftime('%H:%M')} | "
              f"{format_position(dp.position.lat, dp.position.lon)} | "
              f"{dp.status.value} | 置信度: {dp.confidence:.2f} | "
              f"方法: {dp.calc_method.value if dp.calc_method else '-'}")
    print()

    input("按回车键继续 (第2步: 查看清洗前后对比)...")

    print("\n--- 第2步: 轨迹清洗前后对比 ---")
    clean_result = workflow.get_clean_result(traj1.trajectory_id)
    if clean_result:
        comp_report = generate_comparison_report(clean_result)
        print(comp_report)
    print()

    input("按回车键继续 (第3步: 查看数据缺口)...")

    print("\n--- 第3步: 浮标数据缺口 ---")
    print(buoy_manager.get_gap_summary())
    print()

    input("按回车键继续 (第4步: 人工复核)...")

    print("\n--- 第4步: 人工复核演示 ---")

    pending_reviews = workflow.get_pending_reviews(traj1.trajectory_id)
    print(f"当前待复核点: {len(pending_reviews)} 个")
    if pending_reviews:
        print("  第一个待复核点:")
        pr = pending_reviews[0]
        print(f"    序号: {pr['point_index'] + 1}")
        print(f"    状态: {pr['status'].value}")
        print(f"    位置: {format_position(pr['position'].lat, pr['position'].lon)}")
        print(f"    置信度: {pr['confidence']:.2f}")
        if pr['in_restricted_zone']:
            print(f"    在禁航区内: 是")

    print()
    print("  执行人工确认 (模拟调度员张工复核)...")
    review = workflow.review_point(
        trajectory_id=traj1.trajectory_id,
        point_index=0,
        reviewer="张调度",
        action="confirm",
        comment="起点位置核实无误"
    )
    print(f"  ✓ 复核完成, 复核ID: {review.review_id}")
    print(f"    状态变化: {review.original_status.value} → {review.new_status.value}")

    if pending_reviews:
        idx = pending_reviews[0]['point_index']
        if idx > 0:
            review2 = workflow.review_point(
                trajectory_id=traj1.trajectory_id,
                point_index=idx,
                reviewer="张调度",
                action="modify",
                comment="确认为越界, 需避让",
                new_status=DriftStatus.EXCEEDED_RESTRICTED
            )
            print(f"  ✓ 第2个复核完成, 修改状态为: 禁航区越界")

    print()

    input("按回车键继续 (第5步: 补录数据后重新计算)...")

    print("\n--- 第5步: 补录浮标数据并重新计算 ---")
    print("  BUOY-002 缺少波高数据, 补录...")
    success = buoy_manager.update_buoy_data("BUOY-002", wave_height=2.0)
    print(f"  ✓ 补录成功: {success}")
    print(f"  现在 BUOY-002 完整度: {buoy_manager.get_buoy_by_id('BUOY-002').completeness_score() * 100:.0f}%")

    print()
    print("  基于同一张照片重新计算...")
    traj2 = workflow.rerun_calculation(
        trajectory_id=traj1.trajectory_id,
        method=CalculationMethod.COMPREHENSIVE,
    )
    print(f"  ✓ 重新计算完成, 新轨迹ID: {traj2.trajectory_id}")
    print(f"    漂移点: {len(traj2.drift_points)} 个")

    print()
    print("  补录后数据缺口:")
    print(buoy_manager.get_gap_summary())

    print()

    input("按回车键继续 (第6步: 生成报告)...")

    print("\n--- 第6步: 生成并导出报告 ---")
    report = build_report_from_workflow(traj2.trajectory_id, workflow)
    text_report = generate_text_report(report, include_formula=True, include_details=True)

    report_file = "demo_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(text_report)
    print(f"  ✓ 报告已保存到 {report_file}")

    print()
    print("  报告预览 (前30行):")
    lines = text_report.split('\n')
    for line in lines[:30]:
        print(f"  {line}")
    print("  ...")
    print()

    print("--- 演示完成 ---")
    print()
    print("运行历史:")
    for h in workflow.get_run_history():
        print(f"  [{h.run_id}] {h.run_type} | {h.trajectory_id} | "
              f"{h.point_count}点 | {h.timestamp.strftime('%H:%M:%S')}")
    print()
    print("复核记录:")
    for r in workflow.get_review_history():
        print(f"  [{r.review_id}] {r.reviewer} 对 {r.trajectory_id} 第{r.point_index+1}点 "
              f"执行 {r.action}")
    print()
    print("想继续探索? 运行 python main.py 进入交互模式!")


def run_tests():
    """运行集成测试"""
    print("=" * 60)
    print("  运行集成测试")
    print("=" * 60)
    print()

    passed = 0
    failed = 0

    def test(name, func):
        nonlocal passed, failed
        try:
            func()
            print(f"  ✓ {name}")
            passed += 1
        except Exception as e:
            print(f"  ✗ {name}: {e}")
            failed += 1

    workflow, buoy_manager = init_workflow()

    def test_1():
        buoys = buoy_manager.buoys
        assert len(buoys) == 6, f"应有6个浮标, 实际{len(buoys)}"
        assert buoy_manager.get_valid_count() == 5, "应有5个有效浮标"
        b4 = buoy_manager.get_buoy_by_id("BUOY-004")
        assert not b4.is_valid, "BUOY-004应该失效"

    test("浮标数据加载", test_1)

    def test_2():
        b2 = buoy_manager.get_buoy_by_id("BUOY-002")
        completeness = b2.completeness_score()
        assert completeness == 0.8, f"BUOY-002完整度应为0.8 (4/5字段), 实际{completeness}"

    test("浮标完整度计算", test_2)

    def test_3():
        pos = Position(lat=31.2, lon=122.3, timestamp=datetime.now())
        nearest = buoy_manager.get_nearest_valid(pos)
        assert nearest is not None
        assert nearest.buoy_id == "BUOY-001", f"最近的应该是BUOY-001, 实际{nearest.buoy_id}"

    test("最近浮标查询", test_3)

    def test_4():
        traj = workflow.run_calculation(
            photo_id="PHOTO-001",
            method=CalculationMethod.COMPREHENSIVE,
            time_steps=10,
            step_hours=1.0,
        )
        assert traj is not None
        assert len(traj.drift_points) > 0, "至少应该有一些有效漂移点"
        assert traj.trajectory_id.startswith("TRJ-")

    test("轨迹计算 (综合模型)", test_4)

    def test_5():
        traj = workflow.run_calculation(
            photo_id="PHOTO-002",
            method=CalculationMethod.LEEWAY,
            time_steps=5,
            step_hours=0.5,
        )
        assert traj is not None
        assert len(traj.drift_points) > 0

    test("轨迹计算 (风压漂移法)", test_5)

    def test_6():
        trajs = workflow.list_trajectories()
        assert len(trajs) >= 2
        first_id = trajs[0].trajectory_id
        clean_result = workflow.get_clean_result(first_id)
        assert clean_result is not None
        assert clean_result.original_trajectory is not None
        assert clean_result.cleaned_trajectory is not None

    test("轨迹清洗", test_6)

    def test_7():
        trajs = workflow.list_trajectories()
        first_id = trajs[0].trajectory_id
        report = build_report_from_workflow(first_id, workflow)
        text = generate_text_report(report)
        assert len(text) > 100
        assert "海上搜救漂移预测报告" in text
        assert report.trajectory_id == first_id

    test("报告生成", test_7)

    def test_8():
        trajs = workflow.list_trajectories()
        first_id = trajs[0].trajectory_id
        review = workflow.review_point(
            trajectory_id=first_id,
            point_index=0,
            reviewer="测试员",
            action="confirm",
            comment="测试确认"
        )
        assert review.review_id.startswith("REV-")
        assert review.new_status == DriftStatus.CONFIRMED
        assert len(workflow.get_review_history()) >= 1

    test("人工复核", test_8)

    def test_9():
        gap_before = len(buoy_manager.get_gap_report())
        buoy_manager.update_buoy_data("BUOY-003", wind_direction=90.0)
        gap_after = len(buoy_manager.get_gap_report())
        assert gap_after <= gap_before
        b3 = buoy_manager.get_buoy_by_id("BUOY-003")
        assert b3.wind_direction == 90.0

    test("补录浮标数据", test_9)

    def test_10():
        success = buoy_manager.update_buoy_data("BUOY-002", wave_height=2.5)
        assert success
        trajs = workflow.list_trajectories()
        if trajs:
            first_id = trajs[0].trajectory_id
            new_traj = workflow.rerun_calculation(
                trajectory_id=first_id,
                method=CalculationMethod.COMPREHENSIVE,
            )
            assert new_traj is not None
            assert new_traj.trajectory_id != first_id

    test("重新计算", test_10)

    def test_11():
        photos = workflow.list_photos()
        assert len(photos) == 3
        assert photos[0].photo_id == "PHOTO-001"

    test("照片管理", test_11)

    def test_12():
        pending = workflow.get_pending_reviews()
        assert isinstance(pending, list)
        assert len(pending) >= 0

    test("待复核查询", test_12)

    def test_13():
        history = workflow.get_run_history()
        assert len(history) >= 2
        assert history[0].run_id.startswith("RUN-")

    test("运行历史", test_13)

    def test_14():
        from drift_calculator import haversine_distance
        p1 = Position(lat=0, lon=0, timestamp=datetime.now())
        p2 = Position(lat=0, lon=1, timestamp=datetime.now())
        dist = haversine_distance(p1, p2)
        assert 59 < dist < 61, f"1度经度约60海里, 实际{dist}"

    test("大圆距离计算", test_14)

    def test_15():
        from trajectory_cleaner import clean_trajectory
        from models import Trajectory, DriftPoint, Position
        from datetime import timedelta

        traj = Trajectory(
            trajectory_id="TEST-CLEAN",
            start_position=Position(lat=30.0, lon=120.0, timestamp=datetime.now())
        )
        base = datetime.now()
        for i in range(5):
            dp = DriftPoint(
                position=Position(
                    lat=30.0 + i * 0.01,
                    lon=120.0 + i * 0.01,
                    timestamp=base + timedelta(hours=i)
                )
            )
            traj.drift_points.append(dp)

        result = clean_trajectory(traj)
        assert result is not None
        assert result.original_trajectory is not None
        assert result.cleaned_trajectory is not None

    test("轨迹清洗模块", test_15)

    print()
    print("-" * 60)
    print(f"  测试结果: {passed} 通过, {failed} 失败")
    if failed == 0:
        print("  ✓ 所有测试通过!")
    else:
        print(f"  ✗ 有 {failed} 个测试失败")
    print("-" * 60)

    return failed == 0


def run_report_only():
    """直接生成并输出样例报告"""
    workflow, buoy_manager = init_workflow()

    traj = workflow.run_calculation(
        photo_id="PHOTO-001",
        method=CalculationMethod.COMPREHENSIVE,
        time_steps=12,
        step_hours=1.0,
        target_type="life_raft_small",
    )

    report = build_report_from_workflow(traj.trajectory_id, workflow)
    text = generate_text_report(report, include_formula=True, include_details=True)
    print(text)


def main():
    parser = argparse.ArgumentParser(description="海上搜救漂移预测系统")
    parser.add_argument("--demo", action="store_true", help="运行演示模式")
    parser.add_argument("--test", action="store_true", help="运行集成测试")
    parser.add_argument("--report", action="store_true", help="直接生成样例报告")

    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.test:
        success = run_tests()
        sys.exit(0 if success else 1)
    elif args.report:
        run_report_only()
    else:
        workflow, buoy_manager = init_workflow()
        run_cli(workflow, buoy_manager)


if __name__ == "__main__":
    main()
