# 企业培训签到验收回放链路 API 服务

## 项目概述

企业培训签到验收回放链路服务，用于处理报名表、签到二维码、课后作业和退款流水的对账闭环。

### 核心特性

- **幂等处理**：重复请求只更新同一条事实，不会重复计算
- **对账汇总**：报名、签到、作业、退款四流合一
- **异常检测**：自动识别代签、补签、重复签到等异常
- **脏记录管理**：区分缺字段、跨日、改名、金额/数量冲突等问题
- **统一数据源**：导出文件、详情接口、历史查询使用同一套数据
- **本地持久化**：SQLite存储，无需额外数据库

## 快速开始

### 1. 启动服务

```bash
# 方式一：使用启动脚本（推荐）
bash scripts/start.sh

# 方式二：手动启动
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

服务启动后访问：`http://localhost:5001/api/health`

### 2. 运行完整测试

```bash
# 方式一：Python测试脚本（推荐，输出更清晰）
source venv/bin/activate
pip install requests
python scripts/run_test.py

# 方式二：生成测试数据
python scripts/generate_test_data.py
```

## API 接口文档

### 基础信息
- Base URL: `http://localhost:5002/api`
- Content-Type: `application/json`

---

### 1. 健康检查

```bash
curl http://localhost:5002/api/health
```

---

### 2. 数据录入接口

#### 2.1 报名表

```bash
curl -X POST http://localhost:5001/api/registration \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH_001",
    "employee_id": "EMP001",
    "employee_name": "张三",
    "department": "技术部",
    "training_course": "企业合规培训",
    "training_date": "2024-03-15",
    "registration_time": "2024-03-10 10:00:00",
    "amount": 100.0,
    "status": "registered"
  }'
```

#### 2.2 签到记录

```bash
curl -X POST http://localhost:5001/api/sign \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH_001",
    "sign_id": "SIGN_0001",
    "employee_id": "EMP001",
    "employee_name": "张三",
    "training_course": "企业合规培训",
    "sign_time": "2024-03-15 09:05:00",
    "qr_code": "QR_001",
    "location": "3楼会议室A",
    "is_proxy": false,
    "is_makeup": false
  }'
```

#### 2.3 课后作业

```bash
curl -X POST http://localhost:5001/api/homework \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH_001",
    "homework_id": "HW_0001",
    "employee_id": "EMP001",
    "employee_name": "张三",
    "training_course": "企业合规培训",
    "submit_time": "2024-03-16 10:00:00",
    "score": 92.5,
    "status": "submitted"
  }'
```

#### 2.4 退款流水

```bash
curl -X POST http://localhost:5001/api/refund \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH_001",
    "refund_id": "REFUND_001",
    "employee_id": "EMP001",
    "employee_name": "张三",
    "training_course": "企业合规培训",
    "refund_amount": 100.0,
    "refund_time": "2024-03-17 10:00:00",
    "refund_reason": "员工离职"
  }'
```

---

### 3. 对账与查询接口

#### 3.1 执行对账

```bash
curl -X POST http://localhost:5001/api/reconcile/BATCH_001
```

#### 3.2 查看对账结果

```bash
curl http://localhost:5001/api/reconcile/BATCH_001
```

#### 3.3 异常分析

```bash
curl http://localhost:5001/api/anomalies/BATCH_001
```

#### 3.4 查看脏记录

```bash
curl http://localhost:5001/api/dirty/BATCH_001
```

#### 3.5 修复脏记录

```bash
curl -X POST http://localhost:5001/api/dirty/1/fix \
  -H "Content-Type: application/json" \
  -d '{
    "fixed_by": "HRBP_001",
    "fixed_data": {"employee_name": "张三"}
  }'
```

---

### 4. 导出接口

```bash
# 导出Excel报告
curl http://localhost:5001/api/export/BATCH_001

# 下载文件
curl -O http://localhost:5001/api/download/training_recon_BATCH_001_*.xlsx
```

---

### 5. 历史查询

```bash
curl http://localhost:5001/api/history
```

---

## 脏记录类型说明

| 类型 | 说明 | 处理建议 |
|------|------|----------|
| MISSING_FIELD | 缺字段 | 补充缺失的必填字段 |
| CROSS_DATE | 跨日 | 确认实际签到日期或标记为补签 |
| NAME_CHANGE | 改名 | 核实员工ID或更新姓名 |
| AMOUNT_CONFLICT | 金额冲突 | 核实金额或备注原因 |
| COUNT_CONFLICT | 数量冲突 | 核实签到次数或标记为代签 |
| INVALID_FORMAT | 格式错误 | 检查日期、数字等字段格式 |

## 数据一致性保证

1. **幂等键机制**：基于数据内容生成MD5哈希，重复请求自动更新
2. **单一数据源**：所有查询和导出都从同一数据库表读取
3. **实时更新**：对账结果重新计算时，历史记录自动更新
4. **原始保留**：每条记录保存raw_data字段，保留原始请求内容

## 目录结构

```
.
├── app.py                 # Flask应用入口
├── config.py              # 配置文件
├── requirements.txt       # Python依赖
├── api/
│   ├── __init__.py
│   └── routes.py         # API路由定义
├── models/
│   ├── __init__.py
│   ├── database.py       # 数据库连接
│   └── tables.py         # 数据表定义
├── services/
│   ├── idempotency.py    # 幂等处理
│   ├── data_processor.py # 数据验证和脏记录
│   ├── reconciliation.py # 对账逻辑
│   └── exporter.py       # Excel导出
├── scripts/
│   ├── start.sh          # 启动脚本
│   ├── run_test.py       # Python测试脚本
│   ├── run_test.sh       # Shell测试脚本
│   └── generate_test_data.py # 测试数据生成
├── data/                 # SQLite数据库目录
└── exports/              # Excel导出目录
```

## HRBP 重点关注

1. **命令脚本**：`scripts/` 目录下的启动和测试脚本
2. **HTTP读写**：使用curl命令可追踪每一笔数据的写入和查询
3. **本地持久化**：`data/training_sign.db` 可直接用SQLite工具查看原始数据
4. **失败清单**：脏记录接口 `/api/dirty/{batch_id}` 列出所有问题记录
5. **修正结果**：修复后重新执行对账，结果自动更新
6. **最终报告**：导出的Excel包含6个工作表，数据来源可追溯

## 验证流程

按以下顺序执行，确保数据一致：

1. 启动服务 → 健康检查确认运行
2. 依次提交：报名表 → 签到 → 作业 → 退款
3. 重复提交任意数据 → 验证幂等处理（返回"已更新"）
4. 执行对账 → 查看汇总数据
5. 查看异常 → 确认代签、补签、未签到等异常
6. 导出Excel → 对比接口数据和文件数据一致性
7. 查看历史 → 确认对账记录已保存
