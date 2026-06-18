# 数据订正工单 API

面向 DBA 的数据订正工单处理系统。核心目标：每条处理结论可反查，报告导出与回滚记录共用同一批处理记录。

## 1. 启动

```bash
pip install -r requirements.txt
python app.py
```

服务启动在 http://127.0.0.1:5000 。首次启动自动在当前目录创建 `data_correction.db`（SQLite）并注入示例数据，无需手动建表。

健康检查：

```bash
curl http://127.0.0.1:5000/api/health
```

## 2. 导入工单（创建）

```bash
curl -X POST http://127.0.0.1:5000/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "title": "订单金额订正",
    "applicant": "zhangsan",
    "target_table": "order_main",
    "sql_statement": "UPDATE order_main SET amount = 99.00 WHERE order_no = \"ORD20260101\""
  }'
```

查看工单列表：

```bash
curl http://127.0.0.1:5000/api/work-orders
```

查看单个工单（含关联异常）：

```bash
curl http://127.0.0.1:5000/api/work-orders/1
```

## 3. 查看异常

列出全部异常：

```bash
curl http://127.0.0.1:5000/api/anomalies
```

按类型过滤（backup_gap=备份缺口, fk_broken=外键断链）：

```bash
curl "http://127.0.0.1:5000/api/anomalies?type=backup_gap"
```

查看单条异常详情（含处理记录 + 审计日志，用于反查）：

```bash
curl http://127.0.0.1:5000/api/anomalies/2
```

复核通过外键断链等异常（会写入审计日志和处理记录，可追溯谁在什么时候因为什么改的）：

```bash
curl -X POST http://127.0.0.1:5000/api/anomalies/1/review \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "wangwu",
    "reason": "该订单为测试数据，已在线下完成清理，不影响生产"
  }'
```

记录一条处理动作（执行订正、执行回滚等，报告导出也会自动写一条）：

```bash
curl -X POST http://127.0.0.1:5000/api/anomalies/1/process \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "execute_correction",
    "operator": "zhaoliu",
    "detail": "在备库执行并校验影响行数",
    "affected_rows": 1,
    "rollback_available": true,
    "rollback_sql": "UPDATE order_main SET amount = 0.01 WHERE order_no = \"ORD20260101\""
  }'
```

## 4. 导出结果（报告）

按批次导出 CSV（同一批次的报告导出和回滚共用一套 ProcessingRecord）：

```bash
curl -o report.csv "http://127.0.0.1:5000/api/report/export?batch_id=BATCH-20260618-001"
```

按异常类型导出：

```bash
curl -o backup_gap.csv "http://127.0.0.1:5000/api/report/export?type=backup_gap"
```

查看批次全貌（异常 + 全部处理动作，用于验收时从一条异常反查到指标报表和处理意见）：

```bash
curl http://127.0.0.1:5000/api/batch/BATCH-20260618-001
```

## 5. 数据模型速览

- `work_orders`：工单主表
- `anomaly_records`：异常记录（backup_gap / fk_broken 等），含 `batch_id`、复核人/时间/原因
- `processing_records`：处理记录（报告导出、执行订正、回滚共用同一批 `batch_id`）
- `audit_logs`：字段级审计日志，记录谁在什么时候因为什么改了哪个字段

数据库文件位置：项目根目录下的 `data_correction.db`（SQLite）。
