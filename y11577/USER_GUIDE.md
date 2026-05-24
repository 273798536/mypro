# 外协加工对账重试补偿队列系统 - 使用指南

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install -r requirements.txt

# 配置数据库 (PostgreSQL)
# 修改 app/config.py 中的 DATABASE_URL

# 创建数据库表
# 启动服务时会自动创建表

# 初始化权限和测试用户
python scripts/init_data.py
```

### 2. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问: http://localhost:8000/docs 查看API文档

### 3. 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 主管 | 全部权限 |
| reviewer | reviewer123 | 复核员 | 复核审批 |
| entry | entry123 | 录入员 | 数据录入 |
| viewer | viewer123 | 只读 | 仅查看 |

---

## 一、样例材料

### 1.1 外协送货单录入样例

**场景**: 夜间抢修，供应商"精工机械"送来半成品"齿轮轴A"

```bash
curl -X POST "http://localhost:8000/api/v1/deliveries/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "delivery_no": "WH20240524001",
    "supplier_code": "SUP001",
    "supplier_name": "精工机械有限公司",
    "product_code": "PROD001",
    "product_name": "齿轮轴A",
    "delivery_date": "2024-05-24",
    "quantity": 100,
    "unit_price": 50.00,
    "total_amount": 5000.00,
    "batch_no": "BATCH20240524",
    "work_order_no": "WO20240524001",
    "status": "pending"
  }'
```

**幂等性验证**: 重复提交相同请求，只会更新同一条记录，不会创建新记录。

### 1.2 返修记录录入样例

**场景**: 同一批半成品分批返工，第一批50件返修

```bash
curl -X POST "http://localhost:8000/api/v1/repairs/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "repair_no": "FX20240524001",
    "delivery_id": 1,
    "repair_date": "2024-05-24",
    "repair_type": "尺寸超差",
    "repair_reason": "热处理变形导致内孔尺寸超差",
    "repair_quantity": 50,
    "repair_cost": 500.00,
    "responsible_party": "供应商",
    "batch_no": "BATCH20240524-FX01",
    "status": "pending"
  }'
```

### 1.3 扣款明细录入样例

**场景**: 因返修产生的供应商扣款

```bash
curl -X POST "http://localhost:8000/api/v1/deductions/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deduction_no": "KK20240524001",
    "delivery_id": 1,
    "repair_id": 1,
    "deduction_type": "返修扣款",
    "deduction_date": "2024-05-24",
    "deduction_amount": 500.00,
    "deduction_reason": "热处理变形返修费用",
    "deduction_basis": "质量协议第3.2条",
    "status": "pending"
  }'
```

### 1.4 班次记录补录样例

**场景**: 补录夜班抢修班次

```bash
curl -X POST "http://localhost:8000/api/v1/shifts/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shift_date": "2024-05-24",
    "shift_type": "夜班",
    "team_code": "TEAM01",
    "team_name": "机修一班",
    "worker_count": 5,
    "work_hours": 8,
    "output_quantity": 50,
    "product_code": "PROD001",
    "product_name": "齿轮轴A",
    "status": "completed"
  }'
```

---

## 二、失败路径分析

### 2.1 常见错误类型及处理

| 错误码 | 错误类型 | 原因 | 可重试 |
|--------|---------|------|--------|
| DELIVERY_NOT_FOUND | 外协送货单不存在 | 关联的送货单已被删除 | 否 |
| REPAIR_NOT_FOUND | 返修记录不存在 | 关联的返修记录已被删除 | 否 |
| DEDUCTION_NOT_FOUND | 扣款明细不存在 | 关联的扣款明细已被删除 | 否 |
| DELIVERY_PROCESS_ERROR | 送货单处理错误 | 计算汇总时发生异常 | 是 |
| REPAIR_PROCESS_ERROR | 返修处理错误 | 计算汇总时发生异常 | 是 |
| DEDUCTION_PROCESS_ERROR | 扣款处理错误 | 计算汇总时发生异常 | 是 |
| UNEXPECTED_ERROR | 未知错误 | 系统异常 | 是 |
| CREATE_ERROR | 创建失败 | 数据校验不通过 | 否 |

### 2.2 失败场景复现

#### 场景1: 关联送货单不存在导致死信

**触发条件**:
1. 创建送货单A，成功入队
2. 手动删除送货单A
3. 队列处理时找不到记录

**失败路径**:
```
创建送货单 → 入队成功 → 人工删除送货单 → 队列处理 → DELIVERY_NOT_FOUND →
重试1次(失败) → 重试2次(失败) → 重试3次(失败) → 进入死信队列
```

**查看失败**:
```bash
# 查看死信队列
curl "http://localhost:8000/api/v1/queue/dead-letter" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### 场景2: 数据库连接超时导致重试

