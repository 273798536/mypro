#!/usr/bin/env python3
import json
import sys

import click
from tabulate import tabulate

from database import init_db, get_db_path
from audit_engine import import_questions
from review_ops import (
    correct_question, confirm_question, batch_review,
    get_wrong_questions, get_missing_answers,
    get_history, list_batches, list_review_sessions
)


def _print_table(rows, headers=None):
    if rows:
        click.echo(tabulate(rows, headers=headers or "keys", tablefmt="grid"))
    else:
        click.echo("(无数据)")


@click.group()
@click.version_option("1.0.0")
def cli():
    """二分搜索边界审计 - 学生错题审计工具"""
    init_db()


@cli.command()
@click.option("--file", "-f", "data_file", type=click.Path(exists=True), help="JSON 数据文件路径")
@click.option("--name", "-n", "batch_name", required=True, help="批次名称")
@click.option("--demo", is_flag=True, help="使用内置演示数据")
def import_batch(data_file, batch_name, demo):
    """导入一批学生答题数据"""
    if data_file:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif demo:
        data = get_demo_data()
    else:
        data = json.load(sys.stdin)

    source = data_file or "(stdin" if not demo else "(demo"
    result = import_questions(data, batch_name, source)

    click.echo(f"\n批次 '{batch_name}' 导入完成")
    click.echo(f"  批次ID: {result['batch_id']}")
    click.echo(f"  总数: {result['total']}")
    click.echo(f"  成功处理: {result['processed']}")
    click.echo(f"  错误数: {result['errors']}")
    click.echo(f"  缺失字段数: {result['missing_count']}")
    if result["missing_details"]:
        click.echo("\n缺失字段详情:")
        for qid, fields in result["missing_details"][:10]:
            click.echo(f"  题目 {qid}: 缺少 {', '.join(fields)}")
        if len(result["missing_details"]) > 10:
            click.echo(f"  ... 还有 {len(result['missing_details']) - 10} 条")
    click.echo(f"\n数据库路径: {get_db_path()}")


@cli.command("list-batches")
def list_batches_cmd():
    """列出所有导入批次"""
    batches = list_batches()
    rows = [[b["id"], b["batch_name"], b["imported_at"], b["total_records"], b["status"]] for b in batches]
    _print_table(rows, headers=["ID", "批次名", "导入时间", "记录数", "状态"])


@cli.command("wrong")
@click.option("--batch", "-b", type=int, help="批次ID")
@click.option("--review", is_flag=True, help="显示复核入口")
def wrong_questions(batch, review):
    """列出错题（含复核入口）"""
    questions = get_wrong_questions(batch)
    if not questions:
        click.echo(f"共发现 {len(questions)} 道错题/异常题:")

    rows = []
    for q in questions:
        status = "错误" if q["is_correct"] == 0 else f"异常"
        bc_count = len(q["boundary_cases"])
        rows.append([
            q["db_id"], q["question_id"], q["student_id"] or "-",
            (q["question_text"][:30] + "...") if len(q["question_text"]) > 30 else q["question_text"],
            q["student_answer"] or "-",
            q["correct_answer"] or "-",
            status,
            f"{bc_count}个" if bc_count else "-"
        ])
    _print_table(rows, headers=["DB_ID", "题目ID", "学生", "题目", "学生答案", "正确答案", "状态", "边界"])

    if questions and review:
        click.echo("\n===== 复核入口 =====")
        for q in questions:
            click.echo(f"\n--- 题目 {q['db_id']} ({q['question_id']}) ---")
            click.echo(f"  python audit_cli.py correct --id {q['db_id']} --field correct_answer --new-value <正确值>")
            click.echo(f"  python audit_cli.py confirm --id {q['db_id']}")
            click.echo(f"  python audit_cli.py history --id {q['db_id']}")
            if q["boundary_cases"]:
                click.echo(f"  边界案例 (影响结果):")
                for bc in q["boundary_cases"]:
                    click.echo(f"    - {bc['description']}")
                    click.echo(f"      原: {bc['original_result']}")
                    click.echo(f"      边界: {bc['boundary_result']}")


@cli.command()
@click.option("--batch", "-b", type=int, help="批次ID")
def missing(batch):
    """列出缺失答案缺口（待风控分析师补充）"""
    missing_list = get_missing_answers(batch)
    if missing_list:
        click.echo(f"共 {len(missing_list)} 条缺失待补充:")
    rows = []
    for m in missing_list:
        rows.append([
            m["db_id"], m["question_id"], m["student_id"] or "-",
            m["question_text"][:40] if len(m["question_text"]) > 40 else m["question_text"],
            m["missing_field"], m["noted_at"]
        ])
    _print_table(rows, headers=["DB_ID", "题目ID", "学生", "题目", "缺失字段", "记录时间"])

    if missing_list:
        click.echo("\n补充方法:")
        click.echo("  python audit_cli.py correct --id <DB_ID> --field correct_answer --new-value '<值>")


