"""
示例脚本：模拟平台算法阿岑处理"漂移监控任务追踪"的完整值班交接流程

场景：
1. 阿岑创建漂移监控任务
2. 评测结果返回，部分样本失败
3. 阿岑发现灰度比例写错，单独拎出异常记录
4. 阿岑人工改判部分样本（保留原判断）
5. 标记拉偏结论的样本
6. 一条晚到附件到了，把它和最终结论连起来
7. 给出结论并关闭任务
8. 下一班同事通过 timeline 追溯原始说法和处理结果
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
    TaskCreate, AttachmentCreate, SampleCreate,
    GrayscaleAbnormalRecordCreate, JudgmentOverrideCreate,
    TaskStatus, JudgmentResult,
)
from db import init_db
from service import DriftTrackerService


def print_sep(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def run_handoff_scenario() -> None:
    init_db()
    service = DriftTrackerService()

    print_sep("步骤 1: 阿岑创建漂移监控任务")
    task = service.create_task(TaskCreate(
        task_name="6月模型漂移监控-第21批",
        model_version="llm-drift-v2.3.1",
        eval_dataset="drift_benchmark_202606",
        parameters={
            "batch_size": 32,
            "temperature": 0.7,
            "grayscale_ratio": 0.05,
            "max_samples": 500,
        },
        owner="平台算法阿岑",
        description="6月下旬常规漂移监控",
    ))
    print(f"任务ID: {task.task_id}")
    print(f"任务名称: {task.task_name}")
    task_id = task.task_id

    print_sep("步骤 2: 开始评测")
    service.start_evaluation(task_id, operator="平台算法阿岑")

    print_sep("步骤 3: 添加评测样本（模拟评测结果返回）")
    samples_data = [
        SampleCreate(task_id=task_id, sample_id="s_001", expected_output="正常响应", actual_output="正常响应"),
        SampleCreate(task_id=task_id, sample_id="s_002", expected_output="正常响应", actual_output="异常响应-超时"),
        SampleCreate(task_id=task_id, sample_id="s_003", expected_output="正常响应", actual_output="正常响应"),
        SampleCreate(task_id=task_id, sample_id="s_004", expected_output="正常响应", actual_output="异常响应-胡编乱造"),
        SampleCreate(task_id=task_id, sample_id="s_005", expected_output="正常响应", actual_output="正常响应"),
    ]
    samples = service.add_samples_bulk(task_id, samples_data)
    print(f"已添加 {len(samples)} 条样本")

    print_sep("步骤 4: 自动判定样本")
    service.judge_sample(task_id, "s_001", JudgmentResult.PASS, judged_by="auto_eval")
    service.judge_sample(task_id, "s_002", JudgmentResult.FAIL, judged_by="auto_eval")
    service.judge_sample(task_id, "s_003", JudgmentResult.PASS, judged_by="auto_eval")
    service.judge_sample(task_id, "s_004", JudgmentResult.FAIL, judged_by="auto_eval")
    service.judge_sample(task_id, "s_005", JudgmentResult.PASS, judged_by="auto_eval")
    print("自动判定完成: 3 pass, 2 fail")

    print_sep("步骤 5: 阿岑发现灰度比例写错了，单独拎出异常记录")
    gray_record = service.mark_grayscale_abnormal(GrayscaleAbnormalRecordCreate(
        task_id=task_id,
        sample_id="s_002",
        expected_grayscale_ratio=0.05,
        actual_grayscale_ratio=0.42,
        reason="配置时误把 5% 写成了 42%，样本 s_002 和 s_004 实际是灰度流量，不该计入正常结果",
        detected_by="平台算法阿岑",
    ))
    print(f"灰度异常记录ID: {gray_record.record_id}")
    print(f"期望比例: {gray_record.expected_grayscale_ratio:.2%}")
    print(f"实际比例: {gray_record.actual_grayscale_ratio:.2%}")
    print(f"原因: {gray_record.reason}")

    print_sep("步骤 6: 阿岑人工改判（保留原判断）")
    override1 = service.override_judgment(JudgmentOverrideCreate(
        task_id=task_id,
        sample_id="s_002",
        original_judgment=JudgmentResult.FAIL,
        new_judgment=JudgmentResult.GRAYSCALE_ABNORMAL,
        reason="样本属于灰度异常流量，从失败样本中排除",
        operator="平台算法阿岑",
        original_source="auto_eval",
    ))
    override2 = service.override_judgment(JudgmentOverrideCreate(
        task_id=task_id,
        sample_id="s_004",
        original_judgment=JudgmentResult.FAIL,
        new_judgment=JudgmentResult.NEEDS_REVIEW,
        reason="虽然在灰度里，但输出确实异常，留待下一班复核",
        operator="平台算法阿岑",
        original_source="auto_eval",
    ))
    print(f"改判1: {override1.original_judgment.value} -> {override1.new_judgment.value} (s_002)")
    print(f"改判2: {override2.original_judgment.value} -> {override2.new_judgment.value} (s_004)")

    print_sep("步骤 7: 阿岑把 s_004 标记为拉偏结论的样本")
    service.judge_sample(
        task_id, "s_004", JudgmentResult.NEEDS_REVIEW,
        is_outlier=True,
        outlier_reason="高概率是真正漂移的样本，把整体结论拉偏，需重点关注",
        judged_by="平台算法阿岑",
    )
    print("样本 s_004 已标记为拉偏样本")

    print_sep("步骤 8: 添加晚到附件并关联到结论")
    late_attachment = service.add_attachment(AttachmentCreate(
        task_id=task_id,
        attachment_type="eval_log_detail",
        source="评测平台延迟推送",
        content_ref="oss://drift-logs/20260621/batch21_eval_full.log",
        is_late=True,
        metadata={"size_mb": 128, "contains": "全量评测详细日志"},
    ), operator="平台算法阿岑")
    print(f"晚到附件: {late_attachment.content_ref}")
    service.link_late_attachment_to_conclusion(task_id, late_attachment.attachment_id,
                                               operator="平台算法阿岑")
    print("晚到附件已关联到任务结论")

    print_sep("步骤 9: 添加交接备注，给出结论")
    service.add_note(
        task_id,
        "交接说明：灰度配置写错了，s_002已排除，s_004疑似真漂移请下一班复核，晚到日志已关联结论",
        operator="平台算法阿岑",
    )
    final_task = service.conclude_task(
        task_id, JudgmentResult.NEEDS_REVIEW,
        operator="平台算法阿岑",
        note="排除灰度异常后有1条样本疑似真漂移，需进一步确认",
    )
    print(f"最终结论: {final_task.final_conclusion.value if final_task.final_conclusion else 'N/A'}")

    print_sep("步骤 10: 下一班同事追溯原始说法和处理结果")
    print("--- 追溯 s_002 的原始评测结果与改判历史 ---")
    orig = service.get_original_eval_result(task_id, "s_002")
    print(f"原始事件数: {len(orig['original_events'])}")
    for e in orig["original_events"]:
        print(f"  [{e['event_type']}] {e['message']}")
    print(f"改判记录数: {len(orig['judgment_overrides'])}")
    for o in orig["judgment_overrides"]:
        print(f"  [{o['operator']}] {o['original_judgment']} -> {o['new_judgment']} | {o['reason']}")

    print("\n--- 获取任务完整时间线 ---")
    tl = service.get_task_timeline(task_id)
    if tl:
        print(f"事件总数: {len(tl.events)}")
        for e in tl.events:
            print(f"  [{e.timestamp.strftime('%H:%M:%S')}] {e.event_type.value}: {e.message}")

    print("\n--- 获取结论细节（含拉偏样本） ---")
    detail = service.get_conclusion_detail(task_id)
    if detail:
        print(f"总样本: {detail.total_samples} | 通过: {detail.pass_count} | "
              f"失败: {detail.fail_count} | 待复核: {detail.needs_review_count} | "
              f"灰度异常: {detail.grayscale_abnormal_count}")
        print(f"拉偏样本数: {len(detail.outlier_samples)}")
        for os_ in detail.outlier_samples:
            print(f"  - 样本 {os_.sample.sample_id}: {os_.sample.outlier_reason}")
        if detail.final_attachment:
            print(f"最终关联附件: {detail.final_attachment.content_ref}")
        print(f"人工改判总数: {len(detail.judgment_overrides)}")

    print_sep("完成：模拟交接流程结束")
    print("关键特性验证：")
    print("  ✓ 任务参数完整记录")
    print("  ✓ 失败原因按样本追踪")
    print("  ✓ 灰度异常单独拎出，不揉进正常结果")
    print("  ✓ 人工改判保留历史，下一班能看到原始判断")
    print("  ✓ 拉偏样本可单独列出（回答评审追问）")
    print("  ✓ 晚到附件与最终结论关联")
    print("  ✓ 完整时间线可追溯处理过程")


if __name__ == "__main__":
    run_handoff_scenario()
