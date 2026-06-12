#!/usr/bin/env python3
"""
蒙特卡洛误差边界校验 - 整包样例演示
一条命令跑完完整流程，退出时说清外推越界卡在哪。

用法: python run_demo.py
"""

import sys
import random
from datetime import datetime, timedelta

from mc_verifier import (
    ParameterRecord,
    MonteCarloValidator,
    BoundaryChecker,
    ParameterVersionManager,
    TimelineGenerator,
    ReviewView,
    ValidationStatus,
    TimelineStatus,
)


def generate_sample_data():
    """生成模拟的投研参数表样例数据"""
    random.seed(42)

    param_names = ["alpha", "beta", "gamma", "delta", "epsilon"]

    base_means = {
        "alpha": 0.05,
        "beta": 1.2,
        "gamma": 0.35,
        "delta": 0.02,
        "epsilon": 2.5,
    }
    base_stds = {
        "alpha": 0.015,
        "beta": 0.3,
        "gamma": 0.08,
        "delta": 0.005,
        "epsilon": 0.6,
    }

    batch1_records = []
    for i in range(1, 21):
        record_id = f"R-{i:03d}"
        params = {}
        for p in param_names:
            params[p] = random.gauss(base_means[p], base_stds[p])

        source = f"数据源A/批次1/样本{i}"
        detail_ref = f"detail://batch1/{record_id}"

        batch1_records.append(
            ParameterRecord(
                record_id=record_id,
                params=params,
                source=source,
                detail_ref=detail_ref,
                remark="初始样本",
            )
        )

    batch2_records = []
    for i in range(21, 31):
        record_id = f"R-{i:03d}"
        params = {}
        for p in param_names:
            params[p] = random.gauss(base_means[p], base_stds[p])

        source = f"数据源B/批次2/样本{i-20}"
        detail_ref = f"detail://batch2/{record_id}"

        batch2_records.append(
            ParameterRecord(
                record_id=record_id,
                params=params,
                source=source,
                detail_ref=detail_ref,
                remark="第二批补充",
            )
        )

    outlier_record = ParameterRecord(
        record_id="R-031",
        params={
            "alpha": 0.12,
            "beta": 3.5,
            "gamma": 0.8,
            "delta": 0.001,
            "epsilon": 5.0,
        },
        source="数据源C/特殊样本/极端值测试",
        detail_ref="detail://special/R-031",
        remark="图表看起来很完美，但点不回明细",
    )

    updated_record = ParameterRecord(
        record_id="R-015",
        params={
            "alpha": 0.072,
            "beta": 1.8,
            "gamma": 0.42,
            "delta": 0.028,
            "epsilon": 3.2,
        },
        source="数据源A/批次1/样本15（复核修正）",
        detail_ref="detail://batch1/R-015?v2",
        remark="原始数据录入错误，已修正",
    )

    return {
        "batch1": batch1_records,
        "batch2": batch2_records,
        "outlier": outlier_record,
        "updated": updated_record,
    }


def print_section(title: str):
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)
    print()


