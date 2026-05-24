# 财务报销稽核验收回放链路服务

## 项目概述

本服务用于财务报销稽核验收，支持：
- 数据接入（发票PDF、差旅申请、付款流水、退款流水、盘点差异）
- 重复报销检测（多人共用行程时住宿和交通重复报销）
- 脏记录分类（缺字段、跨日、改名、金额/数量冲突）
- 审计轨迹（所有操作留痕）
- 对账服务（发票-付款对账）
- 回放异常（回放会话管理）
- 数据导出（CSV格式）

## 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npm run init-db
```

### 3. 生成测试数据
```bash
npm run seed
```

### 4. 启动服务
```bash
npm start
```

服务地址：http://localhost:3000

## 完整操作流程（按顺序执行）

### 1. 健康检查
```bash
curl -s http://localhost:3000/api/v1/health | python3 -m json.tool
```

### 2. 接入数据（通过API）

#### 2.1 创建差旅申请
```bash
curl -s -X POST http://localhost:3000/api/v1/travel/applications \
  -H "Content-Type: application/json" \
  -d '{
    "application_no": "TA_TEST_001",
    "applicant_id": "EMP001",
    "applicant_name": "张三",
    "department": "技术部",
    "travel_start_date": "2024-05-15",
    "travel_end_date": "2024-05-17",
    "travel_destination": "上海",
    "travel_purpose": "项目交付",
    "estimated_accommodation_amount": 1200,
    "estimated_transportation_amount": 1500,
    "estimated_total_amount": 2700,
    "shared_trip_group_id": "GROUP_SHANGHAI_202405",
    "operator": "财务系统"
  }' | python3 -m json.tool
```

#### 2.2 创建发票
```bash
curl -s -X POST http://localhost:3000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_no": "INV_TEST_001",
    "invoice_code": "031002400111",
    "invoice_date": "2024-05-17",
    "seller_name": "上海希尔顿酒店有限公司",
    "expense_category": "accommodation",
    "expense_item": "住宿费",
    "total_amount": 1200,
    "tax_amount": 72,
    "total_with_tax": 1272,
    "applicant_id": "EMP001",
    "applicant_name": "张三",
    "check_in_date": "2024-05-15",
    "check_out_date": "2024-05-17",
    "hotel_name": "上海希尔顿酒店",
    "room_count": 1,
    "operator": "财务系统"
  }' | python3 -m json.tool
```

#### 2.3 创建付款流水
```bash
curl -s -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payment_no": "PAY_TEST_001",
    "payment_date": "2024-05-20",
    "payer_account": "622202****1234",
    "payer_name": "公司对公账户",
    "payee_name": "张三",
    "amount": 1200,
    "purpose": "差旅费报销",
    "applicant_id": "EMP001",
    "applicant_name": "张三",
    "invoice_no": "INV_TEST_001",
    "operator": "财务系统"
  }' | python3 -m json.tool
```

#### 2.4 创建退款流水
```bash
curl -s -X POST http://localhost:3000/api/v1/refunds \
  -H "Content-Type: application/json" \
  -d '{
    "refund_no": "REF_TEST_001",
    "refund_date": "2024-05-21",
    "refund_from_name": "上海希尔顿酒店",
    "refund_to_name": "公司对公账户",
    "amount": 200,
    "refund_reason": "房价调整退款",
    "applicant_id": "EMP001",
    "applicant_name": "张三",
    "original_payment_no": "PAY_TEST_001",
    "operator": "财务系统"
  }' | python3 -m json.tool
```

#### 2.5 创建盘点差异
```bash
curl -s -X POST http://localhost:3000/api/v1/inventory/diffs \
  -H "Content-Type: application/json" \
  -d '{
    "diff_no": "DIFF_TEST_001",
    "diff_date": "2024-05-22",
    "diff_type": "amount_mismatch",
    "diff_amount": 153,
    "description": "发票金额与付款金额差异",
    "reporter": "财务系统",
    "operator": "财务系统"
  }' | python3 -m json.tool
```

### 3. 执行完整稽核
```bash
curl -s -X POST http://localhost:3000/api/v1/audit/run \
  -H "Content-Type: application/json" \
  -d '{"created_by": "财务经理"}' | python3 -m json.tool
```

### 4. 查看稽核历史
```bash
curl -s http://localhost:3000/api/v1/audit/history | python3 -m json.tool
```

### 5. 查看脏记录（失败清单）
```bash
# 查看所有脏记录
curl -s http://localhost:3000/api/v1/dirty-records | python3 -m json.tool

# 按类型筛选
curl -s "http://localhost:3000/api/v1/dirty-records?dirty_type=duplicate_record" | python3 -m json.tool