@cli.command()
@click.option("--id", "qid", type=int, required=True, help="题目 DB_ID")
@click.option("--field", "-f", "field_name", required=True,
              type=click.Choice(["question_text", "student_answer", "correct_answer", "is_correct"]),
              help="要修正的字段")
@click.option("--new-value", "-v", required=True, help="新值")
@click.option("--note", help="备注")
def correct(qid, field_name, new_value, note):
    """修正单个题目字段（复核入口之一）"""
    result = correct_question(qid, field_name, new_value, note)
    if result["success"]:
        click.echo(f"修正成功:")
        click.echo(f"  题目ID: {result['question_id']}")
        click.echo(f"  字段: {result['field']}")
        click.echo(f"  旧值: {result['old_value']}")
        click.echo(f"  新值: {result['new_value']}")
        click.echo(f"\n查看历史: python audit_cli.py history --id {qid}")
    else:
        click.echo(f"修正失败: {result.get('error', '未知错误')}", err=True)


@cli.command()
@click.option("--id", "qid", type=int, required=True, help="题目 DB_ID")
@click.option("--note", help="备注")
def confirm(qid, note):
    """确认题目无误"""
    result = confirm_question(qid, note)
    if result["success"]:
        click.echo(f"确认成功: 题目 {result['question_id']}")
    else:
        click.echo(f"确认失败: {result.get('error', '未知错误')}", err=True)


@cli.command()
@click.option("--batch", "-b", type=int, required=True, help="批次ID")
@click.option("--corrections", "corr_file", type=click.Path(exists=True),
              help="批量修正 JSON 文件，格式: [{\"question_db_id\":.., \"field\":.., \"new_value\":.., \"note\":..}]")
@click.option("--note", help="复核备注")
def review(batch, corr_file, note):
    """批量复核（改变判断会记录历史对比）"""
    corrections = None
    if corr_file:
        with open(corr_file, "r", encoding="utf-8") as f:
            corrections = json.load(f)

    result = batch_review(batch, corrections, note)
    if not result["success"]:
        click.echo(f"复核失败: {result.get('error')}", err=True)
        return

    click.echo(f"\n复核会话 #{result['review_session_id']} 完成")
    click.echo(f"  处理数: {result['total_reviewed']}")
    click.echo(f"  变更数: {result['changed_count']}")
    click.echo(f"  失败数: {len(result['failed'])}")
    click.echo(f"  缺失待补: {len(result['missing'])}")

    if result["changes"]:
        click.echo("\n===== 变更历史对比 =====")
        for ch in result["changes"]:
            click.echo(f"  题目 {ch['question_id']}: {ch['field']}")
            click.echo(f"    前: {ch['old_value']}")
            click.echo(f"    后: {ch['new_value']}")

    if result["missing"]:
        click.echo("\n===== 缺失待补充 =====")
        for m in result["missing"]:
            click.echo(f"  题目 {m['db_id']} ({m['question_id']}): 缺少 {', '.join(m['missing_fields'])}")

    if result["failed"]:
        click.echo("\n===== 失败项 =====")
        for f in result["failed"]:
            click.echo(f"  {f['item']}: {f['reason']}")

    click.echo(f"\n查看复核历史: python audit_cli.py list-reviews --batch {batch}")


@cli.command("list-reviews")
@click.option("--batch", "-b", type=int, help="批次ID")
def list_reviews(batch):
    """列出复核会话及历史对比"""
    sessions = list_review_sessions(batch)
    if sessions:
        click.echo(f"共 {len(sessions)} 次复核:")

    for s in sessions:
        click.echo(f"\n--- 复核 #{s['id']} ---")
        click.echo(f"  时间: {s['reviewed_at']}")
        click.echo(f"  复核人: {s['reviewed_by']}")
        click.echo(f"  处理: {s['total_reviewed']}, 变更: {s['changed_count']}")
        if s["changes"]:
            click.echo(f"  历史对比:")
            for ch in s["changes"]:
                click.echo(f"    题目 {ch['question_id']} {ch['field_name']}:")
                click.echo(f"      前: {ch['before_value']}")
                click.echo(f"      后: {ch['after_value']}")


