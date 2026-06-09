import os
import sys
import json
import click

from irt_calibration.importer import Importer
from irt_calibration.calibrator import IRTCalibrator, trace_item_chain
from irt_calibration.reviewer import Reviewer
from irt_calibration.report import ReportGenerator


@click.group(help="课程难度 IRT 校准系统 - CLI 入口")
def cli():
    pass


@cli.command(help="从 CSV/JSON 导入学生错题数据")
@click.argument("input_file", type=click.Path(exists=True))
@click.option("--format", "fmt", type=click.Choice(["csv", "json"]), default=None,
              help="文件格式，默认根据扩展名推断")
@click.option("--output-gaps", type=click.Path(), default="output/gap_records.json",
              show_default=True, help="风控补录缺口文件输出路径")
@click.option("--summary/--no-summary", default=True, help="导入后打印摘要")
def import_data(input_file, fmt, output_gaps, summary):
    if fmt is None:
        fmt = "json" if input_file.lower().endswith(".json") else "csv"

    importer = Importer()
    if fmt == "csv":
        record = importer.import_from_csv(input_file)
    else:
        record = importer.import_from_json(input_file)

    gap_msg = importer.export_gaps_for_risk(output_gaps)
    click.echo(gap_msg)

    if summary:
        click.echo("=" * 50)
        click.echo(importer.summarize_import())

    out_path = os.path.join(os.path.dirname(output_gaps), "last_record.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(record.to_dict(), f, ensure_ascii=False, indent=2, default=str)
    click.echo(f"\n已保存处理记录至: {out_path}")


@cli.command(help="执行 IRT 难度校准（含约束校验、误差分析）")
@click.option("--record-file", type=click.Path(exists=True), default="output/last_record.json",
              show_default=True, help="处理记录 JSON 文件路径")
@click.option("--output", "output_dir", type=click.Path(), default="output/report",
              show_default=True, help="报告输出目录")
def calibrate(record_file, output_dir):
    record = _load_record(record_file)
    calibrator = IRTCalibrator(record)
    calibrator.run()

    click.echo("校准完成。")
    click.echo(f"  - 有效答题: {record.valid_answer_count}")
    click.echo(f"  - 题目数: {len(record.items)}")
    click.echo(f"  - 学生数: {len(record.students)}")
    click.echo(f"  - 约束校验: {len(record.constraint_checks)} 项")
    click.echo(f"  - 误差指标: {len(record.error_analysis)} 项")
    click.echo(f"  - 检测问题: {len(record.issues)} 条")

    report = ReportGenerator(record, output_dir)
    md_path = report.generate_all()
    click.echo(f"\n报告已生成: {md_path}")

    out_path = os.path.join(output_dir, "assets", "processing_record.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(record.to_dict(), f, ensure_ascii=False, indent=2, default=str)


@cli.group(help="复核入口：修正答题、解决问题、重跑校准")
def review():
    pass


@review.command("list-issues", help="列出未处理的问题")
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
@click.option("--all/--unresolved-only", default=False, help="显示全部/仅未解决")
def review_list_issues(record_file, all):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    issues = reviewer.list_issues(unresolved_only=not all)
    if not issues:
        click.echo("没有问题记录。")
        return
    for i in issues:
        status = "✅已解决" if i.resolved else ("👀已复核" if i.reviewed else "🔴待处理")
        click.echo(f"[{i.issue_id}] {i.issue_type.value} ({i.severity}) {status}")
        click.echo(f"    描述: {i.description}")
        click.echo(f"    建议: {i.suggestion}")
        if i.related_student_id or i.related_item_id:
            click.echo(f"    关联: 学生={i.related_student_id}, 题目={i.related_item_id}")


@review.command("show-issue", help="查看单个问题的详细回溯链路")
@click.argument("issue_id")
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
def review_show_issue(issue_id, record_file):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    info = reviewer.show_issue(issue_id)
    if not info:
        click.echo(f"未找到问题ID: {issue_id}")
        return
    click.echo(json.dumps(info, ensure_ascii=False, indent=2, default=str))


@review.command("fix-answer", help="修正或补录某学生某题的对错")
@click.argument("student_id")
@click.argument("item_id")
@click.argument("is_correct", type=click.IntRange(0, 1))
@click.option("--reviewer", "reviewer_name", default="风控分析师", show_default=True)
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
@click.option("--re-calibrate/--no-re-calibrate", default=False, help="修正后是否立即重跑校准")
def review_fix_answer(student_id, item_id, is_correct, reviewer_name, record_file, re_calibrate):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    reviewer.fix_answer(student_id, item_id, is_correct, reviewer_name)
    if re_calibrate:
        reviewer.re_calibrate()
    _save_record(record, record_file)
    click.echo(f"已修正 学生={student_id} 题目={item_id} → {'对' if is_correct else '错'}")


@review.command("resolve", help="标记问题为已解决（无需重跑）")
@click.argument("issue_id")
@click.argument("note")
@click.option("--reviewer", "reviewer_name", default="风控分析师", show_default=True)
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
def review_resolve(issue_id, note, reviewer_name, record_file):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    ok = reviewer.mark_issue_resolved(issue_id, note, reviewer_name)
    if ok:
        _save_record(record, record_file)
        click.echo(f"问题 {issue_id} 已标记解决。")
    else:
        click.echo(f"未找到问题 {issue_id}。")


@review.command("trace-student", help="回溯单个学生的完整答题链路")
@click.argument("student_id")
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
def review_trace_student(student_id, record_file):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    info = reviewer.trace_student(student_id)
    click.echo(json.dumps(info, ensure_ascii=False, indent=2, default=str))


@review.command("trace-item", help="回溯单道题的完整答题链路")
@click.argument("item_id")
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
def review_trace_item(item_id, record_file):
    record = _load_record(record_file)
    info = trace_item_chain(record, item_id)
    click.echo(json.dumps(info, ensure_ascii=False, indent=2, default=str))


@review.command("re-calibrate", help="基于复核后的记录重新校准并出报告")
@click.option("--record-file", type=click.Path(exists=True), default="output/report/assets/processing_record.json",
              show_default=True)
@click.option("--output", "output_dir", type=click.Path(), default="output/report",
              show_default=True)
def review_re_calibrate(record_file, output_dir):
    record = _load_record(record_file)
    reviewer = Reviewer(record)
    reviewer.re_calibrate()
    report = ReportGenerator(record, output_dir)
    md_path = report.generate_all()
    _save_record(record, os.path.join(output_dir, "assets", "processing_record.json"))
    click.echo(f"复核后重新校准完成，报告: {md_path}")


@cli.command(help="一键全流程：导入样例数据 → 校准 → 出报告")
@click.option("--input", "input_file", type=click.Path(exists=True), default="samples/math_quiz_2026.csv",
              show_default=True)
@click.option("--output", "output_dir", type=click.Path(), default="output/report",
              show_default=True)
def all_in_one(input_file, output_dir):
    click.echo("== 步骤 1/3: 导入学生错题数据 ==")
    importer = Importer()
    if input_file.lower().endswith(".json"):
        record = importer.import_from_json(input_file)
    else:
        record = importer.import_from_csv(input_file)
    click.echo(importer.summarize_import())
    gap_path = os.path.join(output_dir, "gap_records.json")
    click.echo(importer.export_gaps_for_risk(gap_path))

    click.echo("\n== 步骤 2/3: IRT 校准（约束校验 + 误差分析共用同一批记录） ==")
    calibrator = IRTCalibrator(record)
    calibrator.run()
    click.echo(f"校准完成: 约束校验 {len(record.constraint_checks)} 项 / 误差指标 {len(record.error_analysis)} 项 / 问题 {len(record.issues)} 条")

    click.echo("\n== 步骤 3/3: 生成报告（图表 + 表格 + 普通话解释） ==")
    report = ReportGenerator(record, output_dir)
    md_path = report.generate_all()
    click.echo(f"\n✅ 全流程完成！")
    click.echo(f"   报告文件: {md_path}")
    click.echo(f"   缺口清单: {gap_path}")
    click.echo(f"   计算草稿: {os.path.join(output_dir, 'assets', 'calculation_draft.csv')}")
    click.echo(f"   原始记录: {os.path.join(output_dir, 'assets', 'processing_record.json')}")
    click.echo("\n复核入口提示:")
    click.echo("   列出问题: python main.py review list-issues")
    click.echo("   修正答案: python main.py review fix-answer S001 Q008 1 --re-calibrate")
    click.echo("   追溯学生: python main.py review trace-student S004")
    click.echo("   追溯题目: python main.py review trace-item Q008")


def _load_record(path):
    from irt_calibration.models import (
        ProcessingRecord, StudentAnswer, Item, Student, Issue, IssueType, RecordStatus
    )
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    record = ProcessingRecord()
    record.record_id = data.get("record_id", record.record_id)
    record.batch_id = data.get("batch_id", record.batch_id)
    record.created_at = data.get("created_at", record.created_at)
    raw_status = data.get("status", "待处理")
    rstatus = RecordStatus.PENDING
    for s in RecordStatus:
        if raw_status == s.value or raw_status == s.name or raw_status == f"RecordStatus.{s.name}":
            rstatus = s
            break
    record.status = rstatus
    record.valid_answer_count = data.get("valid_answer_count", 0)
    record.excluded_answer_count = data.get("excluded_answer_count", 0)
    record.gap_count = data.get("gap_count", 0)
    record.constraint_checks = data.get("constraint_checks", [])
    record.error_analysis = data.get("error_analysis", [])
    record.review_notes = data.get("review_notes", [])
    record.irt_params = data.get("irt_params", {})
    record.raw_materials_ref = data.get("raw_materials", [])

    for a_data in data.get("student_answers", []):
        record.student_answers.append(StudentAnswer(
            student_id=a_data.get("student_id", ""),
            item_id=a_data.get("item_id", ""),
            is_correct=a_data.get("is_correct"),
            timestamp=a_data.get("timestamp"),
            source=a_data.get("source", "导入"),
            raw_row=a_data.get("raw_row"),
        ))

    for iid, i_data in data.get("items", {}).items():
        record.items[iid] = Item(
            item_id=i_data.get("item_id", iid),
            course_id=i_data.get("course_id", "COURSE-DEFAULT"),
            item_name=i_data.get("item_name", iid),
            difficulty=i_data.get("difficulty"),
            discrimination=i_data.get("discrimination", 1.0),
            guess=i_data.get("guess", 0.0),
            response_count=i_data.get("response_count", 0),
            correct_rate=i_data.get("correct_rate"),
        )

    for sid, s_data in data.get("students", {}).items():
        record.students[sid] = Student(
            student_id=s_data.get("student_id", sid),
            ability=s_data.get("ability"),
            ability_se=s_data.get("ability_se"),
            answered_count=s_data.get("answered_count", 0),
            valid_answers=s_data.get("valid_answers", 0),
        )

    for i_data in data.get("issues", []):
        raw_type = i_data.get("issue_type", "历史答案缺失")
        itype = None
        for t in IssueType:
            if raw_type == t.value or raw_type == t.name or raw_type == f"IssueType.{t.name}":
                itype = t
                break
        if itype is None:
            itype = IssueType.MISSING_HISTORY
        record.issues.append(Issue(
            issue_id=i_data.get("issue_id"),
            issue_type=itype,
            severity=i_data.get("severity", "medium"),
            description=i_data.get("description", ""),
            related_student_id=i_data.get("related_student_id"),
            related_item_id=i_data.get("related_item_id"),
            affected_records=i_data.get("affected_records", []),
            suggestion=i_data.get("suggestion", ""),
            reviewed=i_data.get("reviewed", False),
            review_note=i_data.get("review_note"),
            resolved=i_data.get("resolved", False)
        ))

    return record


def _save_record(record, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record.to_dict(), f, ensure_ascii=False, indent=2, default=str)


if __name__ == "__main__":
    cli()
