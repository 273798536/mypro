"""按社区公示前真实节奏的演示脚本

三步走：
1. 导入旧材料 → 创建第一个快照 → 生成报告
2. 补一条晚到附件 + 放回旧误判样本 → 创建第二个快照
3. 人工修正 → 生成对比报告，看变化是否说清

同时演示：
- 原始数据保留
- 小样本类别警告
- 灰度比例异常提示
- 人工修正历史
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcs.core import ModelCompressSnapshot


def print_divider(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data_demo")
    mcs = ModelCompressSnapshot(data_dir)

    print_divider("【第一步】导入旧材料，创建初始快照")

    # 导入旧训练日志
    old_log = os.path.join(os.path.dirname(__file__), "旧训练日志_v1.2.0-compress.jsonl")
    samples = mcs.import_file(old_log, model_version="v1.2.0-compress",
                             source_name="旧训练日志_v1.2.0-compress.jsonl")
    print(f"✓ 导入旧训练日志，共 {len(samples)} 条样本")

    # 手动加一条灰度比例写错的（用百分数），演示检查功能
    bad_sample = mcs.import_single_sample(
        {
            "input": "这条灰度比例写错了写成百分数了",
            "predicted": "positive",
            "true": "positive",
            "confidence": 0.70,
            "gray_ratio": 80,  # 写错了，应该是 0.8
            "note": "灰度比例疑似写成百分数",
        },
        source_name="灰度测试样本_人工录入.txt",
        model_version="v1.2.0-compress",
    )
    print(f"✓ 加入一条灰度比例写错的样本（80 应为 0.8），用于演示检查功能")

    # 再加一条小样本类别，演示"小样本被平均数盖住"问题
    rare_sample = mcs.import_single_sample(
        {
            "input": "这是一个投诉类样本",
            "predicted": "complaint",
            "true": "complaint",
            "confidence": 0.65,
            "gray_ratio": 0.3,
            "note": "小样本类别：投诉类",
        },
        source_name="稀有类别样本.csv",
        model_version="v1.2.0-compress",
    )
    print(f"✓ 加入一条小样本类别（complaint），演示被平均数盖住的问题")

    # 创建第一个快照
    snap1 = mcs.create_snapshot(
        name="初始版本快照_导入旧材料",
        model_version="v1.2.0-compress",
        description="社区公示前：已导入旧训练日志",
        created_by="MLOps值班小林",
    )
    print(f"✓ 创建快照: {snap1.snapshot_id} ({snap1.snapshot_name})")
    print(f"  总样本: {snap1.summary['total_samples']}, "
          f"误判: {snap1.summary['misjudged_count']}, "
          f"小类别数: {len(snap1.summary['small_categories'])}")

    # 灰度比例检查
    issues = mcs.check_gray_ratio(snap1.snapshot_id)
    print(f"✓ 灰度比例检查发现 {len(issues)} 个问题")
    for issue in issues[:2]:
        print(f"  - [{issue.issue_type}] {issue.detail[:60]}...")

    # 生成第一份报告
    report1 = mcs.generate_report(snap1.snapshot_id,
                                  title="模型压缩版本快照 - 初始版本（导入旧材料）")
    print(f"✓ 生成完整报告: {report1.file_path}")

    print_divider("【第二步】补晚到附件 + 放回旧误判样本")

    # 补一条晚到附件
    late_file = os.path.join(os.path.dirname(__file__), "晚到补充样本_20260619.jsonl")
    late_samples = mcs.import_file(late_file, model_version="v1.2.0-compress",
                                  source_name="晚到补充样本_20260619.jsonl")
    # 给这些样本打 note 标记为晚到
    # (import_file 已经解析了 note 字段)
    print(f"✓ 补录晚到附件 {len(late_samples)} 条样本")

    # 放回一条旧模型误判样本，看看新结果能不能解释为什么改判
    # 初始 true_label 暂用模型预测值（模拟"未人工复核"状态）
    old_misjudged = mcs.import_single_sample(
        {
            "input": "这个产品用起来还不错但包装有点破损",
            "predicted": "negative",  # 新模型预测为负面
            "true": "negative",       # 暂用预测值，待人工复核
            "confidence": 0.72,
            "gray_ratio": 0.3,
            "is_misjudged": False,
            "note": "旧误判样本_放回验证_待人工复核",
        },
        source_name="旧误判样本_历史归档_202605.json",
        model_version="v1.2.0-compress",
    )
    print(f"✓ 放回旧误判样本: {old_misjudged.sample_id} "
          f"(预测={old_misjudged.predicted_label}, 当前标注={old_misjudged.true_label})")

    # 创建第二个快照
    all_samples = mcs.list_samples()
    sample_ids = [s.sample_id for s in all_samples]
    snap2 = mcs.create_snapshot(
        name="版本快照_补录晚到数据",
        model_version="v1.2.0-compress",
        description="社区公示前：补录晚到附件 + 放回旧误判样本",
        created_by="MLOps值班小林",
        parent_snapshot_id=snap1.snapshot_id,
    )
    print(f"✓ 创建快照: {snap2.snapshot_id} ({snap2.snapshot_name})")
    print(f"  总样本: {snap2.summary['total_samples']}")

    # 灰度比例检查（第二个快照）
    issues2 = mcs.check_gray_ratio(snap2.snapshot_id)
    print(f"✓ 灰度比例检查（快照2）发现 {len(issues2)} 个问题")

    print_divider("【第三步】人工修正 + 生成对比报告")

    # 人工修正那条旧误判样本
    correction = mcs.correct_sample(
        sample_id=old_misjudged.sample_id,
        new_label="neutral",  # 修正为中性（因为实际是中性）
        operator="算法值班人",
        reason="旧模型误判为负面，人工复核确认应为中性，已更新标签",
        note="人工确认：该样本应判定为中性，旧模型预测错误",
    )
    print(f"✓ 人工修正样本: {correction.correction_id}")
    print(f"  {correction.before_label} → {correction.after_label}")
    print(f"  操作人: {correction.operator}")
    print(f"  理由: {correction.reason}")

    # 再创建一个修正后的快照（第三个快照）
    snap3 = mcs.create_snapshot(
        name="最终版本快照_人工修正后",
        model_version="v1.2.0-compress",
        description="社区公示前最终版：含晚到数据+人工修正",
        created_by="算法值班人",
        parent_snapshot_id=snap2.snapshot_id,
    )
    mcs.add_samples_to_snapshot(snap3.snapshot_id,
                                [s.sample_id for s in all_samples])
    # 重新加载（因为上面add没更新summary）
    snap3 = mcs.get_snapshot(snap3.snapshot_id)
    print(f"✓ 创建最终快照: {snap3.snapshot_id} ({snap3.snapshot_name})")

    # 生成对比报告（最终 vs 初始）
    diff_report = mcs.generate_diff_report(
        snap3.snapshot_id, snap1.snapshot_id,
        title="模型压缩版本快照 - 变化对比报告（社区公示前复盘）"
    )
    print(f"✓ 生成对比报告: {diff_report.file_path}")

    # 再生成一份最终快照的完整报告
    final_report = mcs.generate_report(
        snap3.snapshot_id,
        title="模型压缩版本快照 - 最终版本（社区公示前）"
    )
    print(f"✓ 生成最终完整报告: {final_report.file_path}")

    print_divider("【总结】演示完成")
    print("所有产物位于 data_demo/ 目录：")
    print(f"  samples/raw/        - 原始文件（原样保留，未清洗）")
    print(f"  samples/parsed/     - 解析后的样本")
    print(f"  snapshots/          - 版本快照（共 3 个）")
    print(f"  corrections/        - 人工修正记录")
    print(f"  gray_issues/        - 灰度比例问题")
    print(f"  reports/            - Markdown 报告（共 3 份）")
    print()
    print("建议按以下顺序阅读报告：")
    print(f"  1. {os.path.basename(report1.file_path)}  - 初始版本（导入旧材料后）")
    print(f"  2. {os.path.basename(diff_report.file_path)}  - 变化对比（社区公示前复盘）")
    print(f"  3. {os.path.basename(final_report.file_path)}  - 最终完整版本")


if __name__ == "__main__":
    main()