@cli.command()
@click.option("--id", "qid", type=int, required=True, help="题目 DB_ID")
def history(qid):
    """查看单题完整历史（导入、修正、确认、边界）"""
    result = get_history(qid)
    if "error" in result:
        click.echo(f"错误: {result['error']}", err=True)
        return

    q = result["question"]
    click.echo(f"\n===== 题目 {q['id']} ({q['question_id']}) =====")
    click.echo(f"  题目: {q['question_text']}")
    click.echo(f"  学生答案: {q['student_answer']}")
    click.echo(f"  正确答案: {q['correct_answer']}")
    click.echo(f"  判定: {'正确' if q['is_correct'] == 1 else '错误' if q['is_correct'] == 0 else '未知'}")
    has_err_str = f"是 - {q['error_note']}" if q['has_error'] else "否"
    click.echo(f"  异常: {has_err_str}")

    if result["corrections"]:
        click.echo(f"\n--- 修正记录 ---")
        for c in result["corrections"]:
            click.echo(f"  [{c['corrected_at']}] {c['corrected_by']}: {c['field_name']}")
            click.echo(f"    旧: {c['old_value']}")
            click.echo(f"    新: {c['new_value']}")
            if c.get("note"):
                click.echo(f"    备注: {c['note']}")

    if result["confirmations"]:
        click.echo(f"\n--- 确认记录 ---")
        for c in result["confirmations"]:
            click.echo(f"  [{c['confirmed_at']}] {c['confirmed_by']}"
                       f"{': ' + c['note'] if c.get('note') else ''}")

    if result["boundary_cases"]:
        click.echo(f"\n--- 边界案例 (改变判定的结果) ---")
        for bc in result["boundary_cases"]:
            marker = " [改变结果]" if bc["result_changed"] else ""
            click.echo(f"  [{bc['case_type']}{marker}: {bc['description']}")
            click.echo(f"    原: {bc['original_result']}")
            click.echo(f"    边界: {bc['boundary_result']}")

    if result["review_changes"]:
        click.echo(f"\n--- 复核变更历史 ---")
        for rc in result["review_changes"]:
            click.echo(f"  [{rc['reviewed_at']}] {rc['reviewed_by']}: {rc['field_name']}")
            click.echo(f"    前: {rc['before_value']}")
            click.echo(f"    后: {rc['after_value']}")

    click.echo(f"\n复核入口命令:")
    click.echo(f"  python audit_cli.py correct --id {qid} --field correct_answer --new-value '<值>")
    click.echo(f"  python audit_cli.py confirm --id {qid}")


def get_demo_data():
    return [
        {
            "question_id": "MATH001",
            "student_id": "S001",
            "question_text": "计算: 10 / 2 + 3",
            "student_answer": "8",
            "correct_answer": "8"
        },
        {
            "question_id": "MATH002",
            "student_id": "S002",
            "question_text": "解方程: 2x + 5 = 15，求 x 的值（x 取值范围为 1 到 10",
            "student_answer": "6",
            "correct_answer": "5"
        },
        {
            "question_id": "MATH003",
            "student_id": "S003",
            "question_text": "计算: 24 / (6 - 6)",
            "student_answer": "24/0",
            "correct_answer": "无意义（除零）"
        },
        {
            "question_id": "MATH004",
            "student_id": "S004",
            "question_text": "计算: -5 + 3",
            "student_answer": "2",
            "correct_answer": "-2"
        },
        {
            "question_id": "MATH005",
            "student_id": "S005",
            "question_text": "小明有 15 个苹果，分给 3 个同学，每人几个？",
            "student_answer": "5",
            "correct_answer": ""
        },
        {
            "question_id": "MATH006",
            "student_id": "S006",
            "question_text": "",
            "student_answer": "42",
            "correct_answer": "42"
        },
        {
            "question_id": "MATH007",
            "student_id": "S007",
            "question_text": "比较大小: -3 和 -5，哪个大？填入较大的数是？",
            "student_answer": "-5",
            "correct_answer": "-3"
        },
        {
            "question_id": "MATH008",
            "student_id": "S008",
            "question_text": "填空: 温度从零下 3 度上升 5 度后是多少度？",
            "student_answer": "",
            "correct_answer": "2"
        },
        {
            "question_id": "MATH009",
            "student_id": "S009",
            "question_text": "  计算:  100/(4*5 - 20  ",
            "student_answer": " 100/0 ",
            "correct_answer": "undefined"
        },
        {
            "question_id": "MATH010",
            "student_id": "S010",
            "question_text": "一个数在 0 到 100 之间，比 50 大，比 52 小，这个数可能是？",
            "student_answer": "50",
            "correct_answer": "51"
        }
    ]


if __name__ == "__main__":
    cli()
