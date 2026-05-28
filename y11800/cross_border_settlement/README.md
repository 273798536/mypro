# 跨境结算到账裂缝 API

## 启动

```bash
cd cross_border_settlement
chmod +x run.sh
./run.sh
```

服务启动后访问 http://127.0.0.1:8000/docs 查看交互式文档。

## 样例数据

样例文件在 `samples/` 目录下：

- `samples/orders.json` — 5 笔客户订单（EUR / JPY / GBP / USD / HKD）
- `samples/bank_slips.json` — 6 张银行水单（含拆分到账、手续费内扣、缺字段）
- `samples/platform_bills.json` — 4 张平台账单（含缺字段）

### 一键导入样例

```bash
curl -X POST http://127.0.0.1:8000/api/import/sample
```

返回结果中 `corrections` 列表会告诉你哪些水单/账单缺了什么字段、该怎么补。

## 查看手续费内扣

以样例数据为例，ORD-2026-001（EUR 50000）的水单 SLIP-EUR-001 到账 49800，标记了 fee_deducted=true：

**第一步**：导入样例 + 跑匹配

```bash
# 导入样例
curl -X POST http://127.0.0.1:8000/api/import/sample

# 跑到账匹配
curl -X POST http://127.0.0.1:8000/api/matching/run
```

匹配结果会告诉你 SLIP-EUR-001 检测到手续费内扣，进入 `pending_confirm` 状态。

**第二步**：查看手续费详情

```bash
# {id} 替换为匹配结果返回的 settlement_id
curl http://127.0.0.1:8000/api/settlements/{id}/fee-deduction
```

返回中 `follow_up` 字段会给出明确的后续动作（该调哪个接口、传什么参数）。

**第三步**：确认手续费后推进状态

```bash
curl -X POST http://127.0.0.1:8000/api/settlements/{id}/advance \
  -H "Content-Type: application/json" \
  -d '{"to_status":"matched","fee_handling":"deducted","fee_amount":200.00}'
```

## 完整流程示例

```bash
# 1. 导入样例
curl -X POST http://127.0.0.1:8000/api/import/sample

# 2. 跑匹配
curl -X POST http://127.0.0.1:8000/api/matching/run

# 3. 查看待确认列表（拆分水单、手续费内扣）
curl http://127.0.0.1:8000/api/settlements/pending-confirm/list

# 4. 查看某条结算明细
curl http://127.0.0.1:8000/api/settlements/{id}

# 5. 确认后推进状态
curl -X POST http://127.0.0.1:8000/api/settlements/{id}/advance \
  -H "Content-Type: application/json" \
  -d '{"to_status":"matched"}'

# 6. 币种换算（matched -> converted）
curl -X POST http://127.0.0.1:8000/api/settlements/{id}/advance \
  -H "Content-Type: application/json" \
  -d '{"to_status":"converted","exchange_rate":7.85,"rate_date":"2026-05-24"}'

# 7. 导出结果
curl http://127.0.0.1:8000/api/export/json -o settlements.json
curl http://127.0.0.1.8000/api/export/csv -o settlements.csv
```

## 关键接口速查

| 场景 | 接口 |
|---|---|
| 一键导入样例 | `POST /api/import/sample` |
| 导入自定义数据 | `POST /api/import/batch` |
| 上传 JSON 文件 | `POST /api/import/file` |
| 跑到账匹配 | `POST /api/matching/run` |
| 查看结算列表 | `GET /api/settlements/` |
| 查看结算明细 | `GET /api/settlements/{id}` |
| 推进结算状态 | `POST /api/settlements/{id}/advance` |
| 查看手续费内扣 | `GET /api/settlements/{id}/fee-deduction` |
| 待确认列表 | `GET /api/settlements/pending-confirm/list` |
| 导出 JSON | `GET /api/export/json` |
| 导出 CSV | `GET /api/export/csv` |

## 状态流转

```
pending → matched → converted → settled
  ↓         ↑
  → partial ─┘
  ↓
  → pending_confirm → matched
  ↓
  → discrepancy → matched (手动修正)
```

- `pending_confirm`：拆分到账或手续费内扣待确认
- `discrepancy`：金额/币种异常，需人工介入
- `converted`：已完成币种换算
- `settled`：最终到账确认
