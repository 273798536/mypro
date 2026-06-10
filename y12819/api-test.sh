#!/bin/bash
BASE="http://localhost:3001/api"

echo "========================================="
echo " 动物行为轨迹分析 - API 快速验证脚本"
echo "========================================="
echo ""

echo "--- 1. 健康检查 ---"
curl -s "$BASE/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/health"
echo -e "\n"

echo "--- 2. 获取培养记录列表 ---"
curl -s "$BASE/records" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/records"
echo -e "\n"

echo "--- 3. 按实验组筛选记录 ---"
curl -s "$BASE/records?group=对照组" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/records?group=对照组"
echo -e "\n"

echo "--- 4. 按状态筛选异常记录 ---"
curl -s "$BASE/records?status=anomaly" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/records?status=anomaly"
echo -e "\n"

echo "--- 5. 新增培养记录（批次匹配 - 正常） ---"
curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-001","experiment_group":"对照组","sampling_location":"LOC-A","reagent_batch":"RB-2024-001","expected_batch":"RB-2024-001","culture_date":"2024-12-01"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-001","experiment_group":"对照组","sampling_location":"LOC-A","reagent_batch":"RB-2024-001","expected_batch":"RB-2024-001","culture_date":"2024-12-01"}'
echo -e "\n"

echo "--- 6. 新增培养记录（批次不匹配 - 自动创建异常） ---"
curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-002","experiment_group":"低剂量组","sampling_location":"LOC-B","reagent_batch":"RB-2024-003","expected_batch":"RB-2024-002","culture_date":"2024-12-01"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-002","experiment_group":"低剂量组","sampling_location":"LOC-B","reagent_batch":"RB-2024-003","expected_batch":"RB-2024-002","culture_date":"2024-12-01"}'
echo -e "\n"

echo "--- 7. 新增培养记录（缺少采样地点 - 自动创建异常） ---"
curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-003","experiment_group":"中剂量组","reagent_batch":"RB-2024-003","expected_batch":"RB-2024-003","culture_date":"2024-12-01"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE/records" \
  -H "Content-Type: application/json" \
  -d '{"animal_id":"ANM-TEST-003","experiment_group":"中剂量组","reagent_batch":"RB-2024-003","expected_batch":"RB-2024-003","culture_date":"2024-12-01"}'
echo -e "\n"

echo "--- 8. 批量校验记录 ---"
curl -s -X POST "$BASE/records/validate" \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3]}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE/records/validate" \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3]}'
echo -e "\n"

echo "--- 9. 补录采样地点（更新记录，触发异常复核联动） ---"
curl -s -X PUT "$BASE/records/3" \
  -H "Content-Type: application/json" \
  -d '{"sampling_location":"LOC-C"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X PUT "$BASE/records/3" \
  -H "Content-Type: application/json" \
  -d '{"sampling_location":"LOC-C"}'
echo -e "\n"

echo "--- 10. 获取异常汇总 ---"
curl -s "$BASE/anomalies/summary" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/anomalies/summary"
echo -e "\n"

echo "--- 11. 按类型筛选异常（批号不匹配） ---"
curl -s "$BASE/anomalies?type=batch_mismatch" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/anomalies?type=batch_mismatch"
echo -e "\n"

echo "--- 12. 标记异常为已处理 ---"
curl -s -X PUT "$BASE/anomalies/1" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X PUT "$BASE/anomalies/1" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
echo -e "\n"

echo "--- 13. 获取分组统计 ---"
curl -s "$BASE/statistics/groups" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/statistics/groups"
echo -e "\n"

echo "--- 14. 获取异常率趋势 ---"
curl -s "$BASE/statistics/trends" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/statistics/trends"
echo -e "\n"

echo "--- 15. 按采样地点统计 ---"
curl -s "$BASE/statistics/by-location" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/statistics/by-location"
echo -e "\n"

echo "--- 16. 获取轨迹数据 ---"
curl -s "$BASE/trajectory/ANM-001" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/trajectory/ANM-001"
echo -e "\n"

echo "--- 17. 获取所有轨迹会话 ---"
curl -s "$BASE/trajectory" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/trajectory"
echo -e "\n"

echo "--- 18. 报告预览 ---"
curl -s "$BASE/export/preview" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/export/preview"
echo -e "\n"

echo "--- 19. 导出PDF ---"
curl -s -X POST "$BASE/export/pdf" -o /tmp/animal-analysis-report.pdf && echo "PDF已保存到 /tmp/animal-analysis-report.pdf"
echo ""

echo "--- 20. 导出Excel ---"
curl -s -X POST "$BASE/export/excel" -o /tmp/animal-analysis-report.xlsx && echo "Excel已保存到 /tmp/animal-analysis-report.xlsx"
echo ""

echo "========================================="
echo " 验证完成！"
echo "========================================="
