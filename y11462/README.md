# 口腔门诊材料重试补偿队列服务

## 项目概述

解决种植体批号、预约记录、供应商发票和供应商对账单在临时换型号后病历和库存扣减脱节时的人工证据追溯问题。

## 核心功能

### 1. 数据接收与导入
- 接收种植体批号、预约记录、供应商发票、审批邮件
- 支持单条提交和批量导入
- 保留来源文件、原始行号、原始数据和解析后标准值
- 原始数据永不覆盖，改判只更新解析值

### 2. 队列管理
- 排队机制：先入先出
- 限次重试：默认3次，可配置
- 状态区分：
  - `PENDING` - 待处理
  - `PROCESSING` - 处理中
  - `WAITING_RETRY` - 等待重试
  - `WAITING_MANUAL` - 等待人工
  - `FAILED_PERMANENT` - 永久失败
  - `MANUAL_HANDLING` - 人工处理中
  - `COMPENSATED` - 补偿入账
  - `CLOSED` - 已关闭

### 3. 人工操作
- 人工接管
- 补偿入账（支持更新解析值）
- 关闭队列
- 标记永久失败

### 4. 院区主任看板
- **可重试分类**：按材料类型和科室分类
- **死信处理**：永久失败队列及错误模式分析
- **恢复后续跑**：今日处理进度和待恢复队列
- **科室分布**：各科室问题统计

### 5. 状态轨迹
- 完整记录每一次状态变更
- 记录操作人、时间、备注、错误信息

## 项目结构

```
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── constants/
│   │   └── status.js            # 状态常量定义
│   ├── middleware/
│   │   └── validator.js         # 参数验证中间件
│   ├── routes/
│   │   ├── queue.js             # 队列API
│   │   ├── import.js            # 导入API
│   │   └── dashboard.js         # 看板API
│   ├── services/
│   │   ├── queue.service.js     # 队列服务
│   │   ├── import.service.js    # 导入服务
│   │   ├── trace.service.js     # 轨迹服务
│   │   ├── dashboard.service.js # 看板服务
│   │   └── retry-worker.service.js # 自动重试工作器
│   └── server.js                # 服务入口
├── scripts/
│   └── init-db.js               # 数据库初始化脚本
├── tests/
│   └── run-tests.js             # 验收测试脚本
├── data/                        # 数据库文件目录
└── package.json
```

## API 接口

### 队列管理
- `POST /api/queue/submit` - 提交队列项
- `GET /api/queue/list` - 队列列表（支持筛选、分页）
- `GET /api/queue/:id` - 队列详情
- `GET /api/queue/queue-no/:queueNo` - 按队列号查询
- `GET /api/queue/:id/traces` - 状态轨迹

### 状态操作
- `POST /api/queue/:id/retry` - 标记重试
- `POST /api/queue/:id/fail-permanent` - 标记永久失败
- `POST /api/queue/:id/manual-takeover` - 人工接管
- `POST /api/queue/:id/compensate` - 补偿入账
- `POST /api/queue/:id/close` - 关闭

### 数据导入
- `POST /api/import/data` - 批量导入数据
- `GET /api/import/records` - 导入记录列表
- `GET /api/import/records/:id` - 导入记录详情

### 看板
- `GET /api/dashboard/director` - 院区主任看板
- `GET /api/dashboard/overview` - 概览统计
- `GET /api/dashboard/retryable-classification` - 可重试分类
- `GET /api/dashboard/dead-letter-analysis` - 死信分析
- `GET /api/dashboard/recovery-progress` - 恢复进度
- `GET /api/dashboard/department-distribution` - 科室分布
- `GET /api/dashboard/import-history` - 导入历史

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npm run init-db
```

### 3. 启动服务
```bash
npm start
```

服务启动在 http://localhost:3000

### 4. 运行验收测试
```bash
npm test
```

## 验收测试场景

1. **正常链路**：提交 → 查询 → 重试 → 人工接管 → 补偿入账
2. **重复提交**：同批号多次提交，原始数据各自保留不覆盖
3. **坏数据**：参数验证拒绝无效输入
4. **批量导入**：保留来源文件、行号，统计成功失败
5. **状态流转**：完整的状态转移验证
6. **服务重启**：重启后数据保留，可接着处理

## 数据库设计

### material_queue - 队列主表
- 保留来源信息（source_file, source_row）
- 原始数据和解析数据分开存储
- 状态、重试次数、下次重试时间

### status_traces - 状态轨迹表
- 记录每次状态变更
- 前后状态对比
- 操作人、备注、错误信息

### import_records - 导入记录表
- 批量导入的批次记录
- 统计成功失败数量
- 关联导入的所有队列项

## 特色设计

1. **原始证据不可篡改**：original_data 字段只写入不更新
2. **解析值可修正**：parsed_data 字段支持更新，补偿入账时可修改
3. **服务中断恢复**：基于数据库持久化，重启后自动恢复处理
4. **清晰的审计轨迹**：每一步操作都有完整记录，便于追溯
