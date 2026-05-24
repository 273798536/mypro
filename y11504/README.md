# 售后备件领用权限追责台账 API

## 项目概述

本项目是一个售后备件领用权限追责台账管理系统，旨在解决柜机网络恢复后工程师先领后补单、退回件和报废件混淆等问题。系统通过整合维修单、备件扫码、客户签收照和外部回执，实现完整的台账管理和审计追踪。

## 核心功能

### 1. 台账管理
- **草稿创建**：工程师可以创建台账草稿，支持录入维修单信息、备件扫码、签收照片
- **提交审核**：草稿提交后进入待审核状态
- **驳回/确认**：服务经理可以驳回或二次确认台账
- **审计**：审计员对确认后的台账进行最终审计
- **变更历史追踪**：每一步操作都记录完整的变更历史，支持版本对比

### 2. 数据质量控制
- **数据校验**：提交前自动校验数据完整性
- **坏数据隔离**：无效数据不会进入汇总，但会存入失败记录列表
- **失败记录管理**：支持查看、重试、标记解决失败记录

### 3. 导出功能
- 支持 JSON、CSV、Excel 三种格式导出
- 敏感字段自动脱敏处理
- 支持按条件筛选导出

### 4. 角色权限控制
- **工程师**：创建、编辑、提交台账
- **服务经理**：确认、驳回台账，查看统计
- **审计员**：审计台账，对比版本
- **管理员**：全部权限

### 5. 数据一致性保障
- 数据哈希校验
- 版本号管理
- 详情、导出、历史查询使用同一数据源

## 技术栈

- **后端框架**：Node.js + Express + TypeScript
- **ORM**：TypeORM
- **数据库**：SQLite（开发/测试）
- **测试框架**：Jest + Supertest
- **导出功能**：json2csv + ExcelJS

## 项目结构

```
src/
├── config/
│   └── database.ts          # 数据库配置
├── entities/                # 数据库实体
│   ├── BaseEntity.ts
│   ├── Ledger.ts           # 台账主表
│   ├── RepairOrder.ts      # 维修单
│   ├── PartScan.ts         # 备件扫码
│   ├── ReceiptPhoto.ts     # 签收照
│   ├── ExternalReceipt.ts  # 外部回执
│   ├── ChangeHistory.ts    # 变更历史
│   └── FailedRecord.ts     # 失败记录
├── services/                # 业务服务层
│   ├── LedgerService.ts
│   ├── ChangeHistoryService.ts
│   ├── ExportService.ts
│   └── FailedRecordService.ts
├── controllers/             # API 控制器
│   ├── LedgerController.ts
│   └── FailedRecordController.ts
├── middleware/              # 中间件
│   ├── auth.ts              # 权限认证
│   └── dataConsistency.ts  # 数据一致性校验
├── utils/                   # 工具函数
│   ├── hash.ts              # 哈希生成
│   ├── diff.ts              # 差异对比
│   ├── masking.ts           # 脱敏处理
│   └── validation.ts        # 数据校验
├── types/                   # 类型定义
│   └── enums.ts
├── test/                    # 测试文件
│   ├── ledger.test.ts
│   ├── testUtils.ts
│   ├── setup.ts
│   ├── globalSetup.ts
│   └── globalTeardown.ts
├── routes.ts                # 路由配置
└── index.ts                 # 应用入口
```

## API 接口

### 台账接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/ledgers | 创建草稿台账 | engineer |
| GET | /api/ledgers | 台账列表 | service_manager+ |
| GET | /api/ledgers/statistics | 统计数据 | service_manager+ |
| GET | /api/ledgers/:id | 台账详情 | all |
| PUT | /api/ledgers/:id | 更新草稿 | engineer |
| POST | /api/ledgers/:id/submit | 提交台账 | engineer |
| POST | /api/ledgers/:id/reject | 驳回台账 | service_manager |
| POST | /api/ledgers/:id/confirm | 确认台账 | service_manager |
| POST | /api/ledgers/:id/audit | 审计台账 | auditor |
| GET | /api/ledgers/:id/history | 变更历史 | all |
| GET | /api/ledgers/:id/compare | 版本对比 | auditor |
| GET | /api/ledgers/:id/export | 导出单条 | all |
| GET | /api/ledgers/export | 批量导出 | service_manager+ |

### 失败记录接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/failed-records | 创建失败记录 | admin |
| GET | /api/failed-records | 失败记录列表 | service_manager+ |
| GET | /api/failed-records/:id | 失败记录详情 | service_manager+ |
| POST | /api/failed-records/:id/resolve | 标记已解决 | admin |
| POST | /api/failed-records/:id/retry | 重试处理 | admin |

## 认证方式

通过 HTTP Header 传递用户信息：

```
x-user-id: 用户ID
x-user-name: 用户名
x-user-role: 角色 (engineer/service_manager/auditor/admin)
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 启动服务

```bash
npm start
```

### 运行测试

```bash
npm test
```

## 测试场景

### 1. 正常链路测试
- 工程师创建草稿
- 追加外部回执
- 提交台账
- 服务经理确认
- 审计员审计
- 版本对比
- 数据导出

### 2. 重复提交测试
- 已提交台账不能重复提交
- 已确认台账不能再次提交
- 驳回后可以重新提交

### 3. 坏数据测试
- 缺少必填字段无法提交
- 坏数据标记为无效质量
- 坏数据存入失败记录列表
- 失败记录可标记解决

### 4. 权限测试
- 工程师不能驳回/确认
- 审计员不能确认
- 角色视图隔离
- 敏感字段脱敏

### 5. 数据一致性测试
- 多入口查询返回一致数据
- 版本号同步
- 数据哈希校验

### 6. 服务重启验证
- 数据持久化
- 历史记录完整

## 数据模型

### 台账状态流转

```
草稿(DRAFT) → 已提交(SUBMITTED) → 已确认(CONFIRMED) → 已审计(AUDITED)
                ↓                  ↑
              驳回(REJECTED) ──────┘
```

### 数据质量等级

- `valid`: 有效数据
- `suspicious`: 可疑数据（有警告）
- `invalid`: 无效数据（有错误）

## 验收标准

1. ✅ 正常链路完整可跑通
2. ✅ 重复提交被正确拦截
3. ✅ 坏数据不进入汇总但可查看
4. ✅ 导出、详情、历史数据一致
5. ✅ 角色权限正确隔离
6. ✅ 敏感字段正确脱敏
7. ✅ 变更历史可追溯对比
8. ✅ 服务重启后数据完整

## License

MIT
