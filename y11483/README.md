# 中央厨房留样验收回放链路 API 服务

解决问题批次回查时"哪几家门店拿过同锅次"的依据追溯问题。

## 核心特性

- ✅ **完整链路追溯**: 留样标签 → 温度记录 → 门店交接 → 门店投诉
- ✅ **状态全程追踪**: 每次状态变化记录时间、操作者、原因
- ✅ **边界情况处理**: 重复提交、撤回后再提交、部分失败、人工改判、导出前冻结
- ✅ **冲突处理策略**: 忽略(ignore)、覆盖(overwrite)、追加(append)、报错(error)
- ✅ **完整审计历史**: 谁在什么时候改了什么，一目了然
- ✅ **命令行工具**: 造数、启动服务、对账、导出、回放异常
- ✅ **HTTP API**: RESTful接口，完整请求响应日志

## 项目结构

```
├── src/
│   ├── cli/                    # 命令行工具
│   │   └── index.ts
│   ├── config/               # 配置文件
│   │   └── database.ts
│   ├── entities/             # 数据模型
│   │   ├── BaseEntity.ts
│   │   ├── SampleLabel.ts       # 留样标签
│   │   ├── TemperatureRecord.ts # 温度记录
│   │   ├── StoreComplaint.ts   # 门店投诉
│   │   ├── StoreHandover.ts    # 门店交接
│   │   ├── BatchTrace.ts       # 批次链路
│   │   ├── StatusAuditLog.ts    # 状态审计日志
│   │   ├── ApiRequestLog.ts   # API请求日志
│   │   └── ExportRecord.ts   # 导出记录
│   ├── middleware/           # 中间件
│   │   └── requestLogger.ts
│   ├── server/             # HTTP服务
│   │   ├── index.ts
│   │   └── routes/
│   │       └── trace.ts
│   └── services/           # 业务服务
│       ├── AuditService.ts
│       ├── BatchTraceService.ts
│       ├── DataGenerator.ts
│       ├── ExportService.ts
│       └── SampleLabelService.ts
├── tests/                  # 验收测试
│   ├── acceptance.ts      # 综合验收
│   ├── normal-flow.ts     # 正常链路
│   └── edge-cases.ts     # 边界情况
├── data/                   # SQLite数据库文件
├── exports/                # 导出文件目录
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行验收测试

```bash
# 完整验收测试（正常链路 + 边界情况
npm run test:acceptance

# 仅正常链路测试
npm run test:normal

# 仅边界情况测试
npm run test:edge
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 编译后运行
npm run build && npm start
```

### 4. 使用命令行工具

```bash
# 查看帮助
npm run cli -- --help

# 生成测试数据
npm run cli -- generate -b BATCH001 -p POT001

# 执行完整流程
npm run cli -- full-flow -b BATCH001 -p POT001

# 创建批次链路
npm run cli -- trace-create -b BATCH001 -p POT001

# 处理批次链路
npm run cli -- trace-process -t TRACE-XXXX

# 查看涉及门店
npm run cli -- trace-stores -t TRACE-XXXX

# 查看操作历史
npm run cli -- trace-history -t TRACE-XXXX

# 冻结批次链路
npm run cli -- freeze -t TRACE-XXXX -r "导出前冻结"

# 导出批次链路
npm run cli -- export -t TRACE-XXXX -f json

# 查看操作员历史
npm run cli -- operator-history -o cli_user

# 启动HTTP服务
npm run cli -- server --port 3000
```

## API 接口文档

### 健康检查

```bash
GET /health
```

### 批次链路 API

#### 创建批次链路

```bash
POST /api/trace/create
Content-Type: application/json
X-Operator: username

{
  "batchNo": "BATCH001",
  "potNo": "POT001",
  "productName": "招牌红烧肉",
  "conflictStrategy": "error"  # ignore|overwrite|append|error
}
```

#### 处理批次链路

```bash
POST /api/trace/process
Content-Type: application/json
X-Operator: username

{
  "traceNo": "TRACE-XXXX"
}
```

#### 查询批次链路

```bash
GET /api/trace/:traceNo
```

#### 按批次锅次查询

```bash
GET /api/trace/batch/:batchNo/:potNo
```

#### 查询涉及门店

```bash
GET /api/trace/:traceNo/stores
```

#### 查询操作历史

```bash
GET /api/trace/:traceNo/history
```

#### 人工改判

```bash
POST /api/trace/manual-judge
Content-Type: application/json
X-Operator: username

