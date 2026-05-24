# 仓库退供复核多源导入巡检 CLI (WRA)

## 功能特点

- ✅ **多源数据导入**: 支持退供申请、质检照片、物流回单、短信截图、异常照片的分批导入和补传
- ✅ **改判功能**: 支持供应商部分确认、拒收、待确认等多种改判操作
- ✅ **全链路追踪**: 每一步操作都记录前后差异，支持历史回溯
- ✅ **数据一致性**: 导出文件、详情接口、历史查询使用同一套数据源
- ✅ **失败清单**: 坏数据不进入汇总，但在失败列表中保留完整错误原因和原始行号
- ✅ **可追溯报表**: 汇总数字可直接追溯到单条记录来源

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化工作目录

```bash
wra init
```

### 3. 导入数据

```bash
# 导入退供申请
wra import application examples/退供申请.csv

# 导入质检照片
wra import inspection examples/质检照片.csv

# 导入物流回单
wra import logistics examples/物流回单.csv

# 导入短信截图
wra import sms examples/短信确认.csv

# 导入异常照片
wra import exception examples/异常照片.csv
```

### 4. 数据校验

```bash
# 检查所有数据
wra check

# 查看导入失败记录
wra check --failures

# 查看导入批次历史
wra check --batches
```

### 5. 改判操作

```bash
# 查看单条记录详情
wra fix show BATCH001 SKU001

# 供应商确认数量
wra fix accept BATCH001 SKU001 90 -n "采购内勤确认"

# 供应商拒收数量
wra fix reject BATCH001 SKU001 8 -n "质量问题拒收"

# 供应商待确认数量
wra fix pending BATCH001 SKU001 2 -n "后续再确认"

# 更新状态
wra fix status BATCH001 SKU001 confirmed

# 更新判定结果
wra fix judgment BATCH001 SKU001 "供应商确认"

# 修改字段值
wra fix field BATCH001 SKU001 --field sku_name "新商品名称"
```

### 6. 查看报表

```bash
# 汇总报表（默认）
wra report summary

# 按批次分组
wra report by-batch

# 按状态分组
wra report by-status

# 按供应商分组
wra report by-supplier

# 显示明细列表
wra report summary --detail

# 筛选特定批次
wra report summary --batch BATCH001
```

### 7. 查看历史

```bash
# 查看系统操作日志（默认）
wra history logs

# 查看单条记录的变更历史
wra history record BATCH001 SKU001

# 查看单条记录的变更对比（按字段展示前后变化）
wra history diff BATCH001 SKU001

# 限制显示数量
wra history logs --limit 50
```

### 8. 导出数据

```bash
# 导出Excel（默认格式）
wra export xlsx 退供复核.xlsx

# 导出包含失败清单、变更历史、导入批次信息
wra export xlsx 完整导出.xlsx --failures --history --batches

# 导出CSV
wra export csv 退供复核.csv

# 导出JSON
wra export json 导出.json

# 筛选特定批次导出
wra export xlsx 批次BATCH001.xlsx --batch BATCH001
```

## 采购内勤关注点

1. **原始行号**: 所有导入失败记录保留原始Excel行号，便于定位问题
2. **失败清单**: 使用 `wra check --failures` 查看所有导入失败的原因
3. **修正后再导入**: 修正源文件后重新执行 `wra import` 即可
4. **数据一致性**: 列表、详情、历史、导出文件使用同一套数据，不会出现数字打架

## 数据模型

- **退供申请**: 批次号、SKU、申请数量、供应商、仓库等
- **质检照片**: 批次号、SKU、质检结果、质检数量、照片名称等
- **物流回单**: 批次号、SKU、运单号、发货数量、实收数量等
- **短信截图**: 批次号、SKU、确认数量、短信内容等
- **异常照片**: 批次号、SKU、异常类型、异常数量等

## 状态说明

- `pending`: 待处理
- `confirmed`: 已确认
- `rejected`: 已拒收
- `partial`: 部分确认
- `reviewing`: 复核中
- `completed`: 已完成

## 目录结构

```
.wra-data/
├── audit.db              # SQLite数据库
├── imports/              # 导入的源文件备份
│   ├── application/
│   ├── inspection/
│   ├── logistics/
│   ├── sms/
│   └── exception/
├── exports/              # 导出文件
└── logs/                 # 日志文件
```
