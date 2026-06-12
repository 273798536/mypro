#!/bin/bash

# 海底地形剖面课堂 - curl 命令示例
# 使用方法: bash scripts/curl-examples.sh

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  海底地形剖面课堂 - curl 示例命令${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}【1】健康检查${NC}"
echo -e "${GREEN}curl $BASE_URL/api/health${NC}"
curl -s "$BASE_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"
echo ""
echo ""

echo -e "${YELLOW}【2】查看所有海底地形剖面${NC}"
echo -e "${GREEN}curl $BASE_URL/api/profiles${NC}"
curl -s "$BASE_URL/api/profiles" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/profiles"
echo ""
echo ""

echo -e "${YELLOW}【3】查看单条剖面详情（含深度点）${NC}"
echo -e "${GREEN}curl $BASE_URL/api/profiles/1${NC}"
curl -s "$BASE_URL/api/profiles/1" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/profiles/1"
echo ""
echo ""

echo -e "${YELLOW}【4】查看所有禁航区${NC}"
echo -e "${GREEN}curl $BASE_URL/api/no-go-zones${NC}"
curl -s "$BASE_URL/api/no-go-zones" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/no-go-zones"
echo ""
echo ""

echo -e "${YELLOW}【5】查看所有船舶${NC}"
echo -e "${GREEN}curl $BASE_URL/api/vessels${NC}"
curl -s "$BASE_URL/api/vessels" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/vessels"
echo ""
echo ""

echo -e "${YELLOW}【6】查看某船的轨迹${NC}"
echo -e "${GREEN}curl $BASE_URL/api/vessels/1/tracks${NC}"
curl -s "$BASE_URL/api/vessels/1/tracks" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/vessels/1/tracks"
echo ""
echo ""

echo -e "${YELLOW}【7】查看潮汐站数据 (v1版本)${NC}"
echo -e "${GREEN}curl \"$BASE_URL/api/tide-stations?version=v1\"${NC}"
curl -s "$BASE_URL/api/tide-stations?version=v1" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/tide-stations?version=v1"
echo ""
echo ""

echo -e "${YELLOW}【8】生成 v2 版本潮汐数据${NC}"
echo -e "${GREEN}curl -X POST $BASE_URL/api/tide-versions/v2${NC}"
curl -s -X POST "$BASE_URL/api/tide-versions/v2" | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/tide-versions/v2"
echo ""
echo ""

echo -e "${YELLOW}【9】新建分析任务（v1潮汐版本）${NC}"
echo -e "${GREEN}curl -X POST $BASE_URL/api/analysis/runs \\"
echo -e "  -H 'Content-Type: application/json' \\"
echo -e "  -d '{\"runName\":\"日常巡检v1\",\"tideVersion\":\"v1\",\"checkAquaculture\":true}'${NC}"
RUN1=$(curl -s -X POST "$BASE_URL/api/analysis/runs" \
  -H 'Content-Type: application/json' \
  -d '{"runName":"日常巡检v1","tideVersion":"v1","checkAquaculture":true}')
echo "$RUN1" | python3 -m json.tool 2>/dev/null || echo "$RUN1"
RUN1_ID=$(echo "$RUN1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('runId',''))" 2>/dev/null)
echo ""

echo -e "${YELLOW}【10】查看分析结果${NC}"
if [ -n "$RUN1_ID" ]; then
  echo -e "${GREEN}curl $BASE_URL/api/analysis/runs/$RUN1_ID${NC}"
  curl -s "$BASE_URL/api/analysis/runs/$RUN1_ID" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/analysis/runs/$RUN1_ID"
else
  echo "  (跳过，需要先获取运行ID)"
fi
echo ""
echo ""

echo -e "${YELLOW}【11】新建分析任务（v2潮汐版本，对比用）${NC}"
echo -e "${GREEN}curl -X POST $BASE_URL/api/analysis/runs \\"
echo -e "  -H 'Content-Type: application/json' \\"
echo -e "  -d '{\"runName\":\"日常巡检v2\",\"tideVersion\":\"v2\",\"checkAquaculture\":true}'${NC}"
RUN2=$(curl -s -X POST "$BASE_URL/api/analysis/runs" \
  -H 'Content-Type: application/json' \
  -d '{"runName":"日常巡检v2","tideVersion":"v2","checkAquaculture":true}')
echo "$RUN2" | python3 -m json.tool 2>/dev/null || echo "$RUN2"
RUN2_ID=$(echo "$RUN2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('runId',''))" 2>/dev/null)
echo ""

echo -e "${YELLOW}【12】对比两个版本的差异${NC}"
if [ -n "$RUN1_ID" ] && [ -n "$RUN2_ID" ]; then
  echo -e "${GREEN}curl \"$BASE_URL/api/analysis/compare?run1=$RUN1_ID&run2=$RUN2_ID\"${NC}"
  curl -s "$BASE_URL/api/analysis/compare?run1=$RUN1_ID&run2=$RUN2_ID" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/analysis/compare?run1=$RUN1_ID&run2=$RUN2_ID"
else
  echo "  (跳过，需要两个运行ID)"
fi
echo ""
echo ""

echo -e "${YELLOW}【13】生成海事处报告${NC}"
if [ -n "$RUN1_ID" ]; then
  echo -e "${GREEN}curl -X POST $BASE_URL/api/reports \\"
  echo -e "  -H 'Content-Type: application/json' \\"
  echo -e "  -d '{\"runId\":\"$RUN1_ID\",\"reportType\":\"maritime\"}'${NC}"
  curl -s -X POST "$BASE_URL/api/reports" \
    -H 'Content-Type: application/json' \
    -d "{\"runId\":\"$RUN1_ID\",\"reportType\":\"maritime\"}" | python3 -m json.tool 2>/dev/null
else
  echo "  (跳过)"
fi
echo ""
echo ""

echo -e "${YELLOW}【14】查看数据缺口（养殖日志缺失等）${NC}"
if [ -n "$RUN1_ID" ]; then
  echo -e "${GREEN}curl \"$BASE_URL/api/data-gaps?runId=$RUN1_ID\"${NC}"
  curl -s "$BASE_URL/api/data-gaps?runId=$RUN1_ID" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/data-gaps?runId=$RUN1_ID"
else
  echo "  (跳过)"
fi
echo ""
echo ""

echo -e "${YELLOW}【15】查看风浪预报数据${NC}"
echo -e "${GREEN}curl $BASE_URL/api/wave-forecasts${NC}"
curl -s "$BASE_URL/api/wave-forecasts" | python3 -m json.tool 2>/dev/null | head -30
echo "  ... (已截断)"
echo ""
echo ""

echo -e "${YELLOW}【16】查看养殖日志${NC}"
echo -e "${GREEN}curl $BASE_URL/api/aquaculture-logs${NC}"
curl -s "$BASE_URL/api/aquaculture-logs" | python3 -m json.tool 2>/dev/null | head -30
echo "  ... (已截断)"
echo ""

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  示例命令执行完毕${NC}"
echo -e "${CYAN}========================================${NC}"
