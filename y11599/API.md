# 客服知识库发布权限追责台账 API

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run init-db

# 3. 启动服务
npm start

# 4. 运行Demo（新开终端）
npm run demo
```

---

## 核心功能

### 1. 工作流状态流转
```
草稿(DRAFT) → 已提交(SUBMITTED) → 已驳回(REJECTED) → 重新提交
                                      ↓
                                  二次确认(CONFIRMED) → 只读审计(AUDITED)
```

### 2. 幂等性保证
- 请求头 `X-Idempotent-Key` 实现幂等
- 相同内容重复请求返回缓存结果
- 请求内容不匹配返回409错误

### 3. 批量策略
- **IGNORE**: 已存在则跳过
- **OVERWRITE**: 已存在则覆盖
- **APPEND**: 强制创建新版本

### 4. 任务失败分级
- `WAITING_RETRY`: 自动重试（网络等临时性错误）
- `WAITING_MANUAL`: 需要人工介入（数据格式等问题）
- `FAILED_PERMANENT`: 永久失败（达到最大重试次数）

### 5. 敏感数据脱敏
- 手机号: 138****8000
- 邮箱: t***e@example.com
- 身份证: 110101********1234

---

## API 接口列表

### 变更单管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/change-orders` | 查询变更单列表 |
| POST | `/api/change-orders` | 创建草稿 |
| GET | `/api/change-orders/:id` | 获取详情 |
| PUT | `/api/change-orders/:id` | 更新草稿 |
| POST | `/api/change-orders/:id/submit` | 提交 |
| POST | `/api/change-orders/:id/reject` | 驳回 |
| POST | `/api/change-orders/:id/confirm` | 二次确认 |
| POST | `/api/change-orders/:id/audit` | 审计归档 |
| GET | `/api/change-orders/:id/history` | 变更历史 |
| POST | `/api/change-orders/:id/version` | 创建新版本 |

### 客服引用记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/reference-records` | 查询引用记录 |
| POST | `/api/reference-records` | 单条导入 |
| POST | `/api/reference-records/batch` | 批量导入 |

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 查询任务列表 |
| GET | `/api/tasks/:taskId` | 任务详情 |
| POST | `/api/tasks/:taskId/retry` | 重试任务 |
| POST | `/api/tasks/import/change-orders` | 批量导入变更单 |
| POST | `/api/tasks/import/reviews` | 批量导入审核意见 |
| POST | `/api/tasks/import/snapshots` | 批量导入快照 |

### 数据导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/export/change-orders` | 导出变更单 |
| GET | `/api/export/reference-records` | 导出引用记录 |
| GET | `/api/export/audit-logs` | 导出审计日志 |
| GET | `/api/export/report` | 生成运营报告 |

### 审计统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit/logs` | 查询审计日志 |
| GET | `/api/audit/role-view` | 角色视图统计 |
| GET | `/api/audit/change-reasons` | 变更原因统计 |
| GET | `/api/audit/sensitive-stats` | 敏感字段统计 |
| GET | `/api/audit/error-claim-stats` | 错赔统计 |

---

## 请求头约定

```bash
# 用户身份
X-User-Id: user001
X-User-Name: 张三
X-User-Role: CONTENT_EDITOR

# 幂等性
X-Idempotent-Key: your-unique-key

# 批量
X-Batch-Id: BATCH-2024-001
```

---

## curl 命令顺序

### 1. 健康检查
```bash
curl http://localhost:3000/api/health
```

### 2. 创建变更单草稿
```bash
curl -X POST http://localhost:3000/api/change-orders \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -H "X-Idempotent-Key: draft-001" \
  -d '{
    "title": "关于退货政策的更新说明",
    "type": "UPDATE",
    "knowledgeId": "KB001",
    "knowledgeTitle": "7天无理由退货政策",
    "content": "为了提升用户体验，现将退货政策调整为30天无理由退货。",
    "changeReason": "用户反馈退货期太短",
    "sensitiveFields": ["赔偿金额", "客户隐私"]
  }'
```

