# 客服知识库发布验收回放链路服务 - 使用文档

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run init-db

# 3. 造测试数据（含脏数据）
npm run seed

# 4. 启动服务
npm start

# 5. 执行对账
npm run reconcile

# 6. 导出数据
npm run export
```

---

## 一、样例材料

### 1.1 变更单导入样例

**请求地址**: `POST /api/change-orders/batch`

**请求体**:
```json
{
  "operator": "admin",
  "orders": [
    {
      "order_no": "CO202405001",
      "title": "退款政策 - 7天无理由更新",
      "content": "调整退款流程：用户提交申请后24小时内审核",
      "kb_article_id": "KB001",
      "kb_article_title": "退款政策说明",
      "status": "pending",
      "submitter": "content_team",
      "submit_time": "2024-05-01T10:00:00Z",
      "version": "2.0"
    }
  ]
}
```

### 1.2 审核意见导入样例

**请求地址**: `POST /api/audit-opinions/batch`

**请求体**:
```json
{
  "operator": "audit_manager",
  "opinions": [
    {
      "change_order_id": "uuid-here",
      "order_no": "CO202405001",
      "auditor": "manager_zhang",
      "opinion": "内容准确，符合政策要求",
      "result": "pass",
      "audit_time": "2024-05-01T14:30:00Z"
    }
  ]
}
```

### 1.3 客服引用记录导入样例

**请求地址**: `POST /api/agent-quotes/batch`

**请求体**:
```json
{
  "operator": "system",
  "records": [
    {
      "kb_article_id": "KB001",
      "kb_article_title": "退款政策说明",
      "kb_version": "2.0",
      "agent_id": "AG001",
      "agent_name": "客服小王",
      "customer_id": "CUST10086",
      "customer_name": "张三",
      "quote_time": "2024-05-02T09:15:00Z",
      "conversation_id": "CONV000123",
      "session_id": "SESS000456",
      "order_no": "CO202405001"
    }
  ]
}
```

### 1.4 供应商对账单导入样例

**请求地址**: `POST /api/supplier-statements/batch`

**请求体**:
```json
{
  "operator": "finance",
  "statements": [
    {
      "statement_no": "STMT202405001",
      "supplier_id": "SUP001",
      "supplier_name": "知识库供应商A",
      "kb_article_id": "KB001",
      "kb_article_title": "退款政策说明",
      "quantity": 150,
      "amount": 1500.00,
      "currency": "CNY",
      "statement_date": "2024-05-01T00:00:00Z",
      "period_start": "2024-05-01T00:00:00Z",
      "period_end": "2024-05-31T23:59:59Z",
      "status": "pending"
    }
  ]
}
```

---

## 二、失败路径（脏数据类型）

### 2.1 缺字段 (missing_field)

**触发场景**:
- 变更单缺少 `submitter` 字段
- 对账单缺少 `period_start` 或 `period_end`

**系统行为**:
- 标记为 `high` 严重程度
- 保留原始数据
- 记录具体缺失字段名

**查询接口**:
```bash
GET /api/dirty-records?dirty_type=missing_field
```

### 2.2 跨日 (cross_date)

**触发场景**:
- 对账日期不在统计周期内
- 例如：statement_date = 5月15日，但 period是4月

**系统行为**:
- 标记为 `medium` 严重程度
- 记录期望周期 vs 实际日期

### 2.3 改名 (name_change)

**触发场景**:
- 同一个 `kb_article_id` 对应不同的 `kb_article_title`
- 同一个 `supplier_id` 对应不同的 `supplier_name`

**系统行为**:
- 标记为 `medium` 严重程度
- 记录历史名称列表

### 2.4 金额冲突 (amount_conflict)

**触发场景**:
- 对账单金额 ≠ 引用次数 × 单价（10元/次）

**系统行为**:
- 标记为 `high` 严重程度
- 记录计算值 vs 账单值

### 2.5 数量冲突 (quantity_conflict)

**触发场景**:
- 对账单数量 ≠ 实际客服引用次数

**系统行为**:
- 标记为 `high` 严重程度
- 关联显示引用统计

---

## 三、修正方式

### 3.1 单条处理

**请求地址**: `POST /api/dirty-records/:id/handle`

**请求体**:
```json
{
  "handler": "operator_name",
  "handle_opinion": "已与供应商确认，金额有误，按实际结算",
  "status": "fixed"
}
```

**状态值**:
- `fixed` - 已修正
- `ignored` - 忽略（确认正常）
- `confirmed` - 确认问题（待业务处理）

### 3.2 修正后重新对账

```bash
# 1. 修正源数据（通过更新接口）
PUT /api/supplier-statements/:id
{
  "quantity": 120,
  "amount": 1200,
  "operator": "finance",
  "change_reason": "修正对账数量和金额"
}

# 2. 重新执行对账
npm run reconcile

