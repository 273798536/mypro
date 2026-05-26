# 门店会员储值权限追责台账 API

## 项目概述

本系统是为解决门店会员储值退款后库存不回滚、跨店消费余额历史断裂等问题而设计的台账服务。系统将充值流水、退款申请、门店交接表和外部回执四类数据统一管理，提供完整的状态流转、审计追踪、角色视图和脱敏导出功能。

## 核心功能

### 1. 四类数据接入
- **充值流水**：记录会员储值充值明细，包含前后余额校验
- **退款申请**：关联充值订单，支持库存回滚标记
- **门店交接表**：店长交接时的储值余额、现金、待退款统计
- **外部回执**：第三方支付渠道的交易凭证

### 2. 状态流转机制
```
草稿(draft) → 提交(submitted) → 确认(confirmed) → 审计(audited)
                    ↓
                 驳回(rejected)
```

### 3. 审计追踪
- 所有状态变更均记录操作人、角色、变更原因
- 支持字段级变更历史追溯
- 已审计记录不可修改（只读锁定）

### 4. 失败数据管理
- 校验失败数据不进入汇总统计
- 失败记录可查询，包含错误原因
- 支持按错误类型统计

### 5. 角色视图
| 角色 | 权限 | 敏感字段 |
|------|------|----------|
| 门店员工 | 创建草稿、查看记录 | 手机号脱敏显示 |
| 门店店长 | 提交、驳回、查看门店数据 | 部分脱敏 |
| 财务主管 | 确认、审计、导出、查看全局 | 完整数据 |
| 审计员 | 审计、查看失败记录、导出 | 完整数据 |

### 6. 脱敏导出
- 按角色权限自动脱敏
- 支持CSV格式导出
- 导出数据与详情接口一致

## 技术架构

- **框架**: Express.js + TypeScript
- **数据库**: SQLite3（本地文件存储，重启不丢失数据）
- **数据校验**: Joi
- **导出功能**: json2csv

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动服务
```bash
npm run dev
```
服务默认运行在 http://localhost:3000

### 功能验证
```bash
npm run verify
```

### 构建生产版本
```bash
npm run build
npm start
```

## API 接口

### 充值流水 `/api/recharges`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建充值流水 |
| POST | `/:id/status` | 状态变更（submit/confirm/audit/reject） |
| GET | `/` | 列表查询 |
| GET | `/:id` | 详情查询 |
| GET | `/order/:orderNo` | 按订单号查询 |
| GET | `/summary` | 汇总统计 |
| GET | `/:id/audit-trails` | 审计轨迹 |
| GET | `/export/csv` | CSV导出 |

### 退款申请 `/api/refunds`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建退款申请 |
| POST | `/:id/status` | 状态变更 |
| GET | `/` | 列表查询 |
| GET | `/:id` | 详情查询 |
| GET | `/summary` | 汇总统计 |
| GET | `/:id/audit-trails` | 审计轨迹 |
| GET | `/export/csv` | CSV导出 |

### 门店交接 `/api/handovers`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建交接记录 |
| POST | `/:id/status` | 状态变更 |
| GET | `/` | 列表查询 |
| GET | `/:id` | 详情查询 |
| GET | `/:id/audit-trails` | 审计轨迹 |
| GET | `/export/csv` | CSV导出 |

### 外部回执 `/api/receipts`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建回执记录 |
| POST | `/:id/status` | 状态变更 |
| GET | `/` | 列表查询 |
| GET | `/:id` | 详情查询 |
| GET | `/:id/audit-trails` | 审计轨迹 |
| GET | `/export/csv` | CSV导出 |

### 审计查询 `/api/audit`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/trails` | 所有审计轨迹 |
| GET | `/failed-records` | 失败记录列表 |
| GET | `/failed-records/stats` | 失败记录统计 |

### 角色视图 `/api/views/:role`
- `GET /api/views/store_staff` - 门店员工视图
- `GET /api/views/store_manager` - 门店店长视图
- `GET /api/views/finance` - 财务主管视图
- `GET /api/views/auditor` - 审计员视图

## 请求示例

### 创建充值流水
```bash
curl -X POST http://localhost:3000/api/recharges \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "R20240101001",
    "storeId": "store-001",
    "storeName": "朝阳门店",
    "memberId": "member-001",
    "memberPhone": "13800138001",
    "amount": 1000,
    "beforeBalance": 500,
    "afterBalance": 1500,
    "operatorId": "op-001",
    "operatorName": "张三",
    "operator": {
      "id": "op-001",
      "name": "张三",
      "role": "store_manager"
    }
  }'
```

