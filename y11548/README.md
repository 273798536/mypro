# 线下展会物料验收回放链路服务

> 撤展时借出的设备找不回责任人？不能变成一笔糊涂账。

## 核心价值

- **责任到人**：借用记录关联到具体人员和部门，撤展可追溯
- **状态冻结**：确认后的数据无法篡改，防止事后修改
- **权限隔离**：录入、复核、主管、只读四种角色各司其职
- **全链路追溯**：从报表数字可追查到单条操作记录
- **异常可见**：坏数据不进汇总，但在失败列表保留原因

## 快速开始

### 一键启动

```bash
# 安装依赖
pip install -r requirements.txt

# 一键启动（初始化数据库+创建用户+启动服务）
python cli.py quick-start
```

### 分步启动

```bash
# 1. 初始化数据库
python cli.py initdb

# 2. 创建测试用户
python cli.py create-users

# 3. 启动服务
python cli.py serve
```

服务启动后访问：http://localhost:8000/docs

## 默认用户

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin123 | 主管 | 全部权限，可冻结批次 |
| reviewer | review123 | 复核员 | 可复核、导出、对账 |
| entry | entry123 | 录入员 | 可录入和修改草稿 |
| viewer | view123 | 只读 | 只能查看，不能修改 |

## CLI 命令参考

所有命令都有明确的退出码：
- `0` - 成功
- `1` - 业务失败（如对账发现异常）
- `2` - 系统错误

```bash
material-cli [COMMAND] [OPTIONS]

命令列表:
  initdb           初始化数据库
  create-users     创建默认测试用户
  serve            启动API服务
  create-batch     创建展会批次
  list-batches     列出所有展会批次
  freeze-batch     冻结批次（防止修改）
  export           导出完整报表
  reconcile        执行对账
  demo-data        生成演示数据（跨日/跨批次边界样例）
  test-freeze      测试冻结批次是否能被错误修改
  quick-start      一键快速启动
```

### 常用操作示例

```bash
# 生成演示数据（含跨日/跨批次边界）
python cli.py demo-data

# 执行对账
python cli.py reconcile --batch-id 1

# 导出报表
python cli.py export --batch-id 1 --output ./report.xlsx

# 测试冻结保护
python cli.py test-freeze --batch-id 1
```

## API 使用流程

### 1. 获取 Token

```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

### 2. 创建展会批次

```bash
curl -X POST "http://localhost:8000/batches" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "SH20240501",
    "exhibition_name": "上海国际会展中心-春季展",
    "location": "上海",
    "start_date": "2024-05-01T00:00:00",
    "end_date": "2024-05-03T23:59:59"
  }'
```

### 3. 导入物料清单

```bash
# 单条创建
curl -X POST "http://localhost:8000/materials" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": 1,
    "material_code": "LAP-001",
    "material_name": "笔记本电脑",
    "quantity": 10,
    "category": "电子设备"
  }'

# 批量导入CSV
curl -X POST "http://localhost:8000/imports/material?batch_id=1" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@scripts/sample_import_template.csv"
```

### 4. 记录借用

```bash
curl -X POST "http://localhost:8000/borrow" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": 1,
    "borrow_no": "BRW001",
    "borrower_name": "王销售",
    "borrower_department": "销售部",
    "material_code": "LAP-001",
    "material_name": "笔记本电脑",
    "quantity": 2,
    "borrow_date": "2024-05-01T09:00:00"
  }'
```

### 5. 冻结批次（撤展确认）

```bash
curl -X POST "http://localhost:8000/batches/1/transition" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"target_status": "frozen"}'
```

**重要**：冻结后，批次内的所有记录都无法修改、删除或新增。

### 6. 对账（发现异常）

```bash
curl -X POST "http://localhost:8000/reconciliation/1" \
  -H "Authorization: Bearer <TOKEN>"
```

### 7. 追溯单条记录

```bash
curl "http://localhost:8000/reconciliation/1/trace/LAP-001" \
  -H "Authorization: Bearer <TOKEN>"
```

### 8. 导出报表

```bash
curl "http://localhost:8000/exports/1/full" \
  -H "Authorization: Bearer <TOKEN>" \
  -o full_report.xlsx
