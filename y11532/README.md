# 银行网点排班重试补偿队列服务

## 项目简介

这是一个专门针对银行网点排班数据的重试补偿队列系统，区别于普通数据录入系统。本系统将柜员排班、请假单、业务量预测、扫码明细、临时外出培训、窗口人手配置和午休规则等多个业务环节关联起来，提供完整的冲突检测、重试补偿、人工干预和审计追踪能力。

## 核心特性

### 1. 业务联动检测
- **柜员排班 + 请假单**: 自动检测排班与请假时间冲突
- **排班 + 临时培训**: 检测培训时间导致的窗口人手缺口
- **业务量预测 + 排班**: 根据预测业务量校验窗口配置是否充足
- **扫码明细 + 排班**: 验证当班柜员扫码数据完整性
- **午休规则校验**: 工作时长超过6小时强制午休校验

### 2. 完整的生命周期管理
```
回执提交 → 排队 → 限次重试 → 人工接管 → 补偿入账 → 关闭
         ↓
    历史可追溯 (每步操作记录前后差异)
```

### 3. 数据处理策略
- **忽略 (ignore)**: 重复批次直接忽略
- **覆盖 (overwrite)**: 清空原有数据重新导入
- **追加 (append)**: 在原有数据基础上追加

### 4. 边界情况处理
| 场景 | 处理方式 |
|-----|---------|
| 重复提交 | 数据策略控制，记录操作历史 |
| 撤回后再提交 | withdraw → resubmit 状态流转 |
| 部分失败 | partial_failed 状态，分项处理 |
| 人工改判 | manual_takeover，记录改判原因和操作人 |
| 导出前冻结 | freeze 状态，防止数据篡改 |
| 异常处理 | 错误不吞噬，完整记录 LastError |

### 5. 支行行长视角
- **可重试分类统计**: 按冲突类型分类统计成功率
- **死信处理追踪**: 死信数量、最早失败时间、恢复情况
- **恢复后续跑**: 重试任务最终成功率统计
- **数据一致性校验**: 列表/详情/历史/导出/日志五维一致性检查

## 项目结构

```
bank-schedule-retry/
├── cmd/
│   └── server/
│       └── main.go              # 程序入口
├── config/
│   └── config.go                # 配置管理
├── internal/
│   ├── models/
│   │   └── models.go            # 数据模型 (14个核心实体)
│   ├── database/
│   │   └── database.go          # 数据库连接
│   ├── services/
│   │   ├── retry_queue_service.go   # 重试队列核心逻辑
│   │   ├── conflict_service.go      # 冲突检测服务
│   │   ├── history_service.go       # 历史追踪服务
│   │   ├── statistics_service.go    # 统计分析服务
│   │   └── export_service.go        # 导出服务
│   └── handlers/
│       └── task_handler.go      # HTTP API 处理器
├── go.mod
├── go.sum
├── API_DOC.md                    # API文档
└── README.md
```

## 核心数据模型

