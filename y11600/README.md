# 基金定投断点补扣 CLI 工具

处理银行回盘、客户补扣名单、节假日顺延、幂等补扣、对账导出的命令行工具。

## 核心特性

- **补扣状态机**：完整的状态流转（待处理→可补扣/待复核/暂停/顺延→成功/失败）
- **幂等请求**：重复运行不会污染旧结果，每次生成独立批次
- **节假日规则**：自动识别节假日并顺延到下一个工作日
- **人工复核**：高风险记录自动标记待人工确认
- **对账导出**：多维度导出（汇总、明细、风险、审计痕迹）
- **痕迹保留**：每条记录完整保留来源文件和处理历史

## 快速开始

### 1. 安装依赖

```bash
cd fund_replenish_cli
pip install -e .
```

### 2. 生成样例数据

```bash
python -m fund_replenish_cli.cli generate-sample -i ./sample_input
```

### 3. 执行补扣处理

```bash
python -m fund_replenish_cli.cli process -i ./sample_input -o ./output
```

### 4. 查看记录列表

```bash
python -m fund_replenish_cli.cli list-records -i ./sample_input -o ./output
```

### 5. 查看处理状态

```bash
python -m fund_replenish_cli.cli status -o ./output
```

## 命令详解

### `process` - 处理补扣

**参数：**
- `-i, --input-dir`：输入数据目录（必须包含银行回盘等CSV文件）
- `-o, --output-dir`：输出结果目录
- `-d, --run-date`：运行日期，格式 YYYY-MM-DD（默认今天）
- `-h, --holiday-file`：节假日配置文件（JSON格式）
- `--force`：强制重新处理，忽略幂等状态

**输出文件：**
- `01_summary.csv` - 对账汇总
- `02_replenish_records.csv` - 补扣记录明细
- `03_processing_detail.csv` - 处理过程详情
- `04_risks.csv` - 风险清单及处理建议
- `05_audit_trail.csv` - 审计追踪日志
- `06_warnings.log` - 告警日志
- `07_full_data.json` - 完整结构化数据

### `list-records` - 查看待处理记录

显示当前待处理的补扣记录列表，包含流水号、客户、基金、金额、状态等信息。

### `status` - 查看处理状态

查看输出目录的处理状态，包括已处理记录数和历史批次。

### `generate-sample` - 生成样例数据

生成包含以下场景的测试数据：
1. **正常记录**：张三，余额不足，计划正常，可补扣
2. **边界记录**：李四，余额不足，计划已暂停，被拦截
3. **坏数据**：张三同一计划同一日期出现两笔回盘，触发重复扣款风险

## 输入文件格式

### 银行回盘 (bank_returns.csv)
```csv
serial_no,customer_id,customer_name,plan_id,deduct_date,return_date,amount,return_code,return_msg
BR202605200001,C001,张三,P001,2026-05-15,2026-05-16,1000.00,BAL001,账户余额不足
```

### 客户计划 (customer_plans.csv)
```csv
plan_id,customer_id,customer_name,fund_code,fund_name,monthly_amount,deduct_day,start_date,end_date,status
P001,C001,张三,F001,易方达蓝筹精选混合,1000.00,15,2025-01-01,,正常
```

### 失败原因 (failure_reasons.csv)
```csv
reason_code,reason_name,category,allow_replenish,max_attempts,description
BAL001,账户余额不足,余额,true,3,客户账户余额不足以支付定投金额
```

### 补扣窗口 (replenish_windows.csv)
```csv
window_id,plan_id,original_deduct_date,window_start,window_end,attempts_made,last_attempt_date
W001,P001,2026-05-15,2026-05-16,2026-05-26,0,
```

### 人工备注 (manual_remarks.csv)
```csv
remark_id,related_serial_no,operator,remark_time,content,action
R001,BR202605200002,运营小王,2026-05-20T10:00:00,客户来电说明已充值,同意补扣
```

### 节假日配置 (holidays.json)
```json
{
  "holidays": [
    "2026-05-01",
    "2026-05-02",
    "2026-05-03"
  ]
}
```

## 风险处理规则

| 风险类型 | 处理方式 | 输出标记 |
|---------|---------|---------|
| 重复扣款风险 | 自动标记，需人工确认 | 红色告警，独立风险清单 |
| 节假日顺延 | 自动计算下一个工作日 | 状态标记"节假日顺延" |
| 客户暂停 | 自动拦截，跳过补扣 | 状态标记"客户暂停" |
| 已尝试补扣多次 | 标记待人工复核 | 黄色标记，需运营确认 |
| 数据异常 | 标记待人工复核 | 黄色标记，需检查数据 |

## 工作流程

```
银行回盘 → 客户计划匹配 → 失败原因识别 → 风险检测
     ↓
状态机评估 → 可补扣/待复核/暂停/作废 → 节假日检查
     ↓
安排补扣日 → 生成补扣名单 → 导出对账报告 → 人工复核
```

## 目录结构

```
fund_replenish_cli/
├── models/              # 数据模型
│   └── base.py         # 银行回盘、客户计划、补扣记录等
├── core/                # 核心逻辑
│   ├── state_machine.py    # 状态机
│   ├── holiday_manager.py  # 节假日管理
│   ├── idempotent_manager.py # 幂等管理
│   ├── data_loader.py      # 数据加载
│   ├── replenish_processor.py # 补扣处理器
│   └── reconciliation.py   # 对账导出
├── sample_data/         # 样例数据生成
├── cli.py              # 命令行入口
└── pyproject.toml      # 项目配置
```

## 注意事项

1. **重复运行安全**：每次运行生成独立的 `batch_YYYYMMDD_HHMMSS` 目录，不会覆盖历史结果
2. **幂等机制**：基于回盘流水号+客户ID+计划ID+扣款日生成唯一键，避免重复处理
3. **审计追踪**：每条记录的每次状态变更都会保留时间戳、操作人、原因、来源模块
4. **风险提示**：所有风险记录都会在控制台高亮显示，并单独导出风险清单
