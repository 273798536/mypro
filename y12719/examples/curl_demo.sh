#!/usr/bin/env bash
# ============================================================
#  风险价值分位回测系统 - curl 调用示例
#  先启动服务: bash scripts/run.sh
#  服务默认地址: http://127.0.0.1:8000
# ============================================================

BASE="http://127.0.0.1:8000"
set -e

echo "==> [0] 健康检查"
curl -s "$BASE/api/health" | python3 -m json.tool

echo ""
echo "==> [1] 导入题目清单 v1"
curl -s -X POST "$BASE/api/question-lists" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH-CURL-001",
    "name": "curl示例题目清单",
    "version": "v1",
    "questions": [
      {"question_id": "CURL-Q1", "title": "沪深300 VaR(95%)", "quantile": 0.95, "window": 252},
      {"question_id": "CURL-Q2", "title": "标普500 VaR(95%)",   "quantile": 0.95, "window": 252},
      {"question_id": "CURL-Q3", "title": "小样本外推测试",    "quantile": 0.95, "window": 252}
    ]
  }' | python3 -m json.tool

echo ""
echo "==> [2] 执行回测（含小样本触发外推越界）"
curl -s -X POST "$BASE/api/backtest/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BT-CURL-001",
    "question_list_batch_id": "BATCH-CURL-001",
    "question_data": [
      {
        "question_id": "CURL-Q1",
        "returns": [0.01, -0.02, 0.005, -0.01, 0.02, -0.008, 0.003, -0.015, 0.012, -0.005,
                    0.007, -0.018, 0.009, -0.022, 0.015, -0.003, 0.004, -0.011, 0.021, -0.009,
                    0.013, -0.025, 0.006, -0.014, 0.018, -0.007, 0.002, -0.019, 0.011, -0.012,
                    0.008, -0.023, 0.017, -0.004, 0.01, -0.016, 0.022, -0.006, 0.005, -0.02,
                    0.014, -0.01, 0.003, -0.017, 0.019, -0.008, 0.006, -0.021, 0.016, -0.005,
                    0.009, -0.013, 0.02, -0.007, 0.004, -0.018, 0.012, -0.011, 0.023, -0.003,
                    0.01, -0.024, 0.007, -0.015, 0.018, -0.009, 0.005, -0.019, 0.013, -0.012,
                    0.021, -0.006, 0.008, -0.022, 0.017, -0.004, 0.011, -0.016, 0.014, -0.008,
                    0.003, -0.02, 0.019, -0.007, 0.006, -0.014, 0.015, -0.01, 0.025, -0.005,
                    0.009, -0.023, 0.012, -0.003, 0.007, -0.017, 0.02, -0.006, 0.016, -0.011],
        "historical_var_value": 0.028,
        "historical_var_source": "历史答案库"
      },
      {
        "question_id": "CURL-Q2",
        "returns": [0.008, -0.012, 0.004, -0.009, 0.015, -0.005, 0.003, -0.011, 0.01, -0.007,
                    0.006, -0.014, 0.013, -0.003, 0.009, -0.016, 0.012, -0.008, 0.005, -0.01,
                    0.017, -0.004, 0.007, -0.013, 0.011, -0.006, 0.008, -0.015, 0.014, -0.005,
                    0.004, -0.012, 0.018, -0.007, 0.006, -0.011, 0.01, -0.003, 0.009, -0.014,
                    0.016, -0.006, 0.005, -0.017, 0.013, -0.004, 0.008, -0.01, 0.015, -0.009,
                    0.007, -0.013, 0.011, -0.005, 0.01, -0.016, 0.017, -0.003, 0.006, -0.012,
                    0.014, -0.008, 0.004, -0.015, 0.012, -0.007, 0.009, -0.011, 0.018, -0.005,
                    0.006, -0.014, 0.01, -0.004, 0.008, -0.017, 0.013, -0.006, 0.007, -0.01,
                    0.016, -0.003, 0.005, -0.012, 0.011, -0.008, 0.015, -0.007, 0.009, -0.013,
                    0.019, -0.005, 0.004, -0.016, 0.014, -0.006, 0.008, -0.011, 0.017, -0.009],
        "historical_var_value": 0.022,
        "historical_var_source": "历史答案库"
      },
      {
        "question_id": "CURL-Q3",
        "returns": [0.05, -0.08, 0.03, -0.06, 0.04, -0.09, 0.02, -0.07, 0.06, -0.04,
                    0.03, -0.1, 0.05, -0.05, 0.04, -0.08, 0.02, -0.06, 0.07, -0.03,
                    0.01, -0.11, 0.04, -0.07, 0.06, -0.05, 0.03, -0.09, 0.05, -0.04],
        "historical_var_value": 0.02,
        "historical_var_source": "历史答案库"
      }
    ],
    "triggered_by": "curl_demo"
  }' | python3 -m json.tool

echo ""
echo "==> [3] 教研编辑分级异常视图"
curl -s "$BASE/api/anomalies" | python3 -m json.tool

echo ""
echo "==> [4] 运营视图（含外推越界拦截说明）"
curl -s "$BASE/api/backtest/runs/1/operator-report" | python3 -m json.tool

echo ""
echo "==> [5] 增量重校验（适合补录边界样例后）"
curl -s -X POST "$BASE/api/backtest/runs/1/revalidate" | python3 -m json.tool

echo ""
echo "==> [6] 导出 HTML + JSON 报告"
curl -s -X POST "$BASE/api/backtest/runs/1/export" | python3 -m json.tool

echo ""
echo "==> [7] 导入题目清单 v2（模拟延迟到达）"
curl -s -X POST "$BASE/api/question-lists" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH-CURL-002",
    "name": "curl示例题目清单(修正版)",
    "version": "v2",
    "questions": [
      {"question_id": "CURL-Q1", "title": "沪深300 VaR(95%)", "quantile": 0.99, "window": 252},
      {"question_id": "CURL-Q2", "title": "标普500 VaR(95%)",   "quantile": 0.95, "window": 252},
      {"question_id": "CURL-Q4", "title": "新题 纳斯达克 VaR(95%)", "quantile": 0.95, "window": 252}
    ]
  }' | python3 -m json.tool

echo ""
echo "==> [8] 查看 v2 清单对哪些旧结论有影响"
curl -s "$BASE/api/question-lists/BATCH-CURL-002/impact" | python3 -m json.tool

echo ""
echo "✅ curl 示例全部执行完毕"
