# 券商融资融券追保系统

## 系统概述
融资融券追保后端API系统，用于客户账户接近维持担保线时的风险监控和追保通知管理。

## 核心功能
- **担保率计算**: 基于持仓市值和折算率自动计算担保率
- **风险分层**: normal(正常) / warning(预警) / danger(危险)
- **追保管理**: 生成追保记录、查明细、改状态
- **数据追溯**: 从追保结果可反查回证券持仓
- **报表导出**: 支持Excel导出和月度复盘报告

## 业务规则
1. **折算率过期**: 自动进入待确认分支，需风控部核实
2. **停牌处理**: 停牌股票价格沿用，需人工核实
3. **重复通知**: 当日已发送的追保需确认是否重发

## 快速启动

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 创建样例数据
```bash
python sample_data.py
```

### 3. 启动服务
```bash
python main.py
```
或
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问API文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 数据流向说明

```
客户账户 → 证券持仓 + 行情快照 + 折算率表 → 担保率计算 → 追保记录
                                                               ↓
                                                          明细拆分
                                                               ↓
结果反查: 追保记录 → 追保明细 → 持仓记录（通过stock_code关联）
```

## 样例数据说明

| 账户 | 客户 | 场景 | 预期担保率 |
|------|------|------|------------|
| RZ001 | 张三 | 含过期折算率(中国平安) | 待确认分支 |
| RZ002 | 李四 | 正常账户 | 正常 |
| RZ003 | 王五 | 含停牌股票(紫金矿业) | 危险等级 |
| RZ004 | 赵六 | 含过期折算率 | 预警等级 |
| RZ005 | 钱七 | 正常账户 | 正常 |

## 核心API接口

### 追保管理
- `POST /api/margin-calls/generate` - 生成追保记录
- `GET /api/margin-calls/{call_id}` - 查询追保详情
- `GET /api/margin-calls/{call_id}/details` - 查询追保明细
- `PATCH /api/margin-calls/{call_id}/status` - 更改状态
- `POST /api/margin-calls/batch-generate` - 批量生成追保

### 数据追溯
- `GET /api/export/trace/{call_id}` - 追保记录溯源

### 报表导出
- `GET /api/export/margin-calls` - 导出追保记录
- `GET /api/export/margin-calls/{call_id}/details` - 导出明细
- `GET /api/export/monthly-report` - 月度复盘报告

### 基础数据
- 客户账户: `/api/accounts/`
- 证券持仓: `/api/positions/`
- 行情快照: `/api/quotes/`
- 折算率表: `/api/margin-rates/`

## 状态说明

### 追保状态 (status)
- `pending` - 待处理
- `pending_confirm` - 待确认（含异常情况）
- `processed` - 已处理
- `closed` - 已关闭

### 通知状态 (notification_status)
- `pending` - 待发送
- `sent` - 已发送
- `failed` - 发送失败

### 风险等级 (risk_level)
- `normal` - 正常 (>150%)
- `warning` - 预警 (130%-150%)
- `danger` - 危险 (<=130%)

## 测试步骤

### 1. 生成追保记录
```bash
# 先获取账户ID
GET /api/accounts/no/RZ003

# 生成追保
POST /api/margin-calls/generate
{
  "account_id": "[账户ID]",
  "call_date": "2024-01-15"
}
```

### 2. 查看追保结果
```bash
GET /api/margin-calls/[追保ID]/details
```

### 3. 数据溯源验证
```bash
GET /api/export/trace/[追保ID]
```

### 4. 导出报表
```bash
GET /api/export/margin-calls?call_date=2024-01-15
```

## 项目结构

```
.
├── main.py              # 主入口
├── database.py          # 数据库配置
├── models.py            # 数据模型
├── schemas.py           # API数据结构
├── margin_calculator.py # 担保率计算核心
├── sample_data.py       # 样例数据生成
├── requirements.txt     # 依赖列表
├── api/
│   ├── __init__.py
│   ├── accounts.py      # 账户API
│   ├── positions.py     # 持仓API
│   ├── quotes.py        # 行情API
│   ├── margin_rates.py  # 折算率API
│   ├── margin_calls.py  # 追保API
│   └── export.py        # 导出API
├── exports/             # 导出文件目录
└── margin_call.db       # SQLite数据库
```
