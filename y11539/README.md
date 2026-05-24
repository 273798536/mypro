# 企业培训签到权限追责台账服务

## 系统概述

本系统用于企业培训签到数据的全流程追责管理，解决"轨迹节点跳了一段"、"补签和代签到混在一起"、"结课名单不可信"等实际问题。系统按批次保留报名表、签到二维码、课后作业、客服备注等证据，支持完整的状态流转和审计追踪。

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 生成样例数据（推荐）

```bash
npm run seed
```

样例数据包含 4 个批次：
- **BATCH-2024-0520-001**: 正常 / 只读审计状态
- **BATCH-2024-0520-002**: 待复核 / 二次确认
- **BATCH-2024-0520-003**: 无法处理 / 已驳回
- **BATCH-2024-0520-004**: 草稿

### 4. 运行服务

```bash
npm run dev
```

服务启动后访问: http://localhost:3000

### 5. 运行测试

```bash
npm run test
```

---

## 核心功能

### 📦 批次管理

| 功能 | API 端点 | 说明 |
|------|----------|------|
| 创建批次 | `POST /api/batches` | 创建新的培训批次 |
| 批次列表 | `GET /api/batches` | 分页查询批次，支持按状态筛选 |
| 批次详情 | `GET /api/batches/:id` | 获取单批次详细信息 |
| 状态流转 | `PATCH /api/batches/:id/status` | 变更批次状态 |
| 重复批次处理 | `POST /api/batches/:batchNumber/duplicate` | 处理重复批次：忽略/覆盖/追加 |
| 设置处理结果 | `PATCH /api/batches/:id/result` | 标记批次为正常/待复核/无法处理 |
| 批次统计 | `GET /api/batches/stats` | 获取批次统计数据 |

**状态流转图:**

```
草稿(DRAFT) → 已提交(SUBMITTED) → 二次确认(SECONDARY_CONFIRMED) → 只读审计(AUDIT_ONLY)
                          ↓
                    已驳回(REJECTED) → 可重新提交
```

### 📄 材料管理

| 功能 | API 端点 | 说明 |
|------|----------|------|
| 上传材料 | `POST /api/materials/:batchId/upload` | 上传报名表、二维码、作业等 |
| 批次材料 | `GET /api/materials/batch/:batchId` | 查看批次的所有材料 |
| 材料详情 | `GET /api/materials/:id` | 获取单材料信息 |
| 设置处理结果 | `PATCH /api/materials/:id/result` | 标记材料处理状态 |
| 删除材料 | `DELETE /api/materials/:id` | 删除材料（只读审计状态不可删） |

**支持的材料类型:**
- `registration_form` - 报名表
- `sign_qr_code` - 签到二维码
- `post_class_assignment` - 课后作业
- `customer_service_note` - 客服备注
- `anomaly_photo` - 异常照片（后续扩展）

### 🔍 审计追踪

| 功能 | API 端点 | 说明 |
|------|----------|------|
| 批次变更历史 | `GET /api/audit/batch/:batchId/changes` | 所有字段变更记录 |
| 状态流转记录 | `GET /api/audit/batch/:batchId/transitions` | 状态变更时间线 |
| 全局变更历史 | `GET /api/audit/changes` | 全系统变更审计日志 |

**每条变更记录包含:**
- 字段名、旧值、新值
- 操作人、操作时间
- 变更原因

### ⚡ 异步任务

| 功能 | API 端点 | 说明 |
|------|----------|------|
| 创建任务 | `POST /api/tasks` | 创建异步处理任务 |
| 任务列表 | `GET /api/tasks` | 查看所有任务，支持按状态筛选 |
| 任务详情 | `GET /api/tasks/:id` | 查看任务执行情况 |
| 手动重试 | `POST /api/tasks/:id/retry` | 人工重试失败任务 |
| 任务统计 | `GET /api/tasks/stats` | 任务状态统计 |

**任务状态说明:**

