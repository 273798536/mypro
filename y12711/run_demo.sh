#!/usr/bin/env bash
# =============================================================================
# 多目标调参解释器 · 一键演示脚本（从空目录跑通全流程）
#
# 等价的 Python 脚本见 scripts/demo_via_python.py
# 等价的 curl 调用示例（配合本地 HTTP 包装）见 scripts/demo_via_curl.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"

echo "=== [1/6] 初始化数据库（空目录起步） ==="
rm -f interpreter.db
./mpi --db interpreter.db init

echo ""
echo "=== [2/6] 导入三种口径数据 ==="
echo "--- 历史答案口径 (JSON) ---"
./mpi --db interpreter.db import samples/historical_answers.json --source historical_answers
echo ""
echo "--- 学生错题口径 (CSV，故意含缺失与除零) ---"
./mpi --db interpreter.db import samples/student_mistakes.csv --source student_mistakes
echo ""
echo "--- 题目清单口径 (TSV，含负难度、>1 区分度) ---"
./mpi --db interpreter.db import samples/question_list.tsv --source question_list

echo ""
echo "=== [3/6] 执行多目标调参计算 ==="
./mpi --db interpreter.db run

echo ""
echo "=== [4/6] 查看单题公式前后差异（以外推越界 Q1003 为例） ==="
./mpi --db interpreter.db trace Q1003

echo ""
echo "=== [5/6] 生成投委会报告（文本版） ==="
./mpi --db interpreter.db report

echo ""
echo "=== [6/6] 演示完成 ==="
echo "👉 教研编辑可执行：./mpi --db interpreter.db review     进入终端复核入口"
echo "👉 查看单题 JSON 报告：  ./mpi --db interpreter.db report --question Q1003 --json"
echo "👉 查看 JSON 汇总：      ./mpi --db interpreter.db report --json"
