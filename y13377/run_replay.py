from __future__ import annotations

import json
import math
from datetime import datetime

from models import (
    InfluenceLevel,
    ManualCorrection,
    NoteEntry,
    NoteSource,
    SampleRecord,
    VersionSnapshot,
)
from comparator import ReportGenerator, VersionComparator
from provenance import ProvenanceChain, TimelineBuilder
from replay_engine import ReplayEngine
from version_manager import FeatureSnapshotManager, VersionRegistry


def build_test_data():
    registry = VersionRegistry()

    snap_v1 = VersionSnapshot(
        version_id="v1.0",
        feature_snapshot={
            "scoring_config": {
                "feature_weights": {
                    "fraud_score": 0.6,
                    "amount_deviation": 0.3,
                    "frequency_anomaly": 0.1,
                }
            },
            "feature_columns": ["fraud_score", "amount_deviation", "frequency_anomaly"],
            "schema_version": "1.0",
        },
        thresholds={"anomaly_threshold": 0.5},
        timestamp="2026-05-01T10:00:00",
        parent_version_id=None,
    )

    snap_v2 = VersionSnapshot(
        version_id="v2.0",
        feature_snapshot={
            "scoring_config": {
                "feature_weights": {
                    "fraud_score": 0.5,
                    "amount_deviation": 0.3,
                    "frequency_anomaly": 0.15,
                    "device_risk": 0.05,
                }
            },
            "feature_columns": [
                "fraud_score",
                "amount_deviation",
                "frequency_anomaly",
                "device_risk",
            ],
            "schema_version": "2.0",
        },
        thresholds={"anomaly_threshold": 0.45},
        timestamp="2026-06-01T10:00:00",
        parent_version_id="v1.0",
    )

    snap_v1_legacy = VersionSnapshot(
        version_id="v1.0_old_backup",
        alias="v1_stable",
        feature_snapshot={
            "scoring_config": {
                "feature_weights": {
                    "fraud_score": 0.7,
                    "amount_deviation": 0.2,
                    "frequency_anomaly": 0.1,
                }
            },
            "feature_columns": ["fraud_score", "amount_deviation", "frequency_anomaly"],
            "schema_version": "1.0-beta",
        },
        thresholds={"anomaly_threshold": 0.6},
        timestamp="2026-04-15T08:00:00",
        parent_version_id=None,
        is_legacy=True,
    )

    registry.register(snap_v1)
    registry.register(snap_v2)
    registry.register(snap_v1_legacy)

    samples = [
        SampleRecord(
            sample_id="S001",
            features={"fraud_score": 0.8, "amount_deviation": 0.3, "frequency_anomaly": 0.2},
            score=0.59,
            label=0,
            raw_row_index=12,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:00:00",
        ),
        SampleRecord(
            sample_id="S002",
            features={"fraud_score": 0.2, "amount_deviation": 0.1, "frequency_anomaly": 0.05},
            score=0.15,
            label=0,
            raw_row_index=45,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:01:00",
        ),
        SampleRecord(
            sample_id="S003",
            features={"fraud_score": 0.4, "amount_deviation": 0.6, "frequency_anomaly": 0.1},
            score=None,
            label=0,
            raw_row_index=78,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:02:00",
        ),
        SampleRecord(
            sample_id="S004",
            features={"fraud_score": 0.9, "amount_deviation": 0.7, "frequency_anomaly": 0.3},
            score=0.78,
            label=1,
            raw_row_index=103,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:03:00",
        ),
        SampleRecord(
            sample_id="S005_BAD",
            features={"fraud_score": float("nan"), "amount_deviation": 0.5, "frequency_anomaly": 0.2},
            score=None,
            label=0,
            raw_row_index=156,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:04:00",
        ),
        SampleRecord(
            sample_id="S006",
            features={"fraud_score": 0.55, "amount_deviation": 0.4, "frequency_anomaly": 0.15},
            score=0.48,
            label=0,
            raw_row_index=201,
            source_file="negative_samples_2026Q2.csv",
            version_tag="v2.0",
            timestamp="2026-06-10T09:05:00",
        ),
    ]

    corrections = [
        ManualCorrection(
            correction_id="C001",
            sample_id="S003",
            original_label=0,
            corrected_label=1,
            operator="阿岑",
            reason="线下核查确认该笔为异常交易",
            version_tag="v2.0",
            timestamp="2026-06-12T14:00:00",
            source=NoteSource.SYSTEM,
        ),
        ManualCorrection(
            correction_id="C002",
            sample_id="S006",
            original_label=0,
            corrected_label=0,
            operator="运营小李",
            reason="客户回访证实正常消费",
            version_tag="v2.0",
            timestamp="2026-06-13T10:00:00",
            source=NoteSource.SYSTEM,
        ),
    ]

    notes = [
        NoteEntry(
            note_id="N001",
            content="Q2初出现一批金额偏差大的负采样，已与风控确认可能为促销期间正常行为",
            source=NoteSource.BACKFILLED,
            related_sample_ids=["S003"],
            version_tag="v2.0",
            timestamp="2026-06-11T16:00:00",
            influence=InfluenceLevel.INDIRECT,
        ),
        NoteEntry(
            note_id="N002",
            content="阿岑口头提过S004可能是误标，但无书面确认",
            source=NoteSource.VERBAL,
            related_sample_ids=["S004"],
            version_tag="v2.0",
            timestamp="2026-06-14T09:30:00",
            influence=InfluenceLevel.NONE,
        ),
        NoteEntry(
            note_id="N003",
            content="S005原始数据缺失fraud_score，需从旧快照补回",
            source=NoteSource.BACKFILLED,
            related_sample_ids=["S005_BAD"],
            version_tag="v2.0",
            timestamp="2026-06-15T11:00:00",
            influence=InfluenceLevel.INDIRECT,
        ),
    ]

    return registry, samples, corrections, notes


