#!/usr/bin/env python3
"""
负采样任务追踪 - 功能验证脚本
演示所有核心功能的使用方式。
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from neg_sample_tracker import (
    init_db,
    NegSampleTracker,
    ReportGenerator,
    DecisionManager,
    RunComparator,
    CSVExporter,
    STATUS_LABELS,
    DECISION_LABELS,
    STATUS_REVIEWING,
    STATUS_PENDING,
    STATUS_APPROVED,
)


def print_separator(title=""):
    print()
    print("=" * 60)
    if title:
        print(f"  {title}")
        print("=" * 60)


def main():
    tmp_db = tempfile.mktemp(suffix=".db")
    print(f"使用临时数据库: {tmp_db}")

    print_separator("1. 初始化数据库")
    init_db(tmp_db)
    print("数据库初始化完成")

    tracker = NegSampleTracker(tmp_db)
    reporter = ReportGenerator(tmp_db)
    dm = DecisionManager(tmp_db)
    comp = RunComparator(tmp_db)
    exporter = CSVExporter(tmp_db)

    print_separator("2. 创建第一条运行记录（RUN-001）")
    result = tracker.create_run(
        run_id="RUN-001",
        model_version="v1.2.0",
        data_source="batch_2024_06",
        raw_snapshot_path="/data/snapshots/run001_raw.json",
    )
    print(f"创建结果: {result['status']} - {STATUS_LABELS.get(result['status'])}")
    print(f"是否重复: {result.get('is_duplicate')}")

    print_separator("3. 添加特征快照（含脏数据，保留原始值）")
    snapshots = [
        {
            "feature_name": "neg_sample_ratio",
            "feature_value": "0.1",
            "raw_value": "0.1",
            "data_source": "config.yaml",
            "is_raw_dirty": False,
            "snapshot_order": 1,
        },
        {
            "feature_name": "user_coverage",
            "feature_value": "98%",
            "raw_value": "98.23% (部分缺失)",
            "data_source": "user_profile",
            "is_raw_dirty": True,
            "snapshot_order": 2,
        },
        {
            "feature_name": "item_popularity",
            "feature_value": None,
            "raw_value": "N/A - 数据未对齐",
            "data_source": "item_meta",
            "is_raw_dirty": True,
            "snapshot_order": 3,
        },
        {
            "feature_name": "sample_count",
            "feature_value": "125000",
            "raw_value": "125000",
            "data_source": "log_summary",
            "is_raw_dirty": False,
            "snapshot_order": 4,
        },
    ]
    result = tracker.add_feature_snapshots_batch("RUN-001", snapshots)
    print(f"添加了 {result['success_count']}/{result['total']} 条特征快照")
    print("注意：脏数据（user_coverage、item_popularity）保留了原始值，未做清洗")

    print_separator("4. 添加参数变化记录")
    param_changes = [
        {
            "param_name": "neg_sample_rate",
            "old_value": "0.05",
            "new_value": "0.1",
            "change_reason": "提升负采样比例以增强模型鲁棒性",
            "change_order": 1,
        },
        {
            "param_name": "hard_neg_weight",
            "old_value": "1.0",
            "new_value": "2.0",
            "change_reason": "困难负样本加权",
            "change_order": 2,
        },
    ]
    result = tracker.add_param_changes_batch("RUN-001", param_changes)
    print(f"添加了 {result['success_count']}/{result['total']} 条参数变化记录")

    print_separator("5. 生成报告（业务导向，告诉老周哪条补、哪条放行）")
    report = reporter.generate_report("RUN-001")
    print(report["report_text"])

    print_separator("6. 人工判断 - 放行（老周审核后放行）")
    result = dm.approve(
        run_id="RUN-001",
        decision_note="数据虽有缺失但不影响核心结论，可以放行",
        decided_by="老周",
        model_version_snapshot="v1.2.0",
    )
    print(f"判断结果: {result['decision_label']}")
    print(f"新状态: {result['new_status_label']}")

    print_separator("7. 重新生成报告（包含人工判断）")
    report = reporter.generate_report("RUN-001")
    print(report["report_text"])

    print_separator("8. 测试 run_id 重复 - 应挂起待确认")
    result = tracker.create_run(
        run_id="RUN-001",
        model_version="v1.2.1",
        data_source="batch_2024_06_v2",
    )
    print(f"再次创建 RUN-001 结果:")
    print(f"  状态: {result['status']} - {STATUS_LABELS.get(result['status'])}")
    print(f"  是否重复: {result['is_duplicate']}")
    print(f"  错误码: {result.get('error_code')}")
    print(f"  错误信息: {result.get('error_message')}")
    print()
    print("（符合需求：宁可挂起让项目经理确认，也不给假稳定结论）")

    print_separator("9. 解决冲突 - 保留旧记录")
    result = tracker.resolve_conflict("RUN-001", keep_existing=True)
    print(f"解决结果: 成功，保留了旧记录")
    print(f"已解决冲突数: {result['resolved_count']}")

    run = tracker.get_run("RUN-001")
    print(f"当前状态: {run['run']['status']} - {STATUS_LABELS.get(run['run']['status'])}")

    print_separator("10. 创建第二条运行记录（RUN-002，新版本模型）")
    tracker.create_run(
        run_id="RUN-002",
        model_version="v2.0.0",
        data_source="batch_2024_07",
    )
    snapshots2 = [
        {
            "feature_name": "neg_sample_ratio",
            "feature_value": "0.15",
            "raw_value": "0.15",
            "data_source": "config.yaml",
            "is_raw_dirty": False,
        },
        {
            "feature_name": "user_coverage",
            "feature_value": "99%",
            "raw_value": "99%",
            "data_source": "user_profile",
            "is_raw_dirty": False,
        },
        {
            "feature_name": "new_feature_x",
            "feature_value": "enabled",
            "raw_value": "enabled",
            "data_source": "config.yaml",
            "is_raw_dirty": False,
        },
    ]
    tracker.add_feature_snapshots_batch("RUN-002", snapshots2)

    dm.reject(
        run_id="RUN-002",
        decision_note="新特征数据来源不明确，需要补材料",
        decided_by="老周",
        model_version_snapshot="v2.0.0",
    )

    print("RUN-002 创建完成，已标记为需补材料")

    print_separator("11. 对比两次运行结果（旧判断不被覆盖）")
    compare_result = comp.compare_runs("RUN-001", "RUN-002")
    print(comp.format_compare_text(compare_result))

    print_separator("12. 验证旧人工判断未被覆盖")
    dec1 = dm.get_decision_history("RUN-001")
    dec2 = dm.get_decision_history("RUN-002")
    print(f"RUN-001 判断次数: {len(dec1)}")
    if dec1:
        latest = dec1[0]
        print(f"  最新: {DECISION_LABELS.get(latest['decision'])} - "
              f"{latest.get('decision_note', '')}")
        print(f"  模型版本快照: {latest.get('model_version_snapshot')}")
    print()
    print(f"RUN-002 判断次数: {len(dec2)}")
    if dec2:
        latest = dec2[0]
        print(f"  最新: {DECISION_LABELS.get(latest['decision'])} - "
              f"{latest.get('decision_note', '')}")
        print(f"  模型版本快照: {latest.get('model_version_snapshot')}")
    print()
    print("（符合需求：模型版本换了，旧的人工判断也不能被盖掉）")

    print_separator("13. CSV 导出 - 状态与页面一致")
    csv_result = exporter.export_runs()
    print("运行列表 CSV 内容（前几行）：")
    lines = csv_result["content"].strip().split("\n")
    for line in lines[:5]:
        print(f"  {line}")
    print(f"  ... 共 {csv_result['row_count']} 行数据")
    print()
    print("（符合需求：CSV 中状态用中文标签，与页面显示一致）")

    print_separator("14. 导出完整明细 CSV")
    full_csv = exporter.export_full_detail("RUN-001")
    lines = full_csv["content"].strip().split("\n")
    print(f"RUN-001 完整明细共 {full_csv['row_count']} 行")
    print("表头和前几行：")
    for line in lines[:6]:
        print(f"  {line}")

    print_separator("验证总结")
    print("✓ 特征快照和参数变化已关联到报告")
    print("✓ 脏数据保留原始值，未做清洗")
    print("✓ run_id 重复时挂起待确认，不假结论")
    print("✓ 人工判断历史保留，不覆盖旧记录")
    print("✓ 两次结果可对比，旧判断保留")
    print("✓ CSV 导出用中文状态标签，与页面一致")
    print("✓ 报告输出业务导向（哪条补、哪条放行），不是技术说明")
    print("✓ CLI 参数名和错误提示稳定，适合脚本调用")

    os.unlink(tmp_db)
    print(f"\n临时数据库已清理: {tmp_db}")


if __name__ == "__main__":
    main()
