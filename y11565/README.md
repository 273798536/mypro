# 城市照明抢修异常回执状态机服务

解决同一路段反复熄灯却被拆成多个零散工单之后的状态追踪和复核依据问题。

## 核心功能

### 1. 批次管理
- **批次创建**: 将同一路段的零散工单合并管理
- **重复策略**: 支持 IGNORE（忽略）、OVERWRITE（覆盖）、APPEND（追加）
- **状态流转**: 草稿 → 待审核 → 审核中 → 通过/驳回 → 冻结 → 结算 → 归档

### 2. 附件管理
- 巡检照片（inspection_photo）
- 报修热线记录（repair_hotline）
- 备件批次信息（spare_part）
- 手工改价表（price_adjustment）

### 3. 变更轨迹
- 所有操作记录变更日志
- 记录：谁（changed_by）、什么时候（created_at）、改了什么（old_value → new_value）、为什么改（change_reason）

### 4. 冻结结算
- 冻结时记录冻结前状态
- 记录冻结原因和冻结人
- 解冻后状态恢复
- 支持结算、归档、撤销

### 5. 异步任务
- 失败分级：
  - WAITING_RETRY: 等待自动重试
  - WAITING_MANUAL: 等待人工处理
  - FAILED_PERMANENT: 永久失败
- 服务恢复后可继续处理待执行任务

### 6. 导出汇总
- 市政负责人重点关注：
  - 冻结前后状态对比
  - 人工操作理由
  - 完整变更历史
- 导出格式：xlsx、csv、json
- Excel 包含多个工作表：批次汇总、工单明细、冻结状态汇总、变更历史、异常工单明细

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### CLI 使用方式

```bash
# 查看帮助
python cli.py --help

# 创建批次
python cli.py batch create --batch-no BATCH-001 --name "测试批次" --road-section "中山路"

# 添加工单
python cli.py workorder add 1 --order-no WO-001 --pole-number ZL-001 --is-abnormal

# 上传附件
python cli.py attachment upload 1 ./photo.jpg --file-type inspection_photo

# 提交审核
python cli.py batch submit 1

# 复核通过
python cli.py batch review 1 --result approved --comment "同意" --reviewed-by "张三"

# 冻结批次
python cli.py batch freeze 1 --reason "数据异常" --frozen-by "李四"

# 导出汇总
python cli.py export summary --format xlsx

# 查看统计
python cli.py stats

# 任务调度（异步任务恢复执行）
python cli.py task list                    # 列出异步任务
python cli.py task show <task_id>          # 显示任务详情
python cli.py task run-once                # 立即执行一次待处理任务
python cli.py task worker --interval 30    # 启动任务工作进程，持续轮询
python cli.py task retry <task_id>         # 重试失败任务

# 启动 API 服务
python cli.py api --port 8000
```

### API 使用方式

启动服务后访问 `http://localhost:8000/docs` 查看完整 API 文档

#### 核心接口
```
POST   /batches                  # 创建批次
GET    /batches/{id}             # 获取批次详情
POST   /batches/{id}/submit      # 提交审核
POST   /batches/{id}/review      # 复核
POST   /batches/{id}/freeze      # 冻结
POST   /batches/{id}/unfreeze    # 解冻
POST   /batches/{id}/settle      # 结算
POST   /batches/{id}/archive     # 归档
POST   /batches/{id}/cancel      # 撤销
POST   /batches/{id}/attachments # 上传附件
POST   /export                   # 导出汇总
```

### Python SDK 方式

```python
from app.database import SessionLocal
from app.schemas import BatchCreate, WorkOrderCreate
from app.services import batch_service, export_service

db = SessionLocal()

# 创建批次
batch_data = BatchCreate(
    batch_no="BATCH-001",
    name="中山路异常汇总",
    road_section="中山路",
    work_orders=[
        WorkOrderCreate(order_no="WO-001", pole_number="ZL-001", is_abnormal=True),
    ],
)
batch = batch_service.create_batch(db, batch_data)

# 导出
filepath = export_service.export_batch_summary(db, format="xlsx")
```

## 目录结构
```
.
├── app/
│   ├── __init__.py
│   ├── enums.py           # 枚举定义
│   ├── database.py        # 数据库配置
│   ├── models.py          # 数据模型
│   ├── schemas.py         # Pydantic 模式
│   ├── api.py             # FastAPI 接口
│   └── services/          # 业务服务
│       ├── batch_service.py
│       ├── attachment_service.py
│       ├── change_log_service.py
│       ├── task_service.py
│       └── export_service.py
├── cli.py                  # 命令行工具
├── example_usage.py        # 使用示例
├── requirements.txt        # 依赖
└── README.md
```

## 退出码说明（CLI）
- 0: 成功
- 1: 失败（参数错误、业务错误等）

## 运行示例
```bash
python example_usage.py
```