{
  "traceNo": "TRACE-XXXX",
  "judgment": "pass",  # pass|fail
  "reason": "经品控主管复核通过"
}
```

#### 冻结批次链路

```bash
POST /api/trace/freeze
Content-Type: application/json
X-Operator: username

{
  "traceNo": "TRACE-XXXX",
  "reason": "导出前冻结"
}
```

#### 解冻批次链路

```bash
POST /api/trace/unfreeze
Content-Type: application/json
X-Operator: username

{
  "traceNo": "TRACE-XXXX",
  "reason": "需要补充数据"
}
```

#### 导出批次链路

```bash
# 创建导出任务
POST /api/trace/export/create
Content-Type: application/json
X-Operator: username

{
  "traceNo": "TRACE-XXXX",
  "format": "json",  # csv|json
  "exportType": "full_trace"
}

# 执行导出
POST /api/trace/export/execute
Content-Type: application/json
X-Operator: username

{
  "exportNo": "EXPORT-XXXX"
}
```

#### 列出所有批次链路

```bash
GET /api/trace?page=1&pageSize=20
```

## 验收流程

### 第一阶段: 正常链路

```bash
npm run test:normal
```

测试内容:
1. 生成测试数据（留样标签、温度记录、门店交接）
2. 创建批次链路
3. 处理批次链路
4. 查询涉及门店
5. 查询操作历史
6. 冻结并导出

### 第二阶段: 边界情况

```bash
npm run test:edge
```

测试内容:
1. 重复提交 - ERROR策略（预期抛出错误）
2. 重复提交 - IGNORE策略（返回原有数据）
3. 重复提交 - OVERWRITE策略（覆盖数据）
4. 撤回后再提交
5. 人工改判
6. 导出前冻结
7. 解冻后重新处理
8. 历史记录完整性验证

### 第三阶段: 重启验证

```bash
# 1. 启动服务
npm run dev

# 2. 查询历史数据（验证持久化）
curl http://localhost:3000/api/trace/

# 3. 查看操作历史
curl http://localhost:3000/api/trace/<traceNo>/history
```

## 冲突处理策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `error` | 重复提交时报错 | 防止重复录入 |
| `ignore` | 重复提交时忽略，返回原有数据 | 幂等操作 |
| `overwrite` | 重复提交时覆盖原有数据 | 数据修正 |
| `append` | 重复提交时追加数据，版本号+1 | 增量更新 |

## 数据模型说明

### 批次链路状态流转

```
created → processing → completed
                      ↓
                 partial_failed
                      ↓
                   failed
                      ↓
          [manual_judge] → pass/fail
                      ↓
                frozen → [export]
```

### 审计日志字段

- `operationTime`: 操作时间
- `operator`: 操作者
- `operationType`: 操作类型
- `oldStatus`: 原状态
- `newStatus`: 新状态
- `reason`: 操作原因
- `oldData`: 变更前数据
- `newData`: 变更后数据
- `changedFields`: 变更字段列表

## 品控主管关注点

### 1. 命令脚本

所有操作均可通过命令行执行，操作记录完整保存

```bash
# 查看指定链路完整历史
npm run cli -- trace-history -t TRACE-XXXX

# 查看指定操作员所有操作
npm run cli -- operator-history -o zhangsan
```

### 2. HTTP读写

所有API请求均记录日志，包括:
- 请求ID、请求时间、响应时间
- 请求方法、URL、请求体
- 响应状态、响应体
- 操作员、IP地址、User-Agent

### 3. 本地持久化

SQLite数据库文件: `data/kitchen_trace.db`

核心表:
- `batch_traces`: 批次链路主表
- `status_audit_logs`: 状态变更审计
- `api_request_logs`: API请求日志
- `export_records`: 导出记录

## 技术栈

- **运行时**: Node.js 16+
- **语言**: TypeScript
- **Web框架**: Express
- **ORM**: TypeORM
- **数据库**: SQLite
- **CLI框架**: Yargs
- **日志**: 自定义审计日志

## 常见问题

### Q: 如何清除测试数据？

```bash
rm -rf data/kitchen_trace.db
```

### Q: 导出的文件在哪里？

```bash
ls exports/
```

### Q: 如何查看数据库内容？

```bash
# 使用sqlite3命令行工具
sqlite3 data/kitchen_trace.db ".tables"
sqlite3 data/kitchen_trace.db "SELECT * FROM batch_traces;"
```

---

**验收标准**:
1. ✅ 正常链路跑通
2. ✅ 重复提交策略正确
3. ✅ 坏数据不崩溃
4. ✅ 重启服务历史数据不丢失
5. ✅ 所有状态变更有记录