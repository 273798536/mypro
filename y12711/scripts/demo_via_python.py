#!/usr/bin/env python3
"""
同事从空目录跑通全流程的 Python 脚本示例（直接调库，不走 CLI）。

用法：
    python3 scripts/demo_via_python.py
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from multi_param_interpreter.db import Database
from multi_param_interpreter.importer import DataImporter
from multi_param_interpreter.engine import ParamEngine
from multi_param_interpreter.reviewer import Reviewer, ReviewAction
from multi_param_interpreter.report import ReportGenerator
from multi_param_interpreter.models import DataSource

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "demo_py.db")


def main():
    print("=" * 60)
    print("多目标调参解释器 · Python 库调用示例")
    print("=" * 60)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    db = Database(DB_PATH)
    importer = DataImporter(db)
    engine = ParamEngine(db)
    reviewer = Reviewer(db)
    reporter = ReportGenerator(db)

    print("\n[1] 导入三种口径 ...")
    for fname, src in [
        ("samples/historical_answers.json", DataSource.HISTORICAL_ANSWERS),
        ("samples/student_mistakes.csv", DataSource.STUDENT_MISTAKES),
        ("samples/question_list.tsv", DataSource.QUESTION_LIST),
    ]:
        result = importer.import_file(os.path.join(ROOT, fname), src)
        print(f"  - {fname}: {result['success']}/{result['total']} 成功, "
              f"{result['skipped']} 跳过, {result['errors']} 错误")
        if result["skipped_details"]:
            for d in result["skipped_details"][:2]:
                print(f"      跳过例: 题{d.get('question_id')} — {d.get('reason')}")

    print("\n[2] 执行计算 ...")
    result = engine.run_all()
    print(f"  批次 {result['batch_id']}: {result['total']} 题, "
          f"{result['calculated']} 参数, {result['edge_cases']} 边界异常")

    print("\n[3] 查看 Q1003 公式前后差异（外推越界样例）...")
    trace = reviewer.get_formula_trace("Q1003")
    for t in trace:
        if not t.get("parameter_name"):
            continue
        print(f"  [{t['parameter_name']}] raw={t['raw_value']} → adj={t['adjusted_value']}")
        print(f"    公式: {t['formula_before']}  →  {t['formula_after']}")
        print(f"    判定: {t['judgment_before']} → {t['judgment_after']}")

    print("\n[4] 程序模拟教研编辑复核（Q1003 的 difficulty）...")
    edges = db.list_edge_cases()
    q1003_diff = next(
        (e for e in edges if e["question_id"] == "Q1003" and e["parameter_name"] == "difficulty"),
        None,
    )
    if q1003_diff:
        r = reviewer.review(
            q1003_diff["id"],
            ReviewAction.ADJUST,
            "人工复核：原始录入错误，实际难度应为 0.85",
            parameter_adjustment={"adjusted_value": 0.85},
            reviewed_by="demo-editor",
        )
        print(f"  复核结果: {r}")

    print("\n[5] 生成投委会 JSON 摘要（关键指标）...")
    summary = reporter.generate_executive_summary()["summary"]
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    print("\n[6] 单题详细报告（Q1003，JSON）...")
    qrep = reporter.generate_question_report("Q1003")
    print(json.dumps(qrep, ensure_ascii=False, indent=2))

    print(f"\n完成。数据库文件：{DB_PATH}")


if __name__ == "__main__":
    main()
