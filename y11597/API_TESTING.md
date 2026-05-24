# 客服知识库发布重试补偿队列 API - 测试指南

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库（创建测试用户）
```bash
npm run init-db
```

### 3. 运行完整测试流程
```bash
npm run test-flow
```

### 4. 启动API服务
```bash
npm run dev
```

---

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | supervisor | 主管（最高权限） |
| reviewer | reviewer123 | reviewer | 复核员 |
| entry | entry123 | data_entry | 录入员 |
| viewer | viewer123 | read_only | 只读用户 |

---

## cURL 测试命令

### 1. 登录获取 Token

**使用主管账号登录：**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**保存 Token 到环境变量（后续命令使用）：**
```bash
# 替换 YOUR_TOKEN 为上面返回的 token
TOKEN="YOUR_TOKEN"
```

---

### 2. 提交补偿记录

**提交变更单来源的记录：**
```bash
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "CO-TEST-001",
    "dataSource": "change_order",
    "sourceId": "CHG-2024-001",
    "customerId": "CUST-1001",
    "customerName": "张三",
    "compensationAmount": 200.50,
    "reason": "旧口径答案下线后坐席误用，导致客户损失",
    "rawData": {
      "oldAnswer": "原补偿标准为100元",
      "newAnswer": "新标准为200元",
      "orderNo": "ORD20240101001"
    }
  }'
```

**提交审核意见来源的记录：**
```bash
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "AO-TEST-001",
    "dataSource": "audit_opinion",
    "sourceId": "AUD-2024-001",
    "customerId": "CUST-1002",
    "customerName": "李四",
    "compensationAmount": 500.00,
    "reason": "内审发现错赔，需要补偿"
  }'
```

**提交客服引用记录来源的记录：**
```bash
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "CQ-TEST-001",
    "dataSource": "customer_quote",
    "sourceId": "QUOTE-2024-001",
    "customerId": "CUST-1003",
    "customerName": "王五",
    "compensationAmount": 150.00,
    "reason": "坐席引用了错误的知识库答案"
  }'
```

**提交手工改价表来源的记录：**
```bash
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "MP-TEST-001",
    "dataSource": "manual_pricing",
    "sourceId": "MP-2024-001",
    "customerId": "CUST-1004",
    "customerName": "赵六",
    "compensationAmount": 800.00,
    "reason": "手工改价产生的差价需要补偿"
  }'
```

**测试提交坏数据（缺少必填字段）：**
```bash
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "businessKey": "BAD-TEST-001",
    "dataSource": "change_order",
    "customerId": "",
    "compensationAmount": 100.00,
    "reason": "测试坏数据"
  }'
```

---

### 3. 查询记录列表

**查询所有记录：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?page=1&pageSize=10"
```

**按状态筛选（已提交）：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?status=submitted"
```

**按数据源筛选（变更单）：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?dataSource=change_order"
```

**查看坏数据：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?isBadData=true"
```

---

### 4. 操作单条记录

**注意：请将 RECORD_ID 替换为实际的记录ID**
```bash
# 先获取记录ID
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?status=submitted&pageSize=5"

# 设置记录ID
RECORD_ID="替换为第一条记录的id"
```

**查看单条记录详情：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation/$RECORD_ID"
```

**将记录加入队列：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/queue" \
  -H "Authorization: Bearer $TOKEN"
```

**重试记录（模拟失败）：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/retry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "retryCategory": "external_service_down",
    "errorMessage": "支付网关暂时不可用，请稍后重试"
  }'
```

**人工接管：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/takeover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "外部系统故障，需要人工介入处理"}'
```

**补偿入账：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/compensate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"externalReceiptId": "PAY-2024-0101-001234"}'
```

**开始复核：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/review" \
  -H "Authorization: Bearer $TOKEN"
```

**审批通过：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"remark": "复核通过，补偿事由合理，金额正确"}'
```

**驳回（需要先有另一条复核中的记录）：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "补偿依据不足，需要补充材料"}'
```

**关闭记录：**
```bash
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "流程完成，正常关闭"}'
```

**查看状态历史：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation/$RECORD_ID/history"
```

---

### 5. 死信处理

**查看失败记录列表：**
```bash
# 查看所有失败记录
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation/failed"

# 只看未解决的
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation/failed?isResolved=false"

# 只看已解决的
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation/failed?isResolved=true"
```

**恢复死信记录（需要主管权限）：**
```bash
# 先找到死信状态的记录ID
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/compensation?status=dead_letter"

