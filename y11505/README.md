# 医疗器械巡检异常回执状态机 API

一个完整的医疗器械巡检异常回执状态机系统，处理巡检记录、校准证书、维修报价等材料，实现状态联动、异步任务、审计追踪和报告导出。

## 功能特性

### 核心流程
- **批次创建**: 创建巡检批次，设置重复导入策略
- **附件补传**: 支持巡检记录、校准证书、维修报价导入
- **复核改判**: 支持审核流程和人工修正
- **冻结结算**: 临检前冻结、解冻、结算功能
- **撤回归档**: 取消和归档流程

### 状态联动
- 证书过期自动联动巡检记录状态
- 设备停用自动联动巡检记录状态
- 状态变更完整记录历史轨迹

### 重复导入策略
- **IGNORE**: 忽略重复记录
- **OVERWRITE**: 覆盖更新已有记录
- **APPEND**: 追加新记录（自动重命名）

### 异步任务系统
- **WAITING_RETRY**: 等待自动重试（指数退避）
- **WAITING_MANUAL**: 需要人工干预
- **PERMANENT_FAILED**: 永久失败
- 服务重启后自动恢复卡住的任务

### 审计追踪
- 记录所有操作：谁在什么时候改了什么
- 变更前后数据对比
- 完整的状态流转历史

### 导出功能
- 护士长视图：冻结前后状态、人工理由、异常明细
- Excel导出：汇总表、巡检记录、校准证书、维修报价、状态流转、审计日志

## 快速开始

### 1. 安装依赖
```bash
pip3 install -r requirements.txt
```

### 2. 运行演示脚本
```bash
python3 demo.py
```

演示脚本会完整展示以下流程：
1. 初始化数据库
2. 导入样例数据
3. 检查证书过期状态联动
4. 触发异步任务失败场景
5. 完整工作流演示（提交-审核-冻结-结算-归档）
6. 生成导出报告（护士长视图）
7. 查看审计日志
8. 重复导入策略演示

### 3. 启动API服务
```bash
uvicorn app.main:app --reload
```

### 4. 访问API文档
```
http://localhost:8000/docs
```

## 项目结构

```
.
├── app/
│   ├── main.py                 # FastAPI主应用
│   ├── api/                    # API路由
│   │   ├── batch.py           # 批次管理接口
│   │   ├── task.py            # 任务管理接口
│   │   └── export.py          # 导出接口
│   ├── core/                   # 核心配置
│   │   ├── config.py          # 配置类
│   │   ├── constants.py       # 常量和枚举
│   │   └── database.py        # 数据库连接
│   ├── models/                 # 数据模型
│   │   ├── batch.py           # 批次
│   │   ├── inspection_record.py  # 巡检记录
│   │   ├── calibration_certificate.py  # 校准证书
│   │   ├── repair_quote.py    # 维修报价
│   │   ├── price_adjustment.py  # 手工改价表
│   │   ├── device.py          # 设备
│   │   ├── attachment.py      # 附件
│   │   ├── status_history.py  # 状态历史
│   │   ├── audit_log.py       # 审计日志
│   │   └── async_task.py      # 异步任务
│   ├── schemas/                # Pydantic模式
│   ├── services/               # 业务服务
│   │   ├── state_machine.py   # 状态机服务
│   │   ├── batch_service.py   # 批次服务
│   │   ├── audit_service.py   # 审计服务
│   │   ├── import_service.py  # 导入服务
│   │   ├── export_service.py  # 导出服务
│   │   └── device_status_linker.py  # 设备状态联动
│   ├── tasks/                  # 异步任务
│   │   ├── task_manager.py    # 任务管理器
│   │   └── data_processing.py # 数据处理任务
│   └── uploads/                # 上传目录
├── exports/                    # 导出文件目录
├── demo.py                     # 演示脚本
├── requirements.txt            # 依赖列表
└── README.md                   # 本文件
```

## API接口概览

### 批次管理
- `POST /api/v1/batches` - 创建批次
- `GET /api/v1/batches` - 批次列表
- `GET /api/v1/batches/{id}` - 批次详情
- `POST /api/v1/batches/import` - 批量导入数据
- `POST /api/v1/batches/{id}/submit` - 提交审核
- `POST /api/v1/batches/{id}/approve` - 审核通过
- `POST /api/v1/batches/{id}/reject` - 审核驳回
- `POST /api/v1/batches/{id}/freeze` - 冻结批次
- `POST /api/v1/batches/{id}/unfreeze` - 解冻批次
- `POST /api/v1/batches/{id}/settle` - 结算批次
- `POST /api/v1/batches/{id}/archive` - 归档批次
- `POST /api/v1/batches/{id}/cancel` - 取消批次
- `GET /api/v1/batches/{id}/status-history` - 状态历史
- `GET /api/v1/batches/{id}/audit-logs` - 审计日志

### 任务管理
- `GET /api/v1/tasks` - 任务列表
- `GET /api/v1/tasks/{id}` - 任务详情
- `POST /api/v1/tasks/run-pending` - 执行待处理任务
- `POST /api/v1/tasks/{id}/retry` - 重试任务
- `POST /api/v1/tasks/{id}/mark-failed` - 标记为永久失败
- `POST /api/v1/tasks/recover` - 服务恢复

### 导出
- `GET /api/v1/export/batch/{id}/summary` - 护士长视图
- `GET /api/v1/export/batch/{id}/excel` - Excel导出
- `GET /api/v1/export/batch/{id}/freeze-comparison` - 冻结前后对比

## 状态流转

### 批次状态
```
DRAFT ──> PENDING_REVIEW ──> REVIEWING ──> APPROVED ──> FROZEN ──> SETTLED ──> ARCHIVED
  │           │              │            │          │           │
  │           │              │            │          │           └─> (无法回退)
  │           │              │            │          └─> DRAFT (解冻)
  │           │              │            └─> DRAFT
  │           │              └─> REJECTED ──> DRAFT
  │           │                        └─> CANCELLED
  │           └─> DRAFT
  │           └─> CANCELLED
  └─> CANCELLED
```

### 巡检记录状态
- `normal` - 正常
- `abnormal` - 异常
- `certificate_expired` - 证书过期（自动联动）
- `device_disabled` - 设备停用（自动联动）
- `pending_repair` - 待维修
- `repaired` - 已维修
- `pending_calibration` - 待校准
- `calibrated` - 已校准

## 数据安全

- 所有变更记录审计日志
- 状态流转有严格的前置条件检查
- 重复导入策略避免数据重复
- 异步任务失败有明确的状态区分
- 冻结状态保护数据不被修改

## 护士长关注重点

导出报告中重点展示：

1. **冻结前后状态对比**
   - 冻结前状态
   - 当前状态
   - 冻结原因、冻结人、冻结时间

2. **人工处理理由**
   - 每条异常记录的处理说明
   - 操作人、操作时间

3. **异常记录明细**
   - 设备名称、编号
   - 异常描述
   - 当前状态
   - 人工处理信息

4. **统计信息**
   - 总记录数、异常数
   - 各状态分布

## 注意事项

- 数据库默认使用SQLite，生产环境建议改用PostgreSQL
- 异步任务需要定时调用 `run-pending` 接口或实现后台worker
- 上传文件目录需要适当的权限设置
- 建议配置定期数据库备份
