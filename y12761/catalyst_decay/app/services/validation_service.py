from app.models import (
    Batch, DataIssue, ExperimentRecord, TemperatureCurve,
    TemperatureUnit, IssueType, IssueSeverity
)
from app.utils.temperature_utils import to_celsius
from app.utils.precision_utils import (
    check_weighing_precision, human_readable_precision_issue,
    human_readable_unit_mixed_issue, human_readable_missing_field
)
from sqlalchemy.orm import Session
from typing import List


def run_full_validation(db: Session, batch_id: int) -> List[DataIssue]:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"批次ID {batch_id} 不存在")

    existing_issues = db.query(DataIssue).filter(DataIssue.batch_id == batch_id).all()
    for issue in existing_issues:
        db.delete(issue)
    db.commit()

    issues = []
    issues.extend(_validate_experiment_records(db, batch_id))
    issues.extend(_validate_temperature_curves(db, batch_id))
    issues.extend(_validate_batch_completeness(db, batch_id))

    for issue in issues:
        db.add(issue)
    db.commit()

    return issues


def _validate_experiment_records(db: Session, batch_id: int) -> List[DataIssue]:
    issues = []
    experiments = db.query(ExperimentRecord).filter(
        ExperimentRecord.batch_id == batch_id
    ).all()

    detected_units = set()
    for exp in experiments:
        if exp.temperature_unit and exp.temperature_unit != TemperatureUnit.UNKNOWN:
            detected_units.add(exp.temperature_unit.value)

    unit_mixed = len(detected_units) > 1

    for exp in experiments:
        file_name = exp.source_sheet or "未知文件"
        sheet_name = exp.source_sheet or "未知表"
        row_num = exp.source_row or 0

        if exp.sample_weight is None:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.MISSING_FIELD,
                severity=IssueSeverity.ERROR,
                location=f"记录{exp.record_no or row_num}: 样品质量",
                description="样品质量为空",
                human_readable_desc=human_readable_missing_field(
                    "sample_weight", file_name, sheet_name, row_num
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))
        else:
            precision_issues = check_weighing_precision(
                exp.sample_weight, exp.weighing_precision, exp.sample_weight_unit
            )
            for pi in precision_issues:
                issues.append(DataIssue(
                    batch_id=batch_id,
                    issue_type=IssueType.WEIGHING_PRECISION_LOW,
                    severity=IssueSeverity.WARNING,
                    location=f"记录{exp.record_no or row_num}: 称量精度",
                    description=pi,
                    human_readable_desc=human_readable_precision_issue(
                        exp.sample_weight, exp.sample_weight_unit
                    ),
                    source_file=file_name,
                    source_sheet=sheet_name,
                    source_row=row_num
                ))

        if exp.temperature_raw and exp.temperature_unit == TemperatureUnit.UNKNOWN:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.TEMPERATURE_UNIT_MIXED,
                severity=IssueSeverity.WARNING,
                location=f"记录{exp.record_no or row_num}: 反应温度",
                description=f"温度单位不明: {exp.temperature_raw}",
                human_readable_desc=human_readable_unit_mixed_issue(
                    exp.temperature_raw, file_name, sheet_name, row_num
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

        if unit_mixed and exp.temperature_unit != TemperatureUnit.UNKNOWN:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.TEMPERATURE_UNIT_MIXED,
                severity=IssueSeverity.WARNING,
                location=f"记录{exp.record_no or row_num}: 反应温度单位不一致",
                description=f"该记录温度单位为 {exp.temperature_unit.value}, 同批次其他记录使用了不同单位: {detected_units}",
                human_readable_desc=(
                    f"温度单位混用提醒: 这条记录使用的是 {exp.temperature_unit.value}, "
                    f"但同批次其他数据用了 {', '.join(detected_units)} 这些单位. "
                    f"(来源: {sheet_name} 第{row_num}行). 请确认是否需要统一换算"
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

        if exp.initial_activity is None:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.MISSING_FIELD,
                severity=IssueSeverity.ERROR,
                location=f"记录{exp.record_no or row_num}: 初始活性",
                description="初始活性为空",
                human_readable_desc=human_readable_missing_field(
                    "initial_activity", file_name, sheet_name, row_num
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

    return issues


def _validate_temperature_curves(db: Session, batch_id: int) -> List[DataIssue]:
    issues = []
    curves = db.query(TemperatureCurve).filter(
        TemperatureCurve.batch_id == batch_id
    ).order_by(TemperatureCurve.time_point.asc()).all()

    detected_units = set()
    for c in curves:
        if c.temperature_unit and c.temperature_unit != TemperatureUnit.UNKNOWN:
            detected_units.add(c.temperature_unit.value)

    unit_mixed = len(detected_units) > 1

    for idx, c in enumerate(curves):
        sheet_name = c.source_sheet or "温度曲线表"
        row_num = c.source_row or (idx + 2)
        file_name = sheet_name

        if c.temperature_raw and c.temperature_unit == TemperatureUnit.UNKNOWN:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.UNIT_AMBIGUOUS,
                severity=IssueSeverity.WARNING,
                location=f"温度曲线 {c.time_point}h: 温度单位",
                description=f"原始温度数据 '{c.temperature_raw}' 缺少明确单位",
                human_readable_desc=human_readable_unit_mixed_issue(
                    c.temperature_raw, file_name, sheet_name, row_num
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

        if unit_mixed and c.temperature_unit != TemperatureUnit.UNKNOWN:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.TEMPERATURE_UNIT_MIXED,
                severity=IssueSeverity.WARNING,
                location=f"温度曲线 {c.time_point}h: 单位混用",
                description=f"该点温度单位为 {c.temperature_unit.value}, 曲线中同时存在 {detected_units}",
                human_readable_desc=(
                    f"温度曲线单位不一致: {c.time_point}小时处温度用的是 {c.temperature_unit.value}, "
                    f"但整根曲线混合了 {', '.join(detected_units)} 这些单位. "
                    f"位置在曲线数据表 {sheet_name} 第{row_num}行"
                ),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

        if c.temperature_value is not None:
            celsius = to_celsius(c.temperature_value, c.temperature_unit)
            if celsius is not None and (celsius < -50 or celsius > 1500):
                issues.append(DataIssue(
                    batch_id=batch_id,
                    issue_type=IssueType.ABNORMAL_CURVE,
                    severity=IssueSeverity.WARNING,
                    location=f"温度曲线 {c.time_point}h: 温度数值异常",
                    description=f"温度值 {c.temperature_value}{c.temperature_unit.value} 超出常规范围",
                    human_readable_desc=(
                        f"温度曲线异常点: {c.time_point}小时处记录的温度是 {c.temperature_raw}, "
                        f"换算成摄氏度约 {celsius:.1f}°C, 这超出了催化反应常见的温度范围. "
                        f"请核对原始记录 (来源: {sheet_name} 第{row_num}行)"
                    ),
                    source_file=file_name,
                    source_sheet=sheet_name,
                    source_row=row_num
                ))

    for i in range(1, len(curves)):
        prev = curves[i - 1]
        curr = curves[i]
        if prev.temperature_value and curr.temperature_value:
            prev_c = to_celsius(prev.temperature_value, prev.temperature_unit)
            curr_c = to_celsius(curr.temperature_value, curr.temperature_unit)
            if prev_c and curr_c and abs(curr_c - prev_c) > 200:
                sheet_name = curr.source_sheet or "温度曲线表"
                row_num = curr.source_row or (i + 2)
                issues.append(DataIssue(
                    batch_id=batch_id,
                    issue_type=IssueType.ABNORMAL_CURVE,
                    severity=IssueSeverity.WARNING,
                    location=f"温度曲线 {prev.time_point}h → {curr.time_point}h: 温度突变",
                    description=f"相邻两点温差超过200°C ({prev_c:.1f}°C → {curr_c:.1f}°C)",
                    human_readable_desc=(
                        f"温度曲线有跳跃: 从 {prev.time_point}h 到 {curr.time_point}h, "
                        f"温度从 {prev_c:.1f}°C 骤变到 {curr_c:.1f}°C, "
                        f"相差超过 200°C. 如果不是人为控温, 这很可能是抄录错误. "
                        f"(来源: {sheet_name} 第{row_num}行附近)"
                    ),
                    source_file=sheet_name,
                    source_sheet=sheet_name,
                    source_row=row_num
                ))

    return issues


def _validate_batch_completeness(db: Session, batch_id: int) -> List[DataIssue]:
    issues = []
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    exps = db.query(ExperimentRecord).filter(ExperimentRecord.batch_id == batch_id).count()
    curves = db.query(TemperatureCurve).filter(TemperatureCurve.batch_id == batch_id).count()

    if exps == 0:
        issues.append(DataIssue(
            batch_id=batch_id,
            issue_type=IssueType.MISSING_FIELD,
            severity=IssueSeverity.ERROR,
            location="批次数据",
            description="该批次没有导入任何实验记录",
            human_readable_desc="这个批次还没有实验数据, 请先导入催化剂活性实验记录表",
            source_file="批次信息",
            source_sheet=None,
            source_row=None
        ))

    if curves == 0 and exps > 0:
        issues.append(DataIssue(
            batch_id=batch_id,
            issue_type=IssueType.MISSING_FIELD,
            severity=IssueSeverity.INFO,
            location="温度曲线数据",
            description="未检测到温度曲线数据",
            human_readable_desc="已导入实验记录, 但未找到温度-时间曲线数据, 如果有曲线数据请一并导入",
            source_file="批次信息",
            source_sheet=None,
            source_row=None
        ))

    return issues


def resolve_issue(db: Session, issue_id: int, remark: str) -> DataIssue:
    issue = db.query(DataIssue).filter(DataIssue.id == issue_id).first()
    if not issue:
        raise ValueError(f"问题ID {issue_id} 不存在")

    issue.is_resolved = True
    issue.resolved_remark = remark
    db.commit()
    db.refresh(issue)
    return issue


def get_issues(db: Session, batch_id: int, unresolved_only: bool = False) -> List[DataIssue]:
    query = db.query(DataIssue).filter(DataIssue.batch_id == batch_id)
    if unresolved_only:
        query = query.filter(DataIssue.is_resolved == False)
    return query.order_by(DataIssue.severity.desc(), DataIssue.created_at.desc()).all()
