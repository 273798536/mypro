# 社区团购售后验收回放链路服务 - 测试命令

## 前置准备

```bash
# 1. 安装依赖
npm install

# 2. 造数（生成测试数据）
npm run seed

# 3. 启动服务
npm run dev
```

## 一、基础测试

### 1. 健康检查
```bash
curl -X GET http://localhost:3000/api/health
```

### 2. 获取统计数据
```bash
curl -X GET http://localhost:3000/api/statistics
```

按城市筛选：
```bash
curl -X GET "http://localhost:3000/api/statistics?city=北京"
```

## 二、订单管理

### 1. 创建售后单
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "city": "北京",
    "leaderId": "L0001",
    "leaderName": "张团长",
    "skuId": "SKU001",
    "skuName": "新鲜草莓"
  }'
```

### 2. 获取订单列表
```bash
curl -X GET "http://localhost:3000/api/orders?page=1&pageSize=10"
```

按城市/状态筛选：
```bash
curl -X GET "http://localhost:3000/api/orders?page=1&pageSize=10&city=北京&status=LEADER_SUBMITTED"
```

### 3. 获取订单详情
```bash
# 先用列表接口获取一个 orderNo，替换下面的 {orderNo}
curl -X GET http://localhost:3000/api/orders/{orderNo}
```

## 三、业务流程测试

### 1. 团长提交退款申请
```bash
curl -X POST http://localhost:3000/api/orders/{orderNo}/leader-refund \
  -H "Content-Type: application/json" \
  -d '{
    "refundQuantity": 2,
    "refundAmount": 100.50,
    "reason": "商品坏了",
    "operatorId": "L0001",
    "operatorName": "张团长"
  }'
```

### 2. 仓库复核
```bash
curl -X POST http://localhost:3000/api/orders/{orderNo}/warehouse-review \
  -H "Content-Type: application/json" \
  -d '{
    "actualQuantity": 2,
    "actualAmount": 100.50,
    "isDamaged": true,
    "isMissing": false,
    "reviewResult": "APPROVED",
    "reviewRemark": "核实为坏品，同意退款",
    "operatorId": "W001",
    "operatorName": "李仓管"
  }'
```

少发商品场景：
```bash
curl -X POST http://localhost:3000/api/orders/{orderNo}/warehouse-review \
  -H "Content-Type: application/json" \
  -d '{
    "actualQuantity": 1,
    "actualAmount": 50.25,
    "isDamaged": false,
    "isMissing": true,
    "reviewResult": "APPROVED",
    "reviewRemark": "少发一件，按实际数量退款",
    "operatorId": "W001",
    "operatorName": "李仓管"
  }'
```

### 3. 财务退款
```bash
curl -X POST http://localhost:3000/api/orders/{orderNo}/refund \
  -H "Content-Type: application/json" \
  -d '{
    "refundAmount": 100.50,
    "refundMethod": "微信支付",
    "operatorId": "F001",
    "operatorName": "王财务"
  }'
```

### 4. 添加用户备注
```bash
curl -X POST http://localhost:3000/api/orders/{orderNo}/remarks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "U00001",
    "userName": "用户A",
    "content": "希望尽快处理，谢谢",
    "images": ["/images/remark1.jpg"]
  }'
```

### 5. 查看状态流转日志
```bash
curl -X GET http://localhost:3000/api/orders/{orderNo}/status-logs
```

## 四、脏数据处理

### 1. 检测脏数据
```bash
curl -X POST http://localhost:3000/api/dirty-records/detect
```

### 2. 获取脏记录列表
```bash
curl -X GET http://localhost:3000/api/dirty-records
```

筛选未解决：
```bash
curl -X GET "http://localhost:3000/api/dirty-records?isResolved=false"
```

### 3. 解决脏记录（仅标记）
```bash
# 先用列表接口获取 dirtyId，替换下面的 {dirtyId}
curl -X POST http://localhost:3000/api/dirty-records/{dirtyId}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolverId": "C001",
    "resolverName": "城市负责人-赵经理",
    "remark": "已核实",
    "reReconcile": true
  }'
