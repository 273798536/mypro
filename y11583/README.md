# 门店会员储值验收回放链路服务

门店会员储值验收回放链路服务，用于管理会员储值充值流水、退款申请、门店交接表的批次验收，解决跨店消费和交易撤销导致的余额历史断层问题。

## 功能特性

- **批次管理**：将充值流水、退款申请、门店交接表、异常照片组织成可复核的批次
- **状态流转**：完整的状态机（草稿→提交→审核→通过/拒绝/部分通过→冻结→导出）
- **对账引擎**：自动检查余额连续性，检测跨店消费和撤销交易
- **幂等处理**：重复提交支持忽略、覆盖、追加三种策略
- **历史追溯**：完整记录状态变更、操作者、时间和原因
- **审计日志**：所有操作都有详细的HTTP读写和持久化记录
- **Excel导出**：财务主管视角的完整明细导出

## 项目结构

```
.
├── api/                    # API层
│   ├── dto/               # 数据传输对象
│   ├── handler/           # HTTP处理器
│   ├── middleware/        # 中间件
│   └── router.go          # 路由配置
├── cmd/
│   └── cli/               # CLI命令行工具
├── config/                # 配置文件
├── database/              # 数据库初始化
├── models/                # 数据模型
├── repository/            # 数据访问层
├── service/               # 业务逻辑层
├── scripts/               # Shell脚本
│   ├── start-server.sh   # 启动服务
│   ├── create-batch.sh   # 创建批次
│   ├── generate-data.sh  # 生成测试数据
│   ├── reconcile.sh      # 执行对账
│   ├── export.sh        # 导出数据
│   ├── change-status.sh # 变更状态
│   └── full-demo.sh     # 完整演示
├── data/                  # SQLite数据库文件
├── exports/               # 导出文件
├── logs/                  # 日志文件
└── main.go               # 主程序入口
```

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
go mod download

# 创建必要目录
mkdir -p data logs exports
```

### 2. 从空库启动服务

```bash
# 方式一：直接运行
go run main.go --config ./config/config.yaml

# 方式二：使用脚本
./scripts/start-server.sh
```

服务启动后访问 `http://localhost:8080`

### 3. 准备样例数据

```bash
# 新建一个终端窗口

# Step 1: 创建批次
curl -s -X POST http://localhost:8080/api/v1/batches \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: ADMIN001" \
  -H "X-Operator-Name: 系统管理员" \
  -d '{"store_id": "STORE001", "store_name": "朝阳门店"}'

# 记录返回的批次ID，示例: "id": "xxxx-xxxx-xxxx-xxxx"
export BATCH_ID="你的批次ID"

# Step 2: 生成测试数据（含异常）
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "recharge_count": 50,
    "refund_count": 5,
    "handover_count": 3,
    "include_errors": true
  }'
```

### 4. 走主流程

```bash
# 提交审核
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"reason": "数据准备完成"}'

# 开始审核
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/review" \
  -H "Content-Type: application/json" \
  -d '{"reason": "开始对账审核"}'

# 执行对账
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/reconcile" \
  -H "Content-Type: application/json" \
  -d '{}'

# 查看对账结果
curl -s "http://localhost:8080/api/v1/batches/$BATCH_ID" | jq .

# 审核通过
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{"reason": "对账无误，审核通过"}'

# 导出Excel
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/export" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5. 制造异常场景

#### 场景1：重复提交（幂等测试）

```bash
# 再次添加相同数据，使用不同策略
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/records" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "IGNORE",
    "recharge_records": [
      {
        "trans_no": "已存在的交易号",
        "member_id": "M0001",
        "member_name": "张三",
        "amount": 100
      }
    ]
  }'

# 策略说明：
# - IGNORE: 跳过已存在的记录
# - OVERWRITE: 覆盖已存在的记录
# - APPEND: 生成新编号追加
```

#### 场景2：撤回后再提交

```bash
# 先撤回
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/recall" \
  -H "Content-Type: application/json" \
  -d '{"reason": "发现错误，撤回修改"}'

# 修改后重新提交
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"reason": "修改后重新提交"}'
```

#### 场景3：部分失败 + 人工改判

```bash
# 审核时发现部分异常，标记为部分通过
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/partial" \
  -H "Content-Type: application/json" \
  -d '{"reason": "部分异常已核实，其余通过"}'
```

#### 场景4：导出前冻结

```bash
# 冻结批次防止修改
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/freeze" \
  -H "Content-Type: application/json" \
  -d '{"reason": "导出前锁定"}'

# 尝试修改会失败
curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/generate" \
  -H "Content-Type: application/json" \
  -d '{"recharge_count": 10}'
```

### 6. 查看导出和历史

```bash
# 查看导出文件
ls -la exports/

# 查看状态变更历史
curl -s "http://localhost:8080/api/v1/batches/$BATCH_ID" | jq '.histories'

# 查看审计日志（谁在什么时候改过什么）
curl -s "http://localhost:8080/api/v1/audit/logs?batch_id=$BATCH_ID" | jq .

# 查看余额历史
curl -s "http://localhost:8080/api/v1/batches/$BATCH_ID/balance-history" | jq .

# 查看对账异常
curl -s "http://localhost:8080/api/v1/batches/$BATCH_ID/reconciliation-results" \
  | jq '.[] | select(.match_status != "MATCHED")'
