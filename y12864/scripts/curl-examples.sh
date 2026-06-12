#!/usr/bin/env bash

set -e

API_BASE="http://localhost:3001"

echo "========================================="
echo "  滩涂贝类采样日程 - API 交互示例"
echo "========================================="
echo ""

echo "▶️  0. 健康检查"
curl -s "$API_BASE/api/health" | python3 -m json.tool
echo ""

echo "▶️  1. 获取所有采样记录"
curl -s "$API_BASE/api/records" | python3 -m json.tool
echo ""

echo "▶️  2. 按风险等级筛选（只看待确认）"
curl -s "$API_BASE/api/records?risk_level=pending" | python3 -m json.tool
echo ""

echo "▶️  3. 异常追踪 - 分组查看"
curl -s "$API_BASE/api/anomalies" | python3 -m json.tool
echo ""

echo "▶️  4. 查看影响链（记录ID=2）"
curl -s "$API_BASE/api/anomalies/impact/2" | python3 -m json.tool
echo ""

echo "▶️  5. 新增一条顺利记录"
curl -s -X POST "$API_BASE/api/records" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-13",
    "area": "北滩D区",
    "species": "青蛤",
    "wind_wave_forecast": "东风3级，浪高0.6m",
    "tide_data": "大潮汐，潮差4.0m",
    "water_quality": "pH 8.0, DO 7.0mg/L"
  }' | python3 -m json.tool
echo ""

echo "▶️  6. 批量导入"
curl -s -X POST "$API_BASE/api/records/import" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "date": "2026-06-14",
      "area": "东滩E区",
      "species": "花蛤",
      "wind_wave_forecast": null,
      "tide_data": "中潮汐，潮差3.0m",
      "water_quality": null
    },
    {
      "date": "2026-06-15",
      "area": "西滩F区",
      "species": "四角蛤蜊",
      "wind_wave_forecast": "西南风5级，浪高1.8m，禁航区越界",
      "tide_data": "小潮汐，潮差2.0m",
      "water_quality": "pH 7.5, DO 4.5mg/L"
    }
  ]' | python3 -m json.tool
echo ""

echo "▶️  7. 补录数据（潮汐表-记录ID=2）"
curl -s -X PUT "$API_BASE/api/records/2" \
  -H "Content-Type: application/json" \
  -d '{"tide_data": "大潮汐，潮差4.1m（补录）"' | python3 -m json.tool
echo ""

echo "▶️  8. 补录风浪预报（记录ID=2）"
curl -s -X PUT "$API_BASE/api/records/2" \
  -H "Content-Type: application/json" \
  -d '{"wind_wave_forecast": "南风3级，浪高0.6m"}' | python3 -m json.tool
echo ""

echo "▶️  9. 报告预览"
curl -s "$API_BASE/api/export/preview" | python3 -m json.tool | head -80
echo ""

echo "▶️  10. 导出 JSON 报告（保存到文件）"
curl -s "$API_BASE/api/export?format=json" -o /tmp/tidal_report.json
echo "报告已保存到 /tmp/tidal_report.json"
echo ""

echo "▶️  11. 导出 CSV 报告（保存到文件）"
curl -s "$API_BASE/api/export?format=csv" -o /tmp/tidal_report.csv
echo "报告已保存到 /tmp/tidal_report.csv"
echo ""

echo "========================================="
echo "  全部示例完成！"
echo "========================================="
