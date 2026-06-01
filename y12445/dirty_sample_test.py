#!/usr/bin/env python3
"""
引力弹弓快递局 - 燃料不足脏样例测试
专门测试窗口错过与碰撞误判的分离情况
"""

from physics import Vector2, Planet, TimeWindow, GravitySimulator
from spacecraft import Spacecraft
from detection import IntegratedDetector
from flight_report import FlightTracer, FlightReporter
from review_system import ReviewSystem
import sys


def create_dirty_sample_scenario():
    """创建一个燃料不足的脏样例场景"""

    earth = Planet(
        name="地球",
        position=Vector2(0, 0),
        mass=5.972e24,
        radius=6371000,
        color="blue"
    )

    mars = Planet(
        name="火星",
        position=Vector2(2.25e11, 0),
        mass=6.39e23,
        radius=3389500,
        color="red"
    )

    jupiter = Planet(
        name="木星",
        position=Vector2(7.78e11, 1e11),
        mass=1.898e27,
        radius=69911000,
        color="orange"
    )

    planets = [earth, mars, jupiter]

    windows = [
        TimeWindow(
            planet_name="火星",
            start_time=2000,
            end_time=4000,
            description="火星引力弹弓窗口",
            required_approach_distance=50000000
        ),
        TimeWindow(
            planet_name="木星",
            start_time=8000,
            end_time=12000,
            description="木星引力弹弓窗口",
            required_approach_distance=150000000
        )
    ]

    return planets, windows


