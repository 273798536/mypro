#!/usr/bin/env python3
"""
curl 风格的 API 调用示例
因为用的是本地 SQLite 数据库，这里以函数调用方式演示"curl 风格"的用法
实际使用时，运营同事可直接参照下面各段代码
"""

import json
import sys

from database import init_db
from audit_engine import import_questions
from review_ops import (
    correct_question, confirm_question, batch_review,
    get_wrong_questions, get_missing_answers, get_history, list_batches
)

init_db()

def print_sep(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ====================================================================
# 示例 1: 导入一批数据
# 对应 (模拟):
#   curl -X POST http://localhost/api/import \
#     -H "Content-Type: application/json" \
#     -d @sample_data.json
# ====================================================================
print_sep("示例 1: 导入数据 (POST /api/import)")
with open("sample_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)
result = import_questions(data, batch_name="API示例批次", source_file="sample_data.json")
print(json.dumps(result, ensure_ascii=False, indent=2))
batch_id = result["batch_id"]

# ====================================================================
# 示例 2: 列出所有批次
# 对应 (模拟):
#   curl http://localhost/api/batches
# ====================================================================
print_sep("示例 2: 列出批次 (GET /api/batches)")
batches = list_batches()
print(json.dumps(batches, ensure_ascii=False, indent=2))

# ====================================================================
# 示例 3: 获取错题列表
# 对应 (模拟):
#   curl http://localhost/api/wrong?batch=1
# ====================================================================
print_sep("示例 3: 获取错题 (GET /api/wrong)")
wrongs = get_wrong_questions(batch_id=batch_id)
for w in wrongs[:3]:
    print(f"  DB_ID={w['db_id']}, QID={w['question_id']}, 状态={'错误' if w['is_correct']==0 else '异常'}")
    print(f"    题目: {w['question_text'][:40]}")
    print(f"    学生答案: {w['student_answer']}, 正确答案: {w['correct_answer']}")
    if w["boundary_cases"]:
        print(f"    改变结果的边界案例数: {len(w['boundary_cases'])}")

# ====================================================================
# 示例 4: 修正单题
# 对应 (模拟):
#   curl -X POST http://localhost/api/correct \
#     -H "Content-Type: application/json" \
#     -d '{"id": 1, "field": "correct_answer", "new_value": "5", "note": "风控补充"}'
# ====================================================================
print_sep("示例 4: 修正单题 (POST /api/correct)")
fix = correct_question(
    question_db_id=5,
    field_name="correct_answer",
    new_value="5",
    note="curl示例: 风控补充正确答案"
)
print(json.dumps(fix, ensure_ascii=False, indent=2))

# ====================================================================
# 示例 5: 确认单题无误
# 对应 (模拟):
#   curl -X POST http://localhost/api/confirm \
#     -H "Content-Type: application/json" \
#     -d '{"id": 1, "note": "审核无误"}'
# ====================================================================
print_sep("示例 5: 确认单题 (POST /api/confirm)")
conf = confirm_question(question_db_id=1, note="curl示例: 审核无误")
print(json.dumps(conf, ensure_ascii=False, indent=2))

# ====================================================================
# 示例 6: 批量复核（会记录历史对比）
# 对应 (模拟):
#   curl -X POST http://localhost/api/review \
#     -H "Content-Type: application/json" \
#     -d '{"batch_id": 1, "corrections": [...], "note": "第1次复核"}'
# ====================================================================
print_sep("示例 6: 批量复核 (POST /api/review)")
with open("sample_corrections.json", "r", encoding="utf-8") as f:
    corrections = json.load(f)
review = batch_review(
    batch_id=batch_id,
    corrections=corrections,
    note="curl示例: 周报批量复核"
)
print(f"  复核会话ID: {review['review_session_id']}")
print(f"  变更数量: {review['changed_count']}")
print(f"  缺失待补: {len(review['missing'])}")
if review["changes"]:
    print("  历史对比（前 → 后）:")
    for ch in review["changes"]:
        print(f"    题目{ch['question_id']} {ch['field']}: {ch['old_value']} → {ch['new_value']}")

# ====================================================================
# 示例 7: 获取缺失答案缺口
# 对应 (模拟):
#   curl http://localhost/api/missing?batch=1
# ====================================================================
print_sep("示例 7: 获取缺失缺口 (GET /api/missing)")
missing = get_missing_answers(batch_id=batch_id)
if missing:
    for m in missing:
        print(f"  DB_ID={m['db_id']}, QID={m['question_id']}, 缺: {m['missing_field']}")
else:
    print("  (已全部补齐)")

# ====================================================================
# 示例 8: 查看单题完整历史
# 对应 (模拟):
#   curl http://localhost/api/history?id=2
# ====================================================================
print_sep("示例 8: 单题完整历史 (GET /api/history)")
hist = get_history(question_db_id=2)
print(f"  题目: {hist['question']['question_text']}")
print(f"  修正记录数: {len(hist['corrections'])}")
print(f"  确认记录数: {len(hist['confirmations'])}")
print(f"  复核变更数: {len(hist['review_changes'])}")
print(f"  边界案例数: {len(hist['boundary_cases'])}")
for bc in hist["boundary_cases"]:
    if bc["result_changed"]:
        print(f"    [改变结果] {bc['case_type']}: {bc['description']}")
        print(f"      原: {bc['original_result']}")
        print(f"      边界: {bc['boundary_result']}")

print_sep("全部示例运行完成 ✓")
print("数据库文件: audit.db (SQLite)")