# 查看统计摘要
curl -s http://localhost:3000/api/v1/dirty-records/stats/summary | python3 -m json.tool
```

### 6. 修正脏记录
```bash
curl -s -X POST http://localhost:3000/api/v1/dirty-records/1/correct \
  -H "Content-Type: application/json" \
  -d '{
    "correction_note": "经核实，张三为实际入住人，保留其发票，李四王五发票作废",
    "corrected_by": "财务经理"
  }' | python3 -m json.tool
```

### 7. 重新汇总（修正后）
```bash
curl -s -X POST http://localhost:3000/api/v1/recalculate \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

### 8. 启动回放异常
```bash
curl -s -X POST http://localhost:3000/api/v1/replay/start \
  -H "Content-Type: application/json" \
  -d '{
    "session_name": "5月财务稽核回放",
    "start_date": "2024-05-01",
    "end_date": "2024-05-31",
    "created_by": "财务经理"
  }' | python3 -m json.tool
```

### 9. 查看回放异常
```bash
# 查看回放会话列表
curl -s http://localhost:3000/api/v1/replay/sessions | python3 -m json.tool

# 查看回放异常详情（替换SESSION_ID）
curl -s http://localhost:3000/api/v1/replay/REPLAY_MPJGEJ4A_VYN6/anomalies | python3 -m json.tool
```

### 10. 导出数据
```bash
# 导出发票
curl -s -X POST http://localhost:3000/api/v1/export/invoices \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# 导出脏记录
curl -s -X POST http://localhost:3000/api/v1/export/dirty-records \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# 导出重复报销组
curl -s -X POST http://localhost:3000/api/v1/export/duplicate-groups \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# 导出稽核报告（替换AUDIT_NO）
curl -s -X POST http://localhost:3000/api/v1/export/audit-report/AUDIT_MPJGCXNB_SJQT \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# 查看导出文件列表
curl -s http://localhost:3000/api/v1/exports | python3 -m json.tool

# 下载文件（替换FILENAME）
curl -O http://localhost:3000/api/v1/exports/dirty_records_EXP_MPJGF1ES_GJEB.csv
```

### 11. 查看审计轨迹
```bash
# 查看所有操作轨迹
curl -s "http://localhost:3000/api/v1/audit-trails?limit=10" | python3 -m json.tool

# 按模块筛选
curl -s "http://localhost:3000/api/v1/audit-trails?operation_module=AUDIT" | python3 -m json.tool
```

## 脏记录类型说明

| 类型 | 说明 |
|------|------|
| missing_field | 缺少必填字段 |
| cross_date | 日期逻辑错误（如入住日期晚于退房日期） |
| name_change | 名称变更 |
| amount_conflict | 金额冲突 |
| quantity_conflict | 数量冲突 |
| duplicate_record | 重复记录（重复报销） |

## 项目结构

```
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── travelController.js    # 差旅申请
│   │   ├── invoiceController.js   # 发票
│   │   ├── paymentController.js   # 付款/退款
│   │   └── inventoryController.js # 盘点差异
│   ├── models/               # 数据模型
│   │   └── db.js                   # 数据库连接
│   ├── routes/               # 路由
│   │   └── index.js                # 所有API路由
│   ├── services/             # 业务服务
│   │   ├── auditTrailService.js    # 审计轨迹
│   │   ├── dirtyRecordService.js   # 脏记录
│   │   ├── auditEngineService.js   # 稽核引擎
│   │   ├── exportService.js        # 导出服务
│   │   └── replayService.js        # 回放服务
│   └── server.js             # 服务入口
├── scripts/                  # 脚本
│   ├── init-db.js           # 数据库初始化
│   └── seed-data.js         # 测试数据生成
├── data/                     # 数据库文件
├── uploads/                  # 上传文件
├── exports/                  # 导出文件
└── logs/                     # 日志文件
```

## 核心数据库表

| 表名 | 说明 |
|------|------|
| travel_applications | 差旅申请表 |
| invoices | 发票表 |
| payment_flows | 付款流水表 |
| refund_flows | 退款流水表 |
| inventory_diffs | 盘点差异表 |
| dirty_records | 脏记录表 |
| audit_trails | 审计轨迹表 |
| audit_results | 稽核结果表 |
| duplicate_groups | 重复报销组表 |
| replay_sessions | 回放会话表 |

## 财务经理关注点

1. **命令脚本**：以上所有curl命令可直接复制执行
2. **HTTP读写**：所有API请求响应都有明确的请求和响应格式
3. **本地持久化**：所有数据存储在SQLite数据库中，操作轨迹完整记录
4. **数据一致性**：详情接口、历史查询、导出文件使用同一套数据源

## 验证清单

- [ ] 健康检查正常
- [ ] 数据接入API正常工作
- [ ] 稽核能检测出重复报销（住宿/交通）
- [ ] 脏记录分类正确（缺字段/跨日/重复）
- [ ] 修正脏记录后能重新汇总
- [ ] 回放能展示所有异常
- [ ] 导出CSV文件内容正确
- [ ] 审计轨迹完整记录所有操作
