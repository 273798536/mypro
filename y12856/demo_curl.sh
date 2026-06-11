#!/bin/bash
set -e
BASE="http://localhost:5001/api"
echo "============================================="
echo "  潜点能见度记录台 - curl 完整流程示例"
echo "============================================="

echo ""
echo "【步骤 0】健康检查"
curl -s "$BASE/health" | python3 -m json.tool

echo ""
echo "【步骤 1】查询所有潜点"
curl -s "$BASE/dive_sites" | python3 -m json.tool

echo ""
echo "【步骤 2】查询禁航区（共3个，后面会触发越界检测）"
curl -s "$BASE/no_go_zones" | python3 -m json.tool

echo ""
echo "【步骤 3】查询船舶列表"
curl -s "$BASE/ships" | python3 -m json.tool

echo ""
echo "【步骤 4】查看清洗前的原始轨迹（含各种坏数据）"
echo "  - 养殖工船海丰号(ship_id=3)混入6条真实坏数据"
curl -s "$BASE/ship_tracks?ship_id=3" | python3 -m json.tool

echo ""
echo "【步骤 5】执行轨迹清洗（关键步骤！）"
echo "  - 会剔除坐标缺失、坐标越界、时间格式错、速度异常的数据"
echo "  - 休闲海钓蓝鲸号(ship_id=4)轨迹全部异常 → 清洗后为0 → 触发轨迹缺失分支"
RESULT=$(curl -s -X POST "$BASE/ship_tracks/clean" -H "Content-Type: application/json" -d '{}')
echo "$RESULT" | python3 -m json.tool

echo ""
echo "【步骤 6】查看清洗后的轨迹"
curl -s "$BASE/ship_tracks_clean" | python3 -m json.tool | head -60

echo ""
echo "【步骤 7】单条轨迹前后对比（以原始轨迹 #3 为例，可能是坏数据）"
curl -s "$BASE/ship_tracks/compare/3" | python3 -m json.tool

echo ""
echo "【步骤 8】查看风浪预报（含延迟到达的预报）"
echo "  - 万山岛潜点预报延迟、数据为空 → 需人工补录"
echo "  - 桂山岛潜点预报正常但未确认 → 需人工确认"
curl -s "$BASE/wind_wave_forecasts" | python3 -m json.tool

echo ""
echo "【步骤 9】人工补录延迟预报（万山岛 #2）"
curl -s -X POST "$BASE/wind_wave_forecasts/2/confirm" \
  -H "Content-Type: application/json" \
  -d '{"confirmed_by":"海洋老师","update_data":{"wave_height":1.5,"wind_speed":7.0}}' | python3 -m json.tool

echo ""
echo "【步骤 10】人工确认桂山岛预报（#3）"
curl -s -X POST "$BASE/wind_wave_forecasts/3/confirm" \
  -H "Content-Type: application/json" \
  -d '{"confirmed_by":"海洋老师"}' | python3 -m json.tool

echo ""
echo "【步骤 11】首次运行能见度计算"
echo "  - 会检测禁航区越界（科考船→万山军事区，巡检艇→桂山航道）"
echo "  - 蓝鲸号轨迹全部清洗失败 → 会被标记为轨迹缺失"
curl -s -X POST "$BASE/visibility/calculate" \
  -H "Content-Type: application/json" \
  -d '{"record_date":"2026-06-10","rerun":true}' | python3 -m json.tool

echo ""
echo "【步骤 12】查看能见度记录结果"
curl -s "$BASE/visibility_records" | python3 -m json.tool

echo ""
echo "【步骤 13】检查禁航区越界（独立API，验证地图联动结果）"
curl -s -X POST "$BASE/check_no_go_violations" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-10"}' | python3 -m json.tool

echo ""
echo "【步骤 14】模拟预报晚到 —— 重复运行计算（rerun=true）"
echo "  - 现实中预报到了之后要重新算一次"
curl -s -X POST "$BASE/visibility/calculate" \
  -H "Content-Type: application/json" \
  -d '{"record_date":"2026-06-10","rerun":true}' | python3 -m json.tool

echo ""
echo "【步骤 15】人工复核 —— 海洋老师确认记录 #1"
curl -s -X POST "$BASE/visibility_records/1/review" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","reviewer":"海洋老师","notes":"照片和日志吻合，确认","visibility_override":12.0}' | python3 -m json.tool

echo ""
echo "【步骤 16】查看处理运行记录（确认所有场景都跑到了）"
curl -s "$BASE/process_runs" | python3 -m json.tool

echo ""
echo "============================================="
echo "  ✅ curl 全流程跑完！打开 http://localhost:5001/ 可在页面查看地图联动效果"
echo "============================================="
