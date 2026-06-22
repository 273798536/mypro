#!/bin/bash
# 概率抽样参数沙盘 —— curl 示例
# 启动服务: python app.py
# 然后执行: bash samples/curl_demos.sh

BASE="http://localhost:5001"

echo "=== 1. health ==="
curl -s "$BASE/health" | python3 -m json.tool

echo -e "\n=== 2. 上传 CSV 走完整流水线（清洗+抽样+异常仪表盘）==="
curl -s -X POST "$BASE/api/v1/pipeline" \
  -F "file=@samples/error_questions_mixed.csv" \
  -F 'params={"method":"simple_random","confidence_level":0.95,"margin_of_error":0.05,"random_seed":42}' \
  | python3 -m json.tool

echo -e "\n=== 3. JSON records 清洗 ==="
curl -s -X POST "$BASE/api/v1/cleanse" \
  -H "Content-Type: application/json" \
  -d @samples/error_questions_mixed.json \
  | python3 -m json.tool

echo -e "\n=== 4. 参数错误样例 —— sample_ratio=2（越界） ==="
curl -s -X POST "$BASE/api/v1/sample" \
  -H "Content-Type: application/json" \
  -d '{"samples":[],"params":{"sample_ratio":2}}' \
  | python3 -m json.tool

echo -e "\n=== 5. 不支持的 Content-Type ==="
curl -s -X POST "$BASE/api/v1/cleanse" \
  -H "Content-Type: text/plain" \
  -d "hello" \
  | python3 -m json.tool

echo -e "\n=== 6. 获取 OpenAPI 契约 ==="
curl -sI "$BASE/openapi" | head -n 5