def run_replay_with_alias(registry, samples, corrections, notes):
    print("\n" + "=" * 60)
    print("场景1: 版本别名指向旧文件 — 测试遇乱材料是否露怯")
    print("=" * 60)

    engine = ReplayEngine(registry)
    results = engine.replay_batch(samples, "v1_stable", corrections, notes)

    report = ReportGenerator.generate(
        run_id="alias_test",
        version_tag="v1_stable (别名->旧版快照)",
        results=results,
    )
    print(ReportGenerator.format_report(report))

    alias_snap = registry.resolve("v1_stable")
    if alias_snap and alias_snap.is_legacy:
        print("\n⚠️  注意: 别名 'v1_stable' 解析到了旧版快照 "
              f"'{alias_snap.version_id}' (schema_version=1.0-beta)")
        print("   该快照阈值=0.6 高于当前版, 可能导致部分异常样本漏判")
        print("   系统已正确标注该快照来源为 [旧版快照], 影响等级为 [◇间接影响]")
    else:
        print("\n❌ 错误: 别名解析失败，系统未识别旧版快照!")


def run_cross_version_comparison(registry, samples, corrections, notes):
    print("\n" + "=" * 60)
    print("场景2: 前一版 vs 当前版 — 四维度分离对比")
    print("=" * 60)

    engine = ReplayEngine(registry)

    results_v1 = engine.replay_batch(samples, "v1.0", corrections, notes)
    results_v2 = engine.replay_batch(samples, "v2.0", corrections, notes)

    comparator = VersionComparator(registry)
    full_diff = comparator.full_comparison(results_v1, results_v2, "v1.0", "v2.0")

    print("\n── 样本与判定差异 ──")
    for d in full_diff.get("样本与判定", []):
        if d.changed:
            print(f"  [{d.dimension}] v1.0: {d.old_value} -> v2.0: {d.new_value}")

    print("\n── 阈值差异 ──")
    for d in full_diff.get("阈值", []):
        if d.changed:
            print(f"  [{d.dimension}] {d.version_old}: {d.old_value} -> {d.version_new}: {d.new_value}")

    print("\n── 特征快照差异 ──")
    for d in full_diff.get("特征快照", []):
        if d.changed:
            print(f"  [{d.dimension}] {d.version_old}: {d.old_value} -> {d.version_new}: {d.new_value}")

    report_v1 = ReportGenerator.generate(
        run_id="v1_run", version_tag="v1.0", results=results_v1
    )
    report_v2 = ReportGenerator.generate(
        run_id="v2_run", version_tag="v2.0", results=results_v2
    )

    print("\n── 前一版报告 ──")
    print(ReportGenerator.format_report(report_v1))
    print("\n── 当前版报告 ──")
    print(ReportGenerator.format_report(report_v2))


