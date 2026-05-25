# 客服工单升级权限追责台账 API

解决"先领后补"场景下数据一致性问题的台账服务。

## 核心特性

- ✅ **工作流状态机**: 草稿 → 提交 → 审核通过/驳回 → 二次确认 → 只读审计
- ✅ **四级权限体系**: 录入员 / 复核员 / 主管 / 只读用户，字段可见性和操作权限严格隔离
- ✅ **幂等性处理**: 重复请求自动识别，支持「忽略」或「覆盖」策略，汇总数不膨胀
- ✅ **脏记录自动检测**: 缺字段 / 跨日 / 改名 / 金额冲突 / 数量冲突，保留原始内容和处理意见
- ✅ **全链路审计**: 每次变更记录前后值对比，变更原因必填
- ✅ **脱敏导出**: 手机号 / 姓名 / 工号自动脱敏，导出文件带校验和可溯源
- ✅ **运营视图**: 角色视图 / 变更原因统计 / 敏感字段处理日志 / 一致性报告
- ✅ **数据一致性保障**: 列表 / 详情 / 历史 / 导出四方对账，不一致立即告警

## 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

服务器启动在 `http://localhost:3000`

### 生产模式

```bash
npm start
```

自动先执行 TypeScript 编译，再启动服务。

### 运行测试

```bash
npm test
```

包含 25+ 集成测试，覆盖所有核心功能和数据一致性场景。

## 认证方式

在请求 Header 中添加 `x-user-id` 指定用户身份：

| 用户角色 | x-user-id | 说明 |
|---------|-----------|------|
| 录入员 | entry-1 | 创建草稿、修改、提交 |
| 复核员 | reviewer-1 | 审核、驳回、申请二次确认 |
| 主管 | supervisor-1 | 二次确认、完整导出、数据修正 |
| 只读用户 | readonly-1 | 仅查看列表和详情 |

示例：
```bash
curl -H "x-user-id: entry-1" http://localhost:3000/api/records
```

## API 接口

### 台账管理

| 方法 | 路径 | 说明 | 最低权限 |
|------|------|------|---------|
| GET | `/api/records` | 台账列表 (支持筛选) | 任意 |
| GET | `/api/records/:id` | 台账详情 | 任意 |
| GET | `/api/records/:id/history` | 变更历史 | 任意 |
| GET | `/api/records/:id/dirty-logs` | 脏记录日志 | 复核员+ |
| POST | `/api/records` | 创建草稿 (带幂等键) | 录入员 |
| PUT | `/api/records/:id` | 更新草稿 | 录入员 |
| POST | `/api/records/:id/submit` | 提交审核 | 录入员 |
| POST | `/api/records/:id/approve` | 审核通过/申请二次确认 | 复核员 |
| POST | `/api/records/:id/reject` | 驳回 | 复核员 |
| POST | `/api/records/:id/second-confirm` | 主管二次确认 | 主管 |
| POST | `/api/records/:id/supplement-source` | 补全数据源 | 录入员 |
| POST | `/api/records/:id/handling-opinion` | 添加处理意见 | 复核员+ |
| POST | `/api/records/:id/resolve-dirty/:dirtyLogId` | 标记脏记录已解决 | 复核员+ |

### 数据导出

| 方法 | 路径 | 说明 | 最低权限 |
|------|------|------|---------|
| POST | `/api/export/csv` | 导出CSV (脱敏/完整) | 主管 |
| GET | `/api/export/history` | 导出历史 | 主管 |
| GET | `/api/export/verify/:exportId` | 校验导出一致性 | 主管 |

### 运营视图

| 方法 | 路径 | 说明 | 最低权限 |
|------|------|------|---------|
| GET | `/api/summary/role-view` | 角色视图汇总 | 任意 |
| GET | `/api/summary/change-reasons` | 变更原因统计 | 主管 |
| GET | `/api/summary/sensitive-handling` | 敏感字段处理日志 | 主管 |
| GET | `/api/summary/consistency-report` | 数据一致性检查 | 主管 |
| GET | `/api/summary/dirty-stats` | 脏记录统计 | 任意 |

## 核心概念

### 数据源 (DataSource)

- `session_summary`: 会话摘要
- `sla_rule`: SLA规则
- `compensation_approval`: 补偿审批
- `supplier_statement`: 供应商对账单
- `approval_email`: 审批邮件

### 脏记录类型 (DirtyRecordType)

- `missing_fields`: 缺少必填字段
- `cross_date`: 同一工单跨不同日期
- `name_change`: 客户或坐席标识前后不一致
- `amount_conflict`: 补偿金额前后冲突
- `quantity_conflict`: 转派次数等数量冲突

### 幂等性

创建记录时可传入 `idempotencyKey`，系统自动识别重复请求：

- `duplicateStrategy: ignore` (默认): 不做任何修改，返回已存在记录
- `duplicateStrategy: overwrite`: 覆盖更新同一条记录，记录变更历史

## 项目结构

```
├── src/
│   ├── config/          # 配置 (角色权限、数据库)
│   ├── models/          # 数据访问层
│   ├── middleware/      # 中间件 (认证、权限)
│   ├── services/        # 业务服务层
│   ├── utils/           # 工具函数 (幂等性、脏记录检测)
│   ├── routes/          # API 路由
│   ├── types/           # TypeScript 类型定义
│   └── index.ts         # 服务入口
├── tests/               # 集成测试
├── data/                # SQLite 数据库文件
└── README.md
```

## 数据一致性保障

1. **导出校验**: 导出时生成 MD5 校验和，事后可验证数据未被篡改
2. **一致性报告**: 定期检查列表、详情、历史、导出四方数据是否一致
3. **变更追踪**: 所有字段变更都记录前后值，可追溯到具体操作人
4. **幂等机制**: 同一份材料重复处理，汇总数字不会悄悄变大
