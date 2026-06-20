import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_gatekeeper import (
    ABGatekeeperPipeline,
    ModelVersion,
    ManualAction,
)


def main():
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("=" * 80)
    print("AB实验上线守门系统 - 完整流程验证")
    print("=" * 80)
    print()

    model_version = ModelVersion(
        version_id="rec_ctr_v3.5.0_20260619",
        model_name="推荐排序与搜索多任务联合模型",
        training_time="2026-06-19 11:00:00",
        hyperparams={
            "learning_rate": 0.0003,
            "batch_size": 256,
            "num_epochs": 30,
            "optimizer": "AdamW",
            "dropout": 0.3,
            "attention_heads": 16,
            "loss_function": "focal_loss",
            "lr_scheduler": "cosine_annealing",
        },
        parent_version="rec_ctr_v3.4.2_20260610",
        changelog="1) 新增用户长短期兴趣融合特征 2) 注意力头数从8扩展至16 3) 修复负采样bug 4) 引入Focal Loss处理样本不平衡",
    )

    history_dir = os.path.join(PROJECT_ROOT, "audit_history")
    os.makedirs(history_dir, exist_ok=True)

    pipeline = ABGatekeeperPipeline(
        model_version=model_version,
        history_dir=history_dir,
    )

    print("[步骤 1/6] 数据导入与多来源识别...")
    json_path = os.path.join(PROJECT_ROOT, "test_data", "test_samples.json")
    pipeline.ingest_json(json_path)

    src_dist = pipeline.importer.get_source_distribution()
    print(f"  已导入样本总数: {len(pipeline.samples)}")
    print(f"  来源分布: {json.dumps(src_dist, ensure_ascii=False, indent=4)}")
    print()

    print("[步骤 2/6] 执行算法判定（阈值检查/污染检测/误判分析/多来源交叉影响）...")
    pipeline.run_algorithm_decisions()
    print(f"  生成算法决策数: {len(pipeline.decisions)}")
    print(f"  验证集污染报告: {json.dumps({k: v for k, v in pipeline._contamination_report.items() if k != 'contamination_details' and k != 'contaminated_sample_ids'}, ensure_ascii=False, indent=4)}")
    print(f"  误判回检报告摘要: {pipeline._misclassified_report.get('summary', '无')}")
    print()

    print("[步骤 3/6] 首次生成结果（人工确认前）...")
    result_before = pipeline.build_result()
    print(f"  首次结论: {'✅通过' if result_before.overall_pass else '🟡待人工确认' if result_before.manual_confirmation_required else '❌不通过'}")
    print(f"  阻断原因: {result_before.blocking_reasons}")
    print(f"  告警原因: {result_before.warning_reasons}")
    print(f"  待人工确认项数: {len(result_before.manual_confirmation_details)}")
    print()

    print("[步骤 4/6] 模拟人工确认流程（模拟算法小许的操作）...")
    queue = pipeline.get_manual_confirmation_queue()
    print(f"  待处理队列: {len(queue)} 项")
    for idx, item in enumerate(queue, 1):
        print(f"    [{idx}] 样本{item['sample_id']} (任务{item['task_id']}, 来源{item['source']})")
        for r in item["reasons"]:
            print(f"        - 原因: {r}")
    print()

    operator = "算法_小许"
    print(f"  操作人: {operator}")
    print()

    sample_actions = [
        {
            "sample_id": "val_contam_dup_011",
            "action": ManualAction.REJECT,
            "comment": "确认与训练样本task_a_train_001完全重复，数据划分bug导致。该验证样本作废，不予采纳。",
            "override_passed": False,
            "override_reason_detail": "数据泄露，验证集混入训练样本，必须剔除。",
            "scheduling_note": "本月数据划分脚本需排查，排班同学7月前修复。",
        },
        {
            "sample_id": "val_contam_keyword_012",
            "action": ManualAction.REVISE_DATA,
            "comment": "人工复核：该验证样本实际为干净样本，内容中的训练关键词是评估报告中引用训练配置导致，非真实污染。修正其污染标记。",
            "override_passed": True,
            "override_reason_detail": "关键词误报，已人工确认样本独立。污染标记解除。",
            "scheduling_note": "建议优化污染检测器的关键词白名单机制。",
        },
        {
            "sample_id": "val_contam_leak_013",
            "action": ManualAction.REJECT,
            "comment": "确认严重标签泄露：样本特征中直接包含了label编码，属于特征构建bug。该样本必须剔除。",
            "override_passed": False,
            "override_reason_detail": "CRITICAL级别标签泄露，不可用于上线评估。",
            "scheduling_note": "特征工程流程紧急增加label-leak单元测试。",
        },
        {
            "sample_id": "task_b_failed_008",
            "action": ManualAction.APPROVE,
            "comment": "结合口头备注(task_b_verbal_009)，第10epoch的loss尖峰是OOM重跑数据未对齐，后续epoch已收敛正常。该失败样本不影响最终结论，人工通过。",
            "override_passed": True,
            "override_reason_detail": "已知训练抖动，不影响模型最终质量。口头备注佐证。",
            "scheduling_note": "",
        },
        {
            "sample_id": "misclassified_return_016",
            "action": ManualAction.FLAG_FOR_REVIEW,
            "comment": "人工复核样本user_5566_item_223344：该样本属于边界case，新旧模型均判断错误，标签本身存在歧义。标记待下轮重新标注后再评估。",
            "override_passed": None,
            "override_reason_detail": "标签歧义，需数据侧重新标注。",
            "scheduling_note": "排班同学提醒标注组7月初复核该样本及周边100条。",
        },
        {
            "sample_id": "val_clean_010",
            "action": ManualAction.APPROVE,
            "comment": "验证集样本干净，指标稳定，无问题。人工确认通过。",
            "override_passed": True,
            "override_reason_detail": "复核通过。",
            "scheduling_note": "",
        },
        {
            "sample_id": "val_clean_017",
            "action": ManualAction.APPROVE,
            "comment": "验证集样本干净，指标正常。人工确认通过。",
            "override_passed": True,
            "override_reason_detail": "复核通过。",
            "scheduling_note": "",
        },
    ]

    for sa in sample_actions:
        corr = pipeline.apply_manual_correction(
            sample_id=sa["sample_id"],
            action=sa["action"],
            operator=operator,
            comment=sa["comment"],
            override_passed=sa["override_passed"],
            override_reason_detail=sa["override_reason_detail"],
            scheduling_note=sa["scheduling_note"],
        )
        if corr:
            print(f"  ✔ 样本{sa['sample_id']}: {sa['action'].value} -> 状态 {corr.before_status.value} → {corr.after_status.value}")

    print()
    print(f"  共执行 {len(pipeline.confirmation_manager.corrections)} 次人工确认")
    stats = pipeline.confirmation_manager.get_correction_statistics()
    print(f"  人工操作分布: {json.dumps(stats, ensure_ascii=False, indent=4)}")
    print()

    print("[步骤 5/6] 生成最终Markdown沟通报告...")
    report_dir = os.path.join(PROJECT_ROOT, "output")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, "ab_gatekeeper_report.md")
    result = pipeline.build_result()
    pipeline.generate_report(report_path)

    print(f"  最终结论: {'✅通过' if result.overall_pass else '🟡待人工确认' if result.manual_confirmation_required else '❌不通过'}")
    print(f"  阻断原因: {result.blocking_reasons}")
    print(f"  告警原因: {result.warning_reasons}")
    print(f"  样本状态分布: {json.dumps(result.sample_summary, ensure_ascii=False, indent=4)}")
    print(f"  报告已生成: {report_path}")
    print()

    scheduling_review = pipeline.confirmation_manager.get_scheduling_review()
    print("[步骤 6/6] 月底排班复盘数据:")
    print(f"  月份: {scheduling_review['month']}")
    print(f"  人工确认次数: {scheduling_review['total_corrections_in_month']}")
    print(f"  审计事件数: {scheduling_review['total_audit_events_in_month']}")
    print()
    print("  【月底封账复盘话术】")
    print(scheduling_review["replay_for_scheduling"])
    print()

    print("=" * 80)
    print("验证完成！")
    print(f"- 报告路径: {report_path}")
    print(f"- 审计历史目录: {history_dir}")
    print("=" * 80)

    with open(report_path, "r", encoding="utf-8") as f:
        report_content = f.read()
    print()
    print("=" * 80)
    print("【Markdown报告内容预览（前200行）】")
    print("=" * 80)
    lines = report_content.split("\n")
    for line in lines[:200]:
        print(line)


if __name__ == "__main__":
    main()
