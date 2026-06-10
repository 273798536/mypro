from typing import List, Dict, Tuple, Optional
from datetime import datetime
from src.models import (
    Reagent, WeighingRecord, FeedingStep, ExperimentRecord,
    SafetyNote, ValidationIssue, ValidationResult
)
import uuid


def _make_issue(
    issue_type: str,
    severity: str,
    batch_id: str,
    description: str,
    readable_description: str,
    affected_material: Optional[str] = None,
    affected_step: Optional[int] = None,
    raw_fields: Optional[List[str]] = None,
    before_value: Optional[str] = None,
    after_value: Optional[str] = None,
    safety_related: bool = False,
    suggestion: Optional[str] = None
) -> ValidationIssue:
    return ValidationIssue(
        issue_id=str(uuid.uuid4())[:8],
        issue_type=issue_type,
        severity=severity,
        batch_id=batch_id,
        description=description,
        readable_description=readable_description,
        affected_material=affected_material,
        affected_step=affected_step,
        raw_fields=raw_fields or [],
        before_value=before_value,
        after_value=after_value,
        safety_related=safety_related,
        suggestion=suggestion
    )


def _parse_time(t: Optional[str]) -> Optional[datetime]:
    if not t:
        return None
    for fmt in ["%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(t, fmt)
        except ValueError:
            continue
    return None


def check_blank_control(
    batch_id: str,
    steps: List[FeedingStep],
    reagent_map: Dict[str, Reagent]
) -> Tuple[List[ValidationIssue], bool]:
    issues = []
    blank_steps = [s for s in steps if s.is_blank_control]

    if len(blank_steps) == 0:
        issues.append(_make_issue(
            issue_type="blank_control_missing",
            severity="high",
            batch_id=batch_id,
            description="No blank control feeding step found in experiment",
            readable_description="本批次实验未设置空白对照实验步骤。按照规程要求，每批次反应均需同步进行空白对照试验，以排除溶剂和试剂本底对检测结果的干扰。",
            affected_material="整批次",
            affected_step=None,
            raw_fields=["is_blank_control"],
            suggestion="请补充空白对照实验记录，或说明本批次不进行空白对照的特殊原因并由QA签字确认。"
        ))
        return issues, False

    for step in blank_steps:
        if step.ph_value is None:
            issues.append(_make_issue(
                issue_type="blank_control_ph_missing",
                severity="medium",
                batch_id=batch_id,
                description=f"Blank control step {step.step_no} missing pH value",
                readable_description=f"第{step.step_no}步（{step.reagent_name}）为空白对照步骤，但未记录pH值。空白对照的pH数据用于判定反应体系本底酸度，缺失可能影响结果判读。",
                affected_material=step.reagent_name,
                affected_step=step.step_no,
                raw_fields=["ph_value"],
                before_value="未记录",
                after_value=None,
                suggestion="请补测并记录该空白对照步骤的pH值。"
            ))
        if step.actual_time is None:
            issues.append(_make_issue(
                issue_type="blank_control_time_missing",
                severity="medium",
                batch_id=batch_id,
                description=f"Blank control step {step.step_no} missing actual time",
                readable_description=f"第{step.step_no}步（{step.reagent_name}）为空白对照步骤，但未记录实际投料时间。",
                affected_material=step.reagent_name,
                affected_step=step.step_no,
                raw_fields=["actual_time"],
                suggestion="请根据原始记录补录该步骤的实际投料时间。"
            ))

    return issues, len(issues) == 0


def check_ph_range(
    batch_id: str,
    steps: List[FeedingStep],
    reagent_map: Dict[str, Reagent]
) -> Tuple[List[ValidationIssue], bool]:
    issues = []
    for step in steps:
        reagent = reagent_map.get(step.reagent_id)
        if not reagent or step.ph_value is None:
            if step.ph_value is None and not step.is_blank_control:
                issues.append(_make_issue(
                    issue_type="ph_missing",
                    severity="medium",
                    batch_id=batch_id,
                    description=f"Step {step.step_no} ({step.reagent_name}) missing pH measurement",
                    readable_description=f"第{step.step_no}步投料（物料：{step.reagent_name}）后未测定并记录反应液的pH值。",
                    affected_material=step.reagent_name,
                    affected_step=step.step_no,
                    raw_fields=["ph_value"],
                    before_value="未记录",
                    suggestion="请补测该步投料后体系的pH值并记录。"
                ))
            continue

        if reagent.ph_range_min is not None and reagent.ph_range_max is not None:
            if step.ph_value < reagent.ph_range_min or step.ph_value > reagent.ph_range_max:
                issues.append(_make_issue(
                    issue_type="ph_out_of_range",
                    severity="high",
                    batch_id=batch_id,
                    description=(
                        f"Step {step.step_no} pH {step.ph_value} out of range "
                        f"[{reagent.ph_range_min}, {reagent.ph_range_max}] for {step.reagent_name}"
                    ),
                    readable_description=(
                        f"第{step.step_no}步投料后测得pH值为{step.ph_value}，"
                        f"超出{step.reagent_name}允许的pH范围"
                        f"（{reagent.ph_range_min} ~ {reagent.ph_range_max}）。"
                        f"请确认是操作异常还是工艺要求。"
                    ),
                    affected_material=step.reagent_name,
                    affected_step=step.step_no,
                    raw_fields=["ph_value", "ph_range_min", "ph_range_max"],
                    before_value=f"pH={step.ph_value}",
                    after_value=None,
                    suggestion=(
                        f"请核对第{step.step_no}步操作是否正确，"
                        f"如为工艺特殊要求需由工艺员补充说明并签字。"
                    )
                ))
    return issues, len(issues) == 0


def check_feeding_order(
    batch_id: str,
    steps: List[FeedingStep]
) -> Tuple[List[ValidationIssue], bool]:
    issues = []
    sorted_steps = sorted(steps, key=lambda s: s.step_no)

    for i in range(1, len(sorted_steps)):
        prev = sorted_steps[i - 1]
        curr = sorted_steps[i]
        prev_t = _parse_time(prev.actual_time)
        curr_t = _parse_time(curr.actual_time)

        if prev_t and curr_t and curr_t < prev_t:
            issues.append(_make_issue(
                issue_type="feeding_order_reversed",
                severity="high",
                batch_id=batch_id,
                description=(
                    f"Step {curr.step_no} fed at {curr.actual_time}, "
                    f"before step {prev.step_no} at {prev.actual_time}"
                ),
                readable_description=(
                    f"投料顺序存在异常：第{curr.step_no}步（{curr.reagent_name}）的实际投料时间"
                    f"为{curr.actual_time}，早于前一步第{prev.step_no}步（{prev.reagent_name}）的"
                    f"{prev.actual_time}。请确认投料顺序是否正确或记录时间是否有误。"
                ),
                affected_material=f"{prev.reagent_name} / {curr.reagent_name}",
                affected_step=curr.step_no,
                raw_fields=["actual_time", "step_no"],
                before_value=f"step{prev.step_no}:{prev.actual_time}, step{curr.step_no}:{curr.actual_time}",
                suggestion="请核对原始操作记录，如投料顺序错误需评估对反应结果的影响；如为记录笔误请更正并签字。"
            ))

        if prev.planned_time and curr.planned_time:
            prev_pt = _parse_time(prev.planned_time)
            curr_pt = _parse_time(curr.planned_time)
            if prev_pt and curr_pt and curr_pt < prev_pt:
                issues.append(_make_issue(
                    issue_type="planned_order_reversed",
                    severity="low",
                    batch_id=batch_id,
                    description=(
                        f"Planned order reversed: step {curr.step_no} planned at {curr.planned_time}, "
                        f"before step {prev.step_no} at {prev.planned_time}"
                    ),
                    readable_description=(
                        f"工艺规程中设定的计划投料顺序异常：第{curr.step_no}步的计划时间"
                        f"早于第{prev.step_no}步，请复核工艺文件。"
                    ),
                    affected_material=f"{prev.reagent_name} / {curr.reagent_name}",
                    affected_step=curr.step_no,
                    raw_fields=["planned_time", "step_no"],
                    suggestion="请检查工艺规程的投料时间设定。"
                ))

    for step in sorted_steps:
        if step.actual_time is None and step.planned_time:
            issues.append(_make_issue(
                issue_type="actual_feeding_time_missing",
                severity="medium",
                batch_id=batch_id,
                description=f"Step {step.step_no} ({step.reagent_name}) missing actual feeding time",
                readable_description=(
                    f"第{step.step_no}步投料（物料：{step.reagent_name}）未记录实际投料时间。"
                    f"工艺规程中该步计划投料时间为{step.planned_time}。"
                ),
                affected_material=step.reagent_name,
                affected_step=step.step_no,
                raw_fields=["actual_time"],
                before_value="未记录",
                suggestion="请根据原始操作记录补录实际投料时间。"
            ))

    return issues, len(issues) == 0


def check_reaction_time(
    batch_id: str,
    experiment: ExperimentRecord
) -> Tuple[List[ValidationIssue], bool]:
    issues = []

    if experiment.actual_start_time and not experiment.actual_end_time:
        issues.append(_make_issue(
            issue_type="reaction_end_time_missing",
            severity="high",
            batch_id=batch_id,
            description="Reaction actual end time not recorded",
            readable_description=(
                f"本批次实验实际开始时间为{experiment.actual_start_time}，"
                f"但未记录反应实际结束时间。反应时间是关键工艺参数，缺失将无法评估反应是否完全。"
            ),
            affected_material="整批次",
            raw_fields=["actual_end_time"],
            before_value="未记录",
            suggestion="请根据原始记录补录反应实际结束时间，并计算反应时长。"
        ))

    if experiment.actual_start_time and experiment.actual_end_time:
        start = _parse_time(experiment.actual_start_time)
        end = _parse_time(experiment.actual_end_time)
        if start and end:
            actual_duration = (end - start).total_seconds() / 60.0
            if experiment.planned_start_time and experiment.planned_end_time:
                ps = _parse_time(experiment.planned_start_time)
                pe = _parse_time(experiment.planned_end_time)
                if ps and pe:
                    planned_duration = (pe - ps).total_seconds() / 60.0
                    deviation = abs(actual_duration - planned_duration) / planned_duration * 100
                    if deviation > 20:
                        issues.append(_make_issue(
                            issue_type="reaction_duration_deviation",
                            severity="medium",
                            batch_id=batch_id,
                            description=(
                                f"Reaction duration {actual_duration:.0f}min deviates >20% from "
                                f"planned {planned_duration:.0f}min"
                            ),
                            readable_description=(
                                f"本批次实际反应时长为{actual_duration:.0f}分钟，"
                                f"工艺规程要求为{planned_duration:.0f}分钟，"
                                f"偏差达{deviation:.1f}%（超过允许范围±20%）。"
                            ),
                            affected_material="整批次",
                            raw_fields=["actual_start_time", "actual_end_time", "planned_start_time", "planned_end_time"],
                            before_value=f"实际{actual_duration:.0f}分钟 vs 计划{planned_duration:.0f}分钟",
                            suggestion="请评估反应时长偏差对产品质量的影响，并由工艺员出具偏差处理意见。"
                        ))

    if not experiment.actual_start_time:
        issues.append(_make_issue(
            issue_type="reaction_start_time_missing",
            severity="high",
            batch_id=batch_id,
            description="Reaction actual start time not recorded",
            readable_description="本批次实验未记录反应实际开始时间。",
            affected_material="整批次",
            raw_fields=["actual_start_time"],
            before_value="未记录",
            suggestion="请根据原始操作记录补录反应实际开始时间。"
        ))

    return issues, len(issues) == 0


def check_weighing_completeness(
    batch_id: str,
    weighing_records: List[WeighingRecord]
) -> Tuple[List[ValidationIssue], bool]:
    issues = []
    for wr in weighing_records:
        if wr.weighed_amount is None:
            issues.append(_make_issue(
                issue_type="weighed_amount_missing",
                severity="high",
                batch_id=batch_id,
                description=f"Weighing record {wr.record_id} ({wr.reagent_name}) missing weighed amount",
                readable_description=(
                    f"称量单中物料「{wr.reagent_name}」未填写实际称量量。"
                    f"工艺理论用量为{wr.theoretical_amount} {wr.theoretical_unit or ''}。"
                ),
                affected_material=wr.reagent_name,
                raw_fields=["weighed_amount"],
                before_value="未记录",
                suggestion="请查找原始称量记录并补录实际称量量。"
            ))
        if wr.amount_unit is None and wr.weighed_amount is not None:
            issues.append(_make_issue(
                issue_type="weighing_unit_missing",
                severity="medium",
                batch_id=batch_id,
                description=f"Weighing record {wr.record_id} ({wr.reagent_name}) missing amount unit",
                readable_description=(
                    f"称量单中物料「{wr.reagent_name}」的实际称量量（{wr.weighed_amount}）未填写计量单位。"
                ),
                affected_material=wr.reagent_name,
                raw_fields=["amount_unit"],
                before_value=f"{wr.weighed_amount}（无单位）",
                suggestion="请确认并补录计量单位（g / mL等）。"
            ))
        if wr.theoretical_unit is None and wr.theoretical_amount is not None:
            issues.append(_make_issue(
                issue_type="theoretical_unit_missing",
                severity="low",
                batch_id=batch_id,
                description=f"Weighing record {wr.record_id} ({wr.reagent_name}) missing theoretical unit",
                readable_description=(
                    f"称量单中物料「{wr.reagent_name}」的理论用量（{wr.theoretical_amount}）未填写计量单位。"
                ),
                affected_material=wr.reagent_name,
                raw_fields=["theoretical_unit"],
                before_value=f"{wr.theoretical_amount}（无单位）",
                suggestion="请根据工艺规程补录理论用量的计量单位。"
            ))
        if wr.weigh_time is None:
            issues.append(_make_issue(
                issue_type="weigh_time_missing",
                severity="low",
                batch_id=batch_id,
                description=f"Weighing record {wr.record_id} ({wr.reagent_name}) missing weigh time",
                readable_description=(
                    f"称量单中物料「{wr.reagent_name}」未记录称量时间。"
                ),
                affected_material=wr.reagent_name,
                raw_fields=["weigh_time"],
                before_value="未记录",
                suggestion="请根据原始记录补录称量时间。"
            ))
        if wr.operator is None:
            issues.append(_make_issue(
                issue_type="weighing_operator_missing",
                severity="low",
                batch_id=batch_id,
                description=f"Weighing record {wr.record_id} ({wr.reagent_name}) missing operator",
                readable_description=(
                    f"称量单中物料「{wr.reagent_name}」未记录称量操作人员。"
                ),
                affected_material=wr.reagent_name,
                raw_fields=["operator"],
                before_value="未记录",
                suggestion="请补录该物料称量操作人的姓名。"
            ))

    return issues, len(issues) == 0


def apply_safety_notes(
    issues: List[ValidationIssue],
    safety_notes: List[SafetyNote],
    reagents: Optional[List[Reagent]] = None
) -> Tuple[List[ValidationIssue], List[ValidationIssue], Dict[str, SafetyNote]]:
    original_issues = [i for i in issues]
    remaining_issues = list(issues)
    applied_notes: Dict[str, SafetyNote] = {}
    reagent_map = {r.reagent_id: r for r in (reagents or [])}

    judgment_notes = [n for n in safety_notes if n.affects_judgment]

    for note in judgment_notes:
        target_reagent_name = None
        if note.reagent_id:
            r = reagent_map.get(note.reagent_id)
            if r:
                target_reagent_name = r.name

        for idx in range(len(remaining_issues) - 1, -1, -1):
            issue = remaining_issues[idx]
            matched = False

            if note.batch_id != issue.batch_id:
                continue

            if target_reagent_name and issue.affected_material:
                if target_reagent_name in issue.affected_material or issue.affected_material in target_reagent_name:
                    matched = True
            elif not note.reagent_id:
                matched = True

            if matched:
                issue.safety_related = True
                issue.after_value = note.judgment_change_reason
                applied_notes[issue.issue_id] = note
                remaining_issues.pop(idx)

    return original_issues, remaining_issues, applied_notes


def run_full_validation(
    experiment: ExperimentRecord,
    reagents: List[Reagent],
    weighing_records: List[WeighingRecord],
    safety_notes: List[SafetyNote],
    apply_notes: bool = True
) -> ValidationResult:
    batch_id = experiment.batch_id
    reagent_map = {r.reagent_id: r for r in reagents}

    all_issues: List[ValidationIssue] = []

    blank_issues, blank_ok = check_blank_control(batch_id, experiment.feeding_steps, reagent_map)
    all_issues.extend(blank_issues)

    ph_issues, ph_ok = check_ph_range(batch_id, experiment.feeding_steps, reagent_map)
    all_issues.extend(ph_issues)

    order_issues, order_ok = check_feeding_order(batch_id, experiment.feeding_steps)
    all_issues.extend(order_issues)

    time_issues, time_ok = check_reaction_time(batch_id, experiment)
    all_issues.extend(time_issues)

    weigh_issues, weigh_ok = check_weighing_completeness(batch_id, weighing_records)
    all_issues.extend(weigh_issues)

    if apply_notes:
        _, final_issues, _ = apply_safety_notes(all_issues, safety_notes, reagents)
    else:
        final_issues = all_issues

    has_high = any(i.severity == "high" for i in final_issues)
    is_pass = not has_high and len(final_issues) <= 3

    return ValidationResult(
        batch_id=batch_id,
        is_pass=is_pass,
        issues=final_issues,
        blank_control_ok=all(i.issue_type not in ("blank_control_missing", "blank_control_ph_missing", "blank_control_time_missing") for i in final_issues),
        ph_all_ok=all(i.issue_type not in ("ph_out_of_range", "ph_missing") for i in final_issues),
        feeding_order_ok=all(i.issue_type not in ("feeding_order_reversed", "planned_order_reversed", "actual_feeding_time_missing") for i in final_issues),
        reaction_time_ok=all(i.issue_type not in ("reaction_end_time_missing", "reaction_start_time_missing", "reaction_duration_deviation") for i in final_issues),
        weighing_complete=all(i.issue_type not in ("weighed_amount_missing", "weighing_unit_missing", "theoretical_unit_missing", "weigh_time_missing", "weighing_operator_missing") for i in final_issues),
    )


def get_validation_without_safety(
    experiment: ExperimentRecord,
    reagents: List[Reagent],
    weighing_records: List[WeighingRecord],
    safety_notes: List[SafetyNote]
) -> Tuple[ValidationResult, ValidationResult, Dict[str, SafetyNote]]:
    result_before = run_full_validation(experiment, reagents, weighing_records, safety_notes, apply_notes=False)
    result_after = run_full_validation(experiment, reagents, weighing_records, safety_notes, apply_notes=True)

    reagent_map = {r.reagent_id: r for r in reagents}
    all_issues_for_notes: List[ValidationIssue] = []
    blank_issues, _ = check_blank_control(experiment.batch_id, experiment.feeding_steps, reagent_map)
    ph_issues, _ = check_ph_range(experiment.batch_id, experiment.feeding_steps, reagent_map)
    order_issues, _ = check_feeding_order(experiment.batch_id, experiment.feeding_steps)
    time_issues, _ = check_reaction_time(experiment.batch_id, experiment)
    weigh_issues, _ = check_weighing_completeness(experiment.batch_id, weighing_records)
    all_issues_for_notes.extend(blank_issues + ph_issues + order_issues + time_issues + weigh_issues)

    _, _, applied = apply_safety_notes(all_issues_for_notes, safety_notes, reagents)

    return result_before, result_after, applied