| 状态 | 说明 | 处理方式 |
|------|------|----------|
| `pending` | 待处理 | 系统自动执行 |
| `processing` | 处理中 | 正在执行 |
| `pending_retry` | 待重试 | 指数退避自动重试 |
| `pending_manual` | 待人工 | 需要人工触发重试 |
| `permanent_failed` | 永久失败 | 已达最大重试次数 |
| `completed` | 已完成 | 执行成功 |

**重试策略:**
- 最大重试次数可配置（默认 3 次）
- 指数退避：第 n 次重试等待 2^n 分钟
- 最后一次失败后进入"待人工"状态

### 👥 HRBP 角色视图

| 功能 | API 端点 | 说明 |
|------|----------|------|
| 角色视图 | `GET /api/hrbp/view/:role` | 按角色获取数据视图 |
| 导出报表 | `GET /api/hrbp/export/:batchId` | 导出批次完整报表（CSV） |
| 失败项汇总 | `GET /api/hrbp/failed-items` | 待复核、无法处理、失败任务汇总 |

**敏感字段脱敏规则:**
- 姓名：张**
- 电话：138****1234
- 证件：1101********1234

---

## 失败路径与修正方式

### 🚨 典型失败场景

#### 场景 1: 签到记录跳号

**失败表现:**
- 材料处理结果：`pending_review`
- 处理备注："签到记录有跳号现象，需要HRBP复核"
- 报表中显示为"待复核"项

**修正方式:**
1. HRBP 访问 `GET /api/hrbp/failed-items` 查看待复核列表
2. 查看该批次的客服备注 `GET /api/materials/batch/:batchId`
3. 核对报名表与签到数据的一致性
4. 确认无误后，调用 `PATCH /api/materials/:id/result` 设置为 `normal`
5. 若确实异常，设置为 `unprocessable` 并注明原因

**报表变化:**
- 待复核数 -1
- 正常数 +1 或 无法处理数 +1
- 变更历史新增记录

---

#### 场景 2: 疑似代签到

**失败表现:**
- 客服备注中提到"张三代李四签到"
- 材料处理结果：`pending_review`
- 变更历史可追溯发现异常

**修正方式:**
1. HRBP 查看该批次的完整变更历史 `GET /api/audit/batch/:batchId/changes`
2. 调出异常照片（如有）进行人工核验
3. 情况属实的处理:
   - 将批次状态改为 `rejected`
   - 注明驳回原因："存在代签到情况"
   - 要求培训负责人重新提交完整材料
4. 重新提交后走正常审核流程

**报表变化:**
- 批次状态从 `submitted` → `rejected`
- 状态流转记录新增一条
- HRBP视图显示驳回原因

---

#### 场景 3: 材料损坏无法读取

**失败表现:**
- 处理结果：`unprocessable`
- 备注："报名表格式损坏"、"二维码无法识别"

**修正方式:**
1. 查看失败项汇总 `GET /api/hrbp/failed-items`
2. 确认是材料本身问题还是上传错误
3. 通知培训负责人重新上传正确材料
4. 在原批次中删除损坏材料 `DELETE /api/materials/:id`
5. 重新上传后再次提交审核

**报表变化:**
- 无法处理数 -1
- 材料删除记录进入变更历史
- 新上传材料重新开始审核流程

---

#### 场景 4: 异步任务永久失败

**失败表现:**
- 任务状态：`permanent_failed`
- 错误信息记录在 `last_error` 字段

**修正方式:**
1. 查看失败任务列表 `GET /api/hrbp/failed-items`
2. 分析错误原因：
   - 若是临时故障（网络超时等）：调用 `POST /api/tasks/:id/retry` 手动重试
   - 若是数据问题：先修正源数据再重试
   - 若是配置问题：修复配置后重试
3. 重试成功后任务状态变为 `completed`

**报表变化:**
- 永久失败数 -1
- 成功数 +1
- 任务重试记录可追踪

---

## 报表说明

### 📊 HRBP 视图字段说明

