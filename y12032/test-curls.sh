#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "========================================"
echo "数据标注计件工资系统 - API测试样例"
echo "========================================"
echo ""

echo "【1】健康检查"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

echo "【2】查询标注员列表"
curl -s "$BASE_URL/annotators" | python3 -m json.tool
echo ""

echo "【3】查询任务列表"
curl -s "$BASE_URL/tasks" | python3 -m json.tool
echo ""

echo "【4】查询待确认质检列表 (质检追溯待确认分支)"
curl -s "$BASE_URL/inspections/pending" | python3 -m json.tool
echo ""

echo "【5】查看任务返工变更记录 (能看出哪些结论被改动)"
curl -s "$BASE_URL/reworks/task/5/changes" | python3 -m json.tool
echo ""

echo "【6】质检追溯 - 按任务号 T202405006 (含待确认分支说明)"
curl -s "$BASE_URL/trace/task/T202405006" | python3 -m json.tool
echo ""

echo "【7】质检追溯 - 按标注员工号 AN001"
curl -s "$BASE_URL/trace/annotator/AN001/trace?month=2024-05" | python3 -m json.tool
echo ""

echo "【8】计算2024年5月工资 (计件汇总主线)"
curl -s -X POST "$BASE_URL/salary/calculate" \
  -H "Content-Type: application/json" \
  -d '{"month": "2024-05"}' | python3 -m json.tool
echo ""

echo "【9】查询工资汇总列表"
curl -s "$BASE_URL/salary/summaries?month=2024-05" | python3 -m json.tool
echo ""

echo "【10】查看工资明细 - 标注员1"
curl -s "$BASE_URL/salary/details/1/2024-05" | python3 -m json.tool
echo ""

echo "【11】导出工资报表JSON"
curl -s "$BASE_URL/reports/salary/2024-05" | python3 -m json.tool
echo ""

echo "【12】导出工资报表CSV (保存到文件)"
curl -s "$BASE_URL/reports/salary/2024-05?format=csv" -o salary_report_202405.csv
echo "已保存到 salary_report_202405.csv"
echo ""

echo "【13】质量报表"
curl -s "$BASE_URL/reports/quality/2024-05" | python3 -m json.tool
echo ""

echo "========================================"
echo "双向追溯验证路径："
echo "  标注员(AN001) → 任务列表 → 任务详情 → 质检记录 → 返工记录"
echo "  工资汇总 → 工资明细 → 任务记录 → 标注员信息"
echo "========================================"
