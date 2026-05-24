#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=================================="
echo "水务抢修材料重试补偿队列服务 - 测试流程"
echo "=================================="
echo ""

echo "📝 步骤1: 安装依赖并初始化数据库"
echo "----------------------------------"
echo "npm install"
echo "npm run init-db"
echo ""

echo "📝 步骤2: 启动服务"
echo "----------------------------------"
echo "npm start"
echo ""

read -p "服务启动后按回车继续..."

echo ""
echo "📝 步骤3: 登录获取token (主管账号)"
echo "----------------------------------"
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "主管Token: $ADMIN_TOKEN"
echo ""

echo "📝 步骤4: 创建派工单"
echo "----------------------------------"
WORK_ORDER=$(curl -s -X POST "$BASE_URL/api/workorders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "order_no": "WO-2024-'$(date +%m%d)'001",
    "repair_type": "水管爆裂抢修",
    "site_address": "东区大道123号",
    "old_caliber": "DN100",
    "new_caliber": "DN150",
    "shift_record": "夜班 20:00-08:00"
  }')
echo "派工单创建结果: $WORK_ORDER"
WORK_ORDER_ID=$(echo $WORK_ORDER | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "派工单ID: $WORK_ORDER_ID"
echo ""

echo "📝 步骤5: 添加阀门库存记录"
echo "----------------------------------"
curl -s -X POST "$BASE_URL/api/workorders/$WORK_ORDER_ID/inventory" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "valve_type": "闸阀",
    "caliber": "DN150",
    "quantity": 2,
    "is_supplementary": true,
    "record_type": "new"
  }'
echo ""

echo "📝 步骤6: 提交补偿任务到队列"
echo "----------------------------------"
QUEUE_ITEM=$(curl -s -X POST "$BASE_URL/api/queue/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "work_order_id": "'$WORK_ORDER_ID'",
    "item_type": "material_compensation",
    "payload": {
      "workOrderId": "'$WORK_ORDER_ID'",
      "materials": [
        {
          "material_name": "DN150闸阀",
          "quantity": 2,
          "unit_price": 850.00,
          "compensation_type": "night_emergency"
        },
        {
          "material_name": "密封垫片",
          "quantity": 5,
          "unit_price": 25.00,
          "compensation_type": "normal"
        }
      ]
    }
  }')
echo "队列任务提交结果: $QUEUE_ITEM"
QUEUE_ITEM_ID=$(echo $QUEUE_ITEM | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "队列项ID: $QUEUE_ITEM_ID"
echo ""

echo "📝 步骤7: 查看队列状态"
echo "----------------------------------"
curl -s "$BASE_URL/api/queue/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "📝 步骤8: 查看重试分类统计 (站点负责人重点关注)"
echo "----------------------------------"
curl -s "$BASE_URL/api/queue/classification" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "📝 步骤9: 等待3秒让自动处理执行..."
sleep 3
echo ""

echo "📝 步骤10: 查看失败清单"
echo "----------------------------------"
curl -s "$BASE_URL/api/queue/failed" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "📝 步骤11: 手动处理队列项 (如需要)"
echo "----------------------------------"
echo "curl -X POST \"$BASE_URL/api/queue/item/$QUEUE_ITEM_ID/manual\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\" \\"
echo "  -d '{\"note\": \"已与现场确认，材料使用正确\"}'"
echo ""

echo "📝 步骤12: 查看补偿报表"
echo "----------------------------------"
curl -s "$BASE_URL/api/compensation/report?include_unverified=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "📝 步骤13: 导出CSV报表"
echo "----------------------------------"
echo "curl -s \"$BASE_URL/api/compensation/export\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\" -o report.csv"
echo ""

echo "📝 步骤14: 查看队列项历史追踪"
echo "----------------------------------"
curl -s "$BASE_URL/api/queue/item/$QUEUE_ITEM_ID/history" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "📝 步骤15: 测试重启后数据持久化"
echo "----------------------------------"
echo "1. 停止服务 (Ctrl+C)"
echo "2. 重新启动: npm start"
echo "3. 再次查询队列状态:"
echo "   curl -s \"$BASE_URL/api/queue/status\" -H \"Authorization: Bearer $ADMIN_TOKEN\" | python3 -m json.tool"
echo "4. 再次查询历史记录:"
echo "   curl -s \"$BASE_URL/api/queue/item/$QUEUE_ITEM_ID/history\" -H \"Authorization: Bearer $ADMIN_TOKEN\" | python3 -m json.tool"
echo ""

echo "=================================="
echo "测试流程完成!"
echo "=================================="
echo ""
echo "其他常用命令:"
echo ""
echo "# 使用录入员账号登录"
echo "ENTRY_TOKEN=\$(curl -s -X POST \"$BASE_URL/api/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"entry1\",\"password\":\"entry123\"}' | grep -o '\"token\":\"[^\"]*\"' | cut -d'\"' -f4)"
echo ""
echo "# 使用复核员账号登录"
echo "REVIEWER_TOKEN=\$(curl -s -X POST \"$BASE_URL/api/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"reviewer1\",\"password\":\"review123\"}' | grep -o '\"token\":\"[^\"]*\"' | cut -d'\"' -f4)"
echo ""
echo "# 使用只读账号登录"
echo "VIEWER_TOKEN=\$(curl -s -X POST \"$BASE_URL/api/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"viewer1\",\"password\":\"view123\"}' | grep -o '\"token\":\"[^\"]*\"' | cut -d'\"' -f4)"
echo ""