DEAD_LETTER_ID="死信记录的ID"

# 恢复死信（可以同时更新数据）
curl -X POST "http://localhost:3000/api/compensation/$DEAD_LETTER_ID/recover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "补充了缺失的客户信息",
    "updatedData": {
      "customerId": "CUST-CORRECTED-001",
      "customerName": "修正后的客户名"
    }
  }'
```

---

### 6. 报表与追溯

**查看运营报表汇总：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/report/summary"
```

**按状态查看明细：**
```bash
# 已审批的记录
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/report/status/approved"

# 死信记录
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/report/status/dead_letter"

# 复核中的记录
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/report/status/reviewing"
```

**数据追溯（查看完整链路）：**
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/report/trace/$RECORD_ID"
```

---

### 7. 权限测试

**测试只读用户权限：**
```bash
# 先用只读用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"viewer","password":"viewer123"}'

VIEWER_TOKEN="只读用户的token"

# 尝试查看列表（应该成功，但字段较少）
curl -H "Authorization: Bearer $VIEWER_TOKEN" "http://localhost:3000/api/compensation?pageSize=5"

# 尝试提交记录（应该失败 - 权限不足）
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -d '{
    "businessKey": "TEST-PERMISSION-001",
    "dataSource": "change_order",
    "customerId": "CUST-001",
    "compensationAmount": 100.00,
    "reason": "测试权限"
  }'

# 尝试查看报表（应该失败 - 权限不足）
curl -H "Authorization: Bearer $VIEWER_TOKEN" "http://localhost:3000/api/report/summary"
```

**测试录入员权限：**
```bash
# 录入员登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"entry","password":"entry123"}'

ENTRY_TOKEN="录入员的token"

# 提交记录（应该成功）
curl -X POST http://localhost:3000/api/compensation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -d '{
    "businessKey": "TEST-ENTRY-001",
    "dataSource": "change_order",
    "customerId": "CUST-ENTRY-001",
    "compensationAmount": 100.00,
    "reason": "录入员测试"
  }'

# 尝试审批（应该失败 - 权限不足）
curl -X POST "http://localhost:3000/api/compensation/$RECORD_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ENTRY_TOKEN" \
  -d '{"remark": "测试"}'
```

---

## 完整测试流程脚本

将以下内容保存为 `test-api.sh` 然后运行：

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 1. 登录获取 Token ==="
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo "Token: $TOKEN"
echo ""

echo "=== 2. 提交多条补偿记录 ==="
for i in 1 2 3; do
  echo "提交记录 $i:"
  curl -s -X POST $BASE_URL/api/compensation \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"businessKey\": \"BATCH-$i-$(date +%s)\",
      \"dataSource\": \"change_order\",
      \"sourceId\": \"SRC-$i\",
      \"customerId\": \"CUST-$i\",
      \"customerName\": \"客户$i\",
      \"compensationAmount\": $((100 + i * 50)).00,
      \"reason\": \"批量测试记录 $i\"
    }" | grep -o '"id":"[^"]*"' | head -1
done
echo ""

echo "=== 3. 查看记录列表 ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/compensation?pageSize=10" | python3 -m json.tool | head -50
echo ""

echo "=== 4. 查看失败记录列表 ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/compensation/failed" | python3 -m json.tool
echo ""

echo "=== 5. 查看运营报表 ==="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/report/summary" | python3 -m json.tool
echo ""

echo "测试完成！"
```

---

## 数据字典

### 状态枚举 (CompensationStatus)
- `submitted` - 已提交
- `queued` - 已排队
- `processing` - 处理中
- `retrying` - 重试中
- `manual_takeover` - 人工接管
- `compensated` - 已补偿
- `reviewing` - 复核中
- `approved` - 已审批
- `rejected` - 已驳回
- `closed` - 已关闭
- `dead_letter` - 死信

### 数据源枚举 (DataSource)
- `change_order` - 变更单
- `audit_opinion` - 审核意见
- `customer_quote` - 客服引用记录
- `manual_pricing` - 手工改价表
- `shift_record` - 班次记录

### 重试分类枚举 (RetryCategory)
- `temporary_error` - 临时错误
- `data_inconsistency` - 数据不一致
- `external_service_down` - 外部服务不可用
- `missing_information` - 信息缺失
- `business_rule_violation` - 违反业务规则
- `unknown` - 未知