# 3. 验证脏记录是否减少
GET /api/dirty-records?status=pending
```

### 3.3 数据版本追踪

每次更新对账单时，系统自动保存版本快照：
```bash
GET /api/supplier-statements/:id
# 返回的 raw_data 包含原始数据
```

---

## 四、报表变化说明

### 4.1 对账前 → 对账后

| 阶段 | 变更单 | 对账单 | 脏记录 | 操作轨迹 |
|------|--------|--------|--------|----------|
| 造数后 | 6条 | 6条 | 0条 | +1条（seed） |
| 对账后 | 6条 | 6条 | +N条 | +2条（reconcile） |
| 修正后 | 6条 | 6条 | 减少 | +2条（update + dirty_handle） |

### 4.2 导出文件一致性保证

**三种查询方式返回同一套事实**:

1. **详情接口**: `GET /api/export/order-detail/CO0001`
   - 变更单基本信息
   - 关联的审核意见列表
   - 关联的客服引用记录列表
   - 引用统计数据

2. **历史查询**: `GET /api/change-orders/order-no/CO0001`
   - 按版本号查询历史版本
   - 与 raw_data 原始数据一致

3. **导出CSV**: `POST /api/export/change-orders`
   - 字段与详情接口一一对应
   - 使用相同的数据源查询逻辑

**关键**: 所有导出和查询都使用相同的 Model 层函数，确保不会出现"一处修改另一处还是旧值"的问题。

---

## 五、服务运营重点

### 5.1 命令脚本清单

| 命令 | 说明 | 审计轨迹类型 |
|------|------|-------------|
| `npm run init-db` | 初始化数据库表 | - |
| `npm run seed` | 批量造测试数据 | `seed` |
| `npm run reconcile` | 执行全量对账 | `reconcile` |
| `npm run export` | 导出全部数据 | `export` |
| `npm start` | 启动HTTP服务 | `server_start` |

### 5.2 HTTP接口清单

**数据导入（写）**:
- `POST /api/change-orders/batch` - 批量导入变更单
- `POST /api/audit-opinions/batch` - 批量导入审核意见
- `POST /api/agent-quotes/batch` - 批量导入客服引用
- `POST /api/supplier-statements/batch` - 批量导入对账单

**数据查询（读）**:
- `GET /api/change-orders` - 查询变更单列表
- `GET /api/change-orders/:id` - 变更单详情
- `GET /api/export/order-detail/:orderNo` - 全链路详情

**对账**:
- `POST /api/reconcile/all` - 全量对账
- `POST /api/reconcile/statements` - 仅对对账单
- `POST /api/reconcile/change-orders` - 仅对变更单

**脏记录**:
- `GET /api/dirty-records` - 查询脏记录
- `GET /api/dirty-records/stats` - 脏记录统计
- `POST /api/dirty-records/:id/handle` - 处理脏记录

**导出**:
- `POST /api/export/change-orders` - 导出变更单CSV
- `POST /api/export/supplier-statements` - 导出对账单CSV
- `POST /api/export/dirty-records` - 导出脏记录CSV
- `POST /api/export/audit-trails` - 导出审计轨迹JSON

**审计轨迹**:
- `GET /api/audit-trails` - 查询操作轨迹
- `GET /api/audit-trails/types` - 轨迹类型枚举

### 5.3 本地持久化文件

```
data/
  └── kb-audit.db          # SQLite主数据库

exports/
  ├── change_orders_*.csv     # 变更单导出
  ├── supplier_statements_*.csv  # 对账单导出
  ├── dirty_records_*.csv     # 脏记录导出
  └── audit_trails_*.json     # 审计轨迹导出

logs/
  # 可扩展：系统日志目录
```

### 5.4 关键审计轨迹字段

| 字段 | 说明 |
|------|------|
| `action_type` | 大类：seed/server_start/request/reconcile/export/error/data_import |
| `action_subtype` | 小类：具体接口或命令 |
| `operator` | 操作人 |
| `status` | success/failed |
| `detail` | 人类可读描述 |
| `record_count` | 影响记录数 |
| `duration_ms` | 耗时（毫秒） |
| `error_message` | 失败时的错误信息 |
| `created_at` | 操作时间 |

---

## 六、回放异常场景

### 6.1 回放步骤

```bash
# 1. 查看脏记录
GET /api/dirty-records?status=pending

# 2. 查看审计轨迹，找到造数/导入时间点
GET /api/audit-trails?action_type=seed

# 3. 查看全链路详情，定位问题根源
GET /api/export/order-detail/CO0006

# 4. 处理脏记录
POST /api/dirty-records/:id/handle

# 5. 重新对账，验证修复效果
npm run reconcile

# 6. 导出最终报表
npm run export
```

### 6.2 典型异常回放

**场景**: 对账单数量999次，但实际引用只有12次

**回放路径**:
1. `GET /api/dirty-records?dirty_type=quantity_conflict` → 发现STMT0005有问题
2. `GET /api/supplier-statements?statement_no=STMT0005` → 查看对账单详情
3. `GET /api/agent-quotes/kb/KB001/stats` → 查看实际引用统计
4. `POST /api/dirty-records/:id/handle` → 标记为"确认数据有误"
5. `PUT /api/supplier-statements/:id` → 修正数据
6. `npm run reconcile` → 对账，脏记录状态更新

---

## 七、数据库表结构总览

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `change_orders` | 变更单 | order_no, kb_article_id, status |
| `audit_opinions` | 审核意见 | order_no, auditor, result |
| `agent_quote_records` | 客服引用 | kb_article_id, agent_id, quote_time |
| `supplier_statements` | 供应商对账单 | statement_no, quantity, amount |
| `audit_trails` | 操作审计轨迹 | action_type, status, operator |
| `dirty_records` | 脏记录 | dirty_type, status, source_id |
| `data_versions` | 数据版本快照 | record_type, record_id, version |
| `approval_emails` | 审批邮件 | order_no, email_from |
