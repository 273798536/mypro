import math
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from .models import TrainingRecord, CheckResult, Issue, IssueType


class GradientChecker:
    def __init__(
        self,
        explosion_threshold: float = 2.0,
        plateau_window: int = 10,
        plateau_tolerance: float = 1e-4,
        min_iterations_required: int = 50,
        convergence_ratio: float = 0.9,
    ):
        self.explosion_threshold = explosion_threshold
        self.plateau_window = plateau_window
        self.plateau_tolerance = plateau_tolerance
        self.min_iterations_required = min_iterations_required
        self.convergence_ratio = convergence_ratio
        self.check_snapshots: List[Dict] = []

    def check_all(self, records: List[TrainingRecord]) -> List[CheckResult]:
        results = []
        for record in records:
            result = self.check_one(record)
            results.append(result)
        return results

    def check_one(self, record: TrainingRecord) -> CheckResult:
        result = CheckResult(
            record_id=record.record_id,
            class_name=record.class_name,
        )

        if not record.loss_history:
            issue = Issue(
                issue_type=IssueType.CORRUPTED_LOSS_RECORD,
                severity="high",
                message=f"班级 {record.class_name} 没有有效的损失数据",
                record_id=record.record_id,
                class_name=record.class_name,
                details={"source_file": record.source_file}
            )
            result.issues.append(issue)
            self._capture_snapshot("empty_history", record, result, {})
            return result

        loss_values = [h.loss_value for h in sorted(record.loss_history, key=lambda x: x.iteration)]
        result.loss_trend = loss_values

        self._capture_snapshot("before_check", record, result, {
            "loss_count": len(loss_values),
            "first_loss": loss_values[0] if loss_values else None,
            "last_loss": loss_values[-1] if loss_values else None,
        })

        if record.learning_rate is not None:
            lr_ok, explosive_points, lr_issues = self._check_learning_rate_explosion(
                record, loss_values
            )
            result.learning_rate_ok = lr_ok
            result.explosive_points = explosive_points
            result.issues.extend(lr_issues)

        self._capture_snapshot("after_lr_check", record, result, {
            "learning_rate_ok": result.learning_rate_ok,
            "explosive_points_count": len(result.explosive_points),
        })

        conv_ok, plateau_points, conv_issues = self._check_local_minimum(
            record, loss_values
        )
        result.convergence_ok = conv_ok
        result.plateau_points = plateau_points
        result.issues.extend(conv_issues)

        self._capture_snapshot("after_conv_check", record, result, {
            "convergence_ok": result.convergence_ok,
            "plateau_points_count": len(result.plateau_points),
        })

        iter_ok, iter_issues = self._check_insufficient_iterations(
            record, loss_values, result.convergence_ok
        )
        result.iteration_ok = iter_ok
        result.issues.extend(iter_issues)

        if loss_values:
            result.final_loss = loss_values[-1]

        self._capture_snapshot("after_iter_check", record, result, {
            "iteration_ok": result.iteration_ok,
            "issues_count": len(result.issues),
            "final_loss": result.final_loss,
        })

        return result

    def _check_learning_rate_explosion(
        self, record: TrainingRecord, loss_values: List[float]
    ) -> Tuple[bool, List[int], List[Issue]]:
        issues = []
        explosive_points = []
        is_ok = True

        if len(loss_values) < 3:
            return True, [], []

        for i in range(1, len(loss_values)):
            if loss_values[i-1] == 0:
                continue
            ratio = loss_values[i] / loss_values[i-1]
            if ratio > self.explosion_threshold and loss_values[i] > loss_values[i-1]:
                explosive_points.append(i)
                is_ok = False

        if explosive_points:
            first_explosion = explosive_points[0]
            if len(loss_values) > first_explosion + 1:
                prev_val = loss_values[first_explosion - 1] if first_explosion > 0 else loss_values[0]
                explosion_val = loss_values[first_explosion]
                growth_ratio = explosion_val / prev_val if prev_val != 0 else float('inf')

                issue = Issue(
                    issue_type=IssueType.LEARNING_RATE_EXPLOSION,
                    severity="high",
                    message=(
                        f"班级 {record.class_name} 在第 {first_explosion + 1} 次迭代检测到学习率爆炸："
                        f"损失从 {prev_val:.6f} 跃升至 {explosion_val:.6f}，"
                        f"单次涨幅 {growth_ratio:.1f} 倍。当前学习率 {record.learning_rate} 可能过大。"
                    ),
                    record_id=record.record_id,
                    class_name=record.class_name,
                    details={
                        "learning_rate": record.learning_rate,
                        "explosion_iteration": first_explosion + 1,
                        "loss_before": prev_val,
                        "loss_after": explosion_val,
                        "growth_ratio": growth_ratio,
                        "explosive_points": explosive_points,
                        "material": f"{record.loss_function} 损失函数下的训练数据",
                    },
                    suggestion=(
                        f"建议将学习率从 {record.learning_rate} 降低至 "
                        f"{record.learning_rate * 0.1:.6f} 或更小，"
                        f"或使用学习率衰减策略（如 StepLR、ReduceLROnPlateau）"
                    )
                )
                issues.append(issue)

        return is_ok, explosive_points, issues

    def _check_local_minimum(
        self, record: TrainingRecord, loss_values: List[float]
    ) -> Tuple[bool, List[Tuple[int, int]], List[Issue]]:
        issues = []
        plateau_regions = []
        is_ok = True

        if len(loss_values) < self.plateau_window * 2:
            return True, [], []

        i = 0
        while i < len(loss_values) - self.plateau_window:
            window = loss_values[i:i + self.plateau_window]
            window_range = max(window) - min(window)
            initial_val = window[0]

            if initial_val != 0 and window_range / abs(initial_val) < self.plateau_tolerance:
                is_decreasing = all(
                    loss_values[j] >= loss_values[j+1]
                    for j in range(i, i + self.plateau_window - 1)
                )

                if not is_decreasing:
                    plateau_end = i + self.plateau_window
                    while plateau_end < len(loss_values):
                        next_window = loss_values[plateau_end - self.plateau_window + 1:plateau_end + 1]
                        if len(next_window) < self.plateau_window:
                            break
                        next_range = max(next_window) - min(next_window)
                        next_initial = next_window[0]
                        if next_initial != 0 and next_range / abs(next_initial) >= self.plateau_tolerance:
                            break
                        plateau_end += 1

                    plateau_regions.append((i + 1, plateau_end))
                    i = plateau_end
                    is_ok = False
                    continue
            i += 1

        for start, end in plateau_regions:
            plateau_loss = loss_values[start - 1]
            issue = Issue(
                issue_type=IssueType.LOCAL_MINIMUM,
                severity="medium",
                message=(
                    f"班级 {record.class_name} 在第 {start}-{end} 次迭代陷入局部极小："
                    f"损失值长期徘徊在 {plateau_loss:.6f} 附近，"
                    f"持续 {end - start + 1} 轮无明显下降。"
                ),
                record_id=record.record_id,
                class_name=record.class_name,
                details={
                    "plateau_start": start,
                    "plateau_end": end,
                    "plateau_duration": end - start + 1,
                    "plateau_loss_value": plateau_loss,
                    "loss_range": max(loss_values[start-1:end]) - min(loss_values[start-1:end]),
                    "material": f"第 {start} 到 {end} 轮的 {record.loss_function} 损失曲线",
                },
                suggestion=(
                    "建议：1) 增加学习率帮助跳出局部极小；"
                    "2) 引入动量（momentum）或使用 Adam 等自适应优化器；"
                    "3) 检查训练数据是否存在标注错误或分布异常；"
                    "4) 考虑调整网络结构或正则化强度。"
                )
            )
            issues.append(issue)

        return is_ok, plateau_regions, issues

    def _check_insufficient_iterations(
        self, record: TrainingRecord, loss_values: List[float], convergence_ok: bool
    ) -> Tuple[bool, List[Issue]]:
        issues = []
        is_ok = True

        actual_iters = len(loss_values)
        expected_iters = record.iterations
        final_loss = loss_values[-1] if loss_values else None
        initial_loss = loss_values[0] if loss_values else None

        if actual_iters < self.min_iterations_required:
            is_ok = False
            issue = self._create_insufficient_iteration_issue(
                record, actual_iters, expected_iters, initial_loss, final_loss,
                reason=f"实际迭代 {actual_iters} 轮少于最低要求 {self.min_iterations_required} 轮"
            )
            issues.append(issue)

        elif expected_iters > 0 and actual_iters < expected_iters * self.convergence_ratio:
            is_ok = False
            missing = expected_iters - actual_iters
            issue = self._create_insufficient_iteration_issue(
                record, actual_iters, expected_iters, initial_loss, final_loss,
                reason=(
                    f"实际迭代 {actual_iters} 轮仅达到预期 {expected_iters} 轮的 "
                    f"{actual_iters/expected_iters*100:.0f}%，还差 {missing} 轮没跑完"
                )
            )
            issues.append(issue)

        elif not convergence_ok and actual_iters < self.min_iterations_required * 2:
            is_ok = False
            issue = self._create_insufficient_iteration_issue(
                record, actual_iters, expected_iters, initial_loss, final_loss,
                reason=(
                    f"损失曲线尚未收敛（出现局部极小或震荡），但仅跑了 {actual_iters} 轮，"
                    f"不足以判断是真的收敛还是训练不充分"
                )
            )
            issues.append(issue)

        elif initial_loss is not None and final_loss is not None:
            reduction_ratio = (initial_loss - final_loss) / initial_loss if initial_loss != 0 else 0
            if reduction_ratio < 0.1 and actual_iters < self.min_iterations_required * 2:
                is_ok = False
                issue = self._create_insufficient_iteration_issue(
                    record, actual_iters, expected_iters, initial_loss, final_loss,
                    reason=(
                        f"训练 {actual_iters} 轮后损失仅下降了 {reduction_ratio*100:.0f}% "
                        f"（从 {initial_loss:.4f} 到 {final_loss:.4f}），"
                        f"下降幅度不足 10%，可能还没到有效学习阶段"
                    )
                )
                issues.append(issue)

        return is_ok, issues

    def _create_insufficient_iteration_issue(
        self,
        record: TrainingRecord,
        actual_iters: int,
        expected_iters: int,
        initial_loss: Optional[float],
        final_loss: Optional[float],
        reason: str
    ) -> Issue:
        details = {
            "actual_iterations": actual_iters,
            "expected_iterations": expected_iters,
            "min_required": self.min_iterations_required,
            "initial_loss": initial_loss,
            "final_loss": final_loss,
            "material": f"{record.class_name} 的 {record.loss_function} 训练记录",
            "raw_record": [{"iter": h.iteration, "loss": h.loss_value} for h in record.loss_history],
        }

        human_readable = self._generate_human_readable_explanation(
            actual_iters, expected_iters, initial_loss, final_loss, reason
        )

        suggestion_parts = [
            f"这个班级的训练明显没跑完。",
            f"好比让学生做 100 道题，他只做了 {actual_iters} 道就交卷了，",
            f"你没法判断他是真会了还是嫌麻烦没做完。",
            f"",
            f"具体情况：{reason}",
        ]
        if expected_iters > 0:
            suggestion_parts.append(
                f"原定要跑 {expected_iters} 轮，现在只完成了 {actual_iters} 轮。"
            )
        if initial_loss and final_loss:
            drop = initial_loss - final_loss
            drop_pct = (drop / initial_loss * 100) if initial_loss != 0 else 0
            suggestion_parts.append(
                f"损失从 {initial_loss:.4f} 降到 {final_loss:.4f}，"
                f"只降了 {drop:.4f}（{drop_pct:.0f}%）。"
            )
        suggestion_parts.append(
            f"建议至少补跑到 {max(self.min_iterations_required, expected_iters if expected_iters > 0 else self.min_iterations_required)} 轮，"
            f"等损失曲线稳定下降后再做结论。"
        )

        return Issue(
            issue_type=IssueType.INSUFFICIENT_ITERATIONS,
            severity="high",
            message=human_readable,
            record_id=record.record_id,
            class_name=record.class_name,
            details=details,
            suggestion="\n".join(suggestion_parts)
        )

    def _generate_human_readable_explanation(
        self,
        actual_iters: int,
        expected_iters: int,
        initial_loss: Optional[float],
        final_loss: Optional[float],
        reason: str
    ) -> str:
        parts = [
            f"⚠️ 迭代次数不足警告",
            f"",
            f"这个训练记录只跑了 {actual_iters} 轮就停了。",
            f"",
            f"打个比方：你让学生做一套 100 道题的练习册来检验他有没有掌握知识点，",
            f"结果他做了 {actual_iters} 道就说做完了。",
            f"他可能是真的全都会了所以不用做了，但更可能是",
            f"做了几题嫌麻烦就交了，或者中间被打断了。",
            f"",
            f"问题在于：只看前 {actual_iters} 道题的正确率，",
            f"你没法判断他是真的掌握了，还是刚好前 {actual_iters} 题简单，",
            f"或者他根本没认真做。",
            f"",
            f"回到梯度下降的问题上：",
            f"- 梯度下降就像下山，要一步步走到谷底",
            f"- 前几步可能只是在找方向，还没开始真正下坡",
            f"- 如果走到第 {actual_iters} 步就停了，可能还在半山腰",
            f"- 这时候的损失值不是真正的最小值，而是『走到这儿了』的值",
            f"",
            f"具体问题：{reason}",
        ]

        if expected_iters > 0:
            parts.append(f"- 原定计划：{expected_iters} 轮")
        parts.append(f"- 实际完成：{actual_iters} 轮")
        if initial_loss and final_loss:
            drop = initial_loss - final_loss
            drop_pct = (drop / initial_loss * 100) if initial_loss != 0 else 0
            parts.append(
                f"- 损失下降：{initial_loss:.4f} → {final_loss:.4f} "
                f"（下降 {drop:.4f}，{drop_pct:.0f}%）"
            )

        parts.append("")
        parts.append(
            f"⚠️ 风险提醒：如果把这 {actual_iters} 轮的结果当成最终结果，"
            f"会严重高估模型的训练效果，就像学生没做完题你给他打满分一样。"
        )

        return "\n".join(parts)

    def _capture_snapshot(
        self, operation: str, record: TrainingRecord, result: CheckResult, extra: Dict
    ) -> None:
        self.check_snapshots.append({
            "stage": "check",
            "operation": operation,
            "record_id": record.record_id,
            "class_name": record.class_name,
            "data_before": {
                "loss_function": record.loss_function,
                "learning_rate": record.learning_rate,
                "recorded_iterations": record.iterations,
                **extra
            },
            "data_after": {
                "learning_rate_ok": result.learning_rate_ok,
                "convergence_ok": result.convergence_ok,
                "iteration_ok": result.iteration_ok,
                "issues_count": len(result.issues),
                "loss_trend_length": len(result.loss_trend),
            },
            "timestamp": datetime.now().isoformat(),
        })

    def get_check_snapshots(self) -> List[Dict]:
        return self.check_snapshots
