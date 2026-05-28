# 私募投资人分配瀑布 API

## 启动方式

```bash
cd waterfall_api
pip install fastapi uvicorn pydantic
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

或使用根目录启动脚本：
```bash
pip install -r requirements.txt
python run.py
```

## API 文档

启动后访问：http://localhost:8000/docs

## 核心功能

### 1. 导入样例数据

```bash
# 方式一：调用种子接口
curl -X POST http://localhost:8000/seed

# 方式二：自定义导入
curl -X POST http://localhost:8000/import \
  -H "Content-Type: application/json" \
  -d '{
    "fund_name": "测试基金一期",
    "total_commitment": 500000000,
    "investors": [
      {"name": "LP1", "share_percentage": 0.4, "commitment_amount": 200000000, "investor_type": "lp"},
      {"name": "LP2", "share_percentage": 0.4, "commitment_amount": 200000000, "investor_type": "lp"},
      {"name": "GP", "share_percentage": 0.2, "commitment_amount": 100000000, "investor_type": "gp"}
    ],
    "rule": {
      "effective_date": "2024-01-01",
      "preferred_return_rate": 0.08,
      "catch_up_rate": 1.0,
      "carried_interest_rate": 0.20,
      "residual_split_gp": 0.20,
      "residual_split_lp": 0.80,
      "hurdle_tiers": [
        {"threshold": 0.0, "rate": 0.08, "label": "一档-基础门槛(8%)"},
        {"threshold": 0.08, "rate": 0.10, "label": "二档-标准门槛(10%)"},
        {"threshold": 0.10, "rate": 0.12, "label": "三档-超额门槛(12%)"}
      ]
    },
    "co_investments": [
      {"investor_name": "LP1", "co_invest_amount": 50000000, "discount_rate": 0.15, "batch_number": 1}
    ]
  }'
```

### 2. 创建分配

```bash
curl -X POST http://localhost:8000/distributions \
  -H "Content-Type: application/json" \
  -d '{"fund_id": 1, "rule_id": 1, "total_amount": 200000000}'
```

### 3. 查询分配明细

```bash
curl http://localhost:8000/distributions/1/details
```

### 4. 查看待确认项

```bash
curl http://localhost:8000/pending-confirmations?status=pending
```

### 5. 推进分配状态

```bash
# 方式一：审批门槛跨档并推进
curl -X POST http://localhost:8000/distributions/1/advance \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_ids": [1, 2, 3],
    "confirm_action": "approve"
  }'

# 方式二：拒绝门槛跨档
curl -X POST http://localhost:8000/distributions/1/advance \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_ids": [1, 2, 3],
    "confirm_action": "reject"
  }'

# 处理完待确认项后再次推进（从 confirmed 到 completed）
curl -X POST http://localhost:8000/distributions/1/advance \
  -H "Content-Type: application/json" \
  -d '{"confirm_action": "approve"}'
```

### 6. 添加争议备注（月底复盘用）

```bash
curl -X POST http://localhost:8000/distributions/1/dispute \
  -H "Content-Type: application/json" \
  -d '{
    "investor_id": 1,
    "note": "LP1 质疑本次门槛跨档计算口径，需与合规确认",
    "created_by": "基金秘书"
  }'
```

### 7. 导出结果

```bash
curl http://localhost:8000/distributions/1/export
```

导出结果中最关键的字段：
- `hurdle_cross_tier_intercepted`: 布尔值，明确回答"门槛跨档有没有被拦住"
- `hurdle_cross_tier_blocked`: 按投资人维度标注是否被拦截
- `pending_reason`: 待确认原因汇总

## 分配瀑布五步曲

1. **资本返还 (return_of_capital)**: 先返还全体投资人出资本金
2. **优先回报 (preferred_return)**: 按门槛收益率给 LP 发放优先回报（跟投折扣适用）
3. **追赶条款 (catch_up)**: GP 追补业绩报酬
4. **超额收益 (carried_interest)**: GP 提取业绩报酬
5. **剩余分配 (residual)**: 超额部分按约定比例分配

## 待确认分支类型

| 类型 | 说明 | 后续动作 |
|------|------|----------|
| `hurdle_cross_tier` | 投资人累计回报率处于两档门槛之间 | 确认按跨档后门槛计算，或维持当前档位 |
| `co_invest_discount` | 存在跟投折扣记录 | 确认跟投折扣在本次分配中是否适用 |
| `batch_distribution` | 存在分批回款记录 | 确认本批次回款是否参与本次分配 |

## 规则版本管理

- 每次修改规则自动生成新版本
- 支持查看规则变更日志
- 分配时绑定具体规则版本，确保口径一致
