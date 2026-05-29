# 酒店渠道佣金复核工具

命令行工具，用于导入、检查、计算和导出酒店各渠道佣金，解决OTA、团购、会员直销佣金口径不一致的问题。

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 查看模板说明

```bash
python main.py template
```

### 运行完整复核

```bash
python main.py run \
  --orders examples/order_records.csv \
  --contracts examples/channel_contracts.csv \
  --rates examples/rate_calendar.csv
```

## 输入文件说明

### 1. 订单流水 (order_records.csv)

**必要列**: `order_id`, `channel`, `checkin_date`, `checkout_date`, `total_amount`

**可选列**: `channel_type`, `guest_name`, `room_nights`, `order_type`, `room_rate`, `refund_amount`, `refund_date`, `notes`

### 2. 渠道合同 (channel_contracts.csv)

**必要列**: `channel`, `commission_rate`

**可选列**: `channel_type`, `half_day_commission_rate`, `weekend_surcharge`, `holiday_surcharge`, `effective_from`, `effective_to`, `notes`

**注意**: 佣金率用小数表示（如15%填0.15）

### 3. 房价日历 (rate_calendar.csv)

**必要列**: `rate_date`, `base_rate`

**可选列**: `is_weekend`, `is_holiday`, `holiday_name`

## 半日房复现方法

1. 订单 `order_type` 设为 `half_day`
2. `room_nights` 设为 `0.5`
3. 合同中配置 `half_day_commission_rate`

## 跨夜退款复现方法

1. `refund_date` 在 `checkin_date` 和 `checkout_date` 之间
2. `refund_amount` 大于 0

## 输出文件

运行后在 `output/` 目录生成：

- `commission_results_*.csv` - 佣金计算明细
- `validation_issues_*.csv` - 数据问题清单
- `channel_summary_*.csv` - 渠道汇总表
- `analysis_report_*.txt` - 分析报告

## 命令列表

```bash
python main.py --help              # 查看帮助
python main.py template            # 查看CSV模板说明
python main.py check-orders -o FILE  # 仅检查订单格式
python main.py run -o FILE -c FILE -r FILE  # 运行完整复核
```