```

### 4. 解决脏记录（修正原始记录 + 重新对账）
```bash
# 修正缺字段问题，同时触发重新对账
curl -X POST http://localhost:3000/api/dirty-records/{dirtyId}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolverId": "C001",
    "resolverName": "城市负责人-赵经理",
    "remark": "已补充团长ID",
    "correctedValue": "L0021",
    "reReconcile": true
  }'
```

### 5. 脏记录类型说明
- **MISSING_FIELD**: 缺字段 - 用 correctedValue 补充缺失值
- **CROSS_DAY**: 跨日 - 核实后标记解决
- **NAME_CHANGED**: 改名 - 核实商品名称变更
- **AMOUNT_CONFLICT**: 金额冲突 - 用 correctedValue 修正金额
- **QUANTITY_CONFLICT**: 数量冲突 - 用 correctedValue 修正数量

## 五、对账功能

### 1. 批量对账
```bash
curl -X POST http://localhost:3000/api/reconciliation \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. 单订单对账
```bash
curl -X POST http://localhost:3000/api/reconciliation \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "{orderNo}"
  }'
```

### 3. 获取对账结果
```bash
curl -X GET http://localhost:3000/api/reconciliation
```

筛选不平账：
```bash
curl -X GET "http://localhost:3000/api/reconciliation?isMatched=false"
```

## 六、导出功能

### 1. 导出订单列表
```bash
curl -X POST http://localhost:3000/api/export/orders \
  -H "Content-Type: application/json" \
  -d '{}'
```

按城市导出：
```bash
curl -X POST http://localhost:3000/api/export/orders \
  -H "Content-Type: application/json" \
  -d '{
    "city": "北京"
  }'
```

### 2. 导出订单详情
```bash
curl -X POST http://localhost:3000/api/export/orders/{orderNo}
```

### 3. 导出脏记录
```bash
# 全部导出
curl -X POST http://localhost:3000/api/export/dirty-records \
  -H "Content-Type: application/json" \
  -d '{}'

# 仅导出未解决
curl -X POST http://localhost:3000/api/export/dirty-records \
  -H "Content-Type: application/json" \
  -d '{
    "isResolved": false
  }'
```

### 4. 导出对账报告
```bash
curl -X POST http://localhost:3000/api/export/reconciliation \
  -H "Content-Type: application/json" \
  -d '{}'
```

按城市导出：
```bash
curl -X POST http://localhost:3000/api/export/reconciliation \
  -H "Content-Type: application/json" \
  -d '{
    "city": "北京"
  }'
```

### 5. 导出状态日志
```bash
curl -X POST http://localhost:3000/api/export/status-logs \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 七、完整测试流程（推荐执行顺序）

```bash
# 1. 安装依赖并造数
npm install
npm run seed

# 2. 启动服务（新开终端）
npm run dev

# 3. 健康检查
curl -X GET http://localhost:3000/api/health

# 4. 查看统计
curl -X GET http://localhost:3000/api/statistics

# 5. 检测脏数据
curl -X POST http://localhost:3000/api/dirty-records/detect

# 6. 批量对账
curl -X POST http://localhost:3000/api/reconciliation -H "Content-Type: application/json" -d '{}'

# 7. 导出失败清单（未解决脏记录）
curl -X POST http://localhost:3000/api/export/dirty-records -H "Content-Type: application/json" -d '{"isResolved": false}'

# 8. 导出对账报告
curl -X POST http://localhost:3000/api/export/reconciliation -H "Content-Type: application/json" -d '{}'

# 9. 查看订单详情（任选一个订单）
curl -X GET http://localhost:3000/api/orders/{orderNo}

# 10. 验证数据一致性：对比详情接口与导出文件内容
```

## 八、使用脚本一键回放

```bash
# 执行完整回放流程（造数后运行）
npm run replay
```

## 九、城市负责人关注点

### 关键命令
1. **HTTP读写记录** - 查看服务日志或终端输出
2. **本地持久化** - SQLite数据库文件：`./data/aftersales.db`
3. **导出文件** - CSV文件位于：`./exports/` 目录

### 一致性验证
- 详情接口返回数据 vs 导出CSV内容
- 对账结果 vs 状态日志记录
- 脏记录处理前后数据对比
