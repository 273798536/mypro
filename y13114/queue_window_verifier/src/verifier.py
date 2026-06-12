from typing import List, Dict, Tuple, Optional
from .models import (
    ParamRow, Unit, IntermediateStep, UnitConversion,
    JudgmentChange, JudgmentOutcome, WindowVerdict, ProcessingStatus,
    ExtrapolationIssue,
)
from .param_table import ParamTableManager


UNIT_CONVERSIONS = {
    (Unit.HOUR, Unit.MINUTE): lambda v: v * 60.0,
    (Unit.MINUTE, Unit.HOUR): lambda v: v / 60.0,
}


def convert_unit(value: float, from_unit: Unit, to_unit: Unit) -> Tuple[float, UnitConversion]:
    if from_unit == to_unit:
        conv = UnitConversion(
            from_unit=from_unit, to_unit=to_unit,
            from_value=value, to_value=value,
            conversion_formula=f"{value} {from_unit.value} = {value} {to_unit.value}",
        )
        return value, conv
    key = (from_unit, to_unit)
    if key not in UNIT_CONVERSIONS:
        raise ValueError(
            f"[VERIFY-E003] 不支持的单位换算: {from_unit.value} -> {to_unit.value}"
        )
    result = UNIT_CONVERSIONS[key](value)
    formula_map = {
        (Unit.HOUR, Unit.MINUTE): f"{value} 小时 × 60 = {result} 分钟",
        (Unit.MINUTE, Unit.HOUR): f"{value} 分钟 ÷ 60 = {result} 小时",
    }
    conv = UnitConversion(
        from_unit=from_unit, to_unit=to_unit,
        from_value=value, to_value=result,
        conversion_formula=formula_map.get(key, f"{value}({from_unit}) -> {result}({to_unit})"),
    )
    return result, conv


class QueueWindowConfig:
    def __init__(self, window_id: str, window_name: str,
                 arrival_rate_row_id: str, service_time_row_id: str,
                 window_count_row_id: str, wait_threshold_row_id: str,
                 utilization_weight_row_id: Optional[str] = None):
        self.window_id = window_id
        self.window_name = window_name
        self.arrival_rate_row_id = arrival_rate_row_id
        self.service_time_row_id = service_time_row_id
        self.window_count_row_id = window_count_row_id
        self.wait_threshold_row_id = wait_threshold_row_id
        self.utilization_weight_row_id = utilization_weight_row_id