```

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 主入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models.py            # 数据模型
│   ├── schemas.py           # Pydantic Schema
│   ├── auth.py              # 认证与权限
│   ├── utils.py             # 工具函数
│   └── routers/
│       ├── auth.py          # 认证接口
│       ├── batches.py       # 批次管理
│       ├── materials.py     # 物料清单
│       ├── logistics.py     # 物流签收
│       ├── borrow.py        # 借用记录
│       ├── scans.py         # 扫码明细
│       ├── imports.py       # 数据导入
│       ├── reconciliation.py # 对账与异常
│       ├── exports.py       # 报表导出
│       └── logs.py          # 操作日志
├── scripts/
│   ├── e2e_test.py          # 端到端测试
│   └── sample_import_template.csv # 导入模板
├── cli.py                   # CLI 命令行工具
├── requirements.txt         # 依赖列表
└── README.md                # 本文档
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| users | 用户表（含角色） |
| exhibition_batches | 展会批次 |
| materials | 物料清单 |
| logistics_receipts | 物流签收记录 |
| borrow_records | 借用记录（责任人） |
| scan_records | 扫码明细 |
| import_tasks | 导入任务 |
| import_failures | 导入失败记录（坏数据） |
| operation_logs | 操作日志（全链路追踪） |
| reconciliation_results | 对账结果 |

## 权限矩阵

| 操作 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| 查看记录 | ✓ | ✓ | ✓ | ✓ |
| 创建记录 | ✓ | ✓ | ✓ | ✗ |
| 修改记录 | ✓* | ✓* | ✓ | ✗ |
| 删除记录 | ✗ | ✗ | ✓ | ✗ |
| 复核/冻结 | ✗ | ✓ | ✓ | ✗ |
| 批次冻结 | ✗ | ✗ | ✓ | ✗ |
| 导出报表 | ✗ | ✓ | ✓ | ✗ |
| 对账 | ✗ | ✓ | ✓ | ✗ |
| 用户管理 | ✗ | ✗ | ✓ | ✗ |

*注：只能修改草稿状态且批次未冻结的记录

## 状态机

### 批次状态

```
DRAFT(草稿) → IN_PROGRESS(进行中) → REVIEWING(复核中) → FROZEN(冻结) → COMPLETED(完成)
```

### 记录状态

```
DRAFT(草稿) → SUBMITTED(已提交) → REVIEWED(已复核) → FROZEN(已冻结)
                  ↓
              REJECTED(已驳回) → DRAFT
```

## 端到端测试

运行完整的端到端测试，验证所有边界场景：

```bash
# 先启动服务
python cli.py serve

# 新开终端运行测试
python scripts/e2e_test.py
```

测试覆盖场景：
1. 用户认证与权限验证
2. **跨日/跨批次边界** - 创建两个独立批次
3. 物料清单批量导入
4. 物流签收记录
5. **借用记录责任追踪** - 关联到人
6. 扫码明细出入库
7. **状态冻结机制** - 验证冻结后无法修改
8. 权限控制验证
9. **对账异常检测** - 自动发现问题
10. **单条记录追溯** - 从报表追到明细
11. 操作日志审计
12. 报表导出

## 项目经理关注点

### 命令脚本

```bash
# 完整流程脚本化
python cli.py initdb
python cli.py create-users
python cli.py demo-data
python cli.py reconcile --batch-id 1
python cli.py export --batch-id 1
python cli.py test-freeze --batch-id 1
```

### HTTP 请求数

从创建到导出的完整流程约 **30+ 次 HTTP 请求**，全部可通过脚本自动化。

### 本地持久化

所有数据保存在本地 SQLite 数据库 `exhibition_material.db`，包含：
- 所有业务记录
- 完整的操作日志
- 导入失败的原始数据
- 对账异常记录

### 关键边界验证

**状态冻结后能否被错误修改？**

不能。系统在四个层面做了严格保护：

1. **状态机层** - `utils.py:75` FROZEN/COMPLETED 状态转移列表为空，无法转回任何状态
2. **状态转移层** - `batches.py:120-124` 状态转移前检查当前状态，FROZEN/COMPLETED 批次不可变 (immutable)
3. **数据写入层** - 所有写入接口（创建/修改/导入）先检查批次状态
4. **操作日志层** - 所有尝试都留下记录

**已修复的安全漏洞：**

| 漏洞 | 原代码 | 修复 |
|------|--------|------|
| FROZEN 可转回 IN_PROGRESS | `utils.py:75` `FROZEN: [IN_PROGRESS]` | `FROZEN: []` |
| 只读用户可解冻批次 | `batches.py:117` 只限制冻结权限 | `batches.py:120-124` 检查当前状态 |
| 冻结后可导入数据 | `imports.py` 无检查 | `imports.py:31-32` 导入前检查批次状态 |

运行 `python cli.py test-freeze --batch-id 1` 可自动验证 5 项安全测试。

## 退出码说明

| 退出码 | 含义 | 场景示例 |
|--------|------|----------|
| 0 | 成功 | 操作正常完成 |
| 1 | 业务失败 | 对账发现异常、验证不通过 |
| 2 | 系统错误 | 数据库连接失败、网络错误 |

## 常见问题

**Q: 为什么撤展后还要冻结批次？**
A: 防止事后有人篡改记录，确保责任追溯的可信度。

**Q: 导入失败的数据去哪里了？**
A: 坏数据不会进入汇总表，但会完整保留在 `import_failures` 表，可查看具体行号和错误原因。

**Q: 如何找到未归还的设备？**
A: 调用 `/borrow/unreturned/summary?batch_id=X` 可查看所有未归还记录及其责任人。

**Q: 可以跨批次对账吗？**
A: 目前按批次隔离对账，这是业务设计——每个展会是独立的责任闭环。