**触发条件**: 处理时数据库连接超时

**失败路径**:
```
入队 → 处理中 → 数据库连接超时 → UNEXPECTED_ERROR →
等待5分钟 → 重试1次 → 成功 → 补偿入账 → 关闭
```

**查看重试日志**:
```bash
# 查看队列处理日志
curl "http://localhost:8000/api/v1/queue/?status=failed" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 三、修正方式

### 3.1 人工处理死信队列

#### 方式1: 重新重试

```bash
curl -X POST "http://localhost:8000/api/v1/queue/1/manual-handle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "action": "retry",
    "note": "已恢复关联数据，重新处理"
  }'
```

#### 方式2: 跳过处理

```bash
curl -X POST "http://localhost:8000/api/v1/queue/1/manual-handle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "action": "skip",
    "note": "数据无效，跳过此条"
  }'
```

#### 方式3: 人工调整

```bash
curl -X POST "http://localhost:8000/api/v1/queue/1/manual-handle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "action": "adjust",
    "note": "转入人工调整流程"
  }'
```

### 3.2 批量重试死信

```bash
curl -X POST "http://localhost:8000/api/v1/queue/dead-letter/retry-all" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3.3 标记失败记录为已解决

```bash
curl -X POST "http://localhost:8000/api/v1/queue/failed-records/1/resolve?resolution_note=已修正数据重新录入" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3.4 数据修正前后对比

```bash
# 查看变更历史对比
curl "http://localhost:8000/api/v1/reports/compare/before-after?business_type=delivery&business_id=1" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "business_type": "delivery",
    "business_id": 1,
    "change_count": 2,
    "field_changes": {
      "total_amount": [
        {
          "old_value": 5000,
          "new_value": 5500,
          "change_reason": "单价调整",
          "operator_name": "复核员张三",
          "created_at": "2024-05-24T10:30:00"
        }
      ]
    }
  }
}
```

---

## 四、报表变化追踪

### 4.1 结算汇总报表

```bash
# 获取汇总报表
curl "http://localhost:8000/api/v1/reports/settlement-summary?start_date=2024-05-01&end_date=2024-05-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.2 追溯单条记录来源

**关键功能**: 报表中的每个数字都能追到原始记录

```bash
# 查看汇总记录的来源明细
curl "http://localhost:8000/api/v1/reports/settlement-summary/1/source-records" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "supplier_code": "SUP001",
      "supplier_name": "精工机械有限公司",
      "delivery_amount": 5000,
      "repair_amount": 500,
      "deduction_amount": 500,
      "final_amount": 5000
    },
    "deliveries": [
      {"id": 1, "delivery_no": "WH20240524001", "total_amount": 5000}
    ],
    "repairs": [
      {"id": 1, "repair_no": "FX20240524001", "repair_cost": 500}
    ],
    "deductions": [
      {"id": 1, "deduction_no": "KK20240524001", "deduction_amount": 500}
    ]
  }
}
```

### 4.3 导出报表

```bash
# 导出Excel
curl "http://localhost:8000/api/v1/reports/export/settlement-summary?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o settlement.xlsx

# 导出CSV
curl "http://localhost:8000/api/v1/reports/export/settlement-summary?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o settlement.csv
```

### 4.4 老板看板 (重点关注)

```bash
curl "http://localhost:8000/api/v1/reports/dashboard/overview" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**核心指标**:
- **可重试数量**: 待重试的失败记录数
- **死信数量**: 需要人工干预的记录数
- **错误分类**: 按错误码统计，便于定位问题根源
- **恢复后续跑**: 处理成功的记录自动进入汇总

---

## 五、全链路追踪

### 5.1 单条记录完整追踪

```bash
curl "http://localhost:8000/api/v1/reports/trace/record?business_type=delivery&business_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**返回内容**:
1. 记录基本信息
2. 队列处理历史 (每次重试的时间、结果、错误信息)
3. 字段变更历史 (谁在什么时候改了什么，原因是什么)

