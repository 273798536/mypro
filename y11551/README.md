# 智能柜补货多源导入巡检CLI工具

智能柜补货多源导入巡检CLI工具（简称 SCI (Smart Cabinet Inspection) 是一个命令行工具，用于智能柜运营数据的多源导入、校验、改判和报表生成。

## 核心特性

- ✅ **多源数据导入**：支持柜机库存、补货照片、退款记录、异常照片、短信截图五种数据源
- ✅ **增量补传支持**：数据不是一次性输入，支持分批补传
- ✅ **改判功能**：支持对异常数据的状态改判（valid/invalid/fixed/excluded）
- ✅ **网络恢复扣库存**：网络恢复后支持重复扣库存
- ✅ **热销格口重汇总**：热销格口满仓后支持重新汇总计算
- ✅ **原始行号追踪**：所有记录可追溯到原始文件行号
- ✅ **失败清单**：坏数据不进汇总，但在失败清单中可查看原因
- ✅ **数据一致性保障**：列表、详情、历史、导出文件、日志五处数据一致
- ✅ **完整审计轨迹**：所有操作留下清楚轨迹

## 快速开始

### 安装

```bash
npm install
npm run build
```

### 2. 初始化数据库

```bash
npm link
```

### 使用方法

### 1. 初始化数据库

```bash
sci init [-o 操作人]
```

数据库位置：`~/.sci/inspection.db`

### 2. 导入数据

```bash
sci import <文件路径> [-t 类型] [-o 操作人] [-r 备注]
```

**支持的文件格式**：CSV、.xlsx、.xls

**数据类型**（可通过文件名自动识别，也可手动指定：
- `inventory` - 柜机库存
- `restock` - 补货照片
- `refund` - 退款记录
- `exception` - 异常照片
- `sms` - 短信截图

**示例：

```bash
# 自动识别类型（文件名包含"库存"、补货"等关键字
sci import 柜机库存数据.csv

# 手动指定类型
sci import data.csv -t inventory

# 指定操作人
sci import data.csv -o 张三
```

### 3. 数据检查

```bash
sci check [--recalc-hot] [-o 操作人]
```

- `--recalc-hot`：重新计算热销格口满仓状态

### 4. 修复/改判数据

```bash
sci fix <记录ID> <表名> [选项]
```

**选项**：
- `-s, --status <状态>`：设置状态 valid/invalid/fixed/excluded
- `-r, --reason <原因>`：失败原因
- `--deduct <数量>`：网络恢复后扣库存数量

**示例：

```bash
# 改判记录状态
sci fix record123 cabinet_inventory -s fixed -r "人工复核通过"

# 网络恢复扣库存
sci fix CAB001 cabinet_inventory --deduct 5
```

### 5. 生成报表

```bash
sci report [-c 城市] [-d 柜机ID] [--json]
```

**选项**：
- `-c, --city <城市>`：按城市筛选
- `-d, --detail <柜机ID>`：查看指定柜机详情

### 6. 查看历史

```bash
sci history [-n 条数] [--batches] [--failures]
```

**选项**：
- `-n, --limit <条数>`：显示条数（默认20）
- `--batches`：只显示导入批次
- `--failures`：只显示失败记录

### 7. 导出数据

```bash
sci export <输出目录> [选项]
```

**选项**：
- `-c, --city <城市>`：按城市筛选
- `--failures`：只导出失败清单
- `--batch <批次ID>`：指定批次ID

## 项目结构

```
src/
├── types/              # 类型定义
│   └── index.ts
├── db/                # 数据库层
│   ├── schema.ts     # 数据库表结构
│   └── database.ts   # 数据库操作
├── import/            # 导入解析
│   └── parser.ts     # 文件解析器
├── business/          # 业务逻辑
│   └── report.ts     # 报表计算
├── export/            # 导出功能
│   └── exporter.ts   # Excel导出
└── index.ts          # CLI入口
```

## 数据库设计

### 核心表

- `import_batches`：导入批次记录
- `cabinet_inventory`：柜机库存数据
- `restock_photos`：补货照片记录
- `refund_records`：退款记录
- `exception_photos`：异常照片记录
- `sms_screenshots`：短信截图记录
- `audit_logs`：审计日志
- `failure_records`：失败记录清单

## 数据一致性保障

1. **所有数据导入时校验，坏数据进入失败清单，不参与汇总
2. **每次操作都记录审计日志，变更前后都可追溯
3. **导出文件包含三个工作表：汇总报表、详细数据、失败清单
4. **所有数据来源记录原始行号和来源文件

## 常见问题

### Q: 如何知道某条记录来自哪个文件？
A: 使用 `sci history --batches` 查看批次记录，每条数据都关联到来源文件和原始行号

### Q: 数据冲突了怎么办？
A: 使用 `sci fix` 命令改判状态，操作会记录变更前后状态

### Q: 如何重新计算热销格口？
A: 使用 `sci check --recalc-hot`

### Q: 网络断了数据丢了怎么办？
A: 使用 `sci fix <柜机ID> --deduct <数量> 补扣库存