```json
{
  "overview": {
    "role": "hrbp",
    "totalBatches": 10,
    "byStatus": [
      { "status": "audit_only", "label": "只读审计", "count": 3 },
      { "status": "rejected", "label": "已驳回", "count": 1 }
    ],
    "byResult": [
      { "result": "normal", "label": "正常", "count": 5 },
      { "result": "pending_review", "label": "待复核", "count": 2 },
      { "result": "unprocessable", "label": "无法处理", "count": 1 }
    ]
  },
  "batches": [
    {
      "batchNumber": "BATCH-2024-0520-001",
      "trainingName": "销售技巧培训",
      "statusLabel": "只读审计",
      "processResultLabel": "正常",
      "changeCount": 5,
      "lastChangedBy": "审计员A",
      "materials": [...]
    }
  ]
}
```

### 📋 导出报表结构

导出的 CSV 文件包含以下区块：

1. **批次信息**
   - 批次号、培训名称、培训日期
   - 当前状态、处理结果
   - 创建人、创建时间

2. **材料清单**
   - 材料类型（报名表/二维码/作业/备注）
   - 文件名（敏感字段已脱敏）
   - 上传人、上传时间
   - 处理结果

3. **变更历史**
   - 按时间顺序排列的所有变更
   - 字段名、旧值→新值
   - 操作人、操作时间、变更原因

---

## 数据持久化保证

### ✅ 重启不丢失

- 所有数据存储在 SQLite 数据库文件中
- 异步任务状态持久化，服务重启后继续处理
- 变更历史和状态流转永久保留

### ✅ 幂等性处理

同一批次号重复提交时，支持三种策略：

| 策略 | 行为 | 适用场景 |
|------|------|----------|
| `ignore` | 保留原有数据，新数据被忽略 | 重复提交的相同批次 |
| `overwrite` | 新数据覆盖旧数据，记录变更 | 修正错误数据 |
| `append` | 新旧数据合并，记录追加操作 | 补充遗漏的材料 |

---

## 目录结构

```
├── src/
│   ├── index.ts              # 服务入口
│   ├── types/                # 类型定义
│   │   └── index.ts
│   ├── database/             # 数据库层
│   │   └── index.ts
│   ├── services/             # 业务逻辑层
│   │   ├── batch-service.ts
│   │   ├── material-service.ts
│   │   ├── audit-service.ts
│   │   ├── task-service.ts
│   │   └── hrbp-service.ts
│   ├── routes/               # API 路由
│   │   ├── batches.ts
│   │   ├── materials.ts
│   │   ├── audit.ts
│   │   ├── tasks.ts
│   │   └── hrbp.ts
│   └── scripts/              # 工具脚本
│       ├── init-db.ts        # 数据库初始化
│       ├── seed-data.ts      # 样例数据生成
│       └── run-tests.ts      # 测试用例
├── data/                     # 数据库文件
├── uploads/                  # 上传的材料文件
├── exports/                  # 导出的报表文件
├── package.json
└── tsconfig.json
```

---

## API 调用示例

### 创建批次

```bash
curl -X POST http://localhost:3000/api/batches \
  -H "Content-Type: application/json" \
  -d '{
    "batchNumber": "BATCH-TEST-001",
    "trainingName": "测试培训",
    "trainingDate": "2024-05-20",
    "createdBy": "张三",
    "remark": "测试批次"
  }'
```

### 上传材料

```bash
curl -X POST http://localhost:3000/api/materials/{batchId}/upload \
  -F "file=@报名表.xlsx" \
  -F "type=registration_form" \
  -F "uploadedBy=李四" \
  -F "isSensitive=false"
```

### 查看 HRBP 失败项

```bash
curl http://localhost:3000/api/hrbp/failed-items
```

### 导出报表

```bash
curl -O http://localhost:3000/api/hrbp/export/{batchId}
```

---

## 注意事项

1. **只读审计状态**：进入该状态后，批次和材料不可修改、不可删除，保证审计数据完整性
2. **敏感字段**：上传时标记为敏感的材料，非 HRBP/审计员角色查看时自动脱敏
3. **变更历史**：所有字段修改都有记录，包括谁改的、改了什么、为什么改
4. **异步任务**：服务重启后，未完成的任务会自动继续执行
5. **失败可见性**：失败项不仅在日志中，也在导出报表和 HRBP 视图中体现
