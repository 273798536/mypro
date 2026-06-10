#!/bin/bash

# ============================================================
# 反应热安全预警系统 - API 测试脚本
# 包含所有核心接口的 curl 示例
# ============================================================

BASE_URL="http://localhost:3001"

echo "============================================"
echo "  反应热安全预警系统 - API 测试脚本"
echo "============================================"
echo ""

# 1. 健康检查
echo "🔍 1. 健康检查"
curl -s "$BASE_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"
echo ""
echo ""

# 2. 获取称量单列表
echo "📋 2. 获取称量单列表"
curl -s "$BASE_URL/api/weighing/list" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/weighing/list"
echo ""
echo ""

# 3. 获取第一条记录详情（使用预植的样例数据ID）
echo "📄 3. 获取样例记录详情 - 顺利记录 (rec-success-001)"
curl -s "$BASE_URL/api/weighing/rec-success-001" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/weighing/rec-success-001"
echo ""
echo ""

# 4. 获取异常留痕列表
echo "⚠️  4. 获取异常留痕列表"
curl -s "$BASE_URL/api/trace/list" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/trace/list"
echo ""
echo ""

# 5. 导入称量单 - CSV 文件
echo "📥 5. 导入称量单 (CSV)"
curl -s -X POST "$BASE_URL/api/weighing/import" \
  -F "file=@samples/weighing_success.csv;filename=test.csv;type=text/csv" \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/weighing/import" -F "file=@samples/weighing_success.csv"
echo ""
echo ""

# 6. 运行谱峰分析（对预植的顺利记录）
echo "📊 6. 运行谱峰分析 (顺利记录 rec-success-001)"
curl -s -X POST "$BASE_URL/api/analysis/run/rec-success-001" \
  -H "Content-Type: application/json" \
  -d '{
    "temperatureCurve": [[0,25],[10,26],[20,28],[30,32],[40,35],[50,33],[60,30],[70,27],[80,25.5]]
  }' | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 7. 运行配平计算（对预植的顺利记录）
echo "⚖️  7. 运行配平计算 (顺利记录 rec-success-001)"
curl -s -X POST "$BASE_URL/api/balance/calculate/rec-success-001" \
  -H "Content-Type: application/json" \
  -d '{
    "reactants": [{"formula": "HCl"}, {"formula": "NaOH"}],
    "products": [{"formula": "NaCl"}, {"formula": "H2O"}]
  }' | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 8. 生成报告预览（对预植的顺利记录）
echo "📄 8. 生成报告预览 (顺利记录 rec-success-001)"
curl -s "$BASE_URL/api/report/rec-success-001/preview" | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 9. 测试异常留痕 - 待确认记录详情
echo "🟡 9. 待确认记录详情 (rec-pending-001)"
curl -s "$BASE_URL/api/weighing/rec-pending-001" | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 10. 测试异常留痕 - 坏数据记录
echo "🔴 10. 坏数据记录详情 (rec-bad-001)"
curl -s "$BASE_URL/api/weighing/rec-bad-001" | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 11. 测试报告预览 - 坏数据（显示分级标识）
echo "🔴 11. 坏数据报告预览 - 显示 red/reject 分级"
curl -s "$BASE_URL/api/report/rec-bad-001/preview" | python3 -m json.tool 2>/dev/null
echo ""
echo ""

# 12. 测试可操作错误提示 - 缺少温度曲线
echo "❌ 12. 测试可操作错误提示 - 缺少温度曲线"
curl -s -X POST "$BASE_URL/api/analysis/run/rec-success-001" \
  -H "Content-Type: application/json" \
  -d '{"temperatureCurve": []}' | python3 -m json.tool 2>/dev/null
echo ""
echo ""

echo "============================================"
echo "  ✅ 所有 API 测试完成"
echo "============================================"
echo ""
echo "📌 附加测试命令:"
echo "   下载 PDF 报告: curl -o report.pdf \"$BASE_URL/api/report/rec-success-001/download\""
echo "   下载 Excel:   curl -o report.xlsx \"$BASE_URL/api/report/rec-success-001/download?format=excel\""
echo "   只看待复核:   curl \"$BASE_URL/api/weighing/list?status=pending\""
echo "   只看异常:     curl \"$BASE_URL/api/weighing/list?status=bad\""
