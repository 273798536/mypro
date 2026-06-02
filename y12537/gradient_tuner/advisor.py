from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from .models import TrainingRecord, CheckResult, Issue, IssueType


class CorrectionAdvisor:
    def __init__(self):
        self.advisor_snapshots: List[Dict] = []
        self.grouped_issues: Dict[str, List[Issue]] = defaultdict(list)
        self.recommended_fixes: List[Dict] = []

    def analyze(
        self, records: List[TrainingRecord], check_results: List[CheckResult]
    ) -> Dict:
        result_map = {r.record_id: r for r in check_results}

        for record in records:
            check_result = result_map.get(record.record_id)
            if not check_result:
                continue

            self._capture_snapshot("before_analysis", record, check_result, {})

            for issue in check_result.issues:
                self.grouped_issues[issue.issue_type.value].append(issue)
                detailed_suggestion = self._generate_detailed_suggestion(
                    issue, record, check_result
                )
                issue.suggestion = detailed_suggestion

            self._capture_snapshot("after_analysis", record, check_result, {
                "issues_count": len(check_result.issues),
                "issue_types": [i.issue_type.value for i in check_result.issues],
            })

        self._generate_cross_record_recommendations(records, check_results)

        return {
            "grouped_issues": dict(self.grouped_issues),
            "recommended_fixes": self.recommended_fixes,
            "summary": self._generate_summary(),
            "prioritized_actions": self._prioritize_actions(),
        }

    def _generate_detailed_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult
    ) -> str:
        material = issue.details.get("material", f"{record.class_name} 的训练记录")

        if issue.issue_type == IssueType.INSUFFICIENT_ITERATIONS:
            return self._generate_iteration_suggestion(issue, record, check_result, material)

        elif issue.issue_type == IssueType.LEARNING_RATE_EXPLOSION:
            return self._generate_lr_explosion_suggestion(issue, record, check_result, material)

        elif issue.issue_type == IssueType.LOCAL_MINIMUM:
            return self._generate_local_minimum_suggestion(issue, record, check_result, material)

        elif issue.issue_type == IssueType.MISSING_LEARNING_RATE:
            return self._generate_missing_lr_suggestion(issue, record, check_result, material)

        elif issue.issue_type == IssueType.RENAMED_CLASS_RECORD:
            return self._generate_renamed_class_suggestion(issue, record, check_result, material)

        elif issue.issue_type == IssueType.CORRUPTED_LOSS_RECORD:
            return self._generate_corrupted_loss_suggestion(issue, record, check_result, material)

        return issue.suggestion or "建议检查该记录的原始数据。"

    def _generate_iteration_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        actual = issue.details.get("actual_iterations", len(record.loss_history))
        expected = issue.details.get("expected_iterations", record.iterations)
        min_required = issue.details.get("min_required", 50)
        initial = issue.details.get("initial_loss")
        final = issue.details.get("final_loss")

        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name} 班",
            f"  - 损失函数：{record.loss_function}" + (f"（备注：{record.loss_function_note}）" if record.loss_function_note else ""),
            f"  - 数据来源：{record.source_file}",
            f"  - 实际迭代：{actual} 轮",
            f"  - 预期迭代：{expected if expected > 0 else '未填写'} 轮",
            f"  - 最低要求：{min_required} 轮",
        ]

        if initial is not None and final is not None:
            drop = initial - final
            drop_pct = (drop / initial * 100) if initial != 0 else 0
            parts.append(
                f"  - 损失变化：{initial:.4f} → {final:.4f} "
                f"（下降 {drop:.4f}，{drop_pct:.0f}%）"
            )

        parts.extend([
            "",
            f"为什么不能接受这个结果：",
            f"  梯度下降的前几步通常是在『找方向』，还没进入『真正学习』的阶段。",
            f"  就像考试只做了前 {actual} 道选择题就交卷，",
            f"  你没法知道学生是不是真的掌握了全部知识点。",
            f"  这时候的损失值 {final:.4f} 不是『模型能达到的最低损失』，",
            f"  而是『训练到第 {actual} 轮时的损失』——两个完全不同的概念。",
            "",
            f"具体修正步骤：",
        ])

        target = max(min_required, expected if expected > 0 else min_required * 2)
        parts.append(f"  1. 补跑训练：至少跑到 {target} 轮")

        if expected == 0:
            parts.append(f"     （原始记录没填预期迭代数，建议补填后再跑）")

        if record.learning_rate is not None:
            parts.append(
                f"  2. 检查学习率：当前 {record.learning_rate}，"
                f"如果损失下降太慢可适当调大，如果震荡可调小"
            )
        else:
            parts.append(f"  2. ⚠️ 学习率缺失，请先补填学习率后再跑")

        parts.extend([
            f"  3. 验证标准：等到损失曲线连续 10-20 轮下降不超过 0.1%，",
            f"     才算真正收敛，这时候再停止训练",
            f"  4. 对比验证：补跑后导出新的损失曲线，",
            f"     和当前 {actual} 轮的曲线对比，确认下降趋势",
            "",
            f"给业务同事的解释参考：",
            f"  「这个班的训练没跑完，目前的数据只能看出模型在学习，",
            f"  但还没学到最好状态。就像跑马拉松只跑了 5 公里，",
            f"  虽然在前进但还没到终点，这时候的成绩不算数。",
            f"  我们已经让它继续跑了，等跑到 {target} 公里再看最终成绩。」",
        ])

        return "\n".join(parts)

    def _generate_lr_explosion_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        lr = issue.details.get("learning_rate", record.learning_rate)
        explosion_iter = issue.details.get("explosion_iteration", 0)
        loss_before = issue.details.get("loss_before", 0)
        loss_after = issue.details.get("loss_after", 0)
        ratio = issue.details.get("growth_ratio", 0)

        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name} 班",
            f"  - 损失函数：{record.loss_function}" + (f"（备注：{record.loss_function_note}）" if record.loss_function_note else ""),
            f"  - 当前学习率：{lr}",
            f"  - 爆炸位置：第 {explosion_iter} 轮",
            f"  - 爆炸前损失：{loss_before:.6f}",
            f"  - 爆炸后损失：{loss_after:.6f}",
            f"  - 单次涨幅：{ratio:.1f} 倍",
            f"  - 数据来源：{record.source_file}",
            "",
            f"发生了什么：",
            f"  学习率太大了，就像下山的时候步子迈得太大，",
            f"  一步跨出去直接迈过了山谷，冲到了对面的山坡上，",
            f"  而且越冲越高，损失反而越来越大。",
            f"  第 {explosion_iter} 轮就是那一步迈太大的地方。",
            "",
            f"具体修正步骤：",
            f"  1. 降低学习率：从 {lr} 降到 {lr * 0.1:.6f}",
            f"     （乘以 0.1，降一个数量级）",
            f"  2. 如果还是爆炸，继续降到 {lr * 0.01:.6f}",
            f"  3. 建议使用学习率衰减：每跑 50 轮乘以 0.5",
            f"  4. 或者改用 Adam 优化器，它会自动调整学习率",
            f"  5. 重新训练后检查：损失曲线应该是平稳下降的，",
            f"     不能有突然跳升的情况",
            "",
            f"给业务同事的解释参考：",
            f"  「这个班的学习进度调得太快了，就像学开车一上来就踩油门到 200 码，",
            f"  结果直接冲出赛道了。我们已经把油门松了松，让它慢慢学，",
            f"  虽然慢一点但能真正学到东西。」",
        ]

        return "\n".join(parts)

    def _generate_local_minimum_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        start = issue.details.get("plateau_start", 0)
        end = issue.details.get("plateau_end", 0)
        duration = issue.details.get("plateau_duration", 0)
        plateau_loss = issue.details.get("plateau_loss_value", 0)

        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name} 班",
            f"  - 损失函数：{record.loss_function}" + (f"（备注：{record.loss_function_note}）" if record.loss_function_note else ""),
            f"  - 当前学习率：{record.learning_rate if record.learning_rate else '未填写'}",
            f"  - 陷入位置：第 {start}-{end} 轮",
            f"  - 持续时间：{duration} 轮",
            f"  - 平台损失值：{plateau_loss:.6f}",
            f"  - 数据来源：{record.source_file}",
            "",
            f"发生了什么：",
            f"  模型走到了一个小坑（局部极小）就以为到了谷底（全局最小），",
            f"  在坑里来回打转不肯出来。",
            f"  就像下山路途中遇到一个小水洼，就以为到山脚了，",
            f"  其实再往前走还有很长的下坡路。",
            f"  这 {duration} 轮本质上是在原地踏步。",
            "",
            f"具体修正步骤：",
        ]

        if record.learning_rate is not None:
            parts.append(
                f"  1. 增大学习率：从 {record.learning_rate} 提到 {record.learning_rate * 10:.6f}，"
                f"帮它『跳出小坑』"
            )
        else:
            parts.append(f"  1. ⚠️ 先补填学习率，再考虑调大")

        parts.extend([
            f"  2. 增加动量（momentum=0.9）：给优化器一个『惯性』，",
            f"     遇到小坑能直接冲过去",
            f"  3. 或者改用 Adam 优化器：自带动量和自适应学习率，",
            f"     不容易陷入局部极小",
            f"  4. 检查训练数据：看是不是有标注错误或者数据分布不均",
            f"  5. 调整网络结构：增加一层或减少正则化强度",
            f"  6. 验证标准：跳出平台后损失要继续下降，",
            f"     而且最终损失要明显低于 {plateau_loss:.6f}",
            "",
            f"给业务同事的解释参考：",
            f"  「这个班学到一定程度就卡住了，好像学会了但其实只是摸到了天花板。",
            f"  就像学生做题遇到难题就跳过，停在舒适区里不肯前进。",
            f"  我们推了它一把（调大学习率），让它继续往下学，",
            f"  应该能学到更好的效果。」",
        ])

        return "\n".join(parts)

    def _generate_missing_lr_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name} 班",
            f"  - 损失函数：{record.loss_function}" + (f"（备注：{record.loss_function_note}）" if record.loss_function_note else ""),
            f"  - 学习率：缺失 ❌",
            f"  - 数据来源：{record.source_file}",
            "",
            f"为什么这是个问题：",
            f"  学习率是梯度下降的『油门』，决定了每次参数更新迈多大步子。",
            f"  没有学习率，就像开车没有油门，根本不知道该开多快。",
            f"  不同的学习率会导致完全不同的训练结果——",
            f"  太大容易爆炸，太小训练太慢。",
            f"  缺失学习率的记录，后续所有分析都不可靠。",
            "",
            f"具体修正步骤：",
            f"  1. 查找原始训练脚本或配置文件，找到实际使用的学习率",
            f"  2. 如果找不到，建议常用值：",
            f"     - SGD：0.01 ~ 0.1",
            f"     - Adam：0.001 ~ 0.01",
            f"     - 学习率衰减：每 50 轮乘以 0.5",
            f"  3. 补填到 {record.source_file} 的对应记录中",
            f"  4. 补填后重新导入和分析",
            "",
            f"给业务同事的解释参考：",
            f"  「这份记录缺了关键参数——学习率。",
            f"  就像看菜谱发现没写『用多大火』，",
            f"  火大火小做出来的菜完全不一样。",
            f"  我们得先把这个参数补上，才能判断训练效果好不好。」",
        ]

        return "\n".join(parts)

    def _generate_renamed_class_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name}（原始记录中未找到班级名，自动命名）",
            f"  - 数据来源：{record.source_file}",
            f"  - 原始名称：{record.original_class_name}",
            "",
            f"发生了什么：",
            f"  这份记录可能是临时改名了，或者班级名列格式不规范，",
            f"  导致解析时没认出班级名，系统自动给了个编号名 {record.class_name}。",
            f"  这不影响分析结果，但会影响后续对比和报告。",
            "",
            f"具体修正步骤：",
            f"  1. 打开 {record.source_file}",
            f"  2. 确认这条记录对应的真实班级名",
            f"  3. 补填在 'class_name' 或 '班级' 列",
            f"  4. 重新导入即可",
            "",
            f"给业务同事的解释参考：",
            f"  「这份记录的班级名写得不太规范，系统没认出来，",
            f"  暂时给了个编号。我们把它改回正式班级名就好了，",
            f"  不影响训练结果的分析。」",
        ]

        return "\n".join(parts)

    def _generate_corrupted_loss_suggestion(
        self, issue: Issue, record: TrainingRecord, check_result: CheckResult, material: str
    ) -> str:
        parts = [
            f"🔧 修正建议 - 针对【{material}】",
            "",
            f"问题定位：",
            f"  - 涉及对象：{record.class_name} 班",
            f"  - 数据来源：{record.source_file}",
            f"  - 问题：没有有效的损失数据",
            "",
            f"发生了什么：",
            f"  系统在这份记录里找不到任何有效的损失-迭代数据对。",
            f"  可能是：",
            f"  1. 损失记录是空的",
            f"  2. 格式不规范，系统读不懂",
            f"  3. 训练根本没开始或没保存过程数据",
            "",
            f"具体修正步骤：",
            f"  1. 检查 {record.source_file} 中是否有损失曲线数据",
            f"  2. 确保格式为：'iter: 1, loss: 0.5' 或 '1, 0.5' 这类可识别的格式",
            f"  3. 如果训练脚本没保存过程数据，需要修改训练脚本",
            f"     每轮训练后记录 iteration 和 loss 值",
            f"  4. 数据补齐后重新导入",
            "",
            f"给业务同事的解释参考：",
            f"  「这份记录里没有训练过程的数据，",
            f"  就像看学生的成绩单但只有姓名没有分数。",
            f"  我们需要把过程数据补上才能分析。」",
        ]

        return "\n".join(parts)

    def _generate_cross_record_recommendations(
        self, records: List[TrainingRecord], check_results: List[CheckResult]
    ) -> None:
        lr_records = [r for r in records if r.learning_rate is not None]
        if len(lr_records) >= 2:
            lr_values = sorted([r.learning_rate for r in lr_records])
            lr_range = lr_values[-1] / lr_values[0] if lr_values[0] > 0 else 0
            if lr_range > 100:
                self.recommended_fixes.append({
                    "type": "lr_inconsistency",
                    "severity": "medium",
                    "message": f"不同班级学习率差异过大（{lr_values[0]:.6f} ~ {lr_values[-1]:.6f}，相差 {lr_range:.0f} 倍），建议统一实验条件后再对比",
                    "affected_records": [r.class_name for r in lr_records],
                    "suggestion": "将所有班级的学习率设置在同一数量级，或在报告中说明学习率不同的原因"
                })

        iter_issues = [
            (r, cr) for r, cr in zip(records, check_results)
            if any(i.issue_type == IssueType.INSUFFICIENT_ITERATIONS for i in cr.issues)
        ]
        if len(iter_issues) > len(records) * 0.5:
            self.recommended_fixes.append({
                "type": "systemic_insufficient_iterations",
                "severity": "high",
                "message": f"超过一半的班级（{len(iter_issues)}/{len(records)}）存在迭代不足问题，可能是训练流程配置有问题",
                "affected_records": [r.class_name for r, _ in iter_issues],
                "suggestion": "检查训练脚本的 early stopping 条件和最大迭代数配置，建议统一设置最低迭代次数为 100 轮"
            })

        lr_explosion_count = sum(
            1 for cr in check_results
            if any(i.issue_type == IssueType.LEARNING_RATE_EXPLOSION for i in cr.issues)
        )
        if lr_explosion_count > 0:
            self.recommended_fixes.append({
                "type": "lr_explosion_pattern",
                "severity": "high",
                "message": f"有 {lr_explosion_count} 个班级出现学习率爆炸，建议检查默认学习率设置是否过大",
                "affected_count": lr_explosion_count,
                "suggestion": "建议将默认学习率降低一个数量级，或统一使用学习率衰减策略"
            })

    def _generate_summary(self) -> Dict:
        total_issues = sum(len(v) for v in self.grouped_issues.values())
        summary = {
            "total_records_analyzed": 0,
            "total_issues_found": total_issues,
            "issues_by_type": {k: len(v) for k, v in self.grouped_issues.items()},
            "high_severity_count": sum(
                1 for issues in self.grouped_issues.values()
                for i in issues if i.severity == "high"
            ),
            "medium_severity_count": sum(
                1 for issues in self.grouped_issues.values()
                for i in issues if i.severity == "medium"
            ),
            "low_severity_count": sum(
                1 for issues in self.grouped_issues.values()
                for i in issues if i.severity == "low"
            ),
        }
        return summary

    def _prioritize_actions(self) -> List[Dict]:
        actions = []

        for issue_type, issues in self.grouped_issues.items():
            if not issues:
                continue

            high_issues = [i for i in issues if i.severity == "high"]
            if high_issues:
                actions.append({
                    "priority": "P0",
                    "type": issue_type,
                    "count": len(high_issues),
                    "message": f"立即处理：{len(high_issues)} 个高优先级问题（{issue_type}）",
                    "affected_classes": [i.class_name for i in high_issues],
                })

        for issue_type, issues in self.grouped_issues.items():
            medium_issues = [i for i in issues if i.severity == "medium"]
            if medium_issues:
                actions.append({
                    "priority": "P1",
                    "type": issue_type,
                    "count": len(medium_issues),
                    "message": f"尽快处理：{len(medium_issues)} 个中优先级问题（{issue_type}）",
                    "affected_classes": [i.class_name for i in medium_issues],
                })

        for fix in self.recommended_fixes:
            severity = fix.get("severity", "medium")
            priority = "P0" if severity == "high" else "P1" if severity == "medium" else "P2"
            actions.append({
                "priority": priority,
                "type": "cross_record",
                "count": fix.get("affected_count", len(fix.get("affected_records", []))),
                "message": fix["message"],
                "suggestion": fix["suggestion"],
            })

        actions.sort(key=lambda x: {"P0": 0, "P1": 1, "P2": 2}.get(x["priority"], 3))
        return actions

    def _capture_snapshot(
        self, operation: str, record: TrainingRecord, check_result: CheckResult, extra: Dict
    ) -> None:
        self.advisor_snapshots.append({
            "stage": "advise",
            "operation": operation,
            "record_id": record.record_id,
            "class_name": record.class_name,
            "data_before": {
                "issues_count": len(check_result.issues),
                "issue_types": [i.issue_type.value for i in check_result.issues],
                **extra
            },
            "data_after": {
                "detailed_suggestions_generated": len(check_result.issues),
            },
            "timestamp": datetime.now().isoformat(),
        })

    def get_advisor_snapshots(self) -> List[Dict]:
        return self.advisor_snapshots

    def get_grouped_issues(self) -> Dict[str, List[Issue]]:
        return dict(self.grouped_issues)

    def get_recommended_fixes(self) -> List[Dict]:
        return self.recommended_fixes
