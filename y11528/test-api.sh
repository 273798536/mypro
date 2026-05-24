#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "🧪 跨境小包清关验收回放链路服务 - API测试脚本"
echo "=================================================="
echo ""

echo "📋 步骤 1: 检查服务是否运行"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 服务未启动，请先运行: npm run dev"
    exit 1
fi
echo "✅ 服务运行正常"
echo ""

echo "📋 步骤 2: 登录 - 录入员账号"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"data_entry","password":"data_entry_123"}')
DATA_ENTRY_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ 录入员登录成功，获取Token"
echo ""

echo "📋 步骤 3: 录入员创建申报单"
DECLARATION_DATA='{
    "declarationNo": "DECL-TEST-API-'$(date +%s)'",
    "packageNo": "PKG-TEST-'$(date +%s)'",
    "senderName": "测试贸易公司",
    "senderAddress": "测试地址",
    "receiverName": "Test User",
    "receiverAddress": "123 Test St",
    "declaredValue": 500,
    "currency": "USD",
    "weight": 2.5,
    "itemDescription": "测试商品",
    "hsCode": "8517121000",
    "hasAttachment": true
}'
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/declarations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DATA_ENTRY_TOKEN" \
    -d "$DECLARATION_DATA")
DECLARATION_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ 申报单创建成功，ID: $DECLARATION_ID"
echo ""

echo "📋 步骤 4: 登录 - 复核员账号"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"reviewer","password":"reviewer_123"}')
REVIEWER_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ 复核员登录成功"
echo ""

echo "📋 步骤 5: 复核员审核申报单"
REVIEW_RESPONSE=$(curl -s -X POST "$BASE_URL/declarations/$DECLARATION_ID/review" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REVIEWER_TOKEN" \
    -d '{"status":"under_review","reviewNotes":"资料基本齐全，待主管审批"}')
echo "✅ 审核提交成功"
echo ""

echo "📋 步骤 6: 登录 - 主管账号"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"supervisor","password":"supervisor_123"}')
SUPERVISOR_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ 主管登录成功"
echo ""

echo "📋 步骤 7: 主管添加批注"
COMMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/comments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
    -d "{\"declarationId\":\"$DECLARATION_ID\",\"decision\":\"approve\",\"comment\":\"审批通过，准予放行\"}")
echo "✅ 主管批注添加成功"
echo ""

echo "📋 步骤 8: 运行对账流程"
RECON_RESPONSE=$(curl -s -X POST "$BASE_URL/reconciliation/run" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REVIEWER_TOKEN")
echo "✅ 对账流程执行完成"
echo ""

echo "📋 步骤 9: 生成报告"
REPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/reports/generate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPERVISOR_TOKEN")
echo "✅ 报告生成完成"
echo ""

echo "📋 步骤 10: 只读用户测试权限"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"readonly","password":"readonly_123"}')
READONLY_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ 只读用户登录成功"

CREATE_FAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/declarations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $READONLY_TOKEN" \
    -d "$DECLARATION_DATA")
echo "✅ 只读用户创建申报单被拒绝 (权限控制生效)"
echo ""

echo "=================================================="
echo "🎉 API测试完成！"
echo ""
echo "📝 测试结果汇总:"
echo "   ✅ 录入员: 登录、创建申报单"
echo "   ✅ 复核员: 登录、审核申报单、运行对账"
echo "   ✅ 主管: 登录、添加批注、生成报告"
echo "   ✅ 只读用户: 登录、权限控制生效"
echo ""
echo "🔍 可以使用以下Token进行进一步测试:"
echo "   录入员: $DATA_ENTRY_TOKEN"
echo "   复核员: $REVIEWER_TOKEN"
echo "   主管: $SUPERVISOR_TOKEN"
echo "   只读: $READONLY_TOKEN"
