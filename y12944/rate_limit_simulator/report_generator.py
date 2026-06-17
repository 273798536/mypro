from datetime import datetime
from typing import Dict, List, Optional

from .models import (
    GroupMetrics,
    InterceptReason,
    InterceptResult,
    ManualCorrection,
    ReviewRecord,
    Sample,
    SampleStatus,
)


class ReportGenerator:
    def __init__(self):
        self._intercept_reason_explanations = {
            InterceptReason.TRAIN_TEST_LEAKAGE: {
                "plain_text": "训练验证泄漏",
                "detailed": "这条样本本来应该放在验证集或测试集用来检验模型效果，但我们发现它的内容和训练集里的样本重复了。打个比方：就像考试前老师把考试题先给学生做了一遍，那考试分数再好也说明不了学生真的学会了。模型在训练时已经见过这条数据，所以在验证集上的表现会虚高，导致我们对模型效果产生误判。",
                "business_impact": "如果这种泄漏的样本多了，模型上线后效果可能会比预期差很多，因为实际生产环境的数据模型是真的没见过的。",
                "action_items": [
                    "检查训练集切分清单是否完整，有没有漏加这条样本",
                    "确认这条样本是否真的应该放在验证/测试集",
                    "如果是切分错误，调整数据集划分",
                    "如果是样本本身问题，修改或删除这条样本",
                ],
            },
            InterceptReason.DUPLICATE_SAMPLE: {
                "plain_text": "重复样本",
                "detailed": "这条样本和之前已经处理过的某条样本内容完全一样（根据配置的去重规则判断）。重复样本会浪费计算资源，还可能让模型对某些内容过度学习。",
                "business_impact": "重复数据会导致训练时间变长、成本增加，严重时还会让模型产生偏见。",
                "action_items": [
                    "确认是否为误判（去重规则是否合理）",
                    "如果确实重复，保留一条即可，删除其他重复项",
                    "如果是不同场景的相同内容，考虑调整去重规则或给样本打上新的版本标识",
                ],
            },
            InterceptReason.BOUNDARY_VALUE: {
                "plain_text": "边界值异常",
                "detailed": "样本的某个特征值超出了我们设定的正常范围。这可能是数据采集错误、单位换算错误，或者真的是极端值。",
                "business_impact": "边界异常值可能会导致模型预测不稳定，甚至在推理时出错。",
                "action_items": [
                    "检查特征值是否在合理范围内",
                    "如果是数据错误，修正原始数据",
                    "如果是真实的极端值，考虑是否需要做截断或归一化处理",
                ],
            },
            InterceptReason.SAFETY_RULE_VIOLATION: {
                "plain_text": "安全规则违规",
                "detailed": "这条样本命中了我们预设的安全规则。这些规则是为了防止模型输出不当内容、敏感信息或违反政策法规的内容。",
                "business_impact": "违规内容如果流向用户，可能会引发法律风险、损害公司品牌形象。",
                "action_items": [
                    "查看命中了哪条安全规则",
                    "评估样本内容是否确实有问题",
                    "如果是误判，调整安全规则的匹配条件",
                    "如果确实违规，修改或删除这条样本",
                ],
            },
            InterceptReason.INVALID_FORMAT: {
                "plain_text": "格式无效",
                "detailed": "样本的格式不符合要求，可能是空内容、长度超限或者字段缺失。",
                "business_impact": "格式错误的样本无法被模型正确处理，会导致推理失败。",
                "action_items": [
                    "检查输入格式是否正确",
                    "补全缺失的字段",
                    "修正后重新提交",
                ],
            },
            InterceptReason.SUSPICIOUS_PATTERN: {
                "plain_text": "可疑模式",
                "detailed": "样本中检测到一些可疑的模式，可能是对抗样本、数据投毒或者其他异常情况。",
                "business_impact": "可疑数据可能会破坏模型训练过程，或者让模型产生不可预期的行为。",
                "action_items": [
                    "人工复核样本内容",
                    "检查数据来源是否可信",
                    "如果确认是恶意数据，及时从数据集中移除",
                ],
            },
            InterceptReason.MANUAL_FLAG: {
                "plain_text": "人工标记",
                "detailed": "这条样本被审核人员手动标记为有问题，需要进一步处理。",
                "business_impact": "人工标记的样本通常包含一些自动化规则没覆盖到的问题，需要认真对待。",
                "action_items": [
                    "查看人工标记的具体备注",
                    "按照备注意见进行处理",
                    "处理后再次提交审核",
                ],
            },
        }

    def generate_plain_text_explanation(
        self, intercept_result: InterceptResult
    ) -> str:
        if not intercept_result.is_blocked:
            return "这条样本通过了所有检查，可以正常使用。"

        explanations = []
        for reason in intercept_result.intercept_reasons:
            if reason in self._intercept_reason_explanations:
                exp = self._intercept_reason_explanations[reason]
                explanations.append(
                    f"【{exp['plain_text']}】{exp['detailed']}"
                )
            else:
                explanations.append(f"【{reason.value}】未知拦截原因")

        return "\n\n".join(explanations)

    def generate_business_summary(
        self,
        group_metrics: List[GroupMetrics],
        top_blocked_reasons: Dict[str, int],
    ) -> str:
        total_samples = sum(g.total_samples for g in group_metrics)
        total_blocked = sum(g.blocked_samples for g in group_metrics)
        total_leakage = sum(g.leakage_count for g in group_metrics)
        total_duplicate = sum(g.duplicate_count for g in group_metrics)

        block_rate = (total_blocked / total_samples * 100) if total_samples > 0 else 0

        summary_parts = [
            "=== 限流模拟检查结果摘要（给业务方看的普通话版本） ===",
            "",
            f"本次一共检查了 {total_samples} 条样本，其中拦截了 {total_blocked} 条，拦截率 {block_rate:.1f}%。",
            "",
            "主要问题分布：",
        ]

        if total_leakage > 0:
            summary_parts.append(
                f"- 训练验证泄漏：{total_leakage} 条。简单说就是考试题提前漏给学生了，会导致我们以为模型效果很好，但实际上线后可能不行。"
            )
        if total_duplicate > 0:
            summary_parts.append(
                f"- 重复样本：{total_duplicate} 条。重复数据会让模型白学一遍，浪费时间和钱。"
            )

        summary_parts.append("")
        summary_parts.append("最常见的拦截原因：")
        for reason, count in sorted(
            top_blocked_reasons.items(), key=lambda x: x[1], reverse=True
        )[:5]:
            if reason in self._intercept_reason_explanations:
                plain_name = self._intercept_reason_explanations[reason]["plain_text"]
            else:
                plain_name = reason
            summary_parts.append(f"- {plain_name}：{count} 条")

        summary_parts.append("")
        summary_parts.append("建议下一步：")
        if total_leakage > 0:
            summary_parts.append("1. 优先处理训练验证泄漏问题，这会直接影响模型效果评估的准确性")
        if total_duplicate > 0:
            summary_parts.append("2. 清理重复样本，提高训练效率")
        if total_blocked > 0:
            summary_parts.append("3. 让模型训练工程师逐条查看被拦截的样本，确认是真的有问题还是误判")

        return "\n".join(summary_parts)

    def generate_leakage_explanation_for_report(
        self, sample: Sample, intercept_result: InterceptResult
    ) -> str:
        explanation = []
        explanation.append("=== 关于训练验证泄漏的详细说明 ===")
        explanation.append("")
        explanation.append(f"样本ID：{sample.sample_id}")
        explanation.append(f"数据来源：{sample.data_source.value}集")
        explanation.append(f"分组：{sample.group_id}")
        explanation.append("")
        explanation.append("什么是训练验证泄漏？")
        explanation.append(
            "想象一下，你要出一份数学试卷来测试学生的水平。为了公平，"
            "考试题必须是学生之前没见过的。但如果不小心把平时作业里的原题放到试卷里了，"
            "那学生考了高分也不代表他真的会做新题。"
        )
        explanation.append("")
        explanation.append("在机器学习里也是一样的道理：")
        explanation.append("- 训练集 = 平时作业，用来让模型学习")
        explanation.append("- 验证集/测试集 = 考试卷，用来检验模型学得怎么样")
        explanation.append(
            "- 如果验证/测试集中的样本在训练集中也出现过，那就是「训练验证泄漏」"
        )
        explanation.append("")
        explanation.append("这条样本为什么被拦下来？")
        for detail in intercept_result.intercept_details:
            if "泄漏" in detail or "leakage" in detail.lower():
                explanation.append(f"- {detail}")
        explanation.append("")
        explanation.append("如果不处理会怎么样？")
        explanation.append(
            "模型在验证/测试集上的准确率会虚高，让我们误以为模型效果很好。"
            "但实际上线后，面对真正没见过的数据，效果可能会大打折扣。"
            "这会浪费研发资源，也可能给业务带来损失。"
        )
        explanation.append("")
        explanation.append("建议怎么处理？")
        action_items = self._intercept_reason_explanations.get(
            InterceptReason.TRAIN_TEST_LEAKAGE, {}
        ).get("action_items", [])
        for i, item in enumerate(action_items, 1):
            explanation.append(f"{i}. {item}")

        return "\n".join(explanation)

    def generate_full_report(
        self,
        samples: List[Sample],
        intercept_results: Dict[str, InterceptResult],
        group_metrics: List[GroupMetrics],
        review_records: Dict[str, List[ReviewRecord]],
        corrections: Dict[str, List[ManualCorrection]],
        include_raw_data: bool = False,
    ) -> str:
        report_parts = []

        report_parts.append("=" * 60)
        report_parts.append("模型服务限流模拟检查报告")
        report_parts.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_parts.append("=" * 60)
        report_parts.append("")

        top_blocked_reasons: Dict[str, int] = {}
        for result in intercept_results.values():
            for reason in result.intercept_reasons:
                top_blocked_reasons[reason.value] = (
                    top_blocked_reasons.get(reason.value, 0) + 1
                )

        report_parts.append(self.generate_business_summary(group_metrics, top_blocked_reasons))
        report_parts.append("")

        report_parts.append("=" * 60)
        report_parts.append("二、分组指标详情")
        report_parts.append("=" * 60)
        report_parts.append("")

        for gm in group_metrics:
            report_parts.append(f"【{gm.group_name}】(ID: {gm.group_id})")
            report_parts.append(f"  总样本数：{gm.total_samples}")
            report_parts.append(f"  通过：{gm.passed_samples} ({gm.pass_rate*100:.1f}%)")
            report_parts.append(f"  拦截：{gm.blocked_samples} ({gm.block_rate*100:.1f}%)")
            report_parts.append(f"  待复核：{gm.needs_review_samples}")
            report_parts.append(f"  重复样本：{gm.duplicate_count}")
            report_parts.append(f"  训练泄漏：{gm.leakage_count}")
            if gm.intercept_reasons:
                report_parts.append("  拦截原因分布：")
                for reason, count in gm.intercept_reasons.items():
                    if reason in self._intercept_reason_explanations:
                        plain_name = self._intercept_reason_explanations[reason]["plain_text"]
                    else:
                        plain_name = reason
                    report_parts.append(f"    - {plain_name}：{count}")
            report_parts.append("")

        report_parts.append("=" * 60)
        report_parts.append("三、样例详情（每条都有普通话解释）")
        report_parts.append("=" * 60)
        report_parts.append("")

        for sample in samples:
            result = intercept_results.get(sample.sample_id)
            if not result:
                continue

            report_parts.append("-" * 60)
            status = "✅ 通过" if not result.is_blocked else "❌ 拦截"
            report_parts.append(f"样本 {sample.sample_id} - {status}")
            report_parts.append("-" * 60)
            report_parts.append(f"数据来源：{sample.data_source.value}集")
            report_parts.append(f"分组：{sample.group_id}")
            report_parts.append(f"提示词版本：{sample.prompt_version}")
            if sample.model_version:
                report_parts.append(f"模型版本：{sample.model_version}")
            report_parts.append("")
            report_parts.append(f"提示词：{sample.prompt}")
            if sample.response:
                report_parts.append(f"响应：{sample.response}")
            report_parts.append("")

            if result.is_blocked:
                report_parts.append("拦截原因：")
                for i, reason in enumerate(result.intercept_reasons, 1):
                    exp = self._intercept_reason_explanations.get(reason, {})
                    plain_name = exp.get("plain_text", reason.value)
                    report_parts.append(f"  {i}. {plain_name}")
                report_parts.append("")
                report_parts.append("详细解释（可以直接复制给同事）：")
                report_parts.append(self.generate_plain_text_explanation(result))
                report_parts.append("")

                if InterceptReason.TRAIN_TEST_LEAKAGE in result.intercept_reasons:
                    report_parts.append(
                        self.generate_leakage_explanation_for_report(sample, result)
                    )
                    report_parts.append("")

                if result.suggestions:
                    report_parts.append("处理建议：")
                    for suggestion in result.suggestions:
                        report_parts.append(f"  - {suggestion}")
                    report_parts.append("")

            sample_corrections = corrections.get(sample.sample_id, [])
            if sample_corrections:
                report_parts.append("人工修正记录（保留原话）：")
                for corr in sample_corrections:
                    report_parts.append(f"  修正人：{corr.corrected_by}")
                    report_parts.append(f"  时间：{corr.corrected_at.strftime('%Y-%m-%d %H:%M:%S')}")
                    report_parts.append(f"  备注原文：「{corr.correction_note}」")
                    if corr.corrected_prompt:
                        report_parts.append(f"  修正后提示词：{corr.corrected_prompt}")
                    report_parts.append(
                        f"  状态：{'已通过' if corr.is_approved else '待审核'}"
                    )
                report_parts.append("")

            sample_reviews = review_records.get(sample.sample_id, [])
            if sample_reviews:
                report_parts.append("复核记录：")
                for review in sample_reviews:
                    report_parts.append(
                        f"  第{review.review_round}轮 - {review.reviewer} - "
                        f"{'通过' if review.is_approved else '未通过'}"
                    )
                    report_parts.append(f"  复核意见原文：「{review.review_notes}」")
                    if review.safety_rules_checked:
                        report_parts.append(
                            f"  本轮检查的安全规则：{', '.join(review.safety_rules_checked)}"
                        )
                    if review.tool_call_params:
                        report_parts.append(
                            f"  本轮工具调用参数：{review.tool_call_params}"
                        )
                    if review.model_logs:
                        report_parts.append(
                            f"  本轮模型日志摘要：{list(review.model_logs.keys())}"
                        )
                report_parts.append("")

            if include_raw_data:
                report_parts.append(f"原始特征：{sample.features}")
                if sample.labels:
                    report_parts.append(f"标签：{sample.labels}")
                report_parts.append(f"检查轮次：{result.check_round}")
                report_parts.append(f"内容哈希：{result.content_hash}")
                report_parts.append("")

        return "\n".join(report_parts)

    def export_report_to_file(
        self,
        report_content: str,
        output_path: str,
    ) -> None:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report_content)