def run_dirty_sample_simulation():
    """运行燃料不足的脏样例模拟"""

    print("🚀 引力弹弓快递局 - 脏样例测试开始")
    print("=" * 60)
    print("场景: 燃料不足 + 窗口错过 + 接近碰撞风险")
    print("目标: 验证窗口错过与碰撞误判不会错误合并")
    print("-" * 60)

    planets, windows = create_dirty_sample_scenario()
    earth, mars, jupiter = planets

    simulator = GravitySimulator(dt=10.0)
    spacecraft = Spacecraft(initial_fuel=500.0, fuel_efficiency=0.1)
    detector = IntegratedDetector(windows)
    tracer = FlightTracer()

    initial_position = Vector2(earth.position.x + 10000000, earth.position.y)
    initial_velocity = Vector2(29000, 15000)
    spacecraft.set_initial_state(initial_position, initial_velocity)

    max_time = 15000
    terminated = False

    print(f"\n初始状态:")
    print(f"  初始燃料: {spacecraft.initial_fuel:.1f} 单位")
    print(f"  初始位置: {initial_position}")
    print(f"  初始速度: {initial_velocity.magnitude():.1f} m/s")
    print(f"  模拟时间: {max_time} 步")
    print()

    for step in range(max_time):
        if terminated:
            break

        if step == 500:
            print(f"t={step}: 执行第一次轨道修正机动...")
            burn_success = spacecraft.burn(Vector2(1000, 500), "霍曼转移初始加速")
            if not burn_success:
                print(f"  ⚠️  警告: 燃料不足，机动不完整！")

        if step == 1800:
            print(f"t={step}: 尝试火星窗口捕获机动...")
            burn_success = spacecraft.burn(Vector2(800, 300), "火星接近修正")
            if not burn_success:
                print(f"  ⚠️  警告: 燃料开始紧张！")

        if step == 2500:
            print(f"t={step}: 燃料即将耗尽！尝试最后一次机动...")
            burn_success = spacecraft.burn(Vector2(500, 200), "紧急轨道修正")
            if not burn_success:
                print(f"  🔥 燃料耗尽！飞船进入无动力漂流状态！")

        new_pos, new_vel = simulator.step(
            spacecraft.state.position,
            spacecraft.state.velocity,
            planets
        )

        gravity_force = simulator.calculate_gravity(spacecraft.state.position, planets)
        contributing = [p.name for p in planets
                        if spacecraft.state.position.distance_to(p.position) < 1e12]

        tracer.record_state(
            time=spacecraft.state.time,
            position=new_pos,
            velocity=new_vel,
            fuel=spacecraft.state.fuel_remaining,
            gravity_force=gravity_force,
            net_acceleration=gravity_force,
            contributing_planets=contributing
        )

        spacecraft.state.position = new_pos
        spacecraft.state.velocity = new_vel
        spacecraft.state.time += simulator.dt

        new_events = detector.update(planets, spacecraft)
        spacecraft.state.events.extend(new_events)

        for event in new_events:
            if event.event_type.value == "window_miss":
                print(f"t={step}: ❌ 窗口错过 - {event.details.get('planet')}")
                print(f"    原因: {event.details.get('miss_reason')}")
                print(f"    最近距离: {event.details.get('closest_approach'):.2e} m")
            elif event.event_type.value == "collision_risk":
                print(f"t={step}: ⚠️  {event.details.get('warning')}")
                print(f"    距离: {event.details.get('distance'):.2e} m")
            elif event.event_type.value == "fuel_depleted":
                print(f"t={step}: 🔥 燃料耗尽事件记录")
                print(f"    预计Δv: {event.details.get('planned_delta_v'):.1f}")
                print(f"    实际Δv: {event.details.get('achieved_delta_v'):.1f}")
                print(f"    燃料缺口: {event.details.get('fuel_shortage'):.1f}")

        collision_events = [e for e in new_events if e.event_type.value == "collision"]
        if collision_events:
            terminated = True
            print(f"\n💥 发生碰撞！模拟终止")

    print("\n" + "=" * 60)
    print("📊 模拟完成，生成飞行报告...")
    print("=" * 60)

    reporter = FlightReporter(spacecraft, detector, tracer, planets, windows)
    full_report = reporter.generate_full_report()

    print("\n" + "=" * 60)
    print("🔍 执行复核系统检查...")
    print("=" * 60)

    review_system = ReviewSystem(spacecraft, detector, tracer, reporter)
    review_summary = review_system.run_full_review()
    review_system.print_review_summary(review_summary)

    print("\n" + "=" * 60)
    print("📋 关键链路追踪 - 因果关系分析")
    print("=" * 60)
    causality = full_report["causality_chain"]
    print(f"\n根本原因: {causality['root_cause']}")
    print(f"最终结果: {causality['outcome']}")
    print("\n影响因素:")
    for factor in causality["contributing_factors"]:
        print(f"  • {factor}")
    print("\n证据链:")
    for ev in causality["evidence"]:
        print(f"  [{ev}")

    print("\n" + "=" * 60)
    print("🏆 结算明细（含失败原因与轨道推进关系）")
    print("=" * 60)
    score = full_report["score_breakdown"]
    print(f"\n基础分数: {score['base_score']}")
    print(f"总扣分数: {score['total_penalties']}")
    print(f"最终得分: {score['final_score']}\n")

    print("扣分明细及与轨道推进的关系:")
    for penalty in score["penalty_details"]:
        print(f"  - {penalty['item']}: -{penalty['penalty']}分")
        print(f"    原因: {penalty['reason']}")
        print(f"    与轨道推进关系: {penalty['related_to_orbit']}\n")

    print("\n" + "=" * 60)
    print("✅ 事件独立性验证结果")
    print("=" * 60)
    independence = full_report["collision_analysis"]["independence_verification"]
    print(f"事件独立: {independence['independent_events']}")
    if independence["merged_events_detected"]:
        print("发现疑似合并事件:")
        for event in independence["merged_events_detected"]:
            print(f"  - {event['planet']} at t={event['window_miss_time']}")
            print(f"    {event['details']}")
    else:
        print("✓ 窗口错过与碰撞事件正确分离，无错误合并")

    print("\n" + "=" * 60)
    print("💾 保存报告文件...")
    print("=" * 60)
    reporter.save_report("dirty_sample_flight_report.json")
    review_system.save_review_report(review_summary, "dirty_sample_review_report.json")
    print("已保存: dirty_sample_flight_report.json")
    print("已保存: dirty_sample_review_report.json")

    print("\n🎯 脏样例测试完成！")
    return full_report, review_summary


def print_key_findings():
    """打印关键发现总结"""
    print("\n" + "=" * 60)
    print("📌 复核节点关键依据")
    print("=" * 60)
    print("""
Q: 窗口错过怎么处理？
A: 系统已完整保留:
   1. 窗口错过的时间点和具体原因
   2. 最近点距离和时间
   3. 与轨道推进的因果关系（在扣分明细中）
   4. 与碰撞事件的独立性验证

Q: 窗口错过与碰撞误判会不会错误合并？
A: 通过 dirty_sample_test.py 验证:
   1. 事件独立性验证模块专门检查时间接近的事件
   2. 窗口错过和碰撞风险分别记录，时间戳精确
   3. 复核系统会标记疑似关联事件供老师确认

Q: 结算为什么不只是给总分？
A: 现在提供:
   1. 每项扣分的具体原因
   2. 扣分与轨道推进的关系说明
   3. 完整的因果链分析
   4. 可追溯的事件时间线

Q: 哪些可以直接用，哪些要老师确认？
A: 复核报告明确分类:
   ✅ 可直接使用: 时间、Δv、燃料统计、碰撞警告等
   ⚠️  需老师确认: 窗口错过判定、碰撞事件、最终得分等
   ❌ 暂时不能算: 疑似关联事件（独立性存疑）
    """)


if __name__ == "__main__":
    report, review = run_dirty_sample_simulation()
    print_key_findings()