### 5.2 队列统计概览

```bash
curl "http://localhost:8000/api/v1/queue/statistics" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**返回内容**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "pending": 10,
      "processing": 2,
      "success": 100,
      "failed": 5,
      "dead_letter": 3,
      "manual_handling": 1
    },
    "error_breakdown": {
      "DELIVERY_NOT_FOUND": {
        "count": 3,
        "status": ["dead_letter"],
        "business_types": ["delivery"]
      }
    }
  }
}
```

---

## 六、权限矩阵说明

### 6.1 角色权限对比

| 功能 | 只读用户 | 录入员 | 复核员 | 主管 |
|------|---------|--------|--------|------|
| 查看数据 | ✅ | ✅ | ✅ | ✅ |
| 录入送货单 | ❌ | ✅ | ✅ | ✅ |
| 录入返修记录 | ❌ | ✅ | ✅ | ✅ |
| 录入扣款明细 | ❌ | ✅ | ✅ | ✅ |
| 录入班次记录 | ❌ | ✅ | ✅ | ✅ |
| 修改自己录入的 | ❌ | ✅ | ✅ | ✅ |
| 修改他人录入的 | ❌ | ❌ | ✅ | ✅ |
| 复核审批 | ❌ | ❌ | ✅ | ✅ |
| 查看队列统计 | ❌ | ❌ | ✅ | ✅ |
| 人工处理队列 | ❌ | ❌ | ❌ | ✅ |
| 重试死信 | ❌ | ❌ | ❌ | ✅ |
| 查看变更对比 | ❌ | ❌ | ❌ | ✅ |
| 导出报表 | ❌ | ❌ | ✅ | ✅ |

### 6.2 字段可见性控制

| 字段 | 只读 | 录入 | 复核 | 主管 |
|------|------|------|------|------|
| 基本信息(单号、日期) | ✅ | ✅ | ✅ | ✅ |
| 数量 | ✅ | ✅ | ✅ | ✅ |
| 单价/金额 | ❌ | ✅ | ✅ | ✅ |
| 状态 | ✅ | ✅ | ✅ | ✅ |
| 处理日志 | ❌ | ❌ | ✅ | ✅ |
| 错误详情 | ❌ | ❌ | ✅ | ✅ |

---

## 七、最佳实践

### 7.1 避免重复扣款

1. **使用幂等键**: 同一批返修只生成一条扣款记录
2. **批次号关联**: 通过 batch_no 关联同一批半成品
3. **状态检查**: 复核前检查是否已有相同类型的扣款

### 7.2 夜间抢修补录流程

1. 先录外协送货单 (带抢修标识)
2. 待返修完成后录返修记录
3. 确认责任方后录扣款明细
4. 最后补录班次记录
5. 所有记录自动进入队列，自动补偿

### 7.3 监控告警建议

1. **死信队列监控**: 死信数量 > 0 时告警
2. **重试次数监控**: 重试次数 > 2 次时告警
3. **失败率监控**: 失败率 > 10% 时告警
4. **积压监控**: 待处理队列 > 100 条时告警

---

## 八、API 速查

| 功能 | 方法 | 路径 |
|------|------|------|
| 登录 | POST | /api/v1/auth/login |
| 创建送货单 | POST | /api/v1/deliveries/ |
| 创建返修记录 | POST | /api/v1/repairs/ |
| 创建扣款明细 | POST | /api/v1/deductions/ |
| 创建班次记录 | POST | /api/v1/shifts/ |
| 队列统计 | GET | /api/v1/queue/statistics |
| 死信队列 | GET | /api/v1/queue/dead-letter |
| 人工处理 | POST | /api/v1/queue/{id}/manual-handle |
| 结算汇总 | GET | /api/v1/reports/settlement-summary |
| 来源追溯 | GET | /api/v1/reports/settlement-summary/{id}/source-records |
| 变更对比 | GET | /api/v1/reports/compare/before-after |
| 导出报表 | GET | /api/v1/reports/export/settlement-summary |
| 看板概览 | GET | /api/v1/reports/dashboard/overview |
| 全链路追踪 | GET | /api/v1/reports/trace/record |