### 业务基础数据
- [Branch](internal/models/models.go#L24-L30): 支行信息
- [Teller](internal/models/models.go#L32-L40): 柜员信息
- [TellerSchedule](internal/models/models.go#L42-L56): 柜员排班
- [LeaveRequest](internal/models/models.go#L58-L74): 请假申请单
- [BusinessVolumeForecast](internal/models/models.go#L76-L87): 业务量预测
- [ScanDetail](internal/models/models.go#L89-L104): 扫码明细
- [TempTraining](internal/models/models.go#L106-L118): 临时培训

### 重试补偿队列
- [RetryTask](internal/models/models.go#L151-L187): 重试任务（批次级）
- [RetryTaskItem](internal/models/models.go#L189-L203): 重试任务项（明细级）

### 审计与追踪
- [OperationHistory](internal/models/models.go#L226-L242): 操作历史（含前后快照）
- [DeadLetter](internal/models/models.go#L244-L260): 死信队列
- [ExportRecord](internal/models/models.go#L262-L273): 导出记录（含文件哈希）
- [DailyStatistics](internal/models/models.go#L275-L289): 日统计

## 启动方式

```bash
# 安装依赖
go mod tidy

# 运行服务
go run cmd/server/main.go

# 服务默认端口: 8080
# 健康检查: GET http://localhost:8080/api/v1/health
```

## 状态流转说明

### 任务状态 (RetryTaskStatus)
| 状态 | 说明 | 允许的后续操作 |
|-----|------|--------------|
| `pending` | 待处理 | queue, withdraw |
| `queued` | 已排队 | process |
| `processing` | 处理中 | - |
| `retrying` | 重试中 | process, manual_takeover |
| `success` | 全部成功 | close, export |
| `failed` | 全部失败 | manual_takeover |
| `partial_failed` | 部分失败 | manual_takeover |
| `manual_takeover` | 人工接管中 | compensate |
| `compensated` | 补偿完成 | close |
| `dead_letter` | 死信 | restore |
| `frozen` | 已冻结 | unfreeze |
| `closed` | 已关闭 | - |
| `withdrawn` | 已撤回 | resubmit |

### 冲突类型 (ConflictType)
- `leave_overlap`: 排班与请假冲突
- `training_overlap`: 排班与培训冲突
- `lunch_rule`: 午休规则冲突
- `window_shortage`: 窗口人手不足
- `forecast_mismatch`: 与业务量预测不匹配
- `scan_missing`: 扫码明细缺失

## 关键设计要点

### 1. 操作可追溯
每一次状态变更都会记录:
- 操作人、操作时间、IP地址
- 变更前状态、变更后状态
- 变更前数据快照、变更后数据快照
- 字段级差异摘要

### 2. 数据一致性保证
- 事务保证: 任务和明细同事务提交
- 计数校验: 任务总数 = 成功数 + 失败数
- 导出校验: 文件SHA256哈希存储，支持事后校验
- 状态机: 所有状态变更通过服务层接口

### 3. 异常不吞噬
所有异常都会:
1. 记录到任务 LastError 字段
2. 记录到操作历史
3. 通过 API 明确返回
4. 服务端日志记录

### 4. 五维一致性校验
系统提供 `/tasks/:id/consistency` 接口校验:
1. 任务总数 vs 明细数
2. 任务成功数 vs 明细成功数
3. 任务失败数 vs 明细失败数
4. 任务当前状态 vs 历史最终状态

## API 快速参考

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/v1/tasks` | 提交任务批次 |
| GET | `/api/v1/tasks` | 任务列表 |
| GET | `/api/v1/tasks/:id` | 任务详情 |
| POST | `/api/v1/tasks/:id/queue` | 任务入队 |
| POST | `/api/v1/tasks/:id/process` | 执行处理 |
| POST | `/api/v1/tasks/:id/manual-takeover` | 人工接管 |
| POST | `/api/v1/tasks/:id/compensate` | 补偿入账 |
| POST | `/api/v1/tasks/:id/close` | 关闭任务 |
| POST | `/api/v1/tasks/:id/freeze` | 冻结任务 |
| POST | `/api/v1/tasks/:id/unfreeze` | 解冻任务 |
| POST | `/api/v1/tasks/:id/withdraw` | 撤回任务 |
| POST | `/api/v1/tasks/:id/resubmit` | 重新提交 |
| GET | `/api/v1/tasks/:id/history` | 操作历史 |
| GET | `/api/v1/tasks/:id/consistency` | 一致性检查 |
| POST | `/api/v1/tasks/:id/export` | 导出数据 |
| GET | `/api/v1/dashboard/manager` | 行长看板 |
| GET | `/api/v1/dead-letters` | 死信列表 |
| POST | `/api/v1/dead-letters/:id/restore` | 恢复死信 |

详细API文档请查看 [API_DOC.md](API_DOC.md)