### 3. 提交变更单
```bash
curl -X POST http://localhost:3000/api/change-orders/{orderId}/submit \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-User-Name: 张三" \
  -H "X-User-Role: CONTENT_EDITOR" \
  -d '{"changeReason": "经过团队讨论确认"}'
```

### 4. 驳回变更单
```bash
curl -X POST http://localhost:3000/api/change-orders/{orderId}/reject \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user002" \
  -H "X-User-Name: 李四" \
  -H "X-User-Role: REVIEWER" \
  -d '{"rejectReason": "30天退货期可能增加运营成本", "riskLevel": "MEDIUM"}'
```

### 5. 查看失败任务清单
```bash
# 永久失败
curl "http://localhost:3000/api/tasks?status=FAILED_PERMANENT"

# 等待人工处理
curl "http://localhost:3000/api/tasks?status=WAITING_MANUAL"

# 等待重试
curl "http://localhost:3000/api/tasks?status=WAITING_RETRY"
```

### 6. 查看修正结果
```bash
# 已审计归档的变更单
curl "http://localhost:3000/api/change-orders?status=AUDITED"

# 变更历史
curl http://localhost:3000/api/change-orders/{orderId}/history
```

### 7. 导出最终报告
```bash
# 生成运营报告
curl "http://localhost:3000/api/export/report"

# 角色视图统计
curl "http://localhost:3000/api/audit/role-view"

# 错赔统计
curl "http://localhost:3000/api/audit/error-claim-stats"

# 脱敏导出
curl "http://localhost:3000/api/export/reference-records?desensitize=true"
```

### 8. 幂等性测试
```bash
# 第一次请求
curl -X POST http://localhost:3000/api/change-orders \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-Idempotent-Key: test-idempotent-001" \
  -d '{"title": "测试幂等性", "type": "CREATE", "knowledgeId": "KBTEST"}'

# 第二次请求（相同幂等键）- 应该返回缓存结果
curl -X POST http://localhost:3000/api/change-orders \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user001" \
  -H "X-Idempotent-Key: test-idempotent-001" \
  -d '{"title": "测试幂等性", "type": "CREATE", "knowledgeId": "KBTEST"}'
```

---

## 项目结构

```
.
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── models/
│   │   ├── ChangeOrder.js       # 变更单模型
│   │   ├── ReviewOpinion.js     # 审核意见模型
│   │   ├── ReferenceRecord.js   # 客服引用记录
│   │   ├── Snapshot.js          # 快照模型
│   │   ├── AsyncTask.js         # 异步任务模型
│   │   ├── AuditLog.js          # 审计日志模型
│   │   └── IdempotentRequest.js # 幂等请求记录
│   ├── services/
│   │   ├── workflowService.js   # 工作流服务
│   │   ├── taskService.js       # 任务服务
│   │   ├── auditService.js      # 审计服务
│   │   └── exportService.js     # 导出服务
│   ├── middlewares/
│   │   └── idempotent.js        # 幂等中间件
│   ├── routes/
│   │   ├── changeOrders.js
│   │   ├── referenceRecords.js
│   │   ├── tasks.js
│   │   ├── export.js
│   │   └── audit.js
│   └── index.js                 # 入口文件
├── tests/
│   ├── demo-flow.js             # Demo脚本
│   └── curl-commands.sh         # curl命令
├── scripts/
│   └── init-db.js               # 数据库初始化
└── package.json
```

---

## 验证清单

### 失败清单验证
```bash
# 查看所有失败任务
curl "http://localhost:3000/api/tasks"
```

### 修正结果验证
```bash
# 确认工作流完整执行
curl "http://localhost:3000/api/change-orders?status=AUDITED"

# 查看变更历史条数是否正确
curl "http://localhost:3000/api/change-orders/{orderId}/history"
```

### 最终报告验证
```bash
# 验证报告一致性
curl "http://localhost:3000/api/export/report"
```

检查报告中：
- 变更单状态分布是否正确
- 角色视图数据是否完整
- 错赔统计是否准确
- 敏感字段是否已脱敏
