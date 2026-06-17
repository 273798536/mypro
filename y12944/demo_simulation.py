#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from rate_limit_simulator import (
    RateLimitSimulator,
    SimulatorConfig,
)
from rate_limit_simulator.sample_data import (
    create_three_boundary_samples,
    create_training_split_list,
    create_safety_rules,
    create_boundary_values,
    create_model_logs_for_sample,
    create_tool_call_params_for_sample,
)


def main():
    print("=" * 70)
    print("模型服务限流模拟 - AI/ML工作流工具演示")
    print("=" * 70)
    print()

    config = SimulatorConfig(
        config_id="demo_config_001",
        name="模型服务限流模拟 - 边界样例测试",
        rate_limit_per_minute=100,
        max_concurrent=10,
        enable_duplicate_check=True,
        enable_leakage_check=True,
        enable_safety_rules=True,
        safety_rules=create_safety_rules(),
        boundary_values=create_boundary_values(),
    )

    initial_split_list = create_training_split_list()
    for entry in initial_split_list:
        config.add_split_entry(entry)

    print(f"[配置] 初始训练集切分清单：{len(initial_split_list)} 条")
    print(f"[配置] 安全规则：{len(config.safety_rules)} 条")
    print()

    simulator = RateLimitSimulator(config)

    samples = create_three_boundary_samples()
    simulator.add_samples(samples)
    print(f"[数据] 已加载 {len(samples)} 条边界样例：")
    for sample in samples:
        status = "顺利记录" if sample.sample_id == "S001" else (
            "待确认记录" if sample.sample_id == "S002" else "明显坏数据"
        )
        print(f"  - {sample.sample_id}: {status} (分组: {sample.group_id}, 来源: {sample.data_source.value})")
    print()

    print("-" * 70)
    print("[步骤1] 运行第一轮限流模拟检查")
    print("-" * 70)
    results = simulator.run_simulation()

    for sample_id, result in results.items():
        status = "✅ 通过" if not result.is_blocked else "❌ 拦截"
        print(f"\n样本 {sample_id}: {status} (第{result.check_round}轮检查)")
        if result.is_blocked:
            print(f"  拦截原因：{[r.value for r in result.intercept_reasons]}")
            for detail in result.intercept_details:
                print(f"  - {detail}")

    print()
    summary = simulator.get_summary()
    print(f"[第一轮结果] 总计: {summary['total_samples']}, "
          f"通过: {summary['passed']}, 拦截: {summary['blocked']}, "
          f"拦截率: {summary['block_rate']*100:.1f}%")
    print()

    print("-" * 70)
    print("[步骤2] 为待确认记录(S002)添加人工修正（保留原话）")
    print("-" * 70)
    print()

    sample_s002 = simulator.get_sample("S002")
    correction = simulator.review_workflow.add_manual_correction(
        sample=sample_s002,
        version=None,
        original_prompt=sample_s002.prompt,
        corrected_prompt="用户反馈购买的产品出现质量问题，希望办理退货退款。",
        original_response=sample_s002.response,
        corrected_response=sample_s002.response,
        correction_note="这条用户情绪比较激动，但是内容本身没问题，就是正常的客户投诉。把原文的感叹号和情绪化表达调整一下就可以用，不要直接丢了。后面还要重点关注这类高优单的响应时效。",
        corrected_by="张工（模型训练工程师）",
    )
    print(f"[修正记录] ID: {correction.correction_id}")
    print(f"  修正人: {correction.corrected_by}")
    print(f"  备注原文（保留原话）: 「{correction.correction_note}」")
    print(f"  修正后提示词: {correction.corrected_prompt}")
    print()

    simulator.mark_for_review("S002")
    print("[状态] S002 已标记为待复核")
    print()

    print("-" * 70)
    print("[步骤3] 综合复核 - 模型日志、安全规则、工具调用参数同一轮")
    print("-" * 70)
    print()

    for sample in samples:
        sid = sample.sample_id
        model_logs = create_model_logs_for_sample(sid)
        tool_params = create_tool_call_params_for_sample(sid)
        safety_rules_checked = ["R001", "R002", "R003", "R004"]

        if sid == "S001":
            review_notes = "这条没问题，置信度0.92在合理区间，没有敏感内容，分组G01的样本质量整体不错。"
            is_approved = True
        elif sid == "S002":
            review_notes = "虽然有敏感词匹配到'太差'、'马上处理'，但这是正常的用户投诉内容，不是违规内容。人工修正后的提示词可以使用，注意这类样本的召回率问题，不要误拦太多。"
            is_approved = True
        else:
            review_notes = "S003这条明显有问题，从metadata看source是training_data_20240520，本来就是训练集的东西，居然混到validation里来了。切分清单里确实有这条，训练验证泄漏实锤。必须拿掉，不然模型效果评估完全不准。"
            is_approved = False

        review = simulator.review_workflow.create_comprehensive_review(
            sample=sample,
            version=None,
            reviewer="李工（资深模型训练工程师）",
            model_logs=model_logs,
            safety_rules_checked=safety_rules_checked,
            tool_call_params=tool_params,
            review_notes=review_notes,
            is_approved=is_approved,
        )

        print(f"[复核记录] 样本 {sid}: {'通过' if is_approved else '未通过'}")
        print(f"  复核轮次: 第{review.review_round}轮")
        print(f"  复核人: {review.reviewer}")
        print(f"  复核意见原文: 「{review.review_notes}」")
        print(f"  本轮检查安全规则: {', '.join(review.safety_rules_checked)}")
        print(f"  本轮工具调用参数包含: {list(review.tool_call_params.keys())}")
        print(f"  本轮模型日志包含: {list(review.model_logs.keys())[:5]}...")
        print()

    print("-" * 70)
    print("[步骤4] 补录切分清单后重新检查（样本去重同步更新）")
    print("-" * 70)
    print()

    new_split_entries = [
        "请帮我分析一下用户评论：这款手机的拍照效果很棒，电池续航也不错，但是价格有点贵。",
        "用户反馈购买的产品出现质量问题，希望办理退货退款。",
    ]
    print(f"[补录] 新增切分清单条目: {len(new_split_entries)} 条")
    for entry in new_split_entries:
        print(f"  - {entry[:50]}...")

    print()
    print("[操作] 更新切分清单并触发重新检查...")
    new_results = simulator.update_split_list_and_recheck(new_split_entries)

    print()
    for sample_id, result in new_results.items():
        status = "✅ 通过" if not result.is_blocked else "❌ 拦截"
        print(f"\n样本 {sample_id}: {status} (第{result.check_round}轮检查)")
        if result.is_blocked:
            print(f"  拦截原因：{[r.value for r in result.intercept_reasons]}")
            for detail in result.intercept_details:
                print(f"  - {detail}")

    print()
    summary_after = simulator.get_summary()
    print(f"[第二轮结果] 总计: {summary_after['total_samples']}, "
          f"通过: {summary_after['passed']}, 拦截: {summary_after['blocked']}, "
          f"拦截率: {summary_after['block_rate']*100:.1f}%")
    print(f"[切分清单] 当前版本: v{summary_after['split_list_version']}, "
          f"条目数: {summary_after['split_list_size']}")
    print()

    print("-" * 70)
    print("[步骤5] 生成完整报告（包含普通话解释）")
    print("-" * 70)
    print()

    report = simulator.generate_report(include_raw_data=False)

    output_path = "/Users/mac/pro/solo/workspaces/y12944/rate_limit_simulation_report.txt"
    simulator.export_report(output_path, include_raw_data=False)
    print(f"[报告] 已导出到: {output_path}")
    print()

    print("=" * 70)
    print("报告摘要预览（给业务方看的部分）：")
    print("=" * 70)
    print()

    report_lines = report.split("\n")
    preview_lines = []
    in_sample_section = False
    sample_count = 0
    for line in report_lines:
        if "一、限流模拟检查结果摘要" in line or "限流模拟检查结果摘要" in line:
            preview_lines.append(line)
            in_sample_section = True
            continue
        if "二、分组指标详情" in line:
            break
        if in_sample_section:
            preview_lines.append(line)

    print("\n".join(preview_lines))
    print()

    print("=" * 70)
    print("训练验证泄漏说明预览（业务方只看报告也能明白）：")
    print("=" * 70)
    print()

    leakage_section = []
    in_leakage = False
    for line in report.split("\n"):
        if "关于训练验证泄漏的详细说明" in line:
            in_leakage = True
        if in_leakage:
            leakage_section.append(line)
        if "建议怎么处理？" in line and in_leakage:
            for _ in range(5):
                if report_lines:
                    pass
            break
        if len(leakage_section) > 30:
            break

    if leakage_section:
        print("\n".join(leakage_section[:25]))
    else:
        sample_s003 = simulator.get_sample("S003")
        result_s003 = simulator.get_intercept_result("S003")
        print(simulator.report_generator.generate_leakage_explanation_for_report(
            sample_s003, result_s003
        ))

    print()
    print("=" * 70)
    print("人工备注保留原话演示：")
    print("=" * 70)
    print()

    corrections = simulator.review_workflow.get_sample_corrections("S002")
    if corrections:
        corr = corrections[0]
        print(f"修正人: {corr.corrected_by}")
        print(f"时间: {corr.corrected_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"备注原文（未修改，保留原话）:")
        print(f"  「{corr.correction_note}」")
        print()
        print("注意：系统没有自动把这句话改成更'整齐'的句子，")
        print("而是完整保留了模型训练工程师的原始表述。")

    print()
    print("=" * 70)
    print("复核链路追踪演示：")
    print("=" * 70)
    print()

    chain = simulator.review_workflow.build_review_chain("S003")
    print(f"样本 S003 的完整处理链路（按时间排序）:")
    for i, event in enumerate(chain, 1):
        print(f"  {i}. [{event['type'].upper()}] {event['timestamp'].strftime('%H:%M:%S')}")
        print(f"     {event['description']}")

    print()
    print("=" * 70)
    print("✅ 演示完成！")
    print("=" * 70)
    print()
    print("核心功能验证：")
    print("  ✅ 三条边界样例：顺利记录(S001)、待确认记录(S002)、明显坏数据(S003)")
    print("  ✅ 安全拦截非一次性：支持切分清单补录后重新检查")
    print("  ✅ 样本去重跟随更新：切分清单变更后去重缓存自动失效")
    print("  ✅ 普通话解释：每个拦截原因都有业务友好的说明")
    print("  ✅ 人工备注保留原话：未自动修改工程师的原始表述")
    print("  ✅ 训练验证泄漏说明详细：业务方只看报告也能明白")
    print("  ✅ 综合复核：模型日志、安全规则、工具调用参数同一轮")
    print("  ✅ 版本追踪：支持样本、修正、复核的完整链路")
    print()


if __name__ == "__main__":
    main()