class QueueWindowVerifier:
    def __init__(self, params_a: ParamTableManager, params_b: ParamTableManager):
        self.params_a = params_a
        self.params_b = params_b
        self._step_counter = 0
        self._judgment_counter = 0
        self._issue_counter = 0
        self._verdict_counter = 0
        self.judgments: List[JudgmentChange] = []
        self.extrapolation_issues: List[ExtrapolationIssue] = []
        self.window_verdicts: List[WindowVerdict] = []

    def _next_step_id(self) -> str:
        self._step_counter += 1
        return f"STEP-{self._step_counter:04d}"

    def _next_judgment_id(self) -> str:
        self._judgment_counter += 1
        return f"JUD-{self._judgment_counter:04d}"

    def _next_issue_id(self) -> str:
        self._issue_counter += 1
        return f"EXT-{self._issue_counter:04d}"

    def _check_extrapolation(self, window_id: str, row: ParamRow,
                             impact_scope: List[str]) -> Optional[ExtrapolationIssue]:
        if not row.valid_range:
            return None
        v = row.param_value
        vmin = row.valid_range.get("min")
        vmax = row.valid_range.get("max")
        direction = None
        if vmin is not None and v < vmin:
            direction = "UNDERFLOW"
        if vmax is not None and v > vmax:
            direction = "OVERFLOW"
        if not direction:
            return None
        issue = ExtrapolationIssue(
            issue_id=self._next_issue_id(),
            window_id=window_id,
            param_name=row.param_name,
            row_id=row.row_id,
            source_line=row.source_line,
            extrapolated_value=v,
            valid_min=vmin,
            valid_max=vmax,
            direction=direction,
            impact_scope=impact_scope,
            impact_description=(
                f"参数「{row.param_name}」={v}{row.unit.value} "
                f"{'低于下限' if direction == 'UNDERFLOW' else '高于上限'} "
                f"有效区间[{vmin}, {vmax}], "
                f"影响窗口排队强度和等待时间评估"
            ),
        )
        self.extrapolation_issues.append(issue)
        return issue

    def _calc_window(self, config: QueueWindowConfig,
                     params: ParamTableManager,
                     label: str) -> Tuple[float, JudgmentOutcome, List[IntermediateStep], List[str]]:
        steps: List[IntermediateStep] = []
        issue_ids: List[str] = []

        arr_row = params.get_row(config.arrival_rate_row_id)
        svc_row = params.get_row(config.service_time_row_id)
        win_row = params.get_row(config.window_count_row_id)
        thr_row = params.get_row(config.wait_threshold_row_id)

        impact_scope = [
            f"{config.window_name}·到达率",
            f"{config.window_name}·服务时长",
            f"{config.window_name}·窗口数",
            f"{config.window_name}·等待阈值",
        ]
        for r in [arr_row, svc_row, win_row, thr_row]:
            issue = self._check_extrapolation(config.window_id, r, impact_scope)
            if issue:
                issue_ids.append(issue.issue_id)

        arr_rate = arr_row.param_value
        svc_time_min = svc_row.param_value
        svc_time_hour, conv1 = convert_unit(svc_time_min, Unit.MINUTE, Unit.HOUR)
        s1 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 服务时长单位换算",
            description="将平均服务时长从分钟换算为小时，以便与到达率（人/小时）匹配",
            inputs={"平均服务时长(分钟)": svc_time_min},
            conversions=[conv1],
            calculation=conv1.conversion_formula,
            result_value=svc_time_hour,
            result_unit=Unit.HOUR,
            source_row_ids=[svc_row.row_id],
        )
        steps.append(s1)

        service_rate_per_window = 1.0 / svc_time_hour if svc_time_hour > 0 else 0.0
        s2 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 单窗口服务率",
            description="每小时每个窗口能服务的人数",
            inputs={"平均服务时长(小时)": svc_time_hour},
            calculation=f"μ = 1 / {svc_time_hour:.6f} = {service_rate_per_window:.4f} 人/小时",
            result_value=service_rate_per_window,
            result_unit=Unit.PERSON,
            source_row_ids=[svc_row.row_id],
        )
        steps.append(s2)

        window_count = win_row.param_value
        total_service_rate = service_rate_per_window * window_count
        s3 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 系统总服务率",
            description="所有窗口合计每小时能服务的人数",
            inputs={"单窗口服务率": service_rate_per_window, "窗口数": window_count},
            calculation=f"总μ = {service_rate_per_window:.4f} × {window_count} = {total_service_rate:.4f} 人/小时",
            result_value=total_service_rate,
            result_unit=Unit.PERSON,
            source_row_ids=[svc_row.row_id, win_row.row_id],
        )
        steps.append(s3)

        traffic_intensity = arr_rate / total_service_rate if total_service_rate > 0 else float("inf")
        s4 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 排队强度 ρ",
            description="到达率与总服务率的比值，用于判断系统稳定性（ρ<1 稳定）",
            inputs={"到达率(人/小时)": arr_rate, "总服务率": total_service_rate},
            calculation=f"ρ = {arr_rate} / {total_service_rate:.4f} = {traffic_intensity:.4f}",
            result_value=traffic_intensity,
            result_unit=Unit.RATIO,
            source_row_ids=[arr_row.row_id, svc_row.row_id, win_row.row_id],
        )
        steps.append(s4)

        if traffic_intensity >= 1.0:
            wait_time_hour = float("inf")
            wait_time_min = float("inf")
        else:
            avg_queue_len = (traffic_intensity ** 2) / (1.0 - traffic_intensity)
            wait_time_hour = avg_queue_len / arr_rate if arr_rate > 0 else 0.0
        wait_time_min_conv, conv2 = convert_unit(wait_time_hour, Unit.HOUR, Unit.MINUTE)
        wait_time_min = wait_time_min_conv
        s5 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 平均等待时间",
            description="用 M/M/c 模型估算排队中的平均等待时长",
            inputs={"排队强度 ρ": traffic_intensity, "到达率": arr_rate},
            conversions=[conv2] if conv2.from_unit != conv2.to_unit else [],
            calculation=(
                f"Lq = ρ²/(1-ρ) = {traffic_intensity**2:.4f}/"
                f"{max(1-traffic_intensity, 1e-9):.4f} = "
                f"{(traffic_intensity**2 / max(1-traffic_intensity, 1e-9)):.4f} 人\n"
                f"Wq = Lq / λ × 60 = {wait_time_min:.2f} 分钟"
                if traffic_intensity < 1.0 else "ρ ≥ 1, 等待时间发散(无穷大)"
            ),
            result_value=wait_time_min,
            result_unit=Unit.MINUTE,
            source_row_ids=[arr_row.row_id, svc_row.row_id, win_row.row_id],
        )
        steps.append(s5)

        threshold = thr_row.param_value
        weighted_score = 0.0
        wait_score = 100.0 if wait_time_min <= threshold * 0.5 else (
            70.0 if wait_time_min <= threshold else (
                40.0 if wait_time_min <= threshold * 1.5 else 10.0
            )
        )
        util_weight = 1.0
        if config.utilization_weight_row_id:
            uw_row = params.get_row(config.utilization_weight_row_id)
            util_weight = uw_row.weight
            issue = self._check_extrapolation(
                config.window_id, uw_row,
                [f"{config.window_name}·利用率权重", f"{config.window_name}·最终得分"]
            )
            if issue:
                issue_ids.append(issue.issue_id)
        utilization_score = traffic_intensity * 100.0 if traffic_intensity <= 1.0 else 100.0
        weighted_score = wait_score * thr_row.weight + utilization_score * util_weight
        weighted_score = weighted_score / (thr_row.weight + util_weight)
        s6 = IntermediateStep(
            step_id=self._next_step_id(),
            step_name=f"[{label}] 加权综合评分",
            description="等待时间得分与利用率得分按参数表权重加权",
            inputs={
                "等待得分": wait_score,
                "等待阈值权重": thr_row.weight,
                "利用率得分": round(utilization_score, 2),
                "利用率权重": util_weight,
            },
            calculation=(
                f"score = ({wait_score} × {thr_row.weight} + "
                f"{utilization_score:.2f} × {util_weight}) / "
                f"({thr_row.weight} + {util_weight}) = {weighted_score:.2f}"
            ),
            result_value=weighted_score,
            result_unit=Unit.SCORE,
            source_row_ids=[thr_row.row_id] + (
                [config.utilization_weight_row_id] if config.utilization_weight_row_id else []
            ),
        )
        steps.append(s6)

        if traffic_intensity >= 1.0:
            outcome = JudgmentOutcome.FAIL
        elif weighted_score >= 80.0:
            outcome = JudgmentOutcome.PASS
        elif weighted_score >= 60.0:
            outcome = JudgmentOutcome.WARN
        else:
            outcome = JudgmentOutcome.FAIL

        return weighted_score, outcome, steps, issue_ids

    def verify_window(self, config: QueueWindowConfig) -> WindowVerdict:
        score_a, outcome_a, steps_a, issues_a = self._calc_window(config, self.params_a, "A组")
        score_b, outcome_b, steps_b, issues_b = self._calc_window(config, self.params_b, "B组")

        all_issue_ids = list(dict.fromkeys(issues_a + issues_b))

        if outcome_a != outcome_b:
            changed_param_names = []
            for row_id in [config.arrival_rate_row_id, config.service_time_row_id,
                           config.window_count_row_id, config.wait_threshold_row_id]:
                a_row = self.params_a.rows.get(row_id)
                b_row = self.params_b.rows.get(row_id)
                if a_row and b_row:
                    if abs(a_row.param_value - b_row.param_value) > 1e-9:
                        changed_param_names.append(f"{a_row.param_name}数值变更")
                    if abs(a_row.weight - b_row.weight) > 1e-9:
                        changed_param_names.append(f"{a_row.param_name}权重变更")
            expl_parts = [
                f"{config.window_name} 的判定从「{outcome_a.value}」变为「{outcome_b.value}」",
                f"综合评分从 {score_a:.2f} 变为 {score_b:.2f}",
            ]
            if changed_param_names:
                expl_parts.append("触发参数: " + "、".join(changed_param_names))
            related_steps = [s.step_id for s in steps_b[-2:]]
            judgment = JudgmentChange(
                judgment_id=self._next_judgment_id(),
                rule_name=f"排队窗口判定::{config.window_name}",
                old_outcome=outcome_a,
                new_outcome=outcome_b,
                affected_window_ids=[config.window_id],
                explanation="；".join(expl_parts),
                related_param_changes=changed_param_names,
                related_steps=related_steps,
            )
            self.judgments.append(judgment)

        if outcome_b == JudgmentOutcome.FAIL:
            handling = ProcessingStatus.NEED_EVIDENCE
        elif outcome_b == JudgmentOutcome.WARN:
            handling = ProcessingStatus.TODO
        else:
            handling = ProcessingStatus.HANDLED

        verdict = WindowVerdict(
            window_id=config.window_id,
            window_name=config.window_name,
            final_score=score_b,
            outcome=outcome_b,
            handling_status=handling,
            steps=steps_a + steps_b,
            issues=all_issue_ids,
            evidence_ids=[],
        )
        self.window_verdicts.append(verdict)
        return verdict
