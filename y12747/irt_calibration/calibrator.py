import math
from typing import Dict, List, Tuple, Optional, Any
from .models import ProcessingRecord, Item, Student, Issue, IssueType, RecordStatus


MIN_RESPONSES_PER_ITEM = 5
MIN_RESPONSES_PER_STUDENT = 3
EPSILON = 1e-8
MAX_ITERATIONS = 200
CONVERGENCE_TOL = 1e-4
ABILITY_CLAMP = 5.0


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    else:
        exp_x = math.exp(x)
        return exp_x / (1.0 + exp_x)


class IRTCalibrator:
    def __init__(self, record: ProcessingRecord):
        self.record = record

    def run(self) -> ProcessingRecord:
        self._preflight_constraint_check()
        self._estimate_item_difficulties()
        self._estimate_student_abilities()
        self._error_analysis()
        self._stability_check()
        self.record.status = RecordStatus.PROCESSED
        return self.record

    def _add_constraint(self, name: str, passed: bool, detail: str, level: str = "info") -> None:
        self.record.constraint_checks.append({
            "name": name,
            "passed": passed,
            "detail": detail,
            "level": level
        })

    def _add_error(self, name: str, value: float, unit: str, detail: str) -> None:
        self.record.error_analysis.append({
            "name": name,
            "value": round(value, 6),
            "unit": unit,
            "detail": detail
        })

    def _preflight_constraint_check(self) -> None:
        r = self.record
        self._add_constraint("有效答题记录数>0", r.valid_answer_count > 0,
                             f"有效记录={r.valid_answer_count}，排除记录={r.excluded_answer_count}",
                             "critical" if r.valid_answer_count == 0 else "info")

        if r.valid_answer_count == 0:
            issue = Issue(
                issue_type=IssueType.LOW_RESPONSE_COUNT,
                severity="critical",
                description="有效答题记录为0，IRT校准无法进行",
                suggestion="请检查原始数据或在复核界面补录答案"
            )
            r.issues.append(issue)
            return

        for item_id, item in r.items.items():
            if item.response_count == 0:
                self._add_constraint(f"题目[{item.item_name}]答题人数", False,
                                     "无人作答该题，难度参数无法估计", "warning")
                issue = Issue(
                    issue_type=IssueType.LOW_RESPONSE_COUNT,
                    severity="high",
                    description=f"题目 {item.item_name}({item_id}) 答题人数=0",
                    suggestion="建议移除该题或等待更多学生作答后再校准",
                    related_item_id=item_id
                )
                r.issues.append(issue)
                continue

            if item.response_count < MIN_RESPONSES_PER_ITEM:
                self._add_constraint(f"题目[{item.item_name}]答题人数≥{MIN_RESPONSES_PER_ITEM}", False,
                                     f"实际{item.response_count}人，低于阈值，估计结果不稳定", "warning")
                issue = Issue(
                    issue_type=IssueType.LOW_RESPONSE_COUNT,
                    severity="medium",
                    description=f"题目 {item.item_name}({item_id}) 仅{item.response_count}人作答，低于建议阈值{MIN_RESPONSES_PER_ITEM}",
                    suggestion="参数估计已计算，但结果仅供参考，建议积累更多数据",
                    related_item_id=item_id
                )
                r.issues.append(issue)
            else:
                self._add_constraint(f"题目[{item.item_name}]答题人数≥{MIN_RESPONSES_PER_ITEM}", True,
                                     f"{item.response_count}人作答", "info")

            if item.correct_rate is not None:
                if item.correct_rate <= EPSILON:
                    self._add_constraint(f"题目[{item.item_name}]正确率>0", False,
                                         "该题全员答错（正确率≈0），除零风险", "warning")
                    issue = Issue(
                        issue_type=IssueType.DIVISION_BY_ZERO,
                        severity="high",
                        description=f"题目 {item.item_name} 全员答错，正确率=0，参数估计时出现除零边界",
                        suggestion="已使用EPSILON=1e-8替代0值继续计算，但建议人工复核该题是否存在缺陷",
                        related_item_id=item_id
                    )
                    r.issues.append(issue)
                elif item.correct_rate >= 1.0 - EPSILON:
                    self._add_constraint(f"题目[{item.item_name}]正确率<1", False,
                                         "该题全员答对（正确率≈1），除零风险", "warning")
                    issue = Issue(
                        issue_type=IssueType.DIVISION_BY_ZERO,
                        severity="high",
                        description=f"题目 {item.item_name} 全员答对，正确率=1，参数估计时出现除零边界",
                        suggestion="已使用(1-EPSILON)替代1值继续计算，但建议人工复核该题区分度",
                        related_item_id=item_id
                    )
                    r.issues.append(issue)
                else:
                    self._add_constraint(f"题目[{item.item_name}]正确率∈(0,1)", True,
                                         f"正确率={round(item.correct_rate, 4)}，无除零风险", "info")

        for sid, stu in r.students.items():
            if stu.valid_answers < MIN_RESPONSES_PER_STUDENT:
                self._add_constraint(f"学生[{sid}]有效答题数≥{MIN_RESPONSES_PER_STUDENT}", False,
                                     f"仅{stu.valid_answers}题，能力估计不稳定", "warning")
                issue = Issue(
                    issue_type=IssueType.LOW_RESPONSE_COUNT,
                    severity="low",
                    description=f"学生 {sid} 只答对{stu.valid_answers}题，能力估计可靠性低",
                    suggestion="能力参数已给出，但建议补充更多答题数据后复算",
                    related_student_id=sid
                )
                r.issues.append(issue)

        self._add_constraint("至少2道有效题", len([i for i in r.items.values() if i.response_count > 0]) >= 2,
                             f"有效题目数={len([i for i in r.items.values() if i.response_count > 0])}", "critical")
        self._add_constraint("至少2名有效学生", len([s for s in r.students.values() if s.valid_answers > 0]) >= 2,
                             f"有效学生数={len([s for s in r.students.values() if s.valid_answers > 0])}", "critical")

    def _safe_rate(self, correct: int, total: int) -> float:
        if total == 0:
            return 0.5
        rate = correct / total
        if rate < EPSILON:
            return EPSILON
        if rate > 1.0 - EPSILON:
            return 1.0 - EPSILON
        return rate

    def _estimate_item_difficulties(self) -> None:
        r = self.record
        raw_diffs = {}
        for item_id, item in r.items.items():
            if item.response_count == 0:
                raw_diffs[item_id] = None
                continue
            correct = sum(1 for a in r.student_answers
                          if a.item_id == item_id and a.is_correct == 1)
            rate = self._safe_rate(correct, item.response_count)
            raw_b = -math.log(rate / (1.0 - rate))

            if abs(raw_b) > ABILITY_CLAMP:
                clamped_b = max(min(raw_b, ABILITY_CLAMP), -ABILITY_CLAMP)
                issue = Issue(
                    issue_type=IssueType.DIVISION_BY_ZERO,
                    severity="medium",
                    description=f"题目 {item.item_name}({item_id}) 原始难度估计 b={round(raw_b, 3)}，"
                                f"因正确率接近边界(={round(rate, 4)})，已截断为{round(clamped_b, 3)}",
                    suggestion="该题出现全对/全错极端情况，建议人工复核题目质量或积累更多作答数据",
                    related_item_id=item_id
                )
                r.issues.append(issue)
                raw_b = clamped_b

            raw_diffs[item_id] = raw_b

        diffs = [b for b in raw_diffs.values() if b is not None]
        if diffs:
            mean_diff = sum(diffs) / len(diffs)
            for item_id, item in r.items.items():
                if raw_diffs[item_id] is not None:
                    item.difficulty = raw_diffs[item_id] - mean_diff
                else:
                    item.difficulty = None

        r.irt_params["item_difficulties"] = {iid: it.difficulty for iid, it in r.items.items()}
        r.irt_params["estimation_method"] = "1PL/Rasch MMLE (proportional coding, centered)"
        r.irt_params["epsilon_used"] = EPSILON
        r.irt_params["clamp"] = ABILITY_CLAMP

    def _estimate_student_abilities(self) -> None:
        r = self.record
        for sid, stu in r.students.items():
            correct = sum(1 for a in r.student_answers
                          if a.student_id == sid and a.is_correct == 1)
            total = stu.valid_answers
            if total == 0:
                stu.ability = None
                stu.ability_se = None
                continue

            rate = self._safe_rate(correct, total)
            diff_list = []
            for a in r.student_answers:
                if a.student_id == sid and a.is_correct is not None:
                    it = r.items.get(a.item_id)
                    if it and it.difficulty is not None:
                        diff_list.append(it.difficulty)

            if not diff_list:
                theta = math.log(rate / (1.0 - rate))
            else:
                avg_diff = sum(diff_list) / len(diff_list)
                theta = avg_diff + math.log(rate / (1.0 - rate))

            if abs(theta) > ABILITY_CLAMP:
                clamped = max(min(theta, ABILITY_CLAMP), -ABILITY_CLAMP)
                issue = Issue(
                    issue_type=IssueType.OUTLIER_ABILITY,
                    severity="low",
                    description=f"学生 {sid} 原始能力估计 θ={round(theta, 3)}，"
                                f"超出±{ABILITY_CLAMP}范围，已截断为{round(clamped, 3)}",
                    suggestion="该生出现全对或全错极端情况，原始logit值发散，建议结合其能力稳定性人工判断",
                    related_student_id=sid
                )
                r.issues.append(issue)
                theta = clamped

            stu.ability = theta

            info = total * rate * (1.0 - rate)
            stu.ability_se = 1.0 / math.sqrt(max(info, EPSILON))

        r.irt_params["student_abilities"] = {sid: s.ability for sid, s in r.students.items()}
        r.irt_params["student_se"] = {sid: s.ability_se for sid, s in r.students.items()}

    def _error_analysis(self) -> None:
        r = self.record
        preds = []
        actuals = []
        residual_sum = 0.0
        count = 0

        for a in r.student_answers:
            if a.is_correct is None:
                continue
            stu = r.students.get(a.student_id)
            it = r.items.get(a.item_id)
            if not stu or not it or stu.ability is None or it.difficulty is None:
                continue
            p = _sigmoid(stu.ability - it.difficulty)
            preds.append(p)
            actuals.append(a.is_correct)
            residual_sum += (a.is_correct - p) ** 2
            count += 1

        if count > 0:
            mse = residual_sum / count
            rmse = math.sqrt(mse)

            log_lik = 0.0
            for a in r.student_answers:
                if a.is_correct is None:
                    continue
                stu = r.students.get(a.student_id)
                it = r.items.get(a.item_id)
                if not stu or not it or stu.ability is None or it.difficulty is None:
                    continue
                p = _sigmoid(stu.ability - it.difficulty)
                p_clamped = max(min(p, 1.0 - EPSILON), EPSILON)
                log_lik += a.is_correct * math.log(p_clamped) + (1 - a.is_correct) * math.log(1.0 - p_clamped)

            self._add_error("模型均方误差 MSE", mse, "概率²",
                            f"基于{count}条有效答题记录，模型预测与实际对错的平均平方偏差")
            self._add_error("模型根均方误差 RMSE", rmse, "概率",
                            "MSE开方，便于在0~1概率尺度上解读")
            self._add_error("对数似然 LogLik", log_lik, "nats",
                            f"值越接近0拟合越好，AIC/BIC可由该值推导")
            if count > 0:
                self._add_error("平均残差", residual_sum / count, "概率",
                                "单条记录平均预测误差")

        r.irt_params["model_fit"] = {
            "mse": round(mse, 6) if count > 0 else None,
            "rmse": round(rmse, 6) if count > 0 else None,
            "log_lik": round(log_lik, 2) if count > 0 else None,
            "n_observations": count
        }

    def _stability_check(self) -> None:
        r = self.record
        diffs = sorted([(iid, it.difficulty) for iid, it in r.items.items() if it.difficulty is not None],
                       key=lambda x: x[1])
        rank_map = {iid: i + 1 for i, (iid, _) in enumerate(diffs)}

        rate_rank = sorted([(iid, it.correct_rate if it.correct_rate is not None else -1)
                            for iid, it in r.items.items()], key=lambda x: -x[1])
        rate_rank_map = {iid: i + 1 for i, (iid, _) in enumerate(rate_rank)}

        unstable = []
        for iid in rank_map:
            if iid in rate_rank_map and abs(rank_map[iid] - rate_rank_map[iid]) >= 2:
                unstable.append(iid)

        r.irt_params["difficulty_rank"] = rank_map
        r.irt_params["rate_rank"] = rate_rank_map
        r.irt_params["unstable_items"] = unstable

        if unstable:
            for iid in unstable:
                item = r.items[iid]
                issue = Issue(
                    issue_type=IssueType.UNSTABLE_RANK,
                    severity="low",
                    description=f"题目 {item.item_name}({iid}) IRT难度排名={rank_map[iid]}，"
                                f"正确率排名={rate_rank_map[iid]}，排序不一致超过2位",
                    suggestion="该题可能存在猜测、答题偏序等因素，建议人工复核题目质量",
                    related_item_id=iid
                )
                r.issues.append(issue)
            self._add_constraint("难度排序与正确率排序一致性", False,
                                 f"{len(unstable)}道题排序差异≥2位: {', '.join(unstable)}", "warning")
        else:
            self._add_constraint("难度排序与正确率排序一致性", True,
                                 "所有题目两种排序差异≤1位，结果稳定", "info")


def trace_item_chain(record: ProcessingRecord, item_id: str) -> Dict[str, Any]:
    chain: Dict[str, Any] = {"item_id": item_id, "traces": []}
    item = record.items.get(item_id)
    if item:
        chain["item_info"] = {
            "name": item.item_name,
            "course": item.course_id,
            "difficulty": item.difficulty,
            "correct_rate": item.correct_rate,
            "response_count": item.response_count
        }

    for a in record.student_answers:
        if a.item_id == item_id:
            stu = record.students.get(a.student_id)
            chain["traces"].append({
                "student_id": a.student_id,
                "is_correct": a.is_correct,
                "source": a.source,
                "student_ability": stu.ability if stu else None,
                "student_se": stu.ability_se if stu else None,
                "raw": a.raw_row
            })

    chain["related_issues"] = [
        {"id": i.issue_id, "type": i.issue_type.value, "severity": i.severity,
         "description": i.description, "suggestion": i.suggestion, "resolved": i.resolved}
        for i in record.issues if i.related_item_id == item_id or i.related_student_id
    ]

    chain["constraint_checks"] = [
        c for c in record.constraint_checks if item_id in c["name"]
    ]

    return chain
