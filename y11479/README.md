# 会议室占用权限追责台账 API

从预约日历、门禁刷卡、临时取消消息建账，保留每一次变更记录，支持追责审计。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务
```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动

### 3. 运行测试脚本
```bash
chmod +x test-api.sh
./test-api.sh
```

## 认证方式

所有 API 请求需要在请求头中包含以下信息：
```
x-user-id: 用户ID
x-user-name: 用户名
x-user-role: 角色 (admin/manager/operator/auditor/guest)
```

## 角色权限矩阵

| 权限 | admin | manager | operator | auditor | guest |
|------|-------|---------|----------|---------|-------|
| 创建台账 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看台账 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 修改台账 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 提交审核 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 驳回申请 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 确认通过 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 查看审计日志 | ✅ | ✅ | ❌ | ✅ | ❌ |
| 任务管理 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 导出全部 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 导出敏感 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 导出脱敏 | ✅ | ✅ | ✅ | ✅ | ❌ |

## 核心 API 列表

### 台账管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ledgers | 创建草稿台账 |
| GET | /api/ledgers | 获取台账列表 |
| GET | /api/ledgers/:id | 获取单个台账 |
| PUT | /api/ledgers/:id | 修改台账 |
| POST | /api/ledgers/:id/submit | 提交审核 |
| POST | /api/ledgers/:id/reject | 驳回申请 |
| POST | /api/ledgers/:id/confirm | 确认通过 |
| GET | /api/ledgers/:id/history | 查看变更历史 |
| POST | /api/ledgers/:id/notes | 追加客服备注 |
| POST | /api/ledgers/:id/access | 追加门禁记录 |
| POST | /api/ledgers/:id/audit-only | 设置为只读审计 |
| POST | /api/ledgers/batch | 批量导入 |

### 审计日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/audit | 查询审计日志 |
| GET | /api/audit/failed | 查看失败的操作记录 |

### 异步任务

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/tasks/batch-import | 创建异步批量导入任务 |
| GET | /api/tasks/failed | 查看失败任务 |
| GET | /api/tasks/:id | 查看任务状态 |
| POST | /api/tasks/:id/retry | 重试失败任务 |
| POST | /api/tasks/process-now | 立即执行待处理任务 |

### 导出功能

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/export/ledgers | 导出台账数据 |
| GET | /api/export/ledgers/masked | 脱敏导出台账 |
| GET | /api/export/history/:operatorId | 导出操作员历史 |
| GET | /api/export/manager-report | 行政经理视图报表 |

## 批量导入策略

- `ignore`: 已存在的跳过
- `overwrite`: 已存在的覆盖更新
- `append`: 已存在的追加数据（门禁记录、取消信息等）

## 异步任务状态

- `pending`: 待处理
- `processing`: 处理中
- `wait_retry`: 等待重试
- `wait_manual`: 等待人工处理
- `permanent_failed`: 永久失败
- `completed`: 已完成

## 验证清单

执行测试脚本后，请验证以下内容：

1. **失败清单**: `GET /api/audit/failed`
   - 应该能看到访客权限不足被拦截的记录

2. **修正结果**: `GET /api/ledgers/:id/history`
   - 查看台账的完整变更历史，包括每次修改前后的差异

3. **最终报告**: `GET /api/export/manager-report`
   - 汇总统计：各状态台账数量、未追回成本
   - 角色视图：按创建人统计
   - 变更追踪：最近变更、敏感字段变更记录

## 核心特性

✅ **多源建账**: 预约日历、门禁刷卡、取消消息、客服备注
✅ **状态流转**: 草稿 → 提交 → 驳回/确认 → 只读审计
✅ **变更追踪**: 每次修改都记录前后差异和变更原因
✅ **批量策略**: 忽略/覆盖/追加三种导入模式
✅ **异步处理**: 失败自动重试，支持人工干预
✅ **权限控制**: 基于角色的细粒度权限，拦截操作留痕
✅ **脱敏导出**: 敏感字段（姓名、卡号、备注）自动脱敏
✅ **经理视图**: 角色统计、变更原因、敏感字段处理汇总
