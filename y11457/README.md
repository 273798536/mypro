# 社区团购售后重试补偿队列服务

## 系统概述

本系统用于处理社区团购售后补偿申请，支持从团长退款表、仓库复核表、用户备注和手工改价表四个来源建账，通过重试队列自动处理补偿，异常情况支持人工接管。

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 初始化数据库

```bash
python init_db.py
```

默认创建的用户：

| 用户名 | 密码 | 角色 | 城市 |
|--------|------|------|------|
| admin | admin123 | 主管 | 全部 |
| reviewer | reviewer123 | 复核 | 北京 |
| reviewer_sh | reviewer123 | 复核 | 上海 |
| entry | entry123 | 录入 | 北京 |
| readonly | readonly123 | 只读 | 全部 |

### 3. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000/docs 查看 API 文档

## 核心业务流程

### 标准流程

```
数据源录入 → 审核通过 → 进入补偿队列 → 自动重试 → 补偿完成
                         ↓
                    需要人工介入 → 人工接管 → 处理 → 完成/关闭
                         ↓
                    超过重试次数 → 死信队列
```

### 异常处理路径

| 异常类型 | 处理方式 | 修正步骤 |
|----------|----------|----------|
| 网络超时 | 自动重试 | 等待下次重试或手动触发 |
| 数据校验失败 | 进入失败列表 | 修正原始数据后重新审核 |
| 金额不一致 | 人工接管 | 核对金额后重新提交或关闭 |
| 用户账户异常 | 死信队列 | 联系用户后手工处理 |

## 权限体系

### 角色定义

| 角色 | 英文标识 | 可见字段 | 可操作动作 |
|------|----------|----------|------------|
| 录入 | data_entry | 基础字段 | 创建、查看 |
| 复核 | reviewer | 含审核字段 | 创建、查看、更新、审核、分配 |
| 主管 | supervisor | 全部字段 | 全部操作 |
| 只读 | read_only | 非敏感字段 | 查看、导出 |

### 字段权限示例（团长退款表）

| 字段 | 录入 | 复核 | 主管 | 只读 |
|------|------|------|------|------|
| refund_no | ✓ | ✓ | ✓ | ✓ |
| order_no | ✓ | ✓ | ✓ | ✓ |
| leader_id | ✓ | ✓ | ✓ | ✗ |
| is_verified | ✓ | ✓ | ✓ | ✓ |
| verified_by | ✗ | ✓ | ✓ | ✗ |
| verified_at | ✗ | ✓ | ✓ | ✗ |

## API 使用指南

### 1. 认证

获取 Token：
```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

### 2. 导入数据

使用样例数据导入：
```bash
# 导入团长退款数据
curl -X POST "http://localhost:8000/import/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@samples/sample_leader_refunds.csv" \
  -F "file_type=leader_refund" \
  -F "is_historical=false"
```

支持的文件类型：
- `leader_refund` - 团长退款表
- `warehouse_review` - 仓库复核表
- `user_remark` - 用户备注
- `manual_price_adjust` - 手工改价表

支持的压缩包格式：`.zip`, `.tar.gz`, `.tgz`

### 3. 查看补偿队列

```bash
# 查看待处理队列
curl "http://localhost:8000/queue/?status=queued" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看差异历史
curl "http://localhost:8000/queue/1/diff" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 处理补偿

```bash
# 单条处理
curl -X POST "http://localhost:8000/queue/process" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": 1, "force": false}'

# 批量处理
curl -X POST "http://localhost:8000/queue/process-batch?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 人工接管
curl -X POST "http://localhost:8000/queue/manual-takeover" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": 1, "reason": "金额需要核对"}'

# 强制重试
curl -X POST "http://localhost:8000/queue/force-retry" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": 1}'
```

### 5. 城市负责人报表

```bash
# 城市概览（重点关注）
curl "http://localhost:8000/reports/city-overview?city=北京" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 重试分类统计
curl "http://localhost:8000/reports/retry-categories" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 死信分析
curl "http://localhost:8000/reports/dead-letters" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 失败记录
curl "http://localhost:8000/reports/failed-records" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 数据追溯

### 追溯链路

```
报表汇总 → 单条队列记录 → 源数据表记录 → 操作日志 → 差异对比
```

### 查看记录差异

```bash
# 队列记录差异
curl "http://localhost:8000/queue/{id}/diff"

# 源记录变更历史
curl "http://localhost:8000/logs/diff/leader_refunds/{id}"
```

### 导出报表

```bash
# 导出汇总报表
curl "http://localhost:8000/reports/export/summary" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o summary_report.csv
```

## 失败处理指引

### 常见失败原因及修正

| 错误类型 | 错误信息 | 修正方式 | 报表变化 |
|----------|----------|----------|----------|
| validation_error | 缺少必填字段 | 补充缺失字段后重新导入 | 失败记录减少，待处理增加 |
| duplicate_error | 单号已存在 | 检查是否重复提交或修改单号 | 无变化（已存在记录） |
| import_error | 金额格式错误 | 修正金额后重新导入 | 失败记录减少，待处理增加 |
| 系统错误 | 支付系统超时 | 等待自动重试或手动触发 | 状态变为重试中 |

### 死信恢复流程

1. 查看死信列表：`GET /reports/dead-letters`
2. 分析失败原因：查看 `GET /queue/{id}/logs`
3. 人工接管处理：`POST /queue/manual-takeover`
4. 修正后强制重试：`POST /queue/force-retry`
5. 或关闭记录：`POST /queue/close`

## 目录结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # 应用入口
│   ├── config.py            # 配置
│   ├── database.py          # 数据库连接
│   ├── models.py            # 数据模型
│   ├── schemas.py           # 请求/响应模型
│   ├── auth.py              # 认证与权限
│   ├── services.py          # 核心业务服务
│   ├── import_service.py    # 数据导入服务
│   └── api/
│       ├── __init__.py
│       ├── auth.py          # 认证API
│       ├── sources.py       # 数据源API
│       ├── queue.py         # 补偿队列API
│       ├── reports.py       # 报表API
│       ├── imports.py       # 导入API
│       └── logs.py          # 日志API
├── samples/                 # 样例数据
├── init_db.py               # 数据库初始化脚本
├── requirements.txt         # 依赖包
└── README.md                # 本文档
```

## 注意事项

1. **坏数据处理**：校验不通过的数据不会进入汇总，但会保存在失败记录列表中
2. **重复补偿**：同一来源记录只会创建一条队列记录，避免重复补偿
3. **权限控制**：不同角色可见字段和可操作动作严格区分
4. **历史数据**：历史压缩包导入会标记为历史来源，可追溯原始批次
5. **金额一致性**：补偿入账后记录状态变更，异常金额需人工核对