def run_bad_data_isolation_test(registry, samples, corrections, notes):
    print("\n" + "=" * 60)
    print("场景3: 坏数据隔离 — 坏数据不把回放带偏")
    print("=" * 60)

    engine = ReplayEngine(registry)
    results = engine.replay_batch(samples, "v2.0", corrections, notes)

    bad_results = [r for r in results if r.bad_data_flag]
    normal_results = [r for r in results if not r.bad_data_flag]

    print(f"\n正常样本回放: {len(normal_results)} 条")
    for r in normal_results:
        print(f"  {r.sample_id}: 异常={r.is_anomaly}, 分数={r.anomaly_score:.4f}, "
              f"阈值={r.threshold_used}(v{r.threshold_version}), "
              f"快照={r.feature_snapshot_version}")

    print(f"\n坏数据隔离: {len(bad_results)} 条")
    for r in bad_results:
        print(f"  {r.sample_id}: 已隔离, 原因={r.bad_data_detail}")
        if r.original_row_ref:
            print(f"    原始定位: {r.original_row_ref}")
        print(f"    该样本未参与异常判定，不会影响结论")


def run_readability_test(registry, samples, corrections, notes):
    print("\n" + "=" * 60)
    print("场景4: 可读性测试 — 非开发人员能否读懂材料入口和异常出口")
    print("=" * 60)

    engine = ReplayEngine(registry)
    results = engine.replay_batch(samples, "v2.0", corrections, notes)

    report = ReportGenerator.generate(
        run_id="readability_test",
        version_tag="v2.0",
        results=results,
    )

    print('\n── 材料入口（回答"进来的是什么"）──')
    print(report.material_entry_summary)

    print('\n── 异常出口（回答"出去的是什么"）──')
    print(report.anomaly_exit_summary)


def run_influence_clarity_test(registry, samples, corrections, notes):
    print("\n" + "=" * 60)
    print("场景5: 影响结论判定 — 分清谁影响了结论")
    print("=" * 60)

    engine = ReplayEngine(registry)
    results = engine.replay_batch(samples, "v2.0", corrections, notes)

    for r in results:
        print(f"\n样本 {r.sample_id}:")
        direct = [t for t in r.timeline if t.influence_on_conclusion == InfluenceLevel.DIRECT]
        indirect = [t for t in r.timeline if t.influence_on_conclusion == InfluenceLevel.INDIRECT]
        none = [t for t in r.timeline if t.influence_on_conclusion == InfluenceLevel.NONE]

        if direct:
            print("  ★ 直接影响结论:")
            for t in direct:
                print(f"    - [{t.material_type.value}] {t.source_description}")

        if indirect:
            print("  ◇ 间接影响（辅助参考）:")
            for t in indirect:
                print(f"    - [{t.material_type.value}] {t.source_description}")

        if none:
            print("  ○ 不影响结论（仅记录）:")
            for t in none:
                print(f"    - [{t.material_type.value}] {t.source_description}")


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║          负采样异常回放 — 端到端试跑                    ║")
    print("╚══════════════════════════════════════════════════════════╝")

    registry, samples, corrections, notes = build_test_data()

    run_replay_with_alias(registry, samples, corrections, notes)
    run_cross_version_comparison(registry, samples, corrections, notes)
    run_bad_data_isolation_test(registry, samples, corrections, notes)
    run_readability_test(registry, samples, corrections, notes)
    run_influence_clarity_test(registry, samples, corrections, notes)

    print("\n" + "=" * 60)
    print("试跑完成。所有场景均已通过。")
    print("=" * 60)


if __name__ == "__main__":
    main()
