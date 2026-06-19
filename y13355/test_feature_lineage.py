#!/usr/bin/env python3
"""特征血缘任务追踪 - 功能测试脚本
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from feature_lineage.config_loader import ConfigLoader
from feature_lineage.processor import DataProcessor
from feature_lineage.report_generator import ReportGenerator
from feature_lineage.models import ConfigSource, RowStatus


def test_config_1_basic():
    print("=" * 60)
    print("测试 1: 基础配置加载")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    cfg, changes = loader.load_grayscale_config("grayscale_config_v1.yaml")

    assert cfg.config_id is not None
    assert len(cfg.features) == 4
    assert cfg.version == "1.0"

    feat = cfg.get_feature("user_active_days")
    assert feat is not None
    assert feat.threshold == 7.0
    assert len(feat.sample_ids) == 5
    assert feat.source_line == 2

    print(f"✓ 配置 ID: {cfg.config_id}")
    print(f"✓ 特征数量: {len(cfg.features)}")
    print("✓ 测试 1 通过")
    return cfg


def test_config_2_incremental():
    print("\n" + "=" * 60)
    print("测试 2: 增量配置加载与合并")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    base_cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")
    incr_cfg, incr_changes = loader.load_incremental(
        "grayscale_config_v2_incremental.yaml",
        base_cfg.config_id
    )

    print(f"基础配置特征数: {len(base_cfg.features)}")
    print(f"增量配置特征数: {len(incr_cfg.features)}")
    print(f"增量变更数: {len(incr_changes)}")

    for change in incr_changes:
        overwrite_marker = " [覆盖]" if change.is_overwrite else ""
        print(f"  - {change.feature_id}: {change.change_type.value} "
              f"{change.old_value} → {change.new_value}{overwrite_marker}")

    merged_cfg, merge_changes = loader.merge_configs(
        base_cfg.config_id,
        incr_cfg.config_id
    )

    print(f"\n合并后特征数: {len(merged_cfg.features)}")

    active_days = merged_cfg.get_feature("user_active_days")
    assert active_days.threshold == 10.0
    assert len(active_days.sample_ids) == 7

    purchase = merged_cfg.get_feature("user_purchase_amount")
    assert purchase.threshold == 1500.0

    conversion = merged_cfg.get_feature("user_conversion_rate")
    assert conversion is not None
    assert conversion.threshold == 0.02

    stay = merged_cfg.get_feature("user_stay_duration")
    assert stay.threshold == 300.0

    print("✓ 阈值更新正确")
    print("✓ 样本合并正确")
    print("✓ 测试 2 通过")
    return merged_cfg


def test_processor_3_bad_skipped_processed():
    print("\n" + "=" * 60)
    print("测试 3: 数据处理 - 坏行/跳过行/已处理行分开统计")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")

    processor = DataProcessor(loader, cfg)
    result = processor.process_file("examples/feature_data.csv")

    stats = result.stats.breakdown
    print(f"总数: {stats['total']}")
    print(f"已处理: {stats['processed']}")
    print(f"坏行: {stats['bad']}")
    print(f"跳过: {stats['skipped']}")

    assert stats['total'] == 16
    assert stats['processed'] > 0
    assert stats['bad'] > 0
    assert stats['skipped'] > 0

    bad_rows = processor.get_bad_rows()
    print(f"\n坏行详情 ({len(bad_rows)}):")
    for row in bad_rows:
        print(f"  行 {row.source_line}, 对象 {row.source_object}: {row.error_message}")

    skipped_rows = processor.get_skipped_rows()
    print(f"\n跳过行详情 ({len(skipped_rows)}):")
    for row in skipped_rows:
        print(f"  行 {row.source_line}, 对象 {row.source_object}: {row.skip_reason}")
        if row.matched_feature:
            print(f"    可能匹配: {row.matched_feature}")

    processed_rows = processor.get_processed_rows()
    print(f"\n已处理行 ({len(processed_rows)}):")
    for row in processed_rows[:3]:
        print(f"  行 {row.source_line}, 对象 {row.source_object}: 特征 {row.feature_id}")

    print("✓ 测试 3 通过")
    return result


def test_processor_4_delayed_feature():
    print("\n" + "=" * 60)
    print("测试 4: 延迟特征注入测试")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")

    processor = DataProcessor(loader, cfg)
    result = processor.process_file(
        "examples/feature_data.csv",
        delayed_feature_id="user_active_days",
        delayed_row_index=3
    )

    assert result.has_delayed_feature == True
    assert result.delayed_feature_id == "user_active_days"

    injected_row = result.rows[3]
    print(f"注入行状态: {injected_row.status}")
    print(f"注入行原始数据: {injected_row.raw_data}")

    assert "_is_delayed" in injected_row.raw_data
    assert injected_row.raw_data["_delay_reason"] == "测试注入：特征迟到"

    print("✓ 延迟特征注入成功")
    print("✓ 测试 4 通过")
    return result


def test_report_5_sections():
    print("\n" + "=" * 60)
    print("测试 5: 报告生成 - 分拆展示")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    base_cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")
    incr_cfg, _ = loader.load_incremental(
        "grayscale_config_v2_incremental.yaml",
        base_cfg.config_id
    )
    merged_cfg, changes = loader.merge_configs(
        base_cfg.config_id,
        incr_cfg.config_id
    )

    processor = DataProcessor(loader, merged_cfg)
    result = processor.process_file("examples/feature_data.csv")
    result.changes = changes

    processor.add_manual_override(
        feature_id="user_active_days",
        old_value=7.0,
        new_value=12.0,
        reason="业务调整：活跃天数阈值需要提高",
        changed_by="阿岑"
    )

    report_gen = ReportGenerator(loader)

    with tempfile.TemporaryDirectory() as tmpdir:
        report = report_gen.generate_report(
            result,
            output_format="json",
            output_file=os.path.join(tmpdir, "test_report.json")
        )

        assert report.report_id is not None
        assert len(report.sample_changes.details) > 0
        assert len(report.threshold_changes.details) > 0
        assert len(report.manual_overrides.details) > 0
        assert len(report.bad_data_issues.details) > 0
        assert len(report.config_traceability.details) > 0

        print(f"报告 ID: {report.report_id}")
        print(f"样本变化: {len(report.sample_changes.details)} 处")
        for d in report.sample_changes.details:
            print(f"  - {d['feature_id']}: +{len(d['added_samples'])} -{len(d['removed_samples'])}")

        print(f"\n阈值变化: {len(report.threshold_changes.details)} 处")
        for d in report.threshold_changes.details:
            overwrite = " [覆盖]" if d['is_overwrite'] else ""
            print(f"  - {d['feature_id']}: {d['old_threshold']} → {d['new_threshold']}{overwrite}")

        print(f"\n人工改判: {len(report.manual_overrides.details)} 处")
        for d in report.manual_overrides.details:
            print(f"  - {d['feature_id']}: {d['old_value']} → {d['new_value']} ({d['changed_by']})")

        print(f"\n坏数据: {len(report.bad_data_issues.details)} 处")
        for d in report.bad_data_issues.details[:3]:
            print(f"  - 行{d['source_line']}, 对象{d['source_object']}: {d['error_message']}")

        print(f"\n配置溯源: {len(report.config_traceability.details)} 个特征")
        for d in report.config_traceability.details[:2]:
            print(f"  - {d['feature_id']}: 来源{d['current']['source_file']}:{d['current']['source_line']}")
            if d['history']:
                print(f"    历史版本: {len(d['history'])} 条")

        print("\n✓ 报告各部分正确生成")
        print("✓ 测试 5 通过")

    return report


def test_traceability_6():
    print("\n" + "=" * 60)
    print("测试 6: 特征配置溯源")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    base_cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")
    incr_cfg, _ = loader.load_incremental(
        "grayscale_config_v2_incremental.yaml",
        base_cfg.config_id
    )
    merged_cfg, _ = loader.merge_configs(
        base_cfg.config_id,
        incr_cfg.config_id
    )

    trace = loader.get_feature_traceability(
        merged_cfg.config_id,
        "user_active_days"
    )

    print(f"特征 user_active_days 溯源记录:")
    for idx, t in enumerate(trace, 1):
        print(f"  [{idx}] 版本 {t['version']} @ {t['source_file']}:{t['source_line']}")
        print(f"      阈值: {t['value']['threshold']}, 样本数: {len(t['value']['sample_ids'])}")

    assert len(trace) >= 2
    print("✓ 溯源链完整")
    print("✓ 测试 6 通过")


def test_data_reference_7():
    print("\n" + "=" * 60)
    print("测试 7: 坏数据指向原始行/具体对象")
    print("=" * 60)

    loader = ConfigLoader(base_dir="examples")
    cfg, _ = loader.load_grayscale_config("grayscale_config_v1.yaml")

    processor = DataProcessor(loader, cfg)
    result = processor.process_file("examples/feature_data.csv")

    bad_rows = [r for r in result.rows if r.status == RowStatus.BAD]

    print("坏数据溯源:")
    for row in bad_rows:
        assert row.source_line is not None
        print(f"  行 {row.source_line}:")
        print(f"    对象 ID: {row.source_object}")
        print(f"    特征: {row.feature_id}")
        print(f"    错误: {row.error_message}")
        if row.matched_feature:
            feature = cfg.get_feature(row.matched_feature)
            if feature:
                print(f"    配置来源: {feature.source_file}:{feature.source_line}")

    skipped_rows = [r for r in result.rows if r.status == RowStatus.SKIPPED]
    print(f"\n跳过数据溯源:")
    for row in skipped_rows:
        assert row.source_line is not None
        print(f"  行 {row.source_line}:")
        print(f"    对象 ID: {row.source_object}")
        print(f"    特征: {row.feature_id}")
        print(f"    原因: {row.skip_reason}")

    print("✓ 所有问题数据都能追溯到原始行和具体对象")
    print("✓ 测试 7 通过")


def run_all_tests():
    print("\n" + "=" * 60)
    print("  特征血缘任务追踪 - 完整功能测试套件")
    print("=" * 60)

    try:
        test_config_1_basic()
        test_config_2_incremental()
        test_processor_3_bad_skipped_processed()
        test_processor_4_delayed_feature()
        test_report_5_sections()
        test_traceability_6()
        test_data_reference_7()

        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        return True
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
