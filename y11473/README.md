# 仓库退供复核验收回放链路服务

## 功能概述

本系统用于仓库退供复核验收的全链路管理，支持重复数据识别、文件导入、异步任务处理、异常管理、数据对账和导出等功能。

## 核心特性

### 1. 重复数据识别
- 通过数据哈希算法识别重复的退供申请、质检照片、物流回单和手工改价表
- 保留处理原因记录（供应商只认部分批次，剩余货品状态没人维护）

### 2. 文件导入API
- 支持导入：退供申请、质检照片、物流回单、手工改价表
- 支持历史压缩包（ZIP）批量导入
- 保留来源文件、原始行号和解析后的标准值
- 原始证据不可覆盖

### 3. 异步任务管理
- 任务状态：pending / processing / success / retry / manual / failed
- 自动重试机制（指数退避）
- 区分：等重试、等人工、永久失败
- 服务恢复后自动继续处理中断任务

### 4. 操作轨迹
- 记录所有操作：造数、启动服务、HTTP请求、对账、导出、异常回放、人工修正
- 保留请求参数、响应结果、耗时等完整信息

### 5. 异常处理
- 异常类型：数据不匹配、数量不匹配、价格不匹配、缺少文档、重复数据、解析错误、系统错误
- 支持异常修正和差异对比
- 支持异常回放
- 详情、报告和导出文件关联同一原因

### 6. 数据一致性保证
- 列表、详情、历史、导出文件、日志数据一致
- 修改记录保留完整历史
- 修正前后差异可追溯

## 快速开始

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
npm run generate-data
```

### 4. 启动服务
```bash
npm start
```

开发模式（自动重启）:
```bash
npm run dev
```

## 命令脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动服务 |
| `npm run dev` | 开发模式启动 |
| `npm run init-db` | 初始化数据库 |
| `npm run generate-data` | 生成测试数据 |
| `npm run process-tasks` | 处理待执行任务 |
| `npm run export-data` | 导出全部数据 |
| `npm run replay-exceptions` | 回放待处理异常 |

## API接口

### 文件导入
- `POST /api/import/return-apply` - 导入退供申请
- `POST /api/import/quality-photo` - 导入质检照片
- `POST /api/import/logistics-receipt` - 导入物流回单
- `POST /api/import/price-adjustment` - 导入手工改价表
- `POST /api/import/history-archive` - 导入历史压缩包
- `GET /api/import/records` - 导入记录列表
- `GET /api/import/records/:id` - 导入记录详情

### 退供申请
- `GET /api/return-applications` - 退供申请列表
- `GET /api/return-applications/:id` - 退供申请详情
- `PUT /api/return-applications/:id` - 更新退供申请
- `GET /api/return-applications/:id/history` - 修改历史
- `GET /api/return-applications/:id/duplicates` - 重复记录

### 异步任务
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/:id` - 任务详情
- `POST /api/tasks/:id/retry` - 重试任务
- `POST /api/tasks/:id/manual` - 标记人工处理
- `GET /api/tasks/stats/summary` - 任务统计

### 异常管理
- `GET /api/exceptions` - 异常列表
- `GET /api/exceptions/:id` - 异常详情（含差异）
- `POST /api/exceptions/:id/correct` - 修正异常
- `POST /api/exceptions/:id/replay` - 回放异常
- `GET /api/exceptions/:id/history` - 修正历史
- `GET /api/exceptions/stats/summary` - 异常统计

### 数据导出
- `POST /api/export/return-applications` - 导出退供申请
- `POST /api/export/exceptions` - 导出异常记录
- `POST /api/export/all` - 导出全部数据
- `POST /api/export/reconciliation/:batchNo?` - 导出对账报告
- `GET /api/export/files` - 导出文件列表
- `GET /api/export/download/:filename` - 下载导出文件

### 操作轨迹
- `GET /api/traces` - 轨迹列表
- `GET /api/traces/http` - HTTP请求轨迹
- `GET /api/traces/types` - 轨迹类型列表

### 数据对账
- `POST /api/reconciliation/batch/:batchNo` - 批次对账
- `POST /api/reconciliation/all` - 全量对账
- `GET /api/reconciliation/report/:batchNo?` - 对账报告

## 数据模型

### 核心表
- `import_records` - 导入记录（保留原始证据）
- `return_applications` - 退供申请
- `quality_photos` - 质检照片
- `logistics_receipts` - 物流回单
- `price_adjustments` - 手工改价表
- `async_tasks` - 异步任务
- `operation_traces` - 操作轨迹
- `exception_records` - 异常记录
- `correction_histories` - 修正历史

## 目录结构

```
├── src/
│   ├── app.js              # 应用入口
│   ├── config/             # 配置文件
│   │   ├── database.js     # 数据库配置
│   │   └── logger.js       # 日志配置
│   ├── models/             # 数据模型
│   ├── services/           # 业务服务
│   │   ├── DuplicateService.js      # 重复数据识别
│   │   ├── AsyncTaskService.js      # 异步任务管理
│   │   ├── TraceService.js          # 操作轨迹
│   │   ├── ImportService.js         # 文件导入
│   │   ├── ExceptionService.js      # 异常处理
│   │   ├── ReconciliationService.js # 数据对账
│   │   └── ExportService.js         # 数据导出
│   └── routes/             # API路由
├── scripts/                # 命令脚本
├── data/                   # 数据库文件
├── logs/                   # 日志文件
├── uploads/                # 上传文件
├── exports/                # 导出文件
└── sample-data/            # 测试数据
```

## 采购内勤关注点

1. **命令脚本** - 所有操作可通过命令行执行
2. **HTTP读写** - 所有API请求都有完整轨迹记录
3. **本地持久化** - 所有数据保存在本地SQLite数据库
4. **数据一致性** - 列表、详情、历史、导出文件状态一致
5. **异常差异** - 修正前后差异清晰可见，原因统一关联
