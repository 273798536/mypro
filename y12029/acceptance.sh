#!/bin/bash
set +e

BASE="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  航运燃油附加费 - CURL 验收脚本"
echo "========================================"
echo ""

echo -e "${YELLOW}[1/6] 检查服务是否启动...${NC}"
if ! curl -s "$BASE/container-types" > /dev/null; then
    echo -e "${RED}服务未启动，请先运行: python app.py${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 服务正常${NC}"
echo ""

echo -e "${YELLOW}[2/6] 场景1：正常计算 - 所有数据对齐${NC}"
echo "订单 SH202605001：20GP，太平洋航线，5月15日开航（在V2有效期内）"
RESULT1=$(curl -s -X POST "$BASE/surcharge/calculate" \
    -H "Content-Type: application/json" \
    -d '{"order_no": "SH202605001"}')
echo "$RESULT1" | python3 -c "import sys,json; json.dump(json.load(sys.stdin), sys.stdout, ensure_ascii=False, indent=4)"
REC1=$(echo "$RESULT1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['id']).strip())")
STATUS1=$(echo "$RESULT1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['status']).strip())")
DISC1=$(echo "$RESULT1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(len(d['discrepancies'])).strip())")
if [ "$STATUS1" = "draft" ] && [ "$DISC1" = "0" ]; then
    echo -e "${GREEN}✓ 正常单通过：状态=$STATUS1, 差异数=$DISC1${NC}"
else
    echo -e "${RED}✗ 正常单失败：状态=$STATUS1, 差异数=$DISC1${NC}"
fi
echo ""

echo -e "${YELLOW}[3/6] 场景2：报价过期 + 改单追溯${NC}"
echo "订单 SH202605002：40HQ，太平洋航线，2月10日开航（V1已过期，当前是V2）"
echo "强制使用旧版本V1计算，验证报价过期提示："
RESULT2=$(curl -s -X POST "$BASE/surcharge/calculate" \
    -H "Content-Type: application/json" \
    -d '{"order_no": "SH202605002", "route_rate_version": "V1"}')
echo "$RESULT2" | python3 -c "import sys,json; json.dump(json.load(sys.stdin), sys.stdout, ensure_ascii=False, indent=4)"
REC2=$(echo "$RESULT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['id']).strip())")
STATUS2=$(echo "$RESULT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['status']).strip())")
HAS_EXPIRED=$(echo "$RESULT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(any(x['type']=='quote_expired' for x in d['discrepancies'])).strip())")
SOURCE=$(echo "$RESULT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['discrepancies'][0]['source_material']).strip() if d['discrepancies'] else '')")
if [ "$HAS_EXPIRED" = "True" ] && [ "$STATUS2" = "pending_review" ]; then
    echo -e "${GREEN}✓ 报价过期检测通过：来源=$SOURCE${NC}"
else
    echo -e "${RED}✗ 报价过期检测失败：HAS_EXPIRED=$HAS_EXPIRED, STATUS=$STATUS2${NC}"
fi
echo ""

echo -e "${YELLOW}[4/6] 场景3：箱型替换问题${NC}"
echo "订单 SH202605003：45HQ不在箱型清单中"
RESULT3=$(curl -s -X POST "$BASE/surcharge/calculate" \
    -H "Content-Type: application/json" \
    -d '{"order_no": "SH202605003"}')
echo "$RESULT3" | python3 -c "import sys,json; json.dump(json.load(sys.stdin), sys.stdout, ensure_ascii=False, indent=4)"
REC3=$(echo "$RESULT3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['id']).strip())")
HAS_CONTAINER=$(echo "$RESULT3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(any(x['type']=='container_mismatch' for x in d['discrepancies'])).strip())")
SOURCE3=$(echo "$RESULT3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d['discrepancies'][0]['source_material']).strip() if d['discrepancies'] else '')")
if [ "$HAS_CONTAINER" = "True" ]; then
    echo -e "${GREEN}✓ 箱型不匹配检测通过：来源=$SOURCE3${NC}"
else
    echo -e "${RED}✗ 箱型不匹配检测失败${NC}"
fi
echo ""

echo -e "${YELLOW}[5/6] 复核流程${NC}"
echo "REC1=$REC1, REC2=$REC2"
echo "对记录 $REC1 进行复核（通过）："
curl -s -G -X POST "$BASE/surcharge/$REC1/review" \
    --data-urlencode "comment=数据对齐无误" \
    --data-urlencode "approved=true" \
    --data-urlencode "reviewer=张三" | python3 -c "import sys,json; json.dump(json.load(sys.stdin), sys.stdout, ensure_ascii=False, indent=4)"
echo ""
echo "对记录 $REC2 进行复核（驳回，要求确认报价版本）："
curl -s -G -X POST "$BASE/surcharge/$REC2/review" \
    --data-urlencode "comment=报价已过期，请确认是否使用V2版本重新计算" \
    --data-urlencode "approved=false" \
    --data-urlencode "reviewer=李四" | python3 -c "import sys,json; json.dump(json.load(sys.stdin), sys.stdout, ensure_ascii=False, indent=4)"
echo -e "${GREEN}✓ 复核流程完成${NC}"
echo ""

echo -e "${YELLOW}[6/6] 导出数据${NC}"
echo "导出所有记录（含差异明细）："
curl -s "$BASE/surcharge/export"
echo ""
echo -e "${GREEN}✓ 导出完成${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}  验收完成！${NC}"
echo "========================================"
echo ""
echo "快速复现报价过期场景："
echo "  1. 订单开航日不在航线费率有效期内"
echo "  2. 或强制指定已过期的报价版本（route_rate_version: V1）"
echo ""
echo "查看详情："
echo "  curl $BASE/surcharge/$REC1  # 正常单"
echo "  curl $BASE/surcharge/$REC2  # 报价过期单"
echo "  curl $BASE/surcharge/$REC3  # 箱型不匹配单"