### 状态变更（提交审核）
```bash
curl -X POST http://localhost:3000/api/recharges/{id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "changeReason": "数据核对无误，提交审核",
    "operator": {
      "id": "op-001",
      "name": "张三",
      "role": "store_manager"
    }
  }'
```

## 验收测试场景

### 1. 正常链路（严格状态流转）
- 创建充值流水（draft）→ 门店员工/经理提交（submitted）→ 财务确认（confirmed）→ 审计（audited）
- 状态流转必须严格按顺序执行，不可跳过环节
- 所有状态变更均有审计轨迹，记录操作人、角色、原因

### 2. 状态机与权限校验
- 草稿状态不能直接审计（必须经过提交、确认）
- 门店员工/经理可以提交，但不能执行财务确认
- 财务/审计角色可以确认和审计，但不能创建草稿
- 已审计记录不可修改

### 3. 异常场景
- 重复提交相同订单号 → 拒绝并记录失败
- 储值前后余额不匹配 → 拒绝并记录失败
- 退款金额超过充值金额 → 拒绝并记录失败
- 关联不存在的充值订单 → 拒绝并记录失败
- 状态流转不合法或权限不足 → 拒绝

### 4. 数据一致性
- 详情接口与列表接口数据一致
- 状态变更后立即反映在所有查询接口
- 导出CSV与查询数据一致
- 服务重启后历史数据不丢失

## 测试命令

```bash
# 运行完整测试套件（覆盖所有验收场景）
npm test

# 功能验证（同 npm test）
npm run verify
```

## 数据库结构

系统使用6张核心表：
1. `recharge_records` - 充值流水表
2. `refund_applications` - 退款申请表
3. `store_handover_records` - 门店交接表
4. `external_receipts` - 外部回执表
5. `audit_trails` - 审计轨迹表
6. `failed_records` - 失败记录表

所有业务表均包含：
- 版本号（乐观锁）
- 创建/更新时间
- 状态字段

## 项目结构

```
src/
├── app.ts                    # 应用入口配置
├── server.ts                 # 服务启动文件
├── verify.ts                 # 功能验证脚本（npm test）
├── database/
│   ├── index.ts              # 数据库连接
│   └── schema.ts             # 表结构与枚举定义
├── services/
│   ├── rechargeService.ts    # 充值流水服务
│   ├── refundService.ts      # 退款申请服务
│   ├── handoverService.ts    # 门店交接服务
│   ├── receiptService.ts     # 外部回执服务
│   ├── auditService.ts       # 审计服务
│   ├── failedRecordService.ts # 失败记录服务
│   ├── exportService.ts      # 导出服务
│   ├── roleViewService.ts    # 角色视图服务
│   └── stateMachine.ts       # 状态机与权限校验
└── routes/
    ├── rechargeRoutes.ts     # 充值路由
    ├── refundRoutes.ts       # 退款路由
    ├── handoverRoutes.ts     # 交接路由
    ├── receiptRoutes.ts      # 回执路由
    ├── auditRoutes.ts        # 审计路由
    └── viewRoutes.ts         # 视图路由
```

## 状态机流转规则

### 状态流转矩阵

| 当前状态 | 操作 | 目标状态 | 允许角色 |
|---------|------|---------|----------|
| draft / rejected | submit | submitted | 门店员工、门店经理 |
| draft / submitted / confirmed | reject | rejected | 门店经理、财务、审计 |
| submitted | confirm | confirmed | 财务、审计 |
| confirmed | audit | audited | 财务、审计 |

### 权限设计原则
- **门店员工**：创建草稿、提交审核
- **门店经理**：门店数据管理、提交/驳回
- **财务主管**：全局视图、确认/审计、导出
- **审计员**：完整权限、查看失败记录

## 注意事项

1. **严格状态流转**：不可跳过提交或确认直接审计
2. **角色权限校验**：每个操作验证操作人角色是否有权限
3. **数据一致性**：所有写操作均使用乐观锁（version字段）防止并发冲突
4. **审计完整性**：所有状态变更必须记录操作人和变更原因
5. **只读锁定**：已审计（audited）状态的记录不可修改
6. **坏数据隔离**：校验失败的数据存入失败记录表，不影响汇总统计
7. **敏感数据**：按角色权限自动脱敏，导出时同样适用
