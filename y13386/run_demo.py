#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
漂移监控版本快照 — 一键运行脚本
负责人可直接执行:  python run_demo.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from drift_monitor import (
    SnapshotManager, GrayAnalyzer, ThresholdConfig, DriftStatus,
    format_snapshot_report, format_gray_decomposition
)
from drift_monitor.sample_data import (
    generate_baseline, generate_current_drifted, generate_small_sample,
    generate_raw_records_with_duplicates, records_to_feature_dict
)


def print_header(title: str):
    print()
    print("╔" + "═" * 58 + "╗")
    print(f"║  {title:<54}║")
    print("╚" + "═" * 58 + "╝")
    print()


def main():
    storage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
    if os.path.exists(storage):
        import shutil
        shutil.rmtree(storage)

    manager = SnapshotManager(storage_dir=storage)
    analyzer = GrayAnalyzer(manager)

    baseline = generate_baseline(n_samples=500, seed=42)

    # ──────────────────────────────────────────────
    print_header("① 生成 v1 快照 (默认阈值, 含重复 run_id 测试)")
    # ──────────────────────────────────────────────

    current_v1 = generate_current_drifted(n_samples=500, drift_severity="medium", seed=123)
    small_data = generate_small_sample(n_samples=15, seed=7)
    for k in current_v1:
        current_v1[k].extend(small_data.get(k, []))

    raw_records = generate_raw_records_with_duplicates(
        normal_count=100, duplicate_count=3, seed=99
    )

    snap_v1 = manager.generate_snapshot(
        run_id="drift_daily_20260621",
        version="1",
        baseline_data=baseline,
        current_data=current_v1,
        threshold=ThresholdConfig(),
        raw_records=raw_records,
        notes=["平台算法阿岑: 初版跑批，材料断断续续，边界样本已记录"]
    )
    print(format_snapshot_report(snap_v1, manager=manager))

    # ──────────────────────────────────────────────
    print_header("② 平台算法阿岑 人工改判 (历史留存)")
    # ──────────────────────────────────────────────

    snap_v1 = manager.apply_human_judgment(
        run_id="drift_daily_20260621",
        version="1",
        judge="阿岑",
        new_status=DriftStatus.WARNING,
        reason="小样本拉高了 user_age 均值，实际分布在合理区间，降级为 warning",
        feature_name="user_age"
    )
    snap_v1 = manager.add_note(
        run_id="drift_daily_20260621",
        version="1",
        note="阿岑后补: order_amount 的 p95 虽然高但都是 VIP 老客，不是漂移",
        operator="阿岑"
    )
    print(format_snapshot_report(snap_v1, manager=manager))

    # ──────────────────────────────────────────────
    print_header("③ 换参数后再跑 v2 (对比哪一步让结果变化)")
    # ──────────────────────────────────────────────

    strict_threshold = ThresholdConfig(
        psi_warning=0.08,
        psi_drift=0.2,
        ks_warning=0.04,
        ks_drift=0.08,
        min_samples=20
    )

    current_v2 = generate_current_drifted(n_samples=500, drift_severity="heavy", seed=456)

    snap_v2 = manager.generate_snapshot(
        run_id="drift_daily_20260621",
        version="2",
        baseline_data=baseline,
        current_data=current_v2,
        threshold=strict_threshold,
        extra_params={"model_version": "v2.3.1", "window_days": 7},
        is_gray=True,
        notes=["灰度跑批: 收紧阈值 + 切换模型版本"]
    )
    snap_v2 = manager.apply_human_judgment(
        run_id="drift_daily_20260621",
        version="2",
        judge="阿岑",
        new_status=DriftStatus.DRIFTED,
        reason="order_amount 偏移明显，叠加业务侧促销活动确认，标记为漂移",
        feature_name="order_amount"
    )
    print(format_snapshot_report(snap_v2, manager=manager, compare_version="1"))

    # ──────────────────────────────────────────────
    print_header("④ 灰度结果拆解 (样本变化 / 阈值变化 / 人工改判)")
    # ──────────────────────────────────────────────

    decomp = analyzer.decompose(
        baseline_run_id="drift_daily_20260621", baseline_version="1",
        current_run_id="drift_daily_20260621", current_version="2"
    )
    print(format_gray_decomposition(decomp))

    # ──────────────────────────────────────────────
    print_header("⑤ 完整历史轨迹 (下一班也能看到阿岑的临时改判)")
    # ──────────────────────────────────────────────

    history = manager.get_history("drift_daily_20260621")
    print("  时间          版本  操作人    内容")
    print("  " + "─" * 56)
    for r in history:
        ts = r["timestamp"].strftime("%H:%M:%S") if hasattr(r["timestamp"], "strftime") else str(r["timestamp"])
        ver = r.get("version", "-")
        if r["type"] == "audit":
            print(f"  {ts}  v{ver}  {r['operator']:<6}    修改 {r['field']}: "
                  f"{r['old_value']} → {r['new_value']}")
        elif r["type"] == "human_judgment":
            print(f"  {ts}  v{ver}  {r['judge']:<6}    改判: "
                  f"{r['from_status']} → {r['to_status']} ({r['reason'][:20]})")

    # ──────────────────────────────────────────────
    print_header("⑥ 所有快照一览")
    # ──────────────────────────────────────────────

    for rid in manager.list_run_ids():
        print(f"  Run ID: {rid}")
        for v in manager.list_versions(rid):
            s = manager.get(rid, v)
            print(f"    v{v:<4} {s.created_at.strftime('%Y-%m-%d %H:%M')}  "
                  f"最终={s.final_status().value:<8} "
                  f"原始={s.overall_status.value:<8} "
                  f"样本={s.sample_count}")

    print()
    print("  ✓ 运行完成。快照文件保存在:")
    print(f"    {storage}/")
    print()
    print("  提示: 负责人换班前只需再次执行  python run_demo.py  即可复现全部流程。")
    print()


if __name__ == "__main__":
    main()
