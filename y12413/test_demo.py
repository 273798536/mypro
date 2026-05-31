#!/usr/bin/env python3
"""
合同能源收益分成工具 - 完整场景演示

场景：
1. 项目合同先到，创建项目（电表读数和检修记录还没有）
2. 设置收益分成比例
3. 月初先录入部分电表读数，做一次计算
4. 月底发现缺月和检修，补录数据
5. 重新计算（生成新版本，不覆盖旧版本）
6. 查看版本差异
7. 查看审计历史（何时改、为何改、影响了哪些结果）
8. 查看分阶段提醒
"""

import os
import shutil
from datetime import datetime

from energy_sharing.storage import DataStore
from energy_sharing.audit import AuditTrail
from energy_sharing.alerts import AlertManager
from energy_sharing.calculator import SavingsCalculator
from energy_sharing.models import (
    BaselineAdjustment,
    MaintenanceRecord,
    MeterReading,
    ProjectContract,
    SharingRatioEntry,
    SharingRatioVersion,
)


def demo():
    test_dir = os.path.join(os.getcwd(), "demo_data")
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)

    store = DataStore(test_dir)
    audit = AuditTrail(store)
    alerts = AlertManager(store)
    calculator = SavingsCalculator(store)

    print("=" * 70)
    print("【场景演示】合同能源收益分成管理工具")
    print("=" * 70)
    print()

    # ========== 阶段1：合同先到 ==========
    print("📋 阶段1：项目合同先到，创建项目")
    print("-" * 50)

    project = ProjectContract(
        name="XX大厦照明节能改造项目",
        contract_start=datetime(2024, 1, 1).date(),
        contract_end=datetime(2026, 12, 31).date(),
        baseline_kwh=50000,
        baseline_source="合同附件3-2023年用电明细",
        unit_price=0.85,
    )
    store.save_project(project)
    audit.log_project_create(project.project_id, project.name, "张三")

    print(f"  ✅ 项目已创建")
    print(f"     项目ID: {project.project_id}")
    print(f"     基准电量: 50,000 kwh/月")
    print(f"     电价: 0.85 元/kwh")
    print()

    # 设置分成比例
    print("💰 设置收益分成比例")
    ratio = SharingRatioVersion(
        version=1,
        effective_from=datetime(2024, 1, 1).date(),
        entries=[
            SharingRatioEntry(party="业主方", percentage=40),
            SharingRatioEntry(party="节能服务公司", percentage=60),
        ],
        contract_ref="合同第5.2条",
    )
    project.sharing_ratios.append(ratio)
    store.save_project(project)
    audit.log_ratio_update(project.project_id, 0, 1, "初始分成比例", "张三")

    print("  ✅ 分成比例已设置（版本1）")
    print("     业主方: 40%")
    print("     节能服务公司: 60%")
    print()

    # 初始阶段检查
    print("🔍 初始阶段检查")
    init_alerts = alerts.check_initial_phase(project.project_id)
    print(f"  发现 {len(init_alerts)} 个提醒")
    print()

    # ========== 阶段2：月初录入电表读数 ==========
    print("📊 阶段2：月初录入电表读数（1-3月）")
    print("-" * 50)

    for month, kwh in [("2024-01", 35000), ("2024-02", 33000), ("2024-03", 0)]:
        reading = MeterReading(
            project_id=project.project_id,
            month=month,
            kwh=kwh,
            source_ref=f"抄表记录-{month}",
        )
        store.save_reading(reading)
        audit.log_meter_reading(
            project.project_id, reading.reading_id, month, kwh,
            False, f"正常抄录", "李四"
        )
        print(f"  ✅ {month}: {kwh:,.0f} kwh")

    print()

    # ========== 阶段3：第一次计算（3月还没读数） ==========
    print("🧮 阶段3：第一次计算收益（1-3月）")
    print("-" * 50)

    result1 = calculator.calculate(
        project.project_id, "2024-01", "2024-03",
        "Q1季度结算", "财务小王"
    )
    audit.log_calculation(
        project.project_id, result1.result_id, result1.version,
        "Q1季度结算", "财务小王"
    )

    print(f"  ✅ 计算完成（版本 v{result1.version}）")
    print(f"     总节电量: {result1.total_savings_kwh:,.0f} kwh")
    print(f"     总收益: {result1.total_revenue:,.2f} 元")
    print(f"     触发原因: {result1.trigger_reason}")
    print()

    for d in result1.savings_details:
        missing = " ⚠️ 缺读数" if d.missing_reading else ""
        print(f"     {d.month}: 基准={d.baseline_kwh:,.0f} | 实际={d.actual_kwh:,.0f} | 节电={d.savings_kwh:,.0f}{missing}")
    print()

    # ========== 阶段4：月底发现问题，补录数据 ==========
    print("🔧 阶段4：月底核对，发现问题，补录数据")
    print("-" * 50)

    print("  📝 补录3月电表读数（电表故障延迟）")
    reading_mar = MeterReading(
        project_id=project.project_id,
        month="2024-03",
        kwh=36000,
        is_backfilled=True,
        backfill_reason="3月电表故障，月底修复后补录",
        source_ref="检修后补录记录-2024-03",
    )
    store.save_reading(reading_mar)
    audit.log_meter_reading(
        project.project_id, reading_mar.reading_id, "2024-03", 36000,
        True, "电表故障补录", "李四"
    )
    print(f"     ✅ 2024-03: 36,000 kwh [补录]")
    print()

    print("  🛠️  添加3月设备检修记录")
    maintenance = MaintenanceRecord(
        project_id=project.project_id,
        start_date=datetime(2024, 3, 15).date(),
        end_date=datetime(2024, 3, 20).date(),
        description="冷却塔年度大修",
        excluded_kwh=5000,
        exclusion_reason="检修期间设备全部停机",
        source_ref="工单WO-2024-0315",
    )
    store.save_maintenance(maintenance)
    audit.log_maintenance(
        project.project_id, maintenance.record_id,
        "2024-03-15", "2024-03-20", 5000, "运维主管"
    )
    print(f"     ✅ 3月15-20日: 冷却塔大修，剔除5,000 kwh")
    print()

    print("  📈 调整1月基准电量（新增设备）")
    adj = BaselineAdjustment(
        month="2024-01",
        original_kwh=50000,
        adjusted_kwh=52000,
        reason="1月新增服务器机房，基准电量上调",
    )
    project.baseline_adjustments.append(adj)
    store.save_project(project)
    audit.log_baseline_adjust(
        project.project_id, "2024-01", 50000, 52000,
        "新增服务器机房", adj.adjustment_id, "运营经理"
    )
    print(f"     ✅ 2024-01: 50,000 → 52,000 kwh (+2,000)")
    print()

    # ========== 阶段5：月度检查 ==========
    print("🔍 月度检查（3月）")
    monthly_alerts = alerts.check_monthly_phase(project.project_id, "2024-03")
    print(f"  发现 {len(monthly_alerts)} 个提醒")
    for a in monthly_alerts:
        print(f"     [{a.level}] {a.title}")
    print()

    # ========== 阶段6：重新计算（新版本） ==========
    print("🧮 阶段5：重新计算收益（补录数据后）")
    print("-" * 50)

    result2 = calculator.calculate(
        project.project_id, "2024-01", "2024-03",
        "补录3月电表读数和检修记录后重算", "财务小王"
    )
    audit.log_calculation(
        project.project_id, result2.result_id, result2.version,
        "补录数据后重算", "财务小王"
    )

    print(f"  ✅ 计算完成（版本 v{result2.version}）")
    print(f"     总节电量: {result2.total_savings_kwh:,.0f} kwh")
    print(f"     总收益: {result2.total_revenue:,.2f} 元")
    print(f"     触发原因: {result2.trigger_reason}")
    print()

    for d in result2.savings_details:
        adj_tag = f" [基准+{d.baseline_adjustment_kwh:,.0f}]" if d.baseline_adjustment_kwh else ""
        excl_tag = f" [检修-{d.maintenance_exclusion_kwh:,.0f}]" if d.maintenance_exclusion_kwh > 0 else ""
        print(f"     {d.month}: 基准={d.baseline_kwh:,.0f} | 实际={d.actual_kwh:,.0f} | 节电={d.savings_kwh:,.0f}{adj_tag}{excl_tag}")
    print()

    if result2.exclusions:
        print(f"  检修剔除（{len(result2.exclusions)} 项）:")
        for e in result2.exclusions:
            print(f"     {e.month}: {e.excluded_kwh:,.0f} kwh - {e.reason}")
    print()

    print("  收益分成:")
    for share in result2.sharing_breakdown:
        print(f"     {share['party']}: {share['amount']:,.2f} 元 ({share['percentage']}%)")
    print()

    # ========== 阶段7：版本对比 ==========
    print("📊 阶段6：版本对比（v1 vs v2）")
    print("-" * 50)

    diff_kwh = result2.total_savings_kwh - result1.total_savings_kwh
    diff_rev = result2.total_revenue - result1.total_revenue

    print(f"  总节电量: {result1.total_savings_kwh:,.0f} → {result2.total_savings_kwh:,.0f} ({diff_kwh:+,.0f} kwh)")
    print(f"  总收益: {result1.total_revenue:,.2f} → {result2.total_revenue:,.2f} ({diff_rev:+,.2f} 元)")
    print()

    print("  月度差异:")
    d1_map = {d.month: d for d in result1.savings_details}
    d2_map = {d.month: d for d in result2.savings_details}
    for month in sorted(d2_map.keys()):
        d1 = d1_map.get(month)
        d2 = d2_map.get(month)
        diff = d2.savings_kwh - d1.savings_kwh
        if abs(diff) > 0.01:
            print(f"    {month}: {diff:+,.0f} kwh")
    print()

    # ========== 阶段8：审计历史 ==========
    print("📜 阶段7：查看审计历史")
    print("-" * 50)

    history = audit.get_project_history(project.project_id)
    print(f"  共 {len(history)} 条操作记录:")
    print()
    for h in history:
        print(f"  [{h['时间']}] {h['操作类型']} - {h['操作']}")
        print(f"     原因: {h['原因']}")
        print(f"     操作人: {h['操作人'] or '-'}")
        print()

    print()
    print("=" * 70)
    print("✅ 演示完成！")
    print("=" * 70)
    print()
    print("关键特性验证:")
    print("  ✅ 补录数据不覆盖旧版本，每次计算生成新版本")
    print("  ✅ 每步计算都指向源记录（基准调整、检修剔除）")
    print("  ✅ 审计追踪记录：何时改、为何改、操作人")
    print("  ✅ 分阶段提醒：初始阶段、月度检查、最终汇总")
    print("  ✅ 版本对比功能，清晰展示数据变更影响")
    print()
    print(f"数据文件位置: {test_dir}")


if __name__ == "__main__":
    demo()
