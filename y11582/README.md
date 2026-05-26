
# 门店会员储值重试补偿队列 API

解决跨店消费和撤销交易导致余额历史断裂问题，减少人工核对证据的工作量。通过自动化队列和重试机制实现储值交易的补偿入账，保留完整证据链供财务审计。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Recharts
- **后端**: Express 4 + TypeScript
- **数据库**: SQLite (文件数据库)
- **数据处理**: CSV 解析、SHA-256 哈希校验

## 核心功能

### 1. 回执导入
- 支持四种来源类型：充值流水、退款申请、门店交接表、供应商对账单
- 保留来源文件、原始行号和解析后的标准值
- 原始证据永不覆盖，改判只更新标准数据
- 坏数据（缺少金额、负金额）直接进入等人工状态，保留审计证据

### 2. 队列管理
- 外部回执提交 → 排队 → 限次重试 → 人工接管 → 补偿入账 → 关闭
- 三种失败状态区分：等重试、等人工、永久失败
- 最大重试次数：3 次，指数退避策略（1min / 5min / 15min）
- 服务恢复自动接着处理未完成任务

### 3. 人工接管
- 人工改判：修改标准数据后重试
- 补偿入账：手动标记成功
- 关闭任务：结束流程
- 标记永久失败：进入死信队列
- 死信恢复：从死信队列恢复到等人工状态

### 4. 审计追溯
- 每一步操作记录前后差异
- 原始数据与标准数据对比展示
- 操作历史时间线，包含操作人、时间、备注
- 文件哈希校验，确保证据完整性

### 5. 财务看板
- 可重试分类统计
- 死信处理统计
- 恢复后续跑一键触发
- 状态分布可视化图表

## 业务流程

```
回执提交 → 排队入队 → 限次重试 → 处理成功 → 补偿入账 → 关闭队列
                          ↓
                      处理失败
                          ↓
                未超限 → 等重试 → 重试
                          ↓
                超限 → 等人工 → 人工接管
                                      ↓
                                可修复 → 改判 → 补偿入账
                                      ↓
                                不可修复 → 永久失败（死信）→ 死信恢复
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
- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

### 构建生产版本
```bash
npm run build
```

## API 接口

### 任务管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| GET | /api/tasks/:id | 获取任务详情 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/:id/retry | 手动重试 |
| PUT | /api/tasks/:id/manual | 人工改判 |
| PUT | /api/tasks/:id/compensate | 补偿入账 |
| PUT | /api/tasks/:id/close | 关闭任务 |
| PUT | /api/tasks/:id/permanent-failed | 标记永久失败 |
| GET | /api/tasks/:id/history | 获取操作历史 |
| GET | /api/tasks/:id/evidence | 获取原始证据 |

### 看板
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/dashboard/stats | 获取统计数据 |
| GET | /api/dashboard/retry-categories | 获取可重试分类 |

### 导入
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/import/csv | 导入 CSV 文件 |
| POST | /api/import/json | 导入 JSON 数据 |

### 死信队列
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/dead-letter | 获取死信列表 |
| POST | /api/dead-letter/:id/revive | 恢复死信 |

### 管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/admin/resume | 恢复后续跑 |
| POST | /api/admin/start | 启动自动处理 |
| POST | /api/admin/stop | 停止自动处理 |

## 数据模型

### queue_task（队列任务表）
- `id`: 任务ID
- `source_type`: 来源类型（recharge/refund/store_transfer/supplier_statement）
- `source_file`: 来源文件名
- `source_line`: 原始行号
- `raw_data`: 原始数据（JSON）
- `standard_data`: 标准数据（JSON）
- `status`: 状态（pending/processing/waiting_retry/waiting_manual/permanent_failed/success/closed）
- `retry_count`: 重试次数
- `max_retries`: 最大重试次数
- `last_error`: 最后错误信息

### operation_history（操作历史表）
- 记录每一步操作的前后状态差异
- 包含操作人、时间、备注

### original_evidence（原始证据表）
- 保存原始文件内容
- 文件哈希校验
- 永不修改，确保审计可追溯

## 验收场景

### 1. 正常链路验收
1. 导入充值流水文件 → 成功创建队列任务
2. 任务自动处理 → 补偿入账 → success 状态
3. 手动关闭任务 → closed 状态
4. 查看任务详情 → 可看到完整操作历史和差异

### 2. 异常场景验收
1. 重复提交同一回执 → 系统识别并提示，不重复创建
2. 导入坏数据（缺少金额/负金额） → 解析失败，记录错误，直接进入等人工状态
3. 重试超限 → 自动进入等人工状态

### 3. 服务恢复验收
1. 服务重启后 → 未完成任务自动继续处理
2. 历史数据完整可查
3. 财务看板数据一致

## 页面说明

| 路由 | 页面 | 功能 |
|------|------|------|
| /dashboard | 财务看板 | 统计概览、可重试分类、恢复后续跑 |
| /queue | 队列列表 | 任务列表、筛选、搜索、状态查看 |
| /queue/:id | 任务详情 | 基本信息、操作历史时间线、差异对比、原始证据、操作按钮 |
| /import | 回执导入 | CSV/JSON 导入、示例数据加载、导入结果 |
| /dead-letter | 死信队列 | 永久失败任务列表、恢复处理 |
| /settings | 系统设置 | 服务控制、配置说明 |

## 测试

运行验收测试：
```bash
node test/api.test.js
```

测试覆盖：
- 健康检查
- 正常链路（创建→处理→成功→关闭）
- 重复提交检测（返回 409）
- 坏数据导入（缺少金额、负金额直接进入等人工）
- 任务列表查询
- 看板统计查询
- 恢复后续跑