```

## 一键完整演示

```bash
# 确保服务已启动，然后运行：
./scripts/full-demo.sh
```

## API接口列表

### 批次管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/batches | 创建批次 |
| GET | /api/v1/batches | 批次列表 |
| GET | /api/v1/batches/:id | 批次详情 |
| POST | /api/v1/batches/:id/submit | 提交批次 |
| POST | /api/v1/batches/:id/recall | 撤回批次 |
| POST | /api/v1/batches/:id/review | 开始审核 |
| POST | /api/v1/batches/:id/approve | 审核通过 |
| POST | /api/v1/batches/:id/reject | 审核拒绝 |
| POST | /api/v1/batches/:id/partial | 部分通过 |
| POST | /api/v1/batches/:id/freeze | 冻结批次 |
| POST | /api/v1/batches/:id/cancel | 取消批次 |

### 数据操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/batches/:id/records | 添加记录 |
| POST | /api/v1/batches/:id/generate | 生成测试数据 |
| POST | /api/v1/batches/:id/reconcile | 执行对账 |
| POST | /api/v1/batches/:id/export | 导出Excel |
| GET | /api/v1/batches/:id/balance-history | 余额历史 |
| GET | /api/v1/batches/:id/reconciliation-results | 对账结果 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/playback | 交易回放 |
| GET | /api/v1/audit/logs | 审计日志 |

## 状态流转图

```
DRAFT(草稿)
  ↓
SUBMITTED(已提交) ←──────────┐
  ↓                         │
REVIEWING(审核中)            │
  ├→ APPROVED(通过)          │
  ├→ REJECTED(拒绝) ─→ DRAFT ┘
  ├→ PARTIAL(部分通过)
  └→ FROZEN(冻结) ─→ DRAFT ─┘

APPROVED ─→ FROZEN
APPROVED ─→ EXPORTED(已导出)
FROZEN   ─→ EXPORTED

EXPORTED 和 CANCELLED 为终态
```

## 财务主管关注重点

### 1. 命令脚本

所有操作都可通过命令行脚本执行，支持自动化：

```bash
# CLI工具使用
go run cmd/cli/main.go create-batch --store-id STORE001
go run cmd/cli/main.go list
go run cmd/cli/main.go generate --batch-id <id> --count 100
go run cmd/cli/main.go reconcile --batch-id <id>
go run cmd/cli/main.go export --batch-id <id>
```

### 2. HTTP读写

所有请求和响应都有详细日志，查看 `logs/app.log` 或控制台输出：

```
[HTTP] POST /api/v1/batches - Status: 200 - Duration: 12ms
[HTTP Request] {"store_id": "STORE001", ...}
[HTTP Response] {"id": "xxx", "batch_no": "xxx", ...}
```

### 3. 本地持久化

SQLite数据库文件 `data/prepaid-audit.db` 包含完整数据：

- 批次表（batches）
- 充值流水表（recharge_records）
- 退款申请表（refund_applications）
- 门店交接表（store_handovers）
- 状态历史表（status_histories）
- 余额历史表（balance_histories）
- 对账结果表（reconciliation_results）
- 审计日志表（audit_logs）

## 测试重点

### 状态变化测试

1. 正常流转：DRAFT → SUBMITTED → REVIEWING → APPROVED → EXPORTED
2. 撤回流程：SUBMITTED → DRAFT → SUBMITTED
3. 冻结解冻：REVIEWING → FROZEN → DRAFT
4. 非法流转：EXPORTED → DRAFT（应失败）

### 幂等性测试

1. 同一交易号多次提交（IGNORE策略）
2. 同一交易号多次提交（OVERWRITE策略）
3. 同一交易号多次提交（APPEND策略）

### 边界场景测试

1. 重复提交检测
2. 撤回后再提交
3. 部分失败处理
4. 人工改判记录
5. 导出前冻结保护
6. 异常不被吞掉

## 数据库表结构

使用SQLite查看数据：

```bash
sqlite3 data/prepaid-audit.db

> .tables
> .schema batches
> SELECT * FROM status_histories ORDER BY created_at DESC LIMIT 10;
> SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

## 导出Excel结构

导出文件包含以下Sheet：

1. **批次概览**：批次基本信息
2. **充值流水**：所有充值记录明细
3. **退款申请**：所有退款申请
4. **门店交接表**：交接记录
5. **余额历史**：按时间排序的余额变化
6. **对账结果**：每条记录的对账情况
7. **状态变更历史**：完整的状态流转记录

## 常见问题

**Q: 如何处理跨店消费？**
A: 对账时会标记跨店交易（CrossStoreCheck=WARNING），但不影响余额计算。

**Q: 撤销交易如何处理？**
A: 撤销交易会保留在历史中，标记为已撤销，对账时单独列出。

**Q: 余额断层如何检测？**
A: 按会员和时间排序后，检查前一笔后余额是否等于下一笔前余额。

**Q: 同一批数据跑两次会怎样？**
A: 根据策略决定：IGNORE（跳过）/ OVERWRITE（覆盖）/ APPEND（追加）。

## 技术栈

- Go 1.21
- Gin Web框架
- GORM ORM
- SQLite数据库
- Excelize Excel导出
- Cobra CLI框架

## License

MIT