def main():
    print()
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║         蒙特卡洛误差边界校验 - 整包样例演示                      ║")
    print("║  一条命令跑完：参数表分批 → 蒙特卡洛校验 → 外推越界卡点 →       ║")
    print("║            补充材料 → 人工改判 → 历史时间线                     ║")
    print("╚══════════════════════════════════════════════════════════════════╝")

    data = generate_sample_data()

    validator = MonteCarloValidator(
        simulation_count=10000,
        confidence_level=0.95,
        z_threshold=3.0,
    )

    boundary_checker = BoundaryChecker(
        extrapolation_p95=True,
        block_on_extrapolation=True,
    )

    version_mgr = ParameterVersionManager()
    timeline = TimelineGenerator()
    review_view = ReviewView()

    # ── 第 1 步：初始参数表（第一批） ────────────────────────────────
    print_section("第 1 步：导入初始参数表（第一批 20 条）")

    v1 = version_mgr.create_initial_version(
        data["batch1"],
        source_note="投研助理阿乔 提交的第一批参数表（数据源A）",
    )

    print(f"  版本 v{v1.version} 创建成功")
    print(f"  记录数  : {v1.record_count()}")
    print(f"  说明    : {v1.supplement_note}")

    # ── 第 2 步：第一次蒙特卡洛校验 ──────────────────────────────────
    print_section("第 2 步：执行蒙特卡洛误差边界校验（v1）")

    result_v1 = validator.validate(v1)
    boundary_checker.check_extrapolation(result_v1, v1)
    timeline.add_validation_result(result_v1, v1)

    print(f"  校验状态: {result_v1.status.value}")
    print(f"  总记录数: {result_v1.total_records}")
    print(f"  异常点数: {result_v1.anomaly_count}")
    print(f"  模拟次数: {result_v1.simulation_count:,}")
    print(f"  置信度  : {result_v1.confidence_level * 100:.0f}%")

    # ── 第 3 步：补充第二批参数 + 异常记录 ──────────────────────────
    print_section("第 3 步：补充第二批参数 + 1 条疑似异常记录")

    supplement_records = data["batch2"] + [data["outlier"]]
    v2 = version_mgr.supplement_records(
        supplement_records,
        supplement_note="阿乔后补的第二批 + 图表里看起来很完美的那条",
        base_version=1,
    )

    diff = version_mgr.compare_versions(1, 2)
    timeline.add_supplement(
        v2,
        base_version=1,
        added_count=diff["added_count"],
        updated_count=diff["changed_count"],
        note=v2.supplement_note,
    )

    print(f"  新版本    : v{v2.version}")
    print(f"  基于版本  : v{v2.base_version}")
    print(f"  总记录数  : {v2.record_count()}")
    print(f"  新增      : {diff['added_count']} 条")
    print(f"  更新      : {diff['changed_count']} 条")
    print(f"  补充说明  : {v2.supplement_note}")
    print()
    print("  ⚠️  注意：后补材料不会无声覆盖早先判断，")
    print("           所有版本都保留追溯链。")

    # ── 第 4 步：第二次校验，触发外推越界卡点 ────────────────────────
    print_section("第 4 步：第二次蒙特卡洛校验（v2） - 触发外推越界卡点")

    result_v2 = validator.validate(v2)
    issues = boundary_checker.check_extrapolation(result_v2, v2)
    timeline.add_validation_result(result_v2, v2)

    print(f"  校验状态     : {result_v2.status.value}")
    print(f"  总记录数     : {result_v2.total_records}")
    print(f"  异常点数量   : {result_v2.anomaly_count}")
    print(f"  外推越界数量 : {len(issues)}")
    print()

    if issues:
        print("  🔴 外推越界卡点明细：")
        print("  " + "-" * 60)
        for i, issue in enumerate(issues, 1):
            dir_text = "上沿 ↑" if issue.direction == "upper" else "下沿 ↓"
            print(f"  [{i}] 记录 [{issue.record_id}] / 参数 [{issue.param_name}]")
            print(f"       方向  : {dir_text}")
            print(f"       实际值: {issue.actual_value:.4f}")
            print(f"       边界值: {issue.boundary_value:.4f}")
            print(f"       严重度: {issue.severity}")
            print(f"       原因  : {issue.reason}")
            print(f"       下一步: {issue.next_step}")
            print()

    # ── 第 5 步：复核视图（单页版） ─────────────────────────────────
    print_section("第 5 步：复核视图 - 参数版本、异常点、解释同一页")

    review_text = review_view.render_one_page(v2, result_v2, version_mgr)
    print(review_text)

    # ── 第 6 步：人工改判 ──────────────────────────────────────────
    print_section("第 6 步：负责人人工改判 + 修正一条记录")

    v3 = version_mgr.update_single_record(
        record_id="R-015",
        new_params=data["updated"].params,
        update_note="明细数据复核无误，原始录入时 beta 值错位",
        source=data["updated"].source,
    )

    timeline.add_manual_override(
        version=v3.version,
        record_id="R-015",
        reason="明细数据复核无误，原始录入时 beta 值错位",
        operator="投研负责人老李",
    )

    result_v3 = validator.validate(v3)
    boundary_checker.check_extrapolation(result_v3, v3)

    boundary_checker.apply_manual_override(
        result_v3,
        override_note=(
            "R-031 为极端市场环境下的真实样本，业务上合理，"
            "保留但标注为外推特例"
        ),
        override_by="投研负责人老李",
        accepted_record_ids=["R-031"],
    )

    timeline.add_validation_result(result_v3, v3)

    print(f"  新版本     : v{v3.version}")
    print(f"  改判记录   : R-015")
    print(f"  改判原因   : 明细数据复核无误，原始录入时 beta 值错位")
    print(f"  操作人     : 投研负责人老李")
    print(f"  校验状态   : {result_v3.status.value}")
    print(f"  原判断     : {result_v3.previous_judgment}")
    print()

    # 查看 R-015 的历史
    print("  R-015 参数变更历史：")
    history = version_mgr.get_record_history("R-015")
    for h in history:
        params_str = ", ".join(
            f"{k}={v:.4f}" for k, v in sorted(h["params"].items())[:3]
        )
        print(f"    v{h['version']}: {params_str} ...")
        if h["remark"]:
            print(f"           {h['remark']}")
    print()

    # ── 第 7 步：最终历史时间线 ────────────────────────────────────
    print_section("第 7 步：历史时间线（给负责人看的，不是功能清单）")

    timeline_text = timeline.generate_timeline_text()
    print(timeline_text)

    # ── 退出摘要 ──────────────────────────────────────────────────
    print_section("退出摘要 - 说清外推越界卡在哪")

    exit_summary = boundary_checker.format_exit_summary(result_v2)
    print(exit_summary)

    print()
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║                      演示流程结束                                ║")
    print("╠══════════════════════════════════════════════════════════════════╣")
    print("║  ✅ 核心能力：                                                   ║")
    print("║     1. 参数表分批补充，不覆盖早先判断                           ║")
    print("║     2. 蒙特卡洛误差边界校验，外推越界自动卡点                   ║")
    print("║     3. 人工确认有原因有下一步                                   ║")
    print("║     4. 复核视图：参数版本+异常点+解释同页                       ║")
    print("║     5. 历史时间线：已处理/待补材料/人工改判清晰区分             ║")
    print("║     6. 退出提示说清外推越界卡在哪                               ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
